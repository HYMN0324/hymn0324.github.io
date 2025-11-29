---
title: docker를 이용하여 github blog 실행
date: 2025-11-29
categories: [server, docker]
tags: [docker, github pages, github blog, ruby, jekyll]
description: docker를 이용하여 github blog 실행 post
permalink: how-to-run-docker-github-blog
---

이번 post는 github blog를 docker로 실행하여 Ruby관련 파일이 OS에 영향주지 않도록 격리해보겠습니다.

노트북을 두고와서 본가pc에서 블로그 작성해야하는상황..  
본가pc는 윈도우로 되어있어 vm에 linux + docker 설치하여 진행.

github에서 clone후 디렉터리 이동.

```bash
git clone https://github.com/HYMN0324/hymn0324.github.io.git
cd ~/hymn0324.github.io/
```

`Dockerfile` 생성.

```bash
vi Dockerfile
```

```Dockerfile
FROM ruby:3.3

EXPOSE 4000
EXPOSE 35729

WORKDIR /usr/src/app

COPY Gemfile Gemfile.lock jekyll-theme-chirpy.gemspec .
RUN bundle install

CMD ["bundle", "exec", "jekyll", "serve", "--host", "0.0.0.0", "--livereload"]

# docker build --no-cache -t github.io .
# docker images
# docker run -d -v $PWD:/usr/src/app -p 4000:4000 -p 35729:35729 github.io
```

> Github 저장소에 push하면, [GitHub Pages](<https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages>){:target="_blank"}가 자동으로 사이트를 build합니다.  
따라서 Github 서버에서 사용하는 Ruby버전과 동일하게 설정해야합니다.  
{: .prompt-warning}

아래 링크 참조하여 ruby 버전에 맞게 지정.  
<https://pages.github.com/versions.json>{:target="_blank"}  
<https://docs.github.com/en/pages/setting-up-a-github-pages-site-with-jekyll/creating-a-github-pages-site-with-jekyll>{:target="_blank"}

2025-11-29 기준 ruby 버전: 3.3
<img src="/assets/img/posts/server/docker/how-to-run-docker-github-blog/checkVersionRuby.png" width="50%" alt="checkVersionRuby">

Docker 빌드.

```bash
docker build --no-cache -t github.io .

# github.io image 확인
docker images
```

<img src="/assets/img/posts/server/docker/how-to-run-docker-github-blog/docker-build1.png" width="100%" alt="docker-build1">
<img src="/assets/img/posts/server/docker/how-to-run-docker-github-blog/docker-build2.png" width="70%" alt="docker-build2">

github.io 컨테이너 실행.

```bash
docker run -d -v $PWD:/usr/src/app -p 4000:4000 -p 35729:35729 github.io

# 컨테이너 목록 확인
docker ps
```

<img src="/assets/img/posts/server/docker/how-to-run-docker-github-blog/docker-run1.png" width="90%" alt="docker-run1">
<img src="/assets/img/posts/server/docker/how-to-run-docker-github-blog/docker-run2.png" width="100%" alt="docker-run2">

방화벽 설정.

```bash
firewall-cmd --add-port=4000/tcp --permanent
firewall-cmd --reload
```

PC 브라우저에서 blog 접속 확인.

<img src="/assets/img/posts/server/docker/how-to-run-docker-github-blog/docker-run3.png" width="70%" alt="docker-run3">