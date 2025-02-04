---
title: HTTP message converter
date: 2025-01-16
categories: spring-mvc
tags: [spring mvc, dispatcher servlet, http message converter, requestMappingHandlerAdapter]
description: HTTP message converter post
permalink: java/springmvc/http-message-converter
---

## HttpMessageConverter
### 정의
* HTTP body 내용을 직접 반환 할 때 사용. 대표적으로 API 요청, 응답과 같은 상황 일 때 사용한다.
> * HTTP 요청 : `@RequestBody`, `HttpEntity(RequestEntity)`
> * HTTP 응답 : `@ResponseBody`, `HttpEntity(ResponseEntity)`

* HttpMessageConverter는 인터페이스. 구현체는 바이트, 문자처리, 객체처리 등이 존재한다. 
> * 바이트처리 : ByteArrayHttpMessageConverter
>> * 타입: `byte[]`
>> * 미디어타입: `*/*`
> * 문자처리 : StringHttpMessageConverter
>> * 타입: `String`
>> * 미디어타입: `*/*`
> * 객체처리 : MappingJackson2HttpMessageConverter
>> * 타입: `Object<T>`
>> * 미디어타입: `application/json`

> HTTP body내용을 직접 응답하기 때문에 viewResolver 대신 HttpMessageConverter 사용
{: .prompt-tip }

> ![HttpMessageConveter](/assets/img/posts/dev/java/spring-mvc/http-message-converter1.png "HttpMessageConveter")


### @RequestBody / HttpEntity 사용시 동작 순서
1. 컨트롤러의 메서드에서 @RequestBody / HttpEntity 파라미터 사용
2. RequestBodyArgumentResolver / HttpEntityArgumentResolver에서 HttpMessageConverter 호출
3. HttpMessageConverter가 읽을 수 있는지 canRead() 메서드 호출
> 2-1. 처리할 타입 지원 하는지 확인(`byte[]`, `String`, `Object<T>`)  
> 2-2. Content-Type MediaType 지원 하는지 확인(`text/plain`, `application/json`)
3. 조건이 맞으면 read() 메서드 호출, 객체 생성하고 반환한다.

### @ResponseBody / HttpEntity 사용시 동작 순서
1. 컨트롤러의 메서드에서 return시 @ResponseBody / HttpEntity로 반환
2. HttpMessageConverter가 브라우저에 응답 할 수 있는지 canWrite() 메서드 호출
> 2-1. 응답 가능한 타입 지원 하는지 확인(`byte[]`, `String`, `Object<T>`)  
> 2-2. Accept MediaType 지원 하는지 확인(@RequestMapping의 `produces`)
3. 조건이 맞으면 write() 메서드 호출, HTTP body에 데이터 생성 후 전달

> 서버 요청시 Content-Type, Accept 지정  
> 요청 응답시 Content-Type 지정
{: .prompt-tip }