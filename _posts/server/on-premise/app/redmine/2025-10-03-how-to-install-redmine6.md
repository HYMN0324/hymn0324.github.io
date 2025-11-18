---
title: Redmine6 설치
date: 2025-09-16
categories: [server, on-premise]
tags: [redmine, rvm, ruby]
description: Redmine6 설치 post
permalink: how-to-install-redmine6
---

## 설치 개요

| 구분 | 정보 |
| --- | --- |
| OS | Ubuntu 22 |
| RVM(Ruby Version Manager) | 1.2 |
| Ruby | 3.2.9 |
| MySQL | 8.0.43 |
| Redmine | 6.0.6 |

## RVM 설치

### 의존 패키지 설치

```bash
sudo apt install software-properties-common
```

### PPA 추가 및 rvm 패키지 설치

```bash
sudo apt-add-repository -y ppa:rael-gc/rvm
sudo apt update
sudo apt install rvm
```

### 사용자 계정 rvm 권한 부여

```bash
sudo usermod -a -G rvm $USER
```

### rvm 명령어 환경변수 설정

```bash
sudo echo 'source "/etc/profile.d/rvm.sh"' >> ~/.bashrc
```

### 현재 접속 터미널 rvm 명령어 활성화

```bash
source ~/.bashrc

# rvm 명령어 정상 활성화 확인
rvm -v
```

## Ruby 3.2.9 설치

```bash
rvm install ruby-3.2.9

ruby -v
```

## MySQL 8.0.43 설치

### 의존 패키지 설치

```bash
sudo apt install build-essential \ 
gcc-10 g++-10 \ 
pkg-config \ 
cmake \ 
bison \ 
rpcsvc-proto \ 
libtirpc-dev \ 
libudev-dev \ 
libicu-dev \ 
libssl-dev \ 
libperl-dev \ 
libncurses-dev
```

### 다운로드 및 설치

```bash
mkdir ~/src && cd ~/src

wget https://cdn.mysql.com/Downloads/MySQL-8.0/mysql-boost-8.0.43.tar.gz

tar zxf mysql-boost-8.0.43.tar.gz
cd mysql-8.0.43
mkdir bld && cd bld
```

```bash
cmake .. \ 
  -DCMAKE_INSTALL_PREFIX=/data/mysql \ 
  -DCMAKE_C_COMPILER=/usr/bin/gcc-10 \ 
  -DCMAKE_CXX_COMPILER=/usr/bin/g++-10 \ 
  -DCMAKE_CXX_FLAGS="-std=c++17" \ 
  -DCMAKE_BUILD_TYPE=Release \ 
  -DWITH_LIBEVENT=bundled \ 
  -DLIBEVENT_VERSION=2.1.11 \ 
  -DLIBEVENT_VERSION_STRING=2.1.11-stable \ 
  -DWITH_BOOST=../boost \ 
  -DHAVE_SHA512_DIGEST_LENGTH=64 \ 
  -DCMAKE_THREAD_LIBS_INIT="-lpthread" \ 
  -DWITH_UNIT_TESTS=OFF
```

```bash
make -j$(nproc)
sudo make install
```

### MySQL 권한 설정

```bash
sudo groupadd mysql
sudo useradd -r -g mysql -s /bin/false mysql
sudo mkdir /usr/local/mysql/data
sudo chown -R mysql:mysql /usr/local/mysql/data
sudo chmod 700 /usr/local/mysql/data
```

### MySQL 초기 설정
```bash
cd /usr/local/mysql/
bin/mysqld --initialize --user=mysql
```

> Temporary Password (임시 패스워드) 복사
{: .prompt-warning}

<!--![image.png](image%201.png)-->

```bash
bin/mysqld_safe &
bin/mysql -u root -p
```

> Enter password:임시 패스워드 입력
{: .prompt-warning}

```sql
/* 패스워드 변경 */
ALTER USER 'root'@'localhost' IDENTIFIED BY '패스워드 변경';

/* root 계정 상세보기 */
SHOW GRANTS FOR 'root'@'localhost';
/* ... | GRANT PROXY ON ``@`` TO `root`@`localhost` WITH GRANT OPTION */

/* 나가기 */
quit;
```

```bash
# 변경한 패스워드 접속 확인
bin/mysql -u root -p
```

```bash
# MySQL 프로세스 종료
ps -ef | grep mysql
kill -9 해당 PID
ps -ef | grep mysql
```

### 환경변수 설정

```bash
sudo vi /etc/profile.d/mysql.sh

# 입력
export MYSQL_HOME=/usr/local/mysql
export PATH=$PATH:$MYSQL_HOME/bin
```

```bash
# 적용
source /etc/profile.d/mysql.sh

# 확인
echo $PATH
mysql -u root -p
```

### System daemon 등록

```bash
cp -a /usr/local/mysql/support-files/mysql.server /etc/init.d/mysql
chmod +x /etc/init.d/mysql

systemctl status mysql

systemctl start mysql
systemctl status mysql
systemctl enable mysql
```

## Redmine 6.0.6 설치

### Redmine 다운로드

```bash
cd ~/src/

wget https://www.redmine.org/releases/redmine-6.0.6.tar.gz
tar zxf redmine-6.0.6.tar.gz

sudo mv redmine-6.0.6 /opt/
```

