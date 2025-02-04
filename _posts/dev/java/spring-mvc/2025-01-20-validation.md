---
title: Validation
date: 2025-01-20
categories: spring-mvc
tags: [spring mvc, validation, bindingResult, fieldError, globalError, rejectValue, reject]
description: Validation(검증) post
permalink: java/springmvc/validation
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
상황: HTTP 요청시 해당 컨트롤러에서 데이터 바인딩할 때 에러 발생시
* BindingResult 객체가 없으면 400에러 페이지 이동(안좋은 사용자 경험(UX) 제공)
* BindingResult 객체가 있으면 에러정보(`FieldError`)를 생성하여 `BindingResult`에 담아서 컨트롤러 정상 호출한다.

### BindingResult에 에러정보를 적용하는 대표적인 3가지 방법
* `@ModelAttribute`같은 객체 타입 에러 등으로 바인딩 실패시 Spring이 `FieldError`생성 후 `BindingResult`에 적용한다.
* 개발자가 직접 `new FieldError(...)` 또는 `new ObejctError(...)` 를 `BindingResult`에 적용한다.
* `Validator`를 구현해서 사용 `@Validation`

> 개발자가 직접 FieldError/ObejctError를 적용해야하므로 자세히 알아본다.
{: .prompt-info }

### FieldError 객체
특정 필드에 대한 에러 발생시 사용하여 두 가지 생성자를 제공한다.
``` java
public FieldError(String objectName, String field, String defaultMessage) {...}

public FieldError(String objectName, String field, @Nullable Object rejectValue, 
                    boolean bindingFailure, @Nullbale String[] codes, 
                    @Nullable Object[] arguments, @Nullable String defaultMessage) {...}
```
파라미터 목록
* `objectName`: 에러 발생한 객체 이름
* `field`: 에러 발생한 객체의 멤버(property)
* `rejectedValue`: 사용자가 입력한 값(거절된 값)
* `bindingFailure`: 타입 에러 같은 바인딩 실패인지, 검증 로직에서 발생한 실패인지 구분 값
* `codes`: 에러 메시지 코드
* `arguments`: 에러 메시지에서 사용하는 인자 값
* `defaultMessage`: 기본 에러 메시지

예시
``` java
@PostMapping("/add")
public String addUser(@ModelAttribute User user, BindingResult bindingResult) {
    
    // 1. 에러 메시지를 코드화로 불러오고 없으면 기본 메시지 출력 지정하는 경우
    if(!StringUtils.hasText(user.getUserName())) {
        bindingResult.addError(new FieldError("user", "userName", "유저 이름은 필수 입니다."));
    }
    if(user.getUserPassword().length() < 8 || user.getUserPassword().length() > 20) {
        bindingResult.addError(new FieldError("user", "userPassword", "패스워드는 8자 이상, 20자 이하로 입력해주세요."));
    }

    // 2. 에러 메시지 코드화로 불러오는 경우
    if(!StringUtils.hasText(user.getUserName())) {
        bindingResult.addError(new FieldError(
                "user", "userName", user.getUserName(), false,
                new String[]{"required.user.userName"}, null, null));
    }
    if(user.getUserPassword().length() < 8 || user.getUserPassword().length() > 20) {
        bindingResult.addError(new FieldError(
                "user", "userPassword", user.getUserPassword(), false,
                new String[]{"range.user.userPassword"}, new Object[]{8, 20}, null));
    }

    // Validation 실패시 사용자가 입력했던 데이터와 함께 다시 입력 폼 이동
    if(bindingResult.hasErrors()) {
        log.info("errors = {}", bindingResult);
        return "/user/addForm";
    }

    ...
}
```

### ObjectError 객체
객체에 대한 공통 에러 발생시 사용하여 두 가지 생성자를 제공한다.
``` java
public ObjectError(String objectName, @Nullable String defaultMessage) {...}
public ObjectError(String objectName, @Nullable String[] codes,
                    @Nullable Object[] arguments, @Nullable String defaultMessage) {...}
```
파라미터 목록
* `objectName`: 에러 발생한 객체 이름
* `codes`: 에러 메시지 코드
* `arguments`: 에러 메시지에서 사용하는 인자 값
* `defaultMessage`: 기본 에러 메시지

예시
``` java
@PostMapping("/add")
public String addUser(@ModelAttribute User user, BindingResult bindingResult) {

    // 1. 에러 메시지를 코드화로 불러오고 없으면 기본 메시지 출력 지정하는 경우
    if(!user.checkDuplicateUser()) {
        bindingResult.addError(new ObjectError("user", "유저가 이미 존재합니다."));
    }

    // 2. 에러 메시지 코드화로 불러오는 경우
    if(!user.checkDuplicateUser()) {
        bindingResult.addError(new ObjectError("user", new String[]{"duplicateUser"}, null, null));
    }

    // Validation 실패시 사용자가 입력했던 데이터와 함께 다시 입력 폼 이동
    if(bindingResult.hasErrors()) {
        log.info("errors = {}", bindingResult);
        return "/user/addForm";
    }

    ...
}
```

