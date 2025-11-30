---
title: Tomcat 세션 클러스터링 체크 리스트(on-premise)
date: 2025-10-30
categories: [server, on-premise]
tags: [tomcat, session clustering, ajp, 톰캣 세션]
description: Tomcat 세션 클러스터링 체크 리스트(on-premise) post
permalink: tomcat-clustering-checklist
---

# 세션 클러스터링 체크 리스트

1. ajp 통신 확인.
    - `server.xml` - `address="0.0.0.0"`, `secretRequired="false"` 확인.
        
        ```xml
            <Connector protocol="AJP/1.3"
                       address="0.0.0.0"
                       port="8009"
                       secretRequired="false"
                       redirectPort="8443" />
        ```

    - web서버 `workers.properties` - was서버 IP, port 매칭 확인.

        ```text
            worker.list=a-loadbalancer

            worker.a-loadbalancer.type=lb
            worker.a-loadbalancer.balanced_workers=a-was1,a-was2

            worker.a-was1.type=ajp13
            worker.a-was1.host=172.16.2.1
            worker.a-was1.port=8009

            worker.a-was2.type=ajp13
            worker.a-was2.host=172.16.2.2
            worker.a-was2.port=8009
        ```
        
    - tomcat 기동 후 통신 확인.
        
        ```bash
            # web서버에서 수행
            telnet was서버 1번기 IP 8009
            telnet was서버 2번기 IP 8009
        ```
        
2. `server.xml` - Engine 설정 부분 jvmRoute 속성 was서버 1번기, 2번기 알맞게 설정.

    ```
    <Engine name="catalina" defaultHost="localhost" jvmRoute="a-was1/2">
    ```
    
3. `server.xml` - Cluster 설정 부분 className 속성 값 아래와 같이 되어있는지 확인.
    
    ```
    <Cluster className="org.apache.catalina.ha.tcp.SimpleTcpCluster">
    ```
    
4. `server.xml` - Manager 설정 부분 expireSessionsOnShutdown 속성 값 false 확인.
    
    ```
    <Manager className="org.apache.catalina.ha.session.DeltaManager"
             expireSessionsOnShutdown="false"
             notifyListenersOnReplication="true"/>
    ```
    
    > expireSessionsOnShutdown: 여러 대 was서버 중 1대 was가 shutdown 발생하면 모든 was의 세션 만료 처리 설정 옵션으로, `false`값 설정 확인.
    {: .prompt-warning }
    <img src="/assets/img/posts/server/on-premise/app/tomcat/tomcat-clustering-checklist/image.png" width="80%">
    매뉴얼 참조 url : [https://tomcat.apache.org/tomcat-9.0-doc/...](<https://tomcat.apache.org/tomcat-9.0-doc/config/cluster-manager.html#org.apache.catalina.ha.session.DeltaManager_Attributes>){:target="_blank"}
    
5. webapps/ROOT/WEB-INF/web.xml - `<distributable/>` 세션 복제 활성화.
    
    ```xml
       ...
      # 맨 아래 추가(세션 객체를 다른 노드(서버)로 전송(복제)하는 옵션)
      <distributable/>
    </web-app>
    ```
    
6. was서버 1번, 2번기 tomcat 기동 후 Receiver port 정상 통신 확인.
    - `server.xml` - Receiver 부분 address IP, port 확인
        
        ```xml
        <Receiver className="org.apache.catalina.tribes.transport.nio.NioReceiver"
                  address="서버 IP"
                  port="4001"
                  autoBind="100"
                  selectorTimeout="5000"
                  maxThreads="6"/>
        ```

    - tomcat 기동후 통신 확인.
        
        ```bash
            # was서버 1번기에서 telnet
            telnet was2번IP 4001
            
            # was서버 2번기에서 telnet
            telnet was1번IP 4001
        ```
        
    - 통신 안되는 경우 os 방화벽 설정 후 다시 telnet 수행.
        
        ```bash
            # firewalld 기준
            # was서버 1번기 2번기 아래 명령어 수행
            
            # Receiver port 허용
            firewall-cmd --add-port=4001/tcp --permanent
            # 적용
            firewall-cmd --reload
        ```
        
    - 그래도 통신 안되면 상단 방화벽 장비 확인.
7. Membership address 통신 확인.
    - `server.xml` - Membership 부분 address 멀티캐스트 IP, port 확인.
        
        ```
        <Membership className="org.apache.catalina.tribes.membership.McastService"
                    address="228.0.0.4"
                    port="45564"
                    frequency="500"
                    dropTime="3000"/>
        ```

        > 멀티캐스트(multicast): “하나의 송신자가 여러 수신자에게 동시에 같은 데이터를 보낼 수 있는” IP 통신 방식.
        {: .prompt-warning }

        | 구분 | 주소 범위 | 설명 |
        | --- | --- | --- |
        | 유니캐스트 (Unicast) | 1.0.0.0 ~ 223.255.255.255 | 1:1 통신 (보통 사용하는 IP) |
        | 멀티캐스트 (Multicast) | 224.0.0.0 ~ 239.255.255.255 | 1:N 통신 |
        | 브로드캐스트 (Broadcast)| 255.255.255.255 | 같은 서브넷의 전체로 송신 |
        
    - tomcat 기동후 세션 클러스터링 안되는 경우 os 방화벽 설정 후 다시 재기동 하여 세션 복제 테스트.
        
        ```bash
        # firewalld 기준
        # was서버 1번기 2번기 아래 명령어 수행
        
        # 멀티캐스트 port 허용 - udp
        firewall-cmd --add-port=45564/udp --permanent
        # 적용
        firewall-cmd --reload
        ```
        
    - 그래도 통신 안되면 address 멀티캐스트 IP 변경하면서 진행 / 상단 방화벽 장비 확인.