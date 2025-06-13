// Grab elements
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");

// Load high score from localStorage
let best = +localStorage.getItem("best") || 0;
bestEl.textContent = best;

// ---- SETTINGS ----
const settingsBtn   = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const vibrateToggle = document.getElementById('vibrateToggle');
const soundToggle   = document.getElementById('soundToggle');
const highToggle    = document.getElementById('highScoreToggle');
const closeSettings = document.getElementById('closeSettings');

// Persist settings in localStorage
const SETTINGS_KEY = 'starSettings';
const defaults = { vibrate:true, sound:true, showHigh:true };
let opts = { ...defaults, ...(JSON.parse(localStorage.getItem(SETTINGS_KEY))||{}) };

[vibrateToggle, soundToggle, highToggle].forEach((el)=>{
  el.checked = opts[el.id.replace('Toggle','')];
  el.addEventListener('change', ()=> {
    opts[el.id.replace('Toggle','')] = el.checked;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(opts));
    if(el===highToggle) document.getElementById('hud').style.display = el.checked? 'block':'none';
  });
});
document.getElementById('hud').style.display = opts.showHigh? 'block':'none';

settingsBtn.onclick   = ()=> settingsModal.hidden=false;
closeSettings.onclick = ()=> settingsModal.hidden=true;
window.addEventListener('keydown', e=>{ if(e.key==='Escape') settingsModal.hidden=true; });

// ---- OPTIONAL SOUND ----
const AudioCtx = window.AudioContext || window.webkitAudioContext;
const audioCtx = AudioCtx ? new AudioCtx() : null;
function playBeep(){
  if(!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 880;
  gain.gain.value = 0.2;
  osc.connect(gain).connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.1);
}

// Resize canvas to fill the window
let starTarget = 20;
function resize() {
  const ratio = window.devicePixelRatio || 1;
  canvas.style.width = window.innerWidth + "px";
  canvas.style.height = window.innerHeight + "px";
  canvas.width = window.innerWidth * ratio;
  canvas.height = window.innerHeight * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

  // Mobile screens get more stars for faster play
  starTarget = window.innerWidth <= 600 ? 40 : 20;
  if (typeof stars !== 'undefined' && stars.length > starTarget) {
    stars = stars.slice(0, starTarget);
  }
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

let stars = Array.from({ length: starTarget }, createStar);
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
      // feedback
      if (opts.sound) playBeep();
      if (opts.vibrate && navigator.vibrate) navigator.vibrate(30);
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
  while (stars.length < starTarget) stars.push(createStar());

  requestAnimationFrame(loop);
}
loop();
