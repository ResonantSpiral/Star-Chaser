const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const bestWrap = document.getElementById("bestWrap");
const timeEl = document.getElementById("time");
const streakEl = document.getElementById("streak");
const bonusEl = document.getElementById("bonus");
const bonusWrap = document.getElementById("bonusWrap");
const startPanel = document.getElementById("startPanel");
const startBtn = document.getElementById("startBtn");
const runSummary = document.getElementById("runSummary");
const modeInputs = Array.from(document.querySelectorAll("[name='gameMode']"));
const settingsBtn = document.getElementById("settingsBtn");
const settingsModal = document.getElementById("settingsModal");
const vibrateToggle = document.getElementById("vibrateToggle");
const soundToggle = document.getElementById("soundToggle");
const highToggle = document.getElementById("highScoreToggle");
const closeSettings = document.getElementById("closeSettings");

const RUN_SECONDS = 45;
const EXTENDED_TIME_CAP = 60;
const HOURGLASS_TIME_BONUS = 5;
const HOURGLASS_DELAY_MIN = 5200;
const HOURGLASS_DELAY_RANGE = 5600;
const SETTINGS_KEY = "starSettings";
const MODE_KEY = "starMode";
const BEST_KEY = "best";
const STAR_SIZE_RANGE = 7;
const MAX_STAR_VALUE = 7;
const modes = {
  classic: "Classic: 45-second run",
  extended: "Extended: catch hourglasses for +5s",
};
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
const savedMode = readStorage(MODE_KEY);
let currentMode = modes[savedMode] ? savedMode : "classic";
let best = loadBest();
let score = 0;
let streak = 0;
let streakBonus = 0;
let timeLeft = RUN_SECONDS;
let playing = false;
let lastFrame = performance.now();
let lastHitAt = 0;
let stars = [];
let bursts = [];
let width = 0;
let height = 0;
let starTarget = 24;
let nextHourglassAt = Infinity;

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

function applyMode() {
  modeInputs.forEach((input) => {
    input.checked = input.value === currentMode;
  });

  if (!playing) {
    runSummary.textContent = modes[currentMode];
  }

  best = loadBest();
  updateHud();
}

function updateHud() {
  scoreEl.textContent = score;
  bestEl.textContent = best;
  timeEl.textContent = Math.ceil(timeLeft);
  streakEl.textContent = streak;
  bonusEl.textContent = `+${streakBonus}`;
}

function bestKey() {
  return currentMode === "classic" ? BEST_KEY : `${BEST_KEY}:${currentMode}`;
}

function loadBest() {
  return Number(readStorage(bestKey())) || 0;
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
  const difficulty = Math.min(
    1,
    Math.max(0, sizeDifficulty * 0.6 + speedDifficulty * 0.4)
  );
  return (
    1 + Math.min(MAX_STAR_VALUE - 1, Math.floor(difficulty * MAX_STAR_VALUE))
  );
}

