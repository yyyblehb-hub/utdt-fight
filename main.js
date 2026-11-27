/* Mobile lock: black screen until the phone is in landscape, then a tap
   goes fullscreen and unlocks into the title screen. Desktop skips the lock. */

const lock = document.getElementById('lock');
const lockTitle = lock.querySelector('.lock-title');
const lockSub = lock.querySelector('.lock-sub');
const menu = document.getElementById('menu');
const playBtn = document.getElementById('play');
const flash = document.getElementById('flash');
const music = document.getElementById('music');
const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');

const COARSE = window.matchMedia('(pointer: coarse)');
const PORTRAIT = window.matchMedia('(orientation: portrait)');
const MOBILE_UA = /Android|iPhone|iPad|iPod|Mobile|Silk|Kindle|PlayBook/i;

let entered = false;
let menuOpen = false;
let started = false;

const isMobile = () => MOBILE_UA.test(navigator.userAgent) || COARSE.matches;

/* ---------- music ---------- */

let musicStarted = false;
let musicArmed = false;

async function startMusic() {
  if (musicStarted) return;
  try {
    await music.play();
    musicStarted = true;
  } catch (err) {
    // Autoplay blocked: start on the player's next tap or key press.
    armMusicOnGesture();
  }
}

function armMusicOnGesture() {
  if (musicArmed) return;
  musicArmed = true;
  window.addEventListener('pointerdown', startMusic, { once: true });
  window.addEventListener('keydown', startMusic, { once: true });
}

/* ---------- title screen ---------- */

function showMenu() {
  if (started || menuOpen) return;
  menuOpen = true;
  menu.hidden = false;

  // Re-trigger the entry animations every time the lock lifts.
  menu.classList.remove('enter');
  flash.classList.remove('run');
  void menu.offsetWidth;
  menu.classList.add('enter');
  flash.classList.add('run');

  // Sound comes in on the flash.
  startMusic();
}

playBtn.addEventListener('click', (event) => {
  event.preventDefault();
  started = true;
  menuOpen = false;
  menu.hidden = true;
  menu.classList.remove('enter');
  resizeCanvas();
});

/* ---------- lock screen ---------- */

function render() {
  if (!isMobile()) {
    lock.hidden = true;
    if (!started) showMenu();
    return;
  }

  const portrait = PORTRAIT.matches;

  // Rotating back to portrait re-locks, so the game can't run squeezed.
  if (portrait) entered = false;

  const show = portrait || !entered;
  lock.hidden = !show;

  if (!show) {
    if (!started) showMenu();
    return;
  }

  lock.classList.toggle('is-portrait', portrait);
  if (portrait) {
    lockTitle.textContent = 'Rotate your phone';
    lockSub.textContent = '';
  } else {
    lockTitle.textContent = 'Tap to start';
    lockSub.textContent = 'Tapping opens fullscreen';
  }
}

async function enterFullscreen() {
  const el = document.documentElement;
  try {
    if (!document.fullscreenElement) {
      if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    }
  } catch (err) {
    // Some browsers refuse fullscreen; the tap still unlocks below.
  }
  try {
    if (screen.orientation && screen.orientation.lock) {
      await screen.orientation.lock('landscape');
    }
  } catch (err) {
    // Orientation lock is unsupported in many browsers; ignore it.
  }
}

lock.addEventListener('click', async (event) => {
  event.preventDefault();
  if (PORTRAIT.matches) return; // rotating is still required
  await enterFullscreen();
  entered = true;
  render();
});

PORTRAIT.addEventListener('change', render);
COARSE.addEventListener('change', render);
window.addEventListener('resize', () => {
  resizeCanvas();
  render();
});

/* ---------- minimal play area ---------- */

let pointer = { x: 0, y: 0 };

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(canvas.clientWidth * dpr);
  canvas.height = Math.round(canvas.clientHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (!pointer.x && !pointer.y) {
    pointer = { x: canvas.clientWidth / 2, y: canvas.clientHeight / 2 };
  }
  draw();
}

function draw() {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  ctx.fillStyle = '#06070a';
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = '#141a22';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= w; x += 40) {
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, h);
  }
  for (let y = 0; y <= h; y += 40) {
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(w, y + 0.5);
  }
  ctx.stroke();

  ctx.fillStyle = '#4de2ff';
  ctx.beginPath();
  ctx.arc(pointer.x, pointer.y, 14, 0, Math.PI * 2);
  ctx.fill();
}

canvas.addEventListener('pointermove', (event) => {
  const rect = canvas.getBoundingClientRect();
  pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  draw();
});

canvas.addEventListener('pointerdown', (event) => {
  const rect = canvas.getBoundingClientRect();
  pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  draw();
});

resizeCanvas();
render();
