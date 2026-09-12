import { VIEW_W, VIEW_H, BIOMES, POWERS, randomFrom, clamp } from './core.mjs';
const TAU = Math.PI * 2;
const FOX_ART = Object.fromEntries(Object.entries({ember:'vulpax',tide:'nivalis',gale:'sylra',void:'umbra',sun:'lumen',bloom:'verdara'}).map(([k,v])=>{const i=new Image();i.src=`lineage/assets/foxes/${v}.png`;return [k,i]}));
const BG_ART = Object.fromEntries(Object.entries({grove:'lanternwild',frost:'glass-cathedral',cinder:'cinder-below'}).map(([k,v])=>{const i=new Image();i.src=`lineage/assets/backdrops/${v}.png`;return [k,i]}));

export class EmberRenderer {
    constructor(canvas) { this.canvas = canvas; this.ctx = canvas.getContext('2d', { alpha: false }); if (!this.ctx)
        throw new Error('Canvas rendering is unavailable in this browser.'); this.glows = new Map(); this.resize(); }
    resize() {
        const d = Math.min(2, globalThis.devicePixelRatio || 1), w = innerWidth, h = innerHeight;
        // Portrait uses a closer camera, not a tiny landscape postcard.
        const home = ['title', 'hearth'].includes(document.body.dataset.mode);
        this.viewWidth = w < h && !home ? 540 : VIEW_W;
        this.canvas.width = Math.round(w * d);
        this.canvas.height = Math.round(h * d);
        this.scale = Math.min(w / this.viewWidth, h / VIEW_H) * d;
        this.ox = (w * d - this.viewWidth * this.scale) / 2;
        this.oy = (h * d - VIEW_H * this.scale) / 2;
    }
    glow(x, y, r, color, alpha = .5) { const c = this.ctx; let img = this.glows.get(color); if (!img) {
        img = document.createElement('canvas');
        img.width = img.height = 128;
        const q = img.getContext('2d');
        const g = q.createRadialGradient(64, 64, 0, 64, 64, 64);
        g.addColorStop(0, color);
        g.addColorStop(.2, color + 'b0');
        g.addColorStop(1, color + '00');
        q.fillStyle = g;
        q.fillRect(0, 0, 128, 128);
        this.glows.set(color, img);
    } c.save(); c.globalAlpha *= alpha; c.drawImage(img, x - r, y - r, r * 2, r * 2); c.restore(); }
    path(points, fill, stroke = null) { const c = this.ctx; c.beginPath(); points.forEach((p, i) => i ? c.lineTo(...p) : c.moveTo(...p)); c.closePath(); if (fill) {
        c.fillStyle = fill;
        c.fill();
    } if (stroke) {
        c.strokeStyle = stroke;
        c.stroke();
    } }
    tree(x, base, scale, color, lean = 0) { const c = this.ctx; c.save(); c.translate(x, base); c.scale(scale, scale); c.fillStyle = color; c.beginPath(); c.moveTo(-45, 0); c.bezierCurveTo(-18, -100, 5, -195, -10 + lean, -360); c.bezierCurveTo(-27 + lean, -445, -5 + lean, -520, 8 + lean, -580); c.bezierCurveTo(-3 + lean, -390, 36, -220, 28, -95); c.bezierCurveTo(30, -55, 60, -15, 75, 0); c.fill(); c.strokeStyle = color; c.lineCap = 'round'; for (let j = 0; j < 6; j++) {
        const yy = -150 - j * 56, side = j % 2 ? 1 : -1;
        c.lineWidth = 16 - j * 1.6;
        c.beginPath();
        c.moveTo(7, yy);
        c.bezierCurveTo(side * 55, yy - 5, side * 100, yy - 35, side * (135 - j * 5), yy - 85);
        c.stroke();
        c.lineWidth = 7;
        c.beginPath();
        c.moveTo(side * 62, yy - 25);
        c.quadraticCurveTo(side * 75, yy - 95, side * 58, yy - 120);
        c.stroke();
    } c.restore(); }
    backdrop(b, t, camera, motion = true) {
        const c = this.ctx;
        const g = c.createLinearGradient(0, 0, 0, VIEW_H);
        b.sky.forEach((s, i) => g.addColorStop(i / 2, s));
        c.fillStyle = g;
        c.fillRect(0, 0, VIEW_W, VIEW_H);
        // A distant moon, suspended dust and three independently scrolling depth layers.
        this.glow(880 - camera * .025, 215, 270, b.fog, .22);
        this.glow(1010 - camera * .03, 134, 70, b.accent, .14);
        c.save();
        c.globalAlpha = .2;
        c.fillStyle = b.accent;
        c.beginPath();
        c.arc(1010 - camera * .03, 134, 24, 0, TAU);
        c.fill();
        c.fillStyle = b.sky[0];
        c.beginPath();
        c.arc(1020 - camera * .03, 128, 22, 0, TAU);
        c.fill();
        c.restore();
        for (let layer = 0; layer < 3; layer++) {
            const factor = .08 + layer * .13, spacing = layer === 2 ? 390 : 260, shift = camera * factor;
            const tone = layer === 0 ? b.sky[1] : layer === 1 ? '#0c202b' : '#0b2228';
            for (let i = -2; i < 8; i++) {
                const index = i + Math.floor(shift / spacing), x = i * spacing - shift % spacing, sc = .52 + layer * .2 + (Math.sin(index * 31) * .08);
                c.globalAlpha = .45 + layer * .16;
                if (b.id === 'grove')
                    this.tree(x, 600, sc, tone, Math.sin(index) * 24);
                else {
                    c.fillStyle = tone;
                    c.fillRect(x, 110 + (index % 3) * 28, 35, 490);
                    c.fillRect(x + 155, 110 + (index % 3) * 28, 35, 490);
                    c.strokeStyle = tone;
                    c.lineWidth = 29;
                    c.beginPath();
                    c.moveTo(x + 15, 250);
                    c.bezierCurveTo(x + 15, 80, x + 178, 80, x + 178, 250);
                    c.stroke();
                    if (b.id === 'cinder')
                        this.path([[x, 0], [x + 90, 0], [x + 40, 95]], tone);
                }
            }
        }
        c.globalAlpha = 1;
        const mist = c.createLinearGradient(0, 340, 0, 700);
        mist.addColorStop(0, b.fog + '00');
        mist.addColorStop(.7, b.fog + '28');
        mist.addColorStop(1, b.sky[0]);
        c.fillStyle = mist;
        c.fillRect(0, 340, VIEW_W, 380);
        c.save();
        c.globalCompositeOperation = 'screen';
        for (let i = 0; i < 5; i++) {
            c.globalAlpha = .023;
            c.fillStyle = b.accent;
            this.path([[520 + i * 168, 0], [540 + i * 168, 0], [240 + i * 145, 630], [160 + i * 145, 630]], b.accent);
        }
        c.restore();
        for (let i = 0; i < 58; i++) {
            const x = ((i * 149.37 - camera * .18 + (motion ? t * 5 * (1 + i % 3) : 0)) % 1380 + 1380) % 1380 - 50, y = 55 + (i * 93.23) % 545 + (motion ? Math.sin(t * .5 + i) * 12 : 0);
            c.globalAlpha = .15 + (Math.sin(t + i) * .15 + .15);
            c.fillStyle = i % 4 === 0 ? b.accent : '#bbe8d4';
            c.beginPath();
            c.arc(x, y, i % 7 === 0 ? 2 : 1, 0, TAU);
            c.fill();
        }
        c.globalAlpha = 1;
    }
    platform(pl, b, camera, seed) {
        const c = this.ctx, x = pl.x - camera;
        if (x + pl.w < -70 || x > VIEW_W + 70)
            return;
        const rnd = randomFrom(`${seed}:${pl.x}`), h = pl.kind === 'ledge' ? 30 : Math.min(pl.h, VIEW_H - pl.y + 70);
        this.path([[x, pl.y + 4], [x + pl.w, pl.y + 4], [x + pl.w - 8, pl.y + h * .7], [x + pl.w * .75, pl.y + h], [x + pl.w * .34, pl.y + h - 28], [x + 10, pl.y + h * .8]], b.stone);
        c.fillStyle = '#060f1b55';
        c.fillRect(x + 12, pl.y + 22, pl.w - 24, 4);
        c.strokeStyle = b.edge + '30';
        c.lineWidth = 1;
        for (let i = 0; i < pl.w / 54; i++) {
            const xx = x + i * 54 + 8;
            c.beginPath();
            c.moveTo(xx, pl.y + 14);
            c.lineTo(xx + 10, pl.y + 39);
            c.lineTo(xx + 4, pl.y + 76 + rnd() * 50);
            c.stroke();
        }
        c.fillStyle = b.edge + '60';
        c.fillRect(x, pl.y, pl.w, 4);
        c.fillStyle = b.accent + '75';
        c.fillRect(x + 5, pl.y, pl.w - 10, 1);
        for (let i = 0; i < pl.w / 11; i++) {
            const xx = x + 5 + i * 11, hh = 3 + rnd() * 12;
            c.strokeStyle = i % 4 ? b.edge : b.accent + '88';
            c.beginPath();
            c.moveTo(xx, pl.y);
            c.quadraticCurveTo(xx - 5, pl.y - hh / 2, xx + (rnd() - .5) * 13, pl.y - hh);
            c.stroke();
        }
        if (pl.kind !== 'ledge') {
            for (let i = 0; i < 2; i++) {
                const xx = x + pl.w * (.2 + i * .56);
                c.strokeStyle = b.edge + '77';
                c.beginPath();
                c.moveTo(xx, pl.y + 8);
                c.bezierCurveTo(xx - 8, pl.y + 44, xx + 14, pl.y + 63, xx + 3, pl.y + 92);
                c.stroke();
                for (let j = 0; j < 4; j++)
                    this.path([[xx, pl.y + 28 + j * 12], [xx + (j % 2 ? 12 : -12), pl.y + 29 + j * 12], [xx + 2, pl.y + 35 + j * 12]], b.edge + '70');
            }
        }
    }
    flame(x, y, t, color, size = 1) { const c = this.ctx; this.glow(x, y, 49 * size, color, .32); c.save(); c.translate(x, y); c.scale(size, size); c.fillStyle = color; c.beginPath(); c.moveTo(0, -19 - Math.sin(t * 7) * 3); c.bezierCurveTo(-2, -9, -12, -7, -7, 4); c.bezierCurveTo(-4, 12, 10, 9, 8, 0); c.bezierCurveTo(6, -8, 0, -10, 0, -19); c.fill(); c.fillStyle = '#fff0ce'; c.beginPath(); c.ellipse(0, 2, 3, 6, 0, 0, TAU); c.fill(); c.restore(); }
    portal(portal, b, camera, t, locked) {
        const c = this.ctx, x = portal.x - camera, y = portal.y;
        if (x < -200 || x > VIEW_W + 200)
            return;
        const color = locked ? '#be778c' : b.accent;
        this.glow(x, y - 81, 135, color, .2);
        c.fillStyle = b.stone;
        c.fillRect(x - 66, y - 128, 21, 128);
        c.fillRect(x + 45, y - 128, 21, 128);
        c.strokeStyle = b.stone;
        c.lineWidth = 24;
        c.beginPath();
        c.arc(x, y - 119, 56, Math.PI, 0);
        c.stroke();
        c.strokeStyle = color + '88';
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(x - 46, y - 2);
        c.lineTo(x - 46, y - 120);
        c.arc(x, y - 120, 46, Math.PI, 0);
        c.lineTo(x + 46, y - 2);
        c.stroke();
        const g = c.createLinearGradient(x - 38, y, x + 38, y);
        g.addColorStop(0, color + '00');
        g.addColorStop(.5, color + '35');
        g.addColorStop(1, color + '00');
        c.fillStyle = g;
        c.fillRect(x - 38, y - 120, 76, 120);
        for (let i = 0; i < 10; i++) {
            const yy = y - 15 - (t * 25 + i * 14) % 138, xx = x + Math.sin(t + i) * 24;
            this.glow(xx, yy, 5, color, .7);
        }
        c.fillStyle = color;
        c.font = '12px system-ui';
        c.textAlign = 'center';
        c.fillText(locked ? 'GUARDIAN SEAL' : 'THE WAY ON', x, y - 197);
        c.font = '22px Georgia';
        c.fillText(locked ? '◇' : '✧', x, y - 164);
        c.textAlign = 'left';
    }
    fox(x, y, power, t, velocity = 0, facing = 1, air = false, alpha = 1, scale = 1) {
        const c = this.ctx;
        c.save();
        c.translate(x, y);
        c.scale(facing * scale, scale);
        c.globalAlpha = alpha;
        const run = Math.min(1, Math.abs(velocity) / 220), bob = air ? 0 : Math.sin(t * 18) * run * 2, tail = Math.sin(t * 5) * 3;
        c.fillStyle = '#02080b55';
        c.beginPath();
        c.ellipse(-2, 2, 32, 6, 0, 0, TAU);
        c.fill();
        c.translate(0, bob);
        this.glow(-28, -28, 47, power.color, .13);
        // The brush is the silhouette: long, upward-curving, pale-tipped, and alive.
        const fur = c.createLinearGradient(-62, -55, 18, -12);
        fur.addColorStop(0, power.color);
        fur.addColorStop(1, power.dark);
        c.fillStyle = fur;
        c.beginPath();
        c.moveTo(-17, -22);
        c.bezierCurveTo(-41, -16, -61, -26, -72, -51 - tail);
        c.bezierCurveTo(-58, -39, -48, -67 - tail, -43, -52);
        c.bezierCurveTo(-42, -36, -27, -42, -17, -30);
        c.closePath();
        c.fill();
        c.fillStyle = '#fff0d9';
        c.beginPath();
        c.moveTo(-72, -51 - tail);
        c.quadraticCurveTo(-61, -41, -53, -52);
        c.lineTo(-56, -39);
        c.lineTo(-48, -41);
        c.lineTo(-51, -29);
        c.quadraticCurveTo(-64, -35, -72, -51 - tail);
        c.fill();
        for (let i = 0; i < 4; i++) {
            const back = i < 2, px = back ? -16 : 14, phase = t * 18 + (i % 2) * Math.PI + (back ? Math.PI : 0), offset = air ? (back ? -5 : 8) : Math.sin(phase) * 10 * run;
            c.strokeStyle = i % 2 ? power.dark : '#182c30';
            c.lineWidth = 5;
            c.lineCap = 'round';
            c.beginPath();
            c.moveTo(px, -17);
            c.lineTo(px + offset * .5, -8);
            c.lineTo(px + offset, air ? -4 : 0);
            c.stroke();
        }
        c.fillStyle = fur;
        c.beginPath();
        c.ellipse(-1, -25, 25, 13, -.08, 0, TAU);
        c.fill();
        c.fillStyle = '#f2e4ce';
        c.beginPath();
        c.ellipse(6, -20, 14, 5, -.22, 0, TAU);
        c.fill();
        this.path([[10, -31], [12, -59], [25, -43], [29, -58], [35, -37], [47, -29], [32, -21], [19, -21]], power.color);
        this.path([[15, -52], [17, -39], [23, -41]], power.dark);
        this.path([[29, -51], [29, -40], [33, -38]], power.dark);
        this.path([[24, -33], [31, -29], [46, -29], [33, -21], [20, -22]], '#fff0d9');
        c.fillStyle = '#11272b';
        c.beginPath();
        c.ellipse(30, -36, 2.8, 2, 0, 0, TAU);
        c.fill();
        c.fillStyle = '#fffce8';
        c.fillRect(30, -37, 1.3, 1.3);
        this.path([[43, -31], [48, -29], [43, -26]], '#11272b');
        c.strokeStyle = power.color + '80';
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(-17, -34);
        c.quadraticCurveTo(0, -42, 14, -35);
        c.stroke();
        c.restore();
    }
    enemy(e, camera, t) {
        if (e.dead)
            return;
        const c = this.ctx, x = e.x - camera, y = e.y;
        if (x < -100 || x > VIEW_W + 100)
            return;
        const color = e.flash > 0 ? '#fff5db' : e.type === 'guardian' ? '#d2a0db' : '#d384ae';
        this.glow(x, y, e.type === 'guardian' ? 105 : 45, color, e.type === 'guardian' ? .2 : .17);
        c.save();
        c.translate(x, y);
        const boss = e.type === 'guardian';
        if (boss)
            c.scale(2.2, 2.2);
        c.fillStyle = '#2a2038';
        c.beginPath();
        c.moveTo(-21, 7);
        c.bezierCurveTo(-35, -26, -8, -36, 0, -22);
        c.bezierCurveTo(12, -41, 36, -17, 22, 9);
        c.lineTo(13, 15);
        c.lineTo(3, 10);
        c.lineTo(-8, 16);
        c.closePath();
        c.fill();
        this.path([[-18, -16], [-26, -37], [-7, -25]], '#634b6b');
        this.path([[10, -23], [28, -39], [21, -10]], '#634b6b');
        c.fillStyle = color;
        c.fillRect(-12, -11, 7, 3);
        c.fillRect(7, -11, 7, 3);
        c.strokeStyle = '#64536d';
        c.lineWidth = 3;
        if (e.type === 'crawler' || e.type === 'spitter') {
            for (let i = 0; i < 4; i++) {
                const xx = -19 + i * 12;
                c.beginPath();
                c.moveTo(xx, 7);
                c.lineTo(xx + Math.sin(t * 8 + i) * 4, 22);
                c.stroke();
            }
        }
        else {
            c.strokeStyle = color + '77';
            c.lineWidth = 1;
            for (let i = 0; i < 3; i++) {
                c.beginPath();
                c.moveTo(-10 + i * 10, 12);
                c.quadraticCurveTo(Math.sin(t * 4 + i) * 15, 25, -8 + i * 9, 31);
                c.stroke();
            }
        }
        if (e.type === 'spitter') {
            c.fillStyle = color;
            c.beginPath();
            c.arc(0, 1, 5 + Math.max(0, 1 - e.cooldown) * 4, 0, TAU);
            c.fill();
        }
        c.restore();
        if (e.hp < e.maxHp && !boss) {
            c.fillStyle = '#08121d';
            c.fillRect(x - 22, y - 38, 44, 4);
            c.fillStyle = color;
            c.fillRect(x - 22, y - 38, 44 * e.hp / e.maxHp, 4);
        }
    }
    render(game) {
        const c = this.ctx;
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.fillStyle = '#071219';
        c.fillRect(0, 0, this.canvas.width, this.canvas.height);
        c.setTransform(this.scale, 0, 0, this.scale, this.ox, this.oy);
        c.save();
        c.beginPath();
        c.rect(0, 0, this.viewWidth, VIEW_H);
        c.clip();
        const home = ['title', 'hearth'].includes(game.mode), b = BIOMES.find(x => x.id === (home ? 'grove' : game.room.biome)) || BIOMES[0], t = game.visualTime, camera = home ? 0 : game.camera;
        this.backdrop(b, t, camera, game.motion);
        const bgImg = BG_ART[b.id]; if (bgImg?.complete && bgImg.naturalWidth) { c.save(); c.globalAlpha=.46; const shift=(camera*.035)%(this.viewWidth*.08); c.drawImage(bgImg,-shift,0,this.viewWidth*1.08,VIEW_H); c.restore(); }
        if (home) {
            this.platform({ x: 635, y: 552, w: 645, h: 230, kind: 'ground' }, b, 0, 12);
            this.platform({ x: 522, y: 601, w: 78, h: 160, kind: 'ground' }, b, 0, 12);
            this.portal({ x: 1110, y: 552 }, b, 0, t, false);
            this.tree(1250, 560, .86, '#091b22', -45);
            this.flame(736, 525, t, b.accent, .9);
            this.flame(1010, 525, t + 2, b.accent, .9);
            const power = POWERS.find(p => p.id === game.heir?.power) || POWERS[0];
            this.fox(886, 548, power, t, 0, 1, false, 1, 1.8);
            this.glow(885, 522, 175, power.color, .10);
            c.fillStyle = '#e9d8b17a';
            c.font = '11px system-ui';
            c.textAlign = 'center';
            c.fillText('THE HEARTH · WHERE EVERY STORY BEGINS', 938, 628);
            c.textAlign = 'left';
        }
        else {
            const room = game.room, p = game.player, power = POWERS.find(x => x.id === game.heir.power) || POWERS[0];
            if (game.motion && game.shake > 0)
                c.translate(Math.sin(t * 96) * game.shake, Math.cos(t * 83) * game.shake * .6);
            for (const pl of [...room.platforms, ...room.ledges])
                this.platform(pl, b, camera, room.decoSeed);
            for (const pl of room.platforms) {
                if (pl.index % 2 === 0)
                    this.flame(pl.x + pl.w - 25 - camera, pl.y - 25, t + pl.index, b.accent, .7);
            }
            for (const h of room.hazards) {
                for (let j = 0; j < 3; j++)
                    this.path([[h.x + j * 12 - camera, h.y + h.h], [h.x + 6 + j * 12 - camera, h.y], [h.x + 12 + j * 12 - camera, h.y + h.h]], '#d692a3', '#efb1aa');
            }
            const chest = room.chest;
            if (!chest.opened) {
                const x = chest.x - camera;
                this.glow(x, chest.y, 39, b.accent, .18);
                c.fillStyle = '#745640';
                c.fillRect(x - 15, chest.y - 7, 30, 22);
                c.strokeStyle = b.accent;
                c.lineWidth = 1.5;
                c.strokeRect(x - 15, chest.y - 7, 30, 22);
                c.fillStyle = b.accent;
                c.fillRect(x - 2, chest.y - 3, 4, 8);
            }
            if (room.shrine) {
                const s = room.shrine, x = s.x - camera;
                c.fillStyle = b.stone;
                c.fillRect(x - 20, s.y - 33, 40, 33);
                c.fillRect(x - 28, s.y - 39, 56, 7);
                if (!s.used) {
                    this.glow(x, s.y - 73, 62, '#c7abff', .3);
                    c.save();
                    c.translate(x, s.y - 70 + Math.sin(t * 2) * 5);
                    c.rotate(Math.PI / 4 + t * .2);
                    c.strokeStyle = '#dcc8ff';
                    c.strokeRect(-9, -9, 18, 18);
                    c.restore();
                }
            }
            for (const coin of room.coins) {
                if (coin.taken || coin.x < camera - 50 || coin.x > camera + VIEW_W + 50)
                    continue;
                const x = coin.x - camera, y = coin.y + Math.sin(t * 3 + coin.x) * 4;
                this.glow(x, y, 20, coin.value > 1 ? '#d2b7fa' : b.accent, .35);
                c.fillStyle = coin.value > 1 ? '#e9d6ff' : '#fff0ba';
                this.path([[x, y - 5], [x + 3, y], [x, y + 5], [x - 3, y]], c.fillStyle);
            }
            const guardian = room.enemies.find(e => e.type === 'guardian' && !e.dead);
            this.portal(room.portal, b, camera, t, !!guardian);
            for (const a of game.afterimages)
                this.fox(a.x - camera, a.y, power, t, a.vx, a.facing, a.air, a.life * .45, 1.2);
            for (const e of room.enemies)
                this.enemy(e, camera, t);
            for (const q of game.projectiles) {
                this.glow(q.x - camera, q.y, 20, '#eab0d1', .3);
                c.fillStyle = '#f3bdd6';
                c.beginPath();
                c.arc(q.x - camera, q.y, 5, 0, TAU);
                c.fill();
            }
            if (p.ward > 0) {
                c.strokeStyle = power.color + '88';
                c.lineWidth = 1.5;
                c.beginPath();
                c.arc(p.x + p.w / 2 - camera, p.y + p.h / 2, 40, 0, TAU);
                c.stroke();
            }
            // Keep the hero readable during immunity; never blink the fox out.
            const heroAlpha = p.invuln > 0 ? (game.motion ? .75 + Math.sin(t * 10) * .12 : .85) : 1;
            const art=FOX_ART[power.id]; if(art?.complete&&art.naturalWidth){ c.save(); c.globalAlpha=heroAlpha; const run=Math.min(1,Math.abs(p.vx)/(game.stats?.speed||325)), bob=p.onGround?Math.sin(t*18)*run*2.8:0, tilt=p.dashT>0?-.08*p.facing:clamp(p.vy/2600,-.11,.14), stretch=p.dashT>0?1.12:1, h=118,w=h*art.naturalWidth/art.naturalHeight; c.translate(p.x+p.w/2-camera,p.y+p.h+bob); c.rotate(tilt); c.scale(p.facing*stretch,1/stretch); c.drawImage(art,-w*.48,-h+8,w,h); c.restore(); } else this.fox(p.x + p.w / 2 - camera, p.y + p.h, power, t, p.vx, p.facing, !p.onGround, heroAlpha, 1.2);
            for (const pulse of game.pulses) {
                c.save();
                c.globalAlpha = pulse.life / .3;
                c.strokeStyle = power.color;
                c.lineWidth = 3;
                c.beginPath();
                c.arc(pulse.x - camera, pulse.y, pulse.radius * (1 - pulse.life / .38), 0, TAU);
                c.stroke();
                this.glow(pulse.x - camera, pulse.y, pulse.radius, power.color, .08);
                c.restore();
            }
            for (const q of game.particles) {
                c.globalAlpha = clamp(q.life * 2, 0, 1);
                c.fillStyle = q.color;
                c.fillRect(q.x - camera, q.y, q.size, q.size);
            }
            c.globalAlpha = 1;
            for (const f of game.floats) {
                c.globalAlpha = Math.min(1, f.life);
                c.fillStyle = f.color;
                c.font = '600 15px system-ui';
                c.textAlign = 'center';
                c.fillText(f.text, f.x - camera, f.y);
                c.textAlign = 'left';
            }
            c.globalAlpha = 1;
            if (guardian) {
                c.fillStyle = '#0a1320cc';
                c.fillRect(440, 98, 400, 43);
                c.fillStyle = '#dcb5d6';
                c.font = '11px system-ui';
                c.textAlign = 'center';
                c.fillText('THE HOLLOW KEEPER', 640, 114);
                c.fillStyle = '#443147';
                c.fillRect(455, 125, 370, 5);
                c.fillStyle = '#d7a8c8';
                c.fillRect(455, 125, 370 * guardian.hp / guardian.maxHp, 5);
                c.textAlign = 'left';
            }
        }
        const vignette = c.createRadialGradient(640, 330, 230, 640, 330, 800);
        vignette.addColorStop(0, '#020b1300');
        vignette.addColorStop(1, '#020b1399');
        c.fillStyle = vignette;
        c.fillRect(0, 0, VIEW_W, VIEW_H);
        c.restore();
    }
}
export function foxEmblem(power) { return `<svg viewBox="0 0 180 130" aria-hidden="true"><defs><radialGradient id="g-${power.id}"><stop stop-color="${power.color}" stop-opacity=".24"/><stop offset="1" stop-color="${power.color}" stop-opacity="0"/></radialGradient></defs><ellipse cx="90" cy="72" rx="88" ry="57" fill="url(#g-${power.id})"/><path d="M77 93C45 105 20 75 19 46C34 67 44 39 54 54C48 72 67 64 82 80Z" fill="${power.color}"/><path d="M19 46L36 63L42 56L39 78C26 72 22 62 19 46Z" fill="#f6e9d3"/><path d="M63 82Q98 66 115 82L122 99H74Z" fill="${power.color}"/><path d="M108 85L106 40L124 63L137 38L144 75L161 83L140 99L116 95Z" fill="${power.color}"/><path d="M114 76L134 87L157 84L139 96L118 91Z" fill="#f6e9d3"/><path d="M111 51L116 70L121 66M137 50L136 68L141 71" fill="${power.dark}"/><path d="M75 94L70 109H79L84 96M110 95L115 109H124L120 94" fill="${power.dark}"/><path d="M131 75L137 76" stroke="#14262c" stroke-width="3"/><path d="M155 81L163 83L157 87Z" fill="#14262c"/></svg>`; }
