---
title: HAProxy로 TLS(SSL) 배포 아키텍쳐 종류별 설정
date: 2025-12-15
categories: [server, on-premise]
tags: [TLS Termination, End to End TLS, Pass through]
description: HAProxy로 TLS(SSL) 배포 아키텍쳐 종류별 설정 post
permalink: types-of-tls-deployment
---

> update 중 . . .
{:.prompt-warning}

## 서버/설치 정보

| 구분 | IP Address |
| --- | --- |
| HAProxy server | 172.16.2.6 |
| web server | 172.16.3.1 |
| was server | 172.16.2.1 |

### HAProxy server 설치 정보

| 구분 | 버전 |
| --- | --- |
| OS | Rocky 9.6 |
| HAProxy | HAProxy 3.3.0 |
| ModSecurity | ModSecurity 3.0.14 |
| SPOA | SPOA-ModSecurity3 |
| OWASP CRS | CRS 4.0 |

[HAProxy + ModSecurity WAF 구성 post 참조](<how-to-assoc-haproxy-modsecurity>){:target="_blank"}

### web server 설치 정보

| 구분 | 버전 |
| --- | --- |
| OS | Rocky 9.6 |
| Apache | Apache 2.4.65 |

### was server 설치 정보

| 구분 | 버전 |
| --- | --- |
| OS | Rocky 9.6 |
| Tomcat | Tomcat 9.0.109 |

## TLS(SSL) 배포 아키텍쳐 종류

### TLS Termination

TLS 세션이 Client에서 시작되어 중간 장비에서 복호화하여 종료되는 방식을 `TLS Termination`이라고 합니다.

대표 예시로 웹 브라우저(Client)에서 `https://google.com` 요청을 하게 되면 HTTPS 통신은 L7 LB/WAF와 같은 중간 장비에서 복호화하여 종료되고, 실제 Web Server와는 HTTP 통신을 하게됩니다.  
(본 예시는 인프라 구성이 Client -> L7 LB/WAF -> WEB Server인 경우를 가정합니다.)

#### 설정

HAProxy 설정.

```bash
cd /usr/local/haproxy/etc

# 설정 파일 백업
cp haproxy.cfg haproxy.cfg_$(date +%Y%m%d)

vi haproxy.cfg
```

```text
global
        # ... 기본 설정 생략
        # TLS(SSL) 설정 추가

        # intermediate security for SSL, from https://ssl-config.mozilla.org/
        ssl-default-bind-curves X25519:prime256v1:secp384r1
        ssl-default-bind-ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384:DHE-RSA-CHACHA20-POLY1305
        ssl-default-bind-ciphersuites TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256
        ssl-default-bind-options prefer-client-ciphers ssl-min-ver TLSv1.2 no-tls-tickets

        ssl-default-server-curves X25519:prime256v1:secp384r1
        ssl-default-server-ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384:DHE-RSA-CHACHA20-POLY1305
        ssl-default-server-ciphersuites TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256
        ssl-default-server-options ssl-min-ver TLSv1.2 no-tls-tickets

# ... defaults 설정 내용 생략

frontend a-site.com
        # 443 포트로 TLS Termination 수행
        bind :443 ssl crt /usr/local/haproxy/certs/

        mode http

        # Host matching
        acl host_a hdr(host) -i a-site.com

        default_backend web_a

backend web_a
        mode http

        # HTTP(80) 통신
        server web1 172.16.3.1:80
```

> TLS(SSL) 옵션은 <https://ssl-config.mozilla.org>{:target="_blank"} 참조하여 해당 버전에 맞는 설정 확인하여 적용 해야합니다.
{: .prompt-info}

TLS(SSL) 인증서 파일 확인.(인증서 생성 과정 생략)

```bash
ll /usr/local/haproxy/certs/a-site.com.pem
```

```bash
# Syntax 체크
/usr/local/haproxy/sbin/haproxy -c -f /usr/local/haproxy/etc/haproxy.cfg

# 재시작
systemctl reload haproxy
systemctl status haproxy
```

