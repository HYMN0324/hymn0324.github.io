---
title: Tomcat 설치 및 세션 클러스터링 적용(on-premise)
date: 2025-10-29
categories: [server, on-premise]
tags: [tomcat, session clustering, ajp, 톰캣 세션 클러스터링]
description: Tomcat 세션 클러스터링 적용(on-premise) post
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

| WAS 명 | WAS 경로 | 용도 |
| --- | --- | --- |
| a-was | /usr/local/tomcat/a-was/ | A site WAS |
| b-was | /usr/local/tomcat/b-was/ | B site WAS |

## AJP 설정 - Tomcat

**서버 대상 : was-01, was-02**

### 의존 패키지 설치

```bash
dnf install java-17-openjdk httpd vim wget tar net-tools telnet
```

### Tomcat 디렉터리 생성 및 다운로드

```bash
# 디렉터리 생성
mkdir /usr/local/tomcat/

# 다운로드
mkdir ~/src/
cd ~/src/

wget https://archive.apache.org/dist/tomcat/tomcat-9/v9.0.109/bin/apache-tomcat-9.0.109.tar.gz
```

### AJP 설정

세션 클러스터링 테스트를 하기 위해선 먼저 AJP 설정을 하여 apache와 연결을 해야합니다.
> apache의 mod_jk 모듈을 사용하여 loadbalancer를 활성화 합니다.  
was1번 서버가 down되어도 was2번 서버로 요청 할 수 있습니다.
{: .prompt-info}

**a-was** 설정

```bash
tar zxf apache-tomcat-9.0.109.tar.gz
mv apache-tomcat-9.0.109 a-was
mv a-was /usr/local/tomcat/

cd /usr/local/tomcat/a-was/conf/
cp server.xml server.xml_origin
vi server.xml
```

125번 line 이동하여 Connector 태그 주석 해제.
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

142번 line 이동하여 `jvmRoute="a-was1/2"` 추가.

```xml
<!-- was-01 서버 -->
<Engine name="Catalina" defaultHost="localhost" jvmRoute="a-was1">
```

```xml
<!-- was-02 서버 -->
<Engine name="Catalina" defaultHost="localhost" jvmRoute="a-was2">
```

### AJP 방화벽 설정

```bash
firewall-cmd --add-port=8009/tcp --permanent
firewall-cmd --reload
```

### AJP 포트 및 통신 확인

```bash
/usr/local/tomcat/a-was/bin/startup.sh

# 8009 port 확인
netstat -tnlp | grep 8009
```

web-01 / web-02 서버에서 테스트
```bash
# was-01 서버 a-was ajp 통신 테스트.
telnet 172.16.2.1:8009
# was-02 서버 a-was ajp 통신 테스트.
telnet 172.16.2.2:8009

# 아래처럼 출력되면 성공.
# Trying 172.16.2.x...
# Connected to 172.16.2.x.
# Escape character is '^]' 

# ctrl + ] 키 입력 후 quit 입력하여 나가기.
```

## AJP 설정 - Apache