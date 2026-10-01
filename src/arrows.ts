// ============================================================
// ARROWS & BOLTS — «КЛАССНЫЕ» СНАРЯДЫ ВМЕСТО ЦВЕТНЫХ ШАРОВ
// ============================================================
// Раньше любой снаряд рисовался как `arc(x, y, radius)` — круг, и
// исключение `isArrow` — тонкая полоска 16×2 px. Ни льда, ни огня, ни
// кристалла: у скелета-лучника и у босса-громовержца снаряд выглядел
// одинаково. По картинке нельзя было понять, ЧТО летит, и уклоняться
// приходилось «на автомате».
//
// Теперь каждый снаряд — настоящая стрела/кристалл/осколок с телом,
// перьями, наконечником, шлейфом и элементными искрами. Вид задаётся
// типом `ArrowKind`, физика (скорость, радиус попадания, хвост) —
// таблицей `ARROW_PROFILES`. Модуль чистый: только типы + ctx.
// ============================================================
import type { Element } from './types';

/** Все виды снарядов. Каждый — со своим силуэтом и своим «поведением». */
export type ArrowKind =
  // обычные стрелы
  | 'plain' | 'bone' | 'steel' | 'royal' | 'jag'
  // стихийные
  | 'ice' | 'frost' | 'fire' | 'ember' | 'poison' | 'venom' | 'storm' | 'void' | 'shadow'
  // магические/боссовые
  | 'shard' | 'crystal' | 'orb' | 'spike' | 'lance' | 'spear' | 'fang' | 'web' | 'sigil' | 'meteor';

export interface ArrowProfile {
  /** Скорость, px/с. */
  speed: number;
  /** Радиус ПОПАДАНИЯ (не рисунка!) — им же помечается зона урона. */
  radius: number;
  /** Длина хвоста (след из призраков), 0 = без следа. */
  trail: number;
  /** Ширина тела снаряда, px. */
  body: number;
  /** Длина наконечника/леза, px. */
  head: number;
  /** Скорость вращения перьев/ореола (рад/с). */
  spin: number;
  /** Цвет свечения. */
  glow: string;
}

const P = (o: Partial<ArrowProfile> & { speed: number }): ArrowProfile => ({
  radius: 5, trail: 0, body: 3, head: 7, spin: 0, glow: '#ffffff',
  ...o,
});

/**
 * ПРОФИЛИ СНАРЯДОВ.
 *  - скорость 380…720: быстрые (ice/jag/storm) читаются как «не увернёшься»,
 *    медленные (meteor/orb/web) телеграфируются дольше и их можно обойти;
 *  - radius — реальное попадание: у «лезя» (lance) и «меча» (meteor) он
 *    заметно больше картинки, чтобы атака ощущалась честной, а не
 *    «пикнул по три пикселя»;
 *  - trail: длинный хвост у огня/тьмы — по нему видна траектория.
 */
