import { VIEW_W, VIEW_H, FIXED_DT, PHYSICS, POWERS, ECHOES, UPGRADES, BOONS, BIOMES, clamp, randomFrom, shuffled, freshProfile, loadProfile, persistProfile, normalizeProfile, upgradeCost, buyUpgrade, heirsFor, getStats, beginExpedition, awardLight, finishExpedition, makeRoom, newPlayer, stepPlayer, takeHit } from './core.mjs';
import { EmberRenderer, foxEmblem } from './renderer.mjs';
const $ = s => document.querySelector(s), panel = $('#panel'), announcer = $('#announcer'), hud = $('#hud'), hint = $('#context-hint');
let storage;
try {
    storage = window.localStorage;
}
catch {
    storage = null;
}
const loaded = loadProfile(storage);
let profile = loaded.profile, readOnly = !!loaded.readOnly, warning = loaded.warning;
function entropy() { try {
    return [...crypto.getRandomValues(new Uint32Array(2))].map(x => x.toString(36)).join('-');
}
catch {
    return `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e8).toString(36)}`;
} }
if (!profile.familySeed)
    profile.familySeed = entropy();
let interrupted = null;
if (profile.active) {
    interrupted = finishExpedition(profile, profile.active.id);
}
if (!storage)
    warning = 'Browser saving is unavailable. You can still play and export your progress.';
function save() { if (readOnly)
    return false; if (!persistProfile(storage, profile)) {
    warning = 'Progress is in memory only. Export a save before closing this page.';
    $('#storage-note').textContent = warning;
    return false;
} return true; }
if (interrupted)
    save();
const game = { mode: 'title', room: makeRoom('hearth'), player: null, heir: heirsFor(profile)[0], heirs: heirsFor(profile), stats: null, boons: {}, seed: '', runId: '', camera: 0, t: 0, visualTime: 0, particles: [], floats: [], pulses: [], afterimages: [], projectiles: [], shake: 0, light: 0, pickups: 0, xp: 0, nextBoon: 24, boonPending: false, dashSerial: 0, motion: profile.settings.motion, death: null };
if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    game.motion = false;
    profile.settings.motion = false;
}
const renderer = new EmberRenderer($('#world'));
const input = { left: false, right: false, jumpPressed: false, jumpReleased: false, dashPressed: false, pulsePressed: false, interactPressed: false };
const activeInputs = new Map();
function clearInput() { activeInputs.clear(); for (const k in input)
    input[k] = false; for (const b of document.querySelectorAll('.control'))
    b.classList.remove('held'); }
function press(action, id) { if (activeInputs.has(id))
    return; activeInputs.set(id, action); if (action === 'left' || action === 'right')
    input[action] = true;
else
    input[`${action}Pressed`] = true; }
function release(id) { const action = activeInputs.get(id); activeInputs.delete(id); if (action === 'left' || action === 'right')
    input[action] = [...activeInputs.values()].includes(action); if (action === 'jump' && ![...activeInputs.values()].includes('jump'))
    input.jumpReleased = true; }
function consumeEdges() { for (const k of ['jumpPressed', 'jumpReleased', 'dashPressed', 'pulsePressed', 'interactPressed'])
    input[k] = false; }
