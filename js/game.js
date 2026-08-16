/**
 * Ember Dash — canvas side-scroller
 * Ember fox · gold signal orbs · static wisps
 */

import {
  unlockAudio,
  setMusicOn,
  setSfxOn,
  isMusicOn,
  isSfxOn,
  getAudioState,
  setIntensity,
  sfxJump,
  sfxDoubleJump,
  sfxCoin,
  sfxStomp,
  sfxHit,
  sfxDie,
  sfxLand,
  sfxDash,
  sfxDashReady,
} from "./audio.js?v=20260806-no-drone-1";
import {
  initNative,
  hapticLight,
  hapticMedium,
  hapticHeavy,
  hapticSuccess,
  onAppState,
  shareDeathCard,
} from "./native.js";

const W = 960;
const H = 540;
const GROUND_Y = 430;
const GRAVITY = 2550;
const JUMP_V = -800;
const MAX_FALL = 1400;
const BASE_SPEED = 285;
const MAX_SPEED = 520; // readable; density carries difficulty
const SPEED_PER_M = 0.24;
const SCREEN_X = 170;
const MAX_LIVES = 3;
const COYOTE = 0.16;
const JUMP_BUFFER = 0.18;
const JUMP_CUT_V = -470;
const TILE = 64;
const PLAYER_W = 48;
const PLAYER_H = 68;
// ledge forgiveness (px) — wider feet + soft edge grab
const FOOT_INSET = 4;
const LEDGE_SLACK = 6;
// Ember Dash — the namesake burst
const DASH_DURATION = 0.42;
const DASH_COOLDOWN = 3.6;
const DASH_SPEED_MULT = 1.55;
const DASH_MAGNET = 110;
const FEVER_COMBO = 8;
const FEVER_DURATION = 6.5;
const FEVER_SCORE_MULT = 1.75;
const FEVER_MAGNET = 95;
const HITSTOP_STOMP = 0.055;
const HITSTOP_DASH_KILL = 0.08;
const NEAR_MISS_PX = 42;
const SIM_DT = 1 / 60;
const MAX_FRAME_DELTA = 0.1;
const MAX_CATCHUP_STEPS = 6;

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d", { alpha: false });
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlayBody = document.getElementById("overlay-body");
const startBtn = document.getElementById("start-btn");
const startLabel = document.getElementById("start-label");
const entryTrailer = document.getElementById("entry-trailer");
const metersEl = document.getElementById("meters");
const livesEl = document.getElementById("lives");
const hudEl = document.querySelector(".hud");
const lifePips = livesEl ? [...livesEl.querySelectorAll(".ember")] : [];
const musicBtn = document.getElementById("music-btn");
const sfxBtn = document.getElementById("sfx-btn");
const jumpBtn = document.getElementById("jump-btn");
const dashBtn = document.getElementById("dash-btn");
const deathStampEl = document.getElementById("death-stamp");
const shareBtn = document.getElementById("share-btn");

const RUN_FRAME_COUNT = 4;
// All run frames are pre-normalized to the same cell size (body-centered).
const RUN_CELL_W = 128;
const RUN_CELL_H = 96;
const assets = {
  hero: loadImage("assets/hero.png"),
  heroIdle: loadImage("assets/hero_idle.png"),
  heroRun: loadImage("assets/hero_run.png"),
  heroJump: loadImage("assets/hero_jump.png"),
  enemy: loadImage("assets/enemy.png"),
  coin: loadImage("assets/coin.png"),
  tile: loadImage("assets/tile.png"),
  bg: loadImage("assets/bg.png"),
  foxFace: loadImage("assets/fox-face.jpg"),
  stampFox: loadImage("assets/entry-poster.jpg"),
  run: Array.from({ length: RUN_FRAME_COUNT }, (_, i) =>
    loadImage(`assets/run/run_${String(i).padStart(2, "0")}.png`),
  ),
};

function loadImage(src) {
  const img = new Image();
  img.src = src;
  img.ready = false;
  img.onload = () => {
    img.ready = true;
  };
  img.onerror = () => console.warn("failed to load", src);
  return img;
}

function waitOne(img) {
  return new Promise((resolve) => {
    if (img.complete && img.naturalWidth) {
      img.ready = true;
      resolve();
      return;
    }
    img.onload = () => {
      img.ready = true;
      resolve();
    };
    img.onerror = () => resolve();
  });
}

function waitAssets() {
  const list = [
    assets.hero,
    assets.heroIdle,
    assets.heroRun,
    assets.heroJump,
    assets.enemy,
    assets.coin,
    assets.tile,
    assets.bg,
    ...assets.run,
  ];
  return Promise.all(list.map(waitOne));
}

function readyRunFrames() {
  return assets.run.filter((img) => img.ready && img.naturalWidth);
}

const state = {
  mode: "title",
  t: 0,
  last: 0,
  scroll: 0,
  speed: BASE_SPEED,
  score: 0,
  distance: 0,
  lives: MAX_LIVES,
  best: Number(localStorage.getItem("ember-dash-best-m") || 0),
  invuln: 0,
  shake: 0,
  combo: 0,
  comboTimer: 0,
  player: null,
  platforms: [],
  coins: [],
  enemies: [],
  particles: [],
  floats: [],
  enemyTimer: 0,
  coinTimer: 0,
  platformCursor: 0,
  floatBob: 0,
  wasOnGround: true,
  runPhase: 0,
  coyote: 0,
  jumpBuf: 0,
  holdingJump: false,
  scoreAcc: 0,
  dashT: 0, // remaining dash time
  dashCd: 0, // remaining cooldown
  dashReadyChimed: true,
  afterimages: [],
  runId: 0,
  feverT: 0,
  feverAnnounced: false,
  hitstop: 0,
  flash: 0,
  flashColor: "255,200,80",
  wasOverVoid: false,
  styleKills: 0,
  maxCombo: 0,
  props: [],
  hints: [],
  authoredUntil: 0,
  gateX: 0,
  levelClear: false,
  prompt: null,
  dashTaught: false,
  firstPit: null,
};

const heldJumpInputs = new Set();
let simulationAccumulator = 0;

syncAudioButtons();
syncDashButton();
syncShellMode();

function makePlayer() {
  return {
    x: 0,
    y: GROUND_Y - PLAYER_H,
    w: PLAYER_W,
    h: PLAYER_H,
    vy: 0,
    onGround: true,
    hops: 0,
    squash: 1,
    prevY: GROUND_Y - PLAYER_H,
    pose: "run",
    poseAge: 0,
    tilt: 0,
    stretchX: 1,
    stretchY: 1,
  };
}

/** Horizontal distance a held jump covers at this speed. */
function jumpClearancePx(speed) {
  const air = (2 * Math.abs(JUMP_V)) / GRAVITY;
  return speed * air * 0.75;
}

/**
 * Void width you can walk across without jumping.
 * Ledge slack + foot width + the 12px rest-snap let the fox
 * "step" a short hole before gravity drops them off the lip.
 */
function walkableGapPx(speed) {
  const restPx = 12;
  const fallT = Math.sqrt((2 * restPx) / GRAVITY);
  const feet = PLAYER_W - FOOT_INSET * 2;
  return feet + LEDGE_SLACK * 2 + speed * fallT;
}

function mustJumpGapPx(speed) {
  return walkableGapPx(speed) + 24;
}

function firstAuthoredGapPx() {
  const ground = state.platforms
    .filter((pl) => pl.solid && pl.kind === "ground")
    .sort((a, b) => a.x - b.x);
  let end = 0;
  for (const pl of ground) {
    if (pl.x > end + 1) return Math.round(pl.x - end);
    end = Math.max(end, pl.x + pl.w);
  }
  return 0;
}

function resetRun() {
  state.mode = "playing";
  state.runId += 1;
  state.t = 0;
  state.scroll = 0;
  state.speed = BASE_SPEED;
  state.score = 0;
  state.scoreAcc = 0;
  state.distance = 0;
  state.lives = MAX_LIVES;
  state.invuln = 1.0;
  state.shake = 0;
  state.combo = 0;
  state.comboTimer = 0;
  state.player = makePlayer();
  state.platforms = [];
  state.coins = [];
  state.enemies = [];
  state.particles = [];
  state.floats = [];
  state.enemyTimer = 1.8;
  state.coinTimer = 0.5;
  state.platformCursor = 0;
  state.wasOnGround = true;
  state.runPhase = 0;
  state.coyote = 0;
  state.jumpBuf = 0;
  state.holdingJump = false;
  state.dashT = 0;
  state.dashCd = 2.2; // jump/stomp first; dash is ready before the plow pack
  state.dashReadyChimed = false;
  state.afterimages = [];
  state.feverT = 0;
  state.feverAnnounced = false;
  state.hitstop = 0;
  state.flash = 0;
  state.wasOverVoid = false;
  state.styleKills = 0;
  state.maxCombo = 0;
  state.props = [];
  state.hints = [];
  state.authoredUntil = 0;
  state.gateX = 0;
  state.levelClear = false;
  state.prompt = null;
  state.dashTaught = false;
  state.firstPit = null;
  simulationAccumulator = 0;
  clearHeldJumpInputs(false);
  seedStartingTerrain();
  hideOverlay();
  updateHud();
  syncDashButton();
  syncShellMode();
}

function isFever() {
  return state.feverT > 0;
}

function scoreMult() {
  let m = 1;
  if (isDashing()) m *= 2;
  if (isFever()) m *= FEVER_SCORE_MULT;
  return m;
}

function applyHitstop(seconds) {
  state.hitstop = Math.max(state.hitstop, seconds);
}

