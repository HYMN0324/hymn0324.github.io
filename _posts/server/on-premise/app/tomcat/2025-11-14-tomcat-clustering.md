---
title: Tomcat 설치 및 세션 클러스터링 적용(on-premise)
date: 2025-10-29
categories: [server, on-premise]
tags: [tomcat, session clustering]
description: Tomcat 세션 클러스터링 적용(on-premise) post
permalink: server/on-premise/app/tomcat
---

# 설치 정보

| 구분 | 정보 | 서버 대상 |
| --- | --- | --- |
| OS | Rocky 9.6 | 모두 |
| 웹 서버(WEB) | Apache 2.4.65 | web-01, web-02 |
| 웹 어플리케이션 서버(WAS) | Tomcat 9.0.109, openJDK 17 | was-01, was-02 |

특이사항: 설치 경로 및 일반 설정은 해당 고객사 요청에 따라 작업하였음.

# Tomcat 설치

서버 대상 : was-01, was-02

## 의존 패키지 설치

```bash
dnf install java-17-openjdk httpd vim wget tar
```

httpd 설치이유 - Apache에 제공되는 rotatelogs 명령어로 Tomcat 로그 파일 날짜 별 적재하기 위해 설치

## Tomcat 설치 및 설정

```bash
mkdir ~/src
cd ~/src

wget https://archive.apache.org/dist/tomcat/tomcat-9/v9.0.109/bin/apache-tomcat-9.0.109.tar.gz
tar zxf apache-tomcat-9.0.109.tar.gz
```

### ws-ecs-server

```bash
cd ~/src/apache-tomcat-9.0.109/conf/
cp server.xml server.xml_origin

vi server.xml
```

```
...
<Server port="8005" shutdown="SHUTDOWN">
...

<!-- OpenSSL support using Tomcat Native -->
<Listener className="org.apache.catalina.core.AprLifecycleListener" SSLEngine="on" />
...
<Service name="ECS">
...
<Connector port="8080" protocol="HTTP/1.1"
           connectionTimeout="20000"
           server="Unknown"
           redirectPort="8443" URIEncoding="UTF-8" />
...

# 주석해제
<Connector protocol="AJP/1.3"
           address="0.0.0.0"
           port="8009"
           secretRequired="false"
           redirectPort="8443" URIEncoding="UTF-8" />
...

<Engine name="ECS" defaultHost="localhost" jvmRoute="ecs1/2">

      <!--For clustering, please take a look at documentation at:
          /docs/cluster-howto.html  (simple how to)
          /docs/config/cluster.html (reference documentation) -->
      <!--
      <Cluster className="org.apache.catalina.ha.tcp.SimpleTcpCluster"/>
      -->
      <Cluster className="org.apache.catalina.ha.tcp.SimpleTcpCluster"
               channelSendOptions="8">

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
                    address="서버 IP"
                    port="4000"
                    autoBind="100"
                    selectorTimeout="5000"
                    maxThreads="6"/>

          <Sender className="org.apache.catalina.tribes.transport.ReplicationTransmitter">
            <Transport className="org.apache.catalina.tribes.transport.nio.PooledParallelSender"/>
          </Sender>
          <Interceptor className="org.apache.catalina.tribes.group.interceptors.TcpFailureDetector"/>
          <Interceptor className="org.apache.catalina.tribes.group.interceptors.MessageDispatchInterceptor"/>
        </Channel>

        <Valve className="org.apache.catalina.ha.tcp.ReplicationValve"
               filter=""/>
        <Valve className="org.apache.catalina.ha.session.JvmRouteBinderValve"/>

        <Deployer className="org.apache.catalina.ha.deploy.FarmWarDeployer"
                  tempDir="/tmp/war-temp/"
                  deployDir="/tmp/war-deploy/"
                  watchDir="/tmp/war-listen/"
                  watchEnabled="false"/>

        <ClusterListener className="org.apache.catalina.ha.session.ClusterSessionListener"/>
      </Cluster>
...

  <Host name="localhost" appBase="webapps"
            unpackWARs="true" autoDeploy="true">
	  ...
	  
	  <!-- Access log processes all example.
	             Documentation at: /docs/config/valve.html
	             Note: The pattern used is equivalent to using pattern="common" -->
	  <Valve className="org.apache.catalina.valves.AccessLogValve" directory="/data3/logs/tomcat/ws-ecs-server"
	         prefix="localhost_access_log" suffix=".txt"
	         pattern="%h %l %u %t &quot;%r&quot; %s %b %{Referer}i %{User-Agent}i" />
  </Host>
</Engine>
```