class HearthAudio {
    constructor() { this.ctx = null; this.melody = 0; this.clock = 0; }
    unlock() { if (!profile.settings.sound)
        return; try {
        this.ctx ??= new (window.AudioContext || window.webkitAudioContext)();
        if (this.ctx.state === 'suspended')
            this.ctx.resume().catch(() => { });
    }
    catch { } }
    tone(freq, dur = .15, volume = .045, type = 'sine', slide = 1) { if (!profile.settings.sound || !this.ctx || this.ctx.state !== 'running')
        return; try {
        const a = this.ctx, osc = a.createOscillator(), gain = a.createGain(), now = a.currentTime;
        osc.type = type;
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), now + dur);
        gain.gain.setValueAtTime(.0001, now);
        gain.gain.exponentialRampToValueAtTime(volume, now + .01);
        gain.gain.exponentialRampToValueAtTime(.0001, now + dur);
        osc.connect(gain);
        gain.connect(a.destination);
        osc.start();
        osc.stop(now + dur + .01);
    }
    catch { } }
    play(which) { if (which === 'coin')
        this.tone(740 + (game.pickups % 4) * 110, .13, .028);
    else if (which === 'jump')
        this.tone(280, .13, .035, 'sine', 1.9);
    else if (which === 'dash')
        this.tone(190, .2, .035, 'triangle', 2.2);
    else if (which === 'pulse')
        this.tone(120, .27, .045, 'triangle', .5);
    else if (which === 'hit')
        this.tone(100, .22, .045, 'triangle', .5);
    else if (which === 'boon') {
        this.tone(440, .4, .035);
        this.tone(660, .6, .025);
    }
    else
        this.tone(330, .25, .025); }
    tick(dt) { if (!profile.settings.sound || game.mode === 'paused' || document.hidden)
        return; this.clock -= dt; if (this.clock <= 0) {
        this.clock = 1.1;
        const notes = [220, 330, 440, 392, 330, 293.66, 261.63, 330];
        this.tone(notes[this.melody++ % notes.length], 1.6, .011);
    } }
}
const audio = new HearthAudio();
function toast(text) { announcer.textContent = text; $('#toast').textContent = text; $('#toast').classList.add('visible'); clearTimeout(toast.timer); toast.timer = setTimeout(() => $('#toast').classList.remove('visible'), 3300); }
function setMode(mode) { game.mode = mode; document.body.dataset.mode = mode; renderer.resize(); hud.hidden = mode === 'title' || mode === 'hearth'; $('#touch-controls').hidden = mode !== 'playing'; panel.hidden = mode === 'playing'; clearInput(); hint.hidden = mode !== 'playing'; }
function powerOf(heir = game.heir) { return POWERS.find(x => x.id === heir.power) || POWERS[0]; }
function chrome() { $('#wallet').textContent = profile.wallet.toLocaleString(); $('#generation').textContent = String(profile.generation).padStart(2, '0'); $('#best').textContent = profile.bestDepth ? `Chamber ${profile.bestDepth}` : 'A new beginning'; $('#sound').setAttribute('aria-pressed', String(profile.settings.sound)); $('#sound').textContent = profile.settings.sound ? '♫ Sound on' : '♫ Sound off'; $('#motion').setAttribute('aria-pressed', String(game.motion)); $('#motion').textContent = game.motion ? 'Motion on' : 'Motion reduced'; $('#storage-note').textContent = warning || 'Progress stays in this browser. Your light is kept, even when an expedition ends.'; }
function focusPanel() { requestAnimationFrame(() => panel.querySelector('button:not([disabled])')?.focus({ preventScroll: true })); }
function showTitle() { setMode('title'); chrome(); panel.className = 'title-panel'; panel.innerHTML = `<div class="eyebrow"><span class="line"></span> A FOX. A FLICKER. AN INFINITE WORLD.</div><h1>Every ending<br>leaves a <em>spark.</em></h1><p class="lead">A different hollow with every expedition.<br>Inherit extraordinary powers. Bring the light home.</p><button class="primary" id="awaken">Awaken your lineage <span>↗</span></button><div class="micro">PROCEDURAL PLATFORMER <i>·</i> NO DOWNLOAD REQUIRED</div><div class="title-features"><span><b>01</b> A new fox every life</span><span><b>02</b> A new path every run</span><span><b>03</b> Your light lives on</span></div>${interrupted ? '<p class="restore-note">Your interrupted expedition has returned to the hearth. All saved light was kept.</p>' : ''}`; $('#awaken').onclick = () => { audio.unlock(); showHearth(); }; }
function heirCard(h, index) { const p = powerOf(h), echo = ECHOES.find(x => x.id === h.echo); return `<button class="heir-card ${game.heir.index === index ? 'selected' : ''}" data-heir="${index}" style="--power:${p.color}" aria-pressed="${game.heir.index === index}"><span class="card-top"><span>${p.mark} ${p.name}</span><span class="selection">${game.heir.index === index ? '✓' : '○'}</span></span>${foxEmblem(p)}<span class="heir-name">${h.name}</span><span class="heir-skill">${p.skill}</span><span class="heir-detail">${p.detail}</span><span class="echo">${echo.name} <small>${echo.description}</small></span></button>`; }
function showHearth() {
    setMode('hearth');
    chrome();
    game.heirs = heirsFor(profile);
    game.heir = game.heirs[game.heir?.generation === profile.generation ? game.heir.index : 0];
    panel.className = 'hearth-panel';
    panel.innerHTML = `<div class="panel-heading"><div><div class="eyebrow">THE HEARTH · GENERATION ${String(profile.generation).padStart(2, '0')}</div><h2>Who carries the <em>light?</em></h2><p>Three descendants. Only gifts. Choose the way you play.</p></div><button class="quiet" id="back-title" aria-label="Return to title">←</button></div><div class="heirs">${game.heirs.map(heirCard).join('')}</div><div class="upgrades-heading"><div><span class="eyebrow">ROOTS THAT REMAIN</span><h3>Grow the whole lineage.</h3></div><span class="bank">✧ ${profile.wallet} <small>light to spend</small></span></div><div class="upgrades">${UPGRADES.map(u => { const lv = profile.upgrades[u.id], cost = upgradeCost(u.id, lv); return `<button class="upgrade" data-upgrade="${u.id}" ${cost === null || profile.wallet < cost ? 'disabled' : ''}><span class="upgrade-icon">${u.icon}</span><span><strong>${u.name} <small>${lv}/${u.max}</small></strong><span>${u.description}</span></span><b>${cost === null ? 'MAX' : `✧ ${cost}`}</b></button>`; }).join('')}</div><div class="hearth-bottom"><label class="seed-label">WORLD SEED <input id="seed-input" maxlength="48" placeholder="Leave blank for a new world" aria-label="Optional dungeon seed"></label><button class="primary" id="begin">Enter the hollow <span>↗</span></button></div><p class="hearth-help">Move A / D · Jump Space · Dash Shift · Pulse J · Interact E<br><span>Touch controls and gamepads are supported. All heirs can complete the main route.</span></p>${profile.lineage.length ? `<details class="ancestry"><summary>${profile.lineage.length} remembered ${profile.lineage.length === 1 ? 'ancestor' : 'ancestors'} · their light is yours</summary><div>${profile.lineage.slice().reverse().map(a => `<span>${powerOf(a).mark} ${a.name} · Chamber ${a.depth} · ${a.light} light</span>`).join('')}</div></details>` : ''}`;
    panel.querySelectorAll('[data-heir]').forEach(b => b.onclick = () => { const seed = $('#seed-input').value; game.heir = game.heirs[Number(b.dataset.heir)]; audio.play('select'); showHearth(); $('#seed-input').value = seed; panel.querySelector(`[data-heir="${game.heir.index}"]`).focus({ preventScroll: true }); });
    panel.querySelectorAll('[data-upgrade]').forEach(b => b.onclick = () => { const result = buyUpgrade(profile, b.dataset.upgrade); if (result.ok) {
        save();
        audio.play('boon');
        toast(`${UPGRADES.find(x => x.id === b.dataset.upgrade).name} awakened for every descendant.`);
        showHearth();
    }
    else
        toast(result.reason); });
    $('#begin').onclick = () => startGame($('#seed-input').value.trim());
    $('#back-title').onclick = showTitle;
}
function startGame(seed) { audio.unlock(); game.seed = seed || entropy(); game.runId = entropy(); game.boons = {}; game.stats = getStats(profile, game.heir, game.boons); game.room = makeRoom(game.seed, 1); game.player = newPlayer(game.room, game.stats); game.camera = 0; game.t = 0; game.light = 0; game.pickups = 0; game.xp = 0; game.nextBoon = 24; game.boonPending = false; game.death = null; game.dashSerial = 0; clearEffects(); if (!beginExpedition(profile, game.heir, game.runId)) {
    toast('An expedition is already active. Return to the hearth first.');
    return;
} save(); setMode('playing'); updateHud(); toast(`${game.heir.name}, ${powerOf().name}. Follow the light. ${matchMedia('(pointer:coarse)').matches ? 'Tap JUMP again in the air; PULSE clears your path.' : 'Space to air jump; J to pulse.'}`); }
function clearEffects() { game.particles = []; game.floats = []; game.pulses = []; game.afterimages = []; game.projectiles = []; game.shake = 0; }
function updateHud() { const p = game.player; if (!p)
    return; const power = powerOf(), b = BIOMES.find(x => x.id === game.room.biome); $('#hud-name').textContent = `${game.heir.name} · ${power.name}`; $('#hearts').textContent = '♥'.repeat(p.health) + '♡'.repeat(Math.max(0, game.stats.health - p.health)) + (p.ward ? ' ◇' : ''); $('#hearts').setAttribute('aria-label', `${p.health} of ${game.stats.health} hearts${p.ward ? ', one protective ward' : ''}`); $('#hud-biome').textContent = b.name; $('#hud-depth').textContent = `CHAMBER ${String(game.room.depth).padStart(2, '0')}`; $('#hud-light').textContent = `✧ ${game.light}`; $('#hud-bank').textContent = `${profile.wallet} banked`; $('#dash-meter').style.setProperty('--ready', `${100 * (1 - p.dashCd / game.stats.dashCooldown)}%`); $('#dash-status').textContent = p.dashCd > 0 ? `${p.dashCd.toFixed(1)}s` : 'READY'; $('#boon-progress').style.width = `${Math.min(100, game.xp / game.nextBoon * 100)}%`; $('#boon-label').textContent = `${Math.floor(game.xp)} / ${game.nextBoon} to awakening`; $('#buffs').textContent = Object.entries(game.boons).map(([k, v]) => `${BOONS.find(b => b.id === k).mark}${v > 1 ? '×' + v : ''}`).join(' '); }
