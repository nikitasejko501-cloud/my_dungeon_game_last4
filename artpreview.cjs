// ============================================================
// ART PREVIEW — хедлес-предпросмотр пиксель-арта монстров и боссов.
//
// Рисует СЕТКИ спрайтов (те же ArtGrid, что видит движок) в PNG без браузера:
// свой растеризатор слоёв + свой PNG-энкодер (zlib из Node). Плюс метрики:
//   • «полосатость» — насколько ярко скачет контраст поперёк силуэта (те самые
//     «странные полосы»);
//   • различимость — расстояние Хэмминга между силуэтами (256 бит).
//
// Запуск:
//   node artpreview.cjs                 листы боссов + монстров + метрики
//   node artpreview.cjs --bosses        только боссы
//   node artpreview.cjs --monsters      только монстры
//   node artpreview.cjs --anim <id>     кадровая лента конкретного врага
//   node artpreview.cjs --only <dgn>    ограничить одно подземелье
//   node artpreview.cjs --cell 160      размер ячейки листа
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const zlib = require('zlib');

const ROOT = __dirname;
const OUT = path.join(ROOT, '.smoke');
const ENTRY = path.join(OUT, 'combatEngine.js');

/** Самый свежий .ts в src — по нему решаем, надо ли компилировать (как в smoke.cjs). */
function newestSource(dir) {
  let max = 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) max = Math.max(max, newestSource(p));
    else if (e.name.endsWith('.ts') || e.name.endsWith('.tsx')) max = Math.max(max, fs.statSync(p).mtimeMs);
  }
  return max;
}

