// Фокусный превью: только ходьба, все 8 кадров цикла, с линией земли.
// Лапы теперь разводятся ПОШТУЧНО (articulateLimbs): у паука и жука 6-8 лап
// идут волной (трипод), а не все сразу, поэтому шаг читается и на многолапых.
const zlib = require('zlib');
const fs = require('fs');
const { buildMonsterArt, buildPalette, ART_N } = require('./out/monsterArt.js');
function crc32(buf) { let c, t = []; for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } let crc = 0xffffffff; for (let i = 0; i < buf.length; i++) crc = (crc ^ buf[i]) & 0xff ^ t[(crc >> 8) & 0xff]; return (crc ^ 0xffffffff) >>> 0; }
function chunk(type, data) { const l = Buffer.alloc(4); l.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type, 'ascii'), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td)); return Buffer.concat([l, td, c]); }
function writePNG(file, w, h, rgb) { const raw = Buffer.alloc((w * 3 + 1) * h); for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3); } const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2; fs.writeFileSync(file, Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))])); }
const FILLS = { 0: null, 1: 'outline', 2: 'bodyDark', 3: 'body', 4: 'bodyLight', 5: 'metalDark', 6: 'metal', 7: 'metalLight', 8: 'gold', 9: 'eye', 10: 'bone', 11: 'mouth', 12: 'accent' };
const hex2rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const COLS = ['walkA', 'walkB', 'walkC', 'walkD', 'walkE', 'walkF', 'walkG', 'walkH'];
const ROWS = [['humanoid', 'walk', '#c89b3c', 'goblin'], ['wolf', 'hop', '#6a6a6a', 'wolf'], ['golem', 'stomp', '#8a7a6a', 'golem'], ['skeleton', 'slink', '#c0bca8', 'skeleton'], ['imp', 'hop', '#bf3f3f', 'imp'], ['spider', 'crawl', '#2f9a5a', 'spider'], ['beetle', 'crawl', '#7a5a2a', 'beetle'], ['dragon', 'glide', '#b04040', 'drake']];
const CELL = 180, SCALE = ART_N / CELL, W = COLS.length * CELL, H = ROWS.length * CELL;
const img = Buffer.alloc(W * H * 3);
for (let i = 0; i < W * H; i++) { img[i * 3] = 20; img[i * 3 + 1] = 24; img[i * 3 + 2] = 34; }
for (let row = 0; row < ROWS.length; row++) { const y0 = row * CELL + CELL - 14; for (let y = y0; y < y0 + 2; y++) for (let x = 0; x < W; x++) { const o = ((y * W) + x) * 3; img[o] = 70; img[o + 1] = 58; img[o + 2] = 46; } }
ROWS.forEach(([shape, gait, color, name], row) => {
  const pal = buildPalette(color); const m = {}; for (const k in FILLS) if (FILLS[k]) m[k] = hex2rgb(pal[FILLS[k]]);
  COLS.forEach((v, col) => {
    const art = buildMonsterArt('pv_' + shape, shape, false, { nameRu: name, nameEn: name, element: 'fire', traits: [], gait, attack: 'weaponSweep' }, v);
    for (let y = 0; y < CELL; y++) for (let x = 0; x < CELL; x++) {
      const sy = Math.min(ART_N - 1, Math.floor(y * SCALE)), sx = Math.min(ART_N - 1, Math.floor(x * SCALE));
      const c = m[art[sy][sx]]; if (!c) continue;
      const o = ((row * CELL + y) * W + col * CELL + x) * 3; img[o] = c[0]; img[o + 1] = c[1]; img[o + 2] = c[2]; }
  });
});
writePNG('walk.png', W, H, img);
console.log('walk.png', W + 'x' + H, '| строки:', ROWS.map(r => r[3]).join(', '));
console.log('колонки: walkA..walkH (полный цикл шага)');
