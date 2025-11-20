---
title: NFS 설정 방법 정리
date: 2025-11-20
categories: [server, on-premise]
tags: [nfs, nfs3, nfs4, rpc, mountd, lockd]
description: nfs 설정 방법 정리 post
permalink: how-to-setup-nfs
---

## NFS 정의
NFS(Network File System)는 네트워크에 파일을 저장하는 메커니즘으로, 원격 PC/서버에 있는 파일 및 디렉터리를 액세스 할 수 있고
로컬에 있는 것처럼 처리하도록 허용하는 파일 시스템.

네트워크 기반으로 동작되기 때문에 커널에 모듈형태로 NFS가 내장되어있다.  
커널에 있는 NFS를 설정하기 위해선 nfs-utils를 설치해야한다.

## nfs-utils 설치

```bash
dnf install nfs-utils
```

## nfs3 설정 - 현재까지 대중 사용

### 방화벽 설정

```bash
firewall-cmd --add-service={nfs3,mountd,rpc-bind} --permanent 
firewall-cmd --reload
```

## nfs4 설정

### 방화벽 설정

```bash
firewall-cmd --add-service={nfs} --permanent 
firewall-cmd --reload
```

## 공유 디렉터리 설정(exports)

```bash
vi /etc/exports
```

## 참조문서
<https://www.ibm.com/docs/ko/aix/7.3.0?topic=management-network-file-system>