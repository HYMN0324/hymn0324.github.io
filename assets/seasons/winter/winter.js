window.initSeason = function () {
  if (document.getElementById("winter-snow-canvas")) return;

  const canvas = document.createElement("canvas");
  canvas.id = "winter-snow-canvas";
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d");

  let width = canvas.width = window.innerWidth;
  let height = canvas.height = window.innerHeight;

  /* 테마 판별 */
  const theme = window.__seasonTheme || "light";
  const snowColor =
    theme === "dark"
      ? "rgba(235, 235, 235, 1)"  // dark 모드용 soft white
      : "rgba(162, 162, 162, 0.77)";  // light 모드용 pure white

  /* 눈 파라미터 */
  const flakes = [];
  const FLAKE_COUNT = 35;
  const MIN_SPEED = 0.2;
  const MAX_SPEED = 0.5;
  const MIN_SIZE = 1.0;
  const MAX_SIZE = 2.5;

  function createFlakes() {
    for (let i = 0; i < FLAKE_COUNT; i++) {
      flakes.push({
        x: Math.random() * width,
        y: Math.random() * height * -1, // 첫눈 효과: 화면 위에서 시작
        r: Math.random() * (MAX_SIZE - MIN_SIZE) + MIN_SIZE,
        speed: Math.random() * (MAX_SPEED - MIN_SPEED) + MIN_SPEED,
        drift: Math.random() * 0.5 + 0.1,
      });
    }
  }

  window.addEventListener("resize", () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  function drawSnow() {
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = snowColor;
    ctx.beginPath();

    flakes.forEach((f) => {
      ctx.moveTo(f.x, f.y);
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
    });

    ctx.fill();
    update();
    requestAnimationFrame(drawSnow);
  }

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

  createFlakes();
  drawSnow();
};
