---
title: VMware ESXi 7 설치
date: 2025-12-06
categories: [server, esxi]
tags: [vmware, esxi]
description: VMware ESX 7 설치 post
permalink: how-to-install-esxi
---

## 설치 정보

| 구분 | 버전 |
| --- | --- |
| 가상화 SW | VMware Workstation 17 Pro |
| Guest Hypervisor | VMware ESXi 7.0.0 |

## 설치

<img src="/assets/img/posts/server/on-premise/os/esxi/how-to-install-esxi/install/VMware ESXi 7-2025-12-06-18-31-02.png" width="90%" alt="VMware ESXi 7-2025-12-06-18-31-02">
<img src="/assets/img/posts/server/on-premise/os/esxi/how-to-install-esxi/install/VMware ESXi 7-2025-12-06-18-31-24.png" width="90%" alt="VMware ESXi 7-2025-12-06-18-31-24">

`Enter` 키 입력.
<img src="/assets/img/posts/server/on-premise/os/esxi/how-to-install-esxi/install/VMware ESXi 7-2025-12-06-18-32-13.png" width="90%" alt="VMware ESXi 7-2025-12-06-18-32-13">

`F11` 키 입력.
<img src="/assets/img/posts/server/on-premise/os/esxi/how-to-install-esxi/install/VMware ESXi 7-2025-12-06-18-32-20.png" width="90%" alt="VMware ESXi 7-2025-12-06-18-32-20">

`Enter` 키 입력.
<img src="/assets/img/posts/server/on-premise/os/esxi/how-to-install-esxi/install/VMware ESXi 7-2025-12-06-18-32-40.png" width="90%" alt="VMware ESXi 7-2025-12-06-18-32-40">

`Enter` 키 입력.
<img src="/assets/img/posts/server/on-premise/os/esxi/how-to-install-esxi/install/VMware ESXi 7-2025-12-06-18-33-06.png" width="90%" alt="VMware ESXi 7-2025-12-06-18-33-06">

패스워드 설정 후 `Enter` 키 입력.
<img src="/assets/img/posts/server/on-premise/os/esxi/how-to-install-esxi/install/VMware ESXi 7-2025-12-06-18-33-12.png" width="90%" alt="VMware ESXi 7-2025-12-06-18-33-12">

`F11` 키 입력하여 설치.
<img src="/assets/img/posts/server/on-premise/os/esxi/how-to-install-esxi/install/VMware ESXi 7-2025-12-06-18-33-26.png" width="90%" alt="VMware ESXi 7-2025-12-06-18-33-26">
<img src="/assets/img/posts/server/on-premise/os/esxi/how-to-install-esxi/install/VMware ESXi 7-2025-12-06-18-33-51.png" width="90%" alt="VMware ESXi 7-2025-12-06-18-33-51">

설치 완료시 **iso 파일 연결 장치 제거 후** `Enter` 키 입력하여 재부팅.
<img src="/assets/img/posts/server/on-premise/os/esxi/how-to-install-esxi/install/VMware ESXi 7-2025-12-06-18-34-08.png" width="90%" alt="VMware ESXi 7-2025-12-06-18-34-08">
<img src="/assets/img/posts/server/on-premise/os/esxi/how-to-install-esxi/install/VMware ESXi 7-2025-12-06-18-34-31.png" width="90%" alt="VMware ESXi 7-2025-12-06-18-34-31">
<img src="/assets/img/posts/server/on-premise/os/esxi/how-to-install-esxi/install/VMware ESXi 7-2025-12-06-18-34-43.png" width="90%" alt="VMware ESXi 7-2025-12-06-18-34-43">
<img src="/assets/img/posts/server/on-premise/os/esxi/how-to-install-esxi/install/VMware ESXi 7-2025-12-06-18-34-58.png" width="90%" alt="VMware ESXi 7-2025-12-06-18-34-58">

설치 완료 초기 화면.
<img src="/assets/img/posts/server/on-premise/os/esxi/how-to-install-esxi/install/VMware ESXi 7-2025-12-06-18-35-38.png" width="90%" alt="VMware ESXi 7-2025-12-06-18-35-38">

## 네트워크 설정

### IPv4 고정 설정

`F2` 키 입력하여 로그인 창 진입.  
root 패스워드 입력 후 `Enter` 키 입력.
<img src="/assets/img/posts/server/on-premise/os/esxi/how-to-install-esxi/network-settings/VMware ESXi 7-2025-12-06-18-36-15.png" width="90%" alt="VMware ESXi 7-2025-12-06-18-36-15">

`IPv4 Configuration` 이동 후 `Enter` 키 입력.
<img src="/assets/img/posts/server/on-premise/os/esxi/how-to-install-esxi/network-settings/VMware ESXi 7-2025-12-06-18-36-39.png" width="90%" alt="VMware ESXi 7-2025-12-06-18-36-39">

`Set static IPv4 address and network configuration` 이동 후 `spacebar` 키 입력.  
`IPv4 Address` 이동 후 고정 ip 입력.
<img src="/assets/img/posts/server/on-premise/os/esxi/how-to-install-esxi/network-settings/VMware ESXi 7-2025-12-06-18-39-16.png" width="90%" alt="VMware ESXi 7-2025-12-06-18-39-16">

### IPv6 비활성화(옵션)

`IPv6 Configuration` 이동 후 `Enter` 키 입력.
<img src="/assets/img/posts/server/on-premise/os/esxi/how-to-install-esxi/network-settings/VMware ESXi 7-2025-12-06-18-39-30.png" width="90%" alt="VMware ESXi 7-2025-12-06-18-39-30">

`Disable IPv6 (restart required)` 이동 후 `Enter` 키 입력.
<img src="/assets/img/posts/server/on-premise/os/esxi/how-to-install-esxi/network-settings/VMware ESXi 7-2025-12-06-18-39-37.png" width="90%" alt="VMware ESXi 7-2025-12-06-18-39-37">

`Enter` 키 입력하여 나온 뒤 `ESC` 키 입력.
<img src="/assets/img/posts/server/on-premise/os/esxi/how-to-install-esxi/network-settings/VMware ESXi 7-2025-12-06-18-40-50.png" width="90%" alt="VMware ESXi 7-2025-12-06-18-40-50">

`Y` 키 입력 하여 재부팅.
<img src="/assets/img/posts/server/on-premise/os/esxi/how-to-install-esxi/network-settings/VMware ESXi 7-2025-12-06-18-40-56.png" width="90%" alt="VMware ESXi 7-2025-12-06-18-40-56">

<img src="/assets/img/posts/server/on-premise/os/esxi/how-to-install-esxi/network-settings/VMware ESXi 7-2025-12-06-18-41-03.png" width="90%" alt="VMware ESXi 7-2025-12-06-18-41-03">

## 웹 접속

브라우저에서 설정한 고정 ip 접속 및 root 계정 로그인.
<img src="/assets/img/posts/server/on-premise/os/esxi/how-to-install-esxi/login/2025-12-06 18 43 53.png" width="90%" alt="2025-12-06 18 43 53">

<img src="/assets/img/posts/server/on-premise/os/esxi/how-to-install-esxi/login/2025-12-06 18 48 25.png" width="90%" alt="2025-12-06 18 48 25">