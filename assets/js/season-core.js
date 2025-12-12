function getSeason() {
  const m = new Date().getMonth() + 1;
  if (m === 12 || m <= 2) return "winter";
  if (m >= 3 && m <= 5) return "spring";
  if (m >= 6 && m <= 8) return "summer";
  return "autumn";
}

function loadCSS(href) {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}

function loadJS(src, callback) {
  const script = document.createElement("script");
  script.src = src;
  script.onload = callback;
  document.body.appendChild(script);
}

(function initSeason() {
  const season = getSeason();

  // <html data-season="winter"> 적용
  document.documentElement.dataset.season = season;

  // CSS 로드
  loadCSS(`/assets/seasons/${season}/${season}.css`);

  // JS 로드 (동기 방식)
  loadJS(`/assets/seasons/${season}/${season}.js`, function () {
    if (window.initSeason) {
      window.initSeason();
    }
  });
})();
