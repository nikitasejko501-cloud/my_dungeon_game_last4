import type { EnemyShape, MonsterTrait, GaitKind } from './types';
import { shadeColor } from './monsterVisuals';
import { anatomyFor, flapStroke, flapsWings, jumpArc } from './dungeonIdentity';
import type { Anatomy } from './dungeonIdentity';


// ============================================================
// ДЕТАЛИЗИРОВАННЫЙ ПИКСЕЛЬ-АРТ МОНСТРОВ И БОССОВ (32x32)
// Стиль: толстый контур, 3 тона тела, стальная броня,
// светящиеся глаза, клыки, ремни, золото — как в референсе.
// Слои: 0 пусто, 1 контур, 2 тело-тень, 3 тело, 4 тело-свет,
//       5 броня-тень, 6 броня, 7 броня-свет, 8 золото,
//       9 глаз(свечение), 10 клык/кость, 11 рот-тьма, 12 акцент
// ============================================================

// === РАЗРЕШЕНИЕ ===
// Фигуры авторизуются в системе координат 32×32 (как было изначально), а
// растеризуются в сетку ART_N с коэффициентом SS (super-sampling).
// ART_N = 256 → в 4 раза плотнее прежнего 128: субпиксельные кривые дают
// гладкие контуры, боссы (на экране 140–200 px) получают настоящую детализацию,
// а обычные враги уменьшаются качественным сглаживанием (см. drawPixelMonster).
export const ART_N = 256;

/** Базовая система координат, в которой нарисованы все фигуры. */
export const ART_UNIT = 32;
/** Коэффициент увеличения: авторская единица → пиксели спрайта. */
export const SS = ART_N / ART_UNIT;
/**
 * ХОЛСТ ОРУЖИЯ. Кисть руки монстра стоит на 27-й авторской единице из 32 —
 * то есть почти у правого края спрайта, а клинок уходит ещё дальше вправо.
 * Из-за этого длинное оружие (меч, копьё, трезубец, коса, алебарда) обрезалось
 * по краю холста и выглядело обрубком. Оружие рисуется на отдельном холсте в
 * 48 авторских единиц: масштаб тот же (SS px на единицу), просто у оружия есть
 * законный запас места. Спрайт затем отрисовывается на столько же шире — тело
 * остаётся прежнего размера, а оружие наконец видно целиком.
 */
export const WEAPON_UNIT = 48;
export const WEAPON_N = WEAPON_UNIT * SS;
/**
 * ШТАМП-ХОЛСТ (64 единицы). В кадре «контакт» (attackC) длинное оружие с
 * поворотом вокруг кисти и выпадом уходит правее 48-й единицы — штамп на
 * WEAPON_N резал кончик алебарды/лука. Штамп пишется на STAMP_N, а итоговый
 * спрайт собирается на 512 только если оружие реально не влезло в 384
 * (для дисплея важно только соотношение н/ART_N — см. drawPixelMonster).
 */
export const STAMP_UNIT = 64;
export const STAMP_N = STAMP_UNIT * SS;
/** Половина авторской сетки — фигуры рисуются в левой половине и зеркалятся. */
export const ART_HALF = ART_UNIT / 2;
export type ArtGrid = number[][];

export interface ArtPalette {
  outline: string;
  bodyDark: string;
  body: string;
  bodyLight: string;
  metalDark: string;
  metal: string;
  metalLight: string;
  gold: string;
  eye: string;
  bone: string;
  mouth: string;
  accent: string;
  glow: string;
}

/** Смешивает два HEX-цвета: t=0 → a, t=1 → b. */
function mixHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.replace('#', ''), 16), pb = parseInt(b.replace('#', ''), 16);
  if (!Number.isFinite(pa) || !Number.isFinite(pb)) return a;
  const cl = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const r = cl((((pa >> 16) & 255) * (1 - t)) + (((pb >> 16) & 255) * t));
  const g = cl((((pa >> 8) & 255) * (1 - t)) + (((pb >> 8) & 255) * t));
  const bl = cl(((pa & 255) * (1 - t)) + ((pb & 255) * t));
  return `#${((r << 16) | (g << 8) | bl).toString(16).padStart(6, '0')}`;
}

/**
 * Палитра по базовому цвету врага — 3 тона тела + «свой» металл + золото.
 *
 * Металл теперь НЕ серый (#8b8b9c), а смесь базового цвета твари с нейтральным
 * стальным: раньше броня, лапы и клинки были серыми при любом цвете монстра,
 * из-за чего тварь читалась как «жестяной робот с цветной наклейкой». Теперь
 * доспех и оружие выглядят частью существа (у костяного — костяной оттенок, у
 * каменного — каменный), а золото/глаза остаются, чтобы силуэт читался.
 */
export function buildPalette(baseHex: string): ArtPalette {
  // 55 % базового цвета + 45 % стали: броня остаётся металлической на вид,
  // но принадлежит существу. Для почти серых тварей смесь почти не меняется.
  const metal = mixHex(baseHex, '#8b8b9c', 0.45);
  return {
    outline: '#101018',
    bodyDark: shadeColor(baseHex, 0.52),
    body: baseHex,
    bodyLight: shadeColor(baseHex, 1.55),
    metalDark: shadeColor(metal, 0.55),
    metal,
    metalLight: shadeColor(metal, 1.45),
    gold: '#e8b53c',
    eye: '#ff7a1a',
    bone: '#f2ead0',
    mouth: '#3a1220',
    accent: shadeColor(baseHex, 1.9),
    glow: shadeColor(baseHex, 1.3),
  };
}

export function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Рабочая сетка: примитивы принимают АВТОРСКИЕ координаты и масштабируют их в
 * пиксели спрайта (SS пикселей на авторскую единицу).
 *
 * ВАЖНО: размер холста настраиваемый. Тело монстра рисуется на холсте ART_N
 * (32×32 авторских единицы), а ОРУЖИЕ — на холсте WEAPON_N (48×48): кисть руки
 * стоит на 27-й единице из 32, поэтому длинный клинок, копьё или трезубец
 * физически не влезали и ОБРЕЗАЛИСЬ по краю спрайта (оружие выглядело
 * обрубком). Теперь у оружия есть запас холста вправо-вниз, а спрайт
 * отрисовывается чуть шире — так, чтобы тело осталось того же размера.
 */
export class Canvas32 {
  g: ArtGrid = [];
  /** Размер холста в пикселях спрайта (по умолчанию — холст тела). */
  readonly n: number;
  constructor(n: number = ART_N) {
    this.n = n;
    for (let y = 0; y < n; y++) this.g.push(new Array(n).fill(0));
  }
  put(x: number, y: number, v: number) {
    // Масштабирование авторской единицы в блок SS×SS пикселей спрайта.
    const bx = Math.round(x * SS), by = Math.round(y * SS);
    for (let ty = 0; ty < SS; ty++) {
      for (let tx = 0; tx < SS; tx++) {
        const xi = bx + tx, yi = by + ty;
        if (xi >= 0 && xi < this.n && yi >= 0 && yi < this.n && v > this.g[yi][xi]) this.g[yi][xi] = v;
      }
    }
  }
  /** Запись одного ПИКСЕЛЯ спрайта (для тонкой доводки сглаживания). */
  putPx(x: number, y: number, v: number) {
    const xi = Math.round(x), yi = Math.round(y);
    if (xi >= 0 && xi < this.n && yi >= 0 && yi < this.n && v > this.g[yi][xi]) this.g[yi][xi] = v;
  }
  rect(x0: number, y0: number, x1: number, y1: number, v: number) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.put(x, y, v);
  }
  ellipse(cx: number, cy: number, rx: number, ry: number, v: number) {
    // Субпиксельная кривая: тест на КАЖДОМ пикселе спрайта (центр пикселя
    // переводится в авторские координаты). При SS=8 старый обход «шагом»
    // рисовал контур ступенями из SS-пиксельных блоков — край был рваным.
    const irx = 1 / (rx || 0.5), iry = 1 / (ry || 0.5);
    const x0 = Math.max(0, Math.floor((cx - rx) * SS)), x1 = Math.min(this.n - 1, Math.ceil((cx + rx) * SS));
    const y0 = Math.max(0, Math.floor((cy - ry) * SS)), y1 = Math.min(this.n - 1, Math.ceil((cy + ry) * SS));
    for (let py = y0; py <= y1; py++) {
      const dy = ((py + 0.5) / SS - cy) * iry, dy2 = dy * dy;
      if (dy2 > 1) continue;
      const row = this.g[py];
      for (let px = x0; px <= x1; px++) {
        const dx = ((px + 0.5) / SS - cx) * irx;
        if (dx * dx + dy2 <= 1 && v > row[px]) row[px] = v;
      }
    }
  }
  tri(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, v: number) {
    // Субпиксельный треугольник: барицентрический тест по центрам пикселей
    // спрайта — диагонали (крылья, рога, клыки) идут гладкой линией.
    const area = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
    if (Math.abs(area) < 0.0001) return;
    const px0 = Math.max(0, Math.floor(Math.min(x0, x1, x2) * SS));
    const px1 = Math.min(this.n - 1, Math.ceil(Math.max(x0, x1, x2) * SS));
    const py0 = Math.max(0, Math.floor(Math.min(y0, y1, y2) * SS));
    const py1 = Math.min(this.n - 1, Math.ceil(Math.max(y0, y1, y2) * SS));
    for (let py = py0; py <= py1; py++) {
      const ay = (py + 0.5) / SS;
      const row = this.g[py];
      for (let px = px0; px <= px1; px++) {
        const ax = (px + 0.5) / SS;
        const w0 = ((x1 - ax) * (y2 - ay) - (x2 - ax) * (y1 - ay)) / area;
        const w1 = ((x2 - ax) * (y0 - ay) - (x0 - ax) * (y2 - ay)) / area;
        const w2 = 1 - w0 - w1;
        if (w0 >= -0.02 && w1 >= -0.02 && w2 >= -0.02 && v > row[px]) row[px] = v;
      }
    }
  }
  /** Принудительная запись (для деталей поверх объёма: глаза, клыки). */
  paint(x: number, y: number, v: number) {
    const bx = Math.round(x * SS), by = Math.round(y * SS);
    for (let ty = 0; ty < SS; ty++) {
      for (let tx = 0; tx < SS; tx++) {
        const xi = bx + tx, yi = by + ty;
        if (xi >= 0 && xi < this.n && yi >= 0 && yi < this.n) this.g[yi][xi] = v;
      }
    }
  }
  /** Рисует прямоугольник принудительно (поверх объёма). */
  paintRect(x0: number, y0: number, x1: number, y1: number, v: number) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.paint(x, y, v);
  }
  /** Рисует эллипс принудительно (поверх объёма). */
  paintEllipse(cx: number, cy: number, rx: number, ry: number, v: number) {
    // Принудительная версия: тот же субпиксельный тест по пикселям спрайта.
    const irx = 1 / (rx || 0.5), iry = 1 / (ry || 0.5);
    const x0 = Math.max(0, Math.floor((cx - rx) * SS)), x1 = Math.min(this.n - 1, Math.ceil((cx + rx) * SS));
    const y0 = Math.max(0, Math.floor((cy - ry) * SS)), y1 = Math.min(this.n - 1, Math.ceil((cy + ry) * SS));
    for (let py = y0; py <= y1; py++) {
      const dy = ((py + 0.5) / SS - cy) * iry, dy2 = dy * dy;
      if (dy2 > 1) continue;
      const row = this.g[py];
      for (let px = x0; px <= x1; px++) {
        const dx = ((px + 0.5) / SS - cx) * irx;
        if (dx * dx + dy2 <= 1) row[px] = v;
      }
    }
  }
  /** Принудительный треугольник (поверх объёма). */
  paintTri(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, v: number) {
    // Принудительная версия: тот же субпиксельный барицентрический тест.
    const area = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
    if (Math.abs(area) < 0.0001) return;
    const px0 = Math.max(0, Math.floor(Math.min(x0, x1, x2) * SS));
    const px1 = Math.min(this.n - 1, Math.ceil(Math.max(x0, x1, x2) * SS));
    const py0 = Math.max(0, Math.floor(Math.min(y0, y1, y2) * SS));
    const py1 = Math.min(this.n - 1, Math.ceil(Math.max(y0, y1, y2) * SS));
    for (let py = py0; py <= py1; py++) {
      const ay = (py + 0.5) / SS;
      const row = this.g[py];
      for (let px = px0; px <= px1; px++) {
        const ax = (px + 0.5) / SS;
        const w0 = ((x1 - ax) * (y2 - ay) - (x2 - ax) * (y1 - ay)) / area;
        const w1 = ((x2 - ax) * (y0 - ay) - (x0 - ax) * (y2 - ay)) / area;
        const w2 = 1 - w0 - w1;
        if (w0 >= -0.02 && w1 >= -0.02 && w2 >= -0.02) row[px] = v;
      }
    }
  }
  /**
   * Симметрия: копирует ЛЕВУЮ половину фигуры в правую (зеркально).
   * Работает в пикселях спрайта, чтобы ось проходила ровно между половинами
   * и фигура получалась ОДНОЙ целой (а не двумя половинками).
   */
  mirror() {
    for (let y = 0; y < this.n; y++) {
      for (let x = 0; x < this.n / 2; x++) {
        const v = this.g[y][x];
        if (v === 0) continue;
        this.g[y][this.n - 1 - x] = v;
      }
    }
  }
  /**
   * Контур: расширяется наружу на `thickness` пикселей спрайта.
   * На высоком разрешении (ART_N=128) контур в 2-3 px выглядит как аккуратная
   * обводка, а не как «толстый чёрный забор».
   */
  outline(color: number = 1, thickness: number = 1) {
    for (let pass = 0; pass < thickness; pass++) {
      const src = this.g.map(row => row.slice());
      for (let y = 0; y < this.n; y++) {
        for (let x = 0; x < this.n; x++) {
          if (src[y][x] !== 0) continue;
          const near = (y > 0 && src[y - 1][x] > color) || (y < this.n - 1 && src[y + 1][x] > color)
            || (x > 0 && src[y][x - 1] > color) || (x < this.n - 1 && src[y][x + 1] > color);
          if (near) this.g[y][x] = color;
        }
      }
    }
  }
  shader(mainLayer: number, darkLayer: number, lightLayer: number) {
    // Объём: тень по кромкам силуэта (кроме верхних), свет — по верхним кромкам.
    // Толщина полос пропорциональна разрешению (t = SS/4 px): при 128 это 1 px,
    // при 256 — 2 px. Иначе после сглаживающего уменьшения на экране тонкие
    // полосы «смываются» и объём перестаёт читаться.
    const src = this.g.map(row => row.slice());
    const solid = (v: number) => v > 1; // и тело, и детали считаются массой
    const t = Math.max(1, Math.round(SS / 4));
    for (let y = 0; y < this.n; y++) {
      for (let x = 0; x < this.n; x++) {
        if (src[y][x] !== mainLayer) continue;
        let topEdge = false, bottomOrSide = false;
        for (let k = 1; k <= t && !(topEdge && bottomOrSide); k++) {
          const up = y - k >= 0 ? src[y - k][x] : 0;
          const down = y + k < this.n ? src[y + k][x] : 0;
          const left = x - k >= 0 ? src[y][x - k] : 0;
          const right = x + k < this.n ? src[y][x + k] : 0;
          if (!solid(up)) topEdge = true;
          if (!solid(down) || !solid(left) || !solid(right)) bottomOrSide = true;
        }
        if (topEdge) { this.g[y][x] = lightLayer; continue; }
        if (bottomOrSide) { this.g[y][x] = darkLayer; continue; }
      }
    }
  }
  shade(mainLayer: number, darkLayer: number, lightLayer: number) {
    this.shader(mainLayer, darkLayer, lightLayer);
  }
  /** Красит клетки указанного слоя в другой (для перекраски деталей). */
  recolor(from: number, to: number) {
    for (let y = 0; y < this.n; y++) for (let x = 0; x < this.n; x++) if (this.g[y][x] === from) this.g[y][x] = to;
  }
  /** Линия по Брезенхэму в АВТОРСКИХ единицах — диагонали (древки, клинки, цепи). */
  line(x0: number, y0: number, x1: number, y1: number, v: number, thick: number = 1) {
    let ax = x0, ay = y0;
    const bx = x1, by = y1;
    const dx = Math.abs(bx - ax), dy = Math.abs(by - ay);
    const n = Math.max(1, Math.ceil(Math.max(dx, dy) * SS * 2));
    const half = (thick - 1) / 2;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const px = ax + (bx - ax) * t, py = ay + (by - ay) * t;
      if (thick <= 1) {
        this.put(px, py, v);
      } else {
        // Толстая линия = квадрат вокруг точки в авторских единицах
        for (let oy = -half; oy <= half; oy += 0.5) {
          for (let ox = -half; ox <= half; ox += 0.5) this.put(px + ox, py + oy, v);
        }
      }
    }
  }
  /** Полый эллипс (только контур) — круги наверший, обручи, кольца. */
  ring(cx: number, cy: number, rx: number, ry: number, v: number) {
    const steps = Math.max(24, Math.ceil((rx + ry) * SS * 1.6));
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      this.put(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, v);
    }
  }
  /** Дуга (часть кольца) — тетива, лезвие серпа, рога. */
  arc(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, v: number) {
    const steps = Math.max(16, Math.ceil(Math.abs(a1 - a0) * Math.max(rx, ry) * SS * 0.9));
    for (let i = 0; i <= steps; i++) {
      const a = a0 + (a1 - a0) * (i / steps);
      this.put(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, v);
    }
  }
  /** Зеркальный put в авторских координатах: рисует и симметричную деталь. */
  putPair(x: number, y: number, v: number) {
    this.put(x, y, v);
    this.put(ART_UNIT - 1 - x, y, v);
  }
  count(layer: number): number {
    let n = 0;
    for (let y = 0; y < this.n; y++) for (let x = 0; x < this.n; x++) if (this.g[y][x] === layer) n++;
    return n;
  }
}

export function patternKey(id: string, shape: string, boss: boolean): string {
  return `${shape}|${boss ? 'B' : 'm'}|${id}`;
}

// ============================================================
// ФИГУРЫ. Каждая рисует силуэт в 32x32 детерминированно.
// Слои: 1 контур, 3 тело(→shade даст 2/4), 5..7 броня, 8 золото,
//       9 глаз, 10 кость/клык, 11 рот/тьма, 12 акцент
// ============================================================

function drawOgreBody(c: Canvas32, rng: () => number, boss: boolean) {
  // Ступни с когтями
  c.rect(7, 28, 14, 30, 3);
  c.rect(17, 28, 24, 30, 3);
  for (let i = 0; i < 3; i++) { c.put(8 + i * 2, 30, 10); c.put(18 + i * 2, 30, 10); }
  // Ноги
  c.rect(8, 24, 13, 29, 3);
  c.rect(18, 24, 23, 29, 3);
  // Торс бочкой
  c.ellipse(15.5, 17, 8.5, 8, 3);
  c.rect(7, 12, 24, 22, 3);
  // Наплечники с шипами
  c.ellipse(5.5, 10.5, 4.2, 3.6, 6);
  c.ellipse(26.5, 10.5, 4.2, 3.6, 6);
  c.tri(2, 7, 5, 3, 8, 8, 6);
  c.tri(30, 7, 27, 3, 24, 8, 6);
  // Руки и кулаки
  c.ellipse(4, 17, 3.4, 5, 3);
  c.ellipse(27, 17, 3.4, 5, 3);
  c.ellipse(4, 23, 3.6, 3.2, 3);
  c.ellipse(27, 23, 3.6, 3.2, 3);
  for (let i = 0; i < 3; i++) { c.put(2 + i, 26, 10); c.put(29 - i, 26, 10); }
  // Голова и уши
  c.ellipse(15.5, 6, 6.4, 5.6, 3);
  c.rect(10, 7, 21, 12, 3);
  c.tri(9, 4, 4, 1, 8, 9, 3);
  c.tri(22, 4, 27, 1, 23, 9, 3);
  // Ирокез
  c.tri(15, 0, 14, 3, 17, 3, 4);
  // Злые брови
  c.rect(10, 5, 14, 6, 2);
  c.rect(17, 5, 21, 6, 2);
  // Светящиеся глаза
  c.rect(11, 7, 14, 9, 9);
  c.rect(17, 7, 20, 9, 9);
  c.put(13, 8, 11); c.put(18, 8, 11);
  // Нос
  c.rect(15, 9, 16, 11, 2);
  // Рот с клыками
  c.rect(11, 12, 20, 13, 11);
  c.tri(11, 13, 12, 10, 13, 13, 10);
  c.tri(18, 13, 19, 10, 20, 13, 10);
  // Ремень с золотой пряжкой
  c.rect(8, 21, 23, 23, 2);
  c.rect(14, 20, 17, 24, 8);
  if (boss) {
    c.tri(9, 2, 6, 0, 12, 1, 8);
    c.tri(22, 2, 25, 0, 19, 1, 8);
    c.rect(12, 0, 19, 1, 8);
  }
}

function drawGolemBody(c: Canvas32, rng: () => number, boss: boolean) {
  // Ноги-колонны: сужаются книзу (трапеция), а не ровные прямоугольники.
  c.tri(7, 22, 14, 22, 13, 30, 3); c.tri(7, 22, 7, 30, 13, 30, 3);
  c.tri(17, 22, 24, 22, 18, 30, 3); c.tri(24, 22, 24, 30, 18, 30, 3);
  c.rect(6, 29, 14, 30, 2);
  c.rect(17, 29, 25, 30, 2);
  // Торс: скруглённый объём (эллипс + засечки), а не коробка 20×15.
  c.ellipse(15.5, 15.5, 10, 8, 3);
  c.rect(9, 9, 22, 22, 3);
  // Плечи-латы: угловатые пластины со шпилем. Раньше здесь были круглые
  // эллипсы радиусом 4.4 — на экране они читались как «шарики-воздушные шары».
  c.tri(2, 13, 8, 6, 11, 12, 6);
  c.tri(29, 13, 23, 6, 20, 12, 6);
  c.ellipse(6, 9, 3.2, 3, 6);
  c.ellipse(25, 9, 3.2, 3, 6);
  // Руки и кулаки (тоже компактнее и с кистью, а не шар).
  c.rect(3, 11, 6, 20, 3);
  c.rect(25, 11, 28, 20, 3);
  c.ellipse(4.5, 22.5, 3.1, 2.9, 6);
  c.ellipse(27.5, 22.5, 3.1, 2.9, 6);
  // Голова: округлый череп с широкой челюстью (был прямоугольник 14×9).
  c.ellipse(15.5, 6, 6.4, 5.6, 3);
  c.rect(10, 6, 21, 9, 3);
  c.rect(11, 4, 14, 5, 9);
  c.rect(17, 4, 20, 5, 9);
  // Узор на корпусе: у каждого id свой (минеральные вкрапления)
  for (let i = 0; i < 14; i++) {
    c.rect(8 + Math.floor(rng() * 15), 11 + Math.floor(rng() * 9), 8 + Math.floor(rng() * 15), 11 + Math.floor(rng() * 9), 2);
  }
  for (let i = 0; i < 8; i++) {
    c.ellipse(9 + rng() * 13, 11 + rng() * 9, 1, 1, 4);
  }
  for (let i = 0; i < 7; i++) {
    let x = 8 + Math.floor(rng() * 16), y = 2 + Math.floor(rng() * 20);
    for (let s = 0; s < 3; s++) { c.put(x, y, 2); x += rng() > 0.5 ? 1 : -1; y += 1; }
  }
  c.ellipse(15.5, 15, 2.6, 2.6, 9);
  c.ellipse(15.5, 15, 1.4, 1.4, 12);
  if (boss) { c.rect(10, 0, 21, 1, 8); }
}

