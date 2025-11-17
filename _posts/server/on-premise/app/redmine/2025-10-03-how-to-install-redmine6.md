---
title: Redmine6 설치
date: 2025-09-16
categories: [server, on-premise]
tags: [redmine, rvm, ruby, nginx]
description: Redmine6 설치 post
permalink: how-to-install-redmine6
---

#### 요약

프로그램 기동 방법

```bash
# nginx
sudo systemctl start nginx
sudo systemctl stop nginx
sudo systemctl restart nginx

# redmine
sudo systemctl start redmine
sudo systemctl stop redmine
sudo systemctl restart redmine

# mysql
sudo systemctl start mysql
sudo systemctl stop mysql
sudo systemctl restart mysql
```

```bash
# web log 경로
/var/log/nginx/도메인/
```

---

#### 설치 SOP

https://www.redmine.org/projects/redmine/wiki/RedmineInstall

<!--![image.png](image.png)-->

#### 초기 OS 설정

```bash
# hostname 설정
sudo hostnamectl set-hostname toc

# 한국시간 설정(/etc/localtime 파일 업데이트 됨)
sudo timedatectl set-timezone Asia/Seoul
timedatectl

# 레드마인에서 /etc/localtime과 시간 설정 충돌 나지 않게 한국시간 설정
vi /etc/timezone
# 기존내용 삭제
Asia/Seoul
```

#### RVM 설치

추후 레드마인 업데이트를 고려해 Ruby version manager 설치

https://github.com/rvm/ubuntu_rvm

#### 의존 패키지 설치

```bash
sudo apt install software-properties-common
```

#### **PPA 추가 및 rvm 패키지 설치**

```bash
sudo apt-add-repository -y ppa:rael-gc/rvm
sudo apt update
sudo apt install rvm
```

#### rvm 명령어 hosting 계정 권한 부여

```bash
sudo usermod -a -G rvm hosting
```

#### rvm 명령어 환경변수 설정

```bash
sudo echo 'source "/etc/profile.d/rvm.sh"' >> ~/.bashrc
```

#### 현재 접속 쉘 rvm 명령어 활성화

```bash
source ~/.bashrc

rvm -v
```

#### Ruby 3.2.9 설치

```bash
rvm install ruby-3.2.9

ruby -v
```

#### MySQL 8.0.43 설치

#### 의존 패키지 설치

```bash
sudo apt install build-essential gcc-10 g++-10 pkg-config \ 
cmake libperl-dev libncurses-dev bison \ 
libtirpc-dev libudev-dev rpcsvc-proto libicu-dev libssl-dev
```

#### 다운로드 및 설치

```bash
mkdir /home/hosting/src
cd /home/hosting/src

wget https://cdn.mysql.com//Downloads/MySQL-8.0/mysql-boost-8.0.43.tar.gz

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

#### MySQL 권한 설정

```bash
sudo groupadd mysql
sudo useradd -r -g mysql -s /bin/false mysql
sudo mkdir /data/mysql/data
sudo chown -R mysql:mysql /data/mysql/data
sudo chmod 700 /data/mysql/data
```

```bash
cd /data/mysql/
bin/mysqld --initialize --user=mysql
# 임시 패스워드 확인
```

![image.png](image%201.png)

```bash
bin/mysqld_safe &
bin/mysql -u root -p
Enter password:임시 패스워드 입력
```

```sql
# 패스워드 변경
> ALTER USER 'root'@'localhost' IDENTIFIED BY '변경 할 패스워드';

# root 계정 상세보기
> SHOW GRANTS FOR 'root'@'localhost';
... | GRANT PROXY ON ``@`` TO `root`@`localhost` WITH GRANT OPTION

> quit;
```

```bash
# 변경한 패스워드 접속 확인
bin/mysql -u root -p

> quit;
```

```bash
ps -ef | grep mysql
kill -9 해당 PID
ps -ef | grep mysql
```

#### 환경변수 등록

```bash
sudo vi /etc/profile.d/mysql.sh
```

```bash
export MYSQL_HOME=/data/mysql
export PATH=$PATH:$MYSQL_HOME/bin
```

```bash
source /etc/profile.d/mysql.sh

echo $PATH

mysql -u root -p
```

#### Redmine 6.0.6 설치

#### Redmine 다운로드

```bash
cd /home/hosting/src/

wget https://www.redmine.org/releases/redmine-6.0.6.tar.gz
tar zxf redmine-6.0.6.tar.gz

sudo mv redmine-6.0.6 /data/
```

#### DB 설정

```bash
/data/mysql/bin/mysql -u root -p
```

```sql
# utf8mb4 -> utf8 + 이모지 문자셋 지원
> CREATE DATABASE redmine CHARACTER SET utf8mb4;
> CREATE USER 'redmine'@'localhost' IDENTIFIED BY '패스워드';
> GRANT ALL PRIVILEGES ON redmine.* TO 'redmine'@'localhost';

> exit;
```

```bash
cd /data/redmine-6.0.6/config
cp database.yml.example database.yml
```

```yaml
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