```bash
vi ~/src/apache-tomcat-9.0.109/webapps/ROOT/WEB-INF/web.xml
```

```
...
  # 맨 아래 추가(세션 객체를 다른 Tomcat 노드로 전송(복제)하는 옵션)
  <distributable/>
</web-app>
```

```bash
cd ~/src/apache-tomcat-9.0.109/bin/
cp catalina.sh catalina.sh_origin

vi catalina.sh
```

```bash
# 443번 라인 이동
if [ -z "$CATALINA_OUT_CMD" ] ; then
#    주석처리
#    touch "$CATALINA_OUT"
     echo $CATALINA_OUT
else

...
org.apache.catalina.startup.Bootstrap "$@" start 2>&1 \
|/usr/sbin/rotatelogs /data3/logs/tomcat/ws-ecs-server/catalina.out.%Y-%m-%d 86400 540 &

...
org.apache.catalina.startup.Bootstrap "$@" start 2>&1 \
|/usr/sbin/rotatelogs /data3/logs/tomcat/ws-ecs-server/catalina.out.%Y-%m-%d 86400 540 &
```

```bash
# 로그 디렉터리 생성
mkdir -p /data3/logs/tomcat/ws-ecs-server/

# 구동 테스트
~/src/apache-tomcat-9.0.109/bin/startup.sh
```

```bash
ps -ef | grep java

netstat -tnlp

curl 서버 IP:8080
```

```bash
~/src/apache-tomcat-9.0.109/bin/shutdown.sh

mkdir -p /data2/was/

mv ~/src/apache-tomcat-9.0.109 /data2/was/ws-ecs-server
```

### ws-ifs-server

```bash
cd /data2/was/

cp -ar ws-ecs-server ws-ifs-server
vi /data2/was/ws-ifs-server/conf/server.xml
```

```
...
<Server port="8006" shutdown="SHUTDOWN">
...
<Service name="IFS">
...
<Connector port="8081" protocol="HTTP/1.1"
           connectionTimeout="20000"
           server="Unknown"
           redirectPort="8444" URIEncoding="UTF-8" />
...
<Connector protocol="AJP/1.3"
           address="0.0.0.0"
           port="8010"
           secretRequired="false"
           redirectPort="8444" URIEncoding="UTF-8" />
...

<Engine name="IFS" defaultHost="localhost" jvmRoute="ifs1/2">

      <!--For clustering, please take a look at documentation at:
          /docs/cluster-howto.html  (simple how to)
          /docs/config/cluster.html (reference documentation) -->
      <!--
      <Cluster className="org.apache.catalina.ha.tcp.SimpleTcpCluster"/>
      -->
      <Cluster className="org.apache.catalina.ha.tcp.SimpleTcpCluster"
               channelSendOptions="8">

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
                    address="서버 IP"
                    port="4001"
                    autoBind="100"
                    selectorTimeout="5000"
                    maxThreads="6"/>
...
<Host name="localhost"  appBase="webapps"
            unpackWARs="true" autoDeploy="true">
  <Valve className="org.apache.catalina.valves.AccessLogValve" directory="/data3/logs/tomcat/ws-ifs-server"
  ...  
...
```

```bash
vi /data2/was/ws-ifs-server/bin/catalina.sh
```

```
...
org.apache.catalina.startup.Bootstrap "$@" start 2>&1 \
|/usr/sbin/rotatelogs /data3/logs/tomcat/ws-ifs-server/catalina.out.%Y-%m-%d 86400 540 &

...
org.apache.catalina.startup.Bootstrap "$@" start 2>&1 \
|/usr/sbin/rotatelogs /data3/logs/tomcat/ws-ifs-server/catalina.out.%Y-%m-%d 86400 540 &
```

```bash
# 구동 테스트
mkdir /data3/logs/tomcat/ws-ifs-server/

/data2/was/ws-ifs-server/bin/startup.sh
```