function drawBlobBody(c: Canvas32, rng: () => number, boss: boolean) {
  c.ellipse(15.5, 18, 13, 11, 3);
  c.ellipse(15.5, 12, 10, 8, 3);
  c.ellipse(4, 24, 3.4, 3, 3);
  c.ellipse(27, 24, 3.4, 3, 3);
  c.ellipse(3, 28, 2, 1.8, 3);
  c.ellipse(29, 28, 2, 1.8, 3);
  for (let i = 0; i < 9; i++) {
    const a = rng() * Math.PI * 2, rad = rng() * 8;
    c.ellipse(15.5 + Math.cos(a) * rad, 16 + Math.sin(a) * rad * 0.8, 1.4 + rng(), 1.2 + rng(), 4);
  }
  c.ellipse(15.5, 17, 4, 3.4, 12);
  c.ellipse(11.5, 12, 2.4, 2.8, 9);
  c.ellipse(19.5, 12, 2.4, 2.8, 9);
  c.put(11, 11, 12); c.put(19, 11, 12);
  c.put(12, 12, 11); c.put(20, 12, 11);
  c.rect(13, 17, 18, 18, 11);
  c.put(13, 16, 10); c.put(18, 16, 10);
  if (boss) { c.rect(12, 1, 19, 2, 8); }
}

function drawHumanoidBody(c: Canvas32, rng: () => number, boss: boolean) {
  c.rect(10, 24, 14, 30, 3);
  c.rect(17, 24, 21, 30, 3);
  // Ступни РАЗВЕДЕНЫ: левая до x=14, правая с x=17 — зазор между ними ровно
  // совпадает с зазором между ногами (авто-колонки 15..16). Было rect(..15,31)
  // + rect(16..), и ступни смыкались ровно на колонках 63/64: ноги читались
  // как одна лопата (замер: строка y=N-1 сплошная).
  c.rect(9, 29, 14, 31, 2);
  c.rect(17, 29, 22, 31, 2);
  // Торс + нагрудник (нагрудник — вставка металла, а не весь торс).
  // Раньше грудь была прямоугольником 14×13 и читалась как «коробка из панелей»;
  // теперь грудная клетка сужается к талии, а наплечники меньше и мягче.
  c.tri(9, 12, 22, 12, 20, 20, 3);
  c.tri(9, 12, 9, 23, 20, 23, 3);
  c.tri(22, 12, 22, 23, 12, 23, 3);
  c.rect(11, 14, 20, 20, 6);
  c.rect(14, 16, 17, 19, 7);
  c.ellipse(7.4, 11.6, 3.1, 2.8, 6);
  c.ellipse(23.6, 11.6, 3.1, 2.8, 6);
  c.rect(6, 13, 9, 22, 3);
  c.rect(22, 13, 25, 22, 3);
  c.ellipse(7.5, 23.5, 2.4, 2.1, 6);
  c.ellipse(24.5, 23.5, 2.4, 2.1, 6);
  // Голова + шлем (только обод шлема металлический): округлый череп + купол.
  c.ellipse(15.5, 6, 5, 5.2, 3);
  c.ellipse(15.5, 3.6, 5.3, 2.5, 6);
  c.rect(11, 7, 20, 8, 11);
  c.rect(12, 7, 14, 8, 9);
  c.rect(17, 7, 19, 8, 9);
  c.rect(9, 21, 22, 23, 2);
  c.rect(14, 20, 17, 24, 8);
  if (boss) { c.tri(10, 2, 7, 0, 13, 1, 8); c.tri(21, 2, 24, 0, 18, 1, 8); }
  if (rng() > 0.5) c.put(9, 16, 2);
}

function drawSkeletonBody(c: Canvas32, rng: () => number, boss: boolean) {
  // Тело-«мясо» отсутствует: кости рисуем слоем 3 (тело), потом перекрасим в кость.
  c.rect(11, 23, 13, 30, 3);
  c.rect(18, 23, 20, 30, 3);
  c.rect(10, 29, 14, 31, 3);
  c.rect(17, 29, 21, 31, 3);
  c.rect(15, 11, 16, 24, 3);
  for (let i = 0; i < 5; i++) {
    const y = 12 + i * 2.4;
    c.rect(9, y, 22, y + 1, 3);
  }
  c.rect(11, 23, 20, 25, 3);
  c.rect(6, 12, 9, 21, 3);
  c.rect(22, 12, 25, 21, 3);
  c.ellipse(7.5, 23, 2.4, 2, 3);
  c.ellipse(24.5, 23, 2.4, 2, 3);
  // Череп
  c.ellipse(15.5, 5.5, 6, 5.4, 3);
  c.rect(10, 6, 21, 11, 3);
  if (boss) { c.rect(10, 1, 21, 2, 8); }
}

/**
 * ПАУК — вид сверху-вбок, головой вниз-вперёд (в мире «лицом» вправо).
 *
 * Анатомия настоящего паука, а не «круглый мешок с ногами»: тело состоит
 * из ДВУХ отделов — крупного брюшка сзади и небольшой головогруди спереди,
 * между ними тонкая талия. Восемь лап расставлены веером и упираются на
 * землю, передняя пара заметно крупнее (она же держит добычу и кусает).
 * Глаза — восемь, но собраны в две группы, как у настоящих пауков, а не
 * четыре равных фонаря в ряд.
 */
function drawSpiderBody(c: Canvas32, rng: () => number, boss: boolean) {
  // --- ВОСЕМЬ ЛАП: [плечо, узел, кончик, толщина]. Задние идут назад-вниз,
  //     передняя пара — вперёд и заметно длиннее (укус). ---
  const legs: Array<[number, number, number, number, number, number, number]> = [
    // задняя пара (самая длинная, уходит назад)
    [10, 16, 2, 9, 0, 6, 2], [21, 16, 29, 9, 31, 6, 2],
    // средняя пара
    [10, 19, 3, 17, 0, 16, 2], [21, 19, 28, 17, 31, 16, 2],
    // предпоследняя — поднимается вперёд-в стороны
    [10, 22, 4, 25, 1, 27, 2], [21, 22, 27, 25, 30, 27, 2],
    // ПЕРЕДНЯЯ ПАРА: длинная, направлена вперёд — ею паук кусает.
    [11, 25, 7, 28, 6, 31, 3], [20, 25, 24, 28, 25, 31, 3],
  ];
  for (const [x0, y0, x1, y1, x2, y2, th] of legs) {
    // Лапа — составная: бедро (толстое), голень (тоньше) и кончик-коготь.
    c.tri(x0, y0, x1, y1, x2, y2, 3);
    c.tri(x0, y0 + 0.6, x1, y1 + 0.6, x2, y2, 3);
    c.put(x1, y1, 2);                                  // узел (колено)
    c.put(x2, y2, 10);                                 // коготь
    c.put((x0 + x1) / 2, (y0 + y1) / 2, 2);
    void th;
  }
  // --- БРЮШКО: крупное, овальное, сзади (снизу) ---
  c.ellipse(15.5, 21, 7.5, 6.5, 3);
  c.ellipse(15.5, 21, 5.5, 4.6, 2);
  // узор на спинке (крест-«седло», как у крестовика)
  c.ellipse(15.5, 19.5, 3.6, 2.6, 12);
  c.ellipse(15.5, 22.5, 2.2, 1.6, 12);
  // --- ТАЛИЯ: тонкая перемычка между отделом тела ---
  c.rect(14, 15, 17, 17, 3);
  // --- ГОЛОВОГРУДЬ: меньше брюшка, спереди (сверху) ---
  c.ellipse(15.5, 12.5, 5.5, 4.2, 3);
  // --- ХЕЛИЦЕРЫ (клешни-челюсти): укус должен быть виден на спрайте ---
  c.tri(14, 9, 13.2, 4.5, 15.2, 8, 10);
  c.tri(17, 9, 17.8, 4.5, 15.8, 8, 10);
  c.paintTri(14.4, 8.6, 13.8, 5.4, 15, 8.4, 12);
  c.paintTri(16.6, 8.6, 17.2, 5.4, 16, 8.4, 12);
  // --- ГЛАЗА: 8 штук двумя группами (2 крупных + по 3 мелких) ---
  c.ellipse(12.6, 10, 1.7, 1.7, 9);
  c.ellipse(18.4, 10, 1.7, 1.7, 9);
  c.put(12.6, 10, 11); c.put(18.4, 10, 11);
  c.put(14.2, 11.6, 9); c.put(16.8, 11.6, 9);
  c.put(11.2, 12.4, 9); c.put(19.8, 12.4, 9);
  c.put(13.4, 13.2, 9); c.put(17.6, 13.2, 9);
  if (boss) {
    // Босс-паук: корона из жвал и ядовитые пятна на брюшке.
    c.rect(13, 2, 18, 3, 8);
    c.tri(13, 3, 10, 0, 16, 2, 8);
    c.tri(18, 3, 21, 0, 15, 2, 8);
    c.paintEllipse(13.5, 20, 1.6, 1.6, 9);
    c.paintEllipse(17.5, 22, 1.6, 1.6, 9);
  }
  if (rng() > 0.6) c.put(15, 25, 9);
}


/**
 * ВОЛК — ПРОФИЛЬ, мордой ВПРАВО.
 *
 * БЫЛО (и почему волк выглядел «непонятно на что»): фигура рисовалась
 * боком (морда слева, хвост справа), но форма стояла в списке `symmetrical`,
 * поэтому `mirror()` штамповал ОТРАЖЁННУЮ ГОЛОВУ поверх хвоста, а
 * `mirrorRegion(0..17)` дублировал ей ещё и глаз. На выходе — симметричный
 * мешок с четырьмя глазами в ряд и без морды: читался не волк, а кошка.
 *
 * Теперь волк честно нарисован сбоку (как в изометрии), выключен из
 * зеркалирования и разворачивается движком через `faceDir` — как настоящий
 * четвероногий зверь в side-view. Оба глаза расставлены явно, морда длинная и
 * клиновидная, грудь глубокая, живот подтянут, хвост пушистый, четыре лапы
 * на земле — силуэт читается как волк даже в 28 пикселей.
 */
function drawWolfBody(c: Canvas32, rng: () => number, boss: boolean) {
  // --- ДАЛЬНИЕ ЛАПЫ (рисуются первыми, чуть короче — перспектива) ---
  c.rect(7, 21, 9, 28, 2);      // задняя дальняя
  c.rect(17, 21, 19, 28, 2);    // передняя дальняя
  // --- БЛИЖНИЕ ЛАПЫ (толще, стоят на земле) ---
  c.rect(11, 22, 13, 30, 3);
  c.rect(21, 22, 23, 30, 3);
  // подушечки лап
  c.rect(10, 29, 14, 31, 2);
  c.rect(20, 29, 24, 31, 2);
  // когти на передних
  c.put(21, 31, 10); c.put(22, 31, 10); c.put(23, 31, 10);

  // --- ХВОСТ: пушистый, уходит назад-вверх и опадает вниз ---
  c.tri(10, 15, 1, 8, 3, 19, 3);
  c.tri(9, 16, 2, 12, 4, 19, 2);

  // --- КОРПУС: глубокая грудь спереди, подтянутый живот сзади ---
  c.ellipse(20, 17, 6, 5.5, 3);    // плечо/грудь
  c.ellipse(15, 16.5, 6.5, 4.5, 3); // спина
  c.ellipse(11, 18, 5, 4.5, 3);     // круп
  c.tri(10, 20, 20, 22, 20, 19, 3); // линия живота (подъём кзади)
  // загривок / шерсть на холке
  c.ellipse(17, 14, 5, 2.2, 3);

  // --- ШЕЯ: от плеча вверх-вперёд к голове ---
  c.tri(21, 13, 27, 10, 21, 18, 3);

  // --- ГОЛОВА: череп + длинная клиновидная морда ---
  c.ellipse(25.5, 11, 4.2, 3.6, 3);
  c.tri(26, 9.4, 32, 11.2, 26, 13.2, 3);   // морда
  c.tri(26, 12.4, 31, 11.6, 26, 14, 3);    // нижняя челюсть
  // Уши: стоячие, острые — признак волка
  c.tri(23.5, 8.5, 22.5, 1.5, 27, 7, 3);
  c.tri(28, 8.5, 30.5, 2.5, 30.5, 9.5, 3);
  c.tri(24.5, 7.5, 24, 3, 26.5, 7, 2);      // тень внутри ушей
  c.tri(28.8, 7.8, 30, 4, 30, 8.6, 2);
  // Нос (тёмный) и пасть с клыками
  c.put(31, 11, 11);
  c.paintEllipse(31, 11, 1.3, 1, 11);
  c.rect(28, 12, 31, 12, 11);
  c.paintTri(28, 12, 28.4, 9.4, 29.4, 12, 10);   // клык верхний
  c.paintTri(30, 12, 30.5, 10, 31.4, 12, 10);    // клык второй
  if (boss) { c.rect(23, 0, 30, 1, 8); }          // грива/украшение босса
}


function drawBatBody(c: Canvas32, rng: () => number, boss: boolean) {
  c.tri(6, 12, 0, 4, 2, 20, 3);
  c.tri(25, 12, 31, 4, 29, 20, 3);
  c.tri(3, 6, 0, 0, 7, 4, 3);
  c.tri(28, 6, 31, 0, 24, 4, 3);
  for (let i = 0; i < 3; i++) { c.put(3 + i * 1.4, 8 + i * 4, 2); c.put(28 - i * 1.4, 8 + i * 4, 2); }
  c.ellipse(15.5, 16, 5.5, 7, 3);
  c.ellipse(15.5, 17, 3, 3.4, 4);
  c.rect(12, 21, 14, 25, 3);
  c.rect(17, 21, 19, 25, 3);
  c.put(12, 25, 10); c.put(13, 25, 10); c.put(18, 25, 10); c.put(19, 25, 10);
  c.ellipse(15.5, 8, 5, 4.6, 3);
  c.tri(11, 5, 9, 0, 14, 3, 3);
  c.tri(20, 5, 22, 0, 17, 3, 3);
  c.ellipse(13, 7.5, 1.6, 1.6, 9);
  c.ellipse(18, 7.5, 1.6, 1.6, 9);
  c.rect(13, 11, 18, 12, 11);
  c.tri(13, 13, 13.6, 10, 14.4, 13, 10);
  c.tri(17, 13, 17.6, 10, 18.4, 13, 10);
  if (boss) { c.rect(13, 1, 18, 2, 8); }
  if (rng() > 0.5) c.put(6, 14, 2);
}

function drawSpiritBody(c: Canvas32, rng: () => number, boss: boolean) {
  c.ellipse(15.5, 9, 7.5, 7, 3);
  c.ellipse(15.5, 11, 6, 4.4, 11);
  c.rect(9, 12, 22, 24, 3);
  for (let i = 0; i < 6; i++) {
    const x = 9 + i * 2.6;
    c.rect(x, 24, x + 2, 26 + Math.floor(rng() * 4), 3);
  }
  c.ellipse(15.5, 15, 5, 6, 12);
  c.ellipse(12.5, 8, 2, 2.6, 9);
  c.ellipse(18.5, 8, 2, 2.6, 9);
  c.ellipse(12.5, 8, 1, 1.2, 4);
  c.ellipse(18.5, 8, 1, 1.2, 4);
  c.ellipse(15.5, 12, 2.4, 1.8, 11);
  if (boss) { c.rect(12, 1, 19, 2, 8); }
}

function drawShadowBody(c: Canvas32, rng: () => number, boss: boolean) {
  c.ellipse(15.5, 16, 10, 11, 3);
  for (let i = 0; i < 22; i++) {
    const a = rng() * Math.PI * 2, rad = 9 + rng() * 6;
    c.ellipse(15.5 + Math.cos(a) * rad, 16 + Math.sin(a) * rad, 1.6, 1.6, 3);
  }
  // Светлый акцент-дымка по краям (для объёма)
  for (let i = 0; i < 10; i++) {
    const a = rng() * Math.PI * 2, rad = 11 + rng() * 5;
    c.ellipse(15.5 + Math.cos(a) * rad, 16 + Math.sin(a) * rad, 1.4, 1.4, 12);
  }
  c.ellipse(15.5, 16, 6, 7, 11);
  c.ellipse(12, 12, 2.2, 2.8, 9);
  c.ellipse(19, 12, 2.2, 2.8, 9);
  c.ellipse(12, 12, 1, 1.4, 12);
  c.ellipse(19, 12, 1, 1.4, 12);
  c.tri(4, 18, 0, 22, 6, 24, 3);
  c.tri(27, 18, 31, 22, 25, 24, 3);
  if (boss) { c.ellipse(15.5, 4, 5, 2, 8); }
}


function drawCrystalBody(c: Canvas32, rng: () => number, boss: boolean) {
  c.tri(15.5, 0, 10, 20, 21, 20, 3);
  c.rect(11, 18, 20, 29, 3);
  c.tri(15.5, 0, 14, 14, 18, 14, 12);
  c.tri(7, 8, 3, 24, 11, 24, 3);
  c.tri(24, 8, 20, 24, 28, 24, 3);
  c.tri(7, 8, 6, 18, 9, 18, 12);
  for (let i = 0; i < 8; i++) c.put(10 + rng() * 12, 6 + rng() * 20, 4);
  c.ellipse(15.5, 15, 2.6, 3.4, 9);
  c.ellipse(15.5, 15, 1.2, 1.8, 4);
  c.rect(10, 28, 21, 30, 2);
  if (boss) { c.tri(15.5, 0, 11, 3, 20, 3, 8); }
}

/**
 * МЯГКИЙ ОБЪЁМ ПО ПОЛЮ РАССТОЯНИЙ (rounded volume).
 *
 * Проблема, которую это чинит: объём раньше считался по КРОМКЕ (`shade`:
 * «верхние пиксели → свет, нижние/боковые → тень»). На прямоугольных фигурах
 * (а боссы нарисованы в основном прямоугольниками: торс-коробка, голова-коробка,
 * руки-колонки) такая полоса идёт РОВНОЙ ЛИНИЕЙ вдоль всего силуэта, и тварь
 * читается как «робот из панелей», а не как живое существо.
 *
 * Теперь форма получает настоящий объём: строится поле расстояний до фона
 * (chamfer 3.4 на Author-space сетке 32×32), из него — карта высот
 * h = min(dist, R) («скруглённый» профиль: у края полого, в середине плато),
 * из градиента h — нормаль, и по ней считается Ламберт от источника
 * сверху-слева. В результате свет и тень идут ПО ФОРМЕ: округлый живот,
 * объёмный торс, мягкие скулы — без единой «панельной» полосы.
 *
 * Работает в АВТОРСКИХ единицах (32×32), потом сглаженно (билинейно) разворачивается
 * на пиксели спрайта, поэтому блок SS×SS не читается ступенькой.
 *
 * Меняет ТОЛЬКО нейтральные тона (3 — тело, 6 — металл): явно нарисованные тени
 * (2) и блики (4) не трогаются, поэтому авторские детали (глаза, когти, панцири)
 * остаются как нарисованы.
 */
function volumeShade(c: Canvas32, radius: number = 3.4, lightX = -0.5, lightY = -0.62): void {
  const A = ART_UNIT;
  const mask = new Uint8Array(A * A);
  let any = false;
  for (let y = 0; y < c.n; y++) {
    const row = c.g[y];
    const ay = ((y / SS) | 0) * A;
    for (let x = 0; x < c.n; x++) {
      const v = row[x];
      if (v === 0 || v === 1) continue;
      mask[ay + (((x / SS) | 0))] = 1;
      any = true;
    }
  }
  if (!any) return;
  // --- Расстояние до фона (chamfer 3.4), два прохода по Author-сетке ---
  const INF = 1e9;
  const dist = new Float32Array(A * A);
  for (let i = 0; i < A * A; i++) dist[i] = mask[i] ? INF : 0;
  const D1 = 1, D2 = 1.4142;
  for (let y = 0; y < A; y++) {
    for (let x = 0; x < A; x++) {
      const i = y * A + x;
      if (!mask[i]) continue;
      let d = dist[i];
      if (y > 0) {
        if (dist[i - A] + D1 < d) d = dist[i - A] + D1;
        if (x > 0 && dist[i - A - 1] + D2 < d) d = dist[i - A - 1] + D2;
        if (x < A - 1 && dist[i - A + 1] + D2 < d) d = dist[i - A + 1] + D2;
      }
      if (x > 0 && dist[i - 1] + D1 < d) d = dist[i - 1] + D1;
      dist[i] = d;
    }
  }
  for (let y = A - 1; y >= 0; y--) {
    for (let x = A - 1; x >= 0; x--) {
      const i = y * A + x;
      if (!mask[i]) continue;
      let d = dist[i];
      if (y < A - 1) {
        if (dist[i + A] + D1 < d) d = dist[i + A] + D1;
        if (x > 0 && dist[i + A - 1] + D2 < d) d = dist[i + A - 1] + D2;
        if (x < A - 1 && dist[i + A + 1] + D2 < d) d = dist[i + A + 1] + D2;
      }
      if (x < A - 1 && dist[i + 1] + D1 < d) d = dist[i + 1] + D1;
      dist[i] = d;
    }
  }
  // --- Карта высот и нормали → Ламберт ---
  const hgt = new Float32Array(A * A);
  for (let i = 0; i < A * A; i++) hgt[i] = mask[i] ? Math.min(dist[i], radius) : 0;
  const lz = Math.sqrt(Math.max(0.05, 1 - lightX * lightX - lightY * lightY));
  const lam = new Float32Array(A * A);
  for (let y = 0; y < A; y++) {
    for (let x = 0; x < A; x++) {
      const i = y * A + x;
      if (!mask[i]) { lam[i] = 0; continue; }
      const hl = hgt[y * A + Math.max(0, x - 1)], hr = hgt[y * A + Math.min(A - 1, x + 1)];
      const hu = hgt[Math.max(0, y - 1) * A + x], hd = hgt[Math.min(A - 1, y + 1) * A + x];
      let nx = -(hr - hl) * 0.5, ny = -(hd - hu) * 0.5, nz = 1;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      nx /= len; ny /= len; nz /= len;
      // Полусфера: снизу светлее не становится — берём только «лицевую» часть.
      const d = nx * lightX + ny * lightY + nz * lz;
      lam[i] = Math.max(0, Math.min(1, d));
    }
  }
  // --- Разворачиваем на пиксели спрайта (билинейно) и раскладываем по тонам ---
  const HI = 0.62, LO = 0.40;
  for (let y = 0; y < c.n; y++) {
    const row = c.g[y];
    const fy = y / SS, ay = fy | 0, ty = fy - ay, ay1 = Math.min(A - 1, ay + 1);
    for (let x = 0; x < c.n; x++) {
      const v = row[x];
      if (v !== 3 && v !== 6) continue;   // только нейтральные тона
      const fx = x / SS, ax = fx | 0, tx = fx - ax, ax1 = Math.min(A - 1, ax + 1);
      const l00 = lam[ay * A + ax], l10 = lam[ay * A + ax1];
      const l01 = lam[ay1 * A + ax], l11 = lam[ay1 * A + ax1];
      const t = (l00 * (1 - tx) + l10 * tx) * (1 - ty) + (l01 * (1 - tx) + l11 * tx) * ty;
      if (t > HI) row[x] = v === 3 ? 4 : 7;
      else if (t < LO) row[x] = v === 3 ? 2 : 5;
    }
  }
}
/**
 * Постобработка спрайта «как на референсе»: жёсткий верхне-левый контрсвет (rim light),
 * объёмная тень внизу (ambient occlusion), свечение глаз и ядро у слизней.
 * Работает в пикселях спрайта и не трогает контур (слой 1) и фон (0).
 */
