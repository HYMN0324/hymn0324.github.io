---
title: Validation
date: 2025-01-20
categories: spring-mvc
tags: [spring mvc, validation, bindingResult, fieldError]
description: Validation(검증) post
permalink: springmvc/validation
---

## Validation
### 정의
* HTTP 요청이 정상인지 검증(Validation)하는 기능

### 왜 Validation해야하나?
> * 클라이언트 검증(자바스크립트 등)은 조작할 수 있으므로 보안에 취약, 최종적으로 서버에서 검증해야 한다.
> * 무슨 언어든 무슨 프레임워크든 간에 서버역할을 하면 무조건 검증을 해야한다.

### 실무에서 주로 사용하는 Validation
`BindingResult` 특징
* Interface이다.
* `Error`Interface 상속 받음
* `BindingResult`Interface는 `Error`Interface 기능에 더해 추가 기능 제공.
* 그리하여 실무에서 관례상 `BindingResult`를 주로 사용한다고 한다.

* Spring에서 `BindingResult`구현체인 `BeanPropertyBindingResult` 사용.

> BindingResult 파라미터 위치는 `@ModelAttribute`같은 데이터 바인딩하는 객체 다음에 와야한다.
{: .prompt-tip }

### 왜 다음에 와야하나?
Validation해야 할 객체를 지정해야하기 때문에 `target` 다음에 와야한다.

### BindingResult 사용 이유
상황: HTTP 요청시 해당 컨트롤러에서 데이터 바인딩할 때 오류 발생시
* BindingResult 객체가 없으면 400에러 페이지 이동(안좋은 사용자 경험(UX) 제공)
* BindingResult 객체가 있으면 오류정보(`FieldError`)를 생성하여 `BindingResult`에 담아서 컨트롤러 정상 호출한다.

### BindingResult에 오류정보를 적용하는 대표적인 4가지 방법
* `@ModelAttribute`같은 객체 타입 오류 등으로 바인딩 실패시 Spring이 `FieldError`생성 후 `BindingResult`에 적용한다.
* 개발자가 직접 `new FieldError(...)`를 `BindingResult`에 적용한다.
* 개발자가 직접 `new ObejctError(...)`를 `BindingResult`에 적용한다.
* `Validator`를 구현해서 사용 `@Validation`

> 개발자가 직접 FieldError/ObejctError를 적용해야하므로 자세히 알아본다.
{: .prompt-info }

### FieldError 객체
특정 필드에 대한 오류 발생시 사용하여 두 가지 생성자를 제공한다.
``` java
public FieldError(String objectName, String field, String defaultMessage) {...}

public FieldError(String objectName, String field, @Nullable Object rejectValue, 
                    boolean bidingFailure, @Nullbale String[] codes, 
                    @Nullable Object[] arguments, @Nullable String defaultMessage) {...}
```
파라미터 목록
* `objectName`: 오류 발생한 객체 이름
* `field`: 오류 발생한 객체의 멤버(property)
* `rejectedValue`: 사용자가 입력한 값(거절된 값)
* `bindingFailure`: 타입 오류 같은 바인딩 실패인지, 검증 로직에서 발생한 실패인지 구분 값
* `codes`: 오류 메시지 코드
* `arguments`: 오류 메시지에서 사용하는 인자 값
* `defaultMessage`: 기본 오류 메시지


### ObjectError 객체
객체에 대한 공통 오류 발생시 사용하여 두 가지 생성자를 제공한다.
``` java
public ObjectError(String objectName, @Nullable String defaultMessage) {...}
public ObjectError(String objectName, @Nullable String[] codes,
                    @Nullable Object[] arguments, @Nullable String defaultMessage) {...}
```
파라미터 목록
* `objectName`: 오류 발생한 객체 이름
* `codes`: 오류 메시지 코드
* `arguments`: 오류 메시지에서 사용하는 인자 값
* `defaultMessage`: 기본 오류 메시지

> FieldError와 ObjectError객체로 오랫동안 사용하면 개발자 입장에서 귀찮을 것 같다는 느낌이 든다.
{: .prompt-info }

그래서 위 Error객체 기반으로 깔끔하게 만든 BindingResult에 `rejectValue()`, `reject()` 메서드가 존재한다.

아래 사용 예시
``` java
@Controller
@RequestMapping("/user")
public class UserController {

    @RequestMapping("/add")
    public String addUser(@ModelAttribute User user, BindingResult bindingResult) {
        
        // 1. 오류 메시지를 직접 reject하는 경우
        if(!StringUtils.hasText(user.getUserName())) {
            bindingResult.rejectValue("userName", "required", "유저 이름은 필수입니다.");
        }
        if(user.getUserPassword().length() < 8 || user.getUserPassword().length() > 20) {
            bindingResult.rejectValue("userPassword", "range", "패스워드는 8자 이상, 20자 이하로 입력해주세요.");
        }

        // 2. 오류 메시지 코드화로 reject하는 경우
        if(!StringUtils.hasText(user.getUserName())) {
            bindingResult.rejectValue("userName", "required");
        }
        if(user.getUserPassword().length() < 8 || user.getUserPassword().length() > 20) {
            bindingResult.rejectValue("userPassword", "range", new Object[]{8, 20}, null);
        }

        // Validation 실패시 사용자가 입력했던 데이터와 함께 다시 입력 폼 이동
        if(bindingResult.hasErrors()) {
            log.info("errors = {}", bindingResult);
            return "/user/addForm";
        }
    }
}
``` 

``` text
/src/resources/errors.properties - 오류 메시지 코드화 설정 파일

required.user.userName=유저 이름은 필수입니다.
range.user.userPassword=패스워드는 {0}자 이상, {1}자 이하로 입력해주세요.
```

``` text
/src/resources/application.properties - spring 설정 파일

spring.messages.basename=errors
```

