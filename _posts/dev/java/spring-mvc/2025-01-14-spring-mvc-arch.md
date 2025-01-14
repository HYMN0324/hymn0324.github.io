---
title: SpringMVC 구조
date: 2025-01-14
categories: spring
tags: [spring, dispatcher servlet, handler]
permalink: springmvc/arch
---

## SpringMVC 구조
> ![SpringMVC 구조](/assets/img/posts/dev/java/spring-mvc/springmvc-arch1.png "SpringMVC 구조")

### 동작순서
1. __Handler 조회__ : 요청 URL에 맞는 Handler(Controller) 조회
2. __Handler Adapter 조회__ : 해당 Handler 실행 가능한 Adapter 조회
3. __Handler Adapter 실행__ : Adapter가 있으면 Handler를 argument로 전달하며 Adapter 실행
4. __Handler 실행__ : 실질적인 Handler(Controller) 실행
5. __ModelAndView 객체 반환__ : Controller 에서 반환한 정보를 ModelAndView 객체로 변환 후 반환
6. __View Resolver 호출__ : View Resolver를 찾고 실행한다.
7. __View 반환__ : View Resolver는 뷰 논리 이름을 물리 이름으로 변경하고 Rendering 하기위해 View 객체를 반환한다.
8. __View Rendering__ : View 객체의 Rendering메서드를 통해 Rendering 후 클라이언트 전달

### 왜 이런 구조로 동작할까?
1. __Front Controller 패턴__ 사용하기 때문.(SpringMVC는 Dispatcher Servlet을 둔다.)
2. Front Controller는 요청 처리의 흐름을 위와 같이 단계별로 나눠서 처리하므로 __독립적으로 동작하고 확장__ 할 수 있다.(유연성)
3. Front Controller로 __단일 진입으로 처리__ 하여 인터셉터(인증, 예외 처리)와 같은 공통 처리를 할 수 있어 일관되게 관리할 수 있기 때문.(유지보수 용이)

결론적으로 대규모 애플리케이션 개발과 유지보수를 최대한 단순화 하기 위해 Front Controller 구조를 사용한다.