```bash
ps -ef | grep java

netstat -tnlp

curl 서버 IP:8081
```

```bash
/data2/was/ws-ifs-server/bin/shutdown.sh
```

### ws-pls-server

```bash
cd /data2/was/

cp -ar ws-ecs-server ws-pls-server
vi /data2/was/ws-pls-server/conf/server.xml
```

```
...
<Server port="8007" shutdown="SHUTDOWN">
...
<Service name="PLS">
...
<Connector port="8082" protocol="HTTP/1.1"
           connectionTimeout="20000"
           server="Unknown"
           redirectPort="8445" URIEncoding="UTF-8" />
...
<Connector protocol="AJP/1.3"
           address="0.0.0.0"
           port="8011"
           secretRequired="false"
           redirectPort="8445" URIEncoding="UTF-8" />
...

<Engine name="PLS" defaultHost="localhost" jvmRoute="pls1/2">

      <!--For clustering, please take a look at documentation at:
          /docs/cluster-howto.html  (simple how to)
          /docs/config/cluster.html (reference documentation) -->
      <!--
      <Cluster className="org.apache.catalina.ha.tcp.SimpleTcpCluster"/>
      -->
      <Cluster className="org.apache.catalina.ha.tcp.SimpleTcpCluster"
               channelSendOptions="8">

        <Manager className="org.apache.catalina.ha.session.DeltaManager"
                 expireSessionsOnShutdown="false"
                 notifyListenersOnReplication="true"/>

        <Channel className="org.apache.catalina.tribes.group.GroupChannel">
          <Membership className="org.apache.catalina.tribes.membership.McastService"
                      address="228.0.0.4"
                      port="45566"
                      frequency="500"
                      dropTime="3000"/>
          <Receiver className="org.apache.catalina.tribes.transport.nio.NioReceiver"
                    address="서버 IP"
                    port="4002"
                    autoBind="100"
                    selectorTimeout="5000"
                    maxThreads="6"/>
...
<Host name="localhost"  appBase="webapps"
            unpackWARs="true" autoDeploy="true">
  <Valve className="org.apache.catalina.valves.AccessLogValve" directory="/data3/logs/tomcat/ws-pls-server"
  ...  
...
```

```bash
vi /data2/was/ws-pls-server/bin/catalina.sh
```

```
...
org.apache.catalina.startup.Bootstrap "$@" start 2>&1 \
|/usr/sbin/rotatelogs /data3/logs/tomcat/ws-pls-server/catalina.out.%Y-%m-%d 86400 540 &

...
org.apache.catalina.startup.Bootstrap "$@" start 2>&1 \
|/usr/sbin/rotatelogs /data3/logs/tomcat/ws-pls-server/catalina.out.%Y-%m-%d 86400 540 &
```

```bash
# 구동 테스트
mkdir /data3/logs/tomcat/ws-pls-server/

/data2/was/ws-pls-server/bin/startup.sh
```

```bash
ps -ef | grep java

netstat -tnlp

curl 서버 IP:8082
```

```bash
/data2/was/ws-pls-server/bin/shutdown.sh
```

## Tomcat 실행 계정 권한 변경

```bash
# 계정 추가
useradd ecsuser

chown -R ecsuser:ecsuser /data2
chown -R ecsuser:ecsuser /data3
```

## Tomcat 세션 클러스터링 방화벽 설정

```bash
# ecs 세션 공유 멀티캐스트 port 허용 (UDP)
firewall-cmd --add-port=45564/udp --permanent
# ecs Receiver port 허용
firewall-cmd --add-port=4000/tcp --permanent

# ifs 세션 공유 멀티캐스트 port 허용 (UDP)
firewall-cmd --add-port=45565/udp --permanent
# ifs Receiver port 허용
firewall-cmd --add-port=4001/tcp --permanent

# pls 세션 공유 멀티캐스트 port 허용 (UDP)
firewall-cmd --add-port=45566/udp --permanent
# pls Receiver port 허용
firewall-cmd --add-port=4002/tcp --permanent

firewall-cmd --reload
```

> 멀티캐스트(multicast): “하나의 송신자가 여러 수신자에게 동시에 같은 데이터를 보낼 수 있는” IP 통신 방식.
{: .prompt-warning }

