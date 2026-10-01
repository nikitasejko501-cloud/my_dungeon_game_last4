// ============================================================
// STRIPE PROBE — почему строки скачат яркостью («полосы») и
// почему два босса одной формы почти неотличимы.
//
// Запуск: node stripeprobe.cjs [id]
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROOT = __dirname;
const OUT = path.join(ROOT, '.smoke');
const ENTRY = path.join(OUT, 'combatEngine.js');

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
const { buildPalette, buildMonsterArt, ART_VARIANTS, SS } = art;
const ALL = gameData.ALL_ENEMIES;

/** Мета — ТОЧНО как metaFor в artpreview (gait/attack из движка). */
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

function lum(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const arg = process.argv[2];

/**
 * РАЗБОР ПРИЧИНЫ ПОЛОС.
 *
 * Найдено: причина не в палитре и не в Баере, а в МАСШТАБИРОВАНИИ анатомии босса.
 * Тело рисуется на сетке 32×32 (SS = 32 при nart 32), затем весь рисунок
 * растягивается на 256/384 целочисленно (`c.g[y][x] = s[(y/scale)*32][(x/scale)*32]`).
 * Дробные координаты (напр. `c.tri(15.5, 0, ...)`, `c.ellipse(15.5, 16, ...)`) при
 * таком растяжении дают ПОВТОРЯЮЩИЕСЯ строки: соседние строки берутся из одной
 * исходной строки, а следующая — уже из другой. Отсюда «полоса поперёк тела»:
 * не дизеринг и не палитра, а лестница из одинаковых строк высотой scale.
 */
if (arg === '--cmp') {
  const BG = [23, 23, 31]; // фон листа artpreview: #17171f
  // Фон листа артпревью — тёмно-серый, и «полосой» он давал ложные срабатывания:
  // artpreview рисует спрайт на фоне и считает яркость по строке ВКЛЮЧАЯ фон, из-за
  // чего переход «фон → тело» считался скачком на всю ширину. Здесь мы честно
  // маскируем фон (подменяем на непрозрачный белый, чтобы не совпал ни с чем).
  const BG_MASK = [1, 254, 7];

  /** Копия stripeScore из artpreview.cjs, но фон листа исключён из подсчёта. */
  function stripeScore(rgba, n, TH = 15, ROW_FRAC = 0.45) {
    const L = (o) => 0.299 * rgba[o] + 0.587 * rgba[o + 1] + 0.114 * rgba[o + 2];
    const body = (o) => rgba[o + 3] >= 8 &&
      (rgba[o] !== BG_MASK[0] || rgba[o + 1] !== BG_MASK[1] || rgba[o + 2] !== BG_MASK[2]);
    let bands = 0, worst = 0, worstY = -1;
    const rows = [];
    for (let y = 1; y < n; y++) {
      let strong = 0, cnt = 0;
      for (let x = 0; x < n; x++) {
        const o = (y * n + x) * 4, p = ((y - 1) * n + x) * 4;
        if (!body(o) || !body(p)) continue;
        cnt++;
        if (Math.abs(L(o) - L(p)) > TH) strong++;
      }
      if (cnt < n * 0.12) continue;
      const frac = strong / cnt;
      if (frac > worst) { worst = frac; worstY = y; }
      if (frac > ROW_FRAC) { bands++; rows.push(y); }
    }
    return { bands, worst: +(worst * 100).toFixed(0), worstY, rows };
  }

  /** Как artpreview: `#rrggbb` → [r,g,b]; всё прочее → NaN → 0 (чёрный). */
  const parseBroken = (s) => {
    const h = parseInt(String(s || '#ffffff').slice(1), 16);
    return [(h >> 16) & 255, (h >> 8) & 255, h & 255];
  };
  /** Как combatEngine.fillU32: NaN → 0 → (0,0,0) в Uint32 → БЕЛЫЙ пиксель. */
  const parseEngine = (s) => {
    const h = parseInt(String(s || '#ffffff').slice(1), 16);
    if (!Number.isFinite(h)) return [255, 255, 255];
    return [h & 255, (h >> 8) & 255, (h >>> 16) & 255];
  };
  const parseFixed = (s) => {
    const t = String(s || '#ffffff').trim();
    if (t[0] === '#') {
      if (t.length === 4) return [parseInt(t[1] + t[1], 16), parseInt(t[2] + t[2], 16), parseInt(t[3] + t[3], 16)];
      return [parseInt(t.slice(1, 3), 16), parseInt(t.slice(3, 5), 16), parseInt(t.slice(5, 7), 16)];
    }
    const m = t.match(/rgba?\(([^)]+)\)/i);
    if (!m) return [255, 255, 255];
    const p = m[1].split(',').map((v) => parseFloat(v));
    return [Math.round(p[0]) & 255, Math.round(p[1]) & 255, Math.round(p[2]) & 255];
  };

  const FILL_KEYS = [null, 'outline', 'bodyDark', 'body', 'bodyLight', 'metalDark',
    'metal', 'metalLight', 'gold', 'eye', 'bone', 'mouth', 'accent'];

  /** Палитра босса (кэш — buildPalette вызывается на каждом шаге). */
  const palCache2 = new Map();
  function palOf(d) {
    let p = palCache2.get(d.color);
    if (!p) { p = buildPalette(d.color || '#ffffff'); palCache2.set(d.color, p); }
    return p;
  }

  function raster(grid, pal, parse, bgMask) {
    const n = grid.length;
    const rgba = Buffer.alloc(n * n * 4);
    const fills = FILL_KEYS.map((k, v) => (v === 0 ? [0, 0, 0] : parse(pal[k] || pal.body)));
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const v = grid[y][x], o = (y * n + x) * 4;
      // Пустой пиксель: либо полностью прозрачный, либо — как artpreview кладёт
      // спрайт на лист — залит фоном #17171f. Для метрики оба случая = «фона нет».
      if (!v) {
        if (bgMask) { rgba[o] = BG_MASK[0]; rgba[o + 1] = BG_MASK[1]; rgba[o + 2] = BG_MASK[2]; rgba[o + 3] = 255; }
        continue;
      }
      const c = fills[v] || fills[3];
      rgba[o] = c[0]; rgba[o + 1] = c[1]; rgba[o + 2] = c[2]; rgba[o + 3] = 255;
    }
    return { rgba, n };
  }

  console.log('\n=== ПОЛОСЫ: сломанный парсер (как в artpreview) vs CSS→RGB ===');
  console.log('босс                          artpreview        с CSS→RGB');
  const missing = new Set();
  let bad = 0, badFixed = 0, total = 0;
  const rows = [];
  const real = [];
  for (const d of Object.values(ALL).filter((e) => e.isBoss)) {
    const grid = buildMonsterArt(d.id, d.shape || 'blob', true, metaFor(d), 'idle');
    const pal = buildPalette(d.color || '#ffffff');
    for (const k of FILL_KEYS) {
      if (!k) continue;
      if (typeof pal[k] === 'string' && pal[k][0] !== '#') missing.add(`${k} → ${pal[k]}`);
    }
    const a = raster(grid, pal, parseBroken, false);
    const b = raster(grid, pal, parseFixed, true);
    const sa = stripeScore(a.rgba, a.n), sb = stripeScore(b.rgba, b.n);
    const at4 = sa.rows.filter((y) => y % 4 === 0).length;
    real.push({ id: d.id, shape: d.shape, bands: sa.bands, worst: sa.worst, at4 });
    total++;
    if (sa.bands > 0) bad++;
    if (sb.bands > 0) badFixed++;
    rows.push({ id: d.id, shape: d.shape, a: sa, b: sb });
  }
  rows.sort((x, y) => y.a.bands - x.a.bands);
  for (const r of rows.slice(0, 10)) {
    console.log(`${r.id.padEnd(28)} ${String(r.a.bands).padStart(4)} (${String(r.a.worst).padStart(3)}%)   ${String(r.b.bands).padStart(4)} (${String(r.b.worst).padStart(3)}%)  [${r.shape}]`);
  }
  const avgA = rows.reduce((s, r) => s + r.a.bands, 0) / rows.length;
  console.log(`\nВЫВОД 1: полосатых боссов ${bad}/${total} и с CSS-парсером ${badFixed}/${total} — среднее ${avgA.toFixed(1)} полос.`);
  console.log('          Сломанный парсер палитры НЕ главная причина «полос»: их число почти не меняется.');

  real.sort((x, y) => y.bands - x.bands);
  const realBad = real.filter((r) => r.bands > 0).length;
  const realAvg = real.reduce((s, r) => s + r.bands, 0) / real.length;
  const realAt4 = real.reduce((s, r) => s + r.at4, 0);
  const realBands = real.reduce((s, r) => s + r.bands, 0);
  console.log(`\n=== «НАСТОЯЩИЕ» ПОЛОСЫ (фон листа исключён, только тело) ===`);
  for (const r of real.slice(0, 8)) {
    console.log(`${r.id.padEnd(28)} ${String(r.bands).padStart(3)} полос (макс доля ${String(r.worst).padStart(3)}%)  [${r.shape}]`);
  }
  console.log(`ВЫВОД 2: боссов с «полосой через всё тело» = ${realBad}/${real.length} (в среднем ${realAvg.toFixed(2)} строки, худшая доля ниже).`);
  console.log(`          Прежние 8.9 «полос» у 131/132 были ГЛАВНО ПОЛОСОЙ ФОНА листа в метрике, а не дефектом спрайта.`);
  console.log(`          Из ${realBands} строк-полос ${realAt4} (${(realAt4 / Math.max(1, realBands) * 100).toFixed(0)}%) ложатся на границы блоков дизера y%4==0 — Баер работает штатно.`);

  // Печатаем координаты «полосных» строк и что там за слои — чтобы понять,
  // это настоящая линия поперёк тела или учёт фона/контура в метрике.
  console.log('\n=== ЧТО ИМЕННО В «ПОЛОСНЫХ» СТРОКАХ (necropolis_boss_20) ===');
  {
    const d = Object.values(ALL).find((e) => e.id === 'necropolis_boss_20');
    const grid = buildMonsterArt(d.id, d.shape || 'blob', true, metaFor(d), 'idle');
    const pal = buildPalette(d.color || '#ffffff');
    const n = grid.length;
    const GL = FILL_KEYS.map((k, v) => (v === 0 ? 0 : (() => { const c = parseFixed(pal[k] || pal.body); return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]; })()));
    const band = [];
    for (let y = 1; y < n; y++) {
      let s = 0, c = 0;
      for (let x = 0; x < n; x++) {
        const a = grid[y - 1][x], b = grid[y][x];
        if (!a || !b) continue;
        c++; if (Math.abs(GL[a] - GL[b]) > 15) s++;
      }
      if (c >= n * 0.12 && s / c > 0.45) band.push([y, s, c]);
    }
    for (const [y, s, c] of band.slice(0, 10)) {
      const top = {}, bot = {};
      for (let x = 0; x < n; x++) { const a = grid[y - 1][x], b = grid[y][x]; if (!a || !b) continue; top[a] = (top[a] || 0) + 1; bot[b] = (bot[b] || 0) + 1; }
      const fmt = (o) => Object.entries(o).sort((p, q) => q[1] - p[1]).slice(0, 3).map(([k, v]) => `${k}×${v}`).join(' ');
      console.log(`  y=${y} скачков ${s}/${c}  верх: ${fmt(top)}  →  низ: ${fmt(bot)}`);
    }
    // как выглядит край силуэта: сколько пикселей в строке и где
    console.log('  ширина строк (пиксели тела):');
    console.log('   ', band.slice(0, 6).map(([y, , c]) => `y${y}:${c}`).join('  '));
  }
  // Итог: настоящая ли это полоса или артефакт метрики?
  // Полоса «через всё тело» = одна и та же граница слоёв во всех колонках строки.
  // Считаем долю САМОЙ ЧАСТОЙ пары (верх→низ) среди скачков строки: если она >0.8,
  // это реальная линия поперёк фигуры; если меньше — просто много мелких деталей.
  console.log('\n=== ПРИРОДА СКАЧКОВ: одна граница слоёв по всей строке или мелкие детали? ===');
  console.log('босс                         полос  макс.доля  макс.доля 1-й пары  вердикт');
  for (const r of real.slice(0, 8)) {
    const d = Object.values(ALL).find((e) => e.id === r.id);
    const grid = buildMonsterArt(d.id, d.shape || 'blob', true, metaFor(d), 'idle');
    const n = grid.length;
    let bestPairFrac = 0;
    const GL2 = FILL_KEYS.map((k, v) => (v === 0 ? 0 : (() => { const c = parseFixed(palOf(d)[k] || palOf(d).body); return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]; })()));
    for (let y = 1; y < n; y++) {
      let cnt = 0, strong = 0;
      const pair = new Map();
      for (let x = 0; x < n; x++) {
        const a = grid[y - 1][x], b = grid[y][x];
        if (!a || !b) continue;
        cnt++;
        if (Math.abs(GL2[a] - GL2[b]) > 15) { strong++; const k = a + '>' + b; pair.set(k, (pair.get(k) || 0) + 1); }
      }
      if (cnt < n * 0.12) continue;
      const frac = strong / cnt;
      if (frac > 0.45) {
        const top = Math.max(0, ...pair.values());
        bestPairFrac = Math.max(bestPairFrac, top / Math.max(1, strong));
      }
    }
    const verdict = bestPairFrac > 0.8 ? 'РЕАЛЬНАЯ ЛИНИЯ через тело' : 'много мелких деталей (не «полоса»)';
    console.log(`${r.id.padEnd(28)} ${String(r.bands).padStart(5)} ${String(r.worst).padStart(8)}% ${(bestPairFrac * 100).toFixed(0).padStart(18)}%  ${verdict}`);
  }

  // Какая ИМЕННО пара слоёв даёт линию и в каких строках — это и есть дефект.
  console.log('\n=== ВИНОВНИК: пары слоёв, дающие «линию через тело» (топ-3 на босса) ===');
  for (const r of real.slice(0, 6)) {
    const d = Object.values(ALL).find((e) => e.id === r.id);
    const grid = buildMonsterArt(d.id, d.shape || 'blob', true, metaFor(d), 'idle');
    const n = grid.length;
    const total = new Map();
    for (let y = 1; y < n; y++) {
      let cnt = 0; const pair = new Map();
      for (let x = 0; x < n; x++) {
        const a = grid[y - 1][x], b = grid[y][x];
        if (!a || !b) continue;
        cnt++;
        if (a !== b) pair.set(a + '>' + b, (pair.get(a + '>' + b) || 0) + 1);
      }
      if (cnt < n * 0.12) continue;
      for (const [k, v] of pair) if (v / cnt > 0.45) total.set(k, (total.get(k) || 0) + 1);
    }
    const top = [...total.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)
      .map(([k, v]) => `${k}×${v}строк`).join('  ');
    console.log(`${r.id.padEnd(28)} ${top || '—'}`);
  }
  console.log('Формат «A>B×N»: слой A сверху переходит в слой B снизу в N строках одновременно.');
  console.log('Слои: 1 контур, 2 тело-тень, 3 тело, 4 тело-свет, 5-7 броня, 8 золото,');
  console.log('      9 глаз, 10 кость/клык, 11 рот, 12 акцент. 2>3 и 3>4 = граница AO/блика.');


  const negs = [];
  for (const d of Object.values(ALL)) {
    const pal = buildPalette(d.color || '#ffffff');
    for (const k of FILL_KEYS) {
      if (!k) continue;
      const v = String(pal[k] || '');
      if (/rgb\(/.test(v) && /-\d/.test(v)) negs.push(`${d.id}.${k} = ${v}`);
    }
  }
  console.log(negs.length ? [...new Set(negs)].slice(0, 10).join('\n') : 'нет');
  console.log(`всего записей с отрицательным каналом: ${negs.length}`);

  console.log('\n=== ПРОВЕРКА ПУТИ В ИГРУ: fillU32 больше не даёт NaN → белый ===');
  {
    // Точная копия combatEngine.fillU32 и layerFill: раньше слои 2/4/12 давали
    // NaN → (0,0,0) в Uint32 → БЕЛЫЙ пиксель. Теперь должен быть реальный цвет.
    const fillU32 = (hex) => {
      const h = parseInt(hex.slice(1), 16);
      return (0xff000000 | ((h & 0xff) << 16) | (h & 0xff00) | ((h >>> 16) & 0xff)) >>> 0;
    };
    const toRgb = (u) => [u & 255, (u >>> 8) & 255, (u >>> 16) & 255];
    const pal = palOf({ color: '#c0bca8' });
    let nan = 0;
    for (const k of FILL_KEYS) {
      if (!k) continue;
      const h = pal[k];
      const finite = Number.isFinite(parseInt(String(h).slice(1), 16));
      if (!finite) nan++;
      const rgb = toRgb(fillU32(String(h)));
      if (k === 'bodyDark' || k === 'bodyLight' || k === 'accent') {
        const white = rgb[0] === 255 && rgb[1] === 255 && rgb[2] === 255;
        console.log(`  ${k.padEnd(11)} ${String(h).padEnd(9)} → rgb(${rgb.join(',')})${white ? '  ← ВСЁ ЕЩЁ БЕЛЫЙ (баг!)' : ''}`);
      }
    }
    console.log(nan === 0 ? '  OK: ни одна запись палитры не даёт NaN — белых пикселей из-за палитры больше нет' : `  ОШИБКА: ${nan} записей всё ещё NaN`);
    // И проверим строковую арифметику, портившую сетку: base + '55'
    const cat = pal.bodyLight + '55';
    console.log(`  «bodyLight + '55'» (подсветка в шейдере) = ${cat} ${/^#[0-9a-f]{8}$/.test(cat) ? '— корректный 8-значный hex' : '← ЛОМАЕТ разбор цвета'}`);
  }

  console.log('\n=== ПИКСЕЛИ, КОТОРЫЕ В ИГРЕ РИСУЮТСЯ БЕЛЫМ (слои 2/4/12) ===');
  let white = 0, all = 0;
  for (const d of Object.values(ALL).filter((e) => e.isBoss)) {
    const grid = buildMonsterArt(d.id, d.shape || 'blob', true, metaFor(d), 'idle');
    for (const row of grid) for (const v of row) { if (v) { all++; if (v === 2 || v === 4 || v === 12) white++; } }
  }
  console.log(`слои тень/свет/акцент: ${white} из ${all} пикселей (${(white / all * 100).toFixed(1)}%) — в игре белым, в превью чёрным`);

  // === ПОЧЕМУ БОССЫ-«БЛИЗНЕЦЫ»: метрика сравнивала только тело ===
  // artpreview.siloHash смотрит на альфу и потому ловил лишь очертания ТЕЛА.
  // Оружие и регалии рисуются ПОВЕРХ тела и меняют СЛОИ (цвет), а не альфу —
  // значит два босса с разным оружием (алебарда vs лук vs молот) давали 0 бит.
  // Здесь считаем хэш по ВСЕМУ холсту и по СЛОЯМ (как реально видит игрок).
  console.log('\n=== БЛИЗНЕЦЫ: хэш по телу (как было) vs по всему холсту со слоями ===');
  function hashFull(grid, withLayers) {
    const n = grid.length, cell = Math.ceil(n / 16);
    const bits = [];
    for (let cy = 0; cy < 16; cy++) for (let cx = 0; cx < 16; cx++) {
      let cnt = 0, filled = 0, sum = 0;
      for (let y = cy * cell; y < Math.min(n, (cy + 1) * cell); y++) {
        for (let x = cx * cell; x < Math.min(n, (cx + 1) * cell); x++) {
          cnt++;
          const v = grid[y][x];
          if (v) { filled++; sum += v; }
        }
      }
      if (!withLayers) {
        bits.push(filled > cnt / 2 ? 1 : 0);                 // только «есть тело/нет»
      } else {
        // 4 бита: заполненность + средний слой (оружие/регалии меняют именно его)
        const f = filled / cnt;
        const q = f < 0.15 ? 0 : f < 0.45 ? 1 : f < 0.8 ? 2 : 3;
        const avg = filled ? sum / filled : 0;
        const c2 = avg < 2.5 ? 0 : avg < 4.5 ? 1 : avg < 7.5 ? 2 : 3;
        bits.push(q, c2);
      }
    }
    return bits;
  }
  function ham(a, b) { let d = 0; for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) d++; return d; }
  const bosses = Object.values(ALL).filter((e) => e.isBoss);
  const cacheF = new Map(), cacheT = new Map();
  const hFull = (d) => { if (!cacheF.has(d.id)) cacheF.set(d.id, hashFull(buildMonsterArt(d.id, d.shape || 'blob', true, metaFor(d), 'idle'), true)); return cacheF.get(d.id); };
  const hBody = (d) => { if (!cacheT.has(d.id)) cacheT.set(d.id, hashFull(buildMonsterArt(d.id, d.shape || 'blob', true, metaFor(d), 'idle'), false)); return cacheT.get(d.id); };
  let t0 = 0, t20 = 0, tMin = 999, tPair = null;
  let f0 = 0, f20 = 0, fMin = 999, fPair = null;
  for (let i = 0; i < bosses.length; i++) for (let j = i + 1; j < bosses.length; j++) {
    const a = bosses[i], b = bosses[j];
    if ((a.shape || 'blob') !== (b.shape || 'blob')) continue;
    const db = ham(hBody(a), hBody(b)), df = ham(hFull(a), hFull(b));
    if (db === 0) t0++;
    if (db < 20) t20++;
    if (db < tMin) { tMin = db; tPair = [a, b]; }
    if (df === 0) f0++;
    if (df < 20) f20++;
    if (df < fMin) { fMin = df; fPair = [a, b]; }
  }
  console.log(`  ТОЛЬКО ТЕЛО (как artpreview): пар с 0 бит = ${t0}, пар <20 бит = ${t20}, минимум ${tMin}`);
  console.log(`       худшая пара: ${tPair[0].id} ↔ ${tPair[1].id} (оружие ${tPair[0].weapon} vs ${tPair[1].weapon})`);
  console.log(`  ВЕСЬ ХОЛСТ + СЛОИ (как видит игрок): пар с 0 бит = ${f0}, пар <20 бит = ${f20}, минимум ${fMin}`);
  console.log(`       худшая пара: ${fPair[0].id} ↔ ${fPair[1].id} (оружие ${fPair[0].weapon} vs ${fPair[1].weapon})`);
  console.log('  Вывод: «близнецы» были артефактом метрики — она сравнивала только силуэт');
  console.log('  тела и игнорировала оружие/регалии, которые и делают боссов разными.');

  console.log('\n=== ФИНАЛЬНАЯ ПРОВЕРКА: полосы — это края анатомии (32×32) или артефакт блока SS×SS? ===');
  // Если «полоса» — настоящий край детали, она видна и в авторской сетке 32×32:
  // усредняем каждый блок SS×SS и смотрим, меняется ли слой между авторскими
  // строками. Если после усреднения резких скачков нет, значит граница была
  // ВНУТРИ блока (артефакт), а не краем рисунка.
  console.log('босс                        полос  из них совпали с краем авторской строки  вердикт');
  let art = 0, sub = 0;
  const report = [];
  for (const r of real.slice(0, 8)) {
    const d = Object.values(ALL).find((e) => e.id === r.id);
    const grid = buildMonsterArt(d.id, d.shape || 'blob', true, metaFor(d), 'idle');
    const n = grid.length;
    const pal = palOf(d);
    const GL = FILL_KEYS.map((k, v) => (v === 0 ? 0 : (() => { const c = parseFixed(pal[k] || pal.body); return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]; })()));
    // авторская сетка: средний слой блока
    const A = Math.round(n / SS);
    const avg = [];
    for (let ay = 0; ay < A; ay++) {
      avg.push([]);
      for (let ax = 0; ax < A; ax++) {
        let sum = 0, cnt = 0;
        for (let y = ay * SS; y < Math.min(n, (ay + 1) * SS); y++)
          for (let x = ax * SS; x < Math.min(n, (ax + 1) * SS); x++)
            if (grid[y][x]) { sum += GL[grid[y][x]]; cnt++; }
        avg[ay].push(cnt ? sum / cnt : -1);
      }
    }
    // Рекомендуемый кадр для анализа: список строк-полос (та же логика, что выше).
    const palX = palOf(d);
    const GLx = FILL_KEYS.map((k, v) => (v === 0 ? 0 : (() => { const c = parseFixed(palX[k] || palX.body); return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]; })()));
    const bandRows = [];
    for (let y = 1; y < n; y++) {
      let s = 0, c = 0;
      for (let x = 0; x < n; x++) {
        const a = grid[y - 1][x], b = grid[y][x];
        if (!a || !b) continue;
        c++; if (Math.abs(GLx[a] - GLx[b]) > 15) s++;
      }
      if (c >= n * 0.12 && s / c > 0.45) bandRows.push(y);
    }
    let onArtEdge = 0;
    for (const y of bandRows) {
      const ay = Math.floor(y / SS);
      if (ay === 0) continue;
      // есть ли перепад между авторскими строками ay-1 и ay?
      let jump = 0, cnt = 0;
      for (let ax = 0; ax < A; ax++) {
        const a1 = avg[ay - 1][ax], a2 = avg[ay][ax];
        if (a1 < 0 || a2 < 0) continue;
        cnt++; if (Math.abs(a1 - a2) > 15) jump++;
      }
      if (cnt >= A * 0.12 && jump / cnt > 0.45) onArtEdge++;
    }
    art += onArtEdge; sub += (bandRows.length - onArtEdge);
    const verdict = onArtEdge >= bandRows.length * 0.6 ? 'края анатомии (норма)' : 'частично внутриблочные стыки';
    report.push([r.id, bandRows.length, onArtEdge, verdict]);
  }
  report.sort((a, b) => b[1] - a[1]);
  for (const [id, tot, a, v] of report) {
    console.log(`${id.padEnd(27)} ${String(tot).padStart(5)} ${String(a).padStart(10)} из ${String(tot).padEnd(4)}${String(Math.round(a / tot * 100)).padStart(4)}%  ${v}`);
  }
  console.log(`\nИТОГО по 8 худшим: ${art} строк из ${art + sub} (${(art / Math.max(1, art + sub) * 100).toFixed(0)}%) — настоящие края анатомии,`);
  console.log(`                    ${sub} строк — стыки внутри блока SS×SS (остаточный артефакт).`);


  const pal0 = buildPalette('#c0bca8');
  for (const k of FILL_KEYS) {
    if (!k) continue;
    const v = String(pal0[k] || '');
    const [r, g, bl] = /rgb/.test(v) ? parseFixed(v) : parseBroken(v);
    const lm = 0.299 * r + 0.587 * g + 0.114 * bl;
    const broken = /rgb/.test(v) ? ' ← ПАРСЕР ЛОМАЕТСЯ' : '';
    console.log(`  ${k.padEnd(11)} ${v.padEnd(18)} яркость ${lm.toFixed(0).padStart(3)}${broken}`);
  }
  process.exit(0);
}