function polishArt(c: Canvas32, shape: EnemyShape, boss: boolean) {
  const n = ART_N;
  let minX = n, maxX = -1, minY = n, maxY = -1;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const v = c.g[y][x];
      if (v === 0 || v === 1) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) return;
  // ВАЖНО: анатомия рисуется в авторских единицах (ART_UNIT = 32), а сетка —
  // ART_N пикселей при SS = ART_N / ART_UNIT px на единицу (SS = 8). Один вызов
  // put() заливает блок SS×SS, поэтому «авторская строка» — это SS строк спрайта.
  //
  // Ошибка, дававшая «полосы поперёк тела»: объём и блик считались в ПИКСЕЛЯХ
  // СПРАЙТА ((y - aoTop) / (maxY - aoTop)), то есть градиент имел 8 шагов на
  // авторскую единицу — но реальной вертикальной детализации там нет, её уже
  // «съел» блок 8×8. Вдобавок маска Баера с периодом 4 строки спрайта ложилась
  // повторяющимся узором, и 33 % строк совпадали со строкой через 4 px. На экране
  // босс (140–200 px) получал ровные полосы через всю фигуру.
  //
  // Теперь обе величины считаются в АВТОРСКИХ единицах (y / SS) и дизеринг идёт
  // по маске 8×8 без короткого периода — градиент плавный и без «полок».
  const h = (maxY - minY + 1) / SS;
  const body = (v: number) => v === 3 || v === 10;
  // ПЛАВНЫЕ ГРАДИЕНТЫ БЕЗ ДИЗЕРИНГА. Раньше тень/свет накладывались маской
  // Байера 8×8, и на экране 140–200 px (босс) этот узор читался как ШАХМАТНЫЙ
  // «робо-панцирь» через всё тело — главная причина, по которой боссы выглядели
  // неестественно и одинаково. Теперь тень — сплошная зона с smoothstep-поворотом
  // по глубине, свет — узкая непрерывная кайма: объём остаётся, узора нет.
  //
  // 1) ОБЪЁМ (ambient occlusion) — мягкая непрерывная кривая в авторских единицах.
  //    Тень наносится в авторских единицах и плавно, поэтому не «упирается»
  //    в обводку ровной линией на всю ширину силуэта.
  const aoTopA = (maxY - Math.round((maxY - minY + 1) * 0.36)) / SS;
  for (let y = minY; y <= maxY; y++) {
    const depth = (y / SS - aoTopA) / Math.max(1e-6, h - (aoTopA - minY / SS));
    if (depth <= 0) continue;
    const d = Math.min(1, depth);
    // smoothstep: на границе зоны затенение равно нулю → стыка не видно вовсе.
    const th = d * d * (3 - 2 * d) * 0.94;
    for (let x = minX; x <= maxX; x++) {
      if (y < 0 || y >= n || !body(c.g[y][x])) continue;
      // Сплошная заливка по порогу: никакого дизеринга — только чистый градиент.
      if (th > 0.28) c.g[y][x] = 2;
    }
  }
  // 2) Rim light: единый источник света сверху-слева, яркость гаснет плавно
  //    (в авторских единицах, а не в пикселях спрайта — см. комментарий выше).
  //    Свет живёт на кромке, омываемой фоном; яркость гаснет плавно вниз.
  const rt = Math.max(1, Math.round(SS / 4));
  for (let y = minY; y <= maxY; y++) {
    const d = h > 0 ? (y / SS - minY / SS) / h : 1;
    const lum = 1 - d * 0.95;
    if (lum <= 0.06) continue;
    for (let x = minX; x <= maxX; x++) {
      if (!body(c.g[y][x])) continue;
      let upEdge = false, leftEdge = false;
      for (let k = 1; k <= rt && !(upEdge && leftEdge); k++) {
        const up = y - k >= 0 ? c.g[y - k][x] : 0;
        const left = x - k >= 0 ? c.g[y][x - k] : 0;
        if (up === 0 || up === 1) upEdge = true;
        if (left === 0 || left === 1) leftEdge = true;
      }
      if (!upEdge && !leftEdge) continue;
      // Сплошная кайма (без дизеринга): свет читается как мягкий блик у кромки.
      if (lum > 0.35) c.g[y][x] = 4;
    }
  }
  // 3) Свечение глаз: вокруг зрачка разгорается тело (у боссов — шире)
  const halo = (boss ? 3 : 2) * Math.max(1, Math.round(SS / 4));
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (c.g[y][x] !== 9) continue;
      for (let dy = -halo; dy <= halo; dy++) {
        for (let dx = -halo; dx <= halo; dx++) {
          const xi = x + dx, yi = y + dy;
          if (xi < 0 || yi < 0 || xi >= n || yi >= n) continue;
          const v = c.g[yi][xi];
          if (v === 2) c.g[yi][xi] = 3;
          else if (v === 3) c.g[yi][xi] = 4;
          else if (v === 4) c.g[yi][xi] = 12;
        }
      }
    }
  }
  // 4) Слизень: внутри геля светится ядро (видно сквозь полупрозрачную массу)
  if (shape === 'blob') {
    const cx = (minX + maxX) / 2, cy = minY + h * 0.56;
    const core = Math.max(2, Math.round(SS * 0.8));
    for (let dy = -core; dy <= core; dy++) {
      for (let dx = -core; dx <= core; dx++) {
        if (dx * dx + dy * dy > core * core) continue;
        const xi = Math.round(cx + dx), yi = Math.round(cy + dy);
        if (xi < 0 || yi < 0 || xi >= n || yi >= n) continue;
        const v = c.g[yi][xi];
        if (v === 2 || v === 3) c.g[yi][xi] = dy < 0 ? 4 : 12;
      }
    }
  }
  // 5) РЕГАЛИИ БОССА — ТОЛЬКО ИНДИВИДУАЛЬНАЯ «подпись» из drawBossRegalia.
  //    Раньше здесь стоял ОДИНАКОВЫЙ для всех боссов шаблон (корона + золотые
  //    наплечники + заклёпки поверх готового спрайта), и 120 боссов читались
  //    как «одно существо в разных цветах». Теперь polishArt больше не кладёт
  //    общий золотой слой: различия даёт личная регалия (meta.regalia), см.
  //    drawBossRegalia/bossGrandeur — они вызываются один раз в buildMonsterArt.
  //    Здесь остаётся только подсветка глаз/ядра (пункты 3–4 выше).
}

/** Высота силуэта в авторских единицах (для размещения регалий). */
function h0(maxY: number, minY: number): number {
  return Math.max(1, (maxY - minY + 1) / SS);
}


function drawGargoyleBody(c: Canvas32, rng: () => number, boss: boolean) {
  c.tri(7, 10, 0, 3, 1, 18, 3);
  c.tri(24, 10, 31, 3, 30, 18, 3);
  c.tri(2, 6, 0, 2, 8, 4, 3);
  c.tri(29, 6, 31, 2, 23, 4, 3);
  for (let i = 0; i < 3; i++) { c.put(2 + i, 8 + i * 3, 2); c.put(29 - i, 8 + i * 3, 2); }
  c.rect(11, 12, 20, 29, 3);
  c.ellipse(15.5, 11, 5.5, 5, 3);
  c.tri(11, 8, 8, 3, 14, 6, 10);
  c.tri(20, 8, 23, 3, 17, 6, 10);
  // Лапы разведены (левая до x=14, правая с x=17) — между ними чистый зазор.
  c.rect(10, 27, 14, 31, 3);
  c.rect(17, 27, 21, 31, 3);
  for (let i = 0; i < 3; i++) { c.put(10 + i * 2, 31, 10); c.put(17 + i * 2, 31, 10); }
  c.rect(12, 10, 14, 11, 9);
  c.rect(17, 10, 19, 11, 9);
  c.rect(13, 14, 18, 15, 11);
  c.put(13, 13, 10); c.put(18, 13, 10);
  for (let i = 0; i < 6; i++) c.put(11 + rng() * 9, 17 + rng() * 10, 2);
  if (boss) { c.rect(11, 1, 20, 2, 8); }
}

function drawImpBody(c: Canvas32, rng: () => number, boss: boolean) {
  c.tri(8, 12, 2, 6, 3, 20, 3);
  c.tri(23, 12, 29, 6, 28, 20, 3);
  c.ellipse(15.5, 17, 6, 7, 3);
  c.rect(11, 23, 14, 29, 3);
  c.rect(17, 23, 20, 29, 3);
  // Копыта разведены (левое до x=14, правое с x=17) — зазор по центру.
  c.rect(10, 28, 14, 30, 11);
  c.rect(17, 28, 21, 30, 11);
  c.put(22, 22, 3); c.put(24, 24, 3); c.put(26, 26, 3);
  c.tri(25, 24, 31, 22, 29, 29, 3);
  c.ellipse(15.5, 9, 5.5, 5, 3);
  c.tri(11, 6, 8, 0, 14, 4, 10);
  c.tri(20, 6, 23, 0, 17, 4, 10);
  c.tri(15, 4, 14, 0, 17, 0, 10);
  c.rect(12, 8, 14, 9, 9);
  c.rect(17, 8, 19, 9, 9);
  c.put(13, 8, 11); c.put(18, 8, 11);
  c.rect(12, 12, 19, 13, 11);
  c.tri(12, 14, 12.6, 11, 13.6, 14, 10);
  c.tri(18, 14, 18.6, 11, 19.6, 14, 10);
  c.ellipse(5, 20, 2.6, 2.6, 9);
  c.ellipse(26, 20, 2.6, 2.6, 9);
  c.ellipse(5, 20, 1.2, 1.2, 4);
  if (boss) { c.rect(11, 0, 20, 1, 8); }
}

function drawEyeBody(c: Canvas32, rng: () => number, boss: boolean) {
  c.ellipse(15.5, 16, 12, 10, 3);
  c.ellipse(15.5, 16, 9, 8, 10);
  c.ellipse(15.5, 16, 6, 6, 9);
  c.ellipse(15.5, 16, 4, 4, 12);
  c.ellipse(15.5, 16, 1.6, 4.5, 11);
  c.ellipse(13, 13, 1.6, 1.6, 4);
  for (let i = 0; i < 8; i++) {
    const a = rng() * Math.PI * 2;
    c.put(15.5 + Math.cos(a) * 8, 16 + Math.sin(a) * 7, 9);
  }
  c.tri(6, 8, 3, 2, 9, 6, 3);
  c.tri(25, 8, 28, 2, 22, 6, 3);
  c.tri(4, 16, 0, 14, 4, 20, 3);
  c.tri(27, 16, 31, 14, 27, 20, 3);
  c.tri(10, 25, 6, 31, 13, 27, 3);
  c.tri(21, 25, 25, 31, 18, 27, 3);
  if (boss) { c.rect(12, 1, 19, 2, 8); }
}

function drawBeetleBody(c: Canvas32, rng: () => number, boss: boolean) {
  c.ellipse(15.5, 19, 10, 9, 3);
  c.ellipse(15.5, 19, 9, 8, 6);
  c.rect(15, 12, 16, 27, 2);
  for (let i = 0; i < 6; i++) c.put(11 + (i % 3) * 4, 14 + Math.floor(i / 3) * 5, 7);
  c.ellipse(15.5, 11, 6.5, 4.5, 3);
  c.tri(15.5, 8, 13, 0, 18, 0, 10);
  c.tri(15.5, 7, 14.5, 2, 17, 2, 4);
  const legs: Array<[number, number, number]> = [[9, 14, 2], [22, 14, 29], [9, 20, 3], [22, 20, 28], [11, 26, 6], [20, 26, 25]];
  for (const [x0, y0, x1] of legs) {
    c.tri(x0, y0, x1, y0 + 3, x1, y0 + 1, 3);
  }
  c.ellipse(13, 10, 1.6, 1.6, 9);
  c.ellipse(18, 10, 1.6, 1.6, 9);
  c.tri(13, 7, 9, 2, 12, 4, 3);
  c.tri(18, 7, 22, 2, 19, 4, 3);
  if (boss) { c.rect(12, 0, 19, 1, 8); }
  if (rng() > 0.5) c.put(15, 24, 9);
}

function drawDragonBody(c: Canvas32, rng: () => number, boss: boolean) {
  c.tri(8, 12, 0, 3, 2, 19, 3);
  c.tri(23, 12, 31, 3, 29, 19, 3);
  c.tri(4, 6, 0, 1, 9, 4, 3);
  c.tri(27, 6, 31, 1, 22, 4, 3);
  for (let i = 0; i < 4; i++) { c.put(2 + i, 7 + i * 3, 2); c.put(29 - i, 7 + i * 3, 2); }
  c.ellipse(15.5, 17, 8, 8, 3);
  for (let i = 0; i < 16; i++) c.put(9 + rng() * 13, 12 + rng() * 12, 2);
  c.rect(12, 10, 19, 15, 4);
  c.ellipse(15.5, 7, 6, 5, 3);
  c.tri(7, 9, 14, 6, 13, 12, 3);
  c.tri(11, 4, 7, 0, 14, 3, 10);
  c.tri(20, 4, 24, 0, 17, 3, 10);
  c.rect(10, 7, 13, 8, 9);
  c.rect(18, 7, 21, 8, 9);
  c.put(11, 7, 11); c.put(20, 7, 11);
  c.rect(5, 11, 9, 12, 11);
  c.tri(1, 9, 5, 12, 4, 16, 9);
  c.tri(0, 13, 4, 14, 3, 17, 9);
  c.rect(9, 25, 13, 30, 3);
  c.rect(18, 25, 22, 30, 3);
  for (let i = 0; i < 3; i++) { c.put(9 + i * 1.6, 31, 10); c.put(18 + i * 1.6, 31, 10); }
  if (boss) { c.rect(11, 0, 20, 1, 8); }
}

/** Лицо и глаза — рисуются ПОСЛЕДНИМИ, поверх объёма и брони. */
function paintFace(c: Canvas32, shape: EnemyShape, rng: () => number) {
  switch (shape) {
    case 'humanoid':
      // Глаза: светящаяся щель с тёмным зрачком
      c.paintRect(12, 7, 14, 8, 9);
      c.paintRect(17, 7, 19, 8, 9);
      c.paint(13, 8, 11); c.paint(18, 8, 11);
      // Рот: узкая тёмная щель + два клыка снизу
      c.paintRect(14, 10, 17, 10, 11);
      c.paintTri(13, 12, 13.5, 9, 14.4, 12, 10);
      c.paintTri(17.6, 12, 18.5, 9, 19, 12, 10);
      // Блики на металле наплечников
      c.paint(6, 10, 7); c.paint(25, 10, 7);
      break;
    case 'skeleton':
      c.paintEllipse(12.5, 6, 2.2, 2.4, 11);
      c.paintEllipse(18.5, 6, 2.2, 2.4, 11);
      c.paintEllipse(12.5, 6, 1.1, 1.1, 9);
      c.paintEllipse(18.5, 6, 1.1, 1.1, 9);
      c.paint(15, 8, 11); c.paint(16, 8, 11);
      c.paintRect(12, 10, 19, 11, 10);
      for (let i = 0; i < 4; i++) c.paint(12 + i * 2, 11, 11);
      break;
    case 'golem':
      c.paintRect(12, 4, 14, 5, 9);
      c.paintRect(17, 4, 19, 5, 9);
      c.paintEllipse(15.5, 15, 1.6, 1.6, 12);
      break;
    case 'beetle':
      c.paintEllipse(13, 10, 1.8, 1.8, 9);
      c.paintEllipse(18, 10, 1.8, 1.8, 9);
      c.paint(13, 10, 11); c.paint(18, 10, 11);
      break;
    case 'spider':
      // Глаза уже расставлены в drawSpiderBody (две группы по 4). Здесь только
      // блик на двух крупных — иначе после зеркалирования лица они удваивались.
      c.paint(12, 9, 4); c.paint(18, 9, 4);
      break;
    case 'eye':
      c.paintEllipse(15.5, 16, 4, 4, 12);
      c.paintEllipse(15.5, 16, 1.6, 4.5, 11);
      c.paintEllipse(12.5, 12.5, 1.6, 1.6, 4);
      for (let i = 0; i < 6; i++) {
        const a = rng() * Math.PI * 2;
        c.paint(15.5 + Math.cos(a) * 7.5, 16 + Math.sin(a) * 6.5, 9);
      }
      // Радужка-свечение вокруг зрачка (глаз должен «гореть»)
      c.paintEllipse(15.5, 16, 5, 5, 9);
      c.paintEllipse(15.5, 16, 4, 4, 12);
      c.paintEllipse(15.5, 16, 1.5, 4.2, 11);
      c.paintEllipse(12.5, 12.5, 1.5, 1.5, 4);
      break;
    case 'dragon':
      c.paintRect(11, 7, 13, 8, 9);
      c.paintRect(18, 7, 20, 8, 9);
      c.paintRect(6, 11, 9, 12, 11);
      c.paintTri(1, 9, 5, 12, 4, 16, 9);
      break;
    case 'imp':
      c.paintRect(13, 8, 14, 9, 9);
      c.paintRect(17, 8, 18, 9, 9);
      c.paintRect(13, 12, 18, 13, 11);
      c.paintEllipse(5, 20, 1.6, 1.6, 9);
      c.paintEllipse(26, 20, 1.6, 1.6, 9);
      break;
    case 'bat':
      c.paintEllipse(13, 7, 1.6, 1.6, 9);
      c.paintEllipse(18, 7, 1.6, 1.6, 9);
      break;
    case 'gargoyle':
      c.paintRect(13, 10, 14, 11, 9);
      c.paintRect(17, 10, 18, 11, 9);
      break;
    case 'spirit':
      c.paintEllipse(12.5, 8, 1.8, 2.2, 9);
      c.paintEllipse(18.5, 8, 1.8, 2.2, 9);
      break;
    case 'wolf':
      // Волк нарисован боком (см. drawWolfBody), поэтому оба глаза ставятся
      // ЯВНО и зеркалирование лица для него выключено — иначе получалось
      // четыре глаза в ряд. Глаз дальний (у морды) меньше и тусклее.
      c.paintEllipse(24, 10, 1.7, 1.5, 9);
      c.paintEllipse(24, 10, 0.8, 0.7, 11);
      c.paintEllipse(28.6, 10.6, 1.3, 1.2, 2);
      c.paintEllipse(28.6, 10.6, 0.6, 0.6, 9);
      break;
    case 'blob':
      c.paintEllipse(11.5, 12, 2, 2.4, 9);
      c.paintEllipse(19.5, 12, 2, 2.4, 9);
      c.paint(12, 12, 11); c.paint(20, 12, 11);
      break;
    case 'shadow':
      c.paintEllipse(12, 12, 2, 2.6, 9);
      c.paintEllipse(19, 12, 2, 2.6, 9);
      break;
    case 'crystal':
      c.paintEllipse(15.5, 15, 2.4, 3, 9);
      c.paintEllipse(15.5, 15, 1, 1.6, 4);
      break;
    default:
      break;
  }
}

/** Зеркалит только указанную область (для лица и деталей). */
function mirrorRegion(c: Canvas32, y0: number, y1: number) {
  const ys = Math.max(0, Math.round(y0 * SS));
  const ye = Math.min(ART_N - 1, Math.round(y1 * SS));
  for (let y = ys; y <= ye; y++) {
    for (let x = 0; x < ART_N / 2; x++) {
      const v = c.g[y][x];
      if (v === 0) continue;
      c.g[y][ART_N - 1 - x] = v;
    }
  }
}

// ============================================================
// ОРУЖИЕ. Рисуется ПОСЛЕ зеркалирования, в мире справа (рука монстра).
// Оружие несимметрично, поэтому добавляет силуэту характер и «профессию».
// Слои: 1 контур, 5-7 металл, 2-4 дерево/тело, 8 золото, 9 свечение, 10 кость.
// ============================================================

/** Древко/рукоять: дерево с тёмным контуром. */
function kitShaft(c: Canvas32, x0: number, y0: number, x1: number, y1: number) {
  c.line(x0, y0, x1, y1, 3, 2);
  c.line(x0, y0, x1, y1, 2);
}

function drawWeaponSword(c: Canvas32, boss: boolean) {
  const L = boss ? 8 : 0;
  c.rect(26, 21, 28, 27, 3);
  c.rect(25, 20, 30, 21, 8);
  c.rect(27, 27, 28, 29, 8);
  // Клинок с долом и остриём
  c.line(28, 19, 36 + L, 5, 6, 2);
  c.line(28, 20, 35 + L, 7, 7);
  c.put(37 + L, 4, 6);
  c.line(29, 18, 35 + L, 6, 7);
}

function drawWeaponDagger(c: Canvas32) {
  c.rect(26, 22, 28, 26, 3);
  c.rect(25, 21, 29, 22, 6);
  c.line(28, 20, 33, 12, 7, 2);
  c.put(34, 11, 6);
}

function drawWeaponAxe(c: Canvas32, boss: boolean) {
  const S = boss ? 3 : 0;
  kitShaft(c, 27, 29, 30, 10);
  c.tri(30 - S, 12, 40 + S, 8, 30, 19, 6);
  c.tri(30, 12, 20 - S, 9, 30, 19, 6);
  c.line(30, 12, 39 + S, 9, 7);
  c.line(30, 19, 39 + S, 18, 5);
  c.line(30, 19, 21 - S, 18, 5);
  c.put(29, 9, 8); c.put(30, 9, 8);
}

function drawWeaponSpear(c: Canvas32, boss: boolean) {
  const S = boss ? 4 : 0;
  c.line(26, 31, 33 + S, 22, 3, 2);
  c.line(34 + S, 21, 38 + S * 0.5, 12, 3, 2);
  c.tri(37, 15, 42 + S, 5, 36, 5, 7);
  c.line(38, 13, 40 + S, 7, 6);
  c.rect(34, 14, 39, 15, 6);
  c.put(38, 4, 9);
}

function drawWeaponHalberd(c: Canvas32, boss: boolean) {
  const S = boss ? 3 : 0;
  c.line(26, 31, 32, 14, 3, 2);
  c.tri(32, 16, 42 + S, 11, 33, 23, 6);
  c.line(33, 16, 41 + S, 12, 7);
  c.line(32, 14, 40 + S, 5, 6);
  c.tri(41 + S, 5, 43 + S, 1, 38, 4, 7);
  c.put(33, 13, 8);
}

function drawWeaponClub(c: Canvas32, boss: boolean) {
  const S = boss ? 3 : 0;
  c.line(27, 30, 32, 18, 3, 3);
  c.ellipse(34 + S, 13, 6 + S * 0.5, 5, 3);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    c.tri(34 + S, 13, 34 + S + Math.cos(a) * 9, 13 + Math.sin(a) * 8, 34 + S + Math.cos(a) * 7 + 1, 13 + Math.sin(a) * 6, 10);
  }
  c.line(28, 29, 31, 20, 2);
  c.ring(34 + S, 13, 4, 3.4, 2);
}

function drawWeaponMace(c: Canvas32, boss: boolean) {
  const S = boss ? 2 : 0;
  c.line(26, 30, 32, 16, 3, 2);
  c.ellipse(34 + S, 12, 5.4, 5, 6);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    c.line(34 + S, 12, 34 + S + Math.cos(a) * 8.5, 12 + Math.sin(a) * 7.5, 7);
  }
  c.put(34 + S, 12, 8);
}

