---
title: HAProxy + ModSecurity WAF 구성
date: 2025-12-02
categories: [server, on-premise]
tags: [HAProxy, ModSecurity, OWASP, WAF]
description: HAProxy + ModSecurity WAF 구성 post
permalink: how-to-assoc-haproxy-modsecurity
---

## 기본 패키지 설치

```bash
dnf install wget tar gcc gcc-c++ make net-tools
```

## HAProxy 설치

### 의존 패키지 설치

```bash
dnf install openssl-devel pcre2-devel
dnf --enablerepo=crb install lua-devel
```

### 다운로드 및 설치

```bash
wget https://github.com/haproxy/haproxy/archive/refs/tags/v3.3.0.tar.gz
tar zxf v3.3.0.tar.gz
cd haproxy-3.3.0/
```

```bash
make -j$(nproc) TARGET=linux-glibc \ 
USE_OPENSSL=1 USE_QUIC=1 USE_QUIC_OPENSSL_COMPAT=1 USE_LUA=1 USE_PCRE2=1

make install PREFIX=/usr/local/haproxy/
```

### 기본 설정

```bash
cd /usr/local/haproxy/

mkdir etc/
mkdir log/
mkdir run/
mkdir lib/

vi etc/haproxy.cfg
```

```text
global
    log /dev/log    local0
    log /dev/log    local1 notice
    chroot /usr/local/haproxy
    maxconn 4000
    user nobody
    group nobody
    # daemon

defaults
    log     global
    mode    http
    option  httplog
    option  dontlognull
    timeout connect 5000
    timeout client  50000
    timeout server  50000

frontend http-in
    bind *:80
    acl host_a hdr(host) -i a-site.com
    use_backend web_a if host_a

backend web_a
    mode http
    server web1 172.16.3.1:80 check
```

```bash
# Syntax 체크
/usr/local/haproxy/sbin/haproxy -c -f /usr/local/haproxy/etc/haproxy.cfg
```

### 시스템 데몬 등록

```bash
vi /etc/systemd/system/haproxy.service
```

```text
[Unit]
Description=HAProxy 3.3
After=network.target

[Service]
Type=notify
ExecStart=/usr/local/haproxy/sbin/haproxy -Ws \
    -f /usr/local/haproxy/etc/haproxy.cfg \
    -p /usr/local/haproxy/run/haproxy.pid

ExecReload=/usr/local/haproxy/sbin/haproxy -f /usr/local/haproxy/etc/haproxy.cfg -c -q
ExecReload=/bin/kill -USR2 $MAINPID

ExecStop=/bin/kill -TERM $MAINPID

RuntimeDirectory=haproxy
RuntimeDirectoryMode=0755

User=root
Group=root

Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload
systemctl start haproxy
systemctl status haproxy
systemctl enable haproxy
```

## modsecurity 설치

### 의존 패키지 설치

```bash
dnf install curl-devel libxml2-devel openssl-devel pcre-devel pcre2-devel

dnf --enablerepo=crb install lua-devel yajl-devel \
                             lmdb-devel libmaxminddb-devel doxygen

dnf install epel-release
dnf install ssdeep-devel
```

### 다운로드 및 설치

```bash
mkdir ~/src/
cd ~/src/

wget https://github.com/owasp-modsecurity/ModSecurity/releases/download/v3.0.14/modsecurity-v3.0.14.tar.gz

tar zxf modsecurity-v3.0.14.tar.gz
cd modsecurity-v3.0.14/

./configure --prefix=/usr/local/modsecurity/ --with-pcre2 --with-lmdb
```

```bash
make -j$(nproc)
make install
```

### 설정 파일 적용

```bash
mkdir /usr/local/modsecurity/conf/

cp modsecurity.conf-recommended /usr/local/modsecurity/conf/modsecurity.conf
cp unicode.mapping /usr/local/modsecurity/conf/
```

## spoa-modsecurity 설치

### 의존 패키지 설치

```bash
dnf install git libevent-devel libassan
```

### 다운로드 및 설치

```bash
cd ~/src/
git clone https://github.com/FireBurn/spoa-modsecurity.git

cd spoa-modsecurity/

# modsecurity 설치 경로 수정
sed -i 's|^PREFIX[[:space:]]*=[[:space:]]*/usr/local$|PREFIX     = /usr/local/modsecurity|' Makefile
sed -i 's|ModSecurity-v3.0.5/INSTALL/||g' Makefile

make -j$(nproc)
make install

ll /usr/local/modsecurity/bin/modsecurity
```

### 시스템 데몬 적용

```bash
vi /etc/systemd/system/modsecurity.service
```

```text
[Unit]
Description=Modsecurity Standalone
After=network.target

[Service]
Environment=LD_LIBRARY_PATH=/usr/local/modsecurity/lib
Environment=CONFIG=/usr/local/modsecurity/conf/modsecurity.conf
ExecStart=/usr/local/modsecurity/bin/modsecurity -f $CONFIG
ExecReload=/bin/kill -USR2 $MAINPID
ExecStop=/bin/kill -TERM $MAINPID
Restart=always
Type=simple

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload

systemctl start modsecurity
systemctl status modsecurity
systemctl enable modsecurity
```

