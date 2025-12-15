---
title: SSL/TLS 배포 아키텍쳐 종류별 실습
date: 2025-12-15
categories: [server, on-premise]
tags: [Pass through, End to End TLS, SSL Termination]
description: SSL/TLS 배포 아키텍쳐 종류별 실습 post
permalink: types-of-ssl-deployment
---

> update 중 . . .
{:.prompt-warning}

## 서버/설치 정보

| 구분 | IP Address |
| --- | --- |
| HAProxy server | 172.16.2.6 |
| web server | 172.16.3.1 |

### HAProxy server 설치 정보

| 구분 | 버전 |
| --- | --- |
| OS | Rocky 9.6 |
| HAProxy | HAProxy 3.3.0 |
| ModSecurity | ModSecurity 3.0.14 |
| SPOA | SPOA-ModSecurity3 |
| OWASP CRS | CRS 4.0 |

[HAProxy + ModSecurity WAF 구성 post 참조](<how-to-assoc-haproxy-modsecurity>){:target="_blank"}

### web server 설치 정보

| 구분 | 버전 |
| --- | --- |
| OS | Rocky 9.6 |
| Apache | Apache 2.4.65 |

## SSL/TLS 배포 아키첵터 종류

### End-to-End TLS(Pass-through)

### WAF SSL Termination

### TLS Bridging(Re-encryption)