function drawWeaponHammer(c: Canvas32, boss: boolean) {
  const S = boss ? 3 : 0;
  c.line(26, 30, 31, 17, 3, 3);
  c.rect(31, 7, 41 + S, 17, 6);
  c.rect(32, 9, 39 + S, 15, 7);
  c.rect(30, 6, 42 + S, 8, 5);
  c.rect(30, 16, 42 + S, 18, 5);
  c.put(31, 12, 8);
}

function drawWeaponBow(c: Canvas32, boss: boolean) {
  const R = boss ? 15 : 13;
  c.arc(30, 16, R, R, -1.25, 1.25, 3);
  c.arc(30, 16, R, R, -1.15, 1.15, 2);
  c.line(30 + Math.cos(-1.25) * R, 16 + Math.sin(-1.25) * R, 30 + Math.cos(1.25) * R, 16 + Math.sin(1.25) * R, 10);
  c.put(31 + Math.round(Math.cos(-1.2) * R), 16 + Math.round(Math.sin(-1.2) * R), 8);
  c.put(31 + Math.round(Math.cos(1.2) * R), 16 + Math.round(Math.sin(1.2) * R), 8);
  c.line(30, 16, 41, 16, 6);
  c.tri(41, 16, 45, 14, 45, 18, 7);
  // РИСЕР (рукоять): лук держат за середину, и ручка должна доходить до кисти
  // (27,22). Раньше арт целиком лежал правее (x≥34), поэтому в замахе лук висел
  // в 3 единицах от руки и крутился вокруг пустоты.
  c.line(31, 16, 26, 21, 3, 2);
  c.line(31, 16, 26, 21, 2);
  c.put(27, 22, 4);
}

function drawWeaponCrossbow(c: Canvas32) {
  c.rect(27, 13, 40, 15, 3);
  c.rect(28, 14, 38, 15, 2);
  c.line(30, 6, 34, 20, 3, 2);
  c.line(30, 6, 40, 13, 2);
  c.line(30, 20, 40, 15, 2);
  c.line(38, 14, 43, 14, 6);
  c.tri(43, 14, 46, 12, 46, 16, 7);
  c.put(29, 14, 8);
}

export type WeaponKit =
  | 'none' | 'sword' | 'dagger' | 'axe' | 'spear' | 'halberd' | 'club' | 'mace'
  | 'hammer' | 'bow' | 'crossbow' | 'scythe' | 'sickle' | 'staff' | 'orb'
  | 'torch' | 'horn' | 'claw' | 'trident' | 'whip' | 'shield' | 'book' | 'banner';

function drawWeaponScythe(c: Canvas32, boss: boolean) {
  const S = boss ? 4 : 0;
  kitShaft(c, 26, 31, 33, 11);
  // Длинное изогнутое лезвие серпа
  c.arc(33, 10, 8 + S, 7, Math.PI * 1.05, Math.PI * 1.95, 6);
  c.arc(33, 10, 6.4 + S, 5.6, Math.PI * 1.1, Math.PI * 1.9, 7);
  c.put(25 - S, 4, 7);
  c.put(24 - S, 5, 6);
  c.rect(31, 10, 34, 12, 8);
}

function drawWeaponSickle(c: Canvas32) {
  c.rect(26, 22, 28, 28, 3);
  c.arc(28, 18, 7, 6, -0.5, 2.4, 6);
  c.arc(28, 18, 5.4, 4.6, -0.4, 2.3, 7);
  c.put(34, 12, 7);
  c.rect(26, 20, 29, 22, 8);
}

function drawWeaponStaff(c: Canvas32, boss: boolean) {
  const S = boss ? 3 : 0;
  // Посох + светящийся кристалл в навершии
  kitShaft(c, 27, 31, 32, 12);
  c.ring(33 + S * 0.5, 9, 4, 4.4, 8);
  c.ellipse(33 + S * 0.5, 9, 2.4, 2.6, 9);
  c.put(32 + S * 0.5, 8, 4);
  c.rect(30, 26, 32, 30, 2);
}

function drawWeaponOrb(c: Canvas32, rng: () => number, boss: boolean) {
  const S = boss ? 2 : 0;
  // Сфера над ладонью — сила элементаля
  c.ring(33, 13, 6 + S, 6 + S, 8);
  c.ellipse(33, 13, 4.6 + S, 4.6 + S, 9);
  c.ellipse(33, 13, 2.4 + S * 0.5, 2.4 + S * 0.5, 12);
  c.put(31, 11, 4);
  // Осколки вращаются вокруг сферы (детерминированно по id)
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + rng() * 0.3;
    c.put(33 + Math.cos(a) * (9 + S), 13 + Math.sin(a) * (9 + S), 9);
  }
}

function drawWeaponTorch(c: Canvas32) {
  kitShaft(c, 27, 30, 31, 18);
  c.rect(28, 15, 33, 19, 3);
  // Пламя: три языка
  c.tri(28, 15, 30.5, 6, 33, 15, 9);
  c.tri(30, 15, 32, 3, 34, 15, 12);
  c.tri(29, 16, 31.5, 9, 33, 16, 4);
}

function drawWeaponHorn(c: Canvas32) {
  // Боевой рог: изогнутый, с золотым раструбом и ремнём
  c.arc(27, 22, 7, 6, Math.PI * 0.85, Math.PI * 1.85, 10);
  c.arc(27, 22, 5.4, 4.6, Math.PI * 0.9, Math.PI * 1.8, 2);
  c.ellipse(21, 14, 2.6, 3, 8);
  c.line(27, 28, 28, 31, 3, 2);
}

function drawWeaponClaw(c: Canvas32, boss: boolean) {
  const S = boss ? 1 : 0;
  // Когтистая лапа. Раньше когти рисовались на x=39..42 при ширине холста всего
  // 32 авторских единицы — они уходили за край и в спрайте выглядели белыми
  // «царапинами» на срезе. Теперь лапа и когти целиком в кадре (x <= 31)
  // и тёмные: коготь — часть тела, а не светлая палка.
  for (let i = 0; i < 3; i++) {
    const y0 = 17 + i * 3.5;
    const x1 = 27 + S + i;
    c.line(26, y0, x1, y0 - 2.5, 2, 1);
    c.line(26, y0, x1, y0 - 2.2, 5, 1);
    c.put(x1 + 1, y0 - 3, 1);
  }
  c.ellipse(26, 19.5, 2.8, 4, 3);
  c.rect(24, 17.5, 26, 23, 2);
}

function drawWeaponTrident(c: Canvas32, boss: boolean) {
  const S = boss ? 3 : 0;
  kitShaft(c, 26, 31, 31, 14);
  c.rect(24, 11, 34, 14, 6);
  // Три зубца
  for (let i = -1; i <= 1; i++) {
    c.line(29 + i * 3.6, 11, 29 + i * (4.6 + S * 0.4), 2, 7, 1);
    c.put(29 + Math.round(i * 4.6), 1, 6);
  }
  c.put(29, 9, 8);
}

function drawWeaponWhip(c: Canvas32, rng: () => number) {
  // Плеть/цепь: свободная кривая из звеньев
  let x = 27, y = 28;
  for (let i = 0; i < 11; i++) {
    const a = Math.PI * 1.15 + Math.sin(i * 0.7 + rng() * 0.2) * 0.9;
    x += Math.cos(a) * 2.4;
    y += Math.sin(a) * 2.2;
    c.put(x, y, 6);
    if (i % 3 === 0) c.put(x + 1, y, 2);
  }
  c.rect(26, 26, 28, 31, 3);
}

function drawWeaponShield(c: Canvas32, boss: boolean) {
  const S = boss ? 3 : 0;
  // Круглый щит с обручем и умбоном (золото). Центр держим на 34-й единице:
  // раньше он уходил в 36 + S = 39, правый край доходил до 49-й, а холст кончается
  // на 48-й — щит босса ОБРЕЗАЛСЯ краем спрайта. Смещение влево дополнительно
  // пододвигает щит к кисти (27,22): в замахе он больше не висит надувом.
  const cx = 34;
  c.ellipse(cx, 20, 7 + S, 9 + S, 6);
  c.ring(cx, 20, 7 + S, 9 + S, 5);
  c.ring(cx, 20, 4.6, 6, 8);
  c.ellipse(cx, 20, 2, 2.4, 8);
  c.put(cx - 1, 19, 7);
}

function drawWeaponBook(c: Canvas32) {
  // Переплёт — металл/кожа существа (6), страницы — кость (10), ремень золотой.
  // Раньше обложка шла слоем 12 (accent = осветлённый базовый цвет ×1.9), и книга
  // выглядела ярким светлым прямоугольником рядом с тварью — как картонная плашка.
  c.rect(28, 14, 38, 28, 6);
  c.rect(29, 15, 37, 27, 10);
  c.rect(28, 20, 38, 21, 8);
  c.line(33, 15, 33, 28, 5);
  c.put(31, 17, 9); c.put(35, 24, 9);
}

function drawWeaponBanner(c: Canvas32, boss: boolean) {
  const S = boss ? 3 : 0;
  const right = 40 + S, mid = 34 + S * 0.5;
  kitShaft(c, 27, 31, 29, 4);
  // Полотнище: верхний прямоугольник + ДВА зубца снизу, между которыми вырез
  // («ласточкин хвост»). Раньше низ был сплошным прямоугольником/треугольником,
  // и знамя читалось как большая цветная плашка рядом с тварью.
  c.rect(29, 5, right, 17, 6);
  c.tri(29, 17, mid - 2.5, 17, 31.5, 22, 6);      // левый зубец
  c.tri(right, 17, mid + 2.5, 17, right - 2.5, 22, 6); // правый зубец
  // Сгиб ткани у древка и золотая кайма сверху/сбоку.
  c.rect(30, 6, 33, 17, 5);
  c.rect(29, 5, right, 5, 8);
  c.line(29, 5, 29, 17, 8);
  c.line(right, 5, right, 17, 8);
  // Герб: кольцо со знаком посередине полотнища.
  c.ring(mid, 11, 2.4, 2.4, 8);
  c.put(mid, 11, 9);
}

const WEAPON_FN: Record<WeaponKit, ((c: Canvas32, rng: () => number, boss: boolean) => void) | null> = {
  none: null,
  sword: (c, _r, b) => drawWeaponSword(c, b),
  dagger: (c) => drawWeaponDagger(c),
  axe: (c, _r, b) => drawWeaponAxe(c, b),
  spear: (c, _r, b) => drawWeaponSpear(c, b),
  halberd: (c, _r, b) => drawWeaponHalberd(c, b),
  club: (c, _r, b) => drawWeaponClub(c, b),
  mace: (c, _r, b) => drawWeaponMace(c, b),
  hammer: (c, _r, b) => drawWeaponHammer(c, b),
  bow: (c, _r, b) => drawWeaponBow(c, b),
  crossbow: (c) => drawWeaponCrossbow(c),
  scythe: (c, _r, b) => drawWeaponScythe(c, b),
  sickle: (c) => drawWeaponSickle(c),
  staff: (c, _r, b) => drawWeaponStaff(c, b),
  orb: (c, r, b) => drawWeaponOrb(c, r, b),
  torch: (c) => drawWeaponTorch(c),
  horn: (c) => drawWeaponHorn(c),
  claw: (c, _r, b) => drawWeaponClaw(c, b),
  trident: (c, _r, b) => drawWeaponTrident(c, b),
  whip: (c, r) => drawWeaponWhip(c, r),
  shield: (c, _r, b) => drawWeaponShield(c, b),
  book: (c) => drawWeaponBook(c),
  banner: (c, _r, b) => drawWeaponBanner(c, b),
};

/**
 * ОТДЕЛЬНЫЙ СПРАЙТ ОРУЖИЯ — для анимации замаха/удара в бою.
 * Раньше удар рисовался линией канвы («белая палка»): клинок, топор или коса
 * выглядели одинаково — просто штрихом. Теперь движок берёт ТО ЖЕ пиксель-арт,
 * что стоит у твари в руке, и поворачивает его вокруг кисти по дуге удара.
 *
 * pivotX/pivotY — кисть руки в пикселях спрайта (той же системе, что и
 * stampWeapon). axis — направление «клинок вперёд» в авторской системе
 * координат; длина — расстояние до кончика. Ось считается по самой дальней
 * точке арта, поэтому любой набор (коса, копьё, молот) поворачивается верно
 * без таблиц углов.
 */
export interface WeaponSprite {
  grid: ArtGrid;
  pivotX: number;
  pivotY: number;
  axis: number;
  length: number;
}

export function buildWeaponSprite(
  kit: WeaponKit,
  boss: boolean,
  seed: string,
  variant: ArtVariant = 'attackC',
): WeaponSprite | null {
  const fn = WEAPON_FN[kit];
  if (!fn) return null;
  const rng = mulberry(hashStr(seed + variant + (boss ? 'B' : 'm')));
  // Расширенный холст: длинный клинок/копьё должны влезать целиком.
  const wc = new Canvas32(WEAPON_N);
  fn(wc, rng, boss);
  const pivotX = 27 * SS, pivotY = 22 * SS;
  let best = -1, bx = pivotX, by = pivotY;
  for (let y = 0; y < WEAPON_N; y++) {
    for (let x = 0; x < WEAPON_N; x++) {
      if (wc.g[y][x] === 0) continue;
      const d = (x - pivotX) * (x - pivotX) + (y - pivotY) * (y - pivotY);
      if (d > best) { best = d; bx = x; by = y; }
    }
  }
  if (best <= 0) return null;
  return {
    grid: wc.g,
    pivotX,
    pivotY,
    axis: Math.atan2(by - pivotY, bx - pivotX),
    length: Math.sqrt(best),
  };
}

// ============================================================
// НАБОР МОНСТРА: оружие и стихия по ИМЕНИ (ru/en) и по форме.
// Порядок правил важен: сверху — более специфичные.
// ============================================================
interface KitRule { keys: string[]; weapon: WeaponKit; element?: string }

const KIT_RULES: KitRule[] = [
  // --- Оружие прямо из названия ---
  { keys: ['лучник', 'archer', 'sniper', 'hunter', 'охотник', 'лучниц'], weapon: 'bow' },
  { keys: ['арбалет', 'crossbow', 'ballista', 'баллист'], weapon: 'crossbow' },
  { keys: ['копейщик', 'spearman', 'пикинёр', 'pikeman', 'lancer', 'копьенос'], weapon: 'spear' },
  { keys: ['алебард', 'halberd', 'палач', 'executioner'], weapon: 'halberd' },
  { keys: ['топор', 'axe', 'дровосек', 'мясник', 'butcher'], weapon: 'axe' },
  { keys: ['молот', 'hammer', 'кузнец', 'smith', 'разрушитель', 'wrecker'], weapon: 'hammer' },
  { keys: ['булав', 'mace'], weapon: 'mace' },
  { keys: ['дубин', 'club', 'огр', 'ogre', 'тролль', 'troll'], weapon: 'club' },
  { keys: ['мечник', 'swordsman', 'рыцар', 'knight', 'squire', 'паладин', 'paladin', 'воин', 'warrior'], weapon: 'sword' },
  { keys: ['кинжал', 'dagger', 'убийца', 'assassin', 'вор', 'thief', 'разбойник', 'bandit'], weapon: 'dagger' },
  { keys: ['косарь', 'жнец', 'reaper', 'scythe', 'косой'], weapon: 'scythe' },
  { keys: ['серп', 'sickle'], weapon: 'sickle' },
  { keys: ['жрец', 'priest', 'культист', 'cultist', 'колдун', 'warlock', 'ведьма', 'witch', 'некромант', 'necromancer', 'шаман', 'shaman', 'маг', 'mage'], weapon: 'staff' },
  { keys: ['инквизитор', 'inquisitor', 'епископ', 'bishop', 'кардинал', 'cardinal'], weapon: 'book' },
  { keys: ['знаменосец', 'banner', 'герольд', 'herald', 'скипетр'], weapon: 'banner' },
  { keys: ['факельщик', 'torchbearer'], weapon: 'torch' },
  { keys: ['трезубец', 'trident', 'нептун', 'tide'], weapon: 'trident' },
  { keys: ['плеть', 'бич', 'whip', 'укротитель'], weapon: 'whip' },
  { keys: ['глашатай', 'horn', 'рогонос'], weapon: 'horn' },
  { keys: ['щитоносец', 'shieldbearer'], weapon: 'shield' },
  { keys: ['голем', 'golem', 'каменный страж', 'колосс', 'colossus', 'stone guard'], weapon: 'shield' },
  { keys: ['волк', 'wolf', 'пёс', 'собака', 'ищейка', 'hound', 'койот', 'coyote', 'тигр', 'tiger', 'пантер', 'panther'], weapon: 'claw' },

  // --- Стихии по имени (оружие + элемент) ---
  { keys: ['ледян', 'ice', 'frost', 'мороз', 'снеж', 'холод', 'glacial', 'winter'], weapon: 'orb', element: 'ice' },
  { keys: ['огн', 'fire', 'flame', 'пламен', 'lava', 'магма', 'infernal', 'адск', 'ember', 'пепел'], weapon: 'torch', element: 'fire' },
  { keys: ['яд', 'venom', 'poison', 'токс', 'tox', 'болот', 'swamp', 'гниль', 'rot', 'слиз', 'slime'], weapon: 'orb', element: 'poison' },
  { keys: ['гроз', 'storm', 'thunder', 'молн', 'lightning', 'шторм', 'буря', 'tempest', 'электр'], weapon: 'staff', element: 'storm' },
  { keys: ['тенев', 'shadow', 'тьм', 'dark', 'мрак', 'abyss', 'бездн', 'void', 'кошмар', 'nightmare'], weapon: 'scythe', element: 'dark' },
];

/** Фолбэк по форме — чтобы ни один монстр не остался «безруким». */
const SHAPE_WEAPON: Partial<Record<EnemyShape, WeaponKit>> = {
  humanoid: 'sword',
  skeleton: 'axe',
  golem: 'hammer',
  imp: 'torch',
  wolf: 'claw',
  spider: 'claw',
  dragon: 'claw',
  gargoyle: 'claw',
  spirit: 'staff',
  blob: 'none',
  bat: 'none',
  beetle: 'none',
  crystal: 'none',
  eye: 'none',
  shadow: 'none',
};

/** Определяет оружие и стихию монстра по имени (ru/en), иначе — по форме. */
export function monsterKit(
  id: string,
  nameRu: string,
  nameEn: string,
  shape: EnemyShape,
  boss: boolean,
): { weapon: WeaponKit; element?: string } {
  const s = (nameRu + '|' + nameEn + '|' + id).toLowerCase();
  // Бесформенные и звериные твари (слизень, жук, паук-зверь, кристалл, глаз, тень)
  // НЕ держат предметов: их удар — это их анатомия (см. signatureAttacks).
  const weaponless = SHAPE_WEAPON[shape] === 'none';
  let element: string | undefined;
  for (const rule of KIT_RULES) {
    let matched = false;
    for (const k of rule.keys) {
      if (s.includes(k)) { matched = true; break; }
    }
    if (!matched) continue;
    if (element === undefined && rule.element) element = rule.element;
    if (weaponless) continue;               // оружие не даём, но стихию по имени досматриваем
    return { weapon: rule.weapon, element: rule.element };
  }
  return { weapon: SHAPE_WEAPON[shape] ?? (boss ? 'staff' : 'none'), element };
}

/**
 * ВЕЛИЧИЕ БОССА — послойные элементы, которые делают силуэт узнаваемым, но
 * НЕ кладутся на всех одинаково: мантия и «башенка» наплечников есть только у
 * властных наборов регалий (0/1/2/4), у кристального венца (3) и черепного
 * нагрудника (5) — другая, компактная конструкция плеч. Ядро в груди и его
 * «лучи» рисуются всегда, но форма ядра зависит от варианта. Так два босса с
 * разными regalia больше не выглядят как один шаблон.
 *
 * Слои 5/6/7 — броня (тень/тело/свет), 8 — золото, 9 — свечение.
 * Всё рисуется в авторских единицах (ART_UNIT = 32) и зеркалится putPair.
 */
/**
 * ПЛАЩ БОССА — рисуется ДО тела, поэтому реально оказывается ПОЗАДИ фигуры.
 *
 * Раньше «мантия» дорисовывалась поверх готового спрайта (bossGrandeur), из-за
 * чего закрывала торс и ноги, а её нижняя кромка была ровным прямоугольником —
 * на экране босс читался как тварь, стоящая за тёмной плитой. Теперь плащ:
 *   • сужается к подолу и имеет ВОЛНИСТУЮ нижнюю кромку (три зубца ткани);
 *   • состоит из двух слоёв (тень 2 + ткань 5) с вертикальными складками;
 *   • рисуется в тех же авторских единицах, зеркалится вместе с телом.
 * Есть только у «властных» наборов регалий (0/1/2/4) и только у форм с плечами.
 */
function bossCape(c: Canvas32, shape: EnemyShape, variant: number): void {
  const v = ((variant % 6) + 6) % 6;
  if (!(v === 0 || v === 1 || v === 2 || v === 4)) return;
  // Бесформенные (слизь, глаз, кристалл, призрак, тень) плаща не носят.
  if (shape === 'blob' || shape === 'eye' || shape === 'crystal' || shape === 'spirit' || shape === 'shadow') return;
  // Полотно: от плеч вниз и в стороны, но НЕ до самого низа холста — подол
  // должен остаться чуть выше каблуков, иначе плащ снова станет «плитой».
  // Слои: 2 — тёмная кайма, 6 — полотно, 5 — складки (все три тона одного
  // «металла» существа). Раньше складки шли слоем 2 по полотну 5, и диагональные
  // чёрные линии читались как «чёрная лестница» на плаще.
  c.tri(4, 12, -1, 27, 9, 29, 2);
  c.tri(27, 12, 32, 27, 22, 29, 2);
  c.tri(5, 13, 1, 26, 10, 28, 6);
  c.tri(26, 13, 30, 26, 21, 28, 6);
  // Волнистый подол: три зубца вместо ровной кромки.
  c.tri(1, 26, 7, 26, 4, 29.5, 6);
  c.tri(10, 28, 15, 28, 12.5, 31, 6);
  c.tri(16, 28, 21, 28, 18.5, 31, 6);
  c.tri(24, 26, 30, 26, 27, 29.5, 6);
  // Складки: мягкие, в соседнем тоне полотна — ткань читается объёмной.
  c.line(6, 16, 4, 26, 5, 1);
  c.line(25, 16, 27, 26, 5, 1);
  c.line(10, 19, 9, 27, 5, 1);
  c.line(21, 19, 22, 27, 5, 1);
}
function bossGrandeur(c: Canvas32, shape: EnemyShape, variant: number): void {
  const v = ((variant % 6) + 6) % 6;
  // У круглых/бесформенных тварей (глаз, слизень) плечей нет — расширять нечего.
  const hasShoulders = shape !== 'blob' && shape !== 'eye' && shape !== 'crystal' && shape !== 'spirit';

  if (hasShoulders) {
    // 1) ПЛАЩ. Раньше здесь рисовалась «мантия»: два треугольника +.rect(3,28,28,31,2)
    //    СПЕРВА на готовом теле, поэтому она закрывала торс и ноги и на экране
    //    читалась как тёмная ПЛИТА за боссом. Теперь плащ рисуется ДО тела
    //    (см. bossCape в buildMonsterArt) — он действительно находится ПОЗАДИ,
    //    а его подол с зубцами и складками выглядит тканью, а не прямоугольником.
    // 2) НАПЛЕЧНИКИ — у властных наборов «башенка» из трёх плит, у остальных
    //    одна широкая пластина со шпилем (компактнее, иначе всё сливается).
    if (v === 0 || v === 1 || v === 2 || v === 4) {
      for (let i = 0; i < 3; i++) {
        const y = 10 + i * 3;
        const w = 8 - i;
        const x = 5 + i;
        c.tri(x, y, x + w - 2, y - 1, x + w - 3, y + 3, 5);
        c.putPair(x + 1, y, 6);
      }
      c.line(6, 10, 2, 5, 6, 1);
      c.put(2, 4, 7);
      c.put(3, 6, 6);
      c.rect(5, 10, 12, 10, 8);
      c.put(4, 9, 8);
      c.putPair(5, 9, 8);
    } else {
      c.tri(4, 13, 6, 8, 11, 12, 5);
      c.putPair(6, 11, 7);
      c.line(6, 9, 3, 5, 6, 1);
      c.put(3, 4, 8);
      c.rect(6, 13, 11, 13, 8);
    }
  }

  // 3) ЯДРО В ГРУДИ: свечение 9, самоцвет 8, блик 12. Три варианта формы.
  if (v % 3 === 0) {
    c.ellipse(16, 18, 2.4, 2.8, 9);
    c.ellipse(16, 18, 1.5, 1.8, 8);
    c.put(16, 17, 12);
  } else if (v % 3 === 1) {
    c.tri(14, 20, 18, 20, 16, 15, 9);
    c.tri(15, 19, 17, 19, 16, 16, 8);
    c.put(16, 18, 12);
  } else {
    c.ring(16, 18, 2.6, 3.0, 9);
    c.ellipse(16, 18, 1.6, 1.8, 8);
    c.put(16, 18, 12);
  }
  // лучи от ядра
  c.putPair(11, 18, 9);
  c.putPair(13, 18, 9);
  c.putPair(19, 18, 9);
  c.putPair(21, 18, 9);
  c.put(16, 14, 9);
  c.put(16, 22, 9);
}