| 구분 | 주소 범위 | 설명 |
| --- | --- | --- |
| 유니캐스트 (Unicast) | 1.0.0.0 ~ 223.255.255.255 | 1:1 통신 (보통 사용하는 IP) |
| 멀티캐스트 (Multicast) | 224.0.0.0 ~ 239.255.255.255 | 1:N 통신 |
| 브로드캐스트 (Broadcast)| 255.255.255.255 | 같은 서브넷의 전체로 송신 |


## Tomcat 기동

```bash
/data2/was/ws-ecs-server/bin/startup.sh
/data2/was/ws-ifs-server/bin/startup.sh
/data2/was/ws-pls-server/bin/startup.sh

ps -ef | grep ecs
ps -ef | grep ifs
ps -ef | grep pls

netstat -tnlp
```

# Apache 설치

서버 대상: web-01, web-02

## 의존 패키지 설치

```bash
dnf install redhat-rpm-config gcc gcc-c++ make apr-devel apr-util apr-util-devel pcre-devel openssl-devel vim wget tar
```

## 압축 해제 및 설치

```bash
mkdir ~/src
cd ~/src

wget https://archive.apache.org/dist/httpd/httpd-2.4.65.tar.gz
tar zxf httpd-2.4.65.tar.gz
cd httpd-2.4.65
```

```bash
./configure \
--prefix=/data2/apache \
--enable-so \
--enable-ssl \
--enable-rewrite \
--enable-mods-shared=all
```

```bash
make -j$(nproc)
make install
```

## httpd.conf 기본 설정

```bash
cd /data2/apache/conf
cp httpd.conf httpd.conf_origin
vi httpd.conf
```

```
ServerRoot "/data2/apache"

ServerTokens prod
ServerSignature Off

Listen 80

LoadModule authn_file_module modules/mod_authn_file.so
LoadModule authn_core_module modules/mod_authn_core.so
LoadModule authz_host_module modules/mod_authz_host.so
LoadModule authz_groupfile_module modules/mod_authz_groupfile.so
LoadModule authz_user_module modules/mod_authz_user.so
LoadModule authz_core_module modules/mod_authz_core.so
LoadModule access_compat_module modules/mod_access_compat.so
LoadModule auth_basic_module modules/mod_auth_basic.so
LoadModule socache_shmcb_module modules/mod_socache_shmcb.so
LoadModule reqtimeout_module modules/mod_reqtimeout.so
LoadModule filter_module modules/mod_filter.so
LoadModule mime_module modules/mod_mime.so
LoadModule log _config_module modules/mod_log_config.so
LoadModule env_module modules/mod_env.so
LoadModule headers_module modules/mod_headers.so
LoadModule setenvif_module modules/mod_setenvif.so
LoadModule version_module modules/mod_version.so
LoadModule ssl_module modules/mod_ssl.so
LoadModule unixd_module modules/mod_unixd.so
LoadModule status_module modules/mod_status.so
LoadModule autoindex_module modules/mod_autoindex.so
LoadModule dir_module modules/mod_dir.so
LoadModule alias_module modules/mod_alias.so
LoadModule rewrite_module modules/mod_rewrite.so

<IfModule unixd_module>
    User ecsuser
    Group ecsuser
</IfModule>

ServerName 127.0.0.1

Timeout 60
KeepAlive on
MaxKeepAliveRequests 100
KeepAliveTimeout 2
MaxRequestsPerChild 5000

<Directory /data2>
    AllowOverride none
    Require all granted
</Directory>

<Directory />
    LimitRequestBody 5242880
</Directory>

<Directory /home/userdir/>
    LimitRequestBody 1024000
</Directory>

<Directory />
    <LimitExcept GET POST HEAD>
        Require all denied
    </LimitExcept>
</Directory>

<IfModule dir_module>
    DirectoryIndex index.html
</IfModule>

<Files ".ht*">
    Require all denied
</Files>

ErrorLog "logs/error_log"
LogLevel warn

<IfModule log_config_module>
    ...
    #CustomLog "logs/access_log" combined
</IfModule>

<IfModule alias_module>
    ...
    # ScriptAlias /cgi-bin/ "/data2/apache/cgi-bin/"
</IfModule>

<Directory "/data2/apache/cgi-bin">
    AllowOverride None
    Options None
    Require all granted
</Directory>

<IfModule headers_module>
    RequestHeader unset Proxy early
</IfModule>

<IfModule mime_module>
    TypesConfig conf/mime.types
    
    AddType aplication/x-compress .Z
    AddType application/x-gzip .gz .tgz
</IfModule>

ErrorDocument 500 "The server made a boo boo."
ErrorDocument 404 /missing.html
ErrorDocument 404 "/cgi-bin/missing_handler.pl"
ErrorDocument 403 /missing.html
ErrorDocument 402 http://www.example.com/subscription_info.html
ErrorDocument 401 /missing.html
ErrorDocument 400 /missing.html

# Virtual hosts
# Include conf/extra/httpd-vhosts.conf

<IfModule proxy_html_module>
    Include conf/extra/proxy-html.conf
</IfModule>

<IfModule ssl_module>
SSLRandomSeed startup builtin
SSLRandomSeed connect builtin
</IfModule>
```