Apache 설정.

```bash
cd /usr/local/apache/conf/extra

mv httpd-vhosts.conf httpd-vhosts.conf_$(date +%Y%m%d)

vi httpd-vhosts.conf
```

```text
<VirtualHost *:80>
    ServerName a-site.com

    JkMount /* a-loadbalancer

    ErrorLog "|/usr/local/apache/bin/rotatelogs /var/log/httpd/a-site.com_error_log-%Y%m%d 86400 540"
    CustomLog "|/usr/local/apache/bin/rotatelogs /var/log/httpd/a-site.com_access_log-%Y%m%d 86400 540" common
</VirtualHost>
```

```bash
# Syntax 체크
/usr/local/apache/bin/apachectl -t

# 재시작
/usr/local/apache/bin/apachectl graceful

ps -ef | grep httpd
```

이제 TLS Termination이 이루어지는지 확인해보겠습니다.

```bash
# 브라우저 접속 후 로그 확인
# https://a-site.com

# haproxy log
tail -f /var/log/haproxy.log

... "GET https://a-site.com/ HTTP/2.0"
... "GET https://a-site.com/tomcat.css HTTP/2.0"
... "GET https://a-site.com/tomcat.svg HTTP/2.0"
... "GET https://a-site.com/bg-nav.png HTTP/2.0"
... "GET https://a-site.com/bg-upper.png HTTP/2.0"
... "GET https://a-site.com/bg-button.png HTTP/2.0"
... "GET https://a-site.com/asf-logo-wide.svg HTTP/2.0"
... "GET https://a-site.com/bg-middle.png HTTP/2.0"
```

HAProxy log에서 요청 메서드, HTTP/2 정보가 확인됩니다.  
이는 HAProxy가 TLS 패킷을 복호화 한 이후 HTTP 요청을 처리하고 있음을 의미합니다.  
따라서 Client->HAProxy 구간에서 TLS Termination이 수행되고 있음을 알 수 있습니다.

```bash
# apache log
tail -f /var/log/httpd/a-site.com_access_log-$(date +%Y%m%d)

172.16.2.6 - - [18/Dec/2025:23:39:11 +0900] "GET / HTTP/1.1" 200 11212
172.16.2.6 - - [18/Dec/2025:23:39:11 +0900] "GET /tomcat.css HTTP/1.1" 200 5584
172.16.2.6 - - [18/Dec/2025:23:39:11 +0900] "GET /tomcat.svg HTTP/1.1" 200 67795
172.16.2.6 - - [18/Dec/2025:23:39:11 +0900] "GET /bg-nav.png HTTP/1.1" 200 1401
172.16.2.6 - - [18/Dec/2025:23:39:11 +0900] "GET /bg-upper.png HTTP/1.1" 200 3103
172.16.2.6 - - [18/Dec/2025:23:39:11 +0900] "GET /bg-button.png HTTP/1.1" 200 713
172.16.2.6 - - [18/Dec/2025:23:39:11 +0900] "GET /asf-logo-wide.svg HTTP/1.1" 200 27235
172.16.2.6 - - [18/Dec/2025:23:39:11 +0900] "GET /bg-middle.png HTTP/1.1" 200 1918
```

Apache HTTP log에는 source IP가 HAProxy(172.16.2.6) 서버로 기록 되어있으며,  
요청 프로토콜은 HTTP/1.1로 표시됩니다.  
이는 HAProxy-Apache 구간이 HTTPS가 아닌 HTTP(80)로 통신되고 있음을 알 수 있습니다.


#### 정리
TLS Termination 설정 후 정리된 내용은 아래와 같습니다.  

- Client는 HTTPS(HTTP/2)로 HAProxy에 접속
- HAProxy에서 TLS 복호화 및 HTTP 요청 처리 수행
- HAProxy - Web Server 구간은 HTTP(80) 수행
- Apache log를 통해 HAproxy로 부터 HTTP 요청 수신 확인

---

