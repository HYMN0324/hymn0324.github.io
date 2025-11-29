---
title: Tomcat 세션 클러스터링 적용
date: 2025-10-29
categories: [server, on-premise]
tags: [tomcat, session clustering, ajp, 세션 클러스터링]
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
cd conf/
ls -al
cp httpd.conf httpd.conf_origin

# 기본 접속 정보 설정
sed -i 's|^#ServerName.*|ServerName 127.0.0.1:80|' httpd.conf

# apache log 경로 설정
sed -i 's|ErrorLog "logs/error_log"|ErrorLog "/var/log/httpd/error_log"|' httpd.conf
sed -i 's|CustomLog "logs/access_log" common|CustomLog "/var/log/httpd/access_log" common|' httpd.conf

# apache log 디렉터리 생성
mkdir /var/log/httpd/
```

```bash
# 문법 체크
/usr/local/apache/bin/apachectl -t
# Syntax OK
```

### 방화벽 설정

```bash
firewall-cmd --add-port=80/tcp --permanent
firewall-cmd --reload

firewall-cmd --list-all
```

## AJP 설정

세션 클러스터링 테스트를 하기 위해선 먼저 AJP 설정을 하여 apache와 연결을 해야합니다.
> apache의 mod_jk 모듈을 사용하여 loadbalancer를 활성화 합니다.  
was1번 서버가 down되어도 was2번 서버로 요청 할 수 있습니다.
{: .prompt-info}

### 주요 설정 내용

| WAS 명 | AJP Port|
| --- | --- |
| a-was | 8009 |
| b-was | 8019 |

### Tomcat

**서버 대상: was-01, was-02**  

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

#### 방화벽 설정

```bash
firewall-cmd --add-port=8009/tcp --permanent
firewall-cmd --add-port=8019/tcp --permanent
firewall-cmd --reload

firewall-cmd --list-all
```

#### AJP port listening 확인

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

### Apache

**서버 대상: web-01, web-02**

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

#### mod_jk 모듈 설정

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

...

# 맨 밑 추가
Include conf/mod_jk.conf
```

```bash
vi /usr/local/apache/conf/mod_jk.conf
```

```text
<IfModule mod_jk.c>
    JkWorkersFile /usr/local/apache/conf/workers.properties
    JkLogFile "|/usr/local/apache/bin/rotatelogs /var/log/httpd/mod_jk.log-%Y%m%d 86400 540"
    JkLogLevel info
    JkLogStampFormat "[%a %b % %H:%M:%S %Y] "
</IfModule>
```

#### workers.properties 설정

```bash
vi /usr/local/apache/conf/workers.properties
```

```text
worker.list=a-loadbalancer,b-loadbalancer

worker.a-loadbalancer.type=lb
worker.a-loadbalancer.balanced_workers=a-was1,a-was2

worker.a-was1.type=ajp13
worker.a-was1.host=172.16.2.1
worker.a-was1.port=8009

worker.a-was2.type=ajp13
worker.a-was2.host=172.16.2.2
worker.a-was2.port=8009


worker.b-loadbalancer.type=lb
worker.b-loadbalancer.balanced_workers=b-was1,b-was2

worker.b-was1.type=ajp13
worker.b-was1.host=172.16.2.1
worker.b-was1.port=8019

worker.b-was2.type=ajp13
worker.b-was2.host=172.16.2.2
worker.b-was2.port=8019
```

```bash
# 문법 체크
/usr/local/apache/bin/apachectl -t
# Syntax OK
```

#### 도메인 및 JkMount 설정

```bash
# httpd.conf - `httpd-vhosts.conf` Include 활성화
sed -i 's|^#Include conf/extra/httpd-vhosts.conf|Include conf/extra/httpd-vhosts.conf|' /usr/local/apache/conf/httpd.conf
```

```bash
cd /usr/local/apache/conf/extra/
ls -al
mv httpd-vhosts.conf httpd-vhosts.conf_origin
vi httpd-vhosts.conf
```

```text
# http://a-site.com 설정
<VirtualHost *:80>
    ServerName a-site.com
    
    # a-site.com의 모든 url 요청시 a-loadbalancer의 worker(a-was01, a-was02) 요청
    JkMount /* a-loadbalancer

    ErrorLog "|/usr/local/apache/bin/rotatelogs /var/log/httpd/a-site.com_error_log-%Y%m%d 86400 540"
    CustomLog "|/usr/local/apache/bin/rotatelogs /var/log/httpd/a-site.com_access_log-%Y%m%d 86400 540" common
</VirtualHost>

# http://b-site.com 설정
<VirtualHost *:80>
    ServerName b-site.com
    
    # b-site.com의 모든 url 요청시 b-loadbalancer의 worker(b-was01, b-was02) 요청
    JkMount /* b-loadbalancer

    ErrorLog "|/usr/local/apache/bin/rotatelogs /var/log/httpd/b-site.com_error_log-%Y%m%d 86400 540"
    CustomLog "|/usr/local/apache/bin/rotatelogs /var/log/httpd/b-site.com_access_log-%Y%m%d 86400 540" common
</VirtualHost>
```

