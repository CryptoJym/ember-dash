/**
 * Procedural noir-gold soundtrack + SFX for Ember Dash.
 * Web Audio only — no external media files.
 */

let ac = null;
let master = null;
let musicGain = null;
let sfxGain = null;
let musicTimer = null;
let musicStep = 0;
let nextMusicStepAt = 0;
let musicOn = true;
let sfxOn = true;
let intensity = 0; // 0..1 from game speed

const MUSIC_KEY = "ember-dash-music";
const SFX_KEY = "ember-dash-sfx";
const MUSIC_VOLUME = 0.36;
const MASTER_VOLUME = 0.9;
const MUSIC_LOOKAHEAD_SECONDS = 0.4;
const MUSIC_SCHEDULER_MS = 75;

try {
  musicOn = localStorage.getItem(MUSIC_KEY) !== "0";
  sfxOn = localStorage.getItem(SFX_KEY) !== "0";
} catch {
  /* ignore */
}

export function isMusicOn() {
  return musicOn;
}
export function isSfxOn() {
  return sfxOn;
}

export function getAudioState() {
  return {
    supported: !!(window.AudioContext || window.webkitAudioContext),
    contextState: ac?.state || "not-created",
    musicOn,
    musicPlaying: !!(musicTimer && ac?.state === "running"),
    sfxOn,
  };
}

function setGain(param, value) {
  if (!param) return;
  const now = ac?.currentTime || 0;
  try {
    param.cancelScheduledValues(now);
    param.setTargetAtTime(value, now, 0.025);
  } catch {
    param.value = value;
  }
}

export function setMusicOn(on) {
  musicOn = !!on;
  try {
    localStorage.setItem(MUSIC_KEY, musicOn ? "1" : "0");
  } catch {
    /* ignore */
  }
  if (musicGain) setGain(musicGain.gain, musicOn ? MUSIC_VOLUME : 0);
  if (musicOn) startMusic();
  else stopMusic();
}

export function setSfxOn(on) {
  sfxOn = !!on;
  try {
    localStorage.setItem(SFX_KEY, sfxOn ? "1" : "0");
  } catch {
    /* ignore */
  }
  if (sfxGain) sfxGain.gain.value = sfxOn ? 1 : 0;
}

export function setIntensity(v) {
  intensity = Math.max(0, Math.min(1, v));
}

function ensure() {
  if (ac?.state === "closed") {
    stopMusic();
    ac = null;
    master = null;
    musicGain = null;
    sfxGain = null;
  }
  if (ac) return ac;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ac = new AC();
  master = ac.createGain();
  master.gain.value = MASTER_VOLUME;
  master.connect(ac.destination);

  musicGain = ac.createGain();
  musicGain.gain.value = musicOn ? MUSIC_VOLUME : 0;
  musicGain.connect(master);

  sfxGain = ac.createGain();
  sfxGain.gain.value = sfxOn ? 1 : 0;
  sfxGain.connect(master);

  return ac;
}

export async function unlockAudio() {
  const ctx = ensure();
  if (!ctx) return false;
  if (ctx.state !== "running") {
    try {
      await ctx.resume();
    } catch {
      return false;
    }
  }
  if (ctx.state !== "running") return false;
  if (musicOn) startMusic();
  return true;
}