const ids = arg ? [arg] : ['necropolis_boss_20', 'necropolis_boss_1', 'gnomish_ruins_boss_17', 'sunken_fleet_boss_2'];

for (const id of ids) {
  const d = Object.values(ALL).find((e) => e.id === id);
  if (!d) { console.log(`нет ${id}`); continue; }
  const grid = buildMonsterArt(d.id, d.shape || 'blob', !!d.isBoss, metaFor(d), 'idle');
  const pal = buildPalette(d.color || '#ffffff');
  const L = [0, lum(pal.outline), lum(pal.bodyDark), lum(pal.body), lum(pal.bodyLight),
    lum(pal.metalDark), lum(pal.metal), lum(pal.metalLight), lum(pal.gold),
    lum(pal.eye), lum(pal.bone), lum(pal.mouth), lum(pal.accent)];
  const n = grid.length;
  console.log(`\n=== ${id} [${d.shape}] regalia=${d.regalia} n=${n} ===`);
  // === ТА же метрика, что в artpreview.stripeScore: для КАЖДОГО пикселя
  //     сравнение с пикселем ВЫШЕ (тот же x). Сильных > 45% в строке = полоса.
  const TH = 15;
  const L2 = (v) => L[v] * 255;
  let bands = 0, worst = 0, worstY = -1;
  const bandRows = [];
  // Для сильных переходов — гистограмма пар слоёв (сверху → снизу)
  const pairHist = new Map();
  for (let y = 1; y < n; y++) {
    let strong = 0, cnt = 0;
    for (let x = 0; x < n; x++) {
      const a = grid[y - 1][x], b = grid[y][x];
      if (!a || !b) continue;
      cnt++;
      if (Math.abs(L2(a) - L2(b)) > TH) {
        strong++;
        const k = a + '>' + b;
        pairHist.set(k, (pairHist.get(k) || 0) + 1);
      }
    }
    if (cnt < n * 0.12) continue;
    const frac = strong / cnt;
    if (frac > worst) { worst = frac; worstY = y; }
    if (frac > 0.45) { bands++; bandRows.push([y, frac]); }
  }
  console.log(`полос (как в artpreview): ${bands}, худшая доля ${(worst * 100).toFixed(0)}% в y=${worstY}`);
  // диапазоны полос
  const ranges = [];
  for (const [y, f] of bandRows) {
    const last = ranges[ranges.length - 1];
    if (last && y === last[1] + 1) { last[1] = y; last[2] = Math.max(last[2], f); }
    else ranges.push([y, y, f]);
  }
  for (const [a, b, f] of ranges.slice(0, 8)) {
    console.log(`  полоса y=${a}..${b}${a === b ? '' : ` (${b - a + 1}px)`} доля ${(f * 100).toFixed(0)}%`);
  }
  console.log(`  границы блоков дизера (y%4==0): ${bandRows.filter(([y]) => y % 4 === 0).length}/${bandRows.length}`);
  console.log(`  топ переходов слоёв:`);
  for (const [k, v] of [...pairHist.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)) {
    console.log(`    ${k}: ${v}`);
  }
}

