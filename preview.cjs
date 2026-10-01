// Временный инструмент: рендерит реальные кадры спрайтов в PNG-контактный лист.
// Нужен, чтобы глазами проверить походку и атаки. Удалить после проверки.
const zlib = require('zlib');
const fs = require('fs');
const { buildMonsterArt, buildPalette, ART_N } = require('./out/monsterArt.js');
const ZOOM_RAW = process.argv[2] || '1';
// GAMEMODE: preview.cjs game -> 256px art is squashed to 56px (real in-game size)
// and shown 2x nearest. This is exactly what the player sees.
const GAMEMODE = ZOOM_RAW === 'game';
const ZOOM = GAMEMODE ? 2 : Number(ZOOM_RAW);
const ONLY = process.argv[3] ? process.argv[3].split(',') : null;

function crc32(buf) {
  let c, table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function writePNG(file, w, h, rgb) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  fs.writeFileSync(file, Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
  ]));
}
const FILLS = { 0: null, 1: 'outline', 2: 'bodyDark', 3: 'body', 4: 'bodyLight', 5: 'metalDark', 6: 'metal', 7: 'metalLight', 8: 'gold', 9: 'eye', 10: 'bone', 11: 'mouth', 12: 'accent' };
function hex2rgb(h) { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }

// Кадры: 0-7 = ходьба (8 фаз), 8-11 = атака, 12 = покой
const COLS = ZOOM > 1 ? ['walkA', 'walkB', 'walkC', 'walkD', 'walkE', 'walkF'] : ['walkA', 'walkB', 'walkC', 'walkD', 'walkE', 'walkF', 'walkG', 'walkH', 'attackA', 'attackB', 'attackC', 'attackD', 'reach', 'idle'];
const ALL_CAST = [
  ['whispering_grove', 'blob', 'slither', 'poison', 'slime', []],
  ['whispering_grove', 'wolf', 'gallop', 'poison', 'wolf', []],
  ['gnomish_ruins', 'golem', 'stomp', 'fire', 'golem', ['rockArmor']],
  ['necropolis', 'skeleton', 'shamble', 'dark', 'skeleton', ['boneRibs']],
  ['idol_jungle', 'spider', 'crawl', 'poison', 'spider', []],
  ['sunken_fleet', 'eye', 'float', 'ice', 'eye', []],
  ['sky_citadel', 'gargoyle', 'glide', 'storm', 'gargoyle', ['wingMembranes']],
  ['sky_citadel', 'bat', 'flit', 'storm', 'bat', ['wingMembranes']],
];
const CAST = ONLY ? ALL_CAST.filter((c) => ONLY.indexOf(c[4]) >= 0) : ALL_CAST;
const GAMEPX = Number(process.argv[4]) || 28; // обычный монстр в игре: r=14 -> 28px
const CELL = GAMEMODE ? GAMEPX * ZOOM : 64 * ZOOM;
const SCALE = ART_N / CELL;
const W = COLS.length * CELL, H = CAST.length * CELL;
const img = Buffer.alloc(W * H * 3);
// фон — тёмно-синий, как в игре
for (let i = 0; i < W * H; i++) { img[i * 3] = 18; img[i * 3 + 1] = 22; img[i * 3 + 2] = 34; }
CAST.forEach(([dg, shape, gait, element, name, traits], row) => {
  const pal = buildPalette(name === 'slime' ? '#5fbf3f' : name === 'golem' ? '#b08a5a' : name === 'skeleton' ? '#c0bca8' : name === 'spider' ? '#2f9a5a' : name === 'eye' ? '#2f6a9a' : '#8a8ac8');
  const palMap = {}; for (const k in FILLS) if (FILLS[k]) palMap[k] = hex2rgb(pal[FILLS[k]]);
  COLS.forEach((v, col) => {
    const art = buildMonsterArt(`${dg}_${shape}_${name}`, shape, false, { nameRu: name, nameEn: name, element, traits, gait, attack: 'weaponSweep' }, v);
    for (let y = 0; y < CELL; y++) for (let x = 0; x < CELL; x++) {
      // GAMEMODE: спрайт уменьшается сглаживанием (в игре drawPixelMonster
      // включает imageSmoothingEnabled) — среднее по блоку вместо выборки
      // одного пикселя, иначе превью не совпадает с картинкой в игре.
      let c;
      if (GAMEMODE) {
        const x0 = Math.floor(x * SCALE), x1 = Math.min(ART_N, Math.max(x0 + 1, Math.floor((x + 1) * SCALE)));
        const y0 = Math.floor(y * SCALE), y1 = Math.min(ART_N, Math.max(y0 + 1, Math.floor((y + 1) * SCALE)));
        let r = 0, g = 0, b = 0, w = 0;
        for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) {
          const p = palMap[art[yy][xx]]; if (!p) continue;
          r += p[0]; g += p[1]; b += p[2]; w++;
        }
        c = w ? [r / w, g / w, b / w] : null;
      } else {
        const sy = Math.min(ART_N - 1, Math.floor(y * SCALE));
        const sx = Math.min(ART_N - 1, Math.floor(x * SCALE));
        c = palMap[art[sy][sx]];
      }
      if (!c) continue;
      const o = ((row * CELL + y) * W + col * CELL + x) * 3;
      img[o] = c[0]; img[o + 1] = c[1]; img[o + 2] = c[2];
    }
  });
});
writePNG('preview.png', W, H, img);
// Диагностика: реально ли двигаются НОГИ (ниже таза) и КОРПУС.
if (process.env.LEGS) {
  ALL_CAST.forEach(([dg, shape, gait, element, name, traits]) => {
    const M = { nameRu: name, nameEn: name, element, traits, gait, attack: 'weaponSweep' };
    const out = [];
    for (const v of ['walkA', 'walkB', 'walkC', 'walkD', 'attackA', 'attackC']) {
      const art = buildMonsterArt(`${dg}_${shape}_${name}`, shape, false, M, v);
      let lo = 999, hi = -1, top = 999, n = 0;
      for (let y = Math.floor(ART_N * 0.6); y < ART_N; y++) {
        for (let x = 0; x < ART_N; x++) {
          if (!art[y][x]) continue;
          if (x < lo) lo = x;
          if (x > hi) hi = x;
          if (y < top) top = y;
          n++;
        }
      }
      out.push(`${v}[x${lo}..${hi} ш${hi - lo} верх${top} px${n}]`);
    }
    console.log(`  НОГИ ${name}/${gait}: ${out.join(' ')}`);
  });
}
console.log('preview.png', W + 'x' + H, '| строки сверху вниз:', CAST.map((c) => c[4] + '/' + c[2]).join(', '));
console.log('колонки:', COLS.join(' '));
// Считаем, сколько пикселей РЕАЛЬНО отличается между соседними кадрами ходьбы
CAST.forEach(([dg, shape, gait, element, name, traits]) => {
  const diffs = [];
  for (let i = 0; i < 8; i++) {
    const a = buildMonsterArt(`${dg}_${shape}_${name}`, shape, false, { nameRu: name, nameEn: name, element, traits, gait, attack: 'weaponSweep' }, 'walk' + 'ABCDEFGH'[i]).flat();
    const b = buildMonsterArt(`${dg}_${shape}_${name}`, shape, false, { nameRu: name, nameEn: name, element, traits, gait, attack: 'weaponSweep' }, 'walk' + 'ABCDEFGH'[(i + 1) % 8]).flat();
    let d = 0; for (let k = 0; k < a.length; k++) if (a[k] !== b[k]) d++;
    diffs.push(d);
  }
  const atkA = buildMonsterArt(`${dg}_${shape}_${name}`, shape, false, { nameRu: name, nameEn: name, element, traits, gait, attack: 'weaponSweep' }, 'attackA').flat();
  const atkC = buildMonsterArt(`${dg}_${shape}_${name}`, shape, false, { nameRu: name, nameEn: name, element, traits, gait, attack: 'weaponSweep' }, 'attackC').flat();
  let ad = 0; for (let k = 0; k < atkA.length; k++) if (atkA[k] !== atkC[k]) ad++;
  console.log(`${name}/${gait}: разница между кадрами ходьбы = ${diffs.join(',')} | замах→удар = ${ad}`);
});