### TLS Bridging(Re-encryption)

TLS 세션이 Client에서 시작되어 중간 장비에서 복호화된후, 다시 TLS로 암호화하여 실제 Web Server로 전송하는 방식을 `TLS Bridging(Re-encryption)`이라고 합니다.

대표적인 예로, 웹 브라우저(Client)에서 `https://google.com` 요청을 보내면 L7 LB/WAF와 같은 중간 장비에서 HTTPS 트래픽을 복호화 하여 HTTP 요청을 검사한 뒤, 다시 TLS로 암호화하여 HTTPS로 실제 Web Server에 전달합니다.  
(본 예시는 인프라 구성이 Client -> L7 LB/WAF -> WEB Server인 경우를 가정합니다.)

#### 설정

HAProxy 설정.

```bash
cd /usr/local/haproxy/etc

# 설정 파일 백업
cp haproxy.cfg haproxy.cfg_$(date +%Y%m%d)

vi haproxy.cfg
```

```text
global
        # ... 기본 설정 생략
        # TLS(SSL) 설정 추가

        # intermediate security for SSL, from https://ssl-config.mozilla.org/
        ssl-default-bind-curves X25519:prime256v1:secp384r1
        ssl-default-bind-ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384:DHE-RSA-CHACHA20-POLY1305
        ssl-default-bind-ciphersuites TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256
        ssl-default-bind-options prefer-client-ciphers ssl-min-ver TLSv1.2 no-tls-tickets

        ssl-default-server-curves X25519:prime256v1:secp384r1
        ssl-default-server-ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384:DHE-RSA-CHACHA20-POLY1305
        ssl-default-server-ciphersuites TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256
        ssl-default-server-options ssl-min-ver TLSv1.2 no-tls-tickets

# ... defaults 설정 내용 생략

frontend a-site.com
        # 443 포트로 TLS Termination 수행
        bind :443 ssl crt /usr/local/haproxy/certs/

        mode http

        # Host matching
        acl host_a hdr(host) -i a-site.com

        default_backend web_a

backend web_a
        mode http

        # 다시 TLS 암호화(Re-encryption)
        server web1 172.16.3.1:443 ssl verify none
```

```bash
# Syntax 체크
/usr/local/haproxy/sbin/haproxy -c -f /usr/local/haproxy/etc/haproxy.cfg

# 재시작
systemctl reload haproxy
systemctl status haproxy
```

Apache 설정.

```bash
cd /usr/local/apache/conf/extra

mv httpd-ssl.conf httpd-ssl.conf_$(date +%Y%m%d)

vi httpd-ssl.conf
```

```text
Listen 443

# intermediate security for SSL, from https://ssl-config.mozilla.org/
SSLProtocol             -all +TLSv1.2 +TLSv1.3
SSLOpenSSLConfCmd       Curves X25519:prime256v1:secp384r1
SSLCipherSuite          ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384:DHE-RSA-CHACHA20-POLY1305
SSLHonorCipherOrder     off
SSLSessionTickets       off

SSLUseStapling On
SSLStaplingCache "shmcb:logs/ssl_stapling(32768)"

LogFormat "%{X-Forwarded-For}i %h %l %u %t \"%r\" %>s %b \
\"%{Referer}i\" \"%{User-Agent}i\" \
proto=%{X-Forwarded-Proto}i ssl=%{HTTPS}e \
%{SSL_PROTOCOL}x %{SSL_CIPHER}x" sslog

<VirtualHost *:443>
    ServerName a-site.com

    JkMount /* a-loadbalancer

    SSLEngine on

    SSLCertificateFile "/usr/local/apache/conf/ssl/a-site.com/cert.pem"
    SSLCertificateKeyFile "/usr/local/apache/conf/ssl/a-site.com/privkey.pem"
    SSLCertificateChainFile "/usr/local/apache/conf/ssl/a-site.com/chain.pem"

    ErrorLog "|/usr/local/apache/bin/rotatelogs /var/log/httpd/a-site.com_ssl-error_log-%Y%m%d 86400 540"
    CustomLog "|/usr/local/apache/bin/rotatelogs /var/log/httpd/a-site.com_ssl-access_log-%Y%m%d 86400 540" sslog
</VirtualHost>
```

