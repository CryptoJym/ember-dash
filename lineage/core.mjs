/** Ember Dash: Lineage. Pure, deterministic gameplay and persistence rules. */
export const VIEW_W = 1280, VIEW_H = 720, FIXED_DT = 1 / 120;
export const PHYSICS = Object.freeze({ gravity: 2150, apexGravity: 1180, jump: -735, jumpCut: -330, speed: 325, groundAcceleration: 4600, airAcceleration: 2600, groundFriction: 5200, airFriction: 700, dashSpeed: 860, fall: 1120, coyote: .16, buffer: .18, landingSnap: 10, width: 34, height: 38 });
export const POWERS = Object.freeze([
    { id: 'ember', name: 'Vulpax', title: 'The fire remembers.', color: '#ffaf64', dark: '#b74834', mark: '✹', skill: 'Fireburst', detail: 'Your pulse burns brighter. +40% pulse damage and a wider blast.', bonus: 'Blazing pulse', damage: 1.4, radius: 1.2 },
    { id: 'tide', name: 'Nivalis', title: 'A quiet kind of power.', color: '#8bdeef', dark: '#487fb4', mark: '☾', skill: 'Moonward', detail: 'Begin every chamber with a ward that absorbs one hit.', bonus: 'One shield each room', ward: 1 },
    { id: 'gale', name: 'Sylra', title: 'Born between the winds.', color: '#b9efc1', dark: '#4d9c89', mark: '≋', skill: 'Skybound', detail: 'An extra air jump and a quicker stride. Reach the hidden paths.', bonus: 'Triple jump · +12% speed', jumps: 1, speed: 1.12 },
    { id: 'void', name: 'Umbra', title: 'A little piece of infinity.', color: '#c3a4fb', dark: '#7353b8', mark: '✧', skill: 'Starstep', detail: 'Dash farther, and recover your dash 35% sooner.', bonus: 'Longer, faster-cooling dash', dash: 1.25, cooldown: .65 },
    { id: 'sun', name: 'Lumen', title: 'Carry the dawn with you.', color: '#f4df8b', dark: '#ba8d3a', mark: '☀', skill: 'Lightkeeper', detail: 'Gather light from farther away. Every fourth mote is worth double.', bonus: 'Light magnet · bonus light', magnet: 1.85, bounty: true },
    { id: 'bloom', name: 'Verdara', title: 'Life finds a way.', color: '#eca8c1', dark: '#a35385', mark: '❀', skill: 'Renewal', detail: 'More vitality, and heal one heart after completing a chamber.', bonus: '+1 heart · room healing', health: 1, heal: 1 },
]);
export const ECHOES = Object.freeze([
    { id: 'bold', name: 'Bold spirit', description: '+15% pulse damage', damage: .15 },
    { id: 'nimble', name: 'Nimble paws', description: '+8% movement speed', speed: .08 },
    { id: 'kindled', name: 'Kindled heart', description: '+1 maximum heart', health: 1 },
    { id: 'keen', name: 'Keen senses', description: '+35% light attraction', magnet: .35 },
]);
export const UPGRADES = Object.freeze([
    { id: 'vitality', name: 'Heartwood', icon: '♡', description: 'One more heart for every descendant.', base: 32, growth: 1.65, max: 6 },
    { id: 'power', name: 'Inner fire', icon: '✹', description: 'Pulses deal 18% more damage.', base: 26, growth: 1.6, max: 8 },
    { id: 'magnet', name: 'Guiding light', icon: '✧', description: 'Collect light from 20% farther away.', base: 20, growth: 1.55, max: 6 },
    { id: 'haste', name: 'Quickening', icon: '↠', description: 'Dash recharges 9% faster.', base: 28, growth: 1.65, max: 6 },
]);
export const BOONS = Object.freeze([
    { id: 'fire', name: 'Sunfire', mark: '✹', description: '+30% pulse damage this expedition.' },
    { id: 'reach', name: 'Wide awakening', mark: '◉', description: '+22% pulse radius this expedition.' },
    { id: 'wings', name: 'Featherfall', mark: '≋', description: 'One additional air jump this expedition.' },
    { id: 'heart', name: 'Heart of the hollow', mark: '♡', description: '+1 maximum heart. Restore two hearts.' },
    { id: 'dash', name: 'Starlight step', mark: '↠', description: 'Dash recharges 20% faster this expedition.' },
    { id: 'magnet', name: 'A thousand fireflies', mark: '✧', description: '+50% light attraction this expedition.' },
]);
export const BIOMES = Object.freeze([
    { id: 'grove', name: 'The Lanternwild', eyebrow: 'Roots of a forgotten world', sky: ['#081c22', '#153b3a', '#254a43'], stone: '#1a3235', edge: '#659283', accent: '#e5b96e', fog: '#598b78' },
    { id: 'frost', name: 'The Glass Cathedral', eyebrow: 'Where moonlight sleeps', sky: ['#10172c', '#23324d', '#3b5669'], stone: '#263544', edge: '#6d9caa', accent: '#b3e7e9', fog: '#57869b' },
    { id: 'cinder', name: 'The Cinder Below', eyebrow: 'Even ashes hold a spark', sky: ['#200f24', '#482937', '#68423b'], stone: '#392b3b', edge: '#ac7370', accent: '#f5ac7c', fog: '#875868' },
]);
export function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
export function hashSeed(text) { let h = 2166136261; for (const c of String(text)) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
} return h >>> 0; }
export function randomFrom(seed) { let a = hashSeed(seed); return () => { a += 0x6d2b79f5; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export function shuffled(items, rnd) { const out = [...items]; for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
} return out; }
export function freshProfile() { return { version: 2, revision: 0, wallet: 0, generation: 1, bestDepth: 0, totalLight: 0, upgrades: { vitality: 0, power: 0, magnet: 0, haste: 0 }, lineage: [], active: null, settings: { sound: true, motion: true }, familySeed: '', lastPower: null }; }
const safeName = v => String(v || 'Ember').replace(/[^\p{L}\p{N} '\-]/gu, '').slice(0, 30) || 'Ember';
const saneInt = (v, max = 100000000) => Number.isFinite(v) ? clamp(Math.floor(v), 0, max) : 0;
export function normalizeProfile(raw) {
    const p = freshProfile();
    if (!raw || typeof raw !== 'object' || raw.version !== 2)
        return p;
    p.wallet = saneInt(raw.wallet);
    p.generation = Math.max(1, saneInt(raw.generation));
    p.revision = saneInt(raw.revision);
    p.totalLight = Math.max(p.wallet, saneInt(raw.totalLight));
    p.bestDepth = saneInt(raw.bestDepth, 100000);
    for (const u of UPGRADES)
        p.upgrades[u.id] = saneInt(raw.upgrades?.[u.id], u.max);
    p.familySeed = typeof raw.familySeed === 'string' ? raw.familySeed.slice(0, 64) : '';
    p.lastPower = POWERS.some(x => x.id === raw.lastPower) ? raw.lastPower : null;
    p.settings.sound = raw.settings?.sound !== false;
    p.settings.motion = raw.settings?.motion !== false;
    p.lineage = Array.isArray(raw.lineage) ? raw.lineage.slice(-12).filter(x => x && POWERS.some(a => a.id === x.power)).map(x => ({ name: safeName(x.name), power: x.power, depth: saneInt(x.depth, 100000), light: saneInt(x.light), generation: saneInt(x.generation) })) : [];
    if (raw.active && typeof raw.active.id === 'string' && POWERS.some(x => x.id === raw.active.power))
        p.active = { id: raw.active.id.slice(0, 80), power: raw.active.power, name: safeName(raw.active.name), depth: Math.max(1, saneInt(raw.active.depth, 100000)), light: saneInt(raw.active.light), generation: Math.max(1, saneInt(raw.active.generation)) };
    return p;
}
export function loadProfile(storage) {
    try {
        const raw = storage.getItem('ember-lineage-v2');
        if (!raw)
            return { profile: freshProfile(), warning: '' };
        const data = JSON.parse(raw);
        if (data.version !== 2)
            return { profile: freshProfile(), warning: 'This save uses another version. Your original save has been left untouched.', readOnly: true };
        return { profile: normalizeProfile(data), warning: '' };
    }
    catch {
        return { profile: freshProfile(), warning: 'Browser saving is unavailable or the save could not be read. You can still play and export a save.', readOnly: true };
    }
}
export function persistProfile(storage, profile) { try {
    storage.setItem('ember-lineage-v2', JSON.stringify(profile));
    return true;
}
catch {
    return false;
} }
export function upgradeCost(id, level) { const u = UPGRADES.find(x => x.id === id); if (!u || !Number.isInteger(level) || level < 0 || level >= u.max)
    return null; return Math.ceil(u.base * Math.pow(u.growth, level)); }
export function buyUpgrade(profile, id) {
    const u = UPGRADES.find(x => x.id === id);
    if (!u || profile.active)
        return { ok: false, reason: 'Return to the hearth first.' };
    const cost = upgradeCost(id, profile.upgrades[id]);
    if (cost === null)
        return { ok: false, reason: 'Fully awakened.' };
    if (profile.wallet < cost)
        return { ok: false, reason: 'More light is needed.' };
    profile.wallet -= cost;
    profile.upgrades[id]++;
    profile.revision++;
    return { ok: true, cost };
}
const FOX_NAMES = ['Ari','Aster','Briar','Cael','Calyx','Cirrus','Elowen','Ever','Fable','Fen','Halo','Ilyra','Juniper','Kestrel','Liora','Luma','Lyra','Mica','Neri','Nova','Orin','Perrin','Quill','Riven','Rowan','Rune','Sable','Sora','Tarin','Thistle','Vale','Vesper','Wren','Yara','Zevi','Auren','Bramble','Cirra','Damar','Eira','Flint','Galen','Hollis','Iskra','Kiri','Morrow','Nyx','Oriel'];
export function heirsFor(profile) {
    const rnd = randomFrom(`${profile.familySeed}:${profile.generation}:heirs`), powers = shuffled(POWERS, rnd).slice(0, 3);
    const recent = new Set((profile.lineage || []).slice(-12).map(x => x.name));
    const pool = shuffled(FOX_NAMES, rnd), chosen = new Set();
    return powers.map((p, i) => { let name = pool.find(n => !recent.has(n) && !chosen.has(n)) || pool.find(n => !chosen.has(n)) || `${p.name} ${profile.generation}`; chosen.add(name); return { power: p.id, name, echo: ECHOES[Math.floor(rnd() * ECHOES.length)].id, generation: profile.generation, ancestor: profile.lastPower, index: i }; });
}
export function getStats(profile, heir, boons = {}) {
    const power = POWERS.find(x => x.id === heir.power) || POWERS[0], echo = ECHOES.find(x => x.id === heir.echo) || ECHOES[0];
    return { health: 5 + profile.upgrades.vitality + (power.health || 0) + (echo.health || 0) + (boons.heart || 0), speed: PHYSICS.speed * (power.speed || 1) * (1 + (echo.speed || 0)), jumps: 2 + (power.jumps || 0) + (boons.wings || 0), damage: (power.damage || 1) * (1 + profile.upgrades.power * .18 + (boons.fire || 0) * .30 + (echo.damage || 0)), pulseRadius: 108 * (power.radius || 1) * (1 + (boons.reach || 0) * .22), dashDuration: .19 * (power.dash || 1), dashCooldown: Math.max(.5, 1.7 * (power.cooldown || 1) * (1 - profile.upgrades.haste * .09) * Math.pow(.8, boons.dash || 0)), magnet: 66 * (power.magnet || 1) * (1 + profile.upgrades.magnet * .2 + (boons.magnet || 0) * .5 + (echo.magnet || 0)), ward: power.ward || 0, heal: power.heal || 0, bounty: !!power.bounty };
}
export function beginExpedition(profile, heir, id) { if (profile.active)
    return false; profile.active = { id, power: heir.power, name: heir.name, generation: profile.generation, depth: 1, light: 0 }; profile.revision++; return true; }
export function awardLight(profile, id, amount) { if (!profile.active || profile.active.id !== id || !Number.isInteger(amount) || amount < 1 || amount > 1000)
    return false; profile.wallet += amount; profile.totalLight += amount; profile.active.light += amount; profile.revision++; return true; }
export function finishExpedition(profile, id) { if (!profile.active || profile.active.id !== id)
    return null; const a = { ...profile.active }; profile.bestDepth = Math.max(profile.bestDepth, a.depth); profile.lineage.push({ name: a.name, power: a.power, depth: a.depth, light: a.light, generation: a.generation }); profile.lineage = profile.lineage.slice(-12); profile.lastPower = a.power; profile.generation++; profile.active = null; profile.revision++; return a; }
export function makeRoom(seed, depth = 1, route = 'wild') {
    depth = Math.max(1, Math.floor(depth));
    const rnd = randomFrom(`${seed}:room:${depth}:${route}`), biome = BIOMES[Math.floor((depth - 1) / 5) % BIOMES.length];
    const boss = depth % 5 === 0, difficulty = Math.min(12, Math.floor((depth - 1) / 2));
    const platforms = [], coins = [], enemies = [], hazards = [], ledges = [];
    let x = 0, y = 548;
    const count = boss ? 7 : 8 + Math.min(3, Math.floor(depth / 5));
    for (let i = 0; i < count; i++) {
        const w = i === 0 ? 440 : i === count - 1 ? (boss ? 650 : 440) : 260 + Math.floor(rnd() * 150);
        const platform = { x, y, w, h: 220 + Math.floor(rnd() * 110), index: i, kind: 'ground' };
        platforms.push(platform);
        if (i > 0 && i < count - 1) {
            for (let j = 0; j < 4; j++)
                coins.push({ id: `${i}:${j}`, x: x + 35 + j * (w - 70) / 3, y: y - 42 - (j === 1 || j === 2 ? 12 : 0), value: 1, taken: false });
            if (i % 3 === 2) {
                const ledge = { x: x + 35, y: y - 108, w: 125, h: 28, index: i, kind: 'ledge' };
                ledges.push(ledge);
                for (let j = 0; j < 3; j++)
                    coins.push({ id: `secret:${i}:${j}`, x: ledge.x + 25 + j * 35, y: ledge.y - 27, value: 2, taken: false });
            }
            if ((i >= 2 || depth > 1) && rnd() < Math.min(.88, .38 + difficulty * .06 + (route === 'trial' ? .16 : 0))) {
                const type = depth >= 3 && rnd() < .35 ? 'spitter' : rnd() < .35 ? 'wisp' : 'crawler';
                enemies.push({ id: `mob:${i}`, type, x: x + w * .6, y: y - (type === 'wisp' ? 100 : 26), homeY: y - (type === 'wisp' ? 100 : 26), lo: x + 25, hi: x + w - 25, hp: 1.5 + Math.min(5, difficulty) * .4, maxHp: 1.5 + Math.min(5, difficulty) * .4, phase: rnd() * 6.28, cooldown: 1.5 + rnd(), dead: false, flash: 0 });
            }
            if (depth >= 3 && i % 3 === 0)
                hazards.push({ x: x + w - 70, y: y - 12, w: 36, h: 12 });
        }
        x += w;
        if (i < count - 1) {
            x += 44 + Math.floor(rnd() * 30);
            y = clamp(y + Math.floor(rnd() * 53) - 26, 496, 556);
        }
    }
    const end = platforms.at(-1), portal = { x: end.x + end.w - 115, y: end.y };
    if (boss)
        enemies.push({ id: 'guardian', type: 'guardian', x: end.x + 250, y: end.y - 70, homeY: end.y - 70, lo: end.x + 70, hi: end.x + end.w - 180, hp: 10 + Math.min(20, Math.floor(depth / 5)) * 3, maxHp: 10 + Math.min(20, Math.floor(depth / 5)) * 3, phase: 0, cooldown: 2, dead: false, flash: 0 });
    const chestPlatform = platforms[route === 'cache' ? 3 : 5];
    return { seed: String(seed), depth, route, biome: biome.id, boss, difficulty, width: x, platforms, ledges, coins, enemies, hazards, portal, chest: { x: chestPlatform.x + 65, y: chestPlatform.y - 25, opened: false, value: route === 'cache' ? 15 : 8 }, shrine: depth % 2 === 0 ? { x: platforms[4].x + 60, y: platforms[4].y, used: false } : null, spawn: { x: 105, y: 548 - PHYSICS.height }, decoSeed: hashSeed(`${seed}:${depth}:decor`) };
}
export function routeIsReachable(room) {
    return room.platforms.every((p, i) => { if (!i)
        return true; const prev = room.platforms[i - 1], gap = p.x - prev.x - prev.w, rise = prev.y - p.y; const d = PHYSICS.jump ** 2 - 2 * PHYSICS.gravity * rise; if (d < 0)
        return false; const flight = (-PHYSICS.jump + Math.sqrt(d)) / PHYSICS.gravity; return gap + PHYSICS.width + 24 < PHYSICS.speed * flight && p.w >= PHYSICS.width * 3; });
}
export function newPlayer(room, stats) { return { x: room.spawn.x, y: room.spawn.y, vx: 0, vy: 0, w: PHYSICS.width, h: PHYSICS.height, facing: 1, onGround: true, coyote: PHYSICS.coyote, jumpBuffer: 0, jumpsUsed: 0, dashT: 0, dashCd: 0, pulseCd: 0, invuln: 1, health: stats.health, ward: stats.ward, safeX: room.spawn.x, safeY: room.spawn.y }; }
/** The renderer and automated tests both drive this exact fixed-step integrator. */
export function stepPlayer(p, input, room, stats, dt = FIXED_DT) {
    const events = [];
    p.invuln = Math.max(0, p.invuln - dt); p.dashCd = Math.max(0, p.dashCd - dt); p.pulseCd = Math.max(0, p.pulseCd - dt); p.jumpBuffer = Math.max(0, p.jumpBuffer - dt);
    if (input.jumpPressed) p.jumpBuffer = PHYSICS.buffer;
    if (p.onGround) { p.coyote = PHYSICS.coyote; p.jumpsUsed = 0; } else p.coyote = Math.max(0, p.coyote - dt);
    const dir = Number(!!input.right) - Number(!!input.left); if (dir) p.facing = dir;
    if (input.dashPressed && p.dashCd <= 0) { p.dashT = stats.dashDuration; p.dashCd = stats.dashCooldown; p.invuln = Math.max(p.invuln, p.dashT + .10); p.vx = (dir || p.facing) * PHYSICS.dashSpeed; p.vy *= .12; events.push('dash'); }
    if (input.pulsePressed && p.pulseCd <= 0) { p.pulseCd = .48; events.push('pulse'); }
    if (p.jumpBuffer > 0 && (p.onGround || p.coyote > 0 || p.jumpsUsed < stats.jumps)) {
        if (!p.onGround && p.coyote <= 0) p.jumpsUsed = Math.max(1, p.jumpsUsed);
        if (p.jumpsUsed < stats.jumps) { p.vy = PHYSICS.jump; p.jumpsUsed++; p.onGround = false; p.coyote = 0; p.jumpBuffer = 0; p.dashT = 0; events.push('jump'); }
    }
    if (input.jumpReleased && p.vy < PHYSICS.jumpCut) p.vy = PHYSICS.jumpCut;
    if (p.dashT > 0) { p.dashT = Math.max(0, p.dashT - dt); p.vx = p.facing * PHYSICS.dashSpeed; p.vy += PHYSICS.gravity * .10 * dt; }
    else {
        const accel = p.onGround ? PHYSICS.groundAcceleration : PHYSICS.airAcceleration, friction = p.onGround ? PHYSICS.groundFriction : PHYSICS.airFriction;
        if (dir) p.vx += clamp(dir * stats.speed - p.vx, -accel * dt, accel * dt);
        else p.vx += clamp(-p.vx, -friction * dt, friction * dt);
        const nearApex = Math.abs(p.vy) < 115, g = nearApex ? PHYSICS.apexGravity : PHYSICS.gravity; p.vy = Math.min(PHYSICS.fall, p.vy + g * dt);
    }
    const oldY = p.y, wasGrounded = p.onGround; p.x = clamp(p.x + p.vx * dt, 0, room.width - p.w); p.y += p.vy * dt; p.onGround = false;
    if (p.vy >= 0) {
        for (const pl of [...room.platforms, ...room.ledges]) {
            const feet0 = oldY + p.h, feet1 = p.y + p.h, withinX = p.x + p.w > pl.x + 2 && p.x < pl.x + pl.w - 2;
            if (withinX && feet0 <= pl.y + PHYSICS.landingSnap && feet1 >= pl.y) { p.y = pl.y - p.h; p.vy = 0; p.onGround = true; p.jumpsUsed = 0; if (!wasGrounded) events.push('land'); if (pl.kind === 'ground' && p.x > pl.x + 18 && p.x + p.w < pl.x + pl.w - 18 && !room.hazards.some(h => p.x + p.w + 22 > h.x && p.x - 22 < h.x + h.w && Math.abs(pl.y - h.y) < 30)) { p.safeX = p.x; p.safeY = p.y; } break; }
        }
    }
    if (p.y > VIEW_H + 80) events.push('fall');
    return events;
}
export function takeHit(p, damage = 1) { if (p.invuln > 0)
    return false; if (p.ward > 0)
    p.ward--;
else
    p.health = Math.max(0, p.health - damage); p.invuln = 1.3; return true; }