export const ARROW_PROFILES: Record<ArrowKind, ArrowProfile> = {
  // --- обычные стрелы ---
  plain:   P({ speed: 620, radius: 5, trail: 3, body: 3, head: 8, glow: '#d8c8a0' }),
  bone:    P({ speed: 600, radius: 5, trail: 2, body: 3, head: 8, glow: '#f2ead0', spin: 2 }),
  steel:   P({ speed: 700, radius: 4, trail: 2, body: 2, head: 9, glow: '#c8c8d6' }),
  royal:   P({ speed: 660, radius: 5, trail: 5, body: 3, head: 10, glow: '#e8b53c', spin: 3 }),
  jag:     P({ speed: 690, radius: 5, trail: 3, body: 3, head: 7, glow: '#9fb0d8' }),

  // --- лёд: быстрые, узкие, с инеем на древке ---
  ice:     P({ speed: 640, radius: 6, trail: 6, body: 4, head: 11, glow: '#8fd8ff', spin: 1.5 }),
  frost:   P({ speed: 600, radius: 7, trail: 8, body: 5, head: 9, glow: '#c8f0ff', spin: 2.5 }),

  // --- огонь: медленнее льда, длинный хвост ---
  fire:    P({ speed: 500, radius: 7, trail: 10, body: 4, head: 10, glow: '#ff8a3a', spin: 6 }),
  ember:   P({ speed: 470, radius: 6, trail: 9, body: 4, head: 8, glow: '#ff7b2f', spin: 8 }),

  // --- яд: «кувыркается», капли срываются с хвоста ---
  poison:  P({ speed: 520, radius: 6, trail: 7, body: 4, head: 8, glow: '#7fd44a', spin: 4 }),
  venom:   P({ speed: 560, radius: 6, trail: 6, body: 4, head: 8, glow: '#a8e05a', spin: 5 }),

  // --- гроза: метит полосами, очень быстрый ---
  storm:   P({ speed: 720, radius: 5, trail: 7, body: 3, head: 12, glow: '#ffe14a', spin: 12 }),

  // --- тьма/пустота: средняя скорость, длинный вязкий след ---
  void:    P({ speed: 540, radius: 7, trail: 9, body: 5, head: 9, glow: '#a86ad8', spin: 3 }),
  shadow:  P({ speed: 560, radius: 6, trail: 8, body: 4, head: 8, glow: '#6a4a8a', spin: 3.5 }),

  // --- магические/боссовые ---
  shard:   P({ speed: 560, radius: 5, trail: 4, body: 4, head: 9, glow: '#cfe4ff', spin: 10 }),
  crystal: P({ speed: 520, radius: 7, trail: 6, body: 6, head: 12, glow: '#bfe8ff', spin: 4 }),
  orb:     P({ speed: 430, radius: 11, trail: 8, body: 14, head: 0, glow: '#ffffff', spin: 2 }),
  spike:   P({ speed: 640, radius: 5, trail: 4, body: 3, head: 13, glow: '#d8c0a0' }),
  lance:   P({ speed: 700, radius: 7, trail: 8, body: 5, head: 20, glow: '#ffdca8' }),
  spear:   P({ speed: 640, radius: 6, trail: 5, body: 4, head: 18, glow: '#e8d8b0' }),
  fang:    P({ speed: 580, radius: 5, trail: 3, body: 3, head: 9, glow: '#f2ead0', spin: 2 }),
  web:     P({ speed: 380, radius: 9, trail: 0, body: 10, head: 0, glow: '#e0e6f0', spin: 1 }),
  sigil:   P({ speed: 500, radius: 8, trail: 6, body: 10, head: 0, glow: '#c9a0ff', spin: 5 }),
  meteor:  P({ speed: 380, radius: 15, trail: 10, body: 18, head: 0, glow: '#ff8a3a', spin: 3 }),
};

/** Стихийный эффект снаряда по его виду. */
export function arrowElement(kind: ArrowKind): Element | undefined {
  switch (kind) {
    case 'ice': case 'frost': return 'ice';
    case 'fire': case 'ember': case 'meteor': return 'fire';
    case 'poison': case 'venom': case 'web': return 'poison';
    case 'storm': return 'storm';
    case 'void': case 'shadow': case 'sigil': return 'dark';
    default: return undefined;
  }
}

/**
 * Вид снаряда по стихии + форме + оружию. Раньше цвет брался из
 * `elementColor(element, def.color)`, и все «тёмные» боссы стреляли
 * одинаковым фиолетовым шаром. Теперь вид выбирается из тройки
 * (стихия, оружие, форма), поэтому у ледяного стрелка — ледяные стрелы,
 * у огненного дракона — угли, у некроманта — костяные копья.
 */