> FieldError와 ObjectError객체로 매번 메서드에 객체를 생성하며 사용하면 개발자 입장에서 귀찮을 것 같다는 느낌이 든다.
{: .prompt-info }

그래서 위 객체 기반으로 깔끔하게 만든 `Errors`Interface에 `rejectValue()`, `reject()` 메서드가 존재한다.

### rejectValue()
FieldError 객체를 직접 생성하지 않고 간편하게 검증 에러를 구현 할 수 있다.
``` java
void rejectValue(@Nullable String field, String errorCode, @Nullable Obejct[] errorArgs, 
                    @Nullable String defaultMessage);
```
* `field`: 에러 발생한 객체의 멤버(property)
* `errorCode`: 에러 코드(messageResolver를 위한 에러 코드)
* `errorArgs`: 에러 메시지에서 사용하는 인자 값
* `defaultMessage`: 에러 메시지를 찾을 수 없을 때 사용하는 기본 메시지

### reject()
ObjectError 객체를 직접 생성하지 않고 간편하게 검증 에러를 구현 할 수 있다.
``` java
void reject(String errorCode, @Nullable Object[] errorArgs, 
                @Nullable String defaultMessage);
```

예시
``` java
@PostMapping("/add")
public String addUser(@ModelAttribute User user, BindingResult bindingResult) {
    
    // 1. 에러 메시지를 코드화로 불러오고 없으면 기본 메시지 출력 지정하는 경우
    if(!StringUtils.hasText(user.getUserName())) {
        bindingResult.rejectValue("userName", "required", "유저 이름은 필수입니다.");
    }
    if(user.getUserPassword().length() < 8 || user.getUserPassword().length() > 20) {
        bindingResult.rejectValue("userPassword", "range", "패스워드는 8자 이상, 20자 이하로 입력해주세요.");
    }
    if(!user.checkDuplicateUser()) {
        bindingResult.reject("duplicateUser", null, "유저가 이미 등록되었습니다.");
    }

    // 2. 에러 메시지 코드화로 불러오는 경우
    if(!StringUtils.hasText(user.getUserName())) {
        bindingResult.rejectValue("userName", "required");
    }
    if(user.getUserPassword().length() < 8 || user.getUserPassword().length() > 20) {
        bindingResult.rejectValue("userPassword", "range", new Object[]{8, 20}, null);
    }
    if(!user.checkDuplicateUser()) {
        bindingResult.reject("duplicateUser", null, null);
    }


    // Validation 실패시 사용자가 입력했던 데이터와 함께 다시 입력 폼 이동
    if(bindingResult.hasErrors()) {
        log.info("errors = {}", bindingResult);
        return "/user/addForm";
    }

    ...
}
``` 


에러 메시지 코드화 설정
``` text
/src/resources/errors.properties - 에러 메시지 코드화 설정 파일

required.user.userName=유저 이름은 필수입니다.
range.user.userPassword=패스워드는 {0}자 이상, {1}자 이하로 입력해주세요.
duplicateUser=유저가 이미 등록되었습니다.
```

``` text
/src/resources/application.properties - spring 설정 파일(아래는 errors.properties 등록)

spring.messages.basename=errors
```

### 오류 코드와 메시지 처리
아래와 같이 범용성으로 사용하다가 세밀하게 오류 메시지를 출력해야하는 경우에는 세밀한 내용이 적용되도록  
메시지에 단계를 두는 방법이 효율적이다.
```
#Level1
required.user.userName:유저 이름은 필수입니다.

#Level2
required:필수 값 입니다.
```

스프링은 `MessageCodesResolver`라는 것으로 이러한 기능을 지원한다.

### MessageCodesResolver
`MessageCodesResolver` 특징
* Interface이다.
* 검증 오류 코드로 메시지 코드들을 생성한다.
* `DefaultMessageCodesResolver`는 기본 구현체이다.
* 주로 다음과 함께 사용한다. `FieldError`, `ObjectError`

### DefaultMessageCodesResolver 기본 메시지 생성 규칙

FieldError의 경우 다음 순서로 4가지 메시지 코드 생성
``` text
code + "." + object name + "." + field
code + "." + field
code + "." + field type
code
```
예시 FieldError `rejectValue("userName", "required")`
``` text
required.user.userName
required.userName
required.java.lang.String
required
```

