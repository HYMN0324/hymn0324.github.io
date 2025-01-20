---
title: SpringMVC 구조
date: 2025-01-14
categories: spring-mvc
tags: [spring mvc, dispatcher servlet, handler]
description: SpringMVC 구조 post
permalink: springmvc/arch
---

## SpringMVC 구조
> ![SpringMVC 구조](/assets/img/posts/dev/java/spring-mvc/springmvc-arch1.png "SpringMVC 구조")

### 동작순서
1. __HandlerMapping 조회__ : 요청 URL에 맞는 Handler(Controller) 조회 - from Dispatcher Servlet
2. __HandlerAdapter 조회__ : 해당 Handler 처리 가능한 Adapter 조회 - from Dispatcher Servlet
3. __HandlerAdapter 실행__ : 처리 가능한 Adapter 실행 - from Dispatcher Servlet
4. __Handler 실행__ : Handler(Controller) 실행 - from HandlerAdapter
5. __ModelAndView 객체 반환__ : Handler(Controller) 에서 반환한 정보를 ModelAndView 객체로 변환 후 반환 - from HandlerAdapter
6. __View Resolver 호출__ : ModelAndView 객체의 논리 이름(페이지 이름) 전달하여 호출 - from Dispatcher Servlet
> 6-1. 렌더링 할 수 있는 ViewResolver 조회 - from ViewResolver
```
> 0. BeanNameViewResolver         : Bean 이름으로 View 객체 반환(ex: excel 파일 생성 기능에 사용)
> 1. InternalResourceViewResolver : JSP를 처리할 수 있는 InternalResourceView 객체 반환
> ... 이하 생략
```
> 6-2. 해당 View 객체에 논리 이름을 물리 이름(절대 경로)으로 변환

7. __View 객체 반환__ : View 객체를 반환한다.
8. __View Rendering__ : View 객체의 Rendering메서드를 통해 Rendering 후 클라이언트 전달

### 왜 이런 구조로 동작할까?
1. __Front Controller 패턴__ 사용하기 때문.(SpringMVC는 Dispatcher Servlet을 둔다.)
2. Front Controller는 요청 처리의 흐름을 위와 같이 단계별로 나눠서 처리하므로 __독립적으로 동작하고 확장__ 할 수 있다.(유연성)
3. Front Controller로 __단일 진입으로 처리__ 하여 인터셉터(인증, 예외 처리)와 같은 공통 처리를 할 수 있어 일관되게 관리할 수 있기 때문.(유지보수 용이)

결론적으로 대규모 애플리케이션 개발과 유지보수를 최대한 단순화 하기 위해 Front Controller 구조를 사용한다.

### @Controller, @RequestMapping을 사용하면 어떻게 동작이 되는걸까?
Spring이 Handler Mapping과 Handler Adapter 기능을 __구현한 메서드에서 우선순위 기준으로 찾는다.__

스프링이 찾는 HandlerMapping 우선 순위
```
0. RequestMappingHandlerMapping : @Controller/@RequestMapping 지정된 클래스 기준으로 Handler를 찾는다.
1. BeanNameUrlHandlerMapping    : Bean이름으로 Handler를 찾는다.
... 이하 생략
```

스프링이 찾는 HandlerAdapter 우선 순위(각 HandlerAdapter 구현체의 supports() 메서드 호출하여 지원되는지 확인한다.)
```
0. RequestMappingHandlerAdapter   : @RequestMapping 애노테이션을 지정 했는지 확인
1. HttpRequestHandlerAdapter      : HttpRequestHandler 인터페이스를 구현 했는지 확인
2. SimpleControllerHandlerAdapter : Controller 인터페이스를 구현 했는지 확인(@Controller X, 과거에 사용)
... 이하 생략
```

> 현재 Spring은 99% __RequestMapping HandlerMapping/HandlerAdapter로 사용한다고 한다.__
{: .prompt-tip }

### 그럼 왜 RequestMapping을 주로 사용할까?

HTTP 요청,응답 기능을 쉽게 사용할 수 있도록 아래기능 2가지를 RequestMappingHandlerAdapter가 호출하기 때문.  

요청기능 : __HandlerMethodArgumentResolver__ - Handler(Controller)가 쉽게 받을 수 있게 제공하는 기능으로 Handler 메서드의 파라미터 기반으로 데이터 생성 후 Adapter에 반환

응답기능 : __HandlerMethodReturnValue__ Handler - HTTP 응답시 전달할 데이터를 쉽게 변환해주는 기능
아래 ReturnValue Handler가 대표적으로 지원해주는 기능

> ![Arguments, ReturnValue](/assets/img/posts/dev/java/spring-mvc/springmvc-arch2.png "Arguments, ReturnValue")