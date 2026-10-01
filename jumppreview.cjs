// Фокусный превью ПРЫЖКА: 8 фаз цикла для тех, кто НЕ ходит ногами, а прыгает.
// Кадр берётся по той же фазе, что и в бою (walkPhase = индекс кадра / 8), а
// дуга — из ОБЩЕЙ математики jumpArc (dungeonIdentity): четыре фазы
// «присед → толчок → парабола → приземление».
//
// ЧТО СЧИТАЕТ САМ СПРАЙТ, А ЧТО ДВИЖОК. Оторвать фигуру от земли спрайт не
// может и НЕ ДОЛЖЕН: низ спрайта — это линия земли (движок рисует спрайт так,
// что его нижняя кромка лежит на земле и по этой же кромке отсекает нижние
// строки). Подъём тела на пике дуги делает ДВИЖОК: он берёт тот же jumpArc и
// поднимает корпус на 0.85 радиуса, а тень под ним сжимается и гаснет. Спрайт
// же отвечает за деформацию: присед-расплющивание, вытягивание на толчке,
// поджатые лапы в полёте. Поэтому здесь меряется ДЕФОРМАЦИЯ (изменение силуэта
// по фазам), а числа движка печатаются рядом.
const zlib = require('zlib');
const fs = require('fs');
const { buildMonsterArt, buildPalette, ART_N } = require('./out/monsterArt.js');
const di = require('./out/dungeonIdentity.js');
function crc32(buf) { let c, t = []; for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } let crc = 0xffffffff; for (let i = 0; i < buf.length; i++) crc = (crc ^ buf[i]) & 0xff ^ t[(crc >> 8) & 0xff]; return (crc ^ 0xffffffff) >>> 0; }
function chunk(type, data) { const l = Buffer.alloc(4); l.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type, 'ascii'), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td)); return Buffer.concat([l, td, c]); }
function writePNG(file, w, h, rgb) { const raw = Buffer.alloc((w * 3 + 1) * h); for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3); } const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2; fs.writeFileSync(file, Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))])); }
const FILLS = { 0: null, 1: 'outline', 2: 'bodyDark', 3: 'body', 4: 'bodyLight', 5: 'metalDark', 6: 'metal', 7: 'metalLight', 8: 'gold', 9: 'eye', 10: 'bone', 11: 'mouth', 12: 'accent' };
const hex2rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const COLS = ['walkA', 'walkB', 'walkC', 'walkD', 'walkE', 'walkF', 'walkG', 'walkH'];
// Строки: прыгающие по походке (wolf/imp = hop) и прыгающие ПО АНАТОМИИ —
// безногие (слизь и кристалл): опоры на лапы нет, единственная локомоция — толчок.
const ROWS = [
  ['wolf', 'hop', '#6a6a6a', 'wolf'],
  ['imp', 'hop', '#bf3f3f', 'imp'],
  ['blob', 'slither', '#7ac04a', 'slime'],
  ['crystal', 'walk', '#7fd6ff', 'crystal'],
];
const CELL = 180, SCALE = ART_N / CELL, W = COLS.length * CELL, H = ROWS.length * CELL;
const img = Buffer.alloc(W * H * 3);
for (let i = 0; i < W * H; i++) { img[i * 3] = 20; img[i * 3 + 1] = 24; img[i * 3 + 2] = 34; }
ROWS.forEach(([shape, gait, color, name], row) => {
  const pal = buildPalette(color); const m = {}; for (const k in FILLS) if (FILLS[k]) m[k] = hex2rgb(pal[FILLS[k]]);
  const arts = COLS.map(v => buildMonsterArt('jp_' + shape, shape, false,
    { nameRu: name, nameEn: name, element: 'fire', traits: [], gait, attack: 'weaponSweep' }, v));
  // Земля каждой строки — низ фигуры в НЕЙТРАЛЬНОЙ фазе (walkA: airborne=0).
  let foot = 0;
  arts[0].forEach((r, y) => { if (r.some(c => c)) foot = y; });
  const y0 = Math.round(foot / SCALE) + row * CELL;
  for (let y = y0; y < y0 + 2 && y < H; y++) for (let x = 0; x < W; x++) { const o = ((y * W) + x) * 3; img[o] = 70; img[o + 1] = 58; img[o + 2] = 46; }
  arts.forEach((art, col) => {
    for (let y = 0; y < CELL; y++) for (let x = 0; x < CELL; x++) {
      const sy = Math.min(ART_N - 1, Math.floor(y * SCALE)), sx = Math.min(ART_N - 1, Math.floor(x * SCALE));
      const c = m[art[sy][sx]]; if (!c) continue;
      const o = ((row * CELL + y) * W + col * CELL + x) * 3; img[o] = c[0]; img[o + 1] = c[1]; img[o + 2] = c[2]; }
  });
  // === ЧИСЛОВАЯ ПРОВЕРКА ДЕФОРМАЦИИ ===
  const hipPx = Math.floor(di.anatomyFor(shape).hipY * ART_N);
  const air = [], ink = [], legs = [], hgt = [];
  arts.forEach((art, col) => {
    const a = di.jumpArc(col / COLS.length);
    air.push(+a.airborne.toFixed(2));
    let n = 0, lg = 0, top = ART_N, bot = -1;
    for (let y = 0; y < ART_N; y++) for (let x = 0; x < ART_N; x++) {
      if (!art[y][x]) continue;
      n++; if (y > hipPx) lg++;
      if (y < top) top = y; if (y > bot) bot = y;
    }
    ink.push(n); legs.push(n ? Math.round((lg / n) * 100) : 0);
    hgt.push(bot < 0 ? 0 : bot - top + 1);
  });
  // Две независимые меры деформации: ПЛОЩАДЬ (для существ с хвостами/крыльями
  // силуэт меняется по-разному) и ВЫСОТА (у сплошных блоков — кристалл, голем —
  // площадь при приседе сохраняется, а высота падает: это и есть squash).
  const spread = (arr) => ((Math.max(...arr) - Math.min(...arr)) / Math.max(...arr)) * 100;
  const swing = spread(ink);
  const hVar = Math.max(...hgt) - Math.min(...hgt);
  const peak = Math.max(...air);
  const ok = peak >= 0.9 && (swing >= 3 || hVar >= 3);
  console.log(`${name.padEnd(8)} дуга   =[${air.map(x => x.toFixed(2).padStart(5)).join(',')}]`);
  console.log(`         силуэт =[${ink.map(x => String(x).padStart(5)).join(',')}] пикс (разброс ${swing.toFixed(1)}%)`);
  console.log(`         высота =[${hgt.map(x => String(x).padStart(5)).join(',')}] пикс (ход ${hVar}) | доля лап [${legs.join(',')}]%`);
  console.log(`         => ${ok ? 'ПРЫЖОК ЕСТЬ' : 'ДЕФОРМАЦИИ НЕТ'}; подъём тела делает движок: −0.85·r на пике, тень −45%`);
});
writePNG('jump.png', W, H, img);
console.log('\njump.png', W + 'x' + H, '| строки:', ROWS.map(r => r[3]).join(', '));
console.log('колонки: walkA..walkH = фазы 0..7/8 цикла; линия земли = низ фигуры в фазе 0.');
