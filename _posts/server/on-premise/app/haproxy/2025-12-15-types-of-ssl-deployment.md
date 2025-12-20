---
title: HAProxy로 TLS(SSL) 배포 아키텍쳐 종류별 실습
date: 2025-12-15
categories: [server, on-premise]
tags: [TLS Termination, End to End TLS, Pass through]
description: HAProxy로 TLS(SSL) 배포 아키텍쳐 종류별 실습 post
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

## TLS(SSL) 배포 아키첵터 종류

### TLS Termination

TLS 세션이 Client에서 시작되어 중간 장비에서 복호화하여 종료되는 방식을 `TLS Termination`이라고 합니다.

대표 예시로 웹 브라우저(Client)에서 `https://google.com` 요청을 하게 되면 HTTPS 통신은 L7 LB/WAF와 같은 중간 장비에서 복호화하여 종료되고, 실제 Web Server와는 HTTP 통신을 하게됩니다.  
(본 예시는 인프라 구성이 Client -> L7 LB/WAF -> WEB Server인 경우를 가정합니다.)


HAProxy 설정.

```bash
cd /usr/local/haproxy/etc/

# 설정 파일 백업
cp haproxy.cfg haproxy.cfg_$(date +%Y%m%d)

vi haproxy.cfg
```

```text
global
        # ... global 설정 부분 마지막 추가

        # intermediate security for SSL, from https://ssl-config.mozilla.org/
        ssl-default-bind-curves X25519:prime256v1:secp384r1
        ssl-default-bind-ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384:DHE-RSA-CHACHA20-POLY1305
        ssl-default-bind-ciphersuites TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256
        ssl-default-bind-options prefer-client-ciphers ssl-min-ver TLSv1.2 no-tls-tickets

        ssl-default-server-curves X25519:prime256v1:secp384r1
        ssl-default-server-ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384:DHE-RSA-CHACHA20-POLY1305
        ssl-default-server-ciphersuites TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256
        ssl-default-server-options ssl-min-ver TLSv1.2 no-tls-tickets

... defaults 설정 내용 생략

frontend a-site.com
        bind :443 ssl crt /usr/local/haproxy/certs/

        mode http

        # Host matching
        acl host_a hdr(host) -i a-site.com

        default_backend web_a

backend web_a
        mode http

        # HTTP 통신
        server web1 172.16.3.1:80
```

> global TLS(SSL) 옵션은 <https://ssl-config.mozilla.org>{:target="_blank"} 참조하여 해당 버전에 맞는 설정 확인하여 적용 해야합니다.
{: .prompt-info}

TLS(SSL) 인증서 파일 확인

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

실시간 로그 확인.

