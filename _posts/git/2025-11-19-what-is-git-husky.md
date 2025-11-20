---
title: git husky 정리
date: 2025-11-19
categories: [git]
tags: [git, git hooks husky]
description: git husky 정리 post
permalink: what-is-git-husky
---

husky: `git hooks`를 쉽게 관리할 수 있도록 도와주는 도구.  
git이 제공하는 `pre-commit`, `pre-push` 같은 hook을 활용해 commit 전에 자동으로 lint, test, format 등을 실행할 수 있게 해준다.

즉, “팀 전체의 코드 품질을 자동으로 일정 수준 이상 유지하도록 해주는 도구”
> git hooks: git 이벤트 발생할 때 자동으로 실행되는 스크립트.
{: .prompt-tip}

## 🚀 왜 husky를 사용하는가?  
* commit 전에 자동으로 lint/format → 품질 관리
* 테스트 미통과 시 commit 차단 → 안정성 보장
* git hook을 스크립트 기반으로 깔끔하게 관리
* 팀/프로젝트 규칙을 강제할 수 있음
* GitHub 템플릿이나 프레임워크에서 이미 기본 제공되는 경우도 많음

## 🔧 Husky 주요 Git Hooks 예시
* pre-commit: commit 전에 실행
* lint, prettier, 타입 검사 자동 실행
* commit-msg: commit 메시지 유효성 검사
* Conventional Commits 체크
* pre-push: push 전 테스트 자동 실행
* pre-merge-commit: merge 전 스크립트 실행

## 🗂 commitlint 타입 정리

`chore`
* 설정, 환경, 빌드 관련 변경
* 기능 변화 없음
* 예: .gitignore, husky, 설정 파일 수정
* commit 메시지 예시
```text
chore: update .gitignore to exclude personal assets
```

`feat`
* 새 페이지 추가
* 새 기능(컴포넌트/모듈) 생성
* API 엔드포인트 추가
* 기존 모듈에 새로운 기능 추가
* commit 메시지 예시
```text
feat: add dark mode toggle button to header
```

`fix`
* 버그 수정
* 기능이 잘못된 부분을 고침
* commit 메시지 예시
```text
fix: resolve crash when loading empty post data
```

`style`
* 코드 포맷팅/스타일 변경
* 기능 변화 없음
* prettier, eslint 자동 수정 등
* commit 메시지 예시
```text
style: apply prettier formatting to blog components
```

## 참조 문서
<https://git-scm.com/docs/githooks>  
<https://github.com/conventional-changelog/commitlint>