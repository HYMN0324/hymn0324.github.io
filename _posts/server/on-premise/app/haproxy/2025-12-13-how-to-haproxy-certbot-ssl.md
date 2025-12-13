---
title: HAProxy Certbot SSL 적용(Cloudflare)
date: 2025-12-13
categories: [server, on-premise]
tags: [haproxy, certbot, cloudflare, ssl]
description: HAProxy Certbot SSL 적용(Cloudflare) post
permalink: how-to-setting-haproxy-certbot-ssl-cloudflare
---

## certbot 설치

```bash
dnf install certbot python3-certbot-dns-cloudflare
systemctl start certbot-renew.timer
```

## cloudflare API 토큰 생성

프로파일 - 프로필   
<img src="/assets/img/posts/server/on-premise/app/haproxy/how-to-haproxy-certbot-ssl-cloudflare/cloudflare-token-1.png" width="50%" alt="cloudflare-token-1">  

API 토큰 - 토큰 생성
<img src="/assets/img/posts/server/on-premise/app/haproxy/how-to-haproxy-certbot-ssl-cloudflare/cloudflare-token-2.png" width="100%" alt="cloudflare-token-2">
<img src="/assets/img/posts/server/on-premise/app/haproxy/how-to-haproxy-certbot-ssl-cloudflare/cloudflare-token-3.png" width="100%" alt="cloudflare-token-2">
<img src="/assets/img/posts/server/on-premise/app/haproxy/how-to-haproxy-certbot-ssl-cloudflare/cloudflare-token-4.png" width="100%" alt="cloudflare-token-2">
<img src="/assets/img/posts/server/on-premise/app/haproxy/how-to-haproxy-certbot-ssl-cloudflare/cloudflare-token-5.png" width="70%" alt="cloudflare-token-2">
<img src="/assets/img/posts/server/on-premise/app/haproxy/how-to-haproxy-certbot-ssl-cloudflare/cloudflare-token-6.png" width="100%" alt="cloudflare-token-2">


```bash
# API Token 인증 테스트(2025-12-08기준 url)
curl "https://api.cloudflare.com/client/v4/user/tokens/verify" -H "Authorization: Bearer Token값
```

Token 값 저장.

```bash
mkdir ~/.cloudflare

vi ~/.cloudflare/cloudflare.ini
```

```text
dns_cloudflare_api_token = Token값
```

```bash
chmod 600 ~/.cloudflare/cloudflare.ini
```

## SSL 발급

```bash
certbot certonly --dns-cloudflare \
  --dns-cloudflare-credentials ~/.cloudflare/cloudflare.ini -d a-site.com

# SSL 인증서 생성 확인
ll /etc/letsencrypt/live/a-site.com/
```

## SSL pem 파일 생성

이유에 대한 내용은 update 예정.

```bash
mkdir /usr/local/haproxy/certs

chmod 755 /usr/local/haproxy/certs

# pem 파일 생성
cat /etc/letsencrypt/live/a-site.com/fullchain.pem /etc/letsencrypt/live/a-site.com/privkey.pem > /usr/local/haproxy/certs/a-site.com.pem

# pem 파일 확인
ll /usr/local/haproxy/certs/a-site.com.pem
```

## haproxy HTTPS 설정

```bash
vi /usr/local/haproxy/etc/haproxy.cfg
```

```text
frontend http-in
    bind *:443 ssl crt /usr/local/haproxy/certs/
    mode http

    # Host matching
    acl host_a hdr(host) -i a-site.com

    # common request
    use_backend web_a if host_a

backend web_a
    mode http
    server web1 172.16.3.1:80 check
```

haproxy 재기동.

```bash
# Syntax 체크
/usr/local/haproxy/sbin/haproxy -c -f /usr/local/haproxy/etc/haproxy.cfg

systemctl restart haproxy
```

### 방화벽 설정

```bash
firewall-cmd --add-port=443/tcp --permanent
firewall-cmd --reload
firewall-cmd --list-all
```

브라우저 접속 확인.
```
https://a-site.com
```

### 인증서 자동 갱신

certbot으로 자동 인증서 갱신 기능 적용해보도록 하겠습니다.

```bash
# SSL 발급 - DNS TXT 인증, haproxy 전용 SSL pem 파일 생성 작업 기준 스크립트 작성
vi /etc/letsencrypt/renewal-hooks/deploy/a-site.com.sh
```

```bash
#!/bin/bash

# .sh 확장자 제외한 파일명으로 도메인 명 동적 할당
DOMAIN=$(basename "$0" .sh)
LETS_ENCRYPT_PATH="/etc/letsencrypt/live/$DOMAIN"
HAPROXY_CERTS_PATH="/usr/local/haproxy/certs"

# ssl 인증서 생성
cat "$LETS_ENCRYPT_PATH/fullchain.pem" "$LETS_ENCRYPT_PATH/privkey.pem" > "$HAPROXY_CERTS_PATH/$DOMAIN.pem"

chmod 600 "$HAPROXY_CERTS_PATH/$DOMAIN.pem"
chown root:root "$HAPROXY_CERTS_PATH/$DOMAIN.pem"

# 무중단 반영으로 reload
systemctl reload haproxy
```

```bash
chmod 700 /etc/letsencrypt/renewal-hooks/deploy/a-site.com.sh
ll /etc/letsencrypt/renewal-hooks/deploy/a-site.com.sh
```

인증서 갱신 테스트 `--dry-run`

```bash
certbot renew --dry-run
```

<img src="/assets/img/posts/server/on-premise/app/waf/how-to-assoc-modsecurity-haproxy/certbot-renew-dry-run.png" width="70%" alt="certbot-renew-dry-run">