```bash
# haproxy
tail -f /var/log/haproxy.log

Dec 18 23:39:11 localhost haproxy[20321]: xxx.28.xxx.28:58625 [18/Dec/2025:23:39:11.007] a-site.com~ web_a/web1 0/0/2/8/10 200 676 - - ---- 1/1/0/0/0 0/0 "GET https://a-site.com/ HTTP/2.0"
Dec 18 23:39:11 localhost haproxy[20321]: xxx.28.xxx.28:58625 [18/Dec/2025:23:39:11.248] a-site.com~ web_a/web1 0/0/0/8/8 200 556 - - ---- 1/1/1/1/0 0/0 "GET https://a-site.com/tomcat.css HTTP/2.0"
Dec 18 23:39:11 localhost haproxy[20321]: xxx.28.xxx.28:58625 [18/Dec/2025:23:39:11.249] a-site.com~ web_a/web1 0/0/1/11/12 200 605 - - ---- 1/1/0/0/0 0/0 "GET https://a-site.com/tomcat.svg HTTP/2.0"
Dec 18 23:39:11 localhost haproxy[20321]: xxx.28.xxx.28:58625 [18/Dec/2025:23:39:11.360] a-site.com~ web_a/web1 0/0/0/2/2 200 610 - - ---- 1/1/3/3/0 0/0 "GET https://a-site.com/bg-nav.png HTTP/2.0"
Dec 18 23:39:11 localhost haproxy[20321]: xxx.28.xxx.28:58625 [18/Dec/2025:23:39:11.361] a-site.com~ web_a/web1 0/0/0/2/2 200 612 - - ---- 1/1/2/2/0 0/0 "GET https://a-site.com/bg-upper.png HTTP/2.0"
Dec 18 23:39:11 localhost haproxy[20321]: xxx.28.xxx.28:58625 [18/Dec/2025:23:39:11.361] a-site.com~ web_a/web1 0/0/0/2/2 200 613 - - ---- 1/1/1/1/0 0/0 "GET https://a-site.com/bg-button.png HTTP/2.0"
Dec 18 23:39:11 localhost haproxy[20321]: xxx.28.xxx.28:58625 [18/Dec/2025:23:39:11.361] a-site.com~ web_a/web1 0/0/0/3/3 200 617 - - ---- 1/1/0/0/0 0/0 "GET https://a-site.com/asf-logo-wide.svg HTTP/2.0"
Dec 18 23:39:11 localhost haproxy[20321]: xxx.28.xxx.28:58625 [18/Dec/2025:23:39:11.407] a-site.com~ web_a/web1 0/0/0/2/2 200 613 - - ---- 1/1/0/0/0 0/0 "GET https://a-site.com/bg-middle.png HTTP/2.0"

# apache
tail -f /var/log/httpd/a-site.com_access_log-$(date +%Y%m%d)

# HTTP 통신 확인
172.16.2.6 - - [18/Dec/2025:23:39:11 +0900] "GET / HTTP/1.1" 200 11212
172.16.2.6 - - [18/Dec/2025:23:39:11 +0900] "GET /tomcat.css HTTP/1.1" 200 5584
172.16.2.6 - - [18/Dec/2025:23:39:11 +0900] "GET /tomcat.svg HTTP/1.1" 200 67795
172.16.2.6 - - [18/Dec/2025:23:39:11 +0900] "GET /bg-nav.png HTTP/1.1" 200 1401
172.16.2.6 - - [18/Dec/2025:23:39:11 +0900] "GET /bg-upper.png HTTP/1.1" 200 3103
172.16.2.6 - - [18/Dec/2025:23:39:11 +0900] "GET /bg-button.png HTTP/1.1" 200 713
172.16.2.6 - - [18/Dec/2025:23:39:11 +0900] "GET /asf-logo-wide.svg HTTP/1.1" 200 27235
172.16.2.6 - - [18/Dec/2025:23:39:11 +0900] "GET /bg-middle.png HTTP/1.1" 200 1918
```


### TLS Bridging(Re-encryption)

TLS 세션이 Client에서 시작되어 중간 장비에서 복호화된후, 다시 TLS로 암호화하여 실제 Web Server로 전송하는 방식을 `TLS Bridging(Re-encryption)`이라고 합니다.

대표적인 예로, 웹 브라우저(Client)에서 `https://google.com` 요청을 보내면 L7 LB/WAF와 같은 중간 장비에서 HTTPS 트래픽을 복호화 하여 HTTP 요청을 검사한 뒤, 다시 TLS로 암호화하여 HTTPS로 실제 Web Server에 전달합니다.  
(본 예시는 인프라 구성이 Client -> L7 LB/WAF -> WEB Server인 경우를 가정합니다.)

HAProxy 설정.

```bash
cd /usr/local/haproxy/etc/

# 설정 파일 백업
cp haproxy.cfg haproxy.cfg_$(date +%Y%m%d)

vi haproxy.cfg
```

