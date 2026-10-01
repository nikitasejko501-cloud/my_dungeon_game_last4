// ПРЕВЬЮ БОССОВ И УДАРОВ: рендерит реальные спрайты боссов (регалии, оружие,
// затенение) и кадры замаха настоящим оружием. Нужен, чтобы глазами проверить,
// что нет «странных полос», боссы не похожи друг на друга, а удар — это оружие,
// а не палка. Запуск: node bossview.cjs
const zlib = require('zlib');
const fs = require('fs');
const ga = require('./out/monsterArt.js');
const gd = require('./out/gameData.js');
const { ART_N, buildMonsterArt, buildPalette, buildWeaponSprite } = ga;

function crc32(buf) { let c, t = []; for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } let crc = 0xffffffff; for (let i = 0; i < buf.length; i++) crc = (crc ^ buf[i]) & 0xff ^ t[(crc >> 8) & 0xff]; return (crc ^ 0xffffffff) >>> 0; }
function chunk(type, data) { const l = Buffer.alloc(4); l.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type, 'ascii'), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td)); return Buffer.concat([l, td, c]); }
function writePNG(file, w, h, rgb) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3); }
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2;
  fs.writeFileSync(file, Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]));
}
const FILLS = { 1: 'outline', 2: 'bodyDark', 3: 'body', 4: 'bodyLight', 5: 'metalDark', 6: 'metal', 7: 'metalLight', 8: 'gold', 9: 'eye', 10: 'bone', 11: 'mouth', 12: 'accent' };
const hex2rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
function paletteMap(color) { const pal = buildPalette(color); const m = {}; for (const k in FILLS) m[k] = hex2rgb(pal[FILLS[k]]); return m; }

/** Рисует 256×256 спрайт босса (та же мета, что движок передаёт в бою). */
function bossGrid(def, variant) {
  return buildMonsterArt(def.id, def.shape, true, {
    nameRu: def.name.ru, nameEn: def.name.en, element: def.element, traits: def.traits,
    gait: def.gait, attack: 'weaponSweep', weapon: def.weapon, regalia: def.regalia,
  }, variant);
}

/**
 * Поворот оружия вокруг кисти: для каждого пикселя-получателя обратным
 * поворотом находим пиксель-источник (nearest). Ровно та же математика, что
 * делает канва через ctx.rotate + drawImage во время боя.
 */
function stampRotated(dst, grid, pivotX, pivotY, axis, angle) {
  const N = grid.length;
  const a = angle - axis;
  const cos = Math.cos(a), sin = Math.sin(a);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const u = x - pivotX, v = y - pivotY;
      const sx = Math.round(pivotX + cos * u + sin * v);
      const sy = Math.round(pivotY - sin * u + cos * v);
      if (sx < 0 || sy < 0 || sx >= N || sy >= N) continue;
      const val = grid[sy][sx];
      if (val === 0) continue;
      dst[y][x] = val;
    }
  }
}

/** Переносит сетку монстра (256 или 384) в контактный лист. */
function blit(img, W, art, m, col, row, CELLW, CELLH, SCALE) {
  const n = art.length;
  for (let y = 0; y < CELLH; y++) {
    const sy = Math.floor(y / SCALE);
    if (sy >= n) break;
    for (let x = 0; x < CELLW; x++) {
      const sx = Math.floor(x / SCALE);
      if (sx >= n) break;
      const c = m[art[sy][sx]];
      if (!c) continue;
      const o = ((row * CELLH + y) * W + col * CELLW + x) * 3;
      img[o] = c[0]; img[o + 1] = c[1]; img[o + 2] = c[2];
    }
  }
}


// === ЛИСТ 1: облик боссов (12 разных боссов, по одному спрайту) ===
const BOSSES = [
  'whispering_grove_boss_1', 'whispering_grove_boss_6', 'gnomish_ruins_boss_2', 'gnomish_ruins_boss_12',
  'necropolis_boss_3', 'necropolis_boss_17', 'idol_jungle_boss_5', 'sunken_fleet_boss_9',
  'sky_citadel_boss_11', 'necropolis_boss_20', 'idol_jungle_boss_19', 'sky_citadel_boss_20',
];
const COLS = 3, ROWS = 4, CELLW = 440, CELLH = 360, SCALE = 1.1;
const W = COLS * CELLW, H = ROWS * CELLH;
const img = Buffer.alloc(W * H * 3);
for (let i = 0; i < W * H; i++) { img[i * 3] = 22; img[i * 3 + 1] = 26; img[i * 3 + 2] = 36; }
BOSSES.forEach((id, i) => {
  const def = gd.ALL_ENEMIES[id];
  if (!def) { console.log('нет босса', id); return; }
  const col = i % COLS, row = Math.floor(i / COLS);
  const groundY = row * CELLH + CELLH - 14;
  for (let y = groundY; y < groundY + 2; y++) for (let x = col * CELLW; x < (col + 1) * CELLW; x++) { const o = (y * W + x) * 3; img[o] = 74; img[o + 1] = 62; img[o + 2] = 48; }
  blit(img, W, bossGrid(def, 'idle'), paletteMap(def.color), col, row, CELLW, CELLH, SCALE);
  console.log(String(i).padStart(2), id.padEnd(26), (def.shape + '/reg' + def.regalia).padEnd(15),
    (def.weapon + (def.weaponName ? ' «' + def.weaponName.ru + '»' : '')).padEnd(48),
    'aura' + def.aura, 'ab' + def.abilityRate.toFixed(2), 'anim' + def.animationRate.toFixed(2), 'gait:' + def.gait);
});
writePNG('bosslook.png', W, H, img);

// === ЛИСТ 2: кадры удара НАСТОЯЩИМ оружием (та же математика, что в бою) ===
const KITS = ['whispering_grove_boss_6', 'necropolis_boss_17', 'gnomish_ruins_boss_12', 'sky_citadel_boss_20'];
const COLS2 = 4, CELLW2 = 440, CELLH2 = 360, SCALE2 = 1.1;
const W2 = COLS2 * CELLW2, H2 = KITS.length * CELLH2;
const img2 = Buffer.alloc(W2 * H2 * 3);
for (let i = 0; i < W2 * H2; i++) { img2[i * 3] = 22; img2[i * 3 + 1] = 26; img2[i * 3 + 2] = 36; }
KITS.forEach((id, row) => {
  const def = gd.ALL_ENEMIES[id];
  if (!def) { console.log('нет босса', id); return; }
  const art = bossGrid(def, 'attackC');
  const ws = buildWeaponSprite(def.weapon, true, def.id);
  const m = paletteMap(def.color);
  for (let c = 0; c < COLS2; c++) {
    const g = art.map(r => r.slice());
    if (ws) {
      // Тот же диапазон углов, что в drawEnemyAttackArc: замах за спину → удар вперёд.
      const a0 = -Math.PI * 0.5 * 0.85, a1 = Math.PI * 0.5;
      const t = c / (COLS2 - 1);
      stampRotated(g, ws.grid, ws.pivotX, ws.pivotY, ws.axis, a0 + (a1 - a0) * t);
    }
    blit(img2, W2, g, m, c, row, CELLW2, CELLH2, SCALE2);
  }
  console.log('удар:', id.padEnd(26), String(def.weapon).padEnd(10),
    ws ? ('ось ' + (ws.axis * 180 / Math.PI).toFixed(0) + '°, длина ' + ws.length.toFixed(0) + ' px') : 'оружия нет (когти)');
});
writePNG('swinglook.png', W2, H2, img2);
console.log('готово: bosslook.png', W + 'x' + H, '| swinglook.png', W2 + 'x' + H2);
