---
title: NFS 설정 방법 정리
date: 2025-11-20
categories: [server, network]
tags: [nfs, nfs3, nfs4, rpc, mountd, lockd]
description: nfs 설정 방법 정리 post
permalink: how-to-setup-nfs
---

## NFS 정의
NFS(Network File System)는 네트워크에 파일을 저장하는 메커니즘으로, 원격 PC/서버에 있는 파일 및 디렉터리를 액세스 할 수 있고
로컬에 있는 것처럼 처리하도록 허용하는 파일 시스템.

네트워크 기반으로 동작되기 때문에 커널에 모듈형태로 NFS가 내장되어있다.  
커널에 있는 NFS를 설정하기 위해선 nfs-utils를 설치해야한다.

상황에 따라 방법 선택.

## 1. NFS 전용 계정 추가하여 NFS 설정(모범 적용)

### NFS 서버 설정

#### nfs-utils 설치

```bash
dnf install nfs-utils
```

#### 방화벽 설정

```bash
firewall-cmd --add-service={nfs3,mountd,rpc-bind} --permanent 
firewall-cmd --reload
```

#### nfsuser 생성

```bash
useradd nfsuser

# uid 값 기억
id nfsuser
```

#### nfs 파일 생성

```bash
# 공유 디렉터리용 생성
mkdir /nfs
echo "nfs test" > /nfs/backup1.txt
cat /nfs/backup1.txt

chown -R nfsuser:nfsuser /nfs
```

### NFS 클라이언트 설정

#### nfsuser 생성

```bash
useradd nfsuser

# uid 값 확인 - nfs 서버와 nfsuser uid 값이 맞는지 확인.
id nfsuser
```

> nfsuser 계정 uid 값이 안맞을 경우 nfs 서버OS의 MAX UID,GID와 클라이언트OS의 MAX UID,GID 확인.
{: .prompt-warning}

```bash
grep -E 'UID_MAX|GID_MAX' /etc/login.defs
# nfs 서버 출력 예시
# UID_MAX                 60000
# GID_MAX                 60000

# 클라이언트 출력 예시
# UID_MAX                 50000
# GID_MAX                 50000
```

```bash
# 공통 UID,GID MAX 값으로 변경.
groupmod -g 50000 nfsuser
usermod -u 50000 nfsuser
```

### NFS 서버 설정

```bash
# 공통 UID,GID MAX 값으로 변경.
groupmod -g 50000 nfsuser
usermod -u 50000 nfsuser
```

```bash
vi /etc/exports
```

```text
/nfs 172.16.0.0/16(rw)
```

```bash
# nfs 데몬 시작
systemctl start nfs-server
systemctl status nfs-server
systemctl enable nfs-server
```

### 클라이언트 설정

#### nfs 목록 확인

```bash
# showmount를 사용하기 위해선 nfs-utils필요.
dnf install nfs-utils

showmount -e 172.16.2.5
```

#### nfs 연결
```bash
# nfs 연결 할 로컬 디렉터리 생성
mkdir /mnt/nfs

# nfs 타입으로 mount
mount -t nfs 172.16.2.5:/nfs /mnt/nfs
```

#### 테스트
```bash
su nfsuser

cd /mnt/nfs/
vi backup1.txt
```

```text
nfs test

# 쓰기테스트
write from 172.16.3.1 client
```
:wq 후 저장 되는지 확인.

<!--
## 2. root 계정으로 접근 설정(실무에서 많이 사용)

```bash
vi /etc/exports
```

<!--### nfs3 설정 - 현재까지 대중 사용-->

<!--
### nfs4 설정

#### 방화벽 설정

```bash
firewall-cmd --add-service={nfs} --permanent 
firewall-cmd --reload
```
-->

## 참조문서
NFS 정의 : <https://www.ibm.com/docs/ko/aix/7.3.0?topic=management-network-file-system>  
NFS 설정 : <https://docs.rockylinux.org/9/guides/file_sharing/nfsserver/>