```text
global
        # ... global 설정 부분 마지막 추가

        # intermediate security for SSL, from https://ssl-config.mozilla.org/
        ssl-default-bind-curves X25519:prime256v1:secp384r1
        ssl-default-bind-ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384:DHE-RSA-CHACHA20-POLY1305
        ssl-default-bind-ciphersuites TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256
        ssl-default-bind-options prefer-client-ciphers ssl-min-ver TLSv1.2 no-tls-tickets

        ssl-default-server-curves X25519:prime256v1:secp384r1
        ssl-default-server-ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384:DHE-RSA-CHACHA20-POLY1305
        ssl-default-server-ciphersuites TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256
        ssl-default-server-options ssl-min-ver TLSv1.2 no-tls-tickets

... defaults 설정 내용 생략

frontend a-site.com
        bind :443 ssl crt /usr/local/haproxy/certs/

        mode http

        # Host matching
        acl host_a hdr(host) -i a-site.com

        default_backend web_a

backend web_a
        mode http

        # Re-encryption
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
cd /usr/local/apache/conf/extra/

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

실시간 로그 확인.

```bash
# haproxy
tail -f /var/log/haproxy.log

Dec 20 14:39:28 localhost haproxy[1698]: xxx.28.xxx.28:41648 [20/Dec/2025:14:39:22.525] a-site.com~ web_a/web1 0/0/9/6176/6185 200 676 - - ---- 1/1/0/0/0 0/0 "GET https://a-site.com/ HTTP/2.0"
Dec 20 14:39:28 localhost haproxy[1698]: xxx.28.xxx.28:41648 [20/Dec/2025:14:39:28.933] a-site.com~ web_a/web1 0/0/0/4/4 200 556 - - ---- 1/1/1/1/0 0/0 "GET https://a-site.com/tomcat.css HTTP/2.0"
Dec 20 14:39:28 localhost haproxy[1698]: xxx.28.xxx.28:41648 [20/Dec/2025:14:39:28.934] a-site.com~ web_a/web1 0/0/3/2/6 200 605 - - ---- 1/1/0/0/0 0/0 "GET https://a-site.com/tomcat.svg HTTP/2.0"
Dec 20 14:39:29 localhost haproxy[1698]: xxx.28.xxx.28:41648 [20/Dec/2025:14:39:29.030] a-site.com~ web_a/web1 0/0/0/3/3 200 610 - - ---- 1/1/4/4/0 0/0 "GET https://a-site.com/bg-nav.png HTTP/2.0"
Dec 20 14:39:29 localhost haproxy[1698]: xxx.28.xxx.28:41648 [20/Dec/2025:14:39:29.030] a-site.com~ web_a/web1 0/0/0/3/3 200 617 - - ---- 1/1/3/3/0 0/0 "GET https://a-site.com/asf-logo-wide.svg HTTP/2.0"
Dec 20 14:39:29 localhost haproxy[1698]: xxx.28.xxx.28:41648 [20/Dec/2025:14:39:29.030] a-site.com~ web_a/web1 0/0/2/2/4 200 612 - - ---- 1/1/2/2/0 0/0 "GET https://a-site.com/bg-upper.png HTTP/2.0"
Dec 20 14:39:29 localhost haproxy[1698]: xxx.28.xxx.28:41648 [20/Dec/2025:14:39:29.030] a-site.com~ web_a/web1 0/0/4/1/5 200 613 - - ---- 1/1/1/1/0 0/0 "GET https://a-site.com/bg-button.png HTTP/2.0"
Dec 20 14:39:29 localhost haproxy[1698]: xxx.28.xxx.28:41648 [20/Dec/2025:14:39:29.030] a-site.com~ web_a/web1 0/0/4/2/6 200 613 - - ---- 1/1/0/0/0 0/0 "GET https://a-site.com/bg-middle.png HTTP/2.0"

# apache
tail -f /var/log/httpd/a-site.com_ssl-access_log-$(date +%Y%m%d)

