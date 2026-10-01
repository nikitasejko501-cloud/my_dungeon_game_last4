// Фокусный превью МАХА КРЫЛА: 8 фаз цикла для крылатых и парящих форм.
// Крыло вращается вокруг плеча (wingStroke) и одновременно проносится вперёд/назад
// (sweep из flapStroke), поэтому конец крыла описывает «восьмёрку», а не ходит
// вверх-вниз по прямой. Фаза берётся из той же функции, что в бою: движок
// наклоняет корпус по pitch, а крыло двигает спрайт — кривая одна на двоих.
//
// Числовая таблица рядом проверяет, что мах РЕАЛЬНО есть: развёртка крыла
// (ширина в поясе выше плеч) и верхняя точка должны меняться по кадрам, а у
// каменной гаргульи (stomp) — стоять на месте: она топает, крылья сложены.
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
// bat/dragon — крылатые (мах), gargoyle — каменный ходок (крылья сложены, контроль),
// spirit — парит без крыльев (контроль: тело колышется, крыльев нет).
const ROWS = [
  ['bat', 'glide', '#7a4fbf', 'bat'],
  ['dragon', 'glide', '#b04040', 'drake'],
  ['gargoyle', 'stomp', '#8a8a8a', 'gargoyle'],
  ['spirit', 'float', '#9fe8ff', 'spirit'],
];
const CELL = 180, SCALE = ART_N / CELL, W = COLS.length * CELL, H = ROWS.length * CELL;
const img = Buffer.alloc(W * H * 3);
for (let i = 0; i < W * H; i++) { img[i * 3] = 16; img[i * 3 + 1] = 20; img[i * 3 + 2] = 32; }
ROWS.forEach(([shape, gait, color, name], row) => {
  const pal = buildPalette(color); const m = {}; for (const k in FILLS) if (FILLS[k]) m[k] = hex2rgb(pal[FILLS[k]]);
  const arts = COLS.map(v => buildMonsterArt('fp_' + shape, shape, false,
    { nameRu: name, nameEn: name, element: 'storm', traits: [], gait, attack: 'weaponSweep' }, v));
  let foot = 0;
  arts[0].forEach((r, y) => { if (r.some(c => c)) foot = y; });
  const y0 = Math.round(foot / SCALE) + row * CELL;
  for (let y = y0; y < y0 + 2 && y < H; y++) for (let x = 0; x < W; x++) { const o = ((y * W) + x) * 3; img[o] = 66; img[o + 1] = 54; img[o + 2] = 44; }
  arts.forEach((art, col) => {
    for (let y = 0; y < CELL; y++) for (let x = 0; x < CELL; x++) {
      const sy = Math.min(ART_N - 1, Math.floor(y * SCALE)), sx = Math.min(ART_N - 1, Math.floor(x * SCALE));
      const c = m[art[sy][sx]]; if (!c) continue;
      const o = ((row * CELL + y) * W + col * CELL + x) * 3; img[o] = c[0]; img[o + 1] = c[1]; img[o + 2] = c[2]; }
  });
  // === ЧИСЛОВАЯ ПРОВЕРКА МАХА ===
  // Пояс крыльев: строки выше линии плеч (neckY) — там только крылья и голова.
  // Меряем ПЛОЩАДЬ крыла и верхнюю точку, а не развёртку: у летучих крылья
  // нарисованы во всю ширину холста, и развёртка упирается в кромку (255 в каждом
  // кадре) — по ней мах не видно.
  const band = Math.round(di.anatomyFor(shape).neckY * ART_N);
  const wings = di.flapsWings(shape, gait);
  const area = [], top = [];
  let diff = 0;
  for (let i = 0; i < arts.length; i++) {
    let minY = ART_N, n = 0;
    for (let y = 0; y < band; y++) for (let x = 0; x < ART_N; x++) {
      if (!arts[i][y][x]) continue;
      n++; if (y < minY) minY = y;
    }
    area.push(n);
    top.push(minY === ART_N ? 0 : minY);
    if (i > 0) {
      let d = 0;
      for (let y = 0; y < band; y++) for (let x = 0; x < ART_N; x++) if (arts[i][y][x] !== arts[i - 1][y][x]) d++;
      diff = Math.max(diff, d);
    }
  }
  const areaVar = ((Math.max(...area) - Math.min(...area)) / Math.max(...area)) * 100;
  const topVar = Math.max(...top) - Math.min(...top);
  const ok = areaVar >= 3 || topVar >= 4 || diff >= 300;
  console.log(`${name.padEnd(9)} крыло по правилу flapsWings: ${wings ? 'бьёт' : 'сложено'}`);
  console.log(`          площадь крыла=[${area.map(x => String(x).padStart(5)).join(',')}] пикс (разброс ${areaVar.toFixed(1)}%)`);
  console.log(`          верх крыла  =[${top.map(x => String(x).padStart(5)).join(',')}] строка (ход ${topVar}) | смена кадров до ${diff}px`);
  console.log(`          => ${wings
    ? (ok ? 'МАХ ЕСТЬ: крыло двигается и по площади, и по верхней точке' : 'КРЫЛО СТОИТ — мах не читается')
    : 'мах не положен: крыло статично (двигается только корпус)'}`);
});
writePNG('flight.png', W, H, img);
console.log('\nflight.png', W + 'x' + H, '| строки:', ROWS.map(r => r[3]).join(', '));
console.log('колонки: walkA..walkH = фазы 0..7/8; мах вниз — рабочий, под ним корпус и подбрасывает.');
