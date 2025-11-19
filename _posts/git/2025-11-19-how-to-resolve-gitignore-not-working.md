---
title: .gitignore 적용 안될 때 해결 방법
date: 2025-11-19
categories: [git]
tags: [git, gitignore]
description: .gitignore 적용 안될 때 해결 방법 post
permalink: how-to-resolve-gitignore-not-working
---

## 상황
개인 post 글의 첨부사진 디렉터리를 git에 제외하고싶어 해당 디렉터리 경로를 .gitignore 파일에 추가.  
.gitignore 추가 내용
```text
assets/img/posts/personal
```

`git status` command 실행 결과 변동사항이 없음.

## 해결 방법
git 캐시에서 해당 디렉터리 제거.

```bash
git rm -r --cached assets/img/posts/personal

# git status 및 commit 후 .gitignore 적용 최종 확인
git status
git commit -m "chore: update .gitignore to exclude personal assets"
git log --stat
```