### DB 설정
```bash
mysql -u root -p
```

```sql
/* utf8mb4 : utf8 + 이모지 문자셋 바이트 지원 */
CREATE DATABASE redmine CHARACTER SET utf8mb4;
CREATE USER 'redmine'@'localhost' IDENTIFIED BY 'redmine 전용 패스워드 입력';
GRANT ALL PRIVILEGES ON redmine.* TO 'redmine'@'localhost';

exit;
```

```bash
cd /opt/redmine-6.0.6/config
cp database.yml.example database.yml
```

```yaml
# 주요 변경 사항
...
production:
  adapter: mysql2
  database: redmine
  host: localhost
  username: redmine
  password: "패스워드"
  # Use "utf8" instead of "utfmb4" for MySQL prior to 5.7.7
  encoding: utf8mb4
  variables:
    # Recommended `transaction_isolation` for MySQL to avoid concurrency issues is
    # `READ-COMMITTED`.
    # In case of MySQL lower than 8, the variable name is `tx_isolation`.
    # See https://www.redmine.org/projects/redmine/wiki/MySQL_configuration
    transaction_isolation: "READ-COMMITTED"
```

### Ruby <-> Redmine 호환 버전 설정

```bash
cd /opt/redmine-6.0.6

# 해당 디렉터리에 Ruby3.2.9 버전 인식 설정
echo "3.2.9" > .ruby-version
# 전역 gem과 섞이지 않도록 redmine6 전용 gem 저장소 사용(RVM에서만 적용되는 기능)
echo "redmine6" > .ruby-gemset
```

> gem: Ruby의 패키지 단위.(ex: python에서 pip install xxx)
{: .prompt-info}


### bundle 설치 및 설정
```bash
# Bundler 2.x 버전 설치
gem install bundler -v "~>2"

# bundle install 시 gem을 vendor/bundle 경로에 설치하도록 설정(전역 gem 분리)
bundle config set --local path 'vendor/bundle'

# development, test 그룹은 제외하고 설치하도록 설정
bundle config set --local without 'development test'

# mysql2 gem을 빌드할 때 사용할 MySQL 경로를 지정
bundle config set --local build.mysql2 \ 
  "--with-mysql-dir=/usr/local/mysql \ 
   --with-mysql-include=/usr/local/mysql/include \ 
   --with-mysql-lib=/usr/local/mysql/lib" 
```

> bundler: 해당 프로젝트(디렉터리)에 필요한 gem들을 한번에 관리하고 설치하게 해주는 도구.
{: .prompt-info}

```bash
# Ruby 기반 웹 애플리케이션 서버(WAS) 지정.
vi Gemfile.local

# 추가
gem 'puma'
```

### bundle 설정 기반 gem 설치
```bash
# 해당 디렉터리의 Gemfile, Gemfile.local 기반으로 gem(패키지) 설치
bundle install
```

### 세션/인증용 Secret Token 설정

```bash
bundle exec rake generate_secret_token
```

> rake: **"Ruby Make"**의 약자로, Ruby 언어로 작성된 작업 자동화 도구이자 빌드 시스템.
> 
> 복잡하고 반복적인 작업을 정의하고 실행하는 데 사용되는 Ruby의 유틸리티.
{: .prompt-info}

### Redmine 초기 DB 데이터 생성

```bash
RAILS_ENV=production bundle exec rake db:migrate
RAILS_ENV=production REDMINE_LANG=ko bundle exec rake redmine:load_default_data
```

### Redmine 전용 디렉터리 권한 설정

```bash
mkdir -p tmp tmp/pdf public/assets
chown -R $USER:$USER files log tmp public/assets
chmod -R 755 files log tmp public/assets
```

### Redmine 실행

```bash
bundle exec rails server -e production

# 종료 Crtl + C
```

### Plugin 설치(필수 x)

convert: ImageMagick → 첨부 이미지 썸네일 만들 때 필요
gs: Ghostscript → PDF 미리보기/변환에 필요

```bash
sudo apt install imagemagick ghostscript
```

clipboard copy plugin

```bash
cd /opt/redmine-6.0.6/plugins/

git clone https://github.com/peclik/clipboard_image_paste.git

cd ../
bundle install
bundle exec rake redmine:plugins RAILS_ENV=production
touch tmp/restart.txt
bundle exec rails server -e production
```

<!--![image.png](image%209.png)-->

WYSIWYG Editor plugin

```bash
cd /opt/redmine-6.0.6/plugins/

git clone https://github.com/taqueci/redmine_wysiwyg_editor.git
cd ../
bundle install
bundle exec rake redmine:plugins RAILS_ENV=production
touch tmp/restart.txt
bundle exec rails server -e production
```

<!--![image.png](image%2010.png)-->

### Opale 테마 설치(필수 x)

```bash
cd /opt/redmine-6.0.6/app/assets/themes/

git clone https://github.com/gagnieray/opale.git

cd /opt/redmine-6.0.6/

bundle exec rails server -e production
```

설정 > 표시방식 - 테마 : Opale 선택 후 저장


## 설치간 참조 url
RVM package for Ubuntu: <https://github.com/rvm/ubuntu_rvm>

Redmine Installation Guide: <https://www.redmine.org/projects/redmine/wiki/RedmineInstall>