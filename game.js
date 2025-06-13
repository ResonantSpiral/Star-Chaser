// Grab elements
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");

// Resize canvas to fill the window
function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

// Star object factory
function createStar() {
  const size = Math.random() * 4 + 2;                   // 2–6 px
  return {
    x: Math.random() * canvas.width,
    y: canvas.height + size,
    size,
    speed: Math.random() * 1.5 + 0.5                    // 0.5–2 px/frame
  };
}

let stars = Array.from({ length: 20 }, createStar);
let score = 0;

// Click detection
canvas.addEventListener("pointerdown", (e) => {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  stars = stars.filter((s) => {
    const hit = Math.hypot(s.x - mx, s.y - my) < s.size * 1.3;
    if (hit) {
      score++;
      scoreEl.textContent = score;
    }
    return !hit;
  });
});

// Main loop
function loop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw & update stars
  stars.forEach((s) => {
    s.y -= s.speed;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    ctx.fillStyle = "#ffef8b";
    ctx.fill();
  });

  // Remove off-screen, add new
  stars = stars.filter((s) => s.y + s.size > 0);
  while (stars.length < 20) stars.push(createStar());

  requestAnimationFrame(loop);
}
loop();
