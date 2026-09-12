import test from 'node:test';
import assert from 'node:assert/strict';
import { FIXED_DT, PHYSICS, POWERS, ECHOES, UPGRADES, BOONS, randomFrom, freshProfile, normalizeProfile, loadProfile, persistProfile, upgradeCost, buyUpgrade, heirsFor, getStats, beginExpedition, awardLight, finishExpedition, makeRoom, routeIsReachable, newPlayer, stepPlayer, takeHit } from '../lineage/core.mjs';
const makeStore = () => { const map = new Map(); return { getItem: k => map.get(k) ?? null, setItem: (k, v) => map.set(k, String(v)), map }; };
const base = () => { const profile = freshProfile(); profile.familySeed = 'test-family'; return profile; };
const heir = { power: 'tide', echo: 'keen', name: 'Aster', generation: 1 };
const neutralStats = () => getStats(base(), heir);
const noInput = {};
function ticks(player, input, room, stats, count) { let events = []; for (let i = 0; i < count; i++)
    events.push(...stepPlayer(player, input, room, stats)); return events; }
test('seed stream is deterministic, finite, and never returns one', () => { const a = randomFrom('abc'), b = randomFrom('abc'); for (let i = 0; i < 10000; i++) {
    const x = a();
    assert.equal(x, b());
    assert.ok(x >= 0 && x < 1);
} assert.notEqual(randomFrom('a')(), randomFrom('b')()); });
test('9,000 generated chambers have a safe main-route envelope and supported placements', () => { for (let i = 0; i < 300; i++)
    for (const depth of [1, 2, 3, 4, 5, 6, 10, 11, 16, 99])
        for (const route of ['wild', 'cache', 'trial']) {
            const room = makeRoom(`seed-${i}`, depth, route);
            assert.ok(routeIsReachable(room), `${i}:${depth}:${route}`);
            assert.ok(room.width > 1280);
            assert.equal(room.platforms[0].y - room.spawn.y, PHYSICS.height);
            assert.ok(room.platforms.at(-1).x < room.portal.x);
            assert.equal(room.enemies.some(e => e.type === 'guardian'), depth % 5 === 0);
            assert.equal(room.hazards.length > 0, depth >= 3);
            for (const c of room.coins)
                assert.ok(Number.isFinite(c.x) && Number.isFinite(c.y));
        } });
test('same seed, depth and route replay identical geometry and encounters', () => { for (let i = 1; i < 31; i++)
    assert.deepEqual(makeRoom('rowan', i, 'trial'), makeRoom('rowan', i, 'trial')); });