#### Gem 의존성 설치 및 환경 설정

<aside>
💡

gem: Ruby의 패키지 단위.(ex: python에서 pip install xxx)

bundler: 해당 프로젝트(디렉터리)에 필요한 gem들을 한번에 관리하고 설치하게 해주는 도구.

</aside>

```bash
cd /data/redmine-6.0.6

# 해당 디렉터리에만 Ruby3.2.9 버전 인식 설정
echo "3.2.9" > .ruby-version
# 전역 gem과 섞이지 않도록 redmine6 전용 gem 저장소 사용
# (RVM에서만 적용되는 기능)
echo "redmine6" > .ruby-gemset

# Bundler 2.x 버전 설치
gem install bundler -v "~>2"

# bundle install 시 gem을 vendor/bundle 경로에 설치하도록 설정(전역과 분리)
bundle config set --local path 'vendor/bundle'

# development, test 그룹은 제외하고 설치하도록 설정
bundle config set --local without 'development test'

# mysql2 gem을 빌드할 때 사용할 MySQL 경로를 지정
bundle config set --local build.mysql2 \
  "--with-mysql-dir=/data/mysql \
   --with-mysql-include=/data/mysql/include \
   --with-mysql-lib=/data/mysql/lib"
```

```bash
# Ruby on Rails 웹 애플리케이션 gem 설치 대상 지정
vi Gemfile.local
# 추가
gem 'puma'
```

```bash
# 해당 디렉터리의 Gemfile, Gemfile.local 기반으로 gem(패키지) 설치
bundle install
```

#### 세션/인증용 Secret Token 설정

```bash
# Redmine 세션/인증 보안을 위한 secret_token 생성
# (bundle exec: Gemfile 환경의 rake 실행)
bundle exec rake generate_secret_token
```

#### DB 스키마 및 초기 데이터 생성

```bash
RAILS_ENV=production bundle exec rake db:migrate

RAILS_ENV=production REDMINE_LANG=ko bundle exec rake redmine:load_default_data
```

#### Redmine 전용 디렉터리 권한 설정

```bash
mkdir -p tmp tmp/pdf public/assets
chown -R hosting:hosting files log tmp public/assets
chmod -R 755 files log tmp public/assets
```

#### Redmine 실행 확인

```bash
bundle exec rails server -e production
```

![image.png](image%202.png)

#### 메일 연동

```bash
# ctrl + c로 레드마인 종료

cd /data/redmine-6.0.6/config
cp configuration.yml.example configuration.yml

vi configuration.yml
```

```bash
...
# ==== SMTP server at example.com using PLAIN authentication
  #
  #  email_delivery:
     delivery_method: :smtp
     smtp_settings:
       address: "webmail.moncat.co.kr"
       port: 25
       authentication: :plain
       domain: 'webmail.moncat.co.kr'
       user_name: 'redmine@moncat.co.kr'
       password: '1Redmine(!'
```

```bash
bundle exec rails server -e production
```

#### 관리자 계정 패스워드 변경

![image.png](image%203.png)

![초기 관리자 계정 : admin / admin](image%204.png)

초기 관리자 계정 : admin / admin

![image.png](image%205.png)

메일 변경

![image.png](image%206.png)

![image.png](image%207.png)

![image.png](image%208.png)

#### Plugin 설치

convert: ImageMagick → 첨부 이미지 썸네일 만들 때 필요
gs: Ghostscript → PDF 미리보기/변환에 필요

```bash
sudo apt install imagemagick ghostscript
```

clipboard copy plugin

```bash
cd /data/redmine-6.0.6/plugins/

git clone https://github.com/peclik/clipboard_image_paste.git

cd ../
bundle install
bundle exec rake redmine:plugins RAILS_ENV=production
touch tmp/restart.txt
bundle exec rails server -e production
```

![image.png](image%209.png)

WYSIWYG Editor plugin

```bash
cd /data/redmine-6.0.6/plugins/

git clone https://github.com/taqueci/redmine_wysiwyg_editor.git
cd ../
bundle install
bundle exec rake redmine:plugins RAILS_ENV=production
touch tmp/restart.txt
bundle exec rails server -e production
```

![image.png](image%2010.png)

#### Opale 테마 설치

```bash
cd /data/redmine-6.0.6/app/assets/themes/

git clone https://github.com/gagnieray/opale.git

cd /data/redmine-6.0.6/

bundle exec rails server -e production
```

설정 > 표시방식 - 테마 : Opale 선택 후 저장

![image.png](image%2011.png)

#### 기타

레드마인 설정의 SCM 선택 옵션이 있어 해당 명령어 필요하여 설치

```bash
sudo apt install subversion mercurial cvs bzr
```

#### Nginx 1.28.0 설치

#### 의존 패키지 설치

```bash
sudo apt install libpcre3-dev zlib1g-dev libssl-dev

```

#### 의존 라이브러리 소스 설치

