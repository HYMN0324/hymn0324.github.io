---
title: NFS 설정 방법
date: 2025-11-20
categories: [server, network]
tags: [nfs, nfs3, nfs4, rpc, mountd, lockd]
description: nfs 설정 방법 post
permalink: how-to-setup-nfs
---

## NFS
NFS(Network File System)는 네트워크에 파일을 저장하는 메커니즘으로, 원격 PC/서버에 있는 파일 및 디렉터리를 액세스 할 수 있고
로컬에 있는 것처럼 처리하도록 허용하는 파일 시스템입니다.

네트워크와 파일시스템으로 동작되기 때문에 커널에 모듈형태로 내장되어있습니다.

> 클라이언트와 서버간 디렉터리 권한을 유저 이름으로 맞췄어도 unix 파일시스템은 UID,GID 기준으로 동작하기 때문에 권한 문제 발생 할 수 있으므로 삽질 하지 않기를 바랍니다.🙏🏻
{: .prompt-warning}

## NFS 서버 설정

```bash
dnf install nfs-utils
```

```bash
vi /etc/exports
```

```text
# 설정 구문 
# `공유할 디렉터리 절대경로` `client주소(권한 설정)`

# 설정 구문 예시
/usb 172.16.0.0/16(rw)
```

> nfs 권한 설정 목록
* `ro` : read-only(읽기 전용) 기본값.
* `rw` : read-write(읽기 쓰기)
{: .prompt-info}

> 접근 할 공유 디렉터리 소유자UID / 그룹UID를 클라이언트에서 동일 하게 설정 할 수 없을 경우,`no_root_squash` 옵션 추가.(보안상 권장x)  
/usb 172.16.0.0/16(rw, `no_root_squash`)
{: .prompt-info}

```bash
# nfs3 port 허용
firewall-cmd --add-port=2049/tcp --add-port=2049/udp --permanent
# mountd port 허용
firewall-cmd --add-port=20048/tcp --add-port=20048/udp --permanent
# rpc-bind port 허용
firewall-cmd --add-port=111/tcp --add-port=111/udp --permanent

firewall-cmd --reload
```

```bash
systemctl start nfs-server
systemctl status nfs-server
systemctl enable nfs-server
```

## 클라이언트 설정
```bash
dnf install nfs-utils

# nfs 서버 mount 목록 조회
showmount -e 172.16.2.5

# nfs 연결
mkdir /mnt/nfs
mount -t nfs 172.16.2.5:/usb /mnt/nfs

# nfs 연결 확인
df -h
```

## troubleshooting

### 연결 문제 해결

### 권한 문제 해결

## 참조문서
NFS 정의 : <https://www.ibm.com/docs/ko/aix/7.3.0?topic=management-network-file-system>  
NFS 설정 : <https://docs.rockylinux.org/9/guides/file_sharing/nfsserver/>