function burst(x, y, color, count = 14) { if (!game.motion)
    return; for (let i = 0; i < count && game.particles.length < 180; i++) {
    const ang = Math.random() * Math.PI * 2, speed = 40 + Math.random() * 145;
    game.particles.push({ x, y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed - 30, life: .3 + Math.random() * .4, color, size: 1.5 + Math.random() * 2.5 });
} }
function floatText(text, x, y, color = '#f4deb0') { game.floats.push({ text, x, y, color, life: 1.25 }); if (game.floats.length > 20)
    game.floats.shift(); }
function collect(amount, x, y) { if (!awardLight(profile, game.runId, amount))
    return; game.light += amount; game.xp += amount; game.boonPending = game.xp >= game.nextBoon; save(); audio.play('coin'); burst(x, y, '#ead49d', 6); if (amount > 1)
    floatText(`+${amount}`, x, y - 18); }
function enemyHit(e, damage) { if (e.dead)
    return; e.hp -= damage; e.flash = .13; burst(e.x, e.y, powerOf().color, 12); if (e.hp <= 0) {
    e.hp = 0;
    e.dead = true;
    const amount = e.type === 'guardian' ? 30 : 3;
    collect(amount, e.x, e.y);
    floatText(e.type === 'guardian' ? 'THE SEAL IS BROKEN' : '+3 LIGHT', e.x, e.y - 42, powerOf().color);
    if (e.type === 'guardian') {
        toast('The Hollow Keeper falls. The next realm is open.');
        audio.play('boon');
    }
} }
function playerHit(damage = 1) { const p = game.player; if (takeHit(p, damage)) {
    audio.play('hit');
    game.shake = game.motion ? 5 : 0;
    burst(p.x + p.w / 2, p.y + 15, powerOf().color);
    if (p.health === 0)
        die();
} }
function die() { if (game.mode !== 'playing')
    return; game.death = finishExpedition(profile, game.runId); save(); setMode('dead'); chrome(); const a = game.death; panel.className = 'modal-panel death-panel'; panel.innerHTML = `<div class="eyebrow">THE FLAME PASSES ON</div><div class="death-mark">✧</div><h2>A light never<br>truly <em>goes out.</em></h2><p>${a?.name || game.heir.name} reached chamber ${game.room.depth}.<br>Another descendant is waiting at the hearth.</p><div class="death-stats"><div><b>${game.light}</b><span>LIGHT BROUGHT HOME</span></div><div><b>${profile.wallet}</b><span>READY TO INVEST</span></div></div><button class="primary" id="reborn">Choose your descendant <span>↗</span></button><p class="small-note">All gathered light is already banked. No death penalty.</p>`; $('#reborn').onclick = () => { audio.play('boon'); showHearth(); }; focusPanel(); }
