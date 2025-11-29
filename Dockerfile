FROM ruby:3.3

EXPOSE 4000
EXPOSE 35729

WORKDIR /usr/src/app

COPY Gemfile Gemfile.lock jekyll-theme-chirpy.gemspec .
RUN bundle install

CMD ["bundle", "exec", "jekyll", "serve", "--host", "0.0.0.0", "--livereload"]

# docker build --no-cache -t github.io .
# docker run -d -v $PWD:/usr/src/app -p 4000:4000 -p 35729:35729 github.io