test('new seeds change the first room, not only later terrain', () => { const rooms = new Set(Array.from({ length: 300 }, (_, i) => JSON.stringify(makeRoom(`fresh-${i}`)))); assert.equal(rooms.size, 300); assert.notDeepEqual(makeRoom('a'), makeRoom('b')); });
test('three biomes cycle in five-chamber bands and difficulty is bounded', () => { assert.equal(makeRoom('a', 1).biome, 'grove'); assert.equal(makeRoom('a', 6).biome, 'frost'); assert.equal(makeRoom('a', 11).biome, 'cinder'); assert.equal(makeRoom('a', 16).biome, 'grove'); assert.equal(makeRoom('a', 10000).difficulty, 12); });
test('route choices alter content; cache route has a richer chest', () => { assert.equal(makeRoom('seed', 2, 'cache').chest.value, 15); assert.equal(makeRoom('seed', 2, 'wild').chest.value, 8); assert.notDeepEqual(makeRoom('seed', 3, 'wild').platforms, makeRoom('seed', 3, 'trial').platforms); });
// Exercise the SAME integrator as the browser, not just a geometric inequality.
test('every mandatory gap in 1,000 chambers can be crossed with a baseline held jump', () => { for (let i = 0; i < 1000; i++) {
    const room = makeRoom(`jump-${i}`, i % 40 + 1);
    const stats = neutralStats();
    for (let j = 1; j < room.platforms.length; j++) {
        const from = room.platforms[j - 1], to = room.platforms[j];
        const p = newPlayer(room, stats);
        p.x = from.x + from.w - PHYSICS.width - 8;
        p.y = from.y - PHYSICS.height;
        p.vx = stats.speed;
        let crossed = false;
        for (let k = 0; k < 160; k++) {
            const ev = stepPlayer(p, { right: true, jumpPressed: k === 0 }, room, stats);
            if (p.onGround && p.x >= to.x && p.x + p.w <= to.x + to.w) {
                crossed = true;
                break;
            }
            if (ev.includes('fall'))
                break;
        }
        assert.ok(crossed, `seed ${i}, gap ${j}, y ${from.y}->${to.y}`);
    }
} });
test('a corrupt or unsupported save is preserved and cannot silently overwrite its bytes', () => { for (const raw of ['not json', '{"version":9,"wallet":99}', 'null']) {
    const store = makeStore();
    store.setItem('ember-lineage-v2', raw);
    const loaded = loadProfile(store);
    assert.equal(loaded.readOnly, true);
    assert.equal(loaded.profile.wallet, 0);
    assert.equal(store.getItem('ember-lineage-v2'), raw);
    assert.ok(loaded.warning);
} });
test('blocked reads and writes do not prevent initialization or memory-only play', () => { const bad = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('quota'); } }; assert.equal(loadProfile(bad).readOnly, true); assert.equal(persistProfile(bad, base()), false); assert.equal(loadProfile(null).readOnly, true); });
test('save normalizer bounds numbers, strips unknown upgrades, and sanitizes display names', () => { const p = normalizeProfile({ version: 2, wallet: -12, generation: NaN, bestDepth: Infinity, upgrades: { vitality: 900, power: -6, haste: 2.8, evil: 100 }, lineage: [{ power: 'ember', name: '<img src=x onerror=alert(1)>', depth: 1 }, { power: 'evil' }], active: { id: 'x', power: 'tide', name: '<script>alert(1)</script>', light: -1 } }); assert.equal(p.wallet, 0); assert.equal(p.generation, 1); assert.equal(p.upgrades.vitality, 6); assert.equal(p.upgrades.haste, 2); assert.equal(p.upgrades.power, 0); assert.equal(p.upgrades.evil, undefined); assert.equal(p.lineage.length, 1); assert.ok(!p.lineage[0].name.includes('<')); assert.ok(!p.active.name.includes('<')); });
test('earning, spending, saving and loading preserve a single currency ledger', () => { const p = base(), s = makeStore(); assert.equal(beginExpedition(p, heir, 'run-a'), true); assert.equal(awardLight(p, 'run-a', 50), true); assert.equal(p.wallet, 50); assert.equal(p.active.light, 50); assert.equal(buyUpgrade(p, 'magnet').ok, false); finishExpedition(p, 'run-a'); assert.equal(buyUpgrade(p, 'magnet').ok, true); assert.equal(p.wallet, 30); assert.equal(p.totalLight, 50); assert.equal(p.upgrades.magnet, 1); assert.ok(persistProfile(s, p)); assert.deepEqual(loadProfile(s).profile, p); });
test('death settlement is idempotent: no double light and no duplicate descendants', () => { const p = base(); beginExpedition(p, heir, 'a'); awardLight(p, 'a', 17); assert.ok(finishExpedition(p, 'a')); assert.equal(finishExpedition(p, 'a'), null); assert.equal(p.wallet, 17); assert.equal(p.generation, 2); assert.equal(p.lineage.length, 1); assert.equal(p.lastPower, 'tide'); });
test('stale run IDs cannot award currency or end a newer expedition', () => { const p = base(); beginExpedition(p, heir, 'new'); assert.equal(awardLight(p, 'old', 20), false); assert.equal(finishExpedition(p, 'old'), null); assert.equal(p.wallet, 0); assert.equal(p.active.id, 'new'); for (const x of [-1, 0, 1.2, Infinity, 1001])
    assert.equal(awardLight(p, 'new', x), false); });
test('upgrade purchases cannot overspend, exceed a cap, or use an unknown identifier', () => { const p = base(); assert.equal(buyUpgrade(p, 'power').ok, false); assert.equal(buyUpgrade(p, '__proto__').ok, false); p.wallet = 100000; for (const u of UPGRADES) {
    for (let i = 0; i < u.max; i++) {
        const before = p.wallet, cost = upgradeCost(u.id, i);
        assert.ok(buyUpgrade(p, u.id).ok);
        assert.equal(p.wallet, before - cost);
    }
    assert.equal(buyUpgrade(p, u.id).ok, false);
    assert.equal(upgradeCost(u.id, u.max), null);
} });
test('each generation offers three distinct, deterministic positive bloodlines', () => { const p = base(); const a = heirsFor(p); assert.equal(a.length, 3); assert.equal(new Set(a.map(h => h.power)).size, 3); assert.deepEqual(a, heirsFor(p)); for (const h of a)
    assert.ok(ECHOES.some(e => e.id === h.echo)); p.generation++; assert.notDeepEqual(a, heirsFor(p)); });
test('all six bloodlines have distinct colors and no below-baseline penalty', () => { assert.equal(new Set(POWERS.map(p => p.color)).size, 6); for (const power of POWERS)
    for (const echo of ECHOES) {
        const s = getStats(base(), { power: power.id, echo: echo.id });
        assert.ok(s.health >= 5);
        assert.ok(s.speed >= 285);
        assert.ok(s.jumps >= 2);
        assert.ok(s.damage >= 1);
        assert.ok(s.magnet >= 66);
        assert.ok(s.dashCooldown <= 1.7);
        assert.ok(s.dashDuration >= .19);
    } });
