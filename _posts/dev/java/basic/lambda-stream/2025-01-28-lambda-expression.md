---
title: 람다식 [Lambda Expression]
date: 2025-01-28
categories: lambda-stream
tags: [labmda, stream, fp]
description: 람다식 [Lambda Expression] post
permalink: lambda-stream/lambda-expression
---

## 람다식
### 정의
* JDK1.8에 추가된 함수형 언어(fp) 기능으로 익명 함수를 표현하는 방법.

### 특징
* 함수형 인터페이스(Functional Interface)의 인스턴스를 간결한 문법으로 생성하는데 사용.
* 익명 객체의 반복적인 코드에서 벗어나 더 간결하고 효율성 제공

> 함수형 인터페이스 - 하나의 추상메서드만 가지는 인터페이스
{: .prompt-info }

###  기본 문법
``` java
(parameters) -> expression
(parameters) -> { statements; }
```
* 화살표 연산자`->`: 매개변수와 함수 본문을 구분

> 함수와 메서드 차이
* 근본적으론 동일하나 함수는 일반적 용어, 메서드는 객체지향개념 용어로  
함수 - 클래스에 독립  
메서드 - 클래스에 종속
* 자바에서는 독립적인 함수가 없어서 전부 메서드로 칭한다.

## 함수형 인터페이스와의 관계

람다식은 함수형 인터페이스와 밀접한 관계를 가진다.  
함수형 인터페이스는 하나의 추상메서드만 가지는 인터페이스로  
@FuncationalInterface 애너테이션으로 명시할 수 있다.

대표적인 함수형 인터페이스(java.util.function 패키지)

| 함수형 인터페이스         | 메서드                  | 설명    |
| :---:                 | :---:                 | :---  |
| `java.lang.Runnable`  | void run()            | 매개변수 x, 반환 값 x |
| `Supplier<T>`         | T get()               | 매개변수 x, 반환 값 o |
| `Consumer<T>`         | void accept(T t)      | 매개변수 o, 반환 값 x |
| `Function<T,R>`       | R apply(T t)          | 매개변수 o, 반환 값 o |
| `BiFunction<T, U, R>` | R apply(T t, U u)     | 매개변수 o(2개), 반환 값 o - 두개의 입력값을 받아 반환|
| `Predicate<T>`        | boolean test(T t)     | 매개변수 o, 반환 값 o - 조건식을 표현하는데 사용.|

예시: Predicate 활용
``` java
Predicate<String> isLongString = str -> str.length() > 10; // 이 조건식을 변수에 대입한다.

// 위 조건식 기준으로 조건을 확인 boolean을 반환한다.
System.out.println(isLongString.test("Hello")); // false
System.out.println(isLongString.test("Hello Lambda")); // true
```

## 람다식의 장점
1. 코드 간결성
* 익명 객체 작성시 발생하는 반복적인 코드 제거.
* 단순한 작업을 더 짧고 읽기 쉽게 표현 가능.

2. 가독성 향상
* 코드의 핵심 동작을 한눈에 파악 가능.

3. Stream API와 강력한 통합
* 람다식은 Stream API와 결합해 데이터 처리 작업(필터링, 매핑 등)을 직관적으로 구현할 수 있다.

4. 병렬 처리의 간편화
* 병령 Stream과 함께 데이터를 효율적으로 처리 가능하다.

예시: 간결한 코드  

람다식과 Stream API의 병렬 스트림으로 사용한 방식
``` java
return dbUser.values().stream()
        .filter(user -> user.getEmail().equals(paramEmail))
        .findAny();

// filter 메서드는 Predicate로 되어있다.
```

익명 객체 사용한 방식
``` java
List<User> users = new ArrayList<>(dbUser.values());
for(User user : users) {
    if(user.getEmail().equals(paramEmail)) {
        return Optional.of(user);
    }
}

return Optional.empty();
```

Iterator로 사용한 방식
``` java
Iterator<User> it = dbUser.values.iterator();
while(iterator.hasNext()) {
    User user = iterator.next();
    if(user.getEmail().equals(paramEmail)) {
        return Optional.of(user);
    }
}

return Optional.empty();
```