```bash
# 문법 체크
/data2/apache/bin/apachectl -t
Syntax OK
```

## mod_jk 모듈 설치

```bash
cd ~/src

wget https://archive.apache.org/dist/tomcat/tomcat-connectors/jk/tomcat-connectors-1.2.48-src.tar.gz
tar zxf tomcat-connectors-1.2.48-src.tar.gz
cd tomcat-connectors-1.2.48-src/native
```

```bash
./configure --with-apxs=/data2/apache/bin/apxs
```

```bash
make -j$(nproc)
make install
```

```bash
# mod_jk 모듈 확인
ll /data2/apache/modules/mod_jk.so
```

## mod_jk 모듈 활성화

```bash
vi /data2/apache/conf/httpd.conf
```

```bash
...
LoadModule alias_module modules/mod_alias.so
LoadModule rewrite_module modules/mod_rewrite.so
LoadModule jk_module modules/mod_jk.so

# 맨 밑 추가
Include conf/mod_jk.conf
```

## mod_jk 모듈 기본 설정

```bash
vi /data2/apache/conf/mod_jk.conf
```

```bash
<IfModule mod_jk.c>
    JkWorkersFile /data2/apache/conf/workers.properties
    JkLogFile "|/data2/apache/bin/rotatelogs /data3/logs/httpd/mod_jk.log-%Y%m%d 86400 540"
    JkLogLevel info
    JkLogStampFormat "[%a %b % %H:%M:%S %Y] "
</IfModule>
```

## workers.properties 설정

```bash
vi /data2/apache/conf/workers.properties
```

```
worker.list=ecs_loadbalancer,ifs_loadbalancer,pls_loadbalancer

worker.ecs_loadbalancer.type=lb
worker.ecs_loadbalancer.balanced_workers=ecs1,ecs2
worker.ifs_loadbalancer.type=lb
worker.ifs_loadbalancer.balanced_workers=ifs1,ifs2
worker.pls_loadbalancer.type=lb
worker.pls_loadbalancer.balanced_workers=pls1,pls2

worker.ecs1.type=ajp13
worker.ecs1.host=was-01 IP
worker.ecs1.port=8009
worker.ecs1.lbfactor=1

worker.ecs2.type=ajp13
worker.ecs2.host=was-02 IP
worker.ecs2.port=8009
worker.ecs2.lbfactor=1

worker.ifs1.type=ajp13
worker.ifs1.host=was-01 IP
worker.ifs1.port=8010
worker.ifs1.lbfactor=1

worker.ifs2.type=ajp13
worker.ifs2.host=was-02 IP
worker.ifs2.port=8010
worker.ifs2.lbfactor=1

worker.pls1.type=ajp13
worker.pls1.host=was-01 IP
worker.pls1.port=8011
worker.pls1.lbfactor=1

worker.pls2.type=ajp13
worker.pls2.host=was-02 IP
worker.pls2.port=8111
worker.pls2.lbfactor=1
```

```bash
# 문법 체크
/data2/apache/bin/apachectl -t
Syntax OK
```

## Apache vhost 설정

```bash
cd /data2/apache/conf/extra/
mv httpd-vhosts.conf httpd-vhosts.conf_origin

vi httpd-vhosts.conf
```

