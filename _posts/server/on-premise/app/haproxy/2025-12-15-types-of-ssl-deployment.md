---
title: SSL/TLS 배포 아키텍쳐 종류별 실습
date: 2025-12-15
categories: [server, on-premise]
tags: [Pass through, End to End TLS, SSL Termination]
description: SSL/TLS 배포 아키텍쳐 종류별 실습 post
permalink: types-of-ssl-deployment
---

> update 중 . . .
{:.prompt-warning}

## 서버/설치 정보

| 구분 | IP Address |
| --- | --- |
| HAProxy server | 172.16.2.6 |
| web server | 172.16.3.1 |

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

## SSL/TLS 배포 아키첵터 종류

SSL 인증서 발급 및 적용 전제하에 진행.

### End-to-End TLS(Pass-through)

TLS가 Client(End)에서 Web Server(End)까지 중간에서 종료 되지 않고 유지되는 방식으로 이를 `End-to-End TLS` 라고 합니다.  
HAProxy와 같은 WAF 장비는 TLS 세션에 참여하지 않고 암호화된 패킷을 그대로 전달(Pass through)만 수행합니다.  
따라서 HTTPS 트래픽을 복호화하여 HTTP 요청을 분석 할 수 없으므로 WAF 탐지는 수행할 수 없습니다.

haproxy 설정.

```bash
cd /usr/local/haproxy/etc/

# 설정 파일 백업
cp haproxy.cfg haproxy.cfg_$(date +%Y%m%d)

vi haproxy.cfg
```

```text
global
    log /dev/log    local0
    log /dev/log    local1 notice
    chroot /usr/local/haproxy
    maxconn 4000
    user nobody
    group nobody

defaults
    log     global
    mode    http
    option  dontlognull
    timeout connect 5000
    timeout client  50000
    timeout server  50000

frontend a-site.com_https_passthrough
    bind *:443

    # 패킷만 전달하므로 tcp mode
    mode tcp
    option tcplog

    # Host matching
    acl host_a hdr(host) -i a-site.com

    default_backend web_a

backend web_a
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

Apache 설정.

```bash
cd /usr/local/apache/conf/extra/

cp httpd-ssl.conf httpd-ssl.conf_$(date +%Y%m%d)

vi httpd-ssl.conf
```

```text
# ... SSL 설정 내용 생략
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

```bash
# Syntax 체크
/usr/local/apache/bin/apachectl -t

# 재시작
/usr/local/apache/bin/apachectl graceful
```

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

### WAF SSL Termination

### TLS Bridging(Re-encryption)