## OWASP CRS 4.0 적용

### 다운로드 및 적용

```bash
wget https://github.com/coreruleset/coreruleset/archive/refs/tags/v4.0.0.tar.gz

tar zxf v4.0.0.tar.gz
mv coreruleset-4.0.0 /usr/local/crs4

cd /usr/local/crs4/

cp crs-setup.conf.example crs-setup.conf

vi /usr/local/modsecurity/conf/modsecurity.conf
```

맨 아래 추가.
```text
Include /usr/local/crs4/crs-setup.conf
Include /usr/local/crs4/rules/*.conf
```

modsecurity 재시작.

```bash
systemctl restart modsecurity
systemctl status modsecurity
```

## HAProxy + ModSecurity 연동

### spoe 설정

spoa-modsecurity `README` 파일 참조하여 설정 하였습니다.

<img src="/assets/img/posts/server/on-premise/app/waf/how-to-assoc-modsecurity-haproxy/spoa-modsecurity-config.png" width="100%" alt="spoa-modsecurity-config">

```bash
vi /usr/local/haproxy/etc/spoe-modsecurity.conf
```

```text
[modsecurity]

spoe-agent modsecurity-agent
    messages check-request
    option var-prefix modsec
    timeout hello      100ms
    timeout idle       30s
    timeout processing 15ms
    use-backend spoe-modsecurity

spoe-message check-request
    args unique-id src src_port dst dst_port method path query req.ver req.hdrs_bin req.body_size req.body
    event on-frontend-http-request
```

### haproxy 설정

```bash
vi /usr/local/haproxy/etc/haproxy.cfg
```

```text
frontend http-in
    bind *:80

    acl host_a hdr(host) -i a-site.com
    use_backend web_a if host_a

    # 추가
    option http-buffer-request
    filter spoe engine modsecurity config /usr/local/haproxy/etc/spoe-modsecurity.conf

    unique-id-format %{+X}o\ %ci:%cp_%fi:%fp_%Ts_%rt:%pid
    unique-id-header X-Unique-ID
    log-format "%ci:%cp [%tr] %ft %b/%s %TR/%Tw/%Tc/%Tr/%Ta %ST %B %CC %CS %tsc %ac/%fc/%bc/%sc/%rc %sq/%bq %hr %hs %{+Q}r %[unique-id]"
    # 추가 끝

# 추가
backend spoe-modsecurity
    mode tcp
    balance roundrobin
    timeout connect 5s
    timeout server 3m
    server modsec1 127.0.0.1:12345
# 추가 끝

backend web_a
    mode http
    server web1 172.16.3.1:80 check
```

```bash
systemctl restart haproxy
systemctl status haproxy
```

### 테스트

```bash
curl -I "https://a-site.com/?cmd=/bin/pkexec"

tail -n 1 /var/log/modsec_audit.log
```

CRS 감지완료
<img src="/assets/img/posts/server/on-premise/app/waf/how-to-assoc-modsecurity-haproxy/haproxy-modsecurity-test.png" width="100%" alt="haproxy-modsecurity-test">


## SSL 적용

SSL 발급 방법: DNS TXT 인증

cloudflare 기준으로 post 작성하겠습니다.

### certbot 설치

```bash
dnf install certbot
systemctl start certbot-renew.timer
```

### cloudflare 연동

API Token 생성 과정 생략.  
DNS TXT 인증 기반으로 SSL 생성하므로, cloudflare에 있는 DNS를 수정 할 수 있는 API Token을 먼저 생성해야합니다.(추후 post 예정)

```bash
dnf install python3-certbot-dns-cloudflare

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

### SSL 발급 - DNS TXT 인증

```bash
certbot certonly --dns-cloudflare \
  --dns-cloudflare-credentials ~/.cloudflare/cloudflare.ini -d a-site.com

# SSL 인증서 생성 확인
ll /etc/letsencrypt/live/a-site.com/
```

### haproxy 전용 SSL pem 파일 생성

이유에 대한 내용은 update 예정.

```bash
mkdir /usr/local/haproxy/certs

chmod 755 /usr/local/haproxy/certs

# pem 파일 생성
cat /etc/letsencrypt/live/a-site.com/fullchain.pem /etc/letsencrypt/live/a-site.com/privkey.pem > /usr/local/haproxy/certs/a-site.com.pem

# pem 파일 확인
ll /usr/local/haproxy/certs/a-site.com.pem
```

### haproxy HTTPS 설정

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

## 참조
haproxy spoe - <https://www.haproxy.com/blog/extending-haproxy-with-the-stream-processing-offload-engine>{:target="_blank"}  
               <https://www.haproxy.com/blog/scalable-waf-protection-with-haproxy-and-apache-with-modsecurity>{:target="_blank"}