const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const bestWrap = document.getElementById("bestWrap");
const timeEl = document.getElementById("time");
const streakEl = document.getElementById("streak");
const startPanel = document.getElementById("startPanel");
const startBtn = document.getElementById("startBtn");
const runSummary = document.getElementById("runSummary");
const settingsBtn = document.getElementById("settingsBtn");
const settingsModal = document.getElementById("settingsModal");
const vibrateToggle = document.getElementById("vibrateToggle");
const soundToggle = document.getElementById("soundToggle");
const highToggle = document.getElementById("highScoreToggle");
const closeSettings = document.getElementById("closeSettings");

const RUN_SECONDS = 45;
const SETTINGS_KEY = "starSettings";
const BEST_KEY = "best";
const STAR_SIZE_RANGE = 7;
const defaults = { vibrate: true, sound: true, showHigh: true };
const settingKeys = new Map([
  [vibrateToggle, "vibrate"],
  [soundToggle, "sound"],
  [highToggle, "showHigh"],
]);
const colors = ["#fff06d", "#80f7ff", "#ff8fc7", "#b7ff88", "#ffc066"];
const reduceMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;

let settings = { ...defaults, ...readSettings() };
let best = Number(readStorage(BEST_KEY)) || 0;
let score = 0;
let streak = 0;
let timeLeft = RUN_SECONDS;
let playing = false;
let lastFrame = performance.now();
let lastHitAt = 0;
let stars = [];
let bursts = [];
let width = 0;
let height = 0;
let starTarget = 24;

const AudioCtx = window.AudioContext || window.webkitAudioContext;
const audioCtx = AudioCtx ? new AudioCtx() : null;

function readStorage(key) {
  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    return null;
  }
}

function writeStorage(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
    // Storage can be unavailable in strict privacy modes; the game still runs.
  }
}

function readSettings() {
  const raw = readStorage(SETTINGS_KEY);
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    writeStorage(SETTINGS_KEY, JSON.stringify(defaults));
    return {};
  }
}

function saveSettings() {
  writeStorage(SETTINGS_KEY, JSON.stringify(settings));
}

function applySettings() {
  settingKeys.forEach((key, toggle) => {
    toggle.checked = Boolean(settings[key]);
  });
  bestWrap.hidden = !settings.showHigh;
}

function updateHud() {
  scoreEl.textContent = score;
  bestEl.textContent = best;
  timeEl.textContent = Math.ceil(timeLeft);
  streakEl.textContent = streak;
}

function resize() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  width = Math.max(1, window.innerWidth);
  height = Math.max(1, window.innerHeight);
  canvas.width = Math.floor(width * ratio);
  canvas.height = Math.floor(height * ratio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

  starTarget = width <= 600 ? 34 : 24;
  stars = stars.map((star) => ({
    ...star,
    x: Math.min(width - star.size, star.x),
    y: Math.min(height + star.size, star.y),
  }));
}

function scoreStar(size, speed, minSize, speedBase, speedRange) {
  const sizeDifficulty = 1 - (size - minSize) / STAR_SIZE_RANGE;
  const speedDifficulty = (speed - speedBase) / speedRange;
  const weightedDifficulty = sizeDifficulty * 0.55 + speedDifficulty * 0.45;
  return 1 + Math.min(4, Math.max(0, Math.floor(weightedDifficulty * 5)));
}

function createStar(fromBottom = true) {
  const minSize = width <= 600 ? 7 : 6;
  const size = Math.random() * STAR_SIZE_RANGE + minSize;
  const speedBase = reduceMotion ? 0.35 : 0.8;
  const speedRange = reduceMotion ? 0.45 : 1.35;
  const speed = speedBase + Math.random() * speedRange;

  return {
    x: Math.random() * width,
    y: fromBottom
      ? height + size + Math.random() * 80
      : Math.random() * height,
    size,
    speed,
    drift: (Math.random() - 0.5) * 0.28,
    phase: Math.random() * Math.PI * 2,
    color: colors[Math.floor(Math.random() * colors.length)],
    value: scoreStar(size, speed, minSize, speedBase, speedRange),
  };
}

function fillStars(fromBottom = true) {
  while (stars.length < starTarget) {
    stars.push(createStar(fromBottom));
  }
}