function note(freq, time, dur, type, gain, dest, detune = 0) {
  if (!ac || !dest) return;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.value = freq;
  o.detune.value = detune;
  g.gain.setValueAtTime(0.0001, time);
  g.gain.exponentialRampToValueAtTime(gain, time + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
  o.connect(g);
  g.connect(dest);
  o.start(time);
  o.stop(time + dur + 0.02);
}

// Simpler equal-tempered A minor
const AM = {
  A3: 220.0,
  B3: 246.94,
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  F4: 349.23,
  G4: 392.0,
  A4: 440.0,
  C5: 523.25,
  E5: 659.25,
};

// Phrase: contemplative gold-line theme
const MELODY = [
  AM.A4, AM.C5, AM.E5, AM.C5,
  AM.A4, AM.G4, AM.A4, null,
  AM.E4, AM.A4, AM.C5, AM.B3,
  AM.A3, AM.C4, AM.E4, null,
  AM.C5, AM.A4, AM.G4, AM.E4,
  AM.F4, AM.E4, AM.D4, AM.C4,
  AM.A3, AM.E4, AM.A4, null,
  AM.G4, AM.E4, AM.A4, null,
];

const BASS = [
  AM.A3, null, AM.A3, null,
  AM.F4 / 2, null, AM.F4 / 2, null,
  AM.C4, null, AM.C4, null,
  AM.E4 / 2, null, AM.G4 / 2, null,
];

function startMusic() {
  const ctx = ensure();
  if (!ctx || ctx.state !== "running" || !musicOn || musicTimer) return;
  const bpm = 92;
  const stepDur = 60 / bpm / 2; // eighth notes

  // Deliberately no continuous pad/drone: every musical voice has a short
  // envelope so there is no constant low background buzz between notes.
  nextMusicStepAt = ac.currentTime + 0.05;

  const scheduleAhead = () => {
    if (!ac || !musicOn) return;
    const now = ac.currentTime;
    // A throttled browser timer must not shift the beat or restart the phrase.
    // If the page was backgrounded, resume from a clean point just ahead of now.
    if (nextMusicStepAt < now - stepDur) nextMusicStepAt = now + 0.05;

    while (nextMusicStepAt < now + MUSIC_LOOKAHEAD_SECONDS) {
      const step = musicStep % MELODY.length;
      const t = nextMusicStepAt;
      const m = MELODY[step];
      const b = BASS[step % BASS.length];
      const bright = 0.034 + intensity * 0.026;

      if (b) {
        note(b, t, stepDur * 1.15, "sine", 0.04 + intensity * 0.014, musicGain);
      }
      if (m) {
        note(m, t, stepDur * 0.9, "sine", bright, musicGain);
        note(m, t, stepDur * 0.9, "triangle", bright * 0.35, musicGain, 4);
      }
      // light percussion tick every other bar
      if (step % 8 === 0) {
        note(90, t, 0.04, "square", 0.012 + intensity * 0.01, musicGain);
      }
      if (step % 4 === 2) {
        note(180, t, 0.03, "square", 0.008, musicGain);
      }

      musicStep = (musicStep + 1) % MELODY.length;
      nextMusicStepAt += stepDur;
    }
  };

  scheduleAhead();
  musicTimer = setInterval(scheduleAhead, MUSIC_SCHEDULER_MS);
}

export function stopMusic() {
  if (musicTimer) {
    clearInterval(musicTimer);
    musicTimer = null;
  }
  nextMusicStepAt = 0;
  musicStep = 0;
}

function beep(freq, dur = 0.08, type = "square", gain = 0.05) {
  if (!sfxOn) return;
  const ctx = ensure();
  if (!ctx || !sfxGain) return;
  if (ctx.state === "suspended") ctx.resume();
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(sfxGain);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export function sfxJump() {
  beep(420, 0.07, "square", 0.04);
  setTimeout(() => beep(620, 0.06, "square", 0.03), 40);
}
export function sfxDoubleJump() {
  beep(520, 0.05, "square", 0.035);
  setTimeout(() => beep(780, 0.07, "triangle", 0.03), 35);
}
export function sfxCoin() {
  beep(880, 0.05, "triangle", 0.05);
  setTimeout(() => beep(1180, 0.08, "triangle", 0.04), 45);
}
export function sfxStomp() {
  beep(200, 0.05, "square", 0.05);
  setTimeout(() => beep(140, 0.1, "triangle", 0.04), 40);
}
export function sfxHit() {
  beep(120, 0.18, "sawtooth", 0.055);
}
export function sfxDie() {
  beep(180, 0.12, "sawtooth", 0.05);
  setTimeout(() => beep(90, 0.25, "sawtooth", 0.04), 90);
}
export function sfxLand() {
  beep(160, 0.04, "triangle", 0.025);
}
export function sfxDash() {
  beep(280, 0.05, "sawtooth", 0.04);
  setTimeout(() => beep(520, 0.08, "triangle", 0.05), 30);
  setTimeout(() => beep(780, 0.12, "sine", 0.035), 70);
}
export function sfxDashReady() {
  beep(660, 0.05, "triangle", 0.03);
  setTimeout(() => beep(990, 0.07, "sine", 0.025), 40);
}
