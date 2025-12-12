window.initSeason = function () {
  const existing = document.getElementById("winter-snow-canvas");
  if (existing) return;

  const canvas = document.createElement("canvas");
  canvas.id = "winter-snow-canvas";
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d");

  let width = canvas.width = window.innerWidth;
  let height = canvas.height = window.innerHeight;

  const flakes = [];

  /* ❄️ 잔잔한 눈 효과를 위한 설정 */
  const FLAKE_COUNT = 90;   // 더 적게
  const MIN_SPEED = 0.3;    // 속도 ↓
  const MAX_SPEED = 1.0;  
  const MIN_SIZE = 1.0;     // 눈 크기 ↓
  const MAX_SIZE = 2.5;

  /** 첫눈처럼 보이게: 화면 위(-height) ~ 0에서만 생성 */
  function createFlakes() {
    for (let i = 0; i < FLAKE_COUNT; i++) {
      flakes.push({
        x: Math.random() * width,
        y: Math.random() * height * -1,  // 🔥 화면 위에서만 시작
        r: Math.random() * (MAX_SIZE - MIN_SIZE) + MIN_SIZE,
        speed: Math.random() * (MAX_SPEED - MIN_SPEED) + MIN_SPEED,
        drift: Math.random() * 0.5 + 0.1,  // 좌우 흔들림 약하게
      });
    }
  }

  window.addEventListener("resize", () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  function drawSnow() {
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
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
    angle += 0.002; // 자연스러운 바람 효과

    flakes.forEach((f, i) => {
      f.y += f.speed;
      f.x += Math.sin(angle + i) * f.drift;

      // 화면 아래로 벗어나면 화면 위에서 다시 떨어짐
      if (f.y > height) {
        f.x = Math.random() * width;
        f.y = -10;
      }
    });
  }

  createFlakes();
  drawSnow();
};