function triggerFever() {
  if (isFever()) {
    state.feverT = Math.min(FEVER_DURATION + 2.5, state.feverT + 2.2);
    return;
  }
  state.feverT = FEVER_DURATION;
  state.feverAnnounced = true;
  state.flash = 0.3;
  state.flashColor = "240,201,106";
  state.shake = Math.max(state.shake, 0.22);
  const p = state.player;
  if (p) {
    floatText(p.x + p.w * 0.5, p.y - 24, "SIGNAL FEVER", "#f0c96a", 1.55);
    for (let i = 0; i < 28; i++) {
      const ang = (Math.PI * 2 * i) / 28;
      state.particles.push({
        x: p.x + p.w * 0.5,
        y: p.y + p.h * 0.4,
        vx: Math.cos(ang) * (160 + Math.random() * 90),
        vy: Math.sin(ang) * (120 + Math.random() * 70) - 30,
        life: 0.45 + Math.random() * 0.2,
        age: 0,
        color: i % 3 === 0 ? "#ff8a3c" : "#f0c96a",
        size: 2.5 + Math.random() * 3,
      });
    }
  }
  hapticSuccess();
}

function bumpCombo(amount = 1) {
  state.combo += amount;
  state.maxCombo = Math.max(state.maxCombo, state.combo);
  state.comboTimer = isDashing() || isFever() ? 2.4 : 1.65;
  if (state.combo >= FEVER_COMBO) triggerFever();
}

function addCoinAt(x, y) {
  state.coins.push({
    x,
    y,
    w: 32,
    h: 32,
    taken: false,
    spin: Math.random() * Math.PI,
  });
}

function addCoinArc(startX, baseY, count, spacing, rise) {
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    addCoinAt(startX + i * spacing, baseY - Math.sin(t * Math.PI) * rise);
  }
}

function addWispAt(x, y, fly = false) {
  state.enemies.push({
    x,
    y,
    w: 44,
    h: 44,
    fly,
    phase: Math.random() * 0.8,
    baseY: y,
    dead: false,
  });
}

function addProp(kind, x, extra = {}) {
  state.props.push({ kind, x, y: extra.y ?? GROUND_Y, ...extra });
}

function addHint(x, text) {
  state.hints.push({ x, text, fired: false });
}

function setPrompt(text, life = 2.6) {
  state.prompt = { text, age: 0, life };
}

function seedStartingTerrain() {
  // Level 1 · Signal Approach — authored teaching course, then the gold line
  // opens into the existing procedural run.
  let x = 0;

  // Beat 0 — street approach. Learn jump on solid ground.
  x = addGroundRun(x, 16);
  addProp("lamp", 3 * TILE + 18);
  addProp("lamp", 11 * TILE + 18);
  addCoinArc(7 * TILE + 16, GROUND_Y - 86, 3, 34, 8);

  // Beat 1 — first break. Unwalkable. A held jump still clears it.
  const walkNeed = mustJumpGapPx(BASE_SPEED);
  const jumpHave = jumpClearancePx(BASE_SPEED);
  const l1Gap = Math.round(Math.min(jumpHave - 10, Math.max(walkNeed + 18, 120)));
  const gap1 = x;
  state.firstPit = { x: gap1, w: l1Gap };
  x += l1Gap;
  addCoinArc(gap1 + 8, GROUND_Y - 118, 3, Math.max(24, (l1Gap - 16) / 2), 22);
  x = addGroundRun(x, 8);
  addWispAt(x - 5 * TILE, GROUND_Y - 44, false);
  addCoinAt(x - 5 * TILE + 6, GROUND_Y - 112);
  addProp("lamp", x - 2 * TILE);

  // Beat 2 — optional high road.
  const highStart = x;
  x = addGroundRun(x, 10);
  addFloater(highStart + 3 * TILE, GROUND_Y - 108);
  addCoinAt(highStart + 3 * TILE + 14, GROUND_Y - 154);
  addCoinAt(highStart + 3 * TILE + 46, GROUND_Y - 162);
  addCoinAt(highStart + 4 * TILE + 14, GROUND_Y - 154);
  addProp("lamp", highStart + 8 * TILE);

  // Beat 3 — slightly wider gap.
  const gap2 = x;
  x += l1Gap + 10;
  addCoinArc(gap2 + 10, GROUND_Y - 124, 3, 32, 24);
  x = addGroundRun(x, 9);

  // Beat 4 — dash setpiece. Three ground wisps in a row.
  const pack = x;
  x = addGroundRun(x, 12);
  addWispAt(pack + 2.5 * TILE, GROUND_Y - 44, false);
  addWispAt(pack + 5 * TILE, GROUND_Y - 44, false);
  addWispAt(pack + 7.5 * TILE, GROUND_Y - 44, false);
  addProp("banner", pack + 4 * TILE);
  addProp("lamp", pack + 10 * TILE);

  // Beat 5 — combo alley.
  const alley = x;
  x = addGroundRun(x, 11);
  for (let i = 0; i < 5; i++) {
    addCoinAt(alley + 2 * TILE + i * 28, GROUND_Y - 78 - (i % 2) * 12);
  }
  addWispAt(alley + 7 * TILE, GROUND_Y - 44, false);
  addFloater(alley + 8 * TILE, GROUND_Y - 100);
  addCoinAt(alley + 8 * TILE + 16, GROUND_Y - 146);


  // Beat 6 — close-call lip + flyer.
  const gap3 = x;
  x += l1Gap + 18;
  x = addGroundRun(x, 6);
  addWispAt(x - 3 * TILE, GROUND_Y - 118, true);
  addProp("lamp", x - TILE);

  // Beat 7 — Signal Gate. Course ends; procedural gold line begins.
  x += l1Gap;
  const gateStreet = x;
  x = addGroundRun(x, 16);
  state.gateX = gateStreet + 6 * TILE;
  addProp("gate", state.gateX);
  addProp("brazier", state.gateX - 52);
  addProp("brazier", state.gateX + 86);
  addProp("lamp", gateStreet + 2 * TILE);
  addProp("lamp", gateStreet + 12 * TILE);
  addCoinArc(state.gateX - 40, GROUND_Y - 102, 5, 24, 16);


  state.platformCursor = x;
  state.authoredUntil = x;
}

function addGroundRun(startX, tiles) {
  for (let i = 0; i < tiles; i++) {
    state.platforms.push({
      x: startX + i * TILE,
      y: GROUND_Y,
      w: TILE,
      h: TILE,
      solid: true,
      kind: "ground",
    });
  }
  return startX + tiles * TILE;
}

function addFloater(x, y) {
  state.platforms.push({
    x,
    y,
    w: TILE,
    h: 40,
    solid: true,
    kind: "float",
    floating: true,
  });
}

function playEntryTrailer() {
  if (!entryTrailer) return;
  overlay.classList.remove("is-dead");
  if (startLabel) startLabel.textContent = "ENTER";
  startBtn?.setAttribute("aria-label", "Enter");
  entryTrailer.classList.remove("hidden");
  try {
    entryTrailer.currentTime = 0;
  } catch {
    /* not seekable yet */
  }
  const play = entryTrailer.play();
  if (play && typeof play.catch === "function") play.catch(() => {});
  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    startBtn?.focus({ preventScroll: true });
  }
}

function stopEntryTrailer() {
  if (!entryTrailer) return;
  entryTrailer.pause();
  entryTrailer.classList.add("hidden");
}

function hideOverlay() {
  overlay.classList.add("hidden");
  overlay.classList.remove("is-dead");
  if (deathStampEl) deathStampEl.hidden = true;
  stopEntryTrailer();
  syncShellMode();
}

function showOverlay(title, body, buttonLabel = "Play Again") {
  overlayTitle.textContent = title;
  overlayBody.textContent = body;
  if (startLabel) startLabel.textContent = buttonLabel;
  else startBtn.textContent = buttonLabel;
  startBtn?.setAttribute("aria-label", buttonLabel);
  overlay.classList.remove("hidden");
  if (state.mode === "title") {
    if (deathStampEl) deathStampEl.hidden = true;
    if (shareBtn) shareBtn.hidden = true;
    playEntryTrailer();
  } else {
    overlay.classList.add("is-dead");
    if (shareBtn) shareBtn.hidden = false;
    stopEntryTrailer();
  }
  syncDashButton();
  syncShellMode();
}

let hudLives = MAX_LIVES;

function syncShellMode() {
  document.body.classList.toggle("is-title", state.mode === "title");
  document.body.classList.toggle("is-playing", state.mode === "playing");
  document.body.classList.toggle("is-dead", state.mode === "dead");
}

function updateHud() {
  const meters = `${Math.floor(state.distance)}m`;
  if (metersEl && metersEl.textContent !== meters) metersEl.textContent = meters;
  if (lifePips.length) {
    for (let i = 0; i < lifePips.length; i++) {
      const on = i < state.lives;
      lifePips[i].classList.toggle("on", on);
      lifePips[i].classList.toggle("off", !on);
    }
    livesEl.hidden = state.mode !== "playing" || state.lives >= MAX_LIVES;
    livesEl.setAttribute("aria-label", `Lives ${state.lives} of ${MAX_LIVES}`);
    if (state.lives < hudLives) {
      livesEl.classList.add("is-hit");
      window.setTimeout(() => livesEl.classList.remove("is-hit"), 280);
    }
    hudLives = state.lives;
  }
  hudEl?.classList.toggle("is-fever", isFever());
}

