---
title: BeanValidation
date: 2025-01-21
categories: spring-mvc
tags: [spring mvc, validation, beanValidation, bindingResult, fieldError, globalError, rejectValue, reject]
description: BeanValidation post
permalink: java/springmvc/bean-validation
---

## BeanValidation
### 정의

* 검증에 관한 애노테이션과 여러 인터페이스의 모음
* BeanValidation을 구현한 기술 중에 hibernate 구현체를 기본으로 사용

### 특징
* 검증 애노테이션으로 검증 로직을 적용 할 수 있다.
* JSR-380 자바 기술 표준으로 Spring에서 제공하는 기능이 아니다.

``` java
...
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import org.hibernate.validator.constraints.Range;

public class Order {

    // BeanValidation: @NotBlank, @NotNull, @Max, @Range

    @NotNull
    private Long orderId;

    @NotNull
    @Range(min = 1, max = 20)
    private Integer orderCount;

    @NotNull
    @Max(1000000000)
    private Integer price;

    @NotBlank
    private String deliveryLocation;

    private String requestText;

    ...
}
```
jakarta.validation으로 시작하면 표준 인터페이스이고  
org.hibernate.validator로 시작하면 hibernate의 vaildator 구현체를 사용할 때만 제공되는 검증 기능이다.

> 나중에 java 소유권이 다른 곳으로 넘어가면 jakrata가 다른 회사 또는 기관명으로 변경 될 수 있다.
{: .prompt-info }

### 왜 사용하는가?
* 빈 값 확인, 크기 조건과 같은 일반 로직은 매번 코드로 작성 또는 복붙하는것은 번거롭기 때문이다.
* BeanValidation 애노테이션 적용하면 필드에 대한 검증 내용을 직관적으로 볼 수 있어 유지보수가 용이 하기 때문이다.

BeanValidation을 사용 하려면 의존관계 추가해야한다.  
`build.gradle`
``` text
dependencies {
    ...
    implementation 'org.springframework.boot:spring-boot-starter-validation'
}
```

### 문제점
바로 사용하면 좋을 것 같지만 문제점이 있다.

Order 클래스에는 문제점이 있는데 orderId 같은 서버에서 부여하는 필드는 등록 요청시 필요 없는 항목인데 @NotNull로 되어있다.  

또한 수정시에는 orderCount max가 9999까지 허용한다 하였을때 어떻게 해야할까.  

그래서 실무에서는 등록용 Form 객체, 수정용 Form 객체를 분리해서 개발 한다고 한다.

### 해결 - Form 전송 객체 분리

주문 등록 Form 객체
``` java
package hello.itemservice.web.order.form;
...
public class OrderSaveForm {

    @NotNull
    @Range(min = 1, max = 20)
    private Integer orderCount;

    @NotNull
    @Max(1000000000)
    private Integer price;

    @NotBlank
    private String deliveryLocation;

    private String requestText;

    
}
```

주문 수정 Form 객체
``` java
package hello.itemservice.web.order.form;
...
public class OrderUpdateForm {

    @NotNull
    private Long orderId;

    @NotNull
    @Range(min = 1, max = 9999)
    private Integer orderCount;

    @NotNull
    @Max(1000000000)
    private Integer price;

    @NotBlank
    private String deliveryLocation;

    private String requestText;

    ...
}
```

당연히 기존 Order 클래스에 검증 애노테이션은 지워야한다.
``` java
public class Order {

    private Long orderId;
    private Integer orderCount;
    private Integer price;
    private String deliveryLocation;
    private String requestText;

    ...
}
```

``` java
...
@PostMapping("/add")
public String addOrder(@Validated @ModelAttribute OrderSaveForm form, BindingResult bindingResult) {

    if(bindingResult.hasErrors()) {
        log.info("errors = {}", bindingResult);
        return "/order/addForm";
    }

    ...
}
```
> ![Validation2](/assets/img/posts/dev/java/spring-mvc/spring-mvc-bean-validation2.png "Validation2"){: width="50%" height="50%"}
> ![Validation3](/assets/img/posts/dev/java/spring-mvc/spring-mvc-bean-validation3.png "Validation3"){: width="50%" height="50%"}
* 정상적으로 검증이 되는것을 볼 수 있다.
* 기본 에러 메시지는 구현체에서 제공하는 메시지이다.(커스텀 가능)

### 어떻게 동작이 되는걸까?
1. spring boot가 `spring-boot-starter-validation` 라이브러리를 추가하면  
자동으로 Hibernate Validator(Bean Validator의 기본 구현체)를 감지하고

2. `LocalValidatorFactoryBean`이라는 Validator 어댑터는 Hibernate Validator와 Spring을 연결한다.
> LocalValidatorFactoryBean은 Spring의 Validator interface를 구현한 어댑터이다.  
> Spring에 연결한다는것은 글로벌하게 적용한다는 뜻이다.

3. `@ModelAttribute`각각의 필드에 타입 변환 시도한다.
> 3-1. 성공하면 다음으로  
> 3-2. 실패하면 typeMismatch로 FieldError 추가한다.(이후 Validator 실행 x)

4. Validator 실행
5. 검증 오류가 발생하면 FieldError 추가한다.

### 메시지 커스텀 방법
`typeMismatch`와 유사하듯 오류 코드가 애노테이션 이름으로 등록된다.

`MessageCodesResolver`를 통해 다양한 메시지 코드가 순서대로 생성된다.
[MessageCodesResolver post 보기](validation#messagecodesresolver){:target="_blank"}

@NotBlank
> * NotBlank.order.deliveryLocation
> * NotBlank.deliveryLocation
> * NotBlank.java.lang.String
> * NotBlank

BeanValidation이 메시지 찾는 순서
1. 생성된 메시지 코드 순서대로 `messageSource`에서 찾기
2. 애노테이션의 `message` 속성 사용 -> @NotBlank(message = "빈 문자열은 허용하지 않습니다.")
3. 구현체에서 제공하는 기본 값 사용

### HTTP MessageConverter에서의 Bean Validation

HTTP Message Converter는 HTTP body내용을 직접 요청/응답 할 때 사용하는데  
대부분 요청을 받을 때 @RequestBody를 사용할 것 이다.  
[HTTP MessageConverter post 보기](http-message-converter){:target="_blank"}

HttpMessgaeConverter는 @ModelAttribute와 다르게 각각의 필드 단위로 적용 되는것이 아니라 전체 객체 단위로 적용된다.  
따라서 HttpMessgaeConverter 작동이 성공해서 @ModelAttribute에 바인딩 되는 객체를 만들어져야 @Valid 또는 @Validated가 적용된다.