ObjectError의 경우 다음 순서로 2가지 메시지 코드 생성
``` text
1. code + "." + object name
2. code
```
예시 ObejctError `reject(duplicateUser)`
``` text
duplicateUser.user
duplicateUser
```

위와 같이 MessageCodesResolver는 구체적인 것을 먼저 만들고 덜 구체적인 것을 나중에 만든다.

> 그래서 핵심은 구체적인 것부터 만들고 덜 구체적인 것을 만든다.
{: .prompt-tip }

``` text
#-------------#
# ObjectError #
#-------------#
# Level1
duplicateUser.admin=관리자 계정이 이미 존재합니다.

# Level2
duplicateUser=유저가 이미 등록되었습니다.


#-------------#
# Fielderror  #
#-------------#
# Level1
required.user.userName=유저 이름은 필수입니다.

# Level2
required.userName=유저 이름은 필수입니다.

# Level3
required.java.lang.String = 필수 문자입니다.
max.java.lang.Integer = {0}자리 이하로 숫자를 입력해주세요.

# Level4
required = 필수 값 입니다.
max = {0}자리 이하로 입력해주세요.
```

> Spring은 타입 오류가 발생하면 `typeMismatch`오류 코드를 사용한다.
{: .prompt-tip }

``` text
typeMismatch.java.lang.Integer=숫자를 입력해주세요.
typeMismatch=타입 오류입니다.
```

### Validator Interface 사용
Validation 로직이 복잡할경우 별도의 class로 분리하는 것이 좋다고 한다.

Spring은 Validation을 체계적으로 제공하기 위해 다음 interface를 제공한다.
``` java
public interface Validator {
    boolean supports(Class<?> clazz);
    void validate(Object target, Errors errors);
}
```

`supports(Class<?> clazz)`: 해당 검증기를 지원 여부 확인  
`validate(Object target, Errors errors)`: 검증 대상 객체와 `BindingResult`를 전달하여 검증기 실행

구현 예시
``` java
// Bean(싱글톤 사용)으로 등록하기 위해 컴포넌트 스캔 대상 지정
@Component
public class UserValidator implements Validator {

    @Override
    public boolean supports(Class<?> clazz) {
        return User.class.isAssignableFrom(clazz);
    }

    @Override
    public void validate(Object target, Errors errors) {

        User user = (User)target;

        if(!StringUtils.hasText(user.getUserName())) {
            errors.rejectValue("userName", "required");
        }
        if(user.getUserPassword().length() < 8 || user.getUserPassword().length() > 20) {
            errors.rejectValue("userPassword", "range", new Object[]{8, 20}, null);
        }

        if(!user.checkDuplicateUser()) {
            errors.reject("duplicateUser", null, null);
        }
    }
}
```

기존 컨트롤러 코드 변경
``` java
@Controller
public class UserController {
    ...
    
    // Validator 생성자 주입
    private final UserValidator userValidator;

    public UserController(UserValidator userValidator) {
        this.userValidator = userValidator;
    }

    @PostMapping("/add")
    public String addUser(@ModelAttribute User user, BindingResult bindingResult) {

        // Validator 메서드 호출
        userValidator.validate(user, bindingResult);

        if(bindingResult.hasErrors()) {
            log.info("errors = {}", bindingResult);
            return "/user/addForm";
        }

        ...
    }
}
```

### Validator 메서드 호출하는 부분 생략하는 방법

컨트롤러에 아래 내용을 추가하고
``` java
@Controller
public class UserController {
    ...
    @InitBinder
    public void init(WebDataBinder dataBinder) {
        dataBinder.addValidators(userValidator);
    }
    ...
}
```
@Validated 추가 및 호출 로직 제거하면 된다.

``` java
// 메서드에 @Validated 추가
@PostMapping("/add")
public String addUser(@Validated @ModelAttribute User user, BindingResult bindingResult) {

    // Validator 메서드 직접 호출x
    // userValidator.validate(user, bindingResult);

    if(bindingResult.hasErrors()) {
        log.info("errors = {}", bindingResult);
        return "/user/addForm";
    }

    User savedUser = userRepository.save(user);
    redirectAttributes.addAttribute("userId", savedUser.getUserId());

    return "redirect:/user/{userId}";
}
```

WebDataBinder에 검증기를 추가하고 해당 메서드에 @Validated를 적용하면 자동으로 검증기를 적용 할 수 있다.

### BeanValidation 등장
실무에서 위와 같은 검증을 간단하게 필드 Validation 할때 BeanValidation 으로 사용 한다고 한다.  

[BeanValidation post 보기](bean-validation){:target="_blank"}