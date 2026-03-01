---
title: Linux NAT와 Netfilter Packet 흐름 이해
date: 2026-03-01
categories: [server, network]
tags: [nat, dnat, snat, Netfilter]
description: Linux NAT와 Netfilter Packet 흐름 이해 post
permalink: what-is-nat
---

Linux에서 NAT(Network Address Translation)는 단순히 IP를 변경하는 기술이 아닙니다.  
실무에서 트러블슈팅을 해야 할 때는 Packet이 어디서 어떻게 흐르는지 알아야 문제를 분석하고 해결할 수 있습니다.

이 post에서는 Netfilter 기반의 Packet 흐름을 중심으로 DNAT/SNAT가 실제로 어떻게 동작하는지 확인해 보겠습니다.

---

## Netfilter와 Packet 흐름

Linux 커널 네트워크는 `Netfilter`라는 구조로 Packet을 처리합니다.  
Netfilter는 여러 Hook 지점에 Packet을 걸어서 **필터링, 변환, NAT를 적용합니다.**

공식적으로 정의된 기본 Hook은 아래와 같습니다.

1. PREROUTING
2. INPUT
3. FORWARD
4. OUTPUT
5. POSTROUTING

위 Hook 지점은 Packet이 들어오고 나가며 라우팅이 결정되는 흐름에 따라 순차적으로 적용됩니다.

---

## Packet 흐름 다이어그램

<img src="/assets/img/posts/server/network/nat/Netfilter-packet-flow.svg" width="100%" alt="Netfilter-packet-flow">

위 출처 기준으로 가장 기본적은 Packet 흐름은 아래와 같습니다.

```
외부 Packet → PREROUTING → 라우팅 결정
                                 ├── INPUT   → 로컬 서비스로 전달
                                 └── FORWARD → POSTROUTING → 외부로 전달
로컬에서 생성된 Packet → OUTPUT → POSTROUTING → 외부로 전달
```

위 구조에서:
* PREROUTING은 들어온 Packet을 라우팅 결정 전에 먼저 처리합니다.
* POSTROUTING은 나갈 Packet을 라우팅 결정 후 처리하는 마지막 단계입니다.

## NAT는 어떻게 적용되는가

### DNAT (Destination NAT)

DNAT는 Packet의 목적지 IP 또는 Port를 바꾸는 기술입니다.  
주로 외부에서 들어오는 트래픽을 내부 서버로 포워딩할 때 사용합니다.

DNAT 규칙은 **PREROUTING** 체인에 적용됩니다.
이 위치는 라우팅 결정 전에 목적지를 바꾸기 때문에 내부 서버로 전달할 목적지를 올바르게 지정할 수 있습니다.

### SNAT (Source NAT)

SNAT는 Packet의 출발지 IP를 변경하는 기술입니다.  
주로 내부 클라이언트가 외부로 나갈 때 내부 IP를 공인 IP로 변환하는데 사용합니다.

SNAT 규칙은 **POSTROUTING** 체인에 적용됩니다.
라우팅 결정이 완료된 이후에 출발지 IP를 바꿔 외부로 나가기 직전 적용됩니다.

---

## 참고 자료
* Netfilter Packet 처리 설명(Wikipedia) <https://en.wikipedia.org/wiki/Netfilter>{:target="_blank"}
* Netfilter Hook 설명(nftables Wiki) <https://wiki.nftables.org/wiki-nftables/index.php/Netfilter_hooks>{:target="_blank"}