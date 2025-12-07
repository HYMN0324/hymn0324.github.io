---
title: ModSecurity + HAProxy WAF 구성
date: 2025-12-02
categories: [server, on-premise]
tags: [WAF, ModSecurity, OWASP, HAProxy]
description: ModSecurity + HAProxy WAF 구성 post
permalink: how-to-assoc-modsecurity-haproxy
---

> update 중. . .
{: .prompt-warning}

### post 이력
* 12/02: waf vm 생성하여 haproxy + modsecurity 구성 시도
* 12/03: modsecurity, spoa-modsecurity, OWASP 설치
* 12/04: haproxy 설치
* 12/05: haproxy 설정
* 12/07: certbot 설치 및 도메인 설정

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
# 문법체크
/usr/local/haproxy/sbin/haproxy -c -f /usr/local/haproxy/etc/haproxy.cfg
```

### 시스템 데몬 등록

```bash
vi /etc/systemd/system/haproxy.service
```

```text
[Unit]
Description=HAProxy Load Balancer
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

cp modsecurity.conf-recommended /usr/local/modsecurity/conf/
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

## OWASP CRS 설치

### 다운로드 및 설치

```bash
wget https://github.com/coreruleset/coreruleset/archive/refs/tags/v4.0.0.tar.gz

tar zxf v4.0.0.tar.gz
mv coreruleset-4.0.0 /usr/local/crs4

cd /usr/local/crs4/

cp crs-setup.conf.example crs-setup.conf
```
### Modsecurity 적용

```bash
vi /usr/local/modsecurity/conf/modsecurity.conf
```

```text
include /usr/local/crs4/crs-setup.conf
include /usr/local/crs4/rules/REQUEST-901-INITIALIZATION.conf
include /usr/local/crs4/rules/REQUEST-905-COMMON-EXCEPTIONS.conf
include /usr/local/crs4/rules/REQUEST-910-IP-REPUTATION.conf
include /usr/local/crs4/rules/REQUEST-911-METHOD-ENFORCEMENT.conf
include /usr/local/crs4/rules/REQUEST-912-DOS-PROTECTION.conf
include /usr/local/crs4/rules/REQUEST-913-SCANNER-DETECTION.conf
include /usr/local/crs4/rules/REQUEST-920-PROTOCOL-ENFORCEMENT.conf
include /usr/local/crs4/rules/REQUEST-921-PROTOCOL-ATTACK.conf
include /usr/local/crs4/rules/REQUEST-930-APPLICATION-ATTACK-LFI.conf
include /usr/local/crs4/rules/REQUEST-931-APPLICATION-ATTACK-RFI.conf
include /usr/local/crs4/rules/REQUEST-932-APPLICATION-ATTACK-RCE.conf
include /usr/local/crs4/rules/REQUEST-933-APPLICATION-ATTACK-PHP.conf
include /usr/local/crs4/rules/REQUEST-941-APPLICATION-ATTACK-XSS.conf
include /usr/local/crs4/rules/REQUEST-942-APPLICATION-ATTACK-SQLI.conf
include /usr/local/crs4/rules/REQUEST-943-APPLICATION-ATTACK-SESSION-FIXATION.conf
include /usr/local/crs4/rules/REQUEST-949-BLOCKING-EVALUATION.conf
include /usr/local/crs4/rules/RESPONSE-950-DATA-LEAKAGES.conf
include /usr/local/crs4/rules/RESPONSE-951-DATA-LEAKAGES-SQL.conf
include /usr/local/crs4/rules/RESPONSE-952-DATA-LEAKAGES-JAVA.conf
include /usr/local/crs4/rules/RESPONSE-953-DATA-LEAKAGES-PHP.conf
include /usr/local/crs4/rules/RESPONSE-954-DATA-LEAKAGES-IIS.conf
include /usr/local/crs4/rules/RESPONSE-959-BLOCKING-EVALUATION.conf
include /usr/local/crs4/rules/RESPONSE-980-CORRELATION.conf
```

## 무료 ssl 적용

### certbot 설치

```bash
dnf install certbot
systemctl start certbot-renew.timer
```

### 방화벽 설정

```bash
firewall-cmd --add-port=8888/tcp --permanent
firewall-cmd --reload
firewall-cmd --list-all
```
외부 통신 설정 과정은 생략.

### haproxy 설정

```bash
vi /usr/local/haproxy/etc/haproxy.cfg
```

```text
frontend http-in
    bind *:80
    mode http

    # Let's Encrypt Validation Path
    acl acme_challenge path_beg /.well-known/acme-challenge/

    # ACME
    use_backend acme_a if acme_challenge

    # Host matching
    acl host_a hdr(host) -i a-site.com

    # common request
    use_backend web_a if host_a

backend acme_a
    mode http
    server certbot 127.0.0.1:8888
```

```bash
/usr/local/haproxy/sbin/haproxy -c -f /usr/local/haproxy/etc/haproxy.cfg

systemctl restart haproxy
systemctl status haproxy
```


### 인증서 생성

```bash
mkdir -p /var/www/letsencrypt

certbot certonly --webroot -w /var/www/letsencrypt --http-01-port 8888 -d a-site.com
```

> 무중단으로 인증서 생성 및 갱신 하려면 80번포트가 아닌 다른포트로 사용하여 인증해야합니다.
{: .prompt-info}