/**
 * РЕГАЛИИ БОССА — шесть взаимно разных наборов инсигний, рисуемых ПОСЛЕ
 * polishArt: корона-гребень, рогатый шлем, крылатый доспех, кристальный венец,
 * гало бездны, черепной нагрудник. Раньше поверх этого ещё ложился ОДИНАКОВЫЙ
 * для всех проход `regaliaPass` (зубчатая корона + золотые наплечники +
 * заклёпки), и боссы любого набора сливались в один шаблон. Теперь «общей
 * золотой короны» нет — различие целиком даёт личная регалия (EnemyDef.regalia)
 * и форма твари; см. buildMonsterArt, где эта функция и вызывается.
 */
function drawBossRegalia(c: Canvas32, variant: number) {
  const v = ((variant % 6) + 6) % 6;
  switch (v) {
    case 0: // Корона-гребень: зубчатый силуэт вместо золотой плашки-бруска.
      // Раньше здесь стоял c.rect(11,1,20,3,8) — ровный прямоугольник, который на
      // экране читался как «жёлтая коробка на голове».
      c.tri(11, 4, 12, 1, 13, 4, 8); c.tri(15, 4, 16, 0, 17, 4, 8);
      c.tri(19, 4, 20, 1, 21, 4, 8);
      c.rect(11, 4, 20, 4, 8);
      c.tri(6, 12, 3, 7, 9, 10, 8);
      c.tri(25, 12, 28, 7, 22, 10, 8);
      c.putPair(15, 17, 9); c.putPair(14, 17, 12);
      break;
    case 1: // Рогатый шлем: визор, обод с заклёпками, самоцвет во лбу
      c.line(9, 8, 5, 3, 8, 2); c.put(4, 2, 9);
      c.line(22, 8, 26, 3, 8, 2); c.put(27, 2, 9);
      c.rect(10, 4, 21, 6, 6);
      c.putPair(11, 5, 7); c.putPair(19, 5, 7);
      c.putPair(15, 3, 9); c.putPair(14, 3, 12);
      c.rect(12, 10, 19, 11, 5);
      break;
    case 2: // Крылатый доспех: перьевые наплечники, кираса, пояс с клеймом
      c.tri(4, 13, 0, 6, 9, 10, 7); c.tri(27, 13, 31, 6, 22, 10, 7);
      c.line(2, 8, 8, 6, 6, 2); c.line(29, 8, 23, 6, 6, 2);
      c.line(1, 11, 7, 9, 5, 2); c.line(30, 11, 24, 9, 5, 2);
      c.tri(10, 10, 12, 7, 13, 11, 8); c.tri(21, 10, 19, 7, 18, 11, 8);
      c.rect(13, 12, 18, 19, 5); c.line(16, 12, 16, 19, 7);
      c.rect(11, 20, 20, 21, 8); c.putPair(15, 20, 9);
      break;
    case 3: // Кристальный венец: парящие осколки, диадема, глаз-самоцвет
      c.rect(11, 3, 20, 4, 6);
      c.tri(13, 3, 16, 0, 18, 3, 12); c.put(16, 0, 9);
      c.tri(7, 4, 9, 0, 11, 4, 12); c.tri(20, 4, 22, 0, 24, 4, 12);
      c.tri(4, 13, 6, 9, 9, 14, 12); c.tri(27, 13, 25, 9, 22, 14, 12);
      c.ellipse(16, 17, 2, 2, 9); c.ring(16, 17, 3, 3, 12);
      break;
    case 4: // Гало бездны: двойное кольцо над головой + рунная гривна
      c.ring(16, 2, 7, 4, 8); c.ring(16, 2, 9, 5, 9);
      c.putPair(7, 3, 9); c.putPair(8, 0, 9);
      c.rect(11, 11, 20, 12, 5);
      c.arc(16, 10, 9, 4, 2.6, 3.8, 12);
      c.arc(16, 10, 9, 4, 5.6, 6.8, 12);
      c.putPair(15, 16, 9);
      break;
    default: // Черепной нагрудник: костяной череп, клыки, платформы плеч
      c.tri(4, 13, 1, 9, 9, 11, 8); c.tri(27, 13, 30, 9, 22, 11, 8);
      c.line(13, 6, 10, 1, 10, 2); c.line(18, 6, 21, 1, 10, 2);
      c.ellipse(16, 16, 4, 3.4, 10);
      c.putPair(14, 15, 11); c.putPair(15, 15, 11);
      c.rect(14, 18, 17, 19, 4);
      c.line(11, 14, 9, 18, 10, 2); c.line(20, 14, 22, 18, 10, 2);
      c.putPair(15, 20, 9);
      break;
  }
}

/**
 * ОБЪЁМ РЕГАЛИЙ. Наносит мягкую тень/свет на инсигнии босса, чтобы широкие
 * плоские детали (гало, венец, нагрудник) не резали фигуру ровной линией на
 * границе блока SS×SS (та самая «полоса поперёк тела» шириной в одну строку).
 *
 * Работает по «верхним» слоям регалий (5-8 броня/золото, 10 кость, 12 акцент):
 * нижние кромки темнятся, верхние подсвечиваются. Раньше здесь тоже стоял
 * дизеринг 8×8 — на крупном боссе он превращал золото/металл в шахматный узор;
 * теперь тень/свет идут СПЛОШНЫМИ зонами: объём остаётся, «клетка» исчезает.
 */
function regaliaShade(c: Canvas32, variant: number): void {
  const n = ART_N;
  // Инсигния = «металл/золото/кость/акцент». Тень/свет — БЛИЖАЙШИЕ тона, чтобы
  // переход оставался мягким: резкий скачок (6→5 на 65/255) детектор полос читает
  // как «линию через тело», а 6→6.5 (соседний металл) — как объём.
  const DARK: Record<number, number> = { 5: 5, 6: 5, 7: 6, 8: 8, 10: 2, 12: 12 };
  const LIGHT: Record<number, number> = { 5: 6, 6: 7, 7: 7, 8: 8, 10: 4, 12: 12 };
  for (let y = 1; y < n - 1; y++) {
    for (let x = 1; x < n - 1; x++) {
      const v = c.g[y][x];
      const dk = DARK[v];
      if (dk === undefined) continue;
      const up = c.g[y - 1][x], down = c.g[y + 1][x];
      const left = c.g[y][x - 1], right = c.g[y][x + 1];
      // Кромки самой инсигнии (рядом пусто или контур) не трогаем — там обводка.
      const onEdge = up === 0 || up === 1 || down === 0 || down === 1
        || left === 0 || left === 1 || right === 0 || right === 1;
      if (onEdge) continue;
      // Объём сплошными зонами (без дизеринга): нижняя кромка — тень, верхняя —
      // свет. Стык с телом не режется ровной линией, «шахматка» не появляется.
      if (down !== v) c.g[y][x] = dk;
      else if (up !== v) c.g[y][x] = LIGHT[v];
    }
  }
}

/**
 * Дополнительная детализация «по анатомии»: пластины брони, рёбра, кости крыльев,
 * чешуя, сегменты, перепонки. Вызывается после объёма и до контура.
 */
function detailPass(c: Canvas32, shape: EnemyShape, rng: () => number, boss: boolean) {
  switch (shape) {
    case 'humanoid': {
      // Нагрудник: пластины + заклёпки + наручи + поножи
      c.rect(11, 13, 20, 14, 6);
      c.rect(11, 17, 20, 18, 6);
      c.rect(12, 15, 19, 16, 7);
      c.putPair(12, 14, 7);
      c.putPair(19, 17, 7);
      c.rect(6, 16, 9, 19, 6);
      c.rect(22, 16, 25, 19, 6);
      c.rect(7, 17, 8, 18, 7);
      c.rect(23, 17, 24, 18, 7);
      c.rect(10, 26, 14, 27, 6);
      c.rect(17, 26, 21, 27, 6);
      break;
    }
    case 'skeleton': {
      // Парные рёбра + позвонки + тазовая кость + ключицы
      for (let i = 0; i < 4; i++) {
        const y = 12 + i * 2;
        c.rect(10, y, 22, y, 10);
        c.put(15 + Math.floor(rng() * 2), y, 2);
      }
      c.rect(12, 23, 19, 25, 10);
      c.rect(14, 24, 17, 24, 2);
      c.rect(8, 11, 12, 11, 10);
      c.rect(19, 11, 23, 11, 10);
      break;
    }
    case 'golem': {
      // Крупные каменные плиты + трещины + наплечные шипы
      c.rect(7, 9, 14, 14, 6);
      c.rect(17, 9, 24, 14, 6);
      c.rect(8, 16, 15, 21, 6);
      c.rect(16, 16, 23, 21, 6);
      for (let i = 0; i < 6; i++) {
        const x = 8 + Math.floor(rng() * 14), y = 10 + Math.floor(rng() * 11);
        c.put(x, y, 5); c.put(x + 1, y + 1, 5);
      }
      c.tri(5, 9, 1, 5, 8, 7, 5);
      c.tri(26, 9, 30, 5, 23, 7, 5);
      break;
    }
    case 'dragon': {
      // Кости крыльев + перепонка + продольная чешуя + гребень
      c.line(8, 8, 1, 3, 2); c.line(8, 10, 1, 12, 2); c.line(8, 12, 3, 19, 2);
      c.line(23, 8, 30, 3, 2); c.line(23, 10, 30, 12, 2); c.line(23, 12, 28, 19, 2);
      for (let i = 0; i < 12; i++) c.put(11 + Math.floor(rng() * 10), 13 + Math.floor(rng() * 10), 5);
      for (let i = 0; i < 5; i++) c.tri(13 + i * 2, 5, 14 + i * 2, 1, 14 + i * 2, 5, 8);
      break;
    }
    case 'bat':
    case 'gargoyle': {
      // Пальцы крыла с перепонкой (обе стороны зеркальны)
      for (let i = 0; i < 3; i++) { c.line(11, 12 + i * 2, 1 + i * 2, 5 + i * 5, 2); c.line(21, 12 + i * 2, 31 - i * 2, 5 + i * 5, 2); }
      c.line(2, 5, 8, 20, 2); c.line(29, 5, 23, 20, 2);
      break;
    }
    case 'spider': {
      // Сегменты брюшка (теперь брюшко ниже и крупнее), паутинные железы
      // и волоски на лапах.
      c.ring(15.5, 21, 6.6, 5.6, 2);
      c.ring(15.5, 21, 3.4, 3, 2);
      c.putPair(13.5, 25, 9);
      for (let i = 0; i < 8; i++) c.put(2 + rng() * 4, 7 + rng() * 16, 2);
      for (let i = 0; i < 8; i++) c.put(26 + rng() * 4, 7 + rng() * 16, 2);
      break;
    }
    case 'wolf': {
      // Шерсть по хребту и на холке + когти на лапах (волк нарисован боком).
      for (let i = 0; i < 9; i++) c.put(8 + i * 1.6, 12.5 + (i % 2) * 0.8, 2);
      for (let i = 0; i < 4; i++) c.put(3 + i * 1.8, 11 + (i % 2), 2);  // хвост
      for (let i = 0; i < 3; i++) { c.put(11 + i * 1.2, 31, 10); c.put(21 + i * 1.2, 31, 10); }
      break;
    }
    case 'imp': {
      // Кожаные крылья + копыта + хвост с жалом
      for (let i = 0; i < 3; i++) { c.line(6, 12 + i * 3, 1, 8 + i * 4, 2); c.line(25, 12 + i * 3, 30, 8 + i * 4, 2); }
      c.line(22, 22, 30, 26, 2);
      c.tri(30, 26, 34, 24, 31, 30, 9);
      c.rect(12, 27, 14, 30, 2);
      c.rect(17, 27, 19, 30, 2);
      break;
    }
    case 'blob': {
      // Внутренние пузыри + блик желе
      for (let i = 0; i < 6; i++) c.ring(11 + rng() * 10, 14 + rng() * 10, 1.6 + rng(), 1.4 + rng(), 12);
      c.put(11, 9, 4); c.put(12, 9, 4); c.put(11, 10, 4);
      break;
    }
    case 'crystal': {
      // Грани + внутренние лучи
      for (let i = 0; i < 5; i++) {
        const y = 4 + i * 2.4;
        const w = 8 - Math.abs(8 - y);
        c.line(15.5, y, 15.5 - w, y + 3, 4);
        c.line(15.5, y, 15.5 + w, y + 3, 5);
      }
      break;
    }
    case 'spirit': {
      // Потоки эфира + пелена
      for (let i = 0; i < 10; i++) c.put(9 + rng() * 14, 12 + rng() * 12, 4);
      c.arc(15.5, 15, 6, 7, -0.9, 0.9, 2);
      break;
    }
    case 'shadow': {
      // Щупальца-языки тьмы
      for (let i = 0; i < 7; i++) {
        const a = Math.PI * 0.15 + (i / 7) * Math.PI * 0.7;
        c.line(15.5, 22, 15.5 + Math.cos(a) * 13, 22 + Math.sin(a) * 10, 2);
      }
      break;
    }
    case 'beetle': {
      // Шов надкрыльев + сегменты + усики
      c.line(15, 13, 15, 27, 2);
      for (let i = 0; i < 4; i++) c.ring(15.5, 16 + i * 3, 8 - i * 0.6, 2.6, 5);
      c.line(13, 8, 6, 1, 2); c.line(18, 8, 25, 1, 2);
      break;
    }
    case 'eye': {
      // Кровеносные жилки + веко
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        c.line(15.5, 16, 15.5 + Math.cos(a) * 11, 16 + Math.sin(a) * 9, 2);
      }
      c.arc(15.5, 16, 12, 10, Math.PI * 0.15, Math.PI * 0.85, 2);
      break;
    }
    default:
      break;
  }
  if (boss) {
    // Боссам — тяжёлый бронепояс поверх деталей
    c.rect(9, 18, 22, 19, 5);
    c.putPair(10, 18, 8);
  }
}

/**
 * ВЗМАХ КРЫЛА: поворот вокруг ПЛЕЧА, а не сдвиг строк.
 *
 * Старая wingFlap просто сдвигала внешние столбцы вверх/вниз с квадратичным
 * весом — крылья «ездят» по вертикали и выглядят как бумажные лоскуты на
 * верёвке. Новая версия делает три вещи:
 *   1) ПОВОРОТ вокруг точки плеча (ось шеи, корень крыла) — кончик описывает
 *      настоящую дугу, как у птицы, а не вертикальный сдвиг;
 *   2) ВЕС растёт от нуля у корня к единице у кончика — крыло гнётся, корпус и
 *      грудь не трогаются, поэтому на стыке не рвётся контур;
 *   3) wingSweep — пронос/удлинение крыла внизу маха и подтягивание наверху:
 *      кончик рисует восьмёрку, а не качели. Плюс лёгкое сокращение по вертикали
 *      (foreshortening): поднятое крыло смотрит чуть короче, будто отворачивается.
 * Обратное отображение (для каждого пикселя результата ищем источник) не
 * оставляет дыр, в отличие от прямого.
 */
function wingStroke(c: Canvas32, p: Pose, rig: RigProfile) {
  const lift = p.wingLift, sweep = p.wingSweep;
  if (lift === 0 && sweep === 0) return;
  const N = ART_N, cx = N / 2;
  const src = c.g.map(r => r.slice());
  const pivotY = rig.neckY * (N - 1);
  // Корень крыла (грудь): за ним ничего не двигаем — иначе на стыке рвётся.
  const rootPx = (0.075 + 0.05 * rig.bulk) * N;
  const span = N * 0.42;
  // Амплитуда поворота: до ~26° на кончике при полном взмахе.
  const maxAng = 0.46 * Math.min(1.4, Math.abs(lift));
  const liftSign = lift >= 0 ? 1 : -1;
  const sweepPx = sweep * N * 0.055;
  const px0 = (x: number) => cx + (x < cx ? -1 : 1) * rootPx;
  // Обратное отображение (для пикселя результата ищем источник) — оно не
  // оставляет дыр, в отличие от прямого. Но у летающих крыло нарисовано ВО ВСЮ
  // высоту холста: при взмахе вверх источник уезжает за верхнюю кромку, и
  // верхние строки крыла оставались пустыми (замер: терялось до 12% пикселей
  // крыла — оно выглядело обкусанным). Поэтому угол для таких пикселей
  // ПОДАВЛЯЕТСЯ до того, что влезает в кадр: кончик у кромки разворачивается
  // меньше, зато силуэт остаётся целым.
  const sample = (y: number, x: number, inv: number, w2: number): [number, number] => {
    const px = px0(x), py = pivotY;
    const rx = x - px, ry = y - py;
    const cos = Math.cos(inv), sin = Math.sin(inv);
    // Перспектива: поднятое крыло чуть короче по вертикали (смотрим снизу).
    // 0.30 вместо прежних 0.14 — сильнее поджимает кончик внутрь кадра.
    const sy = py + (rx * sin + ry * cos) * (1 - 0.30 * w2 * Math.abs(lift));
    const sx = px + rx * cos - ry * sin + (x < cx ? -1 : 1) * sweepPx * w2;
    return [Math.round(sx), Math.round(sy)];
  };
  const inside = (ix: number, iy: number) => ix >= 0 && ix < N && iy >= 0 && iy < N;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const v = src[y][x];
      if (v === 0) continue;
      const dx = x - cx;
      const side = dx < 0 ? -1 : 1;
      const ax = Math.abs(dx);
      if (ax <= rootPx) continue;                 // корпус и корень крыла — на месте
      // «Крыловость» пикселя: 0 у корня → 1 у кончика.
      const w = Math.min(1, (ax - rootPx) / Math.max(1, span - rootPx));
      const w2 = w * w;                           // гнётся кончик, не всё крыло
      let inv = side * maxAng * w2 * liftSign;    // обратный поворот (вокруг плеча)
      let s = sample(y, x, inv, w2);
      // Подбираем угол: пока источник за краем — поворачиваем слабее.
      for (let it = 0; it < 3 && !inside(s[0], s[1]); it++) {
        inv *= 0.55;
        s = sample(y, x, inv, w2);
      }
      if (!inside(s[0], s[1])) s = [Math.max(0, Math.min(N - 1, s[0])), Math.max(0, Math.min(N - 1, s[1]))];
      c.g[y][x] = src[s[1]][s[0]];
    }
  }
}

/** Непрерывные заливки строки: [x0, x1] включительно. */
type Run = [number, number];

function rowRuns(row: number[]): Run[] {
  const runs: Run[] = [];
  let x0 = -1;
  for (let x = 0; x <= row.length; x++) {
    const on = x < row.length && row[x] !== 0;
    if (on) {
      if (x0 < 0) x0 = x;
    } else if (x0 >= 0) {
      runs.push([x0, x - 1]);
      x0 = -1;
    }
  }
  return runs;
}

/**
 * Сливает заливки с дырой меньше `gap` пикселей: внутри одной лапы такие прорези
 * — это внутренний рисунок, а НЕ соседние лапы (зазор между лапами от 4 px).
 */
function mergeRuns(runs: Run[], gap: number): Run[] {
  const out: Run[] = [];
  for (const r of runs) {
    const last = out.length ? out[out.length - 1] : null;
    if (last && r[0] - last[1] <= gap) last[1] = r[1];
    else out.push([r[0], r[1]]);
  }
  return out;
}

/**
 * Обнаружение ЛАП: сплошные заливки на контрольной строке (70% ниже таза),
 * уже чем треть спрайта (широкая заливка — это корпус, а не лапа).
 * ЗАМЕР по факту (balance.cjs печатает эти числа): гуманоид 2, скелет 2, паук 8,
 * имп 3 (две лапы + хвост/оружие), волк 2, голем 2, гаргулья 0, жук 0.
 * Поэтому артикуляция включается там, где силуэт реально разделён на лапы, а у
 * монолитов (гаргулья, жук) её нет — их движение даёт присед корпуса: сдвиг
 * широкого блока силуэт не меняет, и «шевеление лап» у них не читалось бы.
 * Возвращает центры лап по возрастанию x.
 */
function findLimbs(c: Canvas32, rig: RigProfile): number[] {
  const N = ART_N;
  const hipPx = Math.round(rig.hipY * (N - 1));
  let ground = hipPx;
  for (let y = N - 1; y > hipPx; y--) {
    if (rowRuns(c.g[y]).length) { ground = y; break; }
  }
  if (ground <= hipPx + 2) return [];
  // ОДНА контрольная строка на 70% высоты лап — и это осознанный выбор.
  // Пробовали искать строку, где лапы разделены лучше всего (8 контрольных высот,
  // счёт принимается при повторе на соседней): волку это НЕ помогло (в нейтральном
  // силуэте его четыре лапы сходятся в две заливки на всех высотах — дальняя лапа
  // пары перекрыта ближней), а паук, наоборот, потерял три лапы (8 → 5). Поэтому
  // оставлена проверенная одна строка: она даёт пауку все восемь лап.
  const probe = Math.min(ground, hipPx + Math.round((ground - hipPx) * 0.7));
  const runs = mergeRuns(rowRuns(c.g[probe]), 2);
  if (runs.length < 2 || runs.length > 8) return [];
  // Лапа шире трети спрайта — это уже корпус, а не конечность.
  const cxs = runs
    .filter(r => r[1] - r[0] < N * 0.33)
    .map(r => Math.round((r[0] + r[1]) / 2));
  return cxs.length >= 2 ? cxs : [];
}