function draftBoon(source = 'light') {
    if (game.mode !== 'playing')
        return;
    if (source === 'light') {
        game.xp -= game.nextBoon;
        game.nextBoon = Math.ceil(game.nextBoon * 1.4);
        game.boonPending = game.xp >= game.nextBoon;
    }
    const options = shuffled(BOONS, randomFrom(`${game.seed}:boon:${game.room.depth}:${Object.values(game.boons).reduce((a, b) => a + b, 0)}:${source}`)).slice(0, 3);
    setMode('boon');
    audio.play('boon');
    panel.className = 'modal-panel wide-modal';
    panel.innerHTML = `<div class="eyebrow">${source === 'shrine' ? 'AN ANCIENT GIFT' : 'THE LIGHT WITHIN AWAKENS'}</div><h2>Become a little more <em>extraordinary.</em></h2><p>Choose a gift for this expedition. All three are beneficial.</p><div class="boon-cards">${options.map(b => `<button class="boon-card" data-boon="${b.id}"><span>${b.mark}</span><strong>${b.name}</strong><p>${b.description}</p><small>CHOOSE THIS GIFT ↗</small></button>`).join('')}</div>`;
    panel.querySelectorAll('[data-boon]').forEach(b => b.onclick = () => { const id = b.dataset.boon; game.boons[id] = (game.boons[id] || 0) + 1; game.stats = getStats(profile, game.heir, game.boons); if (id === 'heart')
        game.player.health = Math.min(game.stats.health, game.player.health + 2); setMode('playing'); toast(`${BOONS.find(x => x.id === id).name} awakened.`); });
    focusPanel();
}
function chooseRoute() {
    if (game.mode !== 'playing')
        return;
    const options = shuffled([{ id: 'wild', name: 'Follow the roots', mark: '❧', description: 'A winding path. A balanced mix of light and danger.' }, { id: 'cache', name: 'Chase the lanterns', mark: '✧', description: 'A richer hidden cache. Bring more light home.' }, { id: 'trial', name: 'Wake the sentinels', mark: '◇', description: 'More guardians, more hard-earned light.' }], randomFrom(`${game.seed}:${game.room.depth}:exits`)).slice(0, 2);
    setMode('route');
    panel.className = 'modal-panel wide-modal';
    panel.innerHTML = `<div class="eyebrow">CHAMBER ${game.room.depth} COMPLETE</div><h2>The hollow <em>branches.</em></h2><p>${(game.room.depth + 1) % 5 === 0 ? 'A Hollow Keeper guards the next threshold.' : 'Choose what lies beyond the threshold.'} Your light is already safe.</p><div class="route-cards">${options.map(r => `<button class="boon-card" data-route="${r.id}"><span>${r.mark}</span><strong>${r.name}</strong><p>${r.description}</p><small>CHAMBER ${game.room.depth + 1} ↗</small></button>`).join('')}</div>`;
    panel.querySelectorAll('[data-route]').forEach(b => b.onclick = () => enterRoom(b.dataset.route));
    focusPanel();
}
function enterRoom(route) { const old = game.player, depth = game.room.depth + 1; game.room = makeRoom(game.seed, depth, route); game.player = newPlayer(game.room, game.stats); game.player.health = Math.min(game.stats.health, old.health + game.stats.heal); game.camera = 0; clearEffects(); profile.active.depth = depth; profile.bestDepth = Math.max(profile.bestDepth, depth); save(); setMode('playing'); const biome = BIOMES.find(x => x.id === game.room.biome); toast(`${biome.name} · Chamber ${depth}${game.room.boss ? ' · A keeper stirs.' : ''}`); }
function interact() {
    const p = game.player, r = game.room, px = p.x + p.w / 2, near = (x, y, d = 85) => Math.hypot(px - x, p.y + p.h - y) < d;
    if (!r.chest.opened && near(r.chest.x, r.chest.y)) {
        r.chest.opened = true;
        collect(r.chest.value, r.chest.x, r.chest.y);
        audio.play('boon');
        toast(`Lantern cache found. +${r.chest.value} light, safely banked.`);
        return;
    }
    if (r.shrine && !r.shrine.used && near(r.shrine.x, r.shrine.y)) {
        r.shrine.used = true;
        draftBoon('shrine');
        return;
    }
    if (near(r.portal.x, r.portal.y, 105)) {
        if (r.enemies.some(e => e.type === 'guardian' && !e.dead)) {
            toast('Defeat the Hollow Keeper to release the seal.');
            return;
        }
        chooseRoute();
    }
}
function contextualHint() { const p = game.player, r = game.room, px = p.x + p.w / 2; let text = ''; if (Math.hypot(px - r.portal.x, p.y + p.h - r.portal.y) < 105)
    text = r.enemies.some(e => e.type === 'guardian' && !e.dead) ? 'Defeat the keeper to open the way' : 'E / ✧ · Enter the next chamber';
else if (!r.chest.opened && Math.hypot(px - r.chest.x, p.y + p.h - r.chest.y) < 85)
    text = 'E / ✧ · Open lantern cache';
else if (r.shrine && !r.shrine.used && Math.hypot(px - r.shrine.x, p.y + p.h - r.shrine.y) < 85)
    text = 'E / ✧ · Receive a shrine gift';
else if (game.t < 9)
    text = 'A / D to move · Space to jump twice · Shift to dash · J to pulse'; hint.textContent = text; hint.hidden = !text || game.mode !== 'playing'; }