function drawStar(star) {
  const pulse = reduceMotion ? 1 : 1 + Math.sin(star.phase) * 0.12;
  const outer = star.size * pulse;
  const inner = outer * 0.46;

  ctx.save();
  ctx.translate(star.x, star.y);
  ctx.rotate(star.phase * 0.24);
  ctx.shadowColor = star.color;
  ctx.shadowBlur = 8 + star.value * 3;
  ctx.fillStyle = star.color;
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function addBurst(x, y, points) {
  const sparkCount = reduceMotion ? 0 : 10;
  bursts.push({
    x,
    y,
    points,
    age: 0,
    life: 0.5,
    sparks: Array.from({ length: sparkCount }, () => ({
      angle: Math.random() * Math.PI * 2,
      speed: 35 + Math.random() * 75,
      color: colors[Math.floor(Math.random() * colors.length)],
    })),
  });
}

function drawBursts(delta) {
  bursts.forEach((burst) => {
    burst.age += delta;
    const t = burst.age / burst.life;
    const alpha = Math.max(0, 1 - t);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = "800 18px Segoe UI, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(`+${burst.points}`, burst.x, burst.y - 28 * t);

    burst.sparks.forEach((spark) => {
      const distance = spark.speed * burst.age;
      ctx.beginPath();
      ctx.fillStyle = spark.color;
      ctx.arc(
        burst.x + Math.cos(spark.angle) * distance,
        burst.y + Math.sin(spark.angle) * distance,
        2.2,
        0,
        Math.PI * 2
      );
      ctx.fill();
    });
    ctx.restore();
  });

  bursts = bursts.filter((burst) => burst.age < burst.life);
}

function playBeep(points) {
  if (!settings.sound || !audioCtx) return;

  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }

  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "sine";
  osc.frequency.value = 640 + Math.min(points, 8) * 70;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.18, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.14);
}

function startRun() {
  score = 0;
  streak = 0;
  timeLeft = RUN_SECONDS;
  playing = true;
  stars = [];
  bursts = [];
  lastFrame = performance.now();
  fillStars(false);
  startPanel.hidden = true;
  updateHud();
}

function finishRun() {
  playing = false;
  if (score > best) {
    best = score;
    writeStorage(BEST_KEY, String(best));
  }
  updateHud();
  runSummary.textContent = `Score ${score} | Best ${best}`;
  startBtn.textContent = "Play Again";
  startPanel.hidden = false;
  startBtn.focus({ preventScroll: true });
}

function hitStar(pointerX, pointerY) {
  let hit = false;

  stars = stars.filter((star) => {
    const radius = Math.max(18, star.size * 1.8);
    const distance = Math.hypot(star.x - pointerX, star.y - pointerY);
    if (distance > radius || hit) return true;

    hit = true;
    streak += 1;
    const points = star.value + Math.floor(streak / 5);
    score += points;
    lastHitAt = performance.now();
    addBurst(star.x, star.y, points);
    playBeep(points);
    if (settings.vibrate && navigator.vibrate) navigator.vibrate(25);
    updateHud();
    return false;
  });

  if (!hit) {
    streak = 0;
    updateHud();
  }
}

function handlePointer(event) {
  if (!playing || !settingsModal.hidden) return;

  const now = performance.now();
  if (now - lastHitAt < 45) return;

  const rect = canvas.getBoundingClientRect();
  const pointerX = ((event.clientX - rect.left) / rect.width) * width;
  const pointerY = ((event.clientY - rect.top) / rect.height) * height;
  hitStar(pointerX, pointerY);
}

function updateStars(delta) {
  stars.forEach((star) => {
    const speedBoost = playing ? 1 + Math.min(score / 120, 0.7) : 0.42;
    star.y -= star.speed * speedBoost * delta * 60;
    star.x += Math.sin(star.phase) * star.drift * delta * 60;
    star.phase += delta * (reduceMotion ? 1.2 : 2.4);
  });

  stars = stars.filter((star) => star.y + star.size > 0);
  fillStars(true);
}

function loop(now) {
  const delta = Math.min((now - lastFrame) / 1000, 0.05);
  lastFrame = now;

  ctx.clearRect(0, 0, width, height);
  updateStars(delta);

  stars.forEach(drawStar);
  drawBursts(delta);

  if (playing) {
    timeLeft = Math.max(0, timeLeft - delta);
    timeEl.textContent = Math.ceil(timeLeft);
    if (timeLeft <= 0) finishRun();
  }

  requestAnimationFrame(loop);
}

settingKeys.forEach((key, toggle) => {
  toggle.addEventListener("change", () => {
    settings[key] = toggle.checked;
    saveSettings();
    applySettings();
  });
});

settingsBtn.addEventListener("click", () => {
  settingsModal.hidden = false;
  closeSettings.focus({ preventScroll: true });
});

closeSettings.addEventListener("click", () => {
  settingsModal.hidden = true;
  settingsBtn.focus({ preventScroll: true });
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") settingsModal.hidden = true;

  const canStartFromKey =
    !playing &&
    settingsModal.hidden &&
    (event.target === document.body || event.target === startBtn);

  if ((event.key === "Enter" || event.key === " ") && canStartFromKey) {
    event.preventDefault();
    startRun();
  }
});

startBtn.addEventListener("click", startRun);
canvas.addEventListener("pointerdown", handlePointer, { passive: true });
window.addEventListener("resize", resize);

applySettings();
resize();
fillStars(false);
updateHud();
loop(performance.now());