```bash
# 문법 체크
/usr/local/apache/bin/apachectl -t
# Syntax OK
```

#### Apache 기동

```bash
/usr/local/apache/bin/apachectl start

ps -ef | grep httpd
netstat -tnlp | grep 80
```

### AJP 통신 테스트


**로컬 PC** `hosts` 파일 수정.

```text
# web-01 / web-02 둘 중 서버 IP 지정
172.16.3.1 a-site.com b-site.com
# 또는
172.16.3.2 a-site.com b-site.com
```

**로컬 PC**에서 브라우저 접속 또는`curl` 테스트.
```bash
curl http://a-site.com

curl http://b-site.com
```

접속 또는 curl 실시간 was 응답 확인.

**서버 대상: was-01, was-02**

```bash
tail -f /usr/local/tomcat/a-was/logs/localhost_access_log.$(date +%Y-%m-%d).txt

tail -f /usr/local/tomcat/b-was/logs/localhost_access_log.$(date +%Y-%m-%d).txt
```

> was-01, was-02 터미널 창 동시에 분할하여 실시간 로그 확인.
{: .prompt-info}

마지막으로 was-01 was-02 서버 둘중 was shutdown하여 지속 정상 접속 확인.
```
/usr/local/tomcat/a-was/bin/shutdown.sh

/usr/local/tomcat/b-was/bin/shutdown.sh
```

## 세션 클러스터링 설정

**서버 대상: was-01, was-02**

### 주요 설정 내용

| WAS 명 | Membership Port | Receiver Port |
| --- | --- | --- |
| a-was | 45564 | 5000 |
| b-was | 45565 | 5001 |

### a-was

`<distributable/>` 세션 복제 활성화.
```bash
vi /usr/local/tomcat/a-was/webapps/ROOT/WEB-INF/web.xml
```

```xml
  ...
  <distributable/>
</web-app>
```

`jvmRoute` 속성 추가.

```bash
vi /usr/local/tomcat/a-was/conf/server.xml
```

142번 line 이동.

```xml
<!-- was-01 서버 -->
<Engine name="Catalina" defaultHost="localhost" jvmRoute="a-was1">
```

```xml
<!-- was-02 서버 -->
<Engine name="Catalina" defaultHost="localhost" jvmRoute="a-was2">
```

Engine 설정 안에 추가.

```xml
      <!--For clustering, please take a look at documentation at:
          /docs/cluster-howto.html  (simple how to)
          /docs/config/cluster.html (reference documentation) -->
      <!--
      <Cluster className="org.apache.catalina.ha.tcp.SimpleTcpCluster"/>
      -->
      <Cluster className="org.apache.catalina.ha.tcp.SimpleTcpCluster"
               channelSendOptions="6">
        <!--
        ###########################################################################
          BackupManager(주-보조 복제) / DeltaManager(전체 노드 복제) 둘 중 1개 선택하여 설정
        ###########################################################################
        -->
        <!--
        <Manager className="org.apache.catalina.ha.session.BackupManager"
                 expireSessionsOnShutdown="false"
                 notifyListenersOnReplication="true"
                 mapSendOptions="6"/>
        -->
        <Manager className="org.apache.catalina.ha.session.DeltaManager"
                 expireSessionsOnShutdown="false"
                 notifyListenersOnReplication="true"/>

        <Channel className="org.apache.catalina.tribes.group.GroupChannel">
          <Membership className="org.apache.catalina.tribes.membership.McastService"
                      address="228.0.0.4"
                      port="45564"
                      frequency="500"
                      dropTime="3000"/>
          <Receiver className="org.apache.catalina.tribes.transport.nio.NioReceiver"
                    address="was-01 / was-02 서버 IP"
                    port="5000"
                    selectorTimeout="100"
                    maxThreads="6"/>

          <Sender className="org.apache.catalina.tribes.transport.ReplicationTransmitter">
            <Transport className="org.apache.catalina.tribes.transport.nio.PooledParallelSender"/>
          </Sender>
          <Interceptor className="org.apache.catalina.tribes.group.interceptors.TcpFailureDetector"/>
          <Interceptor className="org.apache.catalina.tribes.group.interceptors.MessageDispatchInterceptor"/>
          <Interceptor className="org.apache.catalina.tribes.group.interceptors.ThroughputInterceptor"/>
        </Channel>

        <!--
        <Valve className="org.apache.catalina.ha.tcp.ReplicationValve"
               filter=".*\.gif|.*\.js|.*\.jpeg|.*\.jpg|.*\.png|.*\.htm|.*\.html|.*\.css|.*\.txt"/>
        -->

        <Deployer className="org.apache.catalina.ha.deploy.FarmWarDeployer"
                  tempDir="/tmp/war-temp/"
                  deployDir="/tmp/war-deploy/"
                  watchDir="/tmp/war-listen/"
                  watchEnabled="false"/>

        <ClusterListener className="org.apache.catalina.ha.session.ClusterSessionListener"/>
      </Cluster>
```