```
<VirtualHost *:80>
    ServerName ecs.test.co.kr
    DocumentRoot "/data2"
    ErrorLog "|/data2/apache/bin/rotatelogs /data3/logs/httpd/ecs.test.co.kr_error_log-%Y%m%d 86400 540"
    CustomLog "| /data2/apache/bin/rotatelogs /data3/logs/httpd/ecs.test.co.kr_access_log-%Y%m%d 86400 540" common
    
    JkMount /* ecs_loadbalancer
</VirtualHost>

<VirtualHost *:80>
    ServerName ifs.test.co.kr
    DocumentRoot "/data2"
    ErrorLog "|/data2/apache/bin/rotatelogs /data3/logs/httpd/ifs.test.co.kr_error_log-%Y%m%d 86400 540"
    CustomLog "|/data2/apache/bin/rotatelogs /data3/logs/httpd/ifs.test.co.kr_access_log-%Y%m%d 86400 540" common
    
    JkMount /* ifs_loadbalancer
</VirtualHost>

<VirtualHost *:80>
    ServerName pls.test.co.kr
    DocumentRoot "/data2"
    ErrorLog "|/data2/apache/bin/rotatelogs /data3/logs/httpd/pls.test.co.kr_error_log-%Y%m%d 86400 540"
    CustomLog "|/data2/apache/bin/rotatelogs /data3/logs/httpd/pls.test.co.kr_access_log-%Y%m%d 86400 540" common
    
    JkMount /* pls_loadbalancer
</VirtualHost>
```

```bash
vi /data2/apache/conf/httpd.conf
```

```
...
# Virtual hosts
# 주석해제
# Include conf/extra/httpd-vhosts.conf
```

```bash
# 문법 체크
/data2/apache/bin/apachectl -t
Syntax OK
```

## Apache 실행 계정 권한 변경

```bash
mkdir -p /data3/logs/httpd

chown -R ecsuser:ecsuser /data2
chown -R ecsuser:ecsuser /data3
```

## Apache 방화벽 설정 및 기동

```bash
firewall-cmd --add-port=80/tcp --permanent
firewall-cmd --add-port=443/tcp --permanent

firewall-cmd --reload
```

```bash
/data2/apache/bin/apachectl start

ps -ef | grep httpd

netstat -tnlp
```

# 세션 클러스터링 테스트

서버 대상: was-01, was-02

**세션 테스트용 jsp 생성**

```bash
vi /data2/was/ws-ecs-server/webapps/ROOT/sessionTest.jsp
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
        <title>Tomcat Session Cluster Test</title>
    </head>
    <body>
        <h2>Tomcat Session Clustering Test</h2>
        
        <hr>
        
        <p><b>Session ID:</b><%= sessionId %></p>
        <p><b>Session Create Time:</b><%= createTime %></p>
        <p><b>Last Access Time:</b><%= lastAccess %></p>
        <p><b>Access Count (세션 유지 확인용):</b><%= count %></p>
        
        <p><a href="sessionTest.jsp">[새로고침]</a></p>
    </body>
</html>
```

---

**url 접속**
> hosts 파일에 web-01 IP 또는 web-02 IP ecs.test.co.kr 추가 후 접속
{: .prompt-warning }

![image.png](/assets/img/posts/server/on-premise/app/tomcat/tomcat-clustering/image.png)

![image.png](/assets/img/posts/server/on-premise/app/tomcat/tomcat-clustering/image%201.png)

최초 접속 결과 2대 was 서버 중 was-02 서버 접속 확인

---

was-02 **서버 ecs was shutdown**

```bash
/data2/was/ws-ecs-server/bin/shutdown.sh
```

---

**페이지 새로고침**

![image.png](/assets/img/posts/server/on-premise/app/tomcat/tomcat-clustering/image 2.png)

was-01 서버 접속시 세션 정상 복제 확인

---

**반대로 수행**

was-02 **서버 ecs was 재기동**

```bash
/data2/was/ws-ecs-server/bin/startup.sh

ps -ef | grep ecs
```

was-01 **서버 ecs was shutdown**

```bash
/data2/was/ws-ecs-server/bin/shutdown.sh
```

---

**페이지 새로고침**

![image.png](/assets/img/posts/server/on-premise/app/tomcat/tomcat-clustering/image 3.png)

was-01 → was-02 세션 정상 복제 확인

---