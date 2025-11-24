---
title: Tomcat 설치 및 세션 클러스터링 적용
date: 2025-10-29
categories: [server, on-premise]
tags: [tomcat, session clustering, ajp, 톰캣 세션 클러스터링]
description: Tomcat 세션 클러스터링 적용 post
permalink: how-to-setup-tomcat-clustering
---

## 설치 정보

### 개요

| 구분 | 정보 | 서버 대상 |
| --- | --- | --- |
| OS | Rocky 9.6 | 모두 |
| 웹 서버(WEB) | Apache 2.4.65 | web-01, web-02 |
| 웹 어플리케이션 서버(WAS) | Tomcat 9.0.109, openJDK 17 | was-01, was-02 |

### 서버 정보

| 구분 | IP Address |
| --- | --- |
| was-01 | 172.16.2.1 |
| was-02 | 172.16.2.2 |
| web-01 | 172.16.3.1 |
| web-02 | 172.16.3.2 |

### WAS 정보

| 구분 | WAS 명 | WAS 경로 |
| --- | --- | --- |
| A site WAS | a-was | /usr/local/tomcat/a-was/ | 
| B site WAS | b-was | /usr/local/tomcat/b-was/ |

## Tomcat 설치

**서버 대상 : was-01, was-02**

### 의존 패키지 설치

```bash
dnf install java-17-openjdk httpd vim wget tar net-tools telnet
```

### was 디렉터리 생성 및 다운로드

```bash
# 디렉터리 생성
mkdir /usr/local/tomcat/

# 다운로드
mkdir ~/src/
cd ~/src/
wget https://archive.apache.org/dist/tomcat/tomcat-9/v9.0.109/bin/apache-tomcat-9.0.109.tar.gz
```

### was 구성

```bash
tar zxf apache-tomcat-9.0.109.tar.gz

cp -a apache-tomcat-9.0.109/ a-was/
cp -a apache-tomcat-9.0.109/ b-was/

# was경로 이동
mv a-was/ b-was/ /usr/local/tomcat/
cd /usr/local/tomcat/
ls -al
```

### was port 설정

| WAS 명 | WAS Port |
| --- | --- |
| a-was | 8005 |
| b-was | 8015 |

**a-was**

```bash
cd /usr/local/tomcat/a-was/conf/
ls -al
cp server.xml server.xml_origin
vi server.xml
```

18번 line `port="8005"` 기본 port이므로 수정x.
```xml
<!-- Note:  A "Server" is not itself a "Container", so you may not
     define subcomponents such as "Valves" at this level.
     Documentation at /docs/config/server.html
-->
<Server port="8005" shutdown="SHUTDOWN">
```

**b-was**

```bash
cd /usr/local/tomcat/b-was/conf/
ls -al
cp server.xml server.xml_origin
vi server.xml
```

18번 line `port="8015"` 수정.
```xml
<!-- Note:  A "Server" is not itself a "Container", so you may not
     define subcomponents such as "Valves" at this level.
     Documentation at /docs/config/server.html
-->
<Server port="8015" shutdown="SHUTDOWN">
```

## Apache 설치

**서버 대상 : web-01, web-02**

### 의존 패키지 설치

```bash
dnf install redhat-rpm-config gcc-c++ apr-util-devel pcre-devel openssl-devel \
            perl vim wget tar net-tools telnet
```

### 다운로드 및 설치

```bash
mkdir ~/src/
cd ~/src/

wget https://archive.apache.org/dist/httpd/httpd-2.4.65.tar.gz
tar zxf httpd-2.4.65.tar.gz
cd httpd-2.4.65
```

```bash
./configure \
--prefix=/usr/local/apache \
--enable-mods-shared=all
```

```bash
make -j$(nproc)
make install

# 설치확인
cd /usr/local/apache/
ls -al
bin/apachectl -v
```

### 기본 설정

```bash
cd /usr/local/apache/conf/
ls -al
cp httpd.conf httpd.conf_origin

sed -i 's|^#ServerName.*|ServerName 127.0.0.1:80|' httpd.conf
```

## AJP 설정

세션 클러스터링 테스트를 하기 위해선 먼저 AJP 설정을 하여 apache와 연결을 해야합니다.
> apache의 mod_jk 모듈을 사용하여 loadbalancer를 활성화 합니다.  
was1번 서버가 down되어도 was2번 서버로 요청 할 수 있습니다.
{: .prompt-info}

| WAS 명 | AJP Port|
| --- | --- |
| a-was | 8009 |
| b-was | 8019 |

### Tomcat 설정

**서버 대상: was-01, was02**  

#### a-was

```bash
cd /usr/local/tomcat/a-was/conf/
vi server.xml
```