function update(dt) {
    if (game.mode !== 'playing')
        return;
    game.t += dt;
    const p = game.player, r = game.room, previousBottom = p.y + p.h;
    const events = stepPlayer(p, input, r, game.stats, dt);
    const doInteract = input.interactPressed;
    consumeEdges();
    for (const event of events) {
        if (event === 'jump') {
            audio.play('jump');
            burst(p.x + p.w / 2, p.y + p.h, powerOf().color, 7);
        }
        if (event === 'dash') {
            game.dashSerial++;
            audio.play('dash');
        }
        if (event === 'pulse') {
            audio.play('pulse');
            const x = p.x + p.w / 2, y = p.y + p.h / 2;
            game.pulses.push({ x, y, radius: game.stats.pulseRadius, life: .3 });
            for (const e of r.enemies)
                if (!e.dead && Math.hypot(e.x - x, e.y - y) < game.stats.pulseRadius + (e.type === 'guardian' ? 40 : 22))
                    enemyHit(e, game.stats.damage);
        }
        if (event === 'fall') {
            p.x = p.safeX;
            p.y = p.safeY;
            p.vy = 0;
            p.vx = 0;
            p.dashT = 0;
            p.invuln = 0;
            playerHit(1);
            if (game.mode !== 'playing')
                return;
            toast('The hearth catches your spark. Your ward or a heart absorbs the fall.');
        }
    }
    if (p.dashT > 0 && game.motion) {
        game.afterimages.push({ x: p.x + p.w / 2, y: p.y + p.h, vx: p.vx, facing: p.facing, air: !p.onGround, life: .3 });
        if (game.afterimages.length > 18)
            game.afterimages.shift();
    }
    const px = p.x + p.w / 2, py = p.y + p.h / 2;
    for (const coin of r.coins) {
        if (coin.taken)
            continue;
        const dx = px - coin.x, dy = py - coin.y, d = Math.hypot(dx, dy);
        if (d < game.stats.magnet && d > 1) {
            const speed = Math.min(d, 400 * dt);
            coin.x += dx / d * speed;
            coin.y += dy / d * speed;
        }
        if (d < 25) {
            coin.taken = true;
            game.pickups++;
            collect(coin.value * (game.stats.bounty && game.pickups % 4 === 0 ? 2 : 1), coin.x, coin.y);
        }
    }
    for (const e of r.enemies) {
        if (e.dead)
            continue;
        e.phase += dt;
        e.flash = Math.max(0, e.flash - dt);
        if (Math.abs(e.x - px) > 950)
            continue;
        if (e.type === 'crawler' || e.type === 'spitter') {
            e.x += Math.sin(e.phase * .8) > 0 ? dt * (25 + r.difficulty * 3) : -dt * (25 + r.difficulty * 3);
            e.x = clamp(e.x, e.lo, e.hi);
        }
        else {
            e.x = clamp(e.x + Math.sin(e.phase) * dt * (e.type === 'guardian' ? 42 : 30), e.lo, e.hi);
            e.y = e.homeY + Math.sin(e.phase * 2) * 15;
        }
        if (e.type === 'spitter' || e.type === 'guardian') {
            e.cooldown -= dt;
            if (e.cooldown <= 0 && Math.abs(e.x - px) < 740) {
                e.cooldown = e.type === 'guardian' ? 2.4 : 3.2;
                const angle = Math.atan2(py - e.y, px - e.x), fan = e.type === 'guardian' ? [-.25, 0, .25] : [0];
                for (const offset of fan) {
                    game.projectiles.push({ x: e.x, y: e.y, vx: Math.cos(angle + offset) * 180, vy: Math.sin(angle + offset) * 180, life: 4 });
                }
                if (game.projectiles.length > 45)
                    game.projectiles.splice(0, game.projectiles.length - 45);
            }
        }
        const rad = e.type === 'guardian' ? 58 : 28;
        if (Math.abs(px - e.x) < rad + 12 && Math.abs(py - e.y) < rad + 14) {
            if (p.dashT > 0) {
                if (e.lastDash !== game.dashSerial) {
                    e.lastDash = game.dashSerial;
                    enemyHit(e, game.stats.damage * 1.5);
                }
            }
            else if (p.vy > 80 && previousBottom < e.y - rad * .25 && e.type !== 'guardian') {
                enemyHit(e, game.stats.damage);
                p.vy = -470;
                p.jumpsUsed = 1;
                audio.play('jump');
            }
            else {
                playerHit(e.type === 'guardian' ? 2 : 1);
                if (game.mode !== 'playing')
                    return;
            }
        }
    }
    for (const h of r.hazards)
        if (p.x + p.w > h.x && p.x < h.x + h.w && p.y + p.h > h.y + 2 && p.y < h.y + h.h) {
            playerHit();
            if (game.mode !== 'playing')
                return;
        }
    for (const q of game.projectiles) {
        q.x += q.vx * dt;
        q.y += q.vy * dt;
        q.life -= dt;
        if (Math.hypot(q.x - px, q.y - py) < 25) {
            q.life = 0;
            playerHit();
            if (game.mode !== 'playing')
                return;
        }
        if (r.platforms.some(pl => q.x > pl.x && q.x < pl.x + pl.w && q.y > pl.y && q.y < pl.y + 80))
            q.life = 0;
    }
    game.projectiles = game.projectiles.filter(q => q.life > 0);
    for (const q of game.particles) {
        q.x += q.vx * dt;
        q.y += q.vy * dt;
        q.vy += 160 * dt;
        q.life -= dt;
    }
    game.particles = game.particles.filter(q => q.life > 0);
    for (const f of game.floats) {
        f.y -= 24 * dt;
        f.life -= dt;
    }
    game.floats = game.floats.filter(f => f.life > 0);
    for (const a of game.afterimages)
        a.life -= dt;
    game.afterimages = game.afterimages.filter(a => a.life > 0);
    for (const q of game.pulses)
        q.life -= dt;
    game.pulses = game.pulses.filter(q => q.life > 0);
    game.shake = Math.max(0, game.shake - 30 * dt);
    const visibleWidth = renderer.viewWidth;
    const target = clamp(p.x - visibleWidth * .34, 0, Math.max(0, r.width - visibleWidth));
    game.camera += (target - game.camera) * (1 - Math.exp(-7 * dt));
    if (doInteract)
        interact();
    if (game.mode === 'playing' && game.boonPending && p.onGround && p.invuln <= 0)
        draftBoon();
}
function pause() { if (game.mode !== 'playing')
    return; setMode('paused'); save(); panel.className = 'modal-panel'; panel.innerHTML = `<div class="eyebrow">A MOMENT BY THE FIRE</div><h2>Catch your <em>breath.</em></h2><p>Take your time. The hollow will wait.</p><button class="primary" id="resume">Return to the hollow <span>↗</span></button><button class="secondary" id="return-hearth">End expedition & keep all light</button><div class="control-guide"><span>Move <b>A D / ← →</b></span><span>Jump / air jump <b>Space / ↑</b></span><span>Invulnerable dash <b>Shift / K</b></span><span>Light pulse <b>J / X</b></span><span>Open / enter <b>E / ↓</b></span><span>Pause <b>Esc / P</b></span></div><p class="small-note">Controller: stick / D-pad · A jump · B dash · X pulse · Y interact · Start pause<br>World seed: <span class="seed-text"></span></p>`; panel.querySelector('.seed-text').textContent = game.seed; $('#resume').onclick = () => { audio.unlock(); setMode('playing'); }; $('#return-hearth').onclick = () => { finishExpedition(profile, game.runId); save(); showHearth(); }; focusPanel(); }