if (!fs.existsSync(ENTRY) || newestSource(path.join(ROOT, 'src')) > fs.statSync(ENTRY).mtimeMs) {
  process.stdout.write('· компиляция src → .smoke … ');
  cp.execSync(
    'npx tsc --module commonjs --target es2020 --moduleResolution node --esModuleInterop ' +
    '--skipLibCheck --outDir .smoke src/combatEngine.ts',
    { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'] }
  );
  console.log('готово');
}
fs.writeFileSync(path.join(OUT, 'package.json'), '{ "type": "commonjs" }\n');

const art = require(path.join(OUT, 'monsterArt.js'));
const gameData = require(path.join(OUT, 'gameData.js'));
const ident = require(path.join(OUT, 'dungeonIdentity.js'));
const sigs = require(path.join(OUT, 'signatureAttacks.js'));

const { buildPalette, buildMonsterArt, ART_VARIANTS } = art;
const ALL = gameData.ALL_ENEMIES;

// === PNG (чистый Node: IHDR/IDAT/IEND + CRC32) ==============================
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
/** RGBA-буфер w*h → PNG (фильтр 0 на каждой строке). */
function pngEncode(w, h, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // color type RGBA
  const stride = w * 4 + 1;
  const raw = Buffer.alloc(stride * h);
  for (let y = 0; y < h; y++) {
    raw[y * stride] = 0;
    rgba.copy(raw, y * stride + 1, y * w * 4, (y + 1) * w * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 6 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
// === ЛИСТ (RGBA-буфер + вставка спрайтов со средне-блочным уменьшением) =====
const FONT3X5 = {
  '0': '111101101101111', '1': '010110010010111', '2': '111001111100111',
  '3': '111001111001111', '4': '101101111001001', '5': '111100111001111',
  '6': '111100111101111', '7': '111001010010010', '8': '111101111101111',
  '9': '111101111001111', '#': '101111101111101', '-': '000000111000000',
};
function hexRgb(hex) {
  const h = parseInt(String(hex || '#ffffff').slice(1), 16);
  return [(h >> 16) & 255, (h >> 8) & 255, h & 255];
}

class Sheet {
  constructor(w, h, bg = '#17171f') {
    this.w = w; this.h = h;
    this.buf = Buffer.alloc(w * h * 4);
    const [r, g, b] = hexRgb(bg);
    for (let i = 0; i < w * h; i++) {
      this.buf[i * 4] = r; this.buf[i * 4 + 1] = g; this.buf[i * 4 + 2] = b; this.buf[i * 4 + 3] = 255;
    }
  }
  dot(x, y, rgb, a = 255) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const o = ((y | 0) * this.w + (x | 0)) * 4;
    const t = a / 255;
    this.buf[o] = this.buf[o] * (1 - t) + rgb[0] * t;
    this.buf[o + 1] = this.buf[o + 1] * (1 - t) + rgb[1] * t;
    this.buf[o + 2] = this.buf[o + 2] * (1 - t) + rgb[2] * t;
  }
  rect(x, y, w, h, hex) {
    const rgb = hexRgb(hex);
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.dot(i, j, rgb);
  }
  text(x, y, str, hex = '#d8d8e6', scale = 1) {
    const rgb = hexRgb(hex);
    let cx = x;
    for (const ch of String(str)) {
      const glyph = FONT3X5[ch] || FONT3X5['#'];
      for (let gy = 0; gy < 5; gy++) {
        for (let gx = 0; gx < 3; gx++) {
          if (glyph[gy * 3 + gx] !== '1') continue;
          for (let sy = 0; sy < scale; sy++) {
            for (let sx = 0; sx < scale; sx++) this.dot(cx + gx * scale + sx, y + gy * scale + sy, rgb);
          }
        }
      }
      cx += 4 * scale;
    }
  }
  save(file) { fs.writeFileSync(file, pngEncode(this.w, this.h, this.buf)); }
}

/**
 * ArtGrid → RGBA нативного размера. Слои 1..12 → палитра, как в
 * combatEngine.layerFill, чтобы предпросмотр совпадал с игрой один в один.
 */
function rasterGrid(grid, pal) {
  const n = grid.length;
  const rgba = Buffer.alloc(n * n * 4);
  const fills = new Array(13).fill(null);
  fills[1] = hexRgb(pal.outline); fills[2] = hexRgb(pal.bodyDark); fills[3] = hexRgb(pal.body);
  fills[4] = hexRgb(pal.bodyLight); fills[5] = hexRgb(pal.metalDark); fills[6] = hexRgb(pal.metal);
  fills[7] = hexRgb(pal.metalLight); fills[8] = hexRgb(pal.gold); fills[9] = hexRgb(pal.eye);
  fills[10] = hexRgb(pal.bone); fills[11] = hexRgb(pal.mouth); fills[12] = hexRgb(pal.accent);
  for (let y = 0; y < n; y++) {
    const row = grid[y];
    for (let x = 0; x < n; x++) {
      const v = row[x];
      if (!v) continue;
      const c = fills[v] || fills[3];
      const o = (y * n + x) * 4;
      rgba[o] = c[0]; rgba[o + 1] = c[1]; rgba[o + 2] = c[2]; rgba[o + 3] = 255;
    }
  }
  return { n, rgba };
}

/** Вставить спрайт в лист со средне-блочным уменьшением (как imageSmoothing в игре). */
function blit(sheet, rgba, n, dx, dy, size) {
  for (let j = 0; j < size; j++) {
    const y0 = Math.floor((j / size) * n), y1 = Math.max(y0 + 1, Math.floor(((j + 1) / size) * n));
    for (let i = 0; i < size; i++) {
      const x0 = Math.floor((i / size) * n), x1 = Math.max(x0 + 1, Math.floor(((i + 1) / size) * n));
      let rs = 0, gs = 0, bs = 0, cnt = 0;
      for (let sy = y0; sy < y1; sy++) {
        const base = sy * n;
        for (let sx = x0; sx < x1; sx++) {
          const o = (base + sx) * 4;
          if (rgba[o + 3] < 8) continue;
          rs += rgba[o]; gs += rgba[o + 1]; bs += rgba[o + 2]; cnt++;
        }
      }
      if (!cnt) continue;
      sheet.dot(dx + i, dy + j, [rs / cnt, gs / cnt, bs / cnt], 255);
    }
  }
}

// === МЕТРИКИ ================================================================
/**
 * «ПОЛОСАТОСТЬ». Считаем по нативной сетке, только по непрозрачным пикселям:
 * для каждой строки — доля пикселей, у которых яркость отличается от строки
 * выше более чем на TH. Если доля > ROW_FRAC, строку пересекает видимая
 * граница через весь силуэт: это и есть «странная полоса поперёк тела».
 *
 * ВАЖНО: пиксели ФОНА листа тоже непрозрачные, и переход «фон → тело» на краю
 * фигуры давал полосу на всю ширину строки — метрика ругалась на пустом месте
 * (замер: 130/132 боссов «полосатые» и до, и после починки спрайта). Фон
 * листа (#17171f) исключаем из подсчёта.
 */
const SHEET_BG = [23, 23, 31]; // #17171f
function stripeScore(rgba, n, TH = 15, ROW_FRAC = 0.45) {
  const L = (o) => 0.299 * rgba[o] + 0.587 * rgba[o + 1] + 0.114 * rgba[o + 2];
  const body = (o) => rgba[o + 3] >= 8 &&
    (rgba[o] !== SHEET_BG[0] || rgba[o + 1] !== SHEET_BG[1] || rgba[o + 2] !== SHEET_BG[2]);
  let bands = 0, worst = 0, longest = 0, run = 0, rows = 0;
  for (let y = 1; y < n; y++) {
    let strong = 0, cnt = 0;
    for (let x = 0; x < n; x++) {
      const o = (y * n + x) * 4, p = ((y - 1) * n + x) * 4;
      if (!body(o) || !body(p)) continue;
      cnt++;
      if (Math.abs(L(o) - L(p)) > TH) strong++;
    }
    if (cnt < n * 0.12) { run = 0; continue; }
    rows++;
    const frac = strong / cnt;
    if (frac > worst) worst = frac;
    if (frac > ROW_FRAC) { bands++; run++; longest = Math.max(longest, run); }
    else run = 0;
  }
  return { bands, worst, longest, rows };
}

/**
 * «ХЭШ ОБЛИКА» 16×16. ВАЖНО: учитываем не только силуэт (альфу), но и СЛОИ.
 *
 * Раньше кодировалась только альфа, и метрика объявляла «близнецами» боссов с
 * совершенно разным оружием: клинок/лук/молот рисуются ПОВЕРХ тела и меняют
 * слой (цвет), но не альфу — а регалии вообще собраны из слоёв внутри уже
 * заполненных клеток. В клетке кодируем ДВА бита: заполненность и средний слой.
 * Это ровно то, что видит игрок на экране.
 */
function siloHash(rgba, n) {
  const h = new Uint8Array(512);
  const cell = Math.max(1, Math.ceil(n / 16));
  // Яркость → номер слоя обратно не восстановить, поэтому в клетке считаем
  // «сколько пикселей заполнено» (0..255 → 2 бита) и «насколько светлый» слой.
  const L = (o) => 0.299 * rgba[o] + 0.587 * rgba[o + 1] + 0.114 * rgba[o + 2];
  for (let cy = 0; cy < 16; cy++) {
    for (let cx = 0; cx < 16; cx++) {
      let cnt = 0, filled = 0, sum = 0;
      for (let y = cy * cell; y < Math.min(n, (cy + 1) * cell); y++) {
        for (let x = cx * cell; x < Math.min(n, (cx + 1) * cell); x++) {
          const o = (y * n + x) * 4;
          cnt++;
          if (rgba[o + 3] < 8) continue;
          filled++;
          sum += L(o);
        }
      }
      const f = cnt ? filled / cnt : 0;
      const q = f < 0.15 ? 0 : f < 0.45 ? 1 : f < 0.8 ? 2 : 3;
      const avg = filled ? sum / filled : 0;
      // Градация яркости ≈ слоям палитры (контур 17 … кость 233).
      const c2 = avg < 40 ? 0 : avg < 110 ? 1 : avg < 180 ? 2 : 3;
      const i = (cy * 16 + cx) * 2;
      h[i] = q; h[i + 1] = c2;
    }
  }
  return h;
}
function hamming(a, b) {
  let d = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++;
  return d;
}
/** Доля пикселей, отличающихся между двумя кадрами (0 = кадры идентичны). */
function frameDelta(ga, gb) {
  const n = Math.min(ga.length, gb.length);
  let diff = 0, total = 0;
  for (let y = 0; y < n; y++) {
    const ra = ga[y], rb = gb[y];
    const m = Math.min(ra.length, rb.length);
    for (let x = 0; x < m; x++) {
      if (!ra[x] && !rb[x]) continue;
      total++;
      if (ra[x] !== rb[x]) diff++;
    }
  }
  return total ? diff / total : 0;
}

// === ДАННЫЕ ВРАГА ===========================================================
/** Мета для buildMonsterArt — ровно как в combatEngine.drawPixelMonster. */
function metaFor(def) {
  const shape = def.shape || 'blob';
  return {
    nameRu: def.name.ru,
    nameEn: def.name.en,
    element: def.element,
    traits: def.traits,
    gait: ident.gaitForShape(shape, def.gait || 'walk'),
    attack: sigs.signatureFor(shape, def.attackType),
    weapon: def.weapon,
    regalia: def.regalia,
  };
}
const shapeOf = (def) => def.shape || 'blob';
const shortShape = (def) => shapeOf(def).slice(0, 4);
function buildGrid(def, variant) {
  return buildMonsterArt(def.id, shapeOf(def), !!def.isBoss, metaFor(def), variant);
}
function bossesOf(onlyDg) {
  const out = [];
  for (const def of Object.values(ALL)) {
    if (!def.isBoss) continue;
    if (onlyDg && def.dungeonId !== onlyDg) continue;
    out.push(def);
  }
  return out.sort((a, b) => a.id.localeCompare(b.id));
}
function monstersOf(onlyDg, perDungeon) {
  const byDg = {};
  for (const def of Object.values(ALL)) {
    if (def.isBoss || !def.dungeonId) continue;
    if (onlyDg && def.dungeonId !== onlyDg) continue;
    (byDg[def.dungeonId] = byDg[def.dungeonId] || []).push(def);
  }
  const res = {};
  for (const [dg, list] of Object.entries(byDg)) {
    list.sort((a, b) => a.id.localeCompare(b.id));
    if (perDungeon && list.length > perDungeon) {
      const step = list.length / perDungeon;
      const picked = [];
      for (let i = 0; i < perDungeon; i++) picked.push(list[Math.floor(i * step)]);
      res[dg] = picked;
    } else res[dg] = list;
  }
  return res;
}

// === РЕЖИМЫ ВЫВОДА ==========================================================
const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const arg = (name, def) => { const i = argv.indexOf(name); return i >= 0 && argv[i + 1] ? argv[i + 1] : def; };
const DIR = path.join(ROOT, 'preview');
fs.mkdirSync(DIR, { recursive: true });

const report = [];
const say = (s) => { report.push(s); console.log(s); };

/** Лист ячеек: PNG + sidecar-список «номер ячейки → кто там нарисован». */
function makeSheet(items, cell, cols, file, title) {
  const pad = 7, labelH = 12;
  const rows = Math.ceil(items.length / cols);
  const sheet = new Sheet(cols * (cell + pad) + pad, rows * (cell + pad + labelH) + pad);
  const lines = [title || String(file)];
  items.forEach((it, idx) => {
    const cx = pad + (idx % cols) * (cell + pad);
    const cy = pad + Math.floor(idx / cols) * (cell + pad + labelH);
    sheet.rect(cx - 1, cy - 1, cell + 2, cell + 2, '#31313f');
    const r = rasterGrid(it.grid, it.pal);
    blit(sheet, r.rgba, r.n, cx, cy, cell);
    const num = String(idx + 1);
    sheet.rect(cx + 1, cy + 1, num.length * 4 + 2, 7, '#101018');
    sheet.text(cx + 2, cy + 2, num, '#ffe27a', 1);
    lines.push(`${String(idx + 1).padStart(3, '0')}  ${it.tag}`);
  });
  sheet.save(file);
  fs.writeFileSync(String(file).replace(/\.png$/, '.txt'), lines.join('\n') + '\n');
  return path.basename(file);
}

function bossSheet(onlyDg) {
  const cell = +arg('--cell', 160);
  const list = bossesOf(onlyDg);
  const byDg = {};
  for (const d of list) (byDg[d.dungeonId || 'other'] = byDg[d.dungeonId || 'other'] || []).push(d);
  for (const [dg, defs] of Object.entries(byDg)) {
    const items = defs.map((d) => ({
      grid: buildGrid(d, 'idle'),
      pal: buildPalette(d.color || '#ffffff'),
      tag: `${shortShape(d)} reg=${String(d.regalia ?? 0)} ${d.weapon || '-'} ${d.element || ''} | ${d.name.ru}`,
    }));
    say(`· лист боссов ${dg}: ${makeSheet(items, cell, 5, path.join(DIR, `bosses_${dg}.png`), dg)}`);
  }
  return list;
}

/** Лист «одна форма — все боссы»: здесь лучше всего видно, похожи они или нет. */
function shapeSheets(onlyDg) {
  const cell = +arg('--cell', 160);
  const byShape = {};
  for (const d of bossesOf(onlyDg)) (byShape[shapeOf(d)] = byShape[shapeOf(d)] || []).push(d);
  for (const [sh, defs] of Object.entries(byShape)) {
    if (defs.length < 4) continue;
    const items = defs.map((d) => ({
      grid: buildGrid(d, 'idle'),
      pal: buildPalette(d.color || '#ffffff'),
      tag: `reg=${String(d.regalia ?? 0)} | ${d.weapon || '-'} | ${d.name.ru}`,
    }));
    say(`· форма ${sh}: ${makeSheet(items, cell, 6, path.join(DIR, `shape_${sh}.png`), sh)}`);
  }
}

function monsterSheets(onlyDg) {
  const cell = +arg('--cell', 112);
  const groups = monstersOf(onlyDg, has('--all-monsters') ? 0 : 24);
  for (const [dg, defs] of Object.entries(groups)) {
    const items = defs.map((d) => ({
      grid: buildGrid(d, 'idle'),
      pal: buildPalette(d.color || '#ffffff'),
      tag: `${shortShape(d)} ${d.weapon || '-'} ${d.element || ''} | ${d.name.ru}`,
    }));
    say(`· лист монстров ${dg}: ${makeSheet(items, cell, 6, path.join(DIR, `monsters_${dg}.png`), dg)}`);
  }
}

// === КАДРОВАЯ ЛЕНТА =========================================================
/** Все варианты одного врага + проверка, что кадры РЕАЛЬНО разные. */
function animStrip(id) {
  const def = ALL[id];
  if (!def) { console.log(`нет врага ${id}; примеры: ${Object.keys(ALL).slice(0, 6).join(', ')}`); return; }
  const cell = +arg('--cell', 132);
  const pal = buildPalette(def.color || '#ffffff');
  const grids = {};
  const items = ART_VARIANTS.map((v) => {
    const g = buildGrid(def, v);
    grids[v] = g;
    return { grid: g, pal, tag: v };
  });
  say(`· лента ${id} (${def.name.ru}): ${makeSheet(items, cell, 5, path.join(DIR, `anim_${id}.png`), id)}`);
  const deltas = [];
  for (let i = 1; i < ART_VARIANTS.length; i++) {
    const a = grids[ART_VARIANTS[i - 1]], b = grids[ART_VARIANTS[i]];
    if (a && b) deltas.push(`${ART_VARIANTS[i - 1].slice(0, 4)}>${ART_VARIANTS[i].slice(0, 4)} ${(frameDelta(a, b) * 100).toFixed(1)}%`);
  }
  say(`  различия соседних кадров: ${deltas.join('  ')}`);
}

// === МЕТРИКИ ПО ВСЕМ БОССАМ =================================================
function metrics(bosses) {
  say('');
  say('=== МЕТРИКИ БОССОВ ===');
  const rows = bosses.map((d) => {
    const grid = buildGrid(d, 'idle');
    const r = rasterGrid(grid, buildPalette(d.color || '#ffffff'));
    return Object.assign({ def: d }, stripeScore(r.rgba, r.n), { hash: siloHash(r.rgba, r.n) });
  });
  const bandRows = rows.filter(x => x.bands > 0);
  const avg = rows.reduce((s, x) => s + x.bands, 0) / (rows.length || 1);
  say(`полосатые строки: боссов с >=1 = ${bandRows.length}/${rows.length}, в среднем ${avg.toFixed(1)}, максимум ${Math.max(0, ...rows.map(x => x.bands))}`);
  rows.sort((a, b) => b.bands - a.bands || b.worst - a.worst);
  for (const r of rows.slice(0, 8)) {
    say(`  полос ${String(r.bands).padStart(3)} (макс доля ${(r.worst * 100).toFixed(0)}%): ${r.def.id} — ${r.def.name.ru} [${shapeOf(r.def)}]`);
  }
  const byShape = {};
  for (const r of rows) (byShape[shapeOf(r.def)] = byShape[shapeOf(r.def)] || []).push(r);
  let twins = 0, pairs = 0, sumMin = 0, cntMin = 0, worstPair = null;
  for (const group of Object.values(byShape)) {
    let minPair = null;
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const d = hamming(group[i].hash, group[j].hash);
        pairs++;
        if (!minPair || d < minPair.d) minPair = { d, a: group[i].def, b: group[j].def };
        if (!worstPair || d < worstPair.d) worstPair = { d, a: group[i].def, b: group[j].def };
        if (d < 40) twins++;
      }
    }
    if (minPair) { sumMin += minPair.d; cntMin++; }
  }
  say(`различимость внутри формы: пар ${pairs}, средний «самый близкий сосед» ${(sumMin / (cntMin || 1)).toFixed(1)} бит/512, близких пар (<40) = ${twins}`);
  if (worstPair) say(`  самые похожие: ${worstPair.a.id} <-> ${worstPair.b.id} (${worstPair.d} бит) — ${worstPair.a.name.ru} vs ${worstPair.b.name.ru}`);
  const step = Math.max(1, Math.floor(rows.length / 6));
  say('оживлённость походки (средняя доля изменённых пикселей между соседними кадрами):');
  for (let i = 0; i < rows.length && i / step < 6; i += step) {
    const r = rows[i];
    let sum = 0, cnt = 0, prev = null;
    for (const v of ART_VARIANTS.filter(x => x.indexOf('walk') === 0)) {
      const g = buildGrid(r.def, v);
      if (prev) { sum += frameDelta(prev, g); cnt++; }
      prev = g;
    }
    say(`  ${(cnt ? (sum / cnt) * 100 : 0).toFixed(1)}%  ${r.def.id} — ${r.def.name.ru} [${shapeOf(r.def)}/${r.def.gait || 'walk'}]`);
  }
}

// === ГЛАВНОЕ ================================================================
const onlyDg = arg('--only', null);
if (has('--anim')) animStrip(argv[argv.indexOf('--anim') + 1]);
else {
  const doBosses = !has('--monsters') || has('--bosses');
  const doMonsters = !has('--bosses') || has('--monsters');
  if (doBosses) {
    const bosses = bossSheet(onlyDg);
    shapeSheets(onlyDg);
    if (!has('--quiet')) metrics(bosses);
  }
  if (doMonsters) monsterSheets(onlyDg);
}
fs.writeFileSync(path.join(DIR, 'report.txt'), report.join('\n') + '\n');
console.log(`листы в ${DIR}`);