function syncAudioButtons() {
  if (musicBtn) {
    const on = isMusicOn();
    musicBtn.setAttribute("aria-pressed", on ? "true" : "false");
    musicBtn.setAttribute("aria-label", on ? "Music on" : "Music off");
    musicBtn.classList.toggle("off", !on);
  }
  if (sfxBtn) {
    const on = isSfxOn();
    sfxBtn.setAttribute("aria-pressed", on ? "true" : "false");
    sfxBtn.setAttribute("aria-label", on ? "Sound on" : "Sound off");
    sfxBtn.classList.toggle("off", !on);
  }
}

function canJump() {
  const p = state.player;
  if (!p) return false;
  if (p.onGround || state.coyote > 0) return true;
  return p.hops < 2; // air jump remaining
}

function doJump() {
  const p = state.player;
  if (!p || state.mode !== "playing") return;
  if (!canJump()) return;

  const grounded = p.onGround || state.coyote > 0;
  if (grounded) {
    p.hops = 1;
    p.vy = JUMP_V;
    state.coyote = 0;
    sfxJump();
  } else {
    p.hops = 2;
    p.vy = JUMP_V * 0.88;
    sfxDoubleJump();
  }
  p.onGround = false;
  p.squash = 0.82;
  state.holdingJump = heldJumpInputs.size > 0;
  state.jumpBuf = 0;
  burst(p.x + p.w * 0.5, p.y + p.h, "#f0c96a", grounded ? 7 : 5);
  if (grounded) hapticLight();
  else hapticMedium();
}

function isDashing() {
  return state.dashT > 0;
}

function canDash() {
  return state.mode === "playing" && state.dashCd <= 0 && state.dashT <= 0 && state.player;
}

function tryDash() {
  if (state.mode === "title" || state.mode === "dead") {
    return;
  }
  if (state.mode === "paused") {
    resumeGame();
  }
  if (!canDash()) return;
  const p = state.player;
  state.dashT = DASH_DURATION;
  state.dashCd = isFever() ? DASH_COOLDOWN * 0.72 : DASH_COOLDOWN;
  state.dashReadyChimed = false;
  state.invuln = Math.max(state.invuln, DASH_DURATION + 0.05);
  // slight lift so dash feels like a surge, not a sink
  if (p.vy > -120) p.vy = Math.min(p.vy, -180);
  p.squash = 1.22;
  state.shake = Math.max(state.shake, 0.14);
  state.flash = Math.max(state.flash, 0.16);
  state.flashColor = "255,160,60";
  sfxDash();
  // gold shockwave
  for (let i = 0; i < 18; i++) {
    const ang = (Math.PI * 2 * i) / 18;
    state.particles.push({
      x: p.x + p.w * 0.5,
      y: p.y + p.h * 0.45,
      vx: Math.cos(ang) * (120 + Math.random() * 80) - 40,
      vy: Math.sin(ang) * (80 + Math.random() * 60) - 20,
      life: 0.35 + Math.random() * 0.2,
      age: 0,
      color: i % 2 ? "#f0c96a" : "#ff8a3c",
      size: 2 + Math.random() * 3,
    });
  }
  floatText(p.x, p.y - 8, "EMBER DASH", "#f0c96a");
  hapticHeavy();
  syncDashButton();
}

function syncDashButton() {
  const actionAllowed = state.mode === "playing" || state.mode === "paused";
  if (jumpBtn) jumpBtn.disabled = !actionAllowed;
  if (!dashBtn) return;
  const ready = state.mode === "playing" && state.dashCd <= 0 && state.dashT <= 0;
  const dashing = isDashing();
  dashBtn.classList.toggle("ready", ready);
  dashBtn.classList.toggle("cooling", state.dashCd > 0 && !dashing);
  dashBtn.classList.toggle("active", dashing);
  dashBtn.disabled = !actionAllowed || (state.mode === "playing" && !ready && !dashing);
  const fill = dashBtn.querySelector(".dash-cd-fill");
  if (fill) {
    const pct =
      state.mode !== "playing"
        ? 1
        : isDashing()
          ? 1
          : state.dashCd <= 0
            ? 1
            : 1 - state.dashCd / DASH_COOLDOWN;
    fill.style.transform = `scaleY(${Math.max(0, Math.min(1, pct))})`;
  }
}

function requestJump() {
  if (state.mode === "title" || state.mode === "dead") {
    return;
  }
  if (state.mode === "paused") {
    resumeGame();
  }
  if (canJump()) doJump();
  else state.jumpBuf = JUMP_BUFFER;
}

function releaseJump() {
  state.holdingJump = false;
  const p = state.player;
  // Variable jump height without collapsing a tap into a near-ground hop.
  if (p && !p.onGround && p.vy < JUMP_CUT_V) {
    p.vy = JUMP_CUT_V;
  }
}

function clearHeldJumpInputs(applyJumpCut = true) {
  heldJumpInputs.clear();
  setJumpBtnActive(false);
  if (applyJumpCut) releaseJump();
  else state.holdingJump = false;
}

function beginJumpInput(token) {
  if (heldJumpInputs.has(token)) return;
  const firstInput = heldJumpInputs.size === 0;
  heldJumpInputs.add(token);
  setJumpBtnActive(true);
  if (firstInput) requestJump();
}

function endJumpInput(token) {
  if (!heldJumpInputs.delete(token)) return;
  if (heldJumpInputs.size === 0) {
    setJumpBtnActive(false);
    releaseJump();
  }
}

function pauseGame() {
  if (state.mode !== "playing") return;
  state.mode = "paused";
  simulationAccumulator = 0;
  clearHeldJumpInputs(false);
  syncDashButton();
}