const keyActions = { KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', Space: 'jump', KeyW: 'jump', ArrowUp: 'jump', ShiftLeft: 'dash', ShiftRight: 'dash', KeyK: 'dash', KeyJ: 'pulse', KeyX: 'pulse', KeyE: 'interact', ArrowDown: 'interact' };
window.addEventListener('keydown', e => { if (e.ctrlKey || e.metaKey || e.altKey || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName))
    return; if (e.code === 'Escape' || e.code === 'KeyP') {
    if (!e.repeat) {
        if (game.mode === 'playing')
            pause();
        else if (game.mode === 'paused')
            $('#resume')?.click();
    }
    e.preventDefault();
    return;
} const action = keyActions[e.code]; if (action && game.mode === 'playing') {
    e.preventDefault();
    audio.unlock();
    press(action, e.code);
} });
window.addEventListener('keyup', e => release(e.code));
for (const b of document.querySelectorAll('[data-control]')) {
    b.addEventListener('pointerdown', e => { if (game.mode !== 'playing')
        return; e.preventDefault(); audio.unlock(); b.setPointerCapture(e.pointerId); b.classList.add('held'); press(b.dataset.control, `pointer:${e.pointerId}`); });
    const up = e => { release(`pointer:${e.pointerId}`); b.classList.remove('held'); };
    b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', up);
    b.addEventListener('lostpointercapture', up);
}
let gamepadPrevious = [];
function pollGamepad() {
    const pad = navigator.getGamepads?.()[0];
    if (!pad)
        return;
    const pressed = i => !!pad.buttons[i]?.pressed;
    if (pressed(9) && !gamepadPrevious[9]) {
        if (game.mode === 'playing')
            pause();
        else if (game.mode === 'paused')
            $('#resume')?.click();
    }
    if (game.mode === 'playing') {
        const map = [[14, 'left'], [15, 'right'], [0, 'jump'], [1, 'dash'], [2, 'pulse'], [3, 'interact']];
        for (const [i, action] of map) {
            const held = i === 14 ? pressed(i) || (pad.axes[0] || 0) < -.25 : i === 15 ? pressed(i) || (pad.axes[0] || 0) > .25 : pressed(i);
            if (held)
                press(action, `pad:${i}`);
            else
                release(`pad:${i}`);
        }
    }
    gamepadPrevious = pad.buttons.map(x => x.pressed);
}
window.addEventListener('gamepaddisconnected', () => { for (const id of [...activeInputs.keys()])
    if (id.startsWith('pad:'))
        release(id); gamepadPrevious = []; });