이제 TLS Bridging(Re-encryption)이 이루어지는지 확인해보겠습니다.

```bash
# 브라우저 접속 후 로그 확인
# https://a-site.com

# haproxy log
tail -f /var/log/haproxy.log

... "GET https://a-site.com/ HTTP/2.0"
... "GET https://a-site.com/tomcat.css HTTP/2.0"
... "GET https://a-site.com/tomcat.svg HTTP/2.0"
... "GET https://a-site.com/bg-nav.png HTTP/2.0"
... "GET https://a-site.com/asf-logo-wide.svg HTTP/2.0"
... "GET https://a-site.com/bg-upper.png HTTP/2.0"
... "GET https://a-site.com/bg-button.png HTTP/2.0"
... "GET https://a-site.com/bg-middle.png HTTP/2.0"
```

HAProxy log에서 요청 메서드 및 HTTP/2정보가 확인 됩니다. 
TLS Bridging 구성에서도 HAProxy가 TLS를 종료한 뒤 HTTP 요청을 처리하고 있음을 의미합니다.

```bash
# apache 

# HTTPS(443)통신 로그 확인
tail -f /var/log/httpd/a-site.com_ssl-access_log-$(date +%Y%m%d)

- 172.16.2.6 - - [20/Dec/2025:14:39:22 +0900] "GET / HTTP/1.1" 200 11212 "-" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36" proto=- ssl=on TLSv1.3 TLS_AES_128_GCM_SHA256
- 172.16.2.6 - - [20/Dec/2025:14:39:28 +0900] "GET /tomcat.css HTTP/1.1" 200 5584 "https://a-site.com/" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36" proto=- ssl=on TLSv1.3 TLS_AES_128_GCM_SHA256
- 172.16.2.6 - - [20/Dec/2025:14:39:28 +0900] "GET /tomcat.svg HTTP/1.1" 200 67795 "https://a-site.com/" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36" proto=- ssl=on TLSv1.3 TLS_AES_128_GCM_SHA256
- 172.16.2.6 - - [20/Dec/2025:14:39:29 +0900] "GET /bg-nav.png HTTP/1.1" 200 1401 "https://a-site.com/tomcat.css" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36" proto=- ssl=on TLSv1.3 TLS_AES_128_GCM_SHA256
- 172.16.2.6 - - [20/Dec/2025:14:39:29 +0900] "GET /asf-logo-wide.svg HTTP/1.1" 200 27235 "https://a-site.com/tomcat.css" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36" proto=- ssl=on TLSv1.3 TLS_AES_128_GCM_SHA256
- 172.16.2.6 - - [20/Dec/2025:14:39:29 +0900] "GET /bg-upper.png HTTP/1.1" 200 3103 "https://a-site.com/tomcat.css" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36" proto=- ssl=on TLSv1.3 TLS_AES_128_GCM_SHA256
- 172.16.2.6 - - [20/Dec/2025:14:39:29 +0900] "GET /bg-button.png HTTP/1.1" 200 713 "https://a-site.com/tomcat.css" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36" proto=- ssl=on TLSv1.3 TLS_AES_128_GCM_SHA256
- 172.16.2.6 - - [20/Dec/2025:14:39:29 +0900] "GET /bg-middle.png HTTP/1.1" 200 1918 "https://a-site.com/tomcat.css" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36" proto=- ssl=on TLSv1.3 TLS_AES_128_GCM_SHA256

# HTTP(80)통신 로그 확인
tail -f /var/log/httpd/a-site.com_access_log-$(date +%Y%m%d)
# nothing
```