```bash
# pcre2
cd /home/hosting/src/
wget github.com/PCRE2Project/pcre2/releases/download/pcre2-10.43/pcre2-10.43.tar.gz
tar zxf pcre2-10.43.tar.gz
cd pcre2-10.43/
./configure
make -j$(nproc)
sudo make install

# zlib
cd /home/hosting/src/
wget http://zlib.net/zlib-1.3.1.tar.gz
tar zxf zlib-1.3.1.tar.gz
cd zlib-1.3.1/
./configure
make -j$(nproc)
sudo make install
```

#### 다운로드 및 설치

```bash
cd /home/hosting/src/

wget https://nginx.org/download/nginx-1.28.0.tar.gz
tar zxf nginx-1.28.0.tar.gz

cd nginx-1.28.0
```

```bash
./configure \
--prefix=/data/nginx \
--with-pcre=../pcre2-10.43 \
--with-zlib=../zlib-1.3.1 \
--with-http_ssl_module \
--with-stream \
--with-mail=dynamic
```

```bash
make -j$(nproc)
sudo make install
```

#### Redmine 연동

```bash
sudo vi /data/nginx/conf/nginx.conf
```

```bash
http {
    ...
    server {
        location / {
            ...
            proxy_pass http://127.0.0.1:3000;
        }
    }
```

```bash
# nginx 시작 및 테스트
sudo /data/nginx/sbin/nginx -t
sudo /data/nginx/sbin/nginx

ps -ef | grep nginx

cd /data/redmine-6.0.6
bundle exec rails server -e production

# 접속 확인
```

#### 도메인 연동

- named 서버
    
    ```bash
    cd /var/named/chroot/var/named/customer01/
    
    cp youhost.co.kr youhost.co.kr_20250917
    
    vi youhost.co.kr
    ```
    
    ```bash
    # serial 수정
    @               IN      SOA     ns5.youhost.co.kr. dnsmaster.youhost.co.kr. (
                                    2025091703      ; serial
    # toc 레코드 추가
    ...
    toc             IN      A       192.168.100.22
    ```
    
    ```bash
    rndc reload youhost.co.kr
    
    nslookup xxx.com
    ```
    
- 레드마인 서버
    
    ```bash
    sudo vi /data/nginx/conf/nginx.conf
    ```
    
    ```bash
    http {
        ...
        server {
            listen       80;
            server_name  localhost xxx.com;
        }
    ```
    
    ```bash
    sudo /data/nginx/sbin/nginx -t
    sudo /data/nginx/sbin/nginx -s reload
    
    ps -ef | grep nginx
    
    cd /data/redmine-6.0.6
    bundle exec rails server -e production
    ```
    

#### 환경변수 등록

```bash
sudo vi /etc/profile.d/nginx.sh
```

```bash
export NGINX_HOME=/data/nginx
export PATH=$PATH:$NGINX_HOME/sbin
```

```bash
source /etc/profile.d/nginx.sh

echo $PATH

nginx -v
```

#### 시스템 데몬 등록

```bash
Redmine, MySQL, Nginx 프로세스 kill 후 진행
```

#### MySQL 데몬 등록

```bash
cp -arp /data/mysql/support-files/mysql.server /etc/init.d/mysql
chmod +x /etc/init.d/mysql

systemctl status mysql

systemctl enable mysql
systemctl start mysql
systemctl status mysql
```

#### Nginx 데몬 등록

```bash
sudo vi /etc/systemd/system/nginx.service
```

```bash
[Unit]
Description=Nginx 1.28
After=network.target
Wants=network.target

[Service]
Type=forking
PIDFile=/data/nginx/logs/nginx.pid
ExecStart=/data/nginx/sbin/nginx
ExecReload=/data/nginx/sbin/nginx -s reload
ExecStop=/data/nginx/sbin/nginx -s quit

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now nginx.service
****sudo systemctl status nginx
```

#### Redmine 데몬 등록

```bash
sudo vi /etc/systemd/system/redmine.service
```

```bash
[Unit]
Description=Redmine-6.0.6
After=network.target mysql.service
Requires=mysql.service
Wants=network.target

[Service]
Type=simple
User=hosting
WorkingDirectory=/data/redmine-6.0.6
# 3000번 포트로 redmine 접속 못하게 -b 127.0.0.1 옵션 추가
ExecStart=/bin/bash -lc '/usr/share/rvm/rubies/ruby-3.2.9/bin/bundle exec rails server -b 127.0.0.1 -e production'
ExecStop=/bin/bash -lc 'pkill -f "rails server -b 127.0.0.1 -e production"'
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

⚠ 실행 전 DB 구동이 먼저 필요하여 
After=mysql.service, Requires=mysql.service 추가

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now redmine.service
****sudo systemctl status redmine

# 의존목록에 mysql 확인
sudo systemctl list-dependencies redmine
```

![image.png](image%2012.png)

```bash
# 재부팅시 정상 서비스 되는지 확인
# (mysql, redmine 구동 시간에 따라 20초 정도 소요)
sudo reboot now
```

[nginx config 최종 버전 백업](<https://xxx.com/attachments/2348>)