/* =========================
 *  Season Detection
 * ========================= */
function getSeason() {
  const m = new Date().getMonth() + 1;
  if (m === 12 || m <= 2) return "winter";
  if (m >= 3 && m <= 5) return "spring";
  if (m >= 6 && m <= 8) return "summer";
  return "autumn";
}

/* =========================
 *  Asset Loader
 * ========================= */
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

/* =========================
 *  Theme Detection
 * ========================= */
function detectThemeMode() {
  const html = document.documentElement;
  const attr = html.getAttribute("data-mode");

  // 1️⃣ 사용자 강제 설정 우선
  if (attr === "light" || attr === "dark") {
    return attr;
  }

  // 2️⃣ OS 테마
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/* =========================
 *  Global Theme State
 * ========================= */
function emitThemeChange() {
  window.__seasonTheme = detectThemeMode();

  window.dispatchEvent(
    new CustomEvent("season:theme-change", {
      detail: { theme: window.__seasonTheme }
    })
  );
}

/* =========================
 *  Observe data-mode changes
 * ========================= */
const htmlObserver = new MutationObserver((mutations) => {
  for (const m of mutations) {
    if (m.attributeName === "data-mode") {
      emitThemeChange();
    }
  }
});

htmlObserver.observe(document.documentElement, {
  attributes: true,
  attributeFilter: ["data-mode"]
});

/* =========================
 *  OS Theme Change Listener
 * ========================= */
const osThemeQuery = window.matchMedia("(prefers-color-scheme: dark)");
osThemeQuery.addEventListener("change", emitThemeChange);

/* =========================
 *  Season Initializer
 * ========================= */
(function initSeason() {
  /* 계절 판별 */
  const season = getSeason();
  document.documentElement.dataset.season = season;

  /* 초기 테마 감지 */
  emitThemeChange();

  /* data-mode 없으면 자동 반영 (시각적 통일성) */
  if (!document.documentElement.hasAttribute("data-mode")) {
    document.documentElement.setAttribute("data-mode", window.__seasonTheme);
  }

  /* 계절별 CSS */
  loadCSS(`/assets/seasons/${season}/${season}.css`);

  /* 계절별 JS */
  loadJS(`/assets/seasons/${season}/${season}.js`, function () {
    if (window.initSeason) {
      window.initSeason();
    }
  });
})();