/**
 * АРТИКУЛЯЦИЯ ЛАП: каждая лапа двигается ОТДЕЛЬНО — колено сгибается, стопа
 * заносится вверх и вбок, опорная лапа жёстко стоит на земле.
 *
 * Это заменяет старый механизм, который сдвигал строки всего низа спрайта по
 * признаку «левая/правая половина»: при нём все лапы одной стороны ходили
 * синхронно (у паука — все восемь сразу), а нога не могла согнуться в колене —
 * она оставалась жёстким звеном. Отсюда и «ворочание на месте».
 *
 * Как устроено:
 *  1) Для каждой строки результата у лапы ЕЁ СОБСТВЕННАЯ заливка в исходной
 *     строке (сопоставление по порядку или близости центра), поэтому лапы не
 *     слипаются и не заезжают друг на друга;
 *  2) Вес «сгиба» растёт от нуля у таза к единице у стопы — нижний отдел
 *     проходит больший путь, чем бедро, и колено читается как сустав;
 *  3) Заносимая лапа поднимается на `liftAmp` (обратное отображение читает
 *     строки ниже → содержимое уходит вверх) и уходит вбок на `stride`;
 *  4) Опорная лапа не двигается ВООБЩЕ — её оставляем как есть, а вес на неё
 *     переносит корпус (warpPose: lift/crouch).
 * Сначала чистим старые заливки лап, потом переливаем сдвинутые — так обратная
 * карта не оставляет «призраков» поднятой ноги.
 */
function articulateLimbs(c: Canvas32, p: Pose, rig: RigProfile, limbs: number[]) {
  const N = ART_N, cx = N / 2;
  const k = limbs.length;
  if (k < 2) return;
  const hipPx = Math.round(rig.hipY * (N - 1));
  const src = c.g.map(r => r.slice());
  const swing = p.legSwing.length ? p.legSwing : [p.scissor, -p.scissor];
  const stride = N * 0.05;      // вынос лапы вбок на заносе
  const liftAmp = N * 0.05;     // отрыв стопы от земли
  let ground = hipPx;
  for (let y = N - 1; y > hipPx; y--) {
    if (rowRuns(src[y]).length) { ground = y; break; }
  }
  const legLen = Math.max(4, ground - hipPx);
  const runCache = new Map<number, Run[]>();
  const runsOf = (row: number): Run[] => {
    if (row < 0 || row >= N) return [];
    let r = runCache.get(row);
    if (!r) { r = mergeRuns(rowRuns(src[row]), 2); runCache.set(row, r); }
    return r;
  };
  /** Лапе — её заливка: сначала точное совпадение по числу (порядок сохранён), иначе ближайшая. */
  const assign = (runs: Run[]): Array<Run | null> => {
    if (runs.length === k) return runs.slice();
    const out: Array<Run | null> = new Array(k).fill(null);
    const used = new Array(runs.length).fill(false);
    for (let i = 0; i < k; i++) {
      let best = -1, bd = N;
      for (let j = 0; j < runs.length; j++) {
        if (used[j]) continue;
        const d = Math.abs((runs[j][0] + runs[j][1]) / 2 - limbs[i]);
        if (d < bd) { bd = d; best = j; }
      }
      if (best >= 0 && bd <= N * 0.18) { out[i] = runs[best]; used[best] = true; }
    }
    return out;
  };
  const clears: Array<[number, number, number]> = [];                    // [y, x0, x1]
  const writes: Array<[number, number, number, number, number]> = [];    // [y, x, sy, s0, s1]
  for (let y = hipPx + 1; y < N; y++) {
    const t = Math.min(1, (y - hipPx) / legLen);
    // Сгиб: 42% хода приходится на бедро, остальное — на голень (колено).
    const bend = t < 0.5 ? (t / 0.5) * 0.42 : 0.42 + ((t - 0.5) / 0.5) * 0.58;
    const destRuns = assign(runsOf(y));
    // Границы дорожек лап В ЭТОЙ строке (по исходным заливкам): запись в них
    // и не даёт соседним лапам залезть друг другу на контур.
    for (let i = 0; i < k; i++) {
      const sw = swing[i % swing.length];
      const liftF = Math.max(0, sw);
      if (liftF === 0) continue;                     // опорная лапа стоит на месте
      const d = destRuns[i];
      if (!d) continue;                              // в этой строке у лапы нет пикселей
      clears.push([y, d[0], d[1]]);
      const side = Math.sign(limbs[i] - cx) || 1;
      const dx = Math.round(side * liftF * stride * bend);
      const dy = Math.round(liftF * liftAmp * bend * bend);   // >0: читаем ниже → вверх
      const r = assign(runsOf(y + dy))[i];
      if (!r) continue;                              // строка вне лапы — стопа ушла
      const prev = i > 0 ? destRuns[i - 1] : null;
      const next = i < k - 1 ? destRuns[i + 1] : null;
      const lo = prev ? prev[1] + 1 : 0;
      const hi = next ? next[0] - 1 : N - 1;
      const x0 = Math.max(lo, Math.min(hi, r[0] + dx));
      const x1 = Math.max(lo, Math.min(hi, r[1] + dx));
      if (x1 >= x0) writes.push([y, x0, y + dy, r[0], r[1]]);
    }
  }
  for (const [y, x0, x1] of clears) for (let x = x0; x <= x1; x++) c.g[y][x] = 0;
  for (const [y, x, sy, s0, s1] of writes) {
    const n = s1 - s0;
    for (let j = 0; j <= n; j++) {
      const tx = x + j;
      if (tx < 0 || tx >= N) continue;
      c.g[y][tx] = src[sy][s0 + j];
    }
  }
}

/** Сдвиг всей фигуры по вертикали (для шага/дыхания). dy — в ПИКСЕЛЯХ спрайта. */
function shiftRows(c: Canvas32, dyPx: number) {
  const dy = Math.round(dyPx);
  if (dy === 0) return;
  const src = c.g.map(r => r.slice());
  for (let y = 0; y < ART_N; y++) for (let x = 0; x < ART_N; x++) c.g[y][x] = 0;
  for (let y = 0; y < ART_N; y++) {
    const ty = y + dy;
    if (ty < 0 || ty >= ART_N) continue;
    for (let x = 0; x < ART_N; x++) c.g[ty][x] = src[y][x];
  }
}

/** Сдвиг всей фигуры по горизонтали (выпад вперёд/отход назад). dx — в ПИКСЕЛЯХ спрайта. */
function shiftCols(c: Canvas32, dxPx: number) {
  const dx = Math.round(dxPx);
  if (dx === 0) return;
  const src = c.g.map(r => r.slice());
  for (let y = 0; y < ART_N; y++) for (let x = 0; x < ART_N; x++) c.g[y][x] = 0;
  for (let y = 0; y < ART_N; y++) {
    const tx = y; // строка та же, сдвигаем только колонки
    for (let x = 0; x < ART_N; x++) {
      const txx = x + dx;
      if (txx < 0 || txx >= ART_N) continue;
      c.g[tx][txx] = src[y][x];
    }
  }
}

/**
 * Диагностика штампа: сколько пикселей оружия НЕ поместилось в кадр
 * (выпало за край холста при повороте/сдвиге). 0 = оружие целиком в спрайте,
 * >0 = кончик или рукоять обрезаны в этом кадре анимации.
 * Нужно weaponaudit.cjs (секция 2): «тихую» обрезку нельзя увидеть по сетке —
 * putPx просто прописывает координаты за пределами холста.
 */
let stampDropped = 0;
export function lastStampDrops(): number { return stampDropped; }
/** По каким сторонам кадра выпали пиксели: [лево, право, верх, низ]. */
let stampSides = [0, 0, 0, 0];
export function lastStampSides(): number[] { return stampSides; }
/**
 * Границы отштампованного оружия в ПИКСЕЛЯХ спрайта (включая те, что выпали
 * за край) — чтобы тюнить кадры замаха: y0 < 0 значит «кончик выше холста».
 * hx/hy — координаты ИСХОДНОГО пикселя арта, давшего минимальный y (из него
 * считается, какой позе нужен запас по вертикали).
 */
let stampBounds = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity, hx: -1, hy: -1 };
export function lastStampBounds() { return stampBounds; }

/**
 * Диагностика анатомии: сколько ЛАП нашла пофазная артикуляция в последнем
 * собранном кадре (0 = лап не нашли, движение делает только корпус).
 * Гуманоид даёт 2, волк 4, паук 8, голем 1 → у монолита артикуляции нет.
 * Нужно balance.cjs: без замера не видно, сработала ли пофазная артикуляция
 * или кадр «ожил» только за счёт приседа корпуса.
 */
let limbCount = 0;
export function lastLimbCount(): number { return limbCount; }

/**
 * Переносит оружие из его сетки в фигуру с учётом кадра анимации.
 * Смещения заданы в АВТОРСКИХ единицах и включают ПОВОРОТ вокруг кисти,
 * поэтому кадр удара читается как настоящий замах, а не сдвиг картинки.
 */
function stampWeapon(c: Canvas32, w: Canvas32, variant: ArtVariant) {
  stampDropped = 0;
  stampSides = [0, 0, 0, 0];
  stampBounds = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity, hx: -1, hy: -1 };
  // Точка вращения — кисть монстра (правая рука).
  const pivotX = 27 * SS, pivotY = 22 * SS;
  // Полная кривая замаха: назад → резко вперёд → проводка → возврат.
  let rot = 0;
  let shiftX = 0;
  let shiftY = 0;
  switch (variant) {
    case 'attackA': rot = -0.15; shiftX = -2.4 * SS; shiftY = 3.0 * SS; break;  // замах: назад (вверх-вперёд не катит: у длинных палок верх уже у края холста)
    case 'attackB': rot = 0.08; shiftX = 1.4 * SS; shiftY = -0.2 * SS; break;  // начало удара (sy срезан с -0.6: кончик касался верхней рамки)
    case 'attackC': rot = 0.52; shiftX = 4.2 * SS; shiftY = 1.6 * SS; break;   // контакт: максимальный выброс
    case 'attackD': rot = 0.30; shiftX = 2.4 * SS; shiftY = 1.1 * SS; break;   // проводка
    case 'reach': rot = -0.10; shiftX = 5.6 * SS; shiftY = 1.6 * SS; break;   // предельная тяга вперёд (вертикаль ограничен кадром сверху)
    case 'walkA': rot = 0.045; break;
    case 'walkB': rot = 0.015; break;
    case 'walkC': rot = -0.015; break;
    case 'walkD': rot = -0.045; break;
    case 'walkE': rot = -0.02; break;
    case 'walkF': rot = 0.02; break;
    case 'walkG': rot = 0.04; break;
    case 'walkH': rot = 0.025; break;
    case 'breath': rot = 0.02; shiftY = -0.3 * SS; break;
    default: break;
  }
  // Шаг: страховка верхней рамки. У длинных палок (алебарда, лук) арт достаёт
  // до y≈1u, а отрицательный поворот поднимает их правый верх над кадром —
  // ротации шага урезаны вполовину, плюс этот общий сдвиг держит запас ~1u.
  if (variant.startsWith('walk')) shiftY = 0.6 * SS;
  const cos = Math.cos(rot), sin = Math.sin(rot);

  // Источник читаем В ПОЛНОМ формате (WEAPON_N = 48 единиц), а не ART_N (32):
  // раньше цикл шёл до ART_N, и всё, что правее 32-й единицы (кончики копий,
  // боевых топоров, луков), молча отбрасывалось — оружие в теле обрубалось
  // ровно по границе 256-го пикселя. Запись в c безопасна: там холст STAMP_N,
  // а вылет за пределы проверяет gridOverflows → расширенный холст.
  const wn = w.g.length;
  for (let y = 0; y < wn; y++) {
    for (let x = 0; x < wn; x++) {
      const v = w.g[y][x];
      if (v === 0) continue;
      // Поворот вокруг кисти
      const rx = pivotX + (x - pivotX) * cos - (y - pivotY) * sin;
      const ry = pivotY + (x - pivotX) * sin + (y - pivotY) * cos;
      // Явная проверка границ вместо «тихого» пропуска в putPx: пиксели за
      // краем холста — это РЕАЛЬНАЯ обрезка оружия, её считаем для аудита.
      const px = Math.round(rx + shiftX), py = Math.round(ry + shiftY);
      if (px < stampBounds.x0) stampBounds.x0 = px;
      if (px > stampBounds.x1) stampBounds.x1 = px;
      if (py > stampBounds.y1) stampBounds.y1 = py;
      if (py < stampBounds.y0) {
        stampBounds.y0 = py;
        stampBounds.hx = x;
        stampBounds.hy = y;
      }
      if (px < 0 || px >= c.n || py < 0 || py >= c.n) {
        stampDropped++;
        if (px < 0) stampSides[0]++; else if (px >= c.n) stampSides[1]++;
        if (py < 0) stampSides[2]++; else if (py >= c.n) stampSides[3]++;
        continue;
      }
      c.putPx(px, py, v);
    }
  }
}

/**
 * Варианты кадра анимации.
 * Походка: walkA/walkB — два шага. Плюс 4 фазы удара для плавности:
 * windup (замах) → strike (удар) → follow (проводка) → recover (возврат).
 * breath — кадр покоя (для «дыхания»).
 */
export type ArtVariant =
  | 'idle' | 'breath'
  | 'walkA' | 'walkB' | 'walkC' | 'walkD' | 'walkE' | 'walkF' | 'walkG' | 'walkH'
  | 'attackA' | 'attackB' | 'attackC' | 'attackD'
  | 'reach';

/** Все варианты по порядку (для прогрева кэша). */
export const ART_VARIANTS: ArtVariant[] = [
  'idle', 'breath',
  'walkA', 'walkB', 'walkC', 'walkD', 'walkE', 'walkF', 'walkG', 'walkH',
  'attackA', 'attackB', 'attackC', 'attackD', 'reach',
];

export interface MonsterArtMeta {
  nameRu?: string;
  nameEn?: string;
  element?: string;
  /** Мутации силуэта из EnemyDef.traits — пекутся в спрайт (рога, шипы, хвост…). */
  traits?: MonsterTrait[];
  /**
   * Семейство походки из EnemyDef.gait. Обязателен: без него все формы
   * с одинаковым набором кадров выглядели бы одинаково — слизь «шла» ногами,
   * а призрак «топал». Теперь поза кадра строится под конкретную походку.
   */
  gait?: GaitKind;
  /**
   * Тип сигнатурной атаки из signatureAttacks.ts. По нему подбирается анатомия
   * удара: слизь сплющивается, волк вытягивается в прыжке, голем рушится сверху.
   */
  attack?: string;
  /**
   * Явный набор оружия из EnemyDef.weapon: перебивает выбор по имени и форме.
   * Нужен боссам — у каждого своё оружие, и оно же потом машет в бою
   * (см. buildWeaponSprite), поэтому спрайт и удар всегда совпадают.
   */
  weapon?: WeaponKit;
  /** Вариант регалий босса (0..5) — разный силуэт головы/плеч/груди. */
  regalia?: number;
}

// ============================================================
// СКЕЛЕТНАЯ ПОЗА: настоящая анимация конечностей
// Раньше «походка» была одним сдвигом картинки целиком (shiftRows),
// а посчитанные в gaitPose().legs/headLag НИГДЕ не использовались —
// поэтому ноги не двигались и монстр скользил. Теперь спрайт гнётся
// по «скелету»: таз → колени, плечи → голова, лопатки → крылья.
// ============================================================

/**
 * Анатомия фигуры: где проходят линии суставов (0 = верх, 1 = низ).
 * ЕДИНЫЙ источник правды — anatomyFor() в dungeonIdentity: по этой же таблице
 * движок решает, кто прыгает, а кто летит (см. jumpArc/flapStroke). Раньше
 * таблица была только здесь, и движок про ноги/крылья монстра не знал.
 */
type RigProfile = Anatomy;

/** Профиль скелета по форме: у кого ноги, у кого крылья, где таз. */
function rigFor(shape: EnemyShape): RigProfile {
  return anatomyFor(shape);
}

/** Параметры изгиба для одного кадра. */
interface Pose {
  crouch: number;     // сжатие ног (приседание/приземление), 1 = нейтрально
  scissor: number;    // размах ног: левая вперёд, правая назад (-1..1)
  spread: number;     // разведение ног в стороны
  /**
   * Поджатие стопы (0..1): обе ноги тянутся вверх. Нужен для прыжка, где ноги
   * поджимаются в высшей точке, и для высокого топота. Шаг же даёт подъём
   * заносимой ноги автоматически (см. warpPose), поэтому здесь обычно 0.
   */
  tuck: number;
  lean: number;       // наклон корпуса вперёд
  headLag: number;    // инерция головы (отстаёт от корпуса)
  lift: number;       // подъём всего корпуса
  wave: number;       // амплитуда волны по корпусу (бесформенные/слизни)
  waveTurns: number;  // число волн вдоль тела
  /**
   * Фаза бегущей волны (радианы). БЕЗ неё волна в каждом кадре одинаковая,
   * и бесформенные твари (слизь, тени, духи, глаза) вообще не шевелятся —
   * картинка лишь слегка «дышит». С ней гребок реально бежит по телу вперёд.
   */
  wavePhase: number;
  wingLift: number;   // взмах крыла (+ вверх, - вниз)
  /**
   * Занос крыла вперёд/назад вдоль взмаха (+1 раскрыто вперёд, -1 отведено).
   * Без него крыло ходит только вверх-вниз, как на шарнире, и полёт выглядит
   * «мельницей». С ним кончик крыла описывает восьмёрку — гребок настоящей птицы.
   */
  wingSweep: number;
  /**
   * Покачивание КАЖДОЙ лапы по отдельности (-1 поднята-отведена, +1 занесена).
   * Индекс по кругу: 2 значения = противофаза двух ног, 8 значений = волна
   * восьминогого паука. Пустой массив = работать по scissor (как раньше).
   * Именно этого не хватало: раньше на весь спрайт был ОДИН параметр scissor,
   * поэтому у паука и жука все лапы ходили синхронно, как одна нога.
   */
  legSwing: number[];
  /**
   * Вертикальный масштаб бесформенного тела (1 = нейтрально). Даёт squash &
   * stretch с опорой на землю: в толчке тело вытягивается, при посадке
   * расплющивается вширь. Только для существ БЕЗ ног — у двуногих то же самое
   * делает crouch через сжатие ног.
   */
  squashY: number;
  stretch: number;    // вытяжка корпуса по горизонтали (speed-line при рывке)
}

const P_NEUTRAL: Pose = { crouch: 1, scissor: 0, spread: 0, lean: 0, headLag: 0, lift: 0, wave: 0, waveTurns: 1, wavePhase: 0, tuck: 0, wingLift: 0, wingSweep: 0, legSwing: [], squashY: 1, stretch: 1 };


const WALK_ORDER: ArtVariant[] = ['walkA', 'walkB', 'walkC', 'walkD', 'walkE', 'walkF', 'walkG', 'walkH'];

/** Фаза шага для кадра походки: 0 = левая нога впереди, 0.5 = правая. */
function walkPhase(v: ArtVariant): number | null {
  const i = WALK_ORDER.indexOf(v);
  return i < 0 ? null : i / WALK_ORDER.length;
}

/**
 * Поза по фазе цикла. Один полный цикл = ДВА шага, поэтому и маятник ног,
 * и подъём корпуса работают на удвоенной частоте — как в настоящей ходьбе.
 *
 * ВАЖНО: спрайт зеркально-симметричен, поэтому без знакопеременной раскачки
 * кадры ph и ph+0.5 (левая нога впереди / правая нога впереди) дают ОДИНАКОВУЮ
 * картинку — из 8 кадров живыми были только 4. lean теперь со знаком: корпус
 * переносится в сторону заносимой ноги, и каждый кадр становится уникальным.
 */
function walkPose(ph: number): Pose {
  const TAU = Math.PI * 2;
  const sc = Math.sin(TAU * ph);           // +1 = левая нога впереди
  const dbl = Math.abs(Math.cos(TAU * ph)); // максимум в двойной опоре (просадка)
  // Вторая гармоника. Без неё поза зеркальна относительно фазы 0.75: кадры
  // walkF (0.625) и walkH (0.875) выходили ОДНИМ И ТЕМ ЖЕ рисунком (0 пикс.
  // различий) — цикл терял два кадра из восьми.
  const sc2 = Math.sin(2 * TAU * ph);
  return {
    ...P_NEUTRAL,
    // Присед смягчён 0.17 → 0.08. Раньше стопы сжимались на 17%, чего ровно
    // хватало, чтобы схлопнуть зазор между ногами: они снова сливались в лопасть
    // и шаг не читался. Просадка корпуса остаётся (её даёт lift ниже), а вот
    // вертикальное сжатие голеней убрано почти совсем.
    crouch: 1 - dbl * 0.08,
    scissor: sc,
    spread: 0.10 + Math.abs(sc) * 0.07,
    lean: 0.05 + sc * 0.075 + sc2 * 0.035,
    headLag: -sc * 0.06,
    lift: -dbl * 0.05 + sc2 * 0.014,
    // Лапы в противофазе: опорная жёстко стоит на земле, заносимая сгибается и
    // отрывается (см. articulateLimbs — он двигает КАЖДУЮ лапу отдельно, с
    // коленом, а не сдвигает весь низ спрайта, как было раньше).
    legSwing: [sc, -sc],
  };
}

/** Позы атаки: замах (оттяжка) → разгон → контакт с перелётом → проводка. */
const ATTACK_POSES: Record<string, Pose> = {
  attackA: { ...P_NEUTRAL, crouch: 0.93, lean: -0.11, scissor: -0.35, headLag: 0.05, spread: 0.17, lift: 0.02 },
  attackB: { ...P_NEUTRAL, crouch: 0.85, lean: 0.15, scissor: 0.45, headLag: -0.05, spread: 0.20, lift: 0.06, wingLift: -1 },
  attackC: { ...P_NEUTRAL, crouch: 0.79, lean: 0.27, scissor: 0.72, headLag: -0.09, spread: 0.27, lift: -0.02, wingLift: 1, stretch: 1.07 },
  attackD: { ...P_NEUTRAL, crouch: 0.91, lean: 0.16, scissor: 0.40, headLag: 0.04, spread: 0.18, lift: 0.01, stretch: 0.97 },
  reach: { ...P_NEUTRAL, crouch: 0.96, lean: 0.06, scissor: 0.10, headLag: 0.02, spread: 0.10, lift: 0.03, stretch: 1.03 },
};

/**
 * Позы под конкретную походку. Раньше на кадр приходился только walkPose() с
 * одинаковыми «ножницами», поэтому слизь перетекала ногами, а летун топал.
 * Теперь у каждой походки своя анатомия движения:
 *   walk  — обычный шаг, ноги вразнобой, лёгкое покачивание корпуса
 *   stomp — тяжёлый топот: глубокая просадка, широкий шаг, сильный наклон
 *   slink — крадучись: корпус низко и вперёд, шаг короткий, голова вперёд
 *   crawl — ползком боком: ноги широко расставлены, корпус почти не поднимается
 *   hop   — прыжки: обе ноги вместе, сильный отскок, фаза полёта
 *   slither— перетекание: волна по телу вперёд-назад, «ног» нет
 *   float — парение: корпус чуть колышется, взмах крыльев/плавучесть
 *   glide — планирование: корпус вытянут, крылья на размахе, малый крен
 */