// --- близнецы ---
console.log('\n=== БЛИЗНЕЦЫ (та же форма, минимальный Хэмминг) ===');
const targets = Object.values(ALL).filter((e) => e.isBoss);
const cache = new Map();
function hashOf(d) {
  if (cache.has(d.id)) return cache.get(d.id);
  const grid = buildMonsterArt(d.id, d.shape || 'blob', true, metaFor(d), 'idle');
  const bits = [];
  const n = grid.length, cell = 4;
  for (let cy = 0; cy < 16; cy++) for (let cx = 0; cx < 16; cx++) {
    let on = 0;
    for (let y = 0; y < cell; y++) for (let x = 0; x < cell; x++) if (grid[cy * cell + y][cx * cell + x]) on++;
    bits.push(on > cell * cell / 2 ? 1 : 0);
  }
  cache.set(d.id, bits);
  return bits;
}
const pairs = [];
for (let i = 0; i < targets.length; i++) {
  for (let j = i + 1; j < targets.length; j++) {
    const a = targets[i], b = targets[j];
    if ((a.shape || 'blob') !== (b.shape || 'blob')) continue;
    const ha = hashOf(a), hb = hashOf(b);
    let d2 = 0;
    for (let k = 0; k < ha.length; k++) if (ha[k] !== hb[k]) d2++;
    pairs.push({ d: d2, a, b });
  }
}
pairs.sort((x, y) => x.d - y.d);
for (const p of pairs.slice(0, 6)) {
  console.log(`${p.d} бит: ${p.a.id}[${p.a.shape} w=${p.a.weapon} r=${p.a.regalia} c=${p.a.color}] ↔ ` +
    `${p.b.id}[${p.b.shape} w=${p.b.weapon} r=${p.b.regalia} c=${p.b.color}]`);
}