export function arrowKindFor(element: Element | undefined, shape?: string, weapon?: string): ArrowKind {
  switch (element) {
    case 'ice': return weapon === 'crossbow' || shape === 'crystal' ? 'frost' : 'ice';
    case 'fire': return shape === 'dragon' ? 'ember' : 'fire';
    case 'poison': return weapon === 'orb' || shape === 'spider' ? 'venom' : 'poison';
    case 'storm': return 'storm';
    case 'dark': {
      if (weapon === 'spear' || weapon === 'halberd' || weapon === 'trident') return 'void';
      if (weapon === 'scythe' || weapon === 'dagger') return 'shadow';
      if (shape === 'skeleton') return 'bone';
      return 'void';
    }
    default: break;
  }
  // без стихии — вид по оружию/форме
  if (weapon === 'bow') return 'plain';
  if (weapon === 'crossbow') return 'steel';
  if (weapon === 'spear' || weapon === 'halberd' || weapon === 'trident') return 'spear';
  if (weapon === 'staff' || weapon === 'book') return 'sigil';
  if (weapon === 'orb') return 'orb';
  if (weapon === 'banner' || weapon === 'torch') return 'royal';
  if (shape === 'skeleton') return 'bone';
  if (shape === 'crystal') return 'crystal';
  if (shape === 'spider') return 'fang';
  return 'jag';
}

export function arrowProfile(kind: ArrowKind): ArrowProfile {
  return ARROW_PROFILES[kind] || ARROW_PROFILES.jag;
}

/** Страховка от битых данных из сейва: неизвестный вид → jag. */
export function coerceArrowKind(v: unknown): ArrowKind {
  return typeof v === 'string' && (ARROW_PROFILES as Record<string, ArrowProfile>)[v] !== undefined
    ? (v as ArrowKind)
    : 'jag';
}

// ============================================================
// ОТРИСОВКА СНАРЯДА
// ============================================================
export interface ArrowView {
  x: number;
  y: number;
  /** Угол направления (рад). */
  angle: number;
  kind: ArrowKind;
  /** Множитель размера (1 = обычный, 1.5 = крупный боссовой). */
  scale?: number;
  /** Фаза «старения»: 0 свежий, 1 на излёте (след тает). */
  fade?: number;
  /** Время в секундах — для мерцания искр. */
  now: number;
}