/**
 * Анатомия удара по ТИПУ атаки. Общая ATTACK_POSES была одинаковой для всех:
 * и слизь, и голем, и паук «бегали ногами вперёд». Теперь удар выглядит
 * так, как бьёт именно это существо:
 *   slimeSlam  — сплющивается и растекается (squash, короткие ноги)
 *   pounce     — вытягивается вперёд в прыжке (ноги назад, корпус вперёд)
 *   legStab    — переносит вес на передние лапы, корпус коротко «пружинит»
 *   quakeSlam  — замах вверх (crouch + подъём), обрушение с растяжкой вниз
 *   wingBuffet — расправляет крылья и подаётся назад
 *   gazeBeam   — почти не двигается, сжимается (концентрация)
 *   weaponSweep— выпад с оружием, корпус разворачивается
 */
const ATTACK_BY_KIND: Record<string, Partial<Pose>> = {
  slimeSlam:   { crouch: 0.55, spread: 0.30, lean: 0.02, scissor: 0, wave: 0.22, waveTurns: 2.0, lift: -0.06 },
  pounce:      { crouch: 0.72, scissor: -0.85, spread: 0.30, lean: 0.34, headLag: -0.16, lift: 0.08, stretch: 1.12 },
  legStab:     { crouch: 0.82, scissor: 0.55, spread: 0.24, lean: 0.12, headLag: -0.06 },
  quakeSlam:   { crouch: 0.90, scissor: 0.30, spread: 0.26, lean: 0.22, headLag: 0.06, lift: 0.05, stretch: 1.08 },
  wingBuffet:  { crouch: 0.95, scissor: 0, spread: 0.30, lean: -0.16, headLag: 0.10, wingLift: 1.25, stretch: 1.06 },
  dragonBreath:{ crouch: 0.92, scissor: 0, spread: 0.24, lean: 0.10, headLag: 0.04, wingLift: 0.9, stretch: 1.10 },
  beetleRam:   { crouch: 0.70, scissor: 0.30, spread: 0.20, lean: 0.30, headLag: -0.12, lift: 0.04, stretch: 1.10 },
  shadowLash:  { crouch: 0.95, scissor: 0, spread: 0.28, lean: 0.26, headLag: -0.10, wave: 0.20, waveTurns: 1.6, stretch: 1.12 },
  spiritDrain: { crouch: 0.92, scissor: 0, spread: 0.22, lean: -0.08, headLag: 0.06, wave: 0.16, waveTurns: 1.3 },
  gazeBeam:    { crouch: 0.82, scissor: 0, spread: 0.14, lean: 0.0, headLag: 0.0, wave: 0.12, waveTurns: 1, lift: 0.03 },
  shardBurst:  { crouch: 0.86, scissor: 0, spread: 0.20, lean: 0.06, wave: 0.18, waveTurns: 1.6 },
  webSpit:     { crouch: 0.84, scissor: 0.20, spread: 0.18, lean: -0.14, headLag: 0.08, lift: 0.04 },
  spitBolt:    { crouch: 0.84, scissor: 0.20, spread: 0.18, lean: -0.14, headLag: 0.08, lift: 0.04 },
  darkBolt:    { crouch: 0.86, scissor: 0, spread: 0.20, lean: -0.10, headLag: 0.06, wave: 0.14 },
  stormBolt:   { crouch: 0.86, scissor: 0, spread: 0.22, lean: -0.12, headLag: 0.08, wingLift: 0.7 },
  weaponSweep: { crouch: 0.88, scissor: 0.60, spread: 0.22, lean: 0.18, headLag: -0.08, stretch: 1.06 },
};

/** Смешивает базовую позу кадра с анатомией конкретной атаки. */
function attackPoseFor(v: ArtVariant, rig: RigProfile, kind: string | undefined): Pose {
  const base = ATTACK_POSES[v];
  const over = (kind && ATTACK_BY_KIND[kind]) || null;
  let p: Pose = over ? { ...base, ...over } : base;
  if (!rig.legs) {
    // Бесформенные атакуют всем телом: «ног» нет, вместо них — волна и взмах.
    p = { ...p, scissor: 0, spread: Math.min(p.spread, 0.26), wave: Math.max(p.wave, 0.10), waveTurns: 1.3 };
  }
  return p;
}

function poseFor(v: ArtVariant, rig: RigProfile, gait: GaitKind, attack?: string): Pose {
  const ph = walkPhase(v);
  if (ph !== null) {
    const TAU = Math.PI * 2;
    const sinT = Math.sin(TAU * ph);
    const cosT = Math.cos(TAU * ph);
    // Вторая гармоника цикла = покачивание корпуса на КАЖДЫЙ шаг. Без неё позы,
    // built только на sinT и |cosT|, совпадают для фаз ph и 1.5-ph (например
    // walkF 0.625 и walkH 0.875 дают ОДИНАКОВЫЙ рисунок — часть цикла умирала).
    const sin2 = Math.sin(2 * TAU * ph);
    const cos2 = Math.cos(2 * TAU * ph);
    // МАХ КРЫЛА — ИЗ ОБЩЕЙ МАТЕМАТИКИ (flapStroke), а не своим синусом. Раньше
    // крыло поднималось и проносилось ОДНОВРЕМЕННО (lift и sweep были оба по
    // sinT), то есть крыло ходило как качели по прямой. В flapStroke пронос
    // отстаёт от угла на четверть цикла, поэтому кончик пишет восьмёрку, а
    // корпус подбрасывает под рабочим махом вниз; движок читает ту же кривую,
    // значит крен тела и мах крыла всегда в одной фазе.
    const f = flapStroke(ph);

    // === ФАЗА КАЖДОЙ ЛАПЫ ===
    // До этого на весь спрайт был ОДИН параметр scissor, поэтому у паука, жука и
    // многоножки все лапы ходили одновременно — как одна нога. Отсюда и главная
    // претензия к движению: «ворочание на месте» вместо перебирания лапами.
    // Теперь фаза выдаётся НА ЛАПУ (индекс по кругу):
    //   pairLegs  — двуногие: строгая противофаза (левая/правая);
    //   pairLegs   — двуногие: соседние лапы в противофазе (чередование шага);
    //   multiLegs  — многоногие: соседние лапы в противофазе + задержка по ряду,
    //                то есть классический «трипод с волной», как ходит настоящий паук;
    //   tuckLegs   — висящие в воздухе: лапы чуть покачиваются вразнобой.
    // (Прыжок задаётся не sin, а arc.airborne прямо в case 'hop' — фаза должна
    //  совпадать с jumpArc, иначе лапы поджимаются не в полёте, а на замахе.)
    const pairLegs = [sinT, -sinT];
    const tuckLegs = [sinT * 0.28, -sinT * 0.28];
    const multiLegs: number[] = [];
    for (let i = 0; i < 8; i++) multiLegs.push(Math.sin(TAU * (ph + (i % 2) * 0.5 + i * 0.045)));

    // Летящие/бесформенные: ног нет, поэтому движение даёт бегущая волна
    // (wavePhase), парение (lift) и взмах крыла (wingLift). ВАЖНО: раньше здесь
    // была одна общая поза для всех походок — слизь, призрак и глаз двигались
    // одинаково. Теперь у каждой походки свой рисунок волны.
    if (!rig.legs) {
      const wph = -TAU * ph; // фаза волны бежит по телу вперёд
      // ПРЫЖОК БЕСФОРМЕННОГО. Ног нет — значит толчок идёт всем телом: корпус
      // сжимается на замахе, вытягивается в толчке и расплющивается в посадке
      // (jumpArc). Парящие (float/glide/slink) и летающие исключены — у них
      // единственная опора это воздух, они не отрываются от земли.
      const arc = !rig.wings && gait !== 'float' && gait !== 'glide' && gait !== 'slink'
        ? jumpArc(ph) : null;
      // Множитель 0.85: держим суммарную деформацию в пределах ~15% — движок
      // добавит к ней подъём тела и реакцию тени, а не вторую дозу сплющивания.
      const squashY = arc ? 1 + (arc.squash - 1) * 0.85 : 1;
      const arcLift = arc ? -arc.airborne * 0.045 : 0;
      switch (gait) {
        case 'slither':
          // Перетекание: длинная бегущая волна, тело то вытягивается, то собирается.
          return { ...P_NEUTRAL, wave: 0.26, waveTurns: 1.7, wavePhase: wph, stretch: 1 + cosT * 0.05, lift: arcLift - 0.02 + Math.abs(cosT) * 0.02, squashY, legSwing: tuckLegs };
        case 'crawl':
          // Ползком боком: одна крутая «горбина» проходит от хвоста к голове.
          return { ...P_NEUTRAL, wave: 0.34, waveTurns: 1.0, wavePhase: wph, lean: 0.06, stretch: 1 - sinT * 0.05, lift: arcLift - Math.abs(sinT) * 0.03, squashY, legSwing: tuckLegs };
        case 'hop':
          // Прыжок бесформенного: присел-распластался → вытолкнулся вверх и вытянулся.
          return { ...P_NEUTRAL, wave: 0.12, waveTurns: 1.2, wavePhase: wph, lift: arcLift - cosT * 0.05, stretch: 1 + cosT * 0.07, squashY, legSwing: tuckLegs };
        case 'float':
          // Парение: корпус мягко колышется вверх-вниз, крылья/плавники бьют неторопливо.
          return { ...P_NEUTRAL, wave: 0.11, waveTurns: 1.2, wavePhase: wph * 0.6, wingLift: f.lift * 0.55, wingSweep: f.sweep * 0.75, lift: 0.05 + cosT * 0.05, legSwing: tuckLegs };
        case 'glide':
          // ЛЁТУШКА: полный мах крыла за цикл — подъём, гребок вниз с проносом
          // вперёд, отведение вверх. Раньше амплитуда была 0.22 (крылья едва
          // шевелились), и полёт читался как перенос картинки по экрану.
          return { ...P_NEUTRAL, wave: 0.06, waveTurns: 1, wavePhase: wph * 0.4, wingLift: f.lift * 0.95, wingSweep: f.sweep * 1.15, lift: arcLift + 0.012, stretch: 1.05, lean: 0.04, legSwing: tuckLegs };
        case 'slink':
          // Крадущаяся тень: волна медленная, низкая, с постоянным наклоном вперёд.
          return { ...P_NEUTRAL, wave: 0.20, waveTurns: 1.3, wavePhase: wph * 0.7, lean: 0.10, lift: arcLift - 0.02, legSwing: tuckLegs };
        default:
          // Мелкое частое трепетание (летучая мышь): крылья бьют вдвое чаще корпуса.
          // Удвоенный аргумент flapStroke — два маха за цикл походки, как было.
          return { ...P_NEUTRAL, wave: 0.14, waveTurns: 1.5, wavePhase: wph * 1.4, wingLift: flapStroke(ph * 2).lift * 0.95, wingSweep: flapStroke(ph * 2).sweep * 1.1, lift: arcLift - 0.035 + Math.abs(cosT) * 0.035, legSwing: tuckLegs };
      }
    }
    switch (gait) {
      case 'stomp':
        // Тяжёлая поступь: у голема низ — сплошной блок от края до края, поэтому
        // горизонтальное разъезжание ног у него не видно ВОВСЕ (сдвиг широкого
        // прямоугольника не меняет силуэт). Единственный читаемый признак —
        // ВЕРТИКАЛЬНЫЙ ход: глубокое проседание в опоре и подъём в переносе.
        return { ...P_NEUTRAL, crouch: 1 - Math.abs(cosT) * 0.22, scissor: sinT, spread: 0.20 + Math.abs(sinT) * 0.10, lean: 0.10 + Math.abs(sinT) * 0.06 + sin2 * 0.05, headLag: -sinT * 0.14, lift: -Math.abs(cosT) * 0.05 + 0.03 + cos2 * 0.035, tuck: Math.abs(sinT) * 0.35, legSwing: pairLegs };
      case 'slink':
        // Крадётся: корпус низкий и длинный, шаг КОРОТКИЙ по горизонтали,
        // но зато высокий — стопа отрывается от земли (scissor 0.5 → 0.85,
        // иначе шаг скелета не читался вовсе: амплитуда падала до 82 px).
        return { ...P_NEUTRAL, crouch: 0.90, scissor: sinT * 0.85, spread: 0.16, lean: 0.18 + sin2 * 0.05, headLag: -0.10, lift: -0.02 - Math.abs(cosT) * 0.02 + cos2 * 0.022, wave: 0.05, waveTurns: 1.2, wavePhase: -TAU * ph, legSwing: pairLegs };
      case 'crawl':
        // Ползком боком: ноги расставлены широко и работают вразнобой, корпус низкий.
        // multiLegs = 8 фаз «трипода с волной»: соседние лапы в противофазе,
        // по ряду лап бежит задержка. Раньше здесь был один scissor, и ВСЕ лапы
        // двигались вместе — это и читалось как «переваливание на месте».
        return { ...P_NEUTRAL, crouch: 0.74, scissor: sinT * 0.75, spread: 0.34, lean: 0.06 + sin2 * 0.07, headLag: -sinT * 0.05, lift: -0.03 - Math.abs(sinT) * 0.02 + cos2 * 0.028, legSwing: multiLegs };
      case 'hop': {
        // ПРЫЖОК ДВУНОГОГО. Фазы берутся из jumpArc, а не из чистого cos:
        // раньше тело симметрично проваливалось НИЖЕ земли и поднималось, то
        // есть «прыжок» был качанием. Теперь присед → толчок (вытянулся,
        // ноги поджаты) → парабола полёта → приземление с расплющиванием.
        const arc = jumpArc(ph);
        return { ...P_NEUTRAL, crouch: 1 - (arc.squash - 1) * 0.9, scissor: sinT * 0.55, spread: 0.14 + (1 + cosT) * 0.09, lean: 0.06, headLag: -sinT * 0.06, lift: -arc.airborne * 0.09 - (arc.squash - 1) * 0.3, tuck: arc.airborne * 0.95, stretch: 1 + (arc.squash - 1) * 0.55, legSwing: [arc.airborne, arc.airborne] };
      }
      case 'slither':
        // Перетекание у твари С ногами (ящер): шаг маленький, зато по телу идёт волна.
        return { ...P_NEUTRAL, scissor: sinT * 0.3, spread: 0.08, crouch: 0.97, wave: 0.16, waveTurns: 1.6, wavePhase: -TAU * ph, lean: 0.05 + sin2 * 0.05, lift: -Math.abs(cosT) * 0.04 + cos2 * 0.025, legSwing: pairLegs };
      case 'glide':
        // Планирование на ногах (гаргулья): крылья держат размах, корпус почти не
        // качается, НО вертикаль обязана быть на второй гармонике — иначе пару
        // кадров цикла не отличить от соседней (проверено по пикселям).
        // Гаргулья ПЛАНИРУЕТ, а не парит: она каменная и ходит по земле, поэтому
        // главный признак — ВЕРТИКАЛЬНЫЙ ход: корпус то опускается в опору, то
        // отрывается. Ножницы подняты 0.2 → 0.45 (при 0.2 шаг не читался вовсе,
        // амплитуда падала до 20 px), но всё равно меньше, чем у ходящих: тяжёлая
        // каменная поступь должна быть вдавленной, а не семенить ногами.
        // Крыло бьёт по ОБЩЕЙ flapStroke (как в движке): у дракона мах крыла и
        // подъём корпуса обязаны идти в одной фазе, а раньше здесь стоял свой sinT.
        return { ...P_NEUTRAL, scissor: sinT * 0.45, spread: 0.14, crouch: 1 - Math.abs(cosT) * 0.14, wave: 0.07, waveTurns: 1, wavePhase: -TAU * ph * 0.4, wingLift: f.lift * 0.75, wingSweep: f.sweep * 0.9, lift: 0.012 + cos2 * 0.075, stretch: 1.05, lean: 0.05 + sin2 * 0.07, legSwing: tuckLegs };
      case 'float':
        return { ...P_NEUTRAL, scissor: sinT * 0.15, spread: 0.12, crouch: 0.99, wave: 0.09, waveTurns: 1.2, wavePhase: -TAU * ph * 0.6, wingLift: f.lift * 0.5, wingSweep: f.sweep * 0.7, lift: 0.05 + cosT * 0.05, legSwing: tuckLegs };
      default:
        return walkPose(ph);
    }
  }
  if (ATTACK_POSES[v]) return attackPoseFor(v, rig, attack);
  if (v === 'breath') return { ...P_NEUTRAL, crouch: 0.97, lift: 0.022, headLag: 0.014, wave: rig.legs ? 0 : 0.05, wingLift: 0.28 };
  return { ...P_NEUTRAL, crouch: 0.985, lift: 0.009, headLag: 0.007, wave: rig.legs ? 0 : 0.04, wingLift: 0.14 };
}

/**
 * Изгиб спрайта по скелету. Сделано ОБРАТНЫМ отображением: для каждого пикселя
 * результата вычисляем, откуда он пришёл (по вертикали — сжатие ног вокруг таза,
 * по горизонтали — размах ног/наклон/инерция головы). Прямое отображение рвало
 * бы конечности на куски, обратное не оставляет дыр.
 */
function warpPose(c: Canvas32, p: Pose, rig: RigProfile, articulated: boolean = false) {
  const N = ART_N, cx = N / 2;
  const src = c.g.map(r => r.slice());
  const legLen = 1 - rig.hipY;
  // АМПЛИТУДА. Раньше (0.05+bulk*0.05)*N ≈ 10 px при спрайте 128 px — почти не видно.
  // Увеличено, но НЕ больше: фигура рисуется в левой половине (x<=N/2) и затем
  // зеркалится, поэтому сдвиг влево больше ~N/4 срезает силуэт по краю холста.
  const amp = (0.07 + rig.bulk * 0.05) * N;
  // Шаг: ноги поочерёдно отрываются от земли (одна вперёд-вверх, вторая назад-вниз).
  const stepAmp = N * 0.075;
  // Бесформенные (слизь, призрак, кристалл, глаз) не шагают — по корпусу идёт волна.
  // У них амплитуда отдельная и заметно больше, иначе «ходьба» не читается вовсе.
  const waveAmp = amp * (rig.legs ? 1.0 : 2.6);
  const headBand = rig.neckY;
  // ЧИСТИМ ХОЛСТ ДО ПРОХОДА. warpPose пишет в c.g поверх исходной фигуры, ничего
  // не обнуляя. Из-за этого старые пиксели НИКОГДА не исчезали: поднятая нога
  // оставляла свою же копию внизу, и зазор между ногами заполнялся обратно.
  // Итог — обе ноги визуально стояли на земле в каждом кадре (проверено замером:
  // низ обеих ног y=127 на всех восьми кадрах), а вместо шага выходило
  // «ворочание»: корпус дёргался, ноги стояли намертво. Теперь пишем в чистый буфер.
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) c.g[y][x] = 0;
  for (let y = 0; y < N; y++) {
    const ny = y / (N - 1);
    // Обратная карта по вертикали: сжатие ног вокруг таза + подъём корпуса.
    // БЫЛО: sy = hipY + (ny-hipY)/legLen * crouch. При crouch=1 ступня уезжала на
    // sy=1.62 при норме 0..1, то есть за пределы холста — ноги просто обрезались
    // снизу, и шаг не был виден НИКОГДА. Теперь crouch — это доля от полного
    // выпрямления (1 = ноги выпрямлены, ступня ровно на нижней кромке).
    // Обратная карта по вертикали: ПРИСЕД с опорой на землю.
    // БЫЛО (вариант 1): sy = hipY + (ny-hipY)/legLen * crouch — при crouch<1 стопа
    // уходила за нижний край и упиралась в clamp, то есть ноги не сжимались, а
    // РАЗМАЗЫВАЛИСЬ нижней строкой: присед не был виден даже на 28px.
    // ТЕПЕРЬ: таз опускается на drop, стопа остаётся ровно на нижней кромке, а
    // ноги сжимаются между ними — как у настоящего приседающего существа.
    const drop = (1 - p.crouch) * legLen;
    const legSpan = Math.max(0.02, legLen - drop);
    let sy = ny;
    if (rig.legs) {
      sy = ny >= rig.hipY + drop
        ? rig.hipY + (ny - rig.hipY - drop) * (legLen / legSpan)  // ноги: таз..земля
        : ny - drop;                                              // корпус: опускается целиком
    }
    // Подъём/опускание корпуса (lift) — общий сдвиг вверх для всего тела.
    sy = sy + p.lift * (1 - rig.hipY);
    // НЕ ДАЁМ НИЖНИМ СТРОКАМ СХЛОПЫВАТЬСЯ. Когда обратная карта тянет низ фигуры
    // за пределы холста (sy > 1 при глубоком приседе), несколько строк стопы
    // попадали на ОДНУ и ту же строку N-1 и заливали собой зазор между ногами —
    // ноги снова сливались в лопасть (замер: строка y=127 = 58 пикселей подряд).
    // Ограничиваем снизу так, чтобы последние строки просто не сжимались.
    const srow = Math.min(N - 1, Math.max(0, Math.round(sy * (N - 1))));
    // Окна по высоте: ноги (ниже таза), плечи (шея..таз), голова (выше шеи).
    const legT = rig.legs && ny > rig.hipY ? (ny - rig.hipY) / legLen : 0;
    const headW = ny < headBand ? Math.pow(1 - ny / headBand, 1.4) : 0;
    const shSpan = rig.hipY + 0.05 - headBand;
    const shW = ny >= headBand && ny <= rig.hipY + 0.05 ? Math.sin(((ny - headBand) / shSpan) * Math.PI) : 0;
    for (let x = 0; x < N; x++) {
      const v = src[srow][x];
      if (v === 0) continue;
      const side = (x - cx) / cx;  // -1 левая половина .. +1 правая
      // Нога — ЖЁСТКОЕ звено: вся левая нога уезжает вперёд целиком, правая — назад.
      // БЫЛО: смещение умножалось на side (координату пикселя), а ноги стоят близко
      // к оси симметрии (side ≈ ±0.3), поэтому реальная амплитуда съедалась втрое и
      // стопа смещалась примерно на 1 пиксель — шаг не виделся НИКОГДА.
      const legSide = side < 0 ? -1 : 1;
      // ГЛУБИНА ШАГА. Заносимая нога (swing > 0) в реальной ходьбе ближе к
      // зрителю, поэтому она чуть крупнее; отстающая — мельче и дальше.
      // Это даёт объём без единого сдвига по горизонтали.
      const swingNow = rig.legs ? legSide * p.scissor : 0;
      const depth = 1 + swingNow * 0.16;
      let ox = 0;
      if (rig.legs) {
        // Ножницы НЕ раздвигают ноги вбок. Раньше сдвиг шёл по оси «лево-право»
        // (ox += scissor * legSide * amp * 1.5), из-за чего ноги СМЫКАЛИСЬ в
        // сплошную лопасть (проверено измерением: в walkA/walkC зазор между
        // ногами исчезал полностью) — отсюда ощущение «ворочания на месте».
        // Теперь стойка задаётся ТОЛЬКО через spread, а переменная часть шага
        // выражена подъёмом стопы и глубиной — как в настоящей ходьбе.
        // Стойка: ноги расставлены и ДЕРЖАТСЯ раздвинутыми на всём цикле.
        // Множитель 2.2 вместо 0.9 даёт ~4-5 px разрыва вместо 1.9 — при 1.9 px
        // зазор между нарисованными ногами (x=15..16) полностью заливался, и обе
        // ноги читались как один сплошной блок. Теперь ноги видно раздельно.
        ox += legSide * p.spread * legT * amp * 2.2;
      } else {
        // Бегущая волна: фаза движется по телу, иначе все кадры идентичны.
        ox += p.wave * Math.sin(ny * Math.PI * 2 * p.waveTurns + side * 1.1 - p.wavePhase) * waveAmp;
      }
      ox += p.lean * shW * amp * 0.9;      // наклон/сгиб корпуса
      ox += p.headLag * headW * amp * 0.85; // голова отстаёт от корпуса
      if (rig.tail) ox -= p.lean * Math.pow(Math.max(0, ny - rig.hipY * 0.55), 2) * amp * 0.55; // хвост отстаёт
      // Масштаб по глубине вокруг оси фигуры: ближняя нога растёт, дальняя садится.
      const sx2 = Math.round(cx + (x - cx) * p.stretch * depth - ox);
      // === ВЕРТИКАЛЬНАЯ ФАЗА ШАГА — то, что делает движение ХОДЬБОЙ ===
      // БЫЛО: подъём считался как legT² (ноль у таза, единица у стопы) и
      // складывался с -swing*clear. Но низ фигуры и так упирается в y = N-1,
      // где clamp съедал сдвиг, а у таза legT² ≈ 0 — то есть вверх не двигалось
      // почти ничего. Обе стопы оставались набитыми в нижнюю кромку холста
      // (проверено измерением: leftFootY = rightFootY = 127 на всех кадрах),
      // и шаг читался как «ворочание на месте».
      // ТЕПЕРЬ: подъём линейный по legT и СИММЕТРИЧНЫЙ обеим ногам — опорная
      // нога жёстко стоит на земле, заносимая поднимается на всю длину шага.
      // Плюс вертикальный сдвиг корпуса (lift), который в реальной ходьбе
      // поднимает тело дважды за цикл — по одному разу на каждый шаг.
      let ty2 = y;
      if (rig.legs) {
        // === ПОДЪЁМ СТОПЫ: опорная — на земле, заносимая — вверх ===
        // Раньше подъём считался по legT (0 у таза, 1 у стопы) и умножался на
        // swing, из-за чего обе ноги оставались на земле: пиксели стопы упирались
        // в нижнюю кромку холста, где clamp съедал сдвиг. Теперь стопа заносимой
        // ноги отрывается от земли на всю амплитуду шага, а опорная остаётся
        // внизу — это и есть читаемый шаг.
        const liftFrac = Math.max(0, swingNow);           // 0 = опорная, >0 = заносимая
        // Если внизу работают ЛАПЫ (articulateLimbs), общий сдвиг выключен: иначе
        // у паука поднялась бы вся левая (или правая) половина разом — поверх
        // собственной пофазной волны, и лапы местами не поднимались бы вовсе.
        const step = articulated ? 0 : -liftFrac * stepAmp - Math.max(0, p.tuck) * legT * stepAmp;
        ty2 = Math.min(N - 1, Math.max(0, y + Math.round(step)));
      }
      if (sx2 >= 0 && sx2 < N) c.g[ty2][sx2] = v;
    }
  }
}