$('#pause').onclick = pause;
$('.brand').onclick = e => { e.preventDefault(); if (!profile.active)
    showTitle(); };
$('#sound').onclick = () => { profile.settings.sound = !profile.settings.sound; if (profile.settings.sound)
    audio.unlock();
else
    audio.ctx?.suspend().catch(() => { }); save(); chrome(); };
$('#motion').onclick = () => { game.motion = !game.motion; profile.settings.motion = game.motion; save(); chrome(); };
$('#export').onclick = () => { const blob = new Blob([JSON.stringify(profile, null, 2)], { type: 'application/json' }), url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = 'ember-dash-lineage-save.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); toast('Your lineage save has been exported.'); };
$('#import').onclick = () => { if (profile.active) {
    toast('End your expedition before importing another lineage.');
    return;
} $('#save-file').click(); };
$('#save-file').onchange = async (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (!f)
    return; try {
    if (f.size > 65536)
        throw new Error('This save is too large.');
    const raw = JSON.parse(await f.text());
    if (raw.version !== 2)
        throw new Error('This is not an Ember Dash Lineage v2 save.');
    if (!confirm('Replace this browser’s lineage with the selected save? Export your current lineage first to keep a backup.'))
        return;
    profile = normalizeProfile(raw);
    if (profile.active)
        finishExpedition(profile, profile.active.id);
    readOnly = false;
    warning = '';
    save();
    game.heir = heirsFor(profile)[0];
    game.motion = profile.settings.motion;
    showHearth();
    toast('Lineage restored.');
}
catch (err) {
    toast(err.message || 'Could not read this save.');
} };
window.addEventListener('blur', () => { clearInput(); if (game.mode === 'playing')
    pause(); });
document.addEventListener('visibilitychange', () => { clearInput(); if (document.hidden) {
    if (game.mode === 'playing')
        pause();
    save();
    audio.ctx?.suspend().catch(() => { });
} });
window.addEventListener('pagehide', save);
window.addEventListener('storage', e => { if (e.key !== 'ember-lineage-v2' || !e.newValue)
    return; readOnly = true; warning = 'Another tab changed this lineage. Reload before continuing, or export this tab’s progress.'; if (game.mode === 'playing')
    pause(); const resume = $('#resume'); if (resume) {
    resume.disabled = true;
    resume.textContent = 'Reload to use the updated lineage';
} toast(warning); chrome(); });
window.addEventListener('resize', () => { renderer.resize(); if(game.player)game.camera=clamp(game.player.x-renderer.viewWidth*.34,0,Math.max(0,game.room.width-renderer.viewWidth)); });
let last = 0, accumulator = 0, hudClock = 0, manual = false;
function frame(now) {
    const dt = last ? Math.min(.1, (now - last) / 1000) : 0;
    last = now;
    game.visualTime += dt;
    pollGamepad();
    if (!manual && game.mode === 'playing') {
        accumulator += dt;
        let steps = 0;
        while (accumulator >= FIXED_DT && steps++ < 12) {
            update(FIXED_DT);
            accumulator -= FIXED_DT;
        }
        if (steps >= 12)
            accumulator = 0;
    }
    else
        accumulator = 0;
    if (!document.hidden) {
        renderer.render(game);
        audio.tick(dt);
    }
    hudClock += dt;
    if (hudClock > .08) {
        if (game.player) {
            updateHud();
            contextualHint();
        }
        hudClock = 0;
    }
    requestAnimationFrame(frame);
}
window.render_game_to_text = () => JSON.stringify({ mode: game.mode, seed: game.seed, depth: game.room.depth, biome: game.room.biome, heir: { ...game.heir }, stats: game.stats, player: game.player ? { ...game.player } : null, wallet: profile.wallet, runLight: game.light, generation: profile.generation, boons: game.boons, portal: game.room.portal, platforms: game.room.platforms, ledges: game.room.ledges, enemies: game.room.enemies.map(e => ({ id: e.id, type: e.type, x: e.x, y: e.y, hp: e.hp, dead: e.dead })), chest: game.room.chest, shrine: game.room.shrine, warning });
if (new URLSearchParams(location.search).has('test') || globalThis.__EMBER_TEST_MODE__ === true) {
    window.advanceTime = ms => { manual = true; for (let i = 0; i < Math.ceil(clamp(ms, 0, 60000) / (FIXED_DT * 1000)); i++)
        update(FIXED_DT); renderer.render(game); updateHud(); contextualHint(); };
    window.__emberTest = { state: () => ({ profile, game }), hit: () => { game.player.invuln = 0; playerHit(1); }, teleport: (x, y) => { game.player.x = x; game.player.y = y; game.player.vy = 0; }, award: n => collect(n, game.player.x, game.player.y), nextRoom: route => enterRoom(route || 'wild'), stopClock: () => { manual = true; }, resumeClock: () => { manual = false; }, setEnemyHP: (id, hp) => { const e = game.room.enemies.find(e => e.id === id); if (e)
            e.hp = hp; } };
}
chrome();
showTitle();
requestAnimationFrame(frame);