> 이번 post 에서는 was 서버 2대로 클러스터링을 설정하기 때문에  
세션 복제간 was 부하에 지장이 없어 `DeltaManager` 전체 노드에 세션 복제 방식을 선택하였습니다.  
was 서버 여러대로 클러스터링 설정 할 경우 `BackupManager`를 권고합니다.
{: .prompt-warning}

### b-was

`<distributable/>` 세션 복제 활성화.
```bash
vi /usr/local/tomcat/a-was/webapps/ROOT/WEB-INF/web.xml
```

```xml
  ...
  <distributable/>
</web-app>
```

`jvmRoute` 속성 추가.

```bash
vi /usr/local/tomcat/b-was/conf/server.xml
```

142번 line 이동.

```xml
<!-- was-01 서버 -->
<Engine name="Catalina" defaultHost="localhost" jvmRoute="b-was1">
```

```xml
<!-- was-02 서버 -->
<Engine name="Catalina" defaultHost="localhost" jvmRoute="b-was2">
```

Engine 설정 안에 추가.

```xml
      <!--For clustering, please take a look at documentation at:
          /docs/cluster-howto.html  (simple how to)
          /docs/config/cluster.html (reference documentation) -->
      <!--
      <Cluster className="org.apache.catalina.ha.tcp.SimpleTcpCluster"/>
      -->
      <Cluster className="org.apache.catalina.ha.tcp.SimpleTcpCluster"
               channelSendOptions="6">
        <!--
        ###########################################################################
          BackupManager(주-보조 복제) / DeltaManager(전체 노드 복제) 둘 중 1개 선택하여 설정
        ###########################################################################
        -->
        <!--
        <Manager className="org.apache.catalina.ha.session.BackupManager"
                 expireSessionsOnShutdown="false"
                 notifyListenersOnReplication="true"
                 mapSendOptions="6"/>
        -->
        <Manager className="org.apache.catalina.ha.session.DeltaManager"
                 expireSessionsOnShutdown="false"
                 notifyListenersOnReplication="true"/>

        <Channel className="org.apache.catalina.tribes.group.GroupChannel">
          <Membership className="org.apache.catalina.tribes.membership.McastService"
                      address="228.0.0.4"
                      port="45565"
                      frequency="500"
                      dropTime="3000"/>
          <Receiver className="org.apache.catalina.tribes.transport.nio.NioReceiver"
                    address="was-01 / was-02 서버 IP"
                    port="5001"
                    selectorTimeout="100"
                    maxThreads="6"/>

          <Sender className="org.apache.catalina.tribes.transport.ReplicationTransmitter">
            <Transport className="org.apache.catalina.tribes.transport.nio.PooledParallelSender"/>
          </Sender>
          <Interceptor className="org.apache.catalina.tribes.group.interceptors.TcpFailureDetector"/>
          <Interceptor className="org.apache.catalina.tribes.group.interceptors.MessageDispatchInterceptor"/>
          <Interceptor className="org.apache.catalina.tribes.group.interceptors.ThroughputInterceptor"/>
        </Channel>

        <!--
        <Valve className="org.apache.catalina.ha.tcp.ReplicationValve"
               filter=".*\.gif|.*\.js|.*\.jpeg|.*\.jpg|.*\.png|.*\.htm|.*\.html|.*\.css|.*\.txt"/>
        -->

        <Deployer className="org.apache.catalina.ha.deploy.FarmWarDeployer"
                  tempDir="/tmp/war-temp/"
                  deployDir="/tmp/war-deploy/"
                  watchDir="/tmp/war-listen/"
                  watchEnabled="false"/>

        <ClusterListener className="org.apache.catalina.ha.session.ClusterSessionListener"/>
      </Cluster>
```

