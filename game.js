// Grab elements
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");

// Load high score from localStorage
let best = +localStorage.getItem("best") || 0;
bestEl.textContent = best;

// Simple click sound using Web Audio API
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playPing() {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "sine";
  osc.frequency.value = 880; // A5 tone
  gain.gain.value = 0.2;
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.1);
}

// Resize canvas to fill the window
function resize() {
  const ratio = window.devicePixelRatio || 1;
  canvas.style.width = window.innerWidth + "px";
  canvas.style.height = window.innerHeight + "px";
  canvas.width = window.innerWidth * ratio;
  canvas.height = window.innerHeight * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
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
let lastClick = 0;

// Click detection
canvas.addEventListener("pointerdown", (e) => {
  const now = performance.now();
  if (now - lastClick < 50) return;
  lastClick = now;
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  stars = stars.filter((s) => {
    const hit = Math.hypot(s.x - mx, s.y - my) < s.size * 1.3;
    if (hit) {
      score++;
      scoreEl.textContent = score;
      if (score > best) {
        best = score;
        localStorage.setItem("best", best);
        bestEl.textContent = best;
      }
      playPing();
    }
    return !hit;
  });
}, { passive: true });

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