// === МУТАЦИИ СИЛУЭТА (traits) ===
// Каждый признак печётся прямо в спрайт: два слизня с разными наборами рогов/шипов
// выглядят как разные существа, а не как один и тот же шаблон разных цветов.
// Рисуем в АВТОРСКИХ координатах (0..32), фигура живёт в левой половине (x<=16),
// затем зеркалится вместе с телом.
type TraitFlip = 1 | -1;
const TX = (x: number, f: TraitFlip) => (f < 0 ? ART_UNIT - x : x);

/** Рисует один признак. flip = -1 зеркалит его в правую половину (для асимметричных форм). */
function drawTrait(c: Canvas32, t: MonsterTrait, boss: boolean, f: TraitFlip, rng: () => number) {
  // Слой 10 = кость/рог, 6/7 = броня, 4 = блик тела, 9 = свечение, 12 = акцент, 8 = золото.
  const B = boss ? 1 : 0; // боссы крупнее: признаки на пол-единицы длиннее
  switch (t) {
    // --- На голове: рога, костяные ветви, гребень, плюмаж, нимб, корона ---
    case 'horns':
      c.tri(TX(11, f), 9, TX(9 - B, f), 2, TX(14, f), 7, 10);
      c.tri(TX(15, f), 9, TX(16, f), 3, TX(12, f), 7, 10);
      c.paintTri(TX(11, f), 8, TX(10, f), 4, TX(13, f), 7, 4);
      break;
    case 'antlers':
      for (let i = 0; i < 3; i++) {
        const bx = 10 + i * 2, by = 8 - i;
        c.tri(TX(bx, f), by, TX(bx - 2, f), by - 3, TX(bx + 1, f), by - 1, 10);
      }
      c.rect(TX(10, f), 7, TX(16, f), 8, 10);
      break;
    case 'crest':
      for (let i = 0; i < 3; i++) c.tri(TX(11 + i * 2, f), 7, TX(12 + i * 2, f), 2 - i, TX(13 + i * 2, f), 7, 4);
      break;
    case 'plume':
      for (let i = 0; i < 4; i++) {
        const bx = 10 + i * 2;
        c.tri(TX(bx, f), 8, TX(bx - 3, f), 3 + i, TX(bx + 1, f), 6, 4);
      }
      break;
    case 'mane':
      for (let i = 0; i < 5; i++) {
        const a = 7 + i;
        c.paintEllipse(TX(10 + (i % 3) * 2, f), a, 2.2, 1.6, 4);
      }
      break;
    case 'halo':
      c.ellipse(TX(13, f), 3, 4.5, 1.6, 8);
      c.ellipse(TX(13, f), 3, 3, 0.8, 12);
      break;
    case 'crown':
      c.rect(TX(10, f), 5, TX(16, f), 6, 8);
      for (let i = 0; i < 3; i++) c.tri(TX(10 + i * 3, f), 5, TX(11 + i * 3, f), 1, TX(13 + i * 3, f), 5, 8);
      break;
    case 'tusks':
      c.paintTri(TX(10, f), 16, TX(9, f), 10, TX(12, f), 15, 10);
      c.paintTri(TX(15, f), 16, TX(16, f), 10, TX(13, f), 15, 10);
      break;
    // --- Глаза ---
    case 'extraEyes':
      for (let i = 0; i < 3; i++) c.paintRect(TX(8 + i * 3, f), 12 + (i % 2) * 3, TX(9 + i * 3, f), 13 + (i % 2) * 3, 9);
      break;
    case 'bubbleSacs':
      for (let i = 0; i < 3; i++) {
        const bx = 6 + rng() * 8, by = 12 + rng() * 10;
        c.ellipse(TX(bx, f), by, 1.4, 1.4, 9);
      }
      break;
    // --- Спина: шипы, панцирь, рёбра, мембраны, ледяные осколки ---
    case 'spikes':
      for (let i = 0; i < 4; i++) c.tri(TX(5, f), 11 + i * 4, TX(1, f), 13 + i * 4, TX(6, f), 14 + i * 4, 12);
      break;
    case 'iceShards':
      for (let i = 0; i < 3; i++) {
        const bx = 8 + i * 3;
        c.tri(TX(bx, f), 14, TX(bx - 1, f), 5 - i, TX(bx + 2, f), 13, 12);
      }
      break;
    case 'shell':
      c.ellipse(TX(10, f), 13, 6, 7, 6);
      c.ellipse(TX(9, f), 12, 4, 5, 7);
      break;
    case 'armorPlates':
      for (let i = 0; i < 3; i++) c.rect(TX(8, f), 15 + i * 4, TX(15, f), 16 + i * 4, 6);
      for (let i = 0; i < 3; i++) c.rect(TX(8, f), 15 + i * 4, TX(15, f), 15 + i * 4, 7);
      break;
    case 'rockArmor':
      for (let i = 0; i < 4; i++) {
        const bx = 6 + rng() * 9, by = 11 + rng() * 14;
        c.ellipse(TX(bx, f), by, 2, 1.6, 5);
        c.ellipse(TX(bx, f), by - 0.5, 1.2, 0.9, 7);
      }
      break;
    case 'boneRibs':
      for (let i = 0; i < 3; i++) c.rect(TX(9, f), 15 + i * 3, TX(15, f), 15 + i * 3, 10);
      break;
    case 'wingMembranes':
      c.tri(TX(6, f), 12, TX(1, f), 9, TX(2, f), 18, 6);
      c.tri(TX(6, f), 18, TX(1, f), 17, TX(3, f), 24, 6);
      break;
    // --- Снизу/сзади: хвост, щупальца, хлысты ---
    case 'tail':
      for (let i = 0; i < 6; i++) c.paintRect(TX(4 - i * 0.4, f), 24 + i, TX(6 - i * 0.4, f), 25 + i, 3);
      c.paintTri(TX(1, f), 30, TX(0, f), 26, TX(4, f), 30, 4);
      break;
    case 'tentacles':
      for (let i = 0; i < 3; i++) {
        const ox = 6 + i * 3;
        for (let j = 0; j < 7; j++) c.paintRect(TX(ox - j * 0.6, f), 22 + j, TX(ox - j * 0.6 + 1.2, f), 23 + j, 3);
      }
      break;
    case 'tendrils':
      for (let i = 0; i < 4; i++) {
        const ox = 8 + i * 2;
        for (let j = 0; j < 6; j++) {
          const s = Math.sin(j * 0.9 + i) * 1.6;
          c.paintRect(TX(ox + s, f), 14 + j, TX(ox + s + 0.9, f), 15 + j, 4);
        }
      }
      break;
    default:
      break;
  }
}

/** Печёт весь набор признаков монстра в спрайт. */
function drawTraits(c: Canvas32, traits: MonsterTrait[] | undefined, boss: boolean, sym: boolean, rng: () => number) {
  if (!traits || traits.length === 0) return;
  for (const t of traits) {
    drawTrait(c, t, boss, 1, rng);
    // Асимметричные формы не зеркалятся — дорисовываем признак справа сами.
    if (!sym) drawTrait(c, t, boss, -1, rng);
  }
}

/** Главный диспетчер: строит пиксель-арт 48x48 для любой формы. */
export function buildMonsterArt(
  id: string,
  shape: EnemyShape,
  boss: boolean,
  meta?: MonsterArtMeta,
  variant: ArtVariant = 'idle',
): ArtGrid {
  const rng = mulberry(hashStr(id + shape + (boss ? 'B' : 'm') + variant));
  // Обнулём счётчик обрезки оружия: если штампа не будет (kit=none), он вернёт 0,
  // а не унаследует значение от предыдущего спрайта (см. lastStampDrops).
  stampDropped = 0;
  stampSides = [0, 0, 0, 0];
  stampBounds = { x0: 0, y0: 0, x1: 0, y1: 0, hx: -1, hy: -1 };
  const c = new Canvas32();
  // Плащ босса рисуется ПЕРВЫМ — он должен оказаться позади тела (см. bossCape).
  if (boss) bossCape(c, shape, meta?.regalia ?? 0);
  switch (shape) {
    case 'blob': drawBlobBody(c, rng, boss); break;
    case 'golem': drawGolemBody(c, rng, boss); break;
    case 'humanoid': drawHumanoidBody(c, rng, boss); break;
    case 'skeleton': drawSkeletonBody(c, rng, boss); break;
    case 'spider': drawSpiderBody(c, rng, boss); break;
    case 'wolf': drawWolfBody(c, rng, boss); break;
    case 'bat': drawBatBody(c, rng, boss); break;
    case 'spirit': drawSpiritBody(c, rng, boss); break;
    case 'shadow': drawShadowBody(c, rng, boss); break;
    case 'crystal': drawCrystalBody(c, rng, boss); break;
    case 'gargoyle': drawGargoyleBody(c, rng, boss); break;
    case 'imp': drawImpBody(c, rng, boss); break;
    case 'eye': drawEyeBody(c, rng, boss); break;
    case 'beetle': drawBeetleBody(c, rng, boss); break;
    case 'dragon': drawDragonBody(c, rng, boss); break;
    default: drawHumanoidBody(c, rng, boss); break;
  }

  const rig = rigFor(shape);
  // ЗЕРКАЛИТЬСЯ МОЖНО НЕ ВСЁ. Фигуры «боком» (волк) уже нарисованы во всю
  // ширину спрайта мордой вправо и разворачиваются движком через faceDir.
  // Раньше волк попадал в зеркалирование вместе с фронтальными формами, и
  // mirror() штамповал отражённую ГОЛОВУ поверх хвоста: на выходе был
  // симметричный мешок с четырьмя глазами в ряд — «непонятно на что».
  const sideView = shape === 'wolf';
  const symmetrical = !sideView && shape !== 'blob' && shape !== 'spirit' && shape !== 'shadow' && shape !== 'crystal';

  // === СНАЧАЛА ЗЕРКАЛИМ, ПОТОМ ГНЁМ ПОЗУ ===
  // БЫЛО: warpPose() → drawTraits() → mirror(). Две ошибки складывались и давали
  // «ворочание на месте» вместо ходьбы:
  //  1) ПозА считалась только по левой половине, а зеркалилась ПОСЛЕ — ножницы
  //     двигали одну ногу, а вторая получалась её зеркальной копией.
  //  2) Фигуры рисуются сразу в ОБЕИХ половинах (ноги гуманоида: x=10..14 и
  //     x=17..21), поэтому mirror() не «дорисовывал» вторую половину, а НАКЛАДЫВАЛ
  //     левую на правую — и зазор между ногами заливался сплошным блоком
  //     (замер: строка y=127 = 58 пикселей подряд, ног не видно вообще).
  // Теперь зеркало применяется ДО позы, поэтому ножницы работают по двум
  // настоящим ногам: левая вперёд — правая назад. Это настоящий шаг.
  // Признаки (traits) рисуются в левой половине ДО зеркала — как и раньше.
  drawTraits(c, meta?.traits, boss, symmetrical, rng);
  if (symmetrical) c.mirror();

  // Походка обязательна: без неё все кадры сводились к общему шагу (поломка №2).
  const gaitKind: GaitKind = meta?.gait || 'walk';
  const pose = poseFor(variant, rig, gaitKind, meta?.attack);
  // КРЫЛО ЖИВЁТ ТОЛЬКО В ВОЗДУШНЫХ ПОХОДКАХ — правило ОДНО с движком
  // (flapsWings): у каменной гаргульи крылья сложены, у летучей мыши бьют по
  // общей flapStroke. Гейт стоит здесь, а не в poseFor, потому что решение
  // зависит от ФОРМЫ (есть ли у неё крылья), а poseFor знает только риг.
  if (walkPhase(variant) !== null && !flapsWings(shape, gaitKind)) {
    pose.wingLift = 0;
    pose.wingSweep = 0;
  }
  // Лапы ищем ДО warpPose — спрайт ещё в нейтральной позе, разрывы между
  // ногами чистые. Результат решает две вещи: снимает ли warpPose общий подъём
  // стоп (его заменяет пофазная артикуляция) и идёт ли сама артикуляция.
  // У голема (сплошной блок снизу) лап не находится — он идёт как раньше.
  const limbs = rig.legs ? findLimbs(c, rig) : [];
  limbCount = limbs.length;
  const articulated = limbs.length >= 2;
  warpPose(c, pose, rig, articulated);
  if (articulated) articulateLimbs(c, pose, rig, limbs);
  // Взмах крыла — поворот вокруг плеча (wingLift = подъём/опускание,
  // wingSweep = пронос/подтягивание), как у птицы, а не сдвиг строк.
  if (rig.wings && (pose.wingLift !== 0 || pose.wingSweep !== 0)) wingStroke(c, pose, rig);

  // Объём. Раньше здесь стояло c.shade(3,2,4) + c.shade(6,5,7) — свет и тень
  // по КРОМКЕ, то есть ровными полосами вдоль силуэта. На прямоугольных фигурах
  // (торс-коробка, голова-коробка) это читалось как «робот из панелей». Теперь
  // объём считается по ПОЛЮ РАССТОЯНИЙ (volumeShade): свет и тень идут по форме,
  // и тварь выглядит округлой, а не собранной из пластин.
  volumeShade(c);
  // Детализация по анатомии (броня, рёбра, крылья, чешуя, сегменты)
  detailPass(c, shape, rng, boss);
  // Скелет — не «мясо»: кость вместо тела.
  if (shape === 'skeleton') {
    c.recolor(3, 10);
    c.recolor(2, 10);
    c.recolor(4, 10);
  }
  c.outline(1, Math.max(1, Math.round(SS / 4)));
  // Лицо и глаза — поверх объёма и брони.
  paintFace(c, shape, rng);
  // Зеркалим ТОЛЬКО область лица (0..17 авторских единиц). Раньше здесь
  // зеркалилась ВСЯ фигура (0..31) — и это происходило ПОСЛЕ применения позы,
  // поэтому стирало всю асимметрию шага: нога, вынесенная вперёд, превращалась
  // в зеркальную копию опорной, и цикл ходьбы вырождался в «ворочание на
  // месте» (это и ловила диагностика шага: d=[0,0,0,...] для всех кадров).
  // Теперь зеркалится только голова: лицо симметрично (волку нужен второй
  // глаз), а ноги сохраняют настоящую противофазу.
  if (symmetrical) mirrorRegion(c, 0, 17);
  c.outline(1, Math.max(1, Math.round(SS / 4)));
  // Объём и свет: контрсвет сверху-слева, тень внизу, свечение глаз/ядра
  polishArt(c, shape, boss);
  // Скелет: тени и блики на костях (кость = слой 10, объём = 2/4).
  // ВАЖНО (было источником «полос через всё тело»): раньше рёбра красились
  // УСЛОВИЕМ «слева И сверху кость» → вся верхне-левая внутренность черепа и
  // рёбер становилась слоем 4 одной широкой зоной, а граница зоны шла ровной
  // линией на 100+ px поперёк фигуры. Теперь затенение считается по локальному
  // окружению (3×3), поэтому переход «свет → кость» получается зубчатым и
  // повторяет форму кости, а не режет силуэт полосой.
  if (shape === 'skeleton') {
    for (let y = 1; y < ART_N - 1; y++) {
      for (let x = 1; x < ART_N - 1; x++) {
        if (c.g[y][x] !== 10) continue;
        const up = c.g[y - 1][x], left = c.g[y][x - 1], down = c.g[y + 1][x], right = c.g[y][x + 1];
        if (up === 1 || left === 1 || down === 1 || right === 1) { c.g[y][x] = 2; continue; }
        // Только КРОМКА освещается: пиксель у самой границы тени (диагонали тоже
        // считаем), а не вся лево-верхняя половина кости.
        const upL = c.g[y - 1][x - 1], upR = c.g[y - 1][x + 1];
        const dnL = c.g[y + 1][x - 1], dnR = c.g[y + 1][x + 1];
        const near2 = upL === 2 || upR === 2 || dnL === 2 || dnR === 2;
        if (near2 && up !== 2 && left !== 2) c.g[y][x] = 4;
      }
    }
    mirrorRegion(c, 0, ART_UNIT - 1);
  }

  if (boss) {
    drawBossRegalia(c, meta?.regalia ?? 0);
    c.outline(1, Math.max(1, Math.round(SS / 4)));
    // РЕГАЛИИ — тоже объём. Раньше они рисовались ПОСЛЕ polishArt и оставались
    // плоскими пятнами: у широких деталей (гало, венец, черепной нагрудник) весь
    // верхний край шёл ровной линией, и на границе блока SS×SS возникала «полоса
    // поперёк тела» шириной в одну строку (замер: y=8 контур ×101 → y=9 золото ×119).
    // Теперь к регалиям применяется тот же мягкий объём, поэтому их кромка дышит
    // вместе с фигурой, а не режет силуэт.
    regaliaShade(c, meta?.regalia ?? 0);
    // --- ВЕЛИЧИЕ БОССА ---
    // Регалии давали « украшение», но не давали МАССЫ: у босса не было широкого
    // силуэта, поэтому на экране (2.5× он = 140–200 px) он читался тем же пятном,
    // что и обычный монстр, только крупнее. Три слоя ниже расширяют плечи,
    // опускают мантию и зажигают ядро в груди — босс становится узнаваемым
    // силуэтом ещё до того, как игрок прочитает имя.
    bossGrandeur(c, shape, meta?.regalia ?? 0);
  }

  // --- ОРУЖИЕ (несимметричное, рисуется последним) ---
  // Явный набор из EnemyDef.weapon (у боссов — личное оружие) перебивает
  // выбор по имени/форме: имя «Топор Кровавой Клятвы» и картинка совпадают.
  const kit = meta?.weapon
    ? { weapon: meta.weapon, element: meta.element }
    : monsterKit(id, meta?.nameRu || '', meta?.nameEn || '', shape, boss);
  const wfn = WEAPON_FN[kit.weapon];
  if (wfn) {
    // Оружие рисуется на РАСШИРЕННОМ холсте (WEAPON_N): раньше кисть на 27-й
    // единице из 32 упиралась в край, и клинок просто обрезался по границе
    // спрайта — оружие выглядело обрубком.
    const wc = new Canvas32(WEAPON_N);
    wfn(wc, rng, boss);
    // Перенос оружия в кадр анимации (поворот вокруг кисти + выпад кадра)
    // делается в отдельной сетке, чтобы понять: влезает ли оно в холст тела.
    // Штамп сначала идёт на холст WEAPON_N (48 единиц) — этого хватает всем
    // кадрам, кроме «контакта» в упор. Если пиксели выпали вПРАВО/ВНИЗ
    // (stampSides), перештампываем на STAMP_N (64 единицы): холст-недоросток
    // съедал кончик алебарды/лука в attackC. Выпад вверх холстом не лечится —
    // тело занимает верхний левый угол, поэтому там правятся позы замаха.
    let stamped = new Canvas32(WEAPON_N);
    stampWeapon(stamped, wc, variant);
    if (stampSides[1] || stampSides[3]) {
      stamped = new Canvas32(STAMP_N);
      stampWeapon(stamped, wc, variant);
    }
    if (gridOverflows(stamped.g, ART_N)) {
      // Собираем спрайт на расширенном холсте: тело остаётся в своём масштабе
      // и на своём месте, а оружие получает недостающее место. Движок рисует
      // такой спрайт на столько же шире (см. drawPixelMonster), поэтому на
      // экране размер монстра НЕ меняется — только оружие больше не обрезано.
      // Три уровня: 256 (оружие внутри тела) / 384 (чуть шире) / 512 (удар
      // в упор: кончик уходит правее 64-й единицы, штамп пишется на STAMP_N).
      const need = gridOverflows(stamped.g, WEAPON_N) ? STAMP_N : WEAPON_N;
      const big = new Canvas32(need);
      for (let y = 0; y < ART_N; y++) {
        const src = c.g[y], dst = big.g[y];
        for (let x = 0; x < ART_N; x++) dst[x] = src[x];
      }
      for (let y = 0; y < need; y++) {
        const src = stamped.g[y], dst = big.g[y];
        for (let x = 0; x < need; x++) if (src[x] > dst[x]) dst[x] = src[x];
      }
      big.outline(1, Math.max(1, Math.round(SS / 4)));
      return big.g;
    }
    for (let y = 0; y < ART_N; y++) {
      const src = stamped.g[y], dst = c.g[y];
      for (let x = 0; x < ART_N; x++) if (src[x] > dst[x]) dst[x] = src[x];
    }
    c.outline(1, Math.max(1, Math.round(SS / 4)));
  }
  return c.g;
}

/** Есть ли в сетке ненулевые пиксели за пределами квадрата size×size. */
function gridOverflows(g: ArtGrid, size: number): boolean {
  const n = g.length;
  for (let y = 0; y < n; y++) {
    const row = g[y];
    if (y >= size) {
      for (let x = 0; x < n; x++) if (row[x] !== 0) return true;
      continue;
    }
    for (let x = size; x < n; x++) if (row[x] !== 0) return true;
  }
  return false;
}

