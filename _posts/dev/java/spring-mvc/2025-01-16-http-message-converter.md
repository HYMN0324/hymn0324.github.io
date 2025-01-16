---
title: HTTP message converter
date: 2025-01-16
categories: spring-mvc
tags: [spring mvc, dispatcher servlet, http message converter, requestMappingHandlerAdapter]
description: HTTP message converter post
permalink: springmvc/http-message-converter
---

## HTTP message converter
### 정의
* 대표적으로 API 요청, 응답과 같은 상황 일 때 사용한다.

### 동작 시점
* HTTP 요청 : `@RequestBody`, `HttpEntity(RequestEntity)`
* HTTP 응답 : `@ResponseBody`, `HttpEntity(ResponseEntity)`

@ResponseBody 사용시
> HTTP body내용을 직접 반환하기 때문에 viewResolver 대신 HttpMessageConverter 사용
> * 기본 문자처리 : StringHttpMessageConverter
> * 기본 객체처리 : MappingJackson2HttpMessageConverter