125번 line 이동, Connector 태그 주석 해제.
```xml
<!-- Define an AJP 1.3 Connector on port 8009 -->
<Connector protocol="AJP/1.3"
           address="::1"
           port="8009"
           redirectPort="8443"
           maxParameterCount="1000"
           />
```
`address="0.0.0.0"` 수정 및 `secretRequired="false"` 추가.
```xml
<!-- Define an AJP 1.3 Connector on port 8009 -->
<Connector protocol="AJP/1.3"
           address="0.0.0.0"
           port="8009"
           redirectPort="8443"
           maxParameterCount="1000"
           secretRequired="false"
           />
```

142번 line 이동, `jvmRoute="a-was1/2"` 추가.

```xml
<!-- was-01 서버 -->
<Engine name="Catalina" defaultHost="localhost" jvmRoute="a-was1">
```

```xml
<!-- was-02 서버 -->
<Engine name="Catalina" defaultHost="localhost" jvmRoute="a-was2">
```

#### b-was

```bash
cd /usr/local/tomcat/b-was/conf/
vi server.xml
```

125번 line 이동, Connector 태그 주석 해제.
```xml
<!-- Define an AJP 1.3 Connector on port 8009 -->
<Connector protocol="AJP/1.3"
           address="::1"
           port="8009"
           redirectPort="8443"
           maxParameterCount="1000"
           />
```
`address="0.0.0.0"`, `port="8019"` 수정 및 `secretRequired="false"` 추가.
```xml
<!-- Define an AJP 1.3 Connector on port 8019 -->
<Connector protocol="AJP/1.3"
           address="0.0.0.0"
           port="8019"
           redirectPort="8443"
           maxParameterCount="1000"
           secretRequired="false"
           />
```

142번 line 이동, `jvmRoute="b-was1/2"` 추가.

```xml
<!-- was-01 서버 -->
<Engine name="Catalina" defaultHost="localhost" jvmRoute="b-was1">
```

```xml
<!-- was-02 서버 -->
<Engine name="Catalina" defaultHost="localhost" jvmRoute="b-was2">
```

#### AJP 방화벽 설정

```bash
firewall-cmd --add-port=8009/tcp --permanent
firewall-cmd --add-port=8019/tcp --permanent
firewall-cmd --reload
```

#### AJP 포트 통신 확인

```bash
/usr/local/tomcat/a-was/bin/startup.sh
/usr/local/tomcat/b-was/bin/startup.sh

ps -ef | grep java

# ajp port 확인
netstat -tnlp | grep 8009
netstat -tnlp | grep 8019
```

web-01 / web-02 서버에서 테스트
```bash
# was-01 서버 a-was, b-was ajp 통신 테스트
telnet 172.16.2.1 8009
telnet 172.16.2.1 8019
# was-02 서버 a-was, b-was ajp 통신 테스트
telnet 172.16.2.2 8009
telnet 172.16.2.2 8019

# 아래처럼 출력되면 성공
# Trying 172.16.2.x...
# Connected to 172.16.2.x.
# Escape character is '^]' 

# ctrl + ] 키 입력 후 quit 입력하여 telnet 종료
```

### Apache 설정

**서버 대상: was-01, was02**

#### mod_jk 모듈 설치

```bash
cd ~/src

wget https://archive.apache.org/dist/tomcat/tomcat-connectors/jk/tomcat-connectors-1.2.48-src.tar.gz
tar zxf tomcat-connectors-1.2.48-src.tar.gz
cd tomcat-connectors-1.2.48-src/native
```

```bash
./configure --with-apxs=/usr/local/apache/bin/apxs
```

```bash
make -j$(nproc)
make install
```

```bash
# mod_jk 모듈 생성 확인
ll /usr/local/apache/modules/mod_jk.so
```

#### mod_jk 모듈 활성화

```bash
vi /usr/local/apache/conf/httpd.conf
```

```bash
# LoadModule 리스트 맨 아래 추가.
...
LoadModule ...
LoadModule ...
# 추가
LoadModule jk_module modules/mod_jk.so

# 맨 밑 추가
Include conf/mod_jk.conf
```

#### mod_jk 모듈 기본 설정

```bash
vi /usr/local/apache/apache/conf/mod_jk.conf
```

```bash
<IfModule mod_jk.c>
    JkWorkersFile /usr/local/apache/apache/conf/workers.properties
    JkLogFile "|/usr/local/apache/apache/bin/rotatelogs /var/log/httpd/mod_jk.log-%Y%m%d 86400 540"
    JkLogLevel info
    JkLogStampFormat "[%a %b % %H:%M:%S %Y] "
</IfModule>
```

#### workers.properties 설정

```bash
vi /usr/local/apache/conf/workers.properties
```


## Troubleshooting
### could not find /usr/local/apache/bin/apxs  
configure: error: You must specify a valid --with-apxs path

apxs는 perl기반으로 작성되어있어 perl 패키지 설치 필요.
```bash
dnf install perl
```

perl 실행 지정
```
vi /usr/local/apache/bin/apxs

#!/replace/with/path/to/perl/interpreter
# 변경
#!/usr/bin/perl
```

다시 실행하면 정상 작동.