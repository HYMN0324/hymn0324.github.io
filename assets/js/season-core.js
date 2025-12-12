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

function detectThemeMode() {
  const html = document.documentElement;
  const attr = html.getAttribute("data-mode");

  if (attr === "light" || attr === "dark") {
    return attr; // 사용자 설정 우선
  }

  // OS 설정
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
}

/* 
  ----------- 여기서부터 변경된 핵심 부분 -----------
*/
(function initSeason() {
  const season = getSeason();

  // 계절 적용
  document.documentElement.dataset.season = season;

  // 테마 감지 (light / dark)
  const theme = detectThemeMode();

  // <html> 에 data-mode 가 없으면 자동으로 추가
  if (!document.documentElement.hasAttribute("data-mode")) {
    document.documentElement.setAttribute("data-mode", theme);
  }

  // winter.js 에 전달할 글로벌 변수 설정
  window.__seasonTheme = theme;

  // CSS 로드
  loadCSS(`/assets/seasons/${season}/${season}.css`);

  // JS 로드
  loadJS(`/assets/seasons/${season}/${season}.js`, function () {
    if (window.initSeason) {
      window.initSeason();
    }
  });
})();