### 방화벽 설정
```bash
# Membership Port(udp)
firewall-cmd --add-port=45564/udp --permanent
firewall-cmd --add-port=45565/udp --permanent

# Receiver Port
firewall-cmd --add-port=5000/tcp --permanent
firewall-cmd --add-port=5001/tcp --permanent

firewall-cmd --reload

firewall-cmd --list-all
```

### 세션 클러스터링 테스트

**서버 대상 : was-01, was-02**

was 재기동.

```bash
/usr/local/tomcat/a-was/bin/shutdown.sh
/usr/local/tomcat/b-was/bin/shutdown.sh

/usr/local/tomcat/a-was/bin/startup.sh
/usr/local/tomcat/b-was/bin/startup.sh

ps -ef | grep java

netstat -tnlp | grep java
# AJP port, Receiver port 확인
# ...
# tcp6       0      0 :::8019                 :::*                    LISTEN      xxx/java          
# tcp6       0      0 :::8009                 :::*                    LISTEN      xxx/java
# tcp6       0      0 xxx.xx.x.x:5001         :::*                    LISTEN      xxx/java          
# tcp6       0      0 xxx.xx.x.x:5000         :::*                    LISTEN      xxx/java
```

세션 클러스터링 jsp 페이지 생성.

a-was

```bash
vi /usr/local/tomcat/a-was/webapps/ROOT/sessionTest.jsp
```

```jsp
<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<%@ page import="java.util.*" %>

<%
    // 세션 생성 시간 및 세션 ID
    String sessionId = session.getId();
    Date createTime = new Date(session.getCreationTime());
    Date lastAccess = new Date(session.getLastAccessedTime());

    // 세션에 카운터 저장
    Integer count = (Integer)session.getAttribute("count");
    if(count == null) {
        count = 1;
    } 
    else {
        count++;
    }
    session.setAttribute("count", count);
%>
<html>
    <head>
        <title>a-was Session Clustering Test</title>
    </head>
    <body>
        <h2>a-was Session Clustering Test</h2>
        
        <hr>
        
        <p><b>Session ID:</b><%= sessionId %></p>
        <p><b>Access Count (세션 유지 확인용):</b><%= count %></p>
        
        <p><a href="sessionTest.jsp">[새로고침]</a></p>
    </body>
</html>
```

b-was

```bash
vi /usr/local/tomcat/b-was/webapps/ROOT/sessionTest.jsp
```

```jsp
<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<%@ page import="java.util.*" %>

<%
    // 세션 생성 시간 및 세션 ID
    String sessionId = session.getId();
    Date createTime = new Date(session.getCreationTime());
    Date lastAccess = new Date(session.getLastAccessedTime());

    // 세션에 카운터 저장
    Integer count = (Integer)session.getAttribute("count");
    if(count == null) {
        count = 1;
    } 
    else {
        count++;
    }
    session.setAttribute("count", count);
%>
<html>
    <head>
        <title>b-was Session Clustering Test</title>
    </head>
    <body>
        <h2>b-was Session Clustering Test</h2>
        
        <hr>
        
        <p><b>Session ID:</b><%= sessionId %></p>
        <p><b>Access Count (세션 유지 확인용):</b><%= count %></p>
        
        <p><a href="sessionTest.jsp">[새로고침]</a></p>
    </body>
</html>
```

브라우저 접속 하여 연속 새로고침. `F5` 
```text 
<http://a-site.com/sessionTest.jsp>{:target="_blank"}  
<http://b-site.com/sessionTest.jsp>{:target="_blank"}
```

apache의 lb를 통해 session ID 끝에 표시된 서버에 연결되어있는것을 확인.  
<img src="/assets/img/posts/server/on-premise/app/tomcat/how-to-setup-tomcat-clustering/sessionTest1.png" width="70%" alt="sessionTest1">

현재 a-was1번으로 연결되어있을경우 was-01서버 a-was `shutdown` 후 새로고침.
```bash
/usr/local/tomcat/a-was/bin/shutdown.sh
```

브라우저 새로고침하면 세션값 유지 되면서 a-was2번으로 연결되는것을 확인 할 수 있습니다.

<img src="/assets/img/posts/server/on-premise/app/tomcat/how-to-setup-tomcat-clustering/sessionTest2.png" width="70%" alt="sessionTest2">

b-was 동일 테스트. 

🎉세션 클러스터링 적용 완료.

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
