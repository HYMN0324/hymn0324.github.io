---
title: 서블릿
date: 2024-12-18
categories: servlet
tags: [servlet, 서블릿]
description: 클라이언트 -> WAS -> 서블릿 컨테이너 구조 흐름
permalink: java/servlet/basic
---

## 서블릿 정의
> HTTP 요청과 응답 기능을 간편하게 제공하는 Java 서버 컴포넌트입니다.
>
>
### 서블릿 특징
> 다음과 같이 대표적으로 2개 객체를 사용합니다.
* HttpServletRequest - HTTP 요청 정보를 편리하게 사용
* HttpServletResponse - HTTP 응답 정보를 편리하게 제공
>
### 서블릿 구조
> ![서블릿 구조](/assets/img/posts/dev/java/servlet/servlet-basic1.webp "서블릿 구조")