- 172.16.2.6 - - [20/Dec/2025:14:39:22 +0900] "GET / HTTP/1.1" 200 11212 "-" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36" proto=- ssl=on TLSv1.3 TLS_AES_128_GCM_SHA256
- 172.16.2.6 - - [20/Dec/2025:14:39:28 +0900] "GET /tomcat.css HTTP/1.1" 200 5584 "https://a-site.com/" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36" proto=- ssl=on TLSv1.3 TLS_AES_128_GCM_SHA256
- 172.16.2.6 - - [20/Dec/2025:14:39:28 +0900] "GET /tomcat.svg HTTP/1.1" 200 67795 "https://a-site.com/" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36" proto=- ssl=on TLSv1.3 TLS_AES_128_GCM_SHA256
- 172.16.2.6 - - [20/Dec/2025:14:39:29 +0900] "GET /bg-nav.png HTTP/1.1" 200 1401 "https://a-site.com/tomcat.css" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36" proto=- ssl=on TLSv1.3 TLS_AES_128_GCM_SHA256
- 172.16.2.6 - - [20/Dec/2025:14:39:29 +0900] "GET /asf-logo-wide.svg HTTP/1.1" 200 27235 "https://a-site.com/tomcat.css" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36" proto=- ssl=on TLSv1.3 TLS_AES_128_GCM_SHA256
- 172.16.2.6 - - [20/Dec/2025:14:39:29 +0900] "GET /bg-upper.png HTTP/1.1" 200 3103 "https://a-site.com/tomcat.css" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36" proto=- ssl=on TLSv1.3 TLS_AES_128_GCM_SHA256
- 172.16.2.6 - - [20/Dec/2025:14:39:29 +0900] "GET /bg-button.png HTTP/1.1" 200 713 "https://a-site.com/tomcat.css" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36" proto=- ssl=on TLSv1.3 TLS_AES_128_GCM_SHA256
- 172.16.2.6 - - [20/Dec/2025:14:39:29 +0900] "GET /bg-middle.png HTTP/1.1" 200 1918 "https://a-site.com/tomcat.css" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36" proto=- ssl=on TLSv1.3 TLS_AES_128_GCM_SHA256
```

### End-to-End TLS(Pass-through)

TLS 세션이 Client에서 시작되어 Web Server 까지 유지되며, 중간 장비에서 TLS 세션을 종료하지 않는 방식을 `End-to-End TLS`라고 합니다.  
또한, 중간 장비는 TLS 패킷을 그대로 전달만 수행하므로 `Pass-through`방식이라고도 합니다.  
따라서 중간 장비는 HTTPS 트래픽을 복호화할 수 없으며, HTTP 요청 내용을 기반으로 WAF 탐지는 수행할 수 없습니다.

대표 예시로 웹 브라우저(Client)에서 `https://google.com` 요청을 하게 되면 LB/WAF 같은 중간 장비는  
TLS 트래픽을 그대로 전달하여 HTTPS 세션이 Web Server 까지 유지됩니다.  
(본 예시는 인프라 구성이 Client -> L7 LB/WAF -> WEB Server인 경우를 가정합니다.)

HAProxy 설정.

```bash
cd /usr/local/haproxy/etc/

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

        # Host matching
        acl host_a hdr(host) -i a-site.com

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

Apache 설정 생략.(위 설정 동일)

실시간 로그 확인.

```bash
# haproxy
tail -f /var/log/haproxy.log