Apache HTTPS log에는 source IP가 동일하게 HAProxy(172.16.2.6) 서버로 기록 되어있으며,  
HAProxy에서 재암호화된 HTTPS 요청을 Apache HTTPS 로그로 확인 할 수 있습니다.
또한 HTTP log에는 해당 시간대 기록 안되는것으로 확인되어 HAproxy - Web Server 구간이 HTTPS로 통신되고 있음을 알 수 있습니다.

#### 정리

TLS Bridging(Re-encryption) 설정 후 정리된 내용은 아래와 같습니다.

- Client는 HTTPS(HTTP/2)로 HAProxy 접속
- HAProxy에서 TLS 복호화 및 HTTP 요청 처리 수행
- HAProxy - Web Server 구간은 HTTPS(443)로 재암호화(Re-encryption)되어 통신
- Apache log를 통해 HAProxy로 부터 HTTPS 요청 수신 확인

---

### End-to-End TLS(Pass-through)

TLS 세션이 Client에서 시작되어 Web Server 까지 유지되며, 중간 장비에서 TLS 세션을 종료하지 않는 방식을 `End-to-End TLS`라고 합니다.  
또한, 중간 장비는 TLS 패킷을 그대로 전달만 수행하므로 `Pass-through`방식이라고도 합니다.  
따라서 중간 장비는 HTTPS 트래픽을 복호화할 수 없으며, HTTP 요청 내용을 기반으로 WAF 기능을 수행할 수 없게됩니다.

대표 예시로 웹 브라우저(Client)에서 `https://google.com` 요청을 하게 되면 LB/WAF 같은 중간 장비는  
TLS 트래픽을 그대로 전달하여 HTTPS 세션이 Web Server 까지 유지됩니다.  
(본 예시는 인프라 구성이 Client -> L7 LB/WAF -> WEB Server인 경우를 가정합니다.)

#### 설정

HAProxy 설정.

```bash
cd /usr/local/haproxy/etc

# 설정 파일 백업
cp haproxy.cfg haproxy.cfg_$(date +%Y%m%d)

vi haproxy.cfg
```

```text
... global 설정 내용 생략

... defaults 설정 내용 생략

frontend a-site.com
        bind :443

        # 패킷만 전달하므로 tcp 설정
        mode tcp
        option tcplog

        # Pass-through 방식에서는 HTTP 헤더를 확인할 수 없으므로
        # Host 기반 ACL 설정은 사용할 수 없습니다.

        # 주석처리
        # acl host_a hdr(host) -i a-site.com

        default_backend web_a

backend web_a
        # 패킷만 전달하므로 tcp 설정
        mode tcp
        server web1 172.16.3.1:443
```

```bash
# Syntax 체크
/usr/local/haproxy/sbin/haproxy -c -f /usr/local/haproxy/etc/haproxy.cfg

# 재시작
systemctl reload haproxy
systemctl status haproxy
```

Apache 설정 생략(변동없음)

이제 Pass-through가 이루어 지는지 확인해보겠습니다.

```bash
# 브라우저 접속 후 로그 확인
# https://a-site.com

# haproxy log
tail -f /var/log/haproxy.log

# Pass through 확인
... a-site.com web_a/web1 1/1/12023 4536 -- 6/6/5/5/0 0/0
... a-site.com web_a/web1 1/0/5381 3491 -- 5/5/4/4/0 0/0
... a-site.com web_a/web1 1/0/5424 3498 -- 4/4/3/3/0 0/0
... a-site.com web_a/web1 1/0/20295 1803 -- 3/3/2/2/0 0/0
... a-site.com web_a/web1 1/0/20295 1899 -- 2/2/1/1/0 0/0
... a-site.com web_a/web1 1/0/20295 1803 -- 1/1/0/0/0 0/0
```

`mode tcp`로 설정되어 HTTP 관련 내용은 나오지 않는것을 확인 할 수 있습니다.
또한 중간 장비에서 HTTP 요청을 복호화 할 수 없으므로 URL, Header, Body 기반의 L7 WAF 탐지 및 차단은 수행할 수 없습니다.