function createStar(fromBottom = true) {
  const minSize = width <= 600 ? 7 : 6;
  const size = Math.random() * STAR_SIZE_RANGE + minSize;
  const speedBase = reduceMotion ? 0.35 : 0.8;
  const speedRange = reduceMotion ? 0.45 : 1.35;
  const speed = speedBase + Math.random() * speedRange;

  return {
    kind: "star",
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

function createHourglass() {
  const size = Math.random() * 3 + (width <= 600 ? 9 : 8);
  const speedBase = reduceMotion ? 1.15 : 2.25;
  const speed = speedBase + Math.random() * 0.75;

  return {
    kind: "hourglass",
    x: Math.random() * width,
    y: height + size + Math.random() * 50,
    size,
    speed,
    drift: (Math.random() - 0.5) * 0.52,
    phase: Math.random() * Math.PI * 2,
    color: "#fff6a8",
    timeValue: HOURGLASS_TIME_BONUS,
  };
}

function fillStars(fromBottom = true) {
  let starCount = stars.filter((star) => star.kind === "star").length;
  while (starCount < starTarget) {
    stars.push(createStar(fromBottom));
    starCount += 1;
  }
}

function drawStar(star) {
  if (star.kind === "hourglass") {
    drawHourglass(star);
    return;
  }

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

function drawHourglass(item) {
  const pulse = reduceMotion ? 1 : 1 + Math.sin(item.phase) * 0.08;
  const size = item.size * pulse;

  ctx.save();
  ctx.translate(item.x, item.y);
  ctx.rotate(Math.sin(item.phase) * 0.12);
  ctx.shadowColor = item.color;
  ctx.shadowBlur = 18;
  ctx.lineWidth = 2;
  ctx.strokeStyle = item.color;
  ctx.fillStyle = "rgba(255, 246, 168, 0.64)";

  ctx.beginPath();
  ctx.moveTo(-size * 0.62, -size);
  ctx.lineTo(size * 0.62, -size);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(-size * 0.62, size);
  ctx.lineTo(size * 0.62, size);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(-size * 0.7, -size);
  ctx.lineTo(size * 0.7, -size);
  ctx.moveTo(-size * 0.7, size);
  ctx.lineTo(size * 0.7, size);
  ctx.moveTo(-size * 0.5, -size * 0.82);
  ctx.lineTo(size * 0.5, size * 0.82);
  ctx.moveTo(size * 0.5, -size * 0.82);
  ctx.lineTo(-size * 0.5, size * 0.82);
  ctx.stroke();
  ctx.restore();
}

function addBurst(x, y, label, detail, sparkColor) {
  const sparkCount = reduceMotion ? 0 : 10;
  bursts.push({
    x,
    y,
    label,
    detail,
    sparkColor,
    age: 0,
    life: 0.5,
    sparks: Array.from({ length: sparkCount }, () => ({
      angle: Math.random() * Math.PI * 2,
      speed: 35 + Math.random() * 75,
      color: sparkColor || colors[Math.floor(Math.random() * colors.length)],
    })),
  });
}

function addScoreBurst(x, y, points, starValue, bonus) {
  addBurst(
    x,
    y,
    `+${points}`,
    bonus > 0 ? `star ${starValue} + streak ${bonus}` : `star ${starValue}`
  );
}

function addTimeBurst(x, y, seconds) {
  addBurst(x, y, `+${seconds}s`, "hourglass", "#fff6a8");
}

function addStreakLostBurst(x, y) {
  addBurst(x, y, "streak lost", "missed hourglass", "#ff8fc7");
}

function drawBursts(delta) {
  bursts.forEach((burst) => {
    burst.age += delta;
    const t = burst.age / burst.life;
    const alpha = Math.max(0, 1 - t);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = "800 20px Segoe UI, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = burst.sparkColor || "#ffffff";
    ctx.fillText(burst.label, burst.x, burst.y - 28 * t);
    ctx.font = "700 11px Segoe UI, Arial, sans-serif";
    ctx.fillStyle = "#fff6a8";
    ctx.fillText(burst.detail, burst.x, burst.y + 14 - 28 * t);

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
  streakBonus = 0;
  timeLeft = RUN_SECONDS;
  playing = true;
  stars = [];
  bursts = [];
  lastFrame = performance.now();
  scheduleHourglass(lastFrame);
  fillStars(false);
  startPanel.hidden = true;
  updateHud();
}

function finishRun() {
  playing = false;
  nextHourglassAt = Infinity;
  if (score > best) {
    best = score;
    writeStorage(bestKey(), String(best));
  }
  updateHud();
  runSummary.textContent = `${currentModeLabel()}: Score ${score} | Best ${best}`;
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
    if (star.kind === "hourglass") {
      timeLeft = Math.min(EXTENDED_TIME_CAP, timeLeft + star.timeValue);
      lastHitAt = performance.now();
      addTimeBurst(star.x, star.y, star.timeValue);
      playBeep(8);
      if (settings.vibrate && navigator.vibrate) navigator.vibrate([18, 25, 18]);
      updateHud();
      return false;
    }

    streak += 1;
    const nextBonus = Math.floor(streak / 5);
    const bonusIncreased = nextBonus > streakBonus;
    streakBonus = nextBonus;
    const points = star.value + streakBonus;
    score += points;
    lastHitAt = performance.now();
    addScoreBurst(star.x, star.y, points, star.value, streakBonus);
    playBeep(points);
    if (settings.vibrate && navigator.vibrate) navigator.vibrate(25);
    if (bonusIncreased && !reduceMotion) {
      bonusWrap.classList.remove("pulse");
      window.requestAnimationFrame(() => bonusWrap.classList.add("pulse"));
    }
    updateHud();
    return false;
  });

  if (!hit) {
    streak = 0;
    streakBonus = 0;
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

function currentModeLabel() {
  return currentMode.charAt(0).toUpperCase() + currentMode.slice(1);
}

function scheduleHourglass(now) {
  nextHourglassAt =
    currentMode === "extended"
      ? now + HOURGLASS_DELAY_MIN + Math.random() * HOURGLASS_DELAY_RANGE
      : Infinity;
}

function maybeSpawnHourglass(now) {
  if (currentMode !== "extended" || !playing || now < nextHourglassAt) return;
  if (!stars.some((star) => star.kind === "hourglass")) {
    stars.push(createHourglass());
  }
  scheduleHourglass(now);
}

function resetStreakForMissedHourglass(x, y) {
  if (streak === 0 && streakBonus === 0) return;

  streak = 0;
  streakBonus = 0;
  addStreakLostBurst(x, y);
  updateHud();
}

function updateStars(delta, now) {
  maybeSpawnHourglass(now);

  stars.forEach((star) => {
    let speedBoost = 0.42;
    if (star.kind === "hourglass") {
      speedBoost = 1;
    } else if (playing) {
      speedBoost = 1 + Math.min(score / 120, 0.7);
    }

    star.y -= star.speed * speedBoost * delta * 60;
    star.x += Math.sin(star.phase) * star.drift * delta * 60;
    star.phase += delta * (reduceMotion ? 1.2 : 2.4);
  });

  stars = stars.filter((star) => {
    const visible = star.y + star.size > 0;
    if (!visible && playing && star.kind === "hourglass") {
      resetStreakForMissedHourglass(star.x, Math.max(70, star.size * 2));
    }
    return visible;
  });
  fillStars(true);
}

function loop(now) {
  const delta = Math.min((now - lastFrame) / 1000, 0.05);
  lastFrame = now;

  ctx.clearRect(0, 0, width, height);
  updateStars(delta, now);

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

modeInputs.forEach((input) => {
  input.addEventListener("change", () => {
    if (!input.checked) return;

    currentMode = modes[input.value] ? input.value : "classic";
    writeStorage(MODE_KEY, currentMode);
    applyMode();
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
applyMode();
resize();
fillStars(false);
updateHud();
loop(performance.now());
