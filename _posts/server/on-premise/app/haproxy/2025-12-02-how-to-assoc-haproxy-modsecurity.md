---
title: HAProxy + ModSecurity WAF 구성
date: 2025-12-02
categories: [server, on-premise]
tags: [HAProxy, ModSecurity, OWASP, WAF]
description: HAProxy + ModSecurity WAF 구성 post
permalink: how-to-assoc-haproxy-modsecurity
---

## 설치 정보

| 구분 | 버전 |
| --- | --- |
| OS | Rocky 9.6 |
| HAProxy | HAProxy 3.3.0 |
| ModSecurity | ModSecurity 3.0.14 |
| SPOA | SPOA-ModSecurity3 |
| OWASP CRS | CRS 4.0 |

## 서버 정보

| 구분 | IP Address |
| --- | --- |
| HAProxy server | 172.16.2.6 |
| web server | 172.16.3.1 |

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
# haproxy 실행 전용 계정 생성
useradd -r -s /sbin/nologin haproxy

cd /usr/local/haproxy/

mkdir etc/
mkdir log/
mkdir run/
mkdir lib/

vi etc/haproxy.cfg
```

```text
global
        # all file names are relative to the directory containing this config
        # file by default
        default-path config

        # refuse to start if any warning is emitted at boot (keep configs clean)
        zero-warning

        # Security hardening: isolate and drop privileges
        chroot /var/empty
        user haproxy
        group haproxy

        # daemonize
        # system 데몬 등록 예정으로 daemon 옵션 주석
        #daemon
        pidfile /var/run/haproxy-svc1.pid

        # do not keep old processes longer than that after a reload
        hard-stop-after 5m

        # The command-line-interface (CLI) used by the admin, by provisionning
        # tools, and to transfer sockets during reloads
        stats socket /var/run/haproxy-svc1.sock level admin mode 600 user haproxy expose-fd listeners
        stats timeout 1h

        # send logs to stderr for logging via the service manager
        log stderr local0 info

defaults http
        mode http
        option httplog
        log     global
        timeout client  1m
        timeout server  1m
        timeout connect 10s
        timeout http-keep-alive 2m
        timeout queue 15s
        timeout tunnel 4h # for websocket

frontend http-in
        bind :80
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

### 방화벽 설정

```bash
firewall-cmd --add-port=80/tcp --permanent
firewall-cmd --add-port=443/tcp --permanent
firewall-cmd --reload
firewall-cmd --list-all
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
ExecStart=/usr/local/haproxy/sbin/haproxy -Ws -f /usr/local/haproxy/etc/haproxy.cfg

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

<img src="/assets/img/posts/server/on-premise/app/haproxy/how-to-assoc-haproxy-modsecurity/spoa-modsecurity-config.png" width="100%" alt="spoa-modsecurity-config">

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
curl -I "http://a-site.com/?cmd=/bin/pkexec"

tail -n 1 /var/log/modsec_audit.log
```

CRS 감지완료
<img src="/assets/img/posts/server/on-premise/app/haproxy/how-to-assoc-haproxy-modsecurity/haproxy-modsecurity-test.png" width="100%" alt="haproxy-modsecurity-test">

## 참조
haproxy spoe - <https://www.haproxy.com/blog/extending-haproxy-with-the-stream-processing-offload-engine>{:target="_blank"}  
               <https://www.haproxy.com/blog/scalable-waf-protection-with-haproxy-and-apache-with-modsecurity>{:target="_blank"}