```bash
# apache log
tail -f /var/log/httpd/a-site.com_ssl-access_log-$(date +%Y%m%d)

- 172.16.2.6 - - [16/Dec/2025:23:47:37 +0900] "GET / HTTP/1.1" 200 11212 "-" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36" proto=- ssl=on TLSv1.3 TLS_AES_256_GCM_SHA384
- 172.16.2.6 - - [16/Dec/2025:23:47:44 +0900] "GET /tomcat.css HTTP/1.1" 200 5584 "https://a-site.com/" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36" proto=- ssl=on TLSv1.3 TLS_AES_256_GCM_SHA384
- 172.16.2.6 - - [16/Dec/2025:23:47:44 +0900] "GET /tomcat.svg HTTP/1.1" 200 67795 "https://a-site.com/" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36" proto=- ssl=on TLSv1.3 TLS_AES_256_GCM_SHA384
- 172.16.2.6 - - [16/Dec/2025:23:47:44 +0900] "GET /bg-nav.png HTTP/1.1" 200 1401 "https://a-site.com/tomcat.css" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36" proto=- ssl=on TLSv1.3 TLS_AES_256_GCM_SHA384
- 172.16.2.6 - - [16/Dec/2025:23:47:44 +0900] "GET /asf-logo-wide.svg HTTP/1.1" 200 27235 "https://a-site.com/tomcat.css" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36" proto=- ssl=on TLSv1.3 TLS_AES_256_GCM_SHA384
- 172.16.2.6 - - [16/Dec/2025:23:47:44 +0900] "GET /bg-upper.png HTTP/1.1" 200 3103 "https://a-site.com/tomcat.css" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36" proto=- ssl=on TLSv1.3 TLS_AES_256_GCM_SHA384
- 172.16.2.6 - - [16/Dec/2025:23:47:44 +0900] "GET /bg-button.png HTTP/1.1" 200 713 "https://a-site.com/tomcat.css" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36" proto=- ssl=on TLSv1.3 TLS_AES_256_GCM_SHA384
- 172.16.2.6 - - [16/Dec/2025:23:47:44 +0900] "GET /bg-middle.png HTTP/1.1" 200 1918 "https://a-site.com/tomcat.css" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36" proto=- ssl=on TLSv1.3 TLS_AES_256_GCM_SHA384
```

backend 설정에 172.16.3.1:443로 설정되어있어 tcp mode만 수행하더라도 HTTPS log에 기록 되어있는것을 확인 할 수 있습니다.
TLS Bridging과 달리, 실제 Web Server에서만 TLS 복호화를 하여 HTTP 요청을 처리합니다.

#### 정리

End-to-End TLS(Pass-through) 설정 후 정리 된 내용은 아래와 같습니다.

- Client는 HTTPS(HTTP/2)로 HAProxy 접속하지만, HAProxy는 패킷 그대로 전달
- HAProxy는 TLS 세션을 종료하지 않고 tcp mode로 패킷 그대로 전달
- TLS 세션 종료 및 HTTP 처리 또한 Web Server에서 수행

## 추가 설정 - ModSecurity 연동하여 WAF 기능 추가

앞선 End-to-End TLS(Pass-through) 설명에서 해당 방식에서는 중간 장비에서 TLS를 복호화 하지 않기 때문에 WAF 기능을 수행 할 수 없다고 언급했습니다.  
이 내용을 가정이 아닌 실제 동작 기준으로 검증하여 TLS(SSL) 배포 아키텍쳐 종류별로 WAF기능을 수행하는지 확인해보겠습니다.

HAProxy와 ModeSecurity 연동하는 방법은 아래 post를 참조하여 확인.  
[modsecurity 설치](how-to-assoc-haproxy-modsecurity#modsecurity-%EC%84%A4%EC%B9%98){:target="_blank"}, [spoa-modsecurity 설치 - haproxy 연동 모듈](how-to-assoc-haproxy-modsecurity#spoa-modsecurity-%EC%84%A4%EC%B9%98){:target="_blank"}

update 예정.