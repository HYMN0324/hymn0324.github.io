---
title: DNS record 정리
date: 2025-11-22
categories: [server, network]
tags: [dns, ns, aaaa, cname, mx, txt, srv, ptr, dkim]
description: DNS record 정리 post
permalink: learn-dns-record-types
---

## DNS record
DNS 서버에 지정된 **도메인에 대해 특정 주소(IP, 타 도메인) 또는 특정 정보를 정의하는 데이터입니다.**  
클라이언트가 도메인의 특정 record 타입을 조회하면, DNS 서버는 해당 record 값을 응답합니다.

## record 종류
* `NS` record: 도메인 권한이 있는 네임서버 도메인 지정.
> * DNS 규약(RFC 1035) 상 **IP가 아닌 도메인이어야 함**
* `A` record: 도메인을 IPv4 주소 지정.
* `AAAA` record: 도메인을 IPv6 주소 지정.
* `CNAME` record: 도메인을 타 도메인 지정.
* `MX` record: 메일 서버 도메인 지정.  
> * hymn0324@github.com으로 이메일 전송시 github.com의 MX 값에 지정된 메일 도메인 응답.  
> * DNS 규약(RFC 5321, 1035) 상 **MX record는 IP가 아닌 도메인이어야 함**
* `TXT` record: 도메인과 관련된 정보를 텍스트로 저장. 주로 인증용으로 사용.
> * 이메일 인증: 도메인에서 발송되는 메일이 스팸으로 분류되지 않도록 보장.
> * SSL 인증서 발급: 도메인 소유권으로 인증시 사용.  
SSL 인증기관이 제공하는 DNS 인증키를 TXT record에 등록 후 인증기관에서 검증.
* `DKIM` record: 이메일 신뢰성 확인하는데 사용하는 공개 키 지정.
* `SRV` record: 특정 서비스와 프로토콜에 대해 접속 할 **서버 주소, port, 우선순위, 가중치를 지정.**

## TTL에 관하여

TTL=86400(1일)로 설정후 reload하고 신규 등록한 레코드 조회 했을 때 1일 전에 응답되는 경우:  
> TTL을 86400(1일)로 설정한 신규 레코드를 등록한 후 조회했을 때, 캐시 DNS 서버에 해당 레코드가 없으면 권한 DNS 서버(메인)로 질의하여 최신값을 가져오고, 그 값을 클라이언트에 응답합니다.