# Pass through 확인
Dec 16 23:47:49 localhost haproxy[1718]: xxx.28.xxx.28:15109 [16/Dec/2025:23:47:37.647] a-site.com_https_passthrough web_a/web1 1/1/12023 4536 -- 6/6/5/5/0 0/0
Dec 16 23:47:49 localhost haproxy[1718]: xxx.28.xxx.28:15114 [16/Dec/2025:23:47:44.289] a-site.com_https_passthrough web_a/web1 1/0/5381 3491 -- 5/5/4/4/0 0/0
Dec 16 23:47:49 localhost haproxy[1718]: xxx.28.xxx.28:15119 [16/Dec/2025:23:47:44.249] a-site.com_https_passthrough web_a/web1 1/0/5424 3498 -- 4/4/3/3/0 0/0
Dec 16 23:48:04 localhost haproxy[1718]: xxx.28.xxx.28:15128 [16/Dec/2025:23:47:44.395] a-site.com_https_passthrough web_a/web1 1/0/20295 1803 -- 3/3/2/2/0 0/0
Dec 16 23:48:04 localhost haproxy[1718]: xxx.28.xxx.28:15124 [16/Dec/2025:23:47:44.396] a-site.com_https_passthrough web_a/web1 1/0/20295 1899 -- 2/2/1/1/0 0/0
Dec 16 23:48:04 localhost haproxy[1718]: xxx.28.xxx.28:15123 [16/Dec/2025:23:47:44.396] a-site.com_https_passthrough web_a/web1 1/0/20295 1803 -- 1/1/0/0/0 0/0

# apache
tail -f /var/log/httpd/a-site.com_ssl-access_log-$(date +%Y%m%d)

# HTTPS 통신 및 HTTP 복호화 확인
- 172.16.2.6 - - [16/Dec/2025:23:47:37 +0900] "GET / HTTP/1.1" 200 11212 "-" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36" proto=- ssl=on TLSv1.3 TLS_AES_256_GCM_SHA384
- 172.16.2.6 - - [16/Dec/2025:23:47:44 +0900] "GET /tomcat.css HTTP/1.1" 200 5584 "https://a-site.com/" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36" proto=- ssl=on TLSv1.3 TLS_AES_256_GCM_SHA384
- 172.16.2.6 - - [16/Dec/2025:23:47:44 +0900] "GET /tomcat.svg HTTP/1.1" 200 67795 "https://a-site.com/" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36" proto=- ssl=on TLSv1.3 TLS_AES_256_GCM_SHA384
- 172.16.2.6 - - [16/Dec/2025:23:47:44 +0900] "GET /bg-nav.png HTTP/1.1" 200 1401 "https://a-site.com/tomcat.css" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36" proto=- ssl=on TLSv1.3 TLS_AES_256_GCM_SHA384
- 172.16.2.6 - - [16/Dec/2025:23:47:44 +0900] "GET /asf-logo-wide.svg HTTP/1.1" 200 27235 "https://a-site.com/tomcat.css" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36" proto=- ssl=on TLSv1.3 TLS_AES_256_GCM_SHA384
- 172.16.2.6 - - [16/Dec/2025:23:47:44 +0900] "GET /bg-upper.png HTTP/1.1" 200 3103 "https://a-site.com/tomcat.css" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36" proto=- ssl=on TLSv1.3 TLS_AES_256_GCM_SHA384
- 172.16.2.6 - - [16/Dec/2025:23:47:44 +0900] "GET /bg-button.png HTTP/1.1" 200 713 "https://a-site.com/tomcat.css" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36" proto=- ssl=on TLSv1.3 TLS_AES_256_GCM_SHA384
- 172.16.2.6 - - [16/Dec/2025:23:47:44 +0900] "GET /bg-middle.png HTTP/1.1" 200 1918 "https://a-site.com/tomcat.css" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36" proto=- ssl=on TLSv1.3 TLS_AES_256_GCM_SHA384
- 172.16.2.6 - - [16/Dec/2025:23:48:04 +0900] "-" 408 - "-" "-" proto=- ssl=- TLSv1.3 TLS_AES_256_GCM_SHA384
- 172.16.2.6 - - [16/Dec/2025:23:48:04 +0900] "-" 408 - "-" "-" proto=- ssl=- TLSv1.3 TLS_AES_256_GCM_SHA384
- 172.16.2.6 - - [16/Dec/2025:23:48:04 +0900] "-" 408 - "-" "-" proto=- ssl=- TLSv1.3 TLS_AES_256_GCM_SHA384
```