test('every boon is a positive persistent-for-run stat increase', () => { const p = base(), before = getStats(p, heir); for (const b of BOONS) {
    const after = getStats(p, heir, { [b.id]: 1 });
    for (const key of ['health', 'speed', 'jumps', 'damage', 'pulseRadius', 'magnet'])
        assert.ok(after[key] >= before[key]);
    assert.ok(after.dashCooldown <= before.dashCooldown);
    assert.notDeepEqual(after, before);
} });
test('fixed-step movement matches across equivalent frame groupings', () => { const room = makeRoom('time'), stats = neutralStats(), a = newPlayer(room, stats), b = newPlayer(room, stats); ticks(a, { right: true }, room, stats, 120); for (let frame = 0; frame < 60; frame++)
    ticks(b, { right: true }, room, stats, 2); assert.deepEqual(a, b); });
test('jump cut creates a lower apex than a held jump', () => { const room = makeRoom('time'), stats = neutralStats(); const high = newPlayer(room, stats), low = newPlayer(room, stats); let hy = 999, ly = 999; for (let i = 0; i < 90; i++) {
    stepPlayer(high, { jumpPressed: i === 0 }, room, stats);
    stepPlayer(low, { jumpPressed: i === 0, jumpReleased: i === 10 }, room, stats);
    hy = Math.min(hy, high.y);
    ly = Math.min(ly, low.y);
} assert.ok(hy < ly - 25); });
test('air jumps obey the inherited limit and holding does not auto-bounce', () => { const room = makeRoom('limit'), stats = neutralStats(), p = newPlayer(room, stats); assert.ok(stepPlayer(p, { jumpPressed: true }, room, stats).includes('jump')); ticks(p, {}, room, stats, 10); assert.ok(stepPlayer(p, { jumpPressed: true }, room, stats).includes('jump')); ticks(p, {}, room, stats, 10); assert.ok(!stepPlayer(p, { jumpPressed: true }, room, stats).includes('jump')); ticks(p, {}, room, stats, 200); assert.equal(p.onGround, true); assert.equal(p.y, room.spawn.y); });
test('coyote time preserves a jump just after leaving a ledge', () => { const room = makeRoom('coyote'), stats = neutralStats(), p = newPlayer(room, stats); p.x = room.platforms[0].w + 1; p.onGround = false; p.coyote = .06; p.jumpsUsed = 0; const ev = stepPlayer(p, { jumpPressed: true }, room, stats); assert.ok(ev.includes('jump')); assert.equal(p.jumpsUsed, 1); });
test('buffered jump fires on landing after both air jumps were spent', () => { const room = makeRoom('buffer'), stats = neutralStats(), p = newPlayer(room, stats); p.onGround = false; p.coyote = 0; p.jumpsUsed = 2; p.y = room.spawn.y - 2; p.vy = 160; stepPlayer(p, { jumpPressed: true }, room, stats); let jumped = false; for (let i = 0; i < 6; i++)
    if (stepPlayer(p, {}, room, stats).includes('jump'))
        jumped = true; assert.ok(jumped); });
test('dash cooldown prevents retrigger and grants a bounded invulnerability window', () => { const room = makeRoom('dash'), stats = neutralStats(), p = newPlayer(room, stats); p.invuln = 0; assert.ok(stepPlayer(p, { dashPressed: true }, room, stats).includes('dash')); assert.ok(p.invuln > 0); assert.ok(!stepPlayer(p, { dashPressed: true }, room, stats).includes('dash')); ticks(p, {}, room, stats, 220); assert.equal(p.dashCd, 0); assert.equal(p.invuln, 0); });
test('a Moonveil ward absorbs one hit; repeated overlap cannot drain all hearts', () => { const p = newPlayer(makeRoom('hit'), neutralStats()); p.invuln = 0; assert.equal(takeHit(p), true); assert.equal(p.ward, 0); assert.equal(p.health, 5); assert.equal(takeHit(p), false); p.invuln = 0; assert.equal(takeHit(p, 2), true); assert.equal(p.health, 3); });
test('respawn checkpoint never moves onto a spike cluster', () => { const room = makeRoom('spikes', 3), stats = neutralStats(), p = newPlayer(room, stats); const h = room.hazards[0], platform = room.platforms.find(pl => h.x >= pl.x && h.x < pl.x + pl.w); p.x = h.x; p.y = platform.y - p.h; const safe = p.safeX; stepPlayer(p, {}, room, stats); assert.equal(p.safeX, safe); });
test('ancestry is bounded to twelve remembered descendants', () => { const p = base(); for (let i = 0; i < 100; i++) {
    beginExpedition(p, heir, `run-${i}`);
    finishExpedition(p, `run-${i}`);
} assert.equal(p.lineage.length, 12); assert.equal(p.generation, 101); });