const rgba = (hex: string, a: number): string => {
  const h = hex.replace('#', '');
  const v = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  if (!isFinite(v)) return hex;
  return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${a})`;
};

/** Тонкий светящийся «веер» вокруг ядра — общий ореол для всех видов. */
function glow(ctx: CanvasRenderingContext2D, r: number, color: string, a: number) {
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  g.addColorStop(0, rgba(color, 0.55 * a));
  g.addColorStop(0.5, rgba(color, 0.20 * a));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
}

/** Наконечник: заострённый ле́звие в цвет металла/стихии. */
function head(ctx: CanvasRenderingContext2D, len: number, w: number, col: string) {
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(len, 0);
  ctx.lineTo(len - w * 0.9, -w * 0.55);
  ctx.lineTo(len - w * 1.5, 0);
  ctx.lineTo(len - w * 0.9, w * 0.55);
  ctx.closePath();
  ctx.fill();
}

/** Перо: три лепестка веером у основания (0,0) назад по -x. */
function fletching(ctx: CanvasRenderingContext2D, len: number, col: string, alpha: number) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = col;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(-len, 0);
    ctx.lineTo(-len - len * 0.55, s * len * 0.42);
    ctx.lineTo(-len - len * 0.05, s * len * 0.10);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/**
 * ГЛАВНЫЙ РИСОВАТЕЛЬ СНАРЯДА. Разворачивается в локальную систему
 * (+x = направление полёта) и рисует вид по `kind`.
 *
 * Общее для всех видов: мягкий ореол по `glow` и вытянутое вдоль
 * движения ядро — чтобы даже быстрый снаряд читался как летящий объект,
 * а не как точка. Различие — в теле: древко/перо/лезвие/кристалл/пламя.
 */
export function drawArrow(ctx: CanvasRenderingContext2D, v: ArrowView) {
  const p = arrowProfile(v.kind);
  const s = Math.max(0.4, v.scale ?? 1);
  const alpha = 1 - 0.55 * (v.fade ?? 0);
  ctx.save();
  ctx.translate(v.x, v.y);
  ctx.rotate(v.angle);
  ctx.scale(s, s);
  ctx.globalAlpha = alpha;

  const b = p.body, h = p.head, gl = p.glow;

  switch (v.kind) {
    // ============ КЛАССИЧЕСКИЕ СТРЕЛЫ (древко + перо + наконечник) ===
    case 'plain': case 'bone': case 'steel': case 'jag': case 'fang': case 'spike':
    case 'lance': case 'spear': case 'royal': {
      glow(ctx, (b + h) * 1.5, gl, 0.6);
      ctx.fillStyle = rgba(gl, 0.5);
      ctx.beginPath();
      ctx.ellipse(-h * 0.4, 0, h * 1.1, b * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = (v.kind === 'bone' || v.kind === 'fang') ? '#d8d0b8' : '#8b6f3f';
      ctx.fillRect(-h * 0.7, -b * 0.34, h * 1.4, b * 0.68);
      head(ctx, h * 1.15, b,
        v.kind === 'royal' ? '#e8b53c'
        : (v.kind === 'steel' || v.kind === 'spike' || v.kind === 'lance') ? '#e8ecf4'
        : '#d6d0c0');
      const ph = p.spin > 0 ? 0.75 + 0.25 * Math.sin(v.now * p.spin) : 1;
      fletching(ctx, h * 0.62, v.kind === 'royal' ? '#e8b53c' : gl, ph);
      break;
    }

    // ============ ЛЁД: гранёный наконечник, морозные иглы ============
    case 'ice': case 'frost': {
      glow(ctx, (b + h) * 1.7, gl, 0.85);
      ctx.fillStyle = rgba(gl, 0.85);
      ctx.beginPath();
      ctx.moveTo(h, 0);
      ctx.lineTo(h * 0.15, -b * 0.85);
      ctx.lineTo(-h * 0.6, -b * 0.5);
      ctx.lineTo(-h * 0.6, b * 0.5);
      ctx.lineTo(h * 0.15, b * 0.85);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.beginPath();
      ctx.moveTo(h * 0.7, 0);
      ctx.lineTo(-h * 0.3, -b * 0.28);
      ctx.lineTo(-h * 0.3, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        const a = v.now * 2 + (i * Math.PI) / 2;
        const r0 = b * 0.9, r1 = b * (1.5 + 0.2 * Math.sin(v.now * 6 + i));
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
        ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
        ctx.stroke();
      }
      break;
    }

    // ============ ОГОНЬ: вытянутое пламя с рваным хвостом ============
    case 'fire': case 'ember': case 'meteor': {
      glow(ctx, (b + h) * 2.0, gl, 0.9);
      ctx.fillStyle = 'rgba(255,242,176,0.95)';
      ctx.beginPath();
      ctx.moveTo(h * 0.5, 0);
      ctx.quadraticCurveTo(0, -b, -h * 0.5, 0);
      ctx.quadraticCurveTo(0, b, h * 0.5, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = rgba(gl, 0.7);
      for (let i = 0; i < 3; i++) {
        const wob = Math.sin(v.now * 8 + i * 2) * b * 0.3;
        ctx.beginPath();
        ctx.moveTo(-h * 0.4, 0);
        ctx.quadraticCurveTo(-h, -b * 0.8 + wob, -h * (1.2 + i * 0.2), wob * 0.5);
        ctx.quadraticCurveTo(-h, b * 0.8 + wob, -h * 0.4, 0);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(255,90,26,0.8)';
      for (let i = 0; i < 3; i++) {
        const a = v.now * 6 + i * 2.1;
        ctx.beginPath();
        ctx.arc(-h * 0.6 + Math.cos(a) * b, Math.sin(a) * b, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    // ============ ЯД: капля с отравленным хвостом, «кувыркается» ============
    case 'poison': case 'venom': case 'web': {
      glow(ctx, (b + h) * 1.5, gl, 0.7);
      // капля-капсула: задняя тупая, передняя острая
      ctx.fillStyle = rgba(gl, 0.9);
      ctx.beginPath();
      ctx.moveTo(h * 0.9, 0);
      ctx.quadraticCurveTo(0, -b, -h * 0.7, 0);
      ctx.quadraticCurveTo(0, b, h * 0.9, 0);
      ctx.closePath();
      ctx.fill();
      // капли, отрывающиеся с хвоста
      for (let i = 0; i < 3; i++) {
        const t = ((v.now * p.spin * 0.3 + i / 3) % 1);
        const d = -h * (0.8 + t * 1.4);
        const r = b * 0.22 * (1 - t);
        ctx.globalAlpha = alpha * (1 - t);
        ctx.fillStyle = rgba(gl, 0.8);
        ctx.beginPath();
        ctx.arc(d, Math.sin(t * 9 + i) * b * 0.3, Math.max(0.5, r), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = alpha;
      // у паутина — сетка вместо капель
      if (v.kind === 'web') {
        ctx.strokeStyle = 'rgba(240,246,255,0.75)';
        ctx.lineWidth = 1;
        for (let i = -2; i <= 2; i++) {
          ctx.beginPath();
          ctx.moveTo(-h * 0.6, i * b * 0.35);
          ctx.lineTo(h * 0.6, i * b * 0.35);
          ctx.stroke();
        }
      }
      break;
    }

    // ============ ГРОЗА: молния в оправе, белые искры ============
    case 'storm': {
      glow(ctx, (b + h) * 1.8, gl, 1.0);
      // зигзаг-молния
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(h, 0);
      const seg = 4, L = h * 1.6;
      for (let i = 1; i <= seg; i++) {
        const t = i / seg;
        ctx.lineTo(h - t * L, (i % 2 ? 1 : -1) * b * 0.5 * (1 - t * 0.3));
      }
      ctx.stroke();
      // жёлтая оправа
      ctx.strokeStyle = rgba(gl, 0.85);
      ctx.lineWidth = 3.5;
      ctx.globalAlpha = alpha * 0.5;
      ctx.stroke();
      ctx.globalAlpha = alpha;
      // искры
      ctx.fillStyle = rgba('#ffffff', 0.9);
      for (let i = 0; i < 3; i++) {
        const a = v.now * 12 + i * 2.1;
        ctx.beginPath();
        ctx.arc(-h * 0.5 + Math.cos(a) * b * 1.2, Math.sin(a) * b * 1.2, 1.3, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    // ============ ТЬМА: разрыв с втягивающим ореолом ============
    case 'void': case 'shadow': case 'sigil': {
      glow(ctx, (b + h) * 2.1, gl, 0.95);
      // тёмный овал с горящим ядром — «дыра» в воздухе
      const g2 = ctx.createRadialGradient(0, 0, 0, 0, 0, b * 1.6);
      g2.addColorStop(0, 'rgba(10,4,20,0.9)');
      g2.addColorStop(0.6, rgba(gl, 0.55));
      g2.addColorStop(1, rgba(gl, 0));
      ctx.fillStyle = g2;
      ctx.beginPath();
      ctx.ellipse(0, 0, b * 1.6, b * 1.1, 0, 0, Math.PI * 2);
      ctx.fill();
      // воронка: спираль втягивания
      ctx.strokeStyle = rgba(gl, 0.6);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let i = 0; i <= 18; i++) {
        const t = i / 18, a = t * Math.PI * 2.2 + v.now * p.spin;
        const r = b * (0.3 + t * 1.3);
        const x = Math.cos(a) * r, y = Math.sin(a) * r * 0.7;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      // вытянутый «след» назад
      ctx.fillStyle = rgba(gl, 0.35);
      ctx.beginPath();
      ctx.moveTo(-b * 0.4, 0);
      ctx.lineTo(-b * 0.4 - h * 1.6, -b * 0.4);
      ctx.lineTo(-b * 0.4 - h * 1.6, b * 0.4);
      ctx.closePath();
      ctx.fill();
      break;
    }

    // ============ КРИСТАЛЛ / ОСКОЛОК: гранёные грани ============
    case 'shard': case 'crystal': {
      glow(ctx, (b + h) * 1.6, gl, 0.8);
      const rot = p.spin > 0 ? Math.sin(v.now * p.spin) * 0.5 : 0;
      ctx.rotate(rot);
      ctx.fillStyle = rgba(gl, 0.9);
      ctx.beginPath();
      ctx.moveTo(h, 0);
      ctx.lineTo(h * 0.1, -b * 0.9);
      ctx.lineTo(-h * 0.9, -b * 0.5);
      ctx.lineTo(-h * 0.9, b * 0.5);
      ctx.lineTo(h * 0.1, b * 0.9);
      ctx.closePath();
      ctx.fill();
      // внутренняя грань-блик
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath();
      ctx.moveTo(h * 0.8, 0);
      ctx.lineTo(-h * 0.5, -b * 0.18);
      ctx.lineTo(-h * 0.5, b * 0.02);
      ctx.closePath();
      ctx.fill();
      // осколки-спутники
      ctx.fillStyle = rgba(gl, 0.6);
      for (let i = 0; i < 3; i++) {
        const a = v.now * p.spin * 0.5 + i * 2.1;
        ctx.save();
        ctx.translate(-h * 0.5 + Math.cos(a) * b * 1.3, Math.sin(a) * b * 1.3);
        ctx.rotate(a * 2);
        ctx.fillRect(-b * 0.18, -b * 0.32, b * 0.36, b * 0.64);
        ctx.restore();
      }
      break;
    }

    // ============ СФЕРА: магическое ядро с орбитами ============
    case 'orb': {
      const pulse = 1 + 0.08 * Math.sin(v.now * p.spin);
      glow(ctx, b * 2.2 * pulse, gl, 0.9);
      const g3 = ctx.createRadialGradient(-b * 0.3, -b * 0.3, 0, 0, 0, b * pulse);
      g3.addColorStop(0, 'rgba(255,255,255,0.95)');
      g3.addColorStop(0.45, rgba(gl, 0.85));
      g3.addColorStop(1, rgba(gl, 0.25));
      ctx.fillStyle = g3;
      ctx.beginPath();
      ctx.arc(0, 0, b * pulse, 0, Math.PI * 2);
      ctx.fill();
      // орбитальные дуги
      ctx.strokeStyle = rgba('#ffffff', 0.5);
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 2; i++) {
        ctx.save();
        ctx.rotate(v.now * (1.5 + i) * (i ? -1 : 1));
        ctx.beginPath();
        ctx.ellipse(0, 0, b * 1.5, b * 0.5, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      break;
    }
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

/** Одна точка следа снаряда (кольцевой буфер: engine держит их в массиве). */
export interface TrailPoint { x: number; y: number; }

/**
 * СЛЕД СНАРЯДА. Без него быстрый снаряд — это точка между кадрами:
 * при 720 px/с он за 16 мс пролетает 11 px, и «летевшая стрела»
 * выглядит как мелькающий пиксель. Хвост рисуется по истории позиций
 * (движок кладёт их в `pr.trail`), затухая к хвосту, — траектория
 * читается мгновенно, и по ней видно, куда босс целится.
 *
 * Кольцевой буфер: `MAX_TRAIL` точек, при переполнении сдвигаем.
 */
export const MAX_TRAIL = 8;

export function pushTrail(trail: TrailPoint[], x: number, y: number): void {
  trail.push({ x, y });
  while (trail.length > MAX_TRAIL) trail.shift();
}

export function drawArrowTrail(
  ctx: CanvasRenderingContext2D,
  trail: TrailPoint[],
  kind: ArrowKind,
  now: number,
): void {
  const p = arrowProfile(kind);
  if (p.trail <= 0 || trail.length < 2) return;
  const n = trail.length;
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 1; i < n; i++) {
    const t = i / n;                    // 0 у хвоста, 1 у головы
    const a = trail[i - 1], b = trail[i];
    ctx.globalAlpha = 0.10 + 0.34 * t * t;
    ctx.strokeStyle = p.glow;
    ctx.lineWidth = Math.max(0.6, p.body * 0.9 * t);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  // горячий след у самой головы — короткий выброс цвета стихии
  const tip = trail[n - 1], prev = trail[n - 2];
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(0.6, p.body * 0.5);
  ctx.beginPath();
  ctx.moveTo(prev.x, prev.y);
  ctx.lineTo(tip.x, tip.y);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.restore();
}