function resumeGame() {
  if (state.mode !== "paused") return;
  state.mode = "playing";
  state.last = performance.now();
  simulationAccumulator = 0;
  syncDashButton();
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function burst(x, y, color, n = 8) {
  for (let i = 0; i < n; i++) {
    const ang = Math.random() * Math.PI * 2;
    const sp = 50 + Math.random() * 160;
    state.particles.push({
      x,
      y,
      vx: Math.cos(ang) * sp,
      vy: Math.sin(ang) * sp - 50,
      life: 0.3 + Math.random() * 0.4,
      age: 0,
      color,
      size: 2 + Math.random() * 3.5,
    });
  }
}

function floatText(x, y, text, color = "#f0c96a", scale = 1) {
  state.floats.push({
    x,
    y,
    text,
    color,
    age: 0,
    life: scale > 1.2 ? 1.1 : 0.8,
    scale,
  });
}

function spawnChunk(clearanceSpeed) {
  // Solid ground is always the floor. Floaters are bonuses above it.
  // Gaps must be too wide to walk and still inside a held jump.
  while (state.platformCursor < state.scroll + W + 420) {
    const difficulty = Math.min(1, state.distance / 560);
    const clear = jumpClearancePx(clearanceSpeed);
    const minGap = mustJumpGapPx(clearanceSpeed);
    const maxGap = Math.max(minGap + 10, Math.min(clear * 0.9, minGap + 16 + difficulty * 36));
    const gapChance = 0.08 + difficulty * 0.12;
    const floaterChance = 0.1 + difficulty * 0.07;

    // gap + guaranteed landing pad (longer pad at higher speed)
    if (Math.random() < gapChance && state.platformCursor > 32 * TILE) {
      const span = Math.max(0, maxGap - minGap);
      const gap = minGap + Math.random() * span;
      state.platformCursor += gap;
      const landTiles = 5 + Math.floor(difficulty * 2) + Math.floor(Math.random() * 2);
      state.platformCursor = addGroundRun(state.platformCursor, landTiles);
      continue;
    }

    // normal ground run (never floating-only); longer runs early
    const runTiles = (difficulty < 0.35 ? 4 : 3) + Math.floor(Math.random() * 5);
    const runStart = state.platformCursor;
    state.platformCursor = addGroundRun(state.platformCursor, runTiles);

    // optional floater ABOVE ground — keep it over solid tiles, not near edges
    if (Math.random() < floaterChance && runTiles >= 3) {
      const inset = 1;
      const slot = inset + Math.floor(Math.random() * Math.max(1, runTiles - inset * 2));
      const fx = runStart + slot * TILE;
      const fy = GROUND_Y - (96 + Math.floor(Math.random() * 2) * 32);
      addFloater(fx, fy);
    }
  }
}

function inFirstPit(worldX) {
  const pit = state.firstPit;
  if (!pit) return false;
  return worldX > pit.x + 3 && worldX < pit.x + pit.w - 3;
}

function groundUnder(worldX) {
  // The first pit is a hard void. Slack on neighboring tiles cannot paper over it.
  if (inFirstPit(worldX)) return null;
  // topmost solid surface under this x (floaters count; void returns null)
  let top = null;
  for (const pl of state.platforms) {
    if (!pl.solid) continue;
    if (worldX < pl.x - 4 || worldX > pl.x + pl.w + 4) continue;
    if (!top || pl.y < top.y) top = pl;
  }
  return top;
}

function maybeSpawnPickups(dt) {
  // Authored Level 1 owns pickups until the Signal Gate.
  if (state.scroll + W < state.authoredUntil - 48) return;

  state.coinTimer -= dt;
  state.enemyTimer -= dt;
  const difficulty = Math.min(1, state.distance / 520);

  if (state.coinTimer <= 0) {
    const x = state.scroll + W + 48 + Math.random() * 80;
    const under = groundUnder(x);
    // only spawn coins where there's actually ground/float to read
    if (under) {
      const y = under.y - 46 - Math.random() * 28;
      const cluster = Math.random() < 0.3 ? 3 : 1;
      for (let i = 0; i < cluster; i++) {
        const cx = x + i * 26;
        if (!groundUnder(cx) && cluster > 1) continue;
        state.coins.push({
          x: cx,
          y: y - Math.sin(i * 1.1) * 10,
          w: 32,
          h: 32,
          taken: false,
          spin: Math.random() * Math.PI,
        });
      }
    }
    state.coinTimer = 0.6 - difficulty * 0.06 + Math.random() * 0.35;
  }

  // teach window longer; density ramps gently
  if (state.enemyTimer <= 0 && state.distance > 28) {
    const x = state.scroll + W + 80;
    const under = groundUnder(x);
    // prefer ground wisps early; flyers later
    const fly = difficulty > 0.25 && Math.random() < 0.35 + difficulty * 0.2;
    let y;
    if (fly) {
      y = GROUND_Y - (100 + Math.random() * 50);
    } else if (under && under.kind !== "float") {
      // keep walkers on main ground, not tiny floaters
      y = under.y - 44;
    } else if (under) {
      state.enemyTimer = 0.35;
      return;
    } else {
      state.enemyTimer = 0.35;
      return;
    }
    state.enemies.push({
      x,
      y,
      w: 44,
      h: 44,
      fly,
      phase: Math.random() * Math.PI * 2,
      baseY: y,
      dead: false,
    });
    state.enemyTimer = 1.9 - difficulty * 0.35 + Math.random() * 0.75;
  }
}

function hurt(reason) {
  if (state.invuln > 0) return;
  state.lives -= 1;
  state.invuln = 1.5;
  state.shake = 0.26;
  state.combo = 0;
  state.feverT = 0;
  const p = state.player;
  // small pop so you don't re-collide the same wisp instantly
  if (p) {
    p.vy = Math.min(p.vy, -280);
    p.onGround = false;
    state.coyote = 0;
    state.holdingJump = false;
    burst(p.x + p.w * 0.5, p.y + p.h * 0.5, "#c46bff", 12);
  }
  sfxHit();
  hapticHeavy();
  updateHud();
  if (state.lives <= 0) die(reason);
}

let lastStampBlob = null;
let lastShareText = "";

function queueDeathStamp({ meters, isBest }) {
  lastStampBlob = null;
  lastShareText = `${meters}m · the line broke`;
  const card = composeDeathStamp({ meters, isBest });
  if (!card) return;
  if (deathStampEl) {
    deathStampEl.src = card.toDataURL("image/jpeg", 0.88);
    deathStampEl.hidden = false;
  }
  card.toBlob(
    (blob) => {
      lastStampBlob = blob;
    },
    "image/jpeg",
    0.88,
  );
}

function composeDeathStamp({ meters, isBest }) {
  const card = document.createElement("canvas");
  card.width = 1080;
  card.height = 1350;
  const c = card.getContext("2d");
  if (!c) return null;

  c.fillStyle = "#0b0a10";
  c.fillRect(0, 0, card.width, card.height);

  const face = assets.foxFace.ready ? assets.foxFace : assets.stampFox;
  if (face?.ready) {
    const iw = face.naturalWidth || face.width;
    const ih = face.naturalHeight || face.height;
    const scale = Math.max(1080 / iw, 980 / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    c.drawImage(face, (1080 - dw) / 2, 80 + (980 - dh) / 2, dw, dh);
  }

  const fade = c.createLinearGradient(0, 0, 0, card.height);
  fade.addColorStop(0, "rgba(11,10,16,0.2)");
  fade.addColorStop(0.58, "rgba(11,10,16,0.08)");
  fade.addColorStop(1, "rgba(11,10,16,0.88)");
  c.fillStyle = fade;
  c.fillRect(0, 0, card.width, card.height);

  c.fillStyle = "#f0c96a";
  c.font = '400 180px "Bodoni 72", Didot, "Iowan Old Style", serif';
  c.textAlign = "center";
  c.fillText(`${meters}m`, card.width / 2, 1188);

  c.strokeStyle = "rgba(240,201,106,0.8)";
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(200, 1230);
  c.lineTo(880, 1230);
  c.stroke();

  c.fillStyle = isBest ? "#fff3c8" : "rgba(244,239,230,0.8)";
  c.font = '400 38px "Bodoni 72", Didot, "Iowan Old Style", serif';
  c.fillText(isBest ? "new best" : "the line broke", card.width / 2, 1292);
  return card;
}

function die(reason) {
  state.mode = "dead";
  state.shake = 0.4;
  state.feverT = 0;
  state.hitstop = 0;
  sfxDie();
  hapticHeavy();
  if (state.player) {
    burst(state.player.x + 29, state.player.y + 36, "#c46bff", 20);
  }
  const meters = Math.floor(state.distance);
  const isBest = meters > state.best;
  if (isBest) {
    state.best = meters;
    try {
      localStorage.setItem("ember-dash-best-m", String(state.best));
    } catch {
      /* private mode / quota */
    }
  }
  updateHud();
  showOverlay(`${meters}m`, isBest ? "new best" : "the line broke", "AGAIN");
  queueDeathStamp({ meters, isBest });
  syncShellMode();
}

function updateLevelOne(dt) {
  const p = state.player;
  if (!p) return;

  if (state.prompt) {
    state.prompt.age += dt;
    if (state.prompt.age >= state.prompt.life) state.prompt = null;
  }

  for (const hint of state.hints) {
    if (hint.fired) continue;
    if (p.x >= hint.x) {
      hint.fired = true;
      setPrompt(hint.text);
    }
  }

  if (!state.levelClear && state.gateX > 0 && p.x >= state.gateX) {
    state.levelClear = true;
    const bonus = Math.round(200 * scoreMult());
    state.score += bonus;
    state.flash = Math.max(state.flash, 0.28);
    state.flashColor = "240,201,106";
    state.shake = Math.max(state.shake, 0.18);
    hapticSuccess();
    for (let i = 0; i < 26; i++) {
      const ang = (Math.PI * 2 * i) / 26;
      state.particles.push({
        x: state.gateX,
        y: GROUND_Y - 90,
        vx: Math.cos(ang) * (140 + Math.random() * 80),
        vy: Math.sin(ang) * (90 + Math.random() * 70) - 40,
        life: 0.5 + Math.random() * 0.25,
        age: 0,
        color: i % 2 ? "#f0c96a" : "#ff8a3c",
        size: 2.5 + Math.random() * 3,
      });
    }
  }

  // Slow ember lift from lamps / braziers still on screen
  if (Math.random() < 0.35) {
    const viewL = state.scroll - 20;
    const viewR = state.scroll + W + 20;
    for (const pr of state.props) {
      if (pr.x < viewL || pr.x > viewR) continue;
      if (pr.kind !== "lamp" && pr.kind !== "brazier") continue;
      if (Math.random() > 0.18) continue;
      const flameY = pr.kind === "lamp" ? pr.y - 92 : pr.y - 28;
      state.particles.push({
        x: pr.x + (Math.random() - 0.5) * 10,
        y: flameY,
        vx: (Math.random() - 0.5) * 18,
        vy: -28 - Math.random() * 36,
        life: 0.45 + Math.random() * 0.3,
        age: 0,
        color: Math.random() > 0.4 ? "#f0c96a" : "#ff7a2f",
        size: 1.6 + Math.random() * 1.8,
      });
    }
  }
}

function updatePlayerAnimation(dt) {
  const p = state.player;
  if (!p) return;

  let nextPose = "run";
  if (isDashing()) nextPose = "dash";
  else if (!p.onGround && p.vy < -150) nextPose = "rise";
  else if (!p.onGround && p.vy <= 170) nextPose = "apex";
  else if (!p.onGround) nextPose = "fall";

  if (nextPose !== p.pose) {
    p.pose = nextPose;
    p.poseAge = 0;
  } else {
    p.poseAge += dt;
  }

  const targetTilt =
    nextPose === "dash" ? -0.12 : nextPose === "rise" ? -0.07 : nextPose === "fall" ? 0.09 : 0;
  const targetStretchX = nextPose === "dash" ? 1.16 : nextPose === "rise" ? 0.94 : nextPose === "fall" ? 1.04 : 1;
  const targetStretchY = nextPose === "dash" ? 0.88 : nextPose === "rise" ? 1.07 : nextPose === "fall" ? 0.96 : 1;
  const blend = 1 - Math.exp(-dt * 16);
  p.tilt += (targetTilt - p.tilt) * blend;
  p.stretchX += (targetStretchX - p.stretchX) * blend;
  p.stretchY += (targetStretchY - p.stretchY) * blend;
}

function update(dt) {
  if (state.mode !== "playing") {
    setIntensity(0.05);
    return;
  }

  // Hitstop freezes sim for punchy kills (still renders)
  if (state.hitstop > 0) {
    state.hitstop = Math.max(0, state.hitstop - dt);
    if (state.flash > 0) state.flash = Math.max(0, state.flash - dt * 1.5);
    return;
  }

  state.t += dt;
  state.floatBob += dt;
  if (state.flash > 0) state.flash = Math.max(0, state.flash - dt);
  if (state.feverT > 0) state.feverT = Math.max(0, state.feverT - dt);

  // dash timers — fever shaves cooldown while active
  if (state.dashT > 0) state.dashT = Math.max(0, state.dashT - dt);
  if (state.dashCd > 0) {
    const cdRate = isFever() ? 1.45 : 1;
    state.dashCd = Math.max(0, state.dashCd - dt * cdRate);
    if (state.dashCd <= 0 && !state.dashReadyChimed) {
      state.dashReadyChimed = true;
      sfxDashReady();
    }
  }
  syncDashButton();

  const baseSpeed = Math.min(MAX_SPEED, BASE_SPEED + state.distance * SPEED_PER_M);
  const dashBoost = isDashing() ? DASH_SPEED_MULT : 1;
  const feverBoost = isFever() ? 1.08 : 1;
  state.speed = baseSpeed * dashBoost * feverBoost;

  setIntensity(
    Math.min(
      1,
      (baseSpeed - BASE_SPEED) / Math.max(1, MAX_SPEED - BASE_SPEED) +
        (isDashing() ? 0.35 : 0) +
        (isFever() ? 0.25 : 0),
    ),
  );
  state.scroll += state.speed * dt;
  state.distance = state.scroll / 30;

  if (state.invuln > 0) state.invuln -= dt;
  if (state.shake > 0) state.shake = Math.max(0, state.shake - dt);
  if (state.comboTimer > 0) {
    state.comboTimer -= dt;
    if (state.comboTimer <= 0) state.combo = 0;
  }
  if (state.coyote > 0) state.coyote -= dt;
  if (state.jumpBuf > 0) {
    state.jumpBuf -= dt;
    if (state.jumpBuf > 0 && canJump()) doJump();
  }

  // Terrain must be clearable at normal speed; a temporary dash cannot create
  // a permanently oversized gap farther ahead.
  spawnChunk(baseSpeed);
  maybeSpawnPickups(dt);
  updateLevelOne(dt);

  const p = state.player;
  p.prevY = p.y;
  // hold jump = full height; release cuts via releaseJump
  // during dash, cut gravity so the surge feels like a controlled glide
  const grav = isDashing()
    ? GRAVITY * 0.35
    : state.holdingJump && p.vy < 0
      ? GRAVITY * 0.72
      : GRAVITY;
  p.vy = Math.min(MAX_FALL, p.vy + grav * dt);
  if (isDashing() && p.vy > 120) p.vy = 120;
  p.y += p.vy * dt;
  // Keep the collision body anchored. Dash is expressed through world speed,
  // trails, and pose—not by sliding the body into and back out of hazards.
  p.x = state.scroll + SCREEN_X;
  p.squash += (1 - p.squash) * Math.min(1, dt * 14);

  // void tracking for near-miss landings
  const underNow = groundUnder(p.x + p.w * 0.5);
  if (!p.onGround && !underNow) state.wasOverVoid = true;

  // dash / fever afterimages + trail
  if (isDashing() || isFever()) {
    if (isDashing() || Math.random() < 0.35) {
      state.afterimages.push({
        x: p.x,
        y: p.y,
        life: isDashing() ? 0.22 : 0.14,
        age: 0,
      });
    }
    if (Math.random() < (isDashing() ? 0.7 : 0.25)) {
      state.particles.push({
        x: p.x + 4 + Math.random() * 12,
        y: p.y + p.h * 0.4 + (Math.random() - 0.5) * 24,
        vx: -80 - Math.random() * 120,
        vy: (Math.random() - 0.5) * 40,
        life: 0.25 + Math.random() * 0.15,
        age: 0,
        color: Math.random() > 0.4 ? "#f0c96a" : "#ff7a2f",
        size: 2 + Math.random() * 2.5,
      });
    }
  }
  for (const a of state.afterimages) a.age += dt;
  state.afterimages = state.afterimages.filter((a) => a.age < a.life);

  // platform collisions — swept feet, ledge slack, pick topmost surface
  const wasGround = p.onGround;
  p.onGround = false;
  const feetW = p.w - FOOT_INSET * 2;
  const feetX = p.x + FOOT_INSET;
  const prevFeetX = p.x - state.speed * dt + FOOT_INSET;
  const prevBottom = p.prevY + p.h;
  const bottom = p.y + p.h;
  let landedPlat = null;

  if (p.vy >= -50) {
    let best = null; // highest platform (smallest y) we can land on
    for (const plat of state.platforms) {
      if (!plat.solid) continue;
      // soft edges: catch the lip of a platform by a few px
      if (feetX + feetW < plat.x - LEDGE_SLACK) continue;
      if (feetX > plat.x + plat.w + LEDGE_SLACK) continue;
      const top = plat.y;
      const crossed = prevBottom <= top + 8 && bottom >= top - 3;
      const resting = Math.abs(bottom - top) <= 12 && p.vy >= -50;
      if (!(crossed || resting)) continue;
      // only from above
      if (p.prevY + p.h - 1 > top + 14) continue;
      if (!best || plat.y < best.y) best = plat;
    }
    if (best) {
      // Walking cannot steal the next pad across a void. Jump or dash only.
      const prevOnBest =
        prevFeetX + feetW >= best.x - LEDGE_SLACK &&
        prevFeetX <= best.x + best.w + LEDGE_SLACK;
      const walking = p.hops === 0 && !isDashing();
      const walkedAcross = walking && !prevOnBest;
      const stoleFirstPit = walking && inFirstPit(p.x + p.w * 0.5);
      if (!walkedAcross && !stoleFirstPit) {
        p.y = best.y - p.h;
        p.vy = 0;
        p.onGround = true;
        p.hops = 0;
        state.coyote = COYOTE;
        landedPlat = best;
      }
    }
  }

  const landedThisStep = p.onGround && !wasGround;
  if (landedThisStep) {
    p.squash = 1.14;
    burst(p.x + p.w * 0.5, p.y + p.h, "rgba(212,168,75,0.65)", 3);
    sfxLand();
    // Near-miss: cleared a void and kissed the landing lip
    if (state.wasOverVoid && landedPlat) {
      const feetCenter = p.x + p.w * 0.5;
      const distIntoPad = feetCenter - landedPlat.x;
      if (distIntoPad >= 0 && distIntoPad < NEAR_MISS_PX) {
        const bonus = Math.round(35 * scoreMult());
        state.score += bonus;
        floatText(p.x, p.y - 28, `CLOSE CALL +${bonus}`, "#fff0c0", 1.35);
        state.flash = Math.max(state.flash, 0.12);
        state.flashColor = "255,240,180";
        state.shake = Math.max(state.shake, 0.1);
        bumpCombo(1);
        hapticMedium();
      }
    }
    state.wasOverVoid = false;
  }
  let bufferedLandingJump = false;
  if (p.onGround && state.jumpBuf > 0) {
    bufferedLandingJump = true;
    doJump();
  }
  if (!p.onGround && wasGround && !bufferedLandingJump) {
    state.coyote = COYOTE;
  }
  if (p.onGround) {
    const fps = 8 + (state.speed / MAX_SPEED) * 3;
    state.runPhase += dt * fps;
  }
  state.wasOnGround = p.onGround;
  updatePlayerAnimation(dt);

  const midX = p.x + p.w * 0.5;
  const throughStreet = !p.onGround && !groundUnder(midX) && p.y + p.h > GROUND_Y + 16;
  if (throughStreet || p.y > H + 40) {
    die("the line broke");
    return;
  }

  // body hurtbox slightly generous on feet for stomps; coin grab is wider
  const hurtbox = { x: p.x + 10, y: p.y + 14, w: p.w - 20, h: p.h - 22 };
  const grabbox = { x: p.x + 2, y: p.y + 6, w: p.w - 4, h: p.h - 10 };
  const magnetR = (isDashing() ? DASH_MAGNET : 0) + (isFever() ? FEVER_MAGNET : 0);

  for (const c of state.coins) {
    if (c.taken) continue;
    c.spin += dt * 4;
    // soft magnet during Ember Dash / Signal Fever
    if (magnetR > 0) {
      const cx = c.x + c.w * 0.5;
      const cy = c.y + c.h * 0.5;
      const px = p.x + p.w * 0.5;
      const py = p.y + p.h * 0.45;
      const dx = px - cx;
      const dy = py - cy;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist < magnetR) {
        const pull = (1 - dist / magnetR) * (isDashing() ? 480 : 360) * dt;
        c.x += (dx / dist) * pull;
        c.y += (dy / dist) * pull;
      }
    }
    if (rectsOverlap(grabbox, c)) {
      c.taken = true;
      bumpCombo(1);
      const bonus = Math.round((10 + Math.min(30, (state.combo - 1) * 5)) * scoreMult());
      state.score += bonus;
      burst(c.x + 16, c.y + 16, "#f0c96a", isDashing() || isFever() ? 14 : 8);
      floatText(
        c.x,
        c.y - 8,
        state.combo > 1 ? `+${bonus}×${state.combo}` : `+${bonus}`,
        "#f0c96a",
        isFever() ? 1.2 : 1,
      );
      sfxCoin();
    }
  }

  for (const e of state.enemies) {
    if (e.dead) continue;
    e.phase += dt * (e.fly ? 2.8 : 2.0);
    // gentler bob — easier to read
    e.y = e.baseY + Math.sin(e.phase) * (e.fly ? 18 : 4);
    const ebox = { x: e.x + 10, y: e.y + 10, w: e.w - 20, h: e.h - 18 };
    const horizontalStomp =
      hurtbox.x + hurtbox.w > ebox.x && hurtbox.x < ebox.x + ebox.w;
    const prevFeetY = p.prevY + p.h;
    const feetY = p.y + p.h;
    const sweptStomp =
      horizontalStomp && p.vy > 30 && prevFeetY <= ebox.y + 10 && feetY >= ebox.y - 4;
    if (!rectsOverlap(hurtbox, ebox) && !sweptStomp) continue;

    // dash plows through wisps; otherwise stomp or take a hit
    const stomping =
      sweptStomp || (p.vy > 30 && feetY <= e.y + e.h * 0.62 && p.y < e.y + e.h * 0.35);
    if (isDashing() || stomping) {
      e.dead = true;
      if (!isDashing()) {
        p.vy = JUMP_V * 0.6;
        p.hops = Math.min(p.hops, 1);
      }
      const basePts = isDashing() ? 40 : 25;
      const pts = Math.round(basePts * scoreMult());
      state.score += pts;
      state.styleKills += 1;
      bumpCombo(1);
      applyHitstop(isDashing() ? HITSTOP_DASH_KILL : HITSTOP_STOMP);
      state.flash = Math.max(state.flash, isDashing() ? 0.14 : 0.08);
      state.flashColor = isDashing() ? "240,201,106" : "200,140,255";
      state.shake = Math.max(state.shake, isDashing() ? 0.16 : 0.1);
      burst(e.x + 22, e.y + 22, isDashing() ? "#f0c96a" : "#c46bff", 16);
      floatText(
        e.x,
        e.y,
        isDashing() ? `+${pts} DASH` : `+${pts}`,
        isDashing() ? "#f0c96a" : "#d9b6ff",
        1.25,
      );
      sfxStomp();
      hapticMedium();
    } else if (state.invuln <= 0) {
      hurt("A static wisp snagged the signal.");
      if (state.mode !== "playing") return;
    }
  }

  for (const pt of state.particles) {
    pt.age += dt;
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.vy += 420 * dt;
  }
  // hard cap particle count for solidity under stress
  if (state.particles.length > 120) {
    state.particles.splice(0, state.particles.length - 120);
  }
  state.particles = state.particles.filter((pt) => pt.age < pt.life);

  for (const f of state.floats) {
    f.age += dt;
    f.y -= 40 * dt;
  }
  state.floats = state.floats.filter((f) => f.age < f.life);

  const left = state.scroll - 160;
  state.platforms = state.platforms.filter((pl) => pl.x + pl.w > left);
  state.coins = state.coins.filter((c) => !c.taken && c.x > left);
  state.enemies = state.enemies.filter((e) => !e.dead && e.x + e.w > left);
  state.props = state.props.filter((pr) => pr.x > left - 80);

  // distance score — steady, not noisy
  state.scoreAcc += state.speed * dt * 0.018;
  if (state.scoreAcc >= 1) {
    const add = Math.floor(state.scoreAcc);
    state.score += add;
    state.scoreAcc -= add;
  }

  updateHud();
}

function drawBackground() {
  const bg = assets.bg;
  if (bg.ready) {
    const parallax = state.scroll * 0.22;
    const scale = H / bg.height;
    const drawW = bg.width * scale;
    let x = -((parallax * scale) % drawW);
    while (x < W) {
      ctx.drawImage(bg, x, 0, drawW, H);
      x += drawW - 1;
    }
  } else {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#0b1020");
    g.addColorStop(1, "#1a1410");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  const haze = ctx.createLinearGradient(0, GROUND_Y - 140, 0, GROUND_Y + 50);
  haze.addColorStop(0, "rgba(212,168,75,0)");
  haze.addColorStop(1, "rgba(212,168,75,0.1)");
  ctx.fillStyle = haze;
  ctx.fillRect(0, GROUND_Y - 140, W, 190);
}

function drawPits() {
  const ground = state.platforms
    .filter((pl) => pl.solid && pl.kind === "ground")
    .sort((a, b) => a.x - b.x);
  let end = null;
  for (const pl of ground) {
    if (end != null && pl.x > end + 10) {
      const sx = end - state.scroll;
      const w = pl.x - end;
      if (sx + w > -8 && sx < W + 8) {
        const pit = ctx.createLinearGradient(0, GROUND_Y - 6, 0, H);
        pit.addColorStop(0, "rgba(3,2,6,0.2)");
        pit.addColorStop(0.08, "rgba(3,2,6,0.88)");
        pit.addColorStop(1, "#040208");
        ctx.fillStyle = pit;
        ctx.fillRect(sx, GROUND_Y - 2, w, H - GROUND_Y + 4);
        ctx.fillStyle = "rgba(240,201,106,0.55)";
        ctx.fillRect(sx - 3, GROUND_Y - 1, 5, 4);
        ctx.fillRect(sx + w - 2, GROUND_Y - 1, 5, 4);
        ctx.strokeStyle = "rgba(240,201,106,0.18)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sx + 6, GROUND_Y + 10);
        ctx.lineTo(sx + w * 0.5, GROUND_Y + 28);
        ctx.lineTo(sx + w - 6, GROUND_Y + 10);
        ctx.stroke();
      }
    }
    end = Math.max(end ?? pl.x, pl.x + pl.w);
  }
}

function drawPlatforms() {
  const tile = assets.tile;
  for (const pl of state.platforms) {
    const sx = pl.x - state.scroll;
    if (sx + pl.w < -20 || sx > W + 20) continue;
    if (tile.ready) {
      const count = Math.max(1, Math.round(pl.w / 64));
      const tw = pl.w / count;
      for (let i = 0; i < count; i++) {
        ctx.drawImage(tile, sx + i * tw, pl.y, tw + 0.6, pl.h);
      }
    } else {
      ctx.fillStyle = "#2a2e38";
      ctx.fillRect(sx, pl.y, pl.w, pl.h);
    }
    if (pl.kind === "ground") {
      const pulse = 0.45 + Math.sin(state.t * 3 + pl.x * 0.01) * 0.12;
      ctx.fillStyle = `rgba(240,201,106,${pulse})`;
      ctx.fillRect(sx, pl.y, pl.w + 0.6, 3);
      ctx.fillStyle = "rgba(255,140,50,0.22)";
      ctx.fillRect(sx, pl.y + 3, pl.w + 0.6, 2);
    }
    if (pl.floating) {
      ctx.fillStyle = "rgba(212,168,75,0.2)";
      ctx.fillRect(sx, pl.y, pl.w, 3);
    }
  }
}

function drawMidground() {
  // Low street wreckage only — the painted skyline already owns the horizon.
  const parallax = state.scroll * 0.55;
  const baseY = GROUND_Y;
  ctx.save();
  for (let i = -1; i < 10; i++) {
    const seed = i + Math.floor(parallax / 140);
    const x = i * 140 - (parallax % 140);
    const h = 10 + (Math.abs(seed * 13) % 18);
    const w = 18 + (Math.abs(seed * 7) % 22);
    ctx.fillStyle = "rgba(12,10,16,0.55)";
    ctx.fillRect(x, baseY - h, w, h);
    if (seed % 3 === 0) {
      ctx.fillStyle = "rgba(240,201,106,0.08)";
      ctx.fillRect(x + 4, baseY - h - 3, 6, 3);
    }
  }
  ctx.restore();
}

function drawFlame(x, y, scale, phase) {
  const flicker = 0.85 + Math.sin(state.t * 14 + phase) * 0.15;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale * flicker, scale);
  const g = ctx.createRadialGradient(0, 0, 1, 0, 0, 16);
  g.addColorStop(0, "rgba(255,230,160,0.95)");
  g.addColorStop(0.45, "rgba(255,140,40,0.7)");
  g.addColorStop(1, "rgba(255,80,20,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 0, 14, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,240,200,0.9)";
  ctx.beginPath();
  ctx.ellipse(0, 2, 3.2, 5.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawProps() {
  for (const pr of state.props) {
    const sx = pr.x - state.scroll;
    if (sx < -80 || sx > W + 80) continue;
    if (pr.kind === "lamp") {
      ctx.fillStyle = "#1a1d24";
      ctx.fillRect(sx - 3, pr.y - 86, 6, 86);
      ctx.fillStyle = "#2a2418";
      ctx.fillRect(sx - 14, pr.y - 90, 28, 6);
      ctx.fillStyle = "rgba(240,201,106,0.12)";
      ctx.beginPath();
      ctx.ellipse(sx, pr.y - 96, 28, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      drawFlame(sx, pr.y - 98, 1, pr.x * 0.05);
    } else if (pr.kind === "brazier") {
      ctx.fillStyle = "#1c1814";
      ctx.fillRect(sx - 8, pr.y - 16, 16, 16);
      ctx.fillStyle = "#3a3220";
      ctx.beginPath();
      ctx.moveTo(sx - 16, pr.y - 16);
      ctx.lineTo(sx + 16, pr.y - 16);
      ctx.lineTo(sx + 11, pr.y - 26);
      ctx.lineTo(sx - 11, pr.y - 26);
      ctx.closePath();
      ctx.fill();
      drawFlame(sx, pr.y - 34, 1.15, pr.x * 0.08);
    } else if (pr.kind === "banner") {
      ctx.fillStyle = "rgba(16,19,26,0.82)";
      ctx.fillRect(sx - 36, pr.y - 168, 72, 28);
      ctx.strokeStyle = "rgba(240,201,106,0.55)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(sx - 36, pr.y - 168, 72, 28);
      ctx.fillStyle = "rgba(240,201,106,0.9)";
      ctx.font = "700 12px Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("PLOW", sx, pr.y - 150);
      ctx.textAlign = "left";
    } else if (pr.kind === "gate") {
      const near = Math.max(0, 1 - Math.abs((state.player?.x ?? 0) - pr.x) / 280);
      ctx.fillStyle = "#141820";
      ctx.fillRect(sx - 70, pr.y - 168, 18, 168);
      ctx.fillRect(sx + 52, pr.y - 168, 18, 168);
      ctx.fillStyle = "#1c2230";
      ctx.beginPath();
      ctx.moveTo(sx - 78, pr.y - 160);
      ctx.quadraticCurveTo(sx, pr.y - 214, sx + 78, pr.y - 160);
      ctx.lineTo(sx + 62, pr.y - 148);
      ctx.quadraticCurveTo(sx, pr.y - 190, sx - 62, pr.y - 148);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = `rgba(240,201,106,${0.35 + near * 0.45})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx - 62, pr.y - 156);
      ctx.quadraticCurveTo(sx, pr.y - 200, sx + 62, pr.y - 156);
      ctx.stroke();
      ctx.fillStyle = `rgba(240,201,106,${0.18 + near * 0.22})`;
      ctx.beginPath();
      ctx.ellipse(sx, pr.y - 92, 42, 70, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f0c96a";
      ctx.font = "700 16px Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("✦", sx, pr.y - 176);
      ctx.textAlign = "left";
    }
  }
}

function drawCoins() {
  const coin = assets.coin;
  for (const c of state.coins) {
    if (c.taken) continue;
    const sx = c.x - state.scroll;
    if (sx < -40 || sx > W + 40) continue;
    const bob = Math.sin(state.floatBob * 4 + c.spin) * 5;
    const pulse = 1 + Math.sin(state.floatBob * 6 + c.spin) * 0.07;
    ctx.save();
    ctx.translate(sx + c.w / 2, c.y + c.h / 2 + bob);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = "rgba(240,201,106,0.25)";
    ctx.beginPath();
    ctx.arc(0, 0, 20, 0, Math.PI * 2);
    ctx.fill();
    if (coin.ready) ctx.drawImage(coin, -c.w / 2, -c.h / 2, c.w, c.h);
    else {
      ctx.fillStyle = "#f0c96a";
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawEnemies() {
  const enemy = assets.enemy;
  for (const e of state.enemies) {
    if (e.dead) continue;
    const sx = e.x - state.scroll;
    if (sx < -60 || sx > W + 60) continue;
    ctx.save();
    ctx.translate(sx + e.w / 2, e.y + e.h / 2);
    ctx.rotate(Math.sin(e.phase) * 0.1);
    ctx.fillStyle = "rgba(196,107,255,0.18)";
    ctx.beginPath();
    ctx.arc(0, 0, 26, 0, Math.PI * 2);
    ctx.fill();
    if (enemy.ready) ctx.drawImage(enemy, -e.w / 2, -e.h / 2, e.w, e.h);
    else {
      ctx.fillStyle = "#7a3dff";
      ctx.fillRect(-18, -18, 36, 36);
    }
    ctx.restore();
  }
}

/**
 * Draw a run cell bottom-center anchored at (0, footY) in local space.
 * Fixed cell aspect prevents per-frame scale pops.
 */
function drawRunCell(img, footY, drawH, alpha = 1) {
  if (!img?.ready || alpha <= 0.001) return;
  const scale = drawH / RUN_CELL_H;
  const drawW = RUN_CELL_W * scale;
  const prev = ctx.globalAlpha;
  ctx.globalAlpha = prev * alpha;
  // cell bottom-center on the foot point
  ctx.drawImage(img, -drawW / 2, footY - drawH, drawW, drawH);
  ctx.globalAlpha = prev;
}

function drawAfterimages() {
  const frames = readyRunFrames();
  const img = assets.heroJump.ready ? assets.heroJump : frames[0];
  if (!img?.ready) return;
  const drawH = PLAYER_H + 8;
  for (const a of state.afterimages) {
    const alpha = (1 - a.age / a.life) * 0.35;
    const sx = a.x - state.scroll;
    ctx.save();
    ctx.translate(sx + PLAYER_W / 2, a.y + PLAYER_H);
    ctx.globalAlpha = alpha;
    // warm gold tint via destination-over glow
    ctx.fillStyle = `rgba(240,201,106,${alpha * 0.5})`;
    ctx.beginPath();
    ctx.ellipse(0, -drawH * 0.45, 28, 34, 0, 0, Math.PI * 2);
    ctx.fill();
    drawRunCell(img, 0, drawH, 1);
    ctx.restore();
  }
}

function drawPlayer() {
  const p = state.player;
  if (!p) return;
  const sx = p.x - state.scroll;
  const frames = readyRunFrames();
  const dashing = isDashing();
  const resting = state.mode === "paused" || state.mode === "dead";
  const pose = resting ? "idle" : p.pose;
  // flash only for hurt invuln, not dash (dash has its own glow)
  const flash =
    !dashing && state.invuln > 0 && Math.floor(state.t * 18) % 2 === 0;
  // tiny vertical ease only — not a second animation channel fighting sprites
  const runBob = p.onGround && !dashing ? Math.sin(state.runPhase * Math.PI) * 1.2 : 0;

  // The shadow belongs to the ground plane, so never let it float with Ember.
  if (p.onGround) {
    ctx.save();
    ctx.translate(sx + p.w / 2, p.y + p.h);
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.ellipse(0, -2, p.w * 0.32, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  // Anchor: horizontal center of hitbox, vertical bottom of hitbox (feet).
  ctx.translate(sx + p.w / 2, p.y + p.h + runBob);
  const tilt = resting ? 0 : p.tilt;
  const stretchX = resting ? 1 : p.stretchX;
  const stretchY = resting ? 1 : p.stretchY;
  ctx.rotate(tilt);
  ctx.scale((1 / p.squash) * stretchX, p.squash * stretchY);
  if (flash) ctx.globalAlpha = 0.35;

  if (dashing) {
    // gold aura
    const pulse = 0.35 + Math.sin(state.t * 40) * 0.1;
    ctx.fillStyle = `rgba(240,201,106,${pulse})`;
    ctx.beginPath();
    ctx.ellipse(0, -p.h * 0.45, 36, 42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(255,120,40,${pulse * 0.45})`;
    ctx.beginPath();
    ctx.ellipse(-8, -p.h * 0.4, 22, 28, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const drawH = p.h + 8;

  if (pose === "idle" && assets.heroIdle.ready) {
    drawRunCell(assets.heroIdle, 0, drawH, 1);
  } else if (dashing && assets.heroJump.ready) {
    // stretched jump pose sells the surge
    drawRunCell(assets.heroJump, 0, drawH, 1);
  } else if (p.onGround && frames.length >= 2) {
    // Draw one authored frame at a time. Crossfading full sprites produces a
    // doubled, ghosted fox because the limbs do not share identical pixels.
    const phase = ((state.runPhase % frames.length) + frames.length) % frames.length;
    drawRunCell(frames[Math.floor(phase) % frames.length], 0, drawH, 1);
  } else if (!p.onGround && assets.heroJump.ready) {
    // jump sprite is normalized to the same 128×96 cell as run frames
    drawRunCell(assets.heroJump, 0, drawH, 1);
  } else if (frames.length) {
    drawRunCell(frames[0], 0, drawH, 1);
  } else {
    ctx.fillStyle = "#e08a3c";
    ctx.fillRect(-p.w / 2, -p.h, p.w, p.h);
  }
  ctx.restore();
}

function setJumpBtnActive(on) {
  jumpBtn?.classList.toggle("active", on);
}

function wireJumpButton() {
  if (!jumpBtn) return;
  const down = (e) => {
    e.preventDefault();
    e.stopPropagation();
    unlockAudio();
    jumpBtn.setPointerCapture?.(e.pointerId);
    beginJumpInput(`pointer:${e.pointerId}`);
  };
  const up = (e) => {
    e.preventDefault();
    e.stopPropagation();
    endJumpInput(`pointer:${e.pointerId}`);
  };
  jumpBtn.addEventListener("pointerdown", down);
  jumpBtn.addEventListener("pointerup", up);
  jumpBtn.addEventListener("pointercancel", up);
  // prevent synthetic mouse after touch
  jumpBtn.addEventListener("contextmenu", (e) => e.preventDefault());
}

function wireDashButton() {
  if (!dashBtn) return;
  const fire = (e) => {
    e.preventDefault();
    e.stopPropagation();
    unlockAudio();
    tryDash();
  };
  dashBtn.addEventListener("pointerdown", fire);
  dashBtn.addEventListener("contextmenu", (e) => e.preventDefault());
}

function drawParticles() {
  for (const pt of state.particles) {
    ctx.globalAlpha = 1 - pt.age / pt.life;
    ctx.fillStyle = pt.color;
    ctx.fillRect(pt.x - state.scroll, pt.y, pt.size, pt.size);
  }
  ctx.globalAlpha = 1;
}

function drawFloats() {
  ctx.textAlign = "center";
  for (const f of state.floats) {
    const t = f.age / f.life;
    const pop = (f.scale || 1) * (1 + (1 - t) * 0.15);
    ctx.globalAlpha = 1 - t;
    ctx.fillStyle = f.color;
    ctx.font = `700 ${Math.round(14 * pop)}px Inter, system-ui, sans-serif`;
    ctx.fillText(f.text, f.x - state.scroll, f.y);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = "left";
}

function drawVignette() {
  const hot = isFever() || isDashing();
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.22, W / 2, H / 2, H * 0.78);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, hot ? "rgba(40,20,0,0.42)" : "rgba(0,0,0,0.38)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  if (isFever()) {
    const edge = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.85);
    edge.addColorStop(0, "rgba(240,201,106,0)");
    edge.addColorStop(1, "rgba(240,201,106,0.14)");
    ctx.fillStyle = edge;
    ctx.fillRect(0, 0, W, H);
  }
}

function drawSpeedLines() {
  const dashing = isDashing();
  const fever = isFever();
  if (state.speed < 380 && !dashing && !fever) return;
  ctx.strokeStyle = dashing
    ? "rgba(240,201,106,0.28)"
    : fever
      ? "rgba(240,201,106,0.16)"
      : "rgba(240,201,106,0.1)";
  ctx.lineWidth = dashing ? 2 : 1.2;
  const n = dashing ? 16 : fever ? 12 : 10;
  for (let i = 0; i < n; i++) {
    const y = 30 + ((state.t * (dashing ? 380 : 220) + i * 53) % (H - 60));
    const len = (dashing ? 90 : 50) + Math.max(0, state.speed - 380) * 0.25;
    const x = W - ((state.scroll * (dashing ? 2.2 : 1.5) + i * 85) % (W + 100));
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - len, y);
    ctx.stroke();
  }
}

function drawDashGlow() {
  if (!isDashing() && !isFever()) return;
  const g = ctx.createRadialGradient(SCREEN_X + 40, H * 0.55, 20, SCREEN_X, H * 0.5, 240);
  g.addColorStop(0, isDashing() ? "rgba(240,201,106,0.2)" : "rgba(240,201,106,0.1)");
  g.addColorStop(0.5, "rgba(255,120,40,0.06)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function drawScreenFlash() {
  if (state.flash <= 0) return;
  const a = Math.min(0.45, state.flash * 1.4);
  ctx.fillStyle = `rgba(${state.flashColor || "255,200,80"},${a})`;
  ctx.fillRect(0, 0, W, H);
}

function drawHudChrome() {
  /* meters live in the HTML bar; the canvas stays a picture */
}

function render() {
  ctx.save();
  if (state.shake > 0) {
    const m = state.shake * 12;
    ctx.translate((Math.random() - 0.5) * m, (Math.random() - 0.5) * m);
  }

  drawBackground();
  drawMidground();
  drawPits();
  drawDashGlow();
  drawSpeedLines();
  drawPlatforms();
  drawProps();
  drawCoins();
  drawEnemies();
  if (state.mode !== "title") {
    drawAfterimages();
    drawPlayer();
  }
  drawParticles();
  drawFloats();
  drawVignette();
  drawScreenFlash();
  drawHudChrome();

  if (state.mode === "paused") {
    ctx.fillStyle = "rgba(7,8,12,0.5)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#f4efe6";
    ctx.font = "500 30px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Paused", W / 2, H / 2);
    ctx.font = "400 14px Inter, system-ui, sans-serif";
    ctx.fillStyle = "#9a9184";
    ctx.fillText("Press P to resume", W / 2, H / 2 + 28);
    ctx.textAlign = "left";
  }

  ctx.restore();
}

function advanceSimulation(realDt) {
  const clamped = Math.min(MAX_FRAME_DELTA, Math.max(0, realDt));
  simulationAccumulator = Math.min(
    simulationAccumulator + clamped,
    SIM_DT * MAX_CATCHUP_STEPS,
  );
  let steps = 0;
  while (simulationAccumulator >= SIM_DT && steps < MAX_CATCHUP_STEPS) {
    update(SIM_DT);
    simulationAccumulator -= SIM_DT;
    steps += 1;
  }
  if (steps === MAX_CATCHUP_STEPS) simulationAccumulator = 0;
}

function frame(now) {
  if (!state.last) state.last = now;
  const dt = (now - state.last) / 1000;
  state.last = now;
  advanceSimulation(dt);
  render();
  requestAnimationFrame(frame);
}

let runStartPending = false;

function startRunFromOverlay() {
  if (runStartPending || (state.mode !== "title" && state.mode !== "dead")) return;
  runStartPending = true;
  startBtn.classList.add("is-firing");
  window.setTimeout(() => startBtn.classList.remove("is-firing"), 160);
  stopEntryTrailer();
  resetRun();
  runStartPending = false;
  unlockAudio();
}

startBtn.addEventListener("pointerdown", (e) => {
  e.stopPropagation();
  startRunFromOverlay();
});
startBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  startRunFromOverlay();
});

shareBtn?.addEventListener("pointerdown", async (e) => {
  e.preventDefault();
  e.stopPropagation();
  if (state.mode !== "dead") return;
  shareBtn.disabled = true;
  try {
    await shareDeathCard({
      title: "Ember Dash",
      text: lastShareText || "the line broke · Ember Dash",
      blob: lastStampBlob,
      filename: `ember-${Math.floor(state.distance)}m.jpg`,
    });
  } catch {
    /* user cancelled or share unavailable */
  } finally {
    shareBtn.disabled = false;
  }
});

overlay?.addEventListener("pointerdown", (e) => {
  if (state.mode !== "dead") return;
  if (e.target.closest("#share-btn")) return;
  e.preventDefault();
  startRunFromOverlay();
});

musicBtn?.addEventListener("click", (e) => {
  e.stopPropagation();
  const next = !isMusicOn();
  setMusicOn(next);
  syncAudioButtons();
  if (next) unlockAudio().then(syncAudioButtons);
});

sfxBtn?.addEventListener("click", (e) => {
  e.stopPropagation();
  const next = !isSfxOn();
  setSfxOn(next);
  syncAudioButtons();
  if (next) unlockAudio().then(syncAudioButtons);
});

// Canvas jump only when not using the dedicated control buttons
canvas.addEventListener("pointerdown", (e) => {
  if (e.target === jumpBtn || e.target === dashBtn) return;
  if (e.target?.closest?.("#jump-btn, #dash-btn")) return;
  e.preventDefault();
  unlockAudio();
  canvas.setPointerCapture?.(e.pointerId);
  beginJumpInput(`pointer:${e.pointerId}`);
});
window.addEventListener("pointerup", (e) => {
  endJumpInput(`pointer:${e.pointerId}`);
});
window.addEventListener("pointercancel", (e) => {
  endJumpInput(`pointer:${e.pointerId}`);
});
window.addEventListener("keydown", (e) => {
  if (
    (e.code === "Space" || e.code === "Enter") &&
    (state.mode === "title" || state.mode === "dead")
  ) {
    e.preventDefault();
    startRunFromOverlay();
    return;
  }
  if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
    e.preventDefault();
    unlockAudio();
    beginJumpInput(`key:${e.code}`);
  } else if (e.code === "ShiftLeft" || e.code === "ShiftRight" || e.code === "KeyE" || e.code === "KeyF") {
    if (e.repeat) return;
    e.preventDefault();
    unlockAudio();
    tryDash();
  } else if (e.code === "KeyP") {
    if (e.repeat) return;
    if (state.mode === "playing") pauseGame();
    else if (state.mode === "paused") resumeGame();
  } else if (e.code === "KeyM") {
    if (e.repeat) return;
    unlockAudio().then(() => {
      setMusicOn(!isMusicOn());
      syncAudioButtons();
    });
  }
});
window.addEventListener("keyup", (e) => {
  if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
    endJumpInput(`key:${e.code}`);
  }
});
window.addEventListener("blur", () => clearHeldJumpInputs(false));

wireJumpButton();
wireDashButton();

function renderGameToText() {
  const visible = (item, width = item.w || 0) => {
    const x = item.x - state.scroll;
    return x + width >= 0 && x <= W;
  };
  const player = state.player
    ? {
        x: Math.round(state.player.x - state.scroll),
        y: Math.round(state.player.y),
        vy: Math.round(state.player.vy),
        onGround: state.player.onGround,
        hops: state.player.hops,
        pose: state.mode === "paused" || state.mode === "dead" ? "idle" : state.player.pose,
      }
    : null;
  return JSON.stringify({
    coordinateSystem: "canvas pixels; origin top-left; +x right; +y down; positions are screen-relative",
    mode: state.mode,
    runId: state.runId,
    overlayVisible: !overlay.classList.contains("hidden"),
    score: Math.floor(state.score),
    distanceM: Math.floor(state.distance),
    lives: state.lives,
    player,
    dash: {
      activeSeconds: Number(state.dashT.toFixed(2)),
      cooldownSeconds: Number(state.dashCd.toFixed(2)),
    },
    jumpAssist: {
      coyoteSeconds: Number(Math.max(0, state.coyote).toFixed(2)),
      bufferSeconds: Number(Math.max(0, state.jumpBuf).toFixed(2)),
      heldInputs: heldJumpInputs.size,
      holding: state.holdingJump,
    },
    coins: state.coins
      .filter((coin) => !coin.taken && visible(coin))
      .slice(0, 12)
      .map((coin) => ({ x: Math.round(coin.x - state.scroll), y: Math.round(coin.y) })),
    enemies: state.enemies
      .filter((enemy) => !enemy.dead && visible(enemy))
      .slice(0, 8)
      .map((enemy) => ({
        x: Math.round(enemy.x - state.scroll),
        y: Math.round(enemy.y),
        flying: enemy.fly,
      })),
    audio: getAudioState(),
    level: {
      name: "SIGNAL APPROACH",
      clear: state.levelClear,
      gateX: Math.round(state.gateX),
      authoredUntil: Math.round(state.authoredUntil),
      props: state.props.length,
      hints: state.hints.length,
      firstGapPx: firstAuthoredGapPx(),
      firstPit: state.firstPit
        ? { x: Math.round(state.firstPit.x), w: Math.round(state.firstPit.w) }
        : null,
    },
  });
}

window.render_game_to_text = renderGameToText;
window.advanceTime = (ms) => {
  simulationAccumulator = 0;
  const steps = Math.max(1, Math.round(ms / (SIM_DT * 1000)));
  for (let i = 0; i < steps; i++) update(SIM_DT);
  state.last = performance.now();
  render();
};

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    pauseGame();
  } else {
    state.last = performance.now();
    simulationAccumulator = 0;
    if (isMusicOn()) unlockAudio();
  }
});

// Pause when iOS backgrounded; resume timers cleanly
let removeAppState = () => {};

waitAssets()
  .then(() => initNative())
  .then(() => {
    state.last = performance.now();
    updateHud();
    syncAudioButtons();
    syncDashButton();
    if (state.mode === "title") playEntryTrailer();
    removeAppState = onAppState((active) => {
      if (!active && state.mode === "playing") {
        pauseGame();
      } else if (active && state.mode === "paused") {
        // stay paused — player unpauses intentionally
        state.last = performance.now();
        if (isMusicOn()) unlockAudio();
      }
    });
  });
requestAnimationFrame(frame);
