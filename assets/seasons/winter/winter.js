window.initSeason = function () {
  // 중복 생성 방지
  if (document.getElementById("winter-snow-canvas")) return;

  /* =========================
   *  Canvas Setup
   * ========================= */
  const canvas = document.createElement("canvas");
  canvas.id = "winter-snow-canvas";
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d");

  let width = canvas.width = window.innerWidth;
  let height = canvas.height = window.innerHeight;

  /* =========================
   *  Snow Color (Theme Aware)
   * ========================= */
  function getSnowColor() {
    const theme = window.__seasonTheme || "light";

    return theme === "dark"
      ? "rgba(255, 251, 251, 1)"     // Dark mode
      : "rgba(221, 221, 221, 0.89)"; // Light mode (더 진한 회색)
  }

  let currentSnowColor = getSnowColor();

  // 테마 변경 실시간 반영
  window.addEventListener("season:theme-change", () => {
    currentSnowColor = getSnowColor();
  });

  /* =========================
   *  Snow Parameters (Soft)
   * ========================= */
  const flakes = [];

  const FLAKE_COUNT = 35;   // 은은한 눈
  const MIN_SPEED = 0.2;
  const MAX_SPEED = 0.5;
  const MIN_SIZE = 1.0;
  const MAX_SIZE = 2.5;

  function createFlakes() {
    for (let i = 0; i < FLAKE_COUNT; i++) {
      flakes.push({
        x: Math.random() * width,
        y: Math.random() * height * -1, // 첫눈 효과
        r: Math.random() * (MAX_SIZE - MIN_SIZE) + MIN_SIZE,
        speed: Math.random() * (MAX_SPEED - MIN_SPEED) + MIN_SPEED,
        drift: Math.random() * 0.5 + 0.1
      });
    }
  }

  /* =========================
   *  Resize Handling
   * ========================= */
  window.addEventListener("resize", () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  /* =========================
   *  Draw & Update Loop
   * ========================= */
  let angle = 0;

  function update() {
    angle += 0.002;

    flakes.forEach((f, i) => {
      f.y += f.speed;
      f.x += Math.sin(angle + i) * f.drift;

      if (f.y > height) {
        f.x = Math.random() * width;
        f.y = -10;
      }
    });
  }

  function drawSnow() {
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = currentSnowColor;
    ctx.beginPath();

    flakes.forEach((f) => {
      ctx.moveTo(f.x, f.y);
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
    });

    ctx.fill();
    update();
    requestAnimationFrame(drawSnow);
  }

  /* =========================
   *  Init
   * ========================= */
  createFlakes();
  drawSnow();
};
