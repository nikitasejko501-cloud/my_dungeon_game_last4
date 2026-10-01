// === SIGNATURE ATTACKS — ORGANIC, ANATOMY-DRIVEN MONSTER STRIKES (independent module) ===
// Атака задаётся АНАТОМИЕЙ твари, а не «палкой»: слизень сжимается → прыгает → бьёт массой
// и оставляет кислотную лужу, волк делает прыжок-укус, паук вскидывается и бьёт лапами,
// голем обрушивает кулаки по земле, кристалл разбрасывает осколки, глаз бьёт лучом.
// Модуль чистый: только типы + ctx, ни одной зависимости от движка.
import type { Element, EnemyAttackType, EnemyShape } from './types';
// === STEP 0. TUNING BLOCK — тайминги (сек), дальность (×радиус), сила удара ===
export type SignatureKind =
  | 'weaponSweep'
  | 'slimeSlam' | 'pounce' | 'legStab' | 'quakeSlam' | 'wingBuffet' | 'shardBurst'
  | 'shadowLash' | 'gazeBeam' | 'spiritDrain' | 'beetleRam' | 'dragonBreath'
  | 'webSpit' | 'spitBolt' | 'shardVolley' | 'darkBolt' | 'stormBolt';
export interface SignatureProfile {
  windup: number;      // телеграф: тварь копит массу/энергию
  strike: number;      // кинетический удар
  recover: number;     // возврат в стойку
  contact: number;     // 0..1 внутри фазы удара — момент физического контакта
  window: number;      // половина окна контакта (сек): сколько секунд считается ударом
  reach: number;       // дальность удара (×радиус врага)
  damageMul: number;   // множитель урона
  shake: number;       // тряска экрана при контакте (пиксели)
  puddle: number;      // радиус лужи на земле (×радиус), 0 = лужи нет
  puddleMul: number;   // множитель урона лужи от урона врага
}
export const SIGNATURES: Record<SignatureKind, SignatureProfile> = {
  weaponSweep:  { windup: 0.10, strike: 0.12, recover: 0.10, contact: 0.55, window: 0.05, reach: 1.35, damageMul: 1.00, shake: 2, puddle: 0, puddleMul: 0 },
  slimeSlam:    { windup: 0.30, strike: 0.16, recover: 0.24, contact: 0.62, window: 0.07, reach: 1.25, damageMul: 1.15, shake: 5, puddle: 1.40, puddleMul: 0.35 },
  pounce:       { windup: 0.26, strike: 0.14, recover: 0.18, contact: 0.55, window: 0.06, reach: 1.45, damageMul: 1.25, shake: 3, puddle: 0, puddleMul: 0 },
  legStab:      { windup: 0.22, strike: 0.12, recover: 0.18, contact: 0.50, window: 0.06, reach: 1.35, damageMul: 1.05, shake: 2, puddle: 0, puddleMul: 0 },
  quakeSlam:    { windup: 0.34, strike: 0.18, recover: 0.30, contact: 0.60, window: 0.07, reach: 1.60, damageMul: 1.35, shake: 8, puddle: 0, puddleMul: 0 },
  wingBuffet:   { windup: 0.24, strike: 0.14, recover: 0.20, contact: 0.50, window: 0.06, reach: 1.50, damageMul: 0.95, shake: 3, puddle: 0, puddleMul: 0 },
  shardBurst:   { windup: 0.34, strike: 0.12, recover: 0.22, contact: 0.45, window: 0.06, reach: 1.70, damageMul: 1.10, shake: 4, puddle: 0, puddleMul: 0 },
  shadowLash:   { windup: 0.26, strike: 0.12, recover: 0.20, contact: 0.48, window: 0.06, reach: 1.55, damageMul: 1.05, shake: 2, puddle: 0, puddleMul: 0 },
  gazeBeam:     { windup: 0.40, strike: 0.14, recover: 0.20, contact: 0.35, window: 0.06, reach: 2.20, damageMul: 1.00, shake: 3, puddle: 0, puddleMul: 0 },
  spiritDrain:  { windup: 0.36, strike: 0.16, recover: 0.22, contact: 0.55, window: 0.07, reach: 1.30, damageMul: 0.85, shake: 2, puddle: 0, puddleMul: 0 },
  beetleRam:    { windup: 0.24, strike: 0.14, recover: 0.16, contact: 0.52, window: 0.06, reach: 1.40, damageMul: 1.20, shake: 3, puddle: 0, puddleMul: 0 },
  dragonBreath: { windup: 0.38, strike: 0.16, recover: 0.22, contact: 0.42, window: 0.07, reach: 2.60, damageMul: 1.10, shake: 4, puddle: 1.10, puddleMul: 0.30 },
  webSpit:      { windup: 0.32, strike: 0.10, recover: 0.18, contact: 0.40, window: 0.05, reach: 0.60, damageMul: 1.00, shake: 1, puddle: 0.90, puddleMul: 0.20 },
  spitBolt:     { windup: 0.30, strike: 0.10, recover: 0.16, contact: 0.40, window: 0.05, reach: 0.60, damageMul: 1.00, shake: 1, puddle: 1.00, puddleMul: 0.25 },
  shardVolley:  { windup: 0.34, strike: 0.10, recover: 0.18, contact: 0.38, window: 0.05, reach: 0.60, damageMul: 1.00, shake: 1, puddle: 0, puddleMul: 0 },
  darkBolt:     { windup: 0.32, strike: 0.10, recover: 0.18, contact: 0.38, window: 0.05, reach: 0.60, damageMul: 1.00, shake: 1, puddle: 0, puddleMul: 0 },
  stormBolt:    { windup: 0.30, strike: 0.10, recover: 0.16, contact: 0.38, window: 0.05, reach: 0.60, damageMul: 1.00, shake: 1, puddle: 0, puddleMul: 0 },
};
// === STEP 1. КАКАЯ АТАКА СООТВЕТСТВУЕТ ФОРМЕ ТЕЛА (ближний / дальний бой) ===
export const SIGNATURE_BY_SHAPE: Record<EnemyShape, { melee: SignatureKind; ranged: SignatureKind }> = {
  blob:     { melee: 'slimeSlam',   ranged: 'spitBolt' },
  beetle:   { melee: 'beetleRam',   ranged: 'spitBolt' },
  spider:   { melee: 'legStab',     ranged: 'webSpit' },
  shadow:   { melee: 'shadowLash',  ranged: 'darkBolt' },
  bat:      { melee: 'wingBuffet',  ranged: 'darkBolt' },
  crystal:  { melee: 'shardBurst',  ranged: 'shardVolley' },
  gargoyle: { melee: 'wingBuffet',  ranged: 'shardVolley' },
  skeleton: { melee: 'weaponSweep', ranged: 'darkBolt' },
  golem:    { melee: 'quakeSlam',   ranged: 'shardVolley' },
  imp:      { melee: 'weaponSweep', ranged: 'stormBolt' },
  wolf:     { melee: 'pounce',      ranged: 'pounce' },
  humanoid: { melee: 'weaponSweep', ranged: 'stormBolt' },
  eye:      { melee: 'gazeBeam',    ranged: 'gazeBeam' },
  spirit:   { melee: 'spiritDrain', ranged: 'stormBolt' },
  dragon:   { melee: 'wingBuffet',  ranged: 'dragonBreath' },
};
/** Органическая атака по форме тела; рывок (charger) использует ближний вариант. */
export function signatureFor(shape: EnemyShape, attackType: EnemyAttackType): SignatureKind {
  const pair = SIGNATURE_BY_SHAPE[shape] || SIGNATURE_BY_SHAPE.blob;
  return attackType === 'ranged' ? pair.ranged : pair.melee;
}
export function signatureProfile(kind: SignatureKind): SignatureProfile {
  return SIGNATURES[kind] || SIGNATURES.weaponSweep;
}
export function signatureDuration(kind: SignatureKind): number {
  const p = signatureProfile(kind);
  return p.windup + p.strike + p.recover;
}
/** Фаза анимации и её локальный прогресс 0..1 (для выбора кадра спрайта). */
export function signaturePhase(kind: SignatureKind, t: number): { phase: 'windup' | 'strike' | 'recover'; k: number } {
  const p = signatureProfile(kind), dur = signatureDuration(kind);
  const w = p.windup / dur, s = p.strike / dur;
  if (t < w) return { phase: 'windup', k: w <= 0 ? 1 : t / w };
  if (t < w + s) return { phase: 'strike', k: s <= 0 ? 1 : (t - w) / s };
  return { phase: 'recover', k: p.recover <= 0 ? 1 : Math.min(1, (t - w - s) / (p.recover / dur)) };
}
/** Поза тела: доли радиуса (lift/lean) и множители сжатия (squash). */
export interface SignaturePose {
  lift: number;     // вверх (<0) — прыжок/подъём корпуса
  lean: number;     // вперёд, в сторону цели (доли радиуса)
  squashX: number;  // растяжение по X
  squashY: number;  // растяжение по Y (<1 = расплющивание)
  roll: number;     // наклон, радианы
  ground: number;   // 0..1 «вес» удара по земле — для пыли/тряски
}
function pose(lift = 0, lean = 0, squashX = 1, squashY = 1, roll = 0, ground = 0): SignaturePose {
  return { lift, lean, squashX, squashY, roll, ground };
}
// === Специфика позы по анатомии: back/fwd — оттяг и выпад корпуса (доли радиуса),
// hop — высота прыжка, compress — поджатие на замахе, slam — расплющивание при ударе ===
interface PoseSpec { back: number; fwd: number; hop: number; compress: number; slam: number; tilt: number; }
const POSE_SPECS: Record<SignatureKind, PoseSpec> = {
  weaponSweep:  { back: 0.25, fwd: 0.55, hop: 0.00, compress: 0.05, slam: 0.04, tilt: 0.00 },
  slimeSlam:    { back: 0.20, fwd: 0.45, hop: 0.95, compress: 0.30, slam: 0.38, tilt: 0.00 },
  pounce:       { back: 0.30, fwd: 0.85, hop: 1.05, compress: 0.14, slam: 0.20, tilt: 0.22 },
  legStab:      { back: 0.22, fwd: 0.55, hop: 0.28, compress: 0.12, slam: 0.10, tilt: 0.16 },
  quakeSlam:    { back: 0.16, fwd: 0.30, hop: 0.34, compress: 0.10, slam: 0.28, tilt: 0.08 },
  wingBuffet:   { back: 0.24, fwd: 0.60, hop: 0.40, compress: 0.08, slam: 0.12, tilt: 0.18 },
  shardBurst:   { back: 0.10, fwd: 0.10, hop: 0.00, compress: 0.14, slam: 0.20, tilt: 0.04 },
  shadowLash:   { back: 0.34, fwd: 0.95, hop: 0.00, compress: 0.08, slam: 0.10, tilt: 0.30 },
  gazeBeam:     { back: 0.06, fwd: 0.04, hop: 0.00, compress: 0.16, slam: 0.06, tilt: 0.00 },
  spiritDrain:  { back: 0.20, fwd: 0.30, hop: 0.00, compress: 0.12, slam: 0.16, tilt: 0.00 },
  beetleRam:    { back: 0.40, fwd: 0.80, hop: 0.12, compress: 0.10, slam: 0.08, tilt: 0.12 },
  dragonBreath: { back: 0.34, fwd: 0.42, hop: 0.10, compress: 0.10, slam: 0.10, tilt: 0.12 },
  webSpit:      { back: 0.34, fwd: 0.42, hop: 0.10, compress: 0.10, slam: 0.10, tilt: 0.12 },
  spitBolt:     { back: 0.34, fwd: 0.42, hop: 0.10, compress: 0.10, slam: 0.10, tilt: 0.12 },
  shardVolley:  { back: 0.34, fwd: 0.42, hop: 0.10, compress: 0.10, slam: 0.10, tilt: 0.12 },
  darkBolt:     { back: 0.34, fwd: 0.42, hop: 0.10, compress: 0.10, slam: 0.10, tilt: 0.12 },
  stormBolt:    { back: 0.34, fwd: 0.42, hop: 0.10, compress: 0.10, slam: 0.10, tilt: 0.12 },
};
function smoothstep(k: number): number {
  const x = Math.max(0, Math.min(1, k));
  return x * x * (3 - 2 * x);
}
/** Выпад корпуса: оттяг назад на замахе → хлыст вперёд к контакту → возврат в стойку. */
function leanCurve(kind: SignatureKind, t: number, back: number, fwd: number): number {
  const p = signatureProfile(kind), dur = signatureDuration(kind);
  const w = p.windup / dur;                                            // конец замаха
  const tc = (p.windup + p.strike * p.contact) / dur;                   // кадр контакта
  if (t <= w) return -back * smoothstep(w <= 0 ? 1 : t / w);
  if (t <= tc) return -back + (back + fwd) * smoothstep((t - w) / Math.max(1e-6, tc - w));
  return fwd * (1 - smoothstep((t - tc) / Math.max(1e-6, 1 - tc)));
}
/**
 * Поза тела в момент t (0..1 всей атаки), непрерывная на границах фаз:
 * замах поджимает (или приподнимает) корпус, удар бросает его — приземление ровно
 * в кадре контакта, — а возврат плавно снимает расплющивание. Без рывков и телепортов.
 */
export function signaturePose(kind: SignatureKind, t: number): SignaturePose {
  const spec = POSE_SPECS[kind] || POSE_SPECS.weaponSweep;
  const ph = signaturePhase(kind, t), k = ph.k;
  const landAt = Math.min(0.9, Math.max(0.35, signatureProfile(kind).contact));
  const bump = Math.sin(k * Math.PI);                                   // 0 → 1 → 0 внутри фазы
  const hop = k < landAt ? Math.sin((k / landAt) * Math.PI * 0.5) : Math.max(0, 1 - (k - landAt) / (1 - landAt));
  const impact = k < landAt ? 0 : Math.min(1, (k - landAt) / (1 - landAt));
  const lean = leanCurve(kind, t, spec.back, spec.fwd);
  const tilt = spec.tilt * (spec.back + spec.fwd > 0 ? lean / (spec.back + spec.fwd) : 0);
  if (ph.phase === 'windup') {
    const sink = spec.hop > 0.3 ? spec.compress : 0;          // прыгающие поджимаются вниз
    const raise = spec.hop <= 0.3 ? spec.compress * 0.6 : 0;  // остальные тянутся вверх
    return pose((sink - raise) * bump, lean, 1 + (sink * 0.8 + raise * 0.5) * bump, 1 - (sink + raise) * bump, tilt, 0);
  }
  if (ph.phase === 'strike') {
    return pose(-spec.hop * hop, lean, 1 + spec.slam * 0.9 * impact, 1 - spec.slam * impact, tilt, impact);
  }
  return pose(0, lean, 1 + spec.slam * 0.9 * (1 - k), 1 - spec.slam * (1 - k), tilt, 1 - k);
}
// === STEP 2. МОМЕНТ ФИЗИЧЕСКОГО КОНТАКТА (урон только здесь, не по таймеру) ===
export function signatureImpact(kind: SignatureKind, t: number): number {
  const p = signatureProfile(kind), dur = signatureDuration(kind);
  const tc = (p.windup + p.strike * p.contact) / dur;
  const d = Math.abs(t - tc);
  return d >= p.window ? 0 : 1 - d / p.window;
}
/** Дальность удара в мировых пикселях. У боссов — заметно дальше: у них оружие
 *  размером с героя, поэтому бой с боссом идёт на его дистанции, а не «в упор». */
export function signatureReach(kind: SignatureKind, radius: number, isBoss: boolean): number {
  return radius * signatureProfile(kind).reach * (isBoss ? 1.3 : 1);
}
// === STEP 3. ВИЗУАЛ: у каждой анатомии свой «язык» удара ===
export interface SignatureView {
  x: number;
  y: number;
  r: number;
  angle: number;      // направление на цель, радианы
  t: number;          // 0..1 прогресс атаки
  color: string;
  element?: Element;
  isBoss: boolean;
}
/** Цвет стихии (используется и движком, и модулем). */
export function elementColor(element: Element | undefined, fallback: string): string {
  switch (element) {
    case 'fire': return '#ff8a3a';
    case 'ice': return '#8fd8ff';
    case 'storm': return '#ffe14a';
    case 'dark': return '#a86ad8';
    case 'poison': return '#7fd44a';
    default: return fallback;
  }
}
/** Отрисовка signature-атаки. Оружие (weaponSweep) рисует движок — здесь no-op. */
export function drawSignature(ctx: CanvasRenderingContext2D, kind: SignatureKind, v: SignatureView): void {
  if (kind === 'weaponSweep') return;
  const ph = signaturePhase(kind, v.t), k = ph.k;
  const impact = signatureImpact(kind, v.t);
  const el = elementColor(v.element, v.color);
  const cos = Math.cos(v.angle), sin = Math.sin(v.angle);
  const px = v.x + cos * v.r * 0.5, py = v.y + sin * v.r * 0.5;
  ctx.save();
  switch (kind) {
    // СЛИЗЕНЬ: растекание под телом → брызги кислоты → расширяющееся кольцо
    case 'slimeSlam': {
      const flat = ph.phase === 'windup' ? k : ph.phase === 'recover' ? 1 - k : 1;
      ctx.globalAlpha = 0.22 + 0.30 * flat;
      ctx.fillStyle = el;
      ctx.beginPath();
      ctx.ellipse(v.x, v.y + v.r * 0.72, v.r * (0.85 + 0.45 * flat), v.r * 0.26 * (1 + 0.5 * flat), 0, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 3; i++) {
        const a = v.t * 6 + i * 2.1;
        ctx.globalAlpha = 0.35 + 0.35 * flat;
        ctx.beginPath();
        ctx.arc(v.x + Math.cos(a) * v.r * 0.55, v.y + v.r * 0.66 - Math.abs(Math.sin(a)) * v.r * 0.3, v.r * 0.07, 0, Math.PI * 2);
        ctx.fill();
      }
      if (impact > 0) {
        const ring = 1 - impact;
        ctx.globalAlpha = impact * 0.85;
        ctx.strokeStyle = el;
        ctx.lineWidth = 3 * impact + 1;
        ctx.beginPath();
        ctx.ellipse(v.x, v.y + v.r * 0.7, v.r * (0.9 + ring * 1.5), v.r * 0.35 * (0.8 + ring * 1.4), 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = el;
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * Math.PI * 2 + v.x * 0.07;
          const d = v.r * (0.8 + ring * 0.9);
          ctx.globalAlpha = impact * 0.8;
          ctx.fillRect(v.x + Math.cos(a) * d * 1.5, v.y + v.r * 0.7 + Math.sin(a) * d * 0.5 - ring * v.r * 0.5, 3, 6);
        }
      }
      break;
    }
    // ВОЛК: полосы разгона позади + след когтей в точке укуса
    case 'pounce': {
      if (ph.phase !== 'windup') {
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = el;
        ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
          const off = (i - 1.5) * v.r * 0.3;
          ctx.beginPath();
          ctx.moveTo(v.x - cos * v.r * (1.1 + i * 0.25), v.y - sin * v.r * (1.1 + i * 0.25) - off * 0.4);
          ctx.lineTo(v.x - cos * v.r * (2.1 + i * 0.35), v.y - sin * v.r * (2.1 + i * 0.35) - off * 0.6);
          ctx.stroke();
        }
      }
      if (impact > 0) {
        ctx.globalAlpha = impact;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
          const off = (i - 1) * v.r * 0.28;
          ctx.beginPath();
          ctx.moveTo(px + cos * v.r * 0.4, py + sin * v.r * 0.4 - off);
          ctx.lineTo(px + cos * v.r * 1.5, py + sin * v.r * 1.5 - off);
          ctx.stroke();
        }
      }
      break;
    }
    // ПАУК: вскидывается и бьёт лапами вперёд
    case 'legStab': {
      const ext = ph.phase === 'windup' ? -0.3 * k : ph.phase === 'recover' ? 0.75 * (1 - k) : 0.75;
      ctx.globalAlpha = 0.75;
      ctx.strokeStyle = el;
      ctx.lineWidth = v.isBoss ? 3 : 2;
      for (let i = 0; i < 4; i++) {
        const off = (i - 1.5) * 0.36;
        const sx = v.x + cos * off * v.r * 0.5 - sin * off * v.r * 0.7;
        const sy = v.y + sin * off * v.r * 0.5 + cos * off * v.r * 0.7;
        const ex = v.x + cos * v.r * (0.6 + ext) - sin * off * v.r * 0.9;
        const ey = v.y + sin * v.r * (0.6 + ext) + cos * off * v.r * 0.9;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo((sx + ex) / 2, (sy + ey) / 2 - v.r * 0.35);
        ctx.lineTo(ex, ey);
        ctx.stroke();
      }
      if (impact > 0) {
        ctx.globalAlpha = impact;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(px + cos * v.r, py + sin * v.r, v.r * 0.18 * impact, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    // ГОЛЕМ: кулаки вверх → удар по земле → пыль и обломки
    case 'quakeSlam': {
      if (ph.phase === 'windup') {
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = el;
        ctx.fillRect(v.x - v.r * 0.85, v.y - v.r * (0.6 + 1.1 * k), v.r * 0.4, v.r * 0.4);
        ctx.fillRect(v.x + v.r * 0.45, v.y - v.r * (0.6 + 1.1 * k), v.r * 0.4, v.r * 0.4);
      }
      if (impact > 0) {
        const ring = 1 - impact;
        ctx.globalAlpha = impact * 0.7;
        ctx.strokeStyle = '#cdb79a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(v.x, v.y + v.r * 0.75, v.r * (0.9 + ring * 2.2), v.r * 0.4 * (0.8 + ring * 2), 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#8a7a62';
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + v.x * 0.05;
          const d = v.r * (0.7 + ring * 1.2);
          ctx.globalAlpha = impact * 0.9;
          ctx.fillRect(v.x + Math.cos(a) * d, v.y + v.r * 0.55 + Math.sin(a) * d * 0.4 - ring * v.r * 0.9, 5, 5);
        }
      }
      break;
    }
    // ЖУК: поджимается → таранит рогом, поднимая пыль
    case 'beetleRam': {
      const push = ph.phase === 'windup' ? -0.25 * k : ph.phase === 'recover' ? 0.85 * (1 - k) : 0.85;
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = el;
      ctx.beginPath();
      ctx.moveTo(v.x + cos * v.r * (0.7 + push), v.y + sin * v.r * (0.7 + push));
      ctx.lineTo(v.x + cos * v.r * (0.1 + push) - sin * v.r * 0.3, v.y + sin * v.r * (0.1 + push) + cos * v.r * 0.3);
      ctx.lineTo(v.x + cos * v.r * (0.1 + push) + sin * v.r * 0.3, v.y + sin * v.r * (0.1 + push) - cos * v.r * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#d8d0b8';
      for (let i = 0; i < 4; i++) {
        const a = v.t * 9 + i * 1.7;
        ctx.fillRect(v.x - cos * v.r * (0.6 + i * 0.35) + Math.sin(a) * v.r * 0.2, v.y + v.r * 0.6 + Math.cos(a) * v.r * 0.15, 4, 3);
      }
      break;
    }
    // КРЫЛЬЯ: взмах вверх → порыв воздуха двумя дугами
    case 'wingBuffet': {
      const flare = ph.phase === 'windup' ? k : ph.phase === 'recover' ? 1 - k : 1;
      ctx.globalAlpha = 0.25 + 0.35 * flare;
      ctx.strokeStyle = el;
      ctx.lineWidth = v.isBoss ? 4 : 2.5;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(v.x, v.y);
        ctx.quadraticCurveTo(
          v.x + cos * v.r * 1.1 - sin * side * v.r * (0.9 + flare * 0.7),
          v.y + sin * v.r * 1.1 + cos * side * v.r * (0.9 + flare * 0.7),
          v.x + cos * v.r * (1.6 + flare * 0.8),
          v.y + sin * v.r * (1.6 + flare * 0.8) - v.r * 0.2,
        );
        ctx.stroke();
      }
      if (impact > 0) {
        ctx.globalAlpha = impact * 0.6;
        ctx.fillStyle = '#e8e2d0';
        for (let i = 0; i < 5; i++) {
          const off = (i - 2) * v.r * 0.3;
          ctx.fillRect(v.x + cos * v.r * (1.2 + i * 0.25) - sin * off, v.y + sin * v.r * (1.2 + i * 0.25) + cos * off, 4, 3);
        }
      }
      break;
    }
    // КРИСТАЛЛ: накопление → разлёт осколков по кругу
    case 'shardBurst': {
      const grow = ph.phase === 'windup' ? k : ph.phase === 'recover' ? 1 - k * 0.4 : 1;
      ctx.globalAlpha = 0.35 + 0.45 * grow;
      ctx.fillStyle = el;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + v.t * 2.5;
        const d = v.r * (0.6 + grow * (impact > 0 ? 1.6 : 0.5));
        const bx = v.x + Math.cos(a) * d, by = v.y + Math.sin(a) * d;
        const len = v.r * (0.28 + 0.3 * grow);
        ctx.beginPath();
        ctx.moveTo(bx + Math.cos(a) * len, by + Math.sin(a) * len);
        ctx.lineTo(bx + Math.cos(a + 2.2) * len * 0.5, by + Math.sin(a + 2.2) * len * 0.5);
        ctx.lineTo(bx + Math.cos(a - 2.2) * len * 0.5, by + Math.sin(a - 2.2) * len * 0.5);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }
    // ТЕНЬ: щупальце вылетает вперёд и хлещет цель
    case 'shadowLash': {
      const ext = ph.phase === 'windup' ? 0.25 * k : ph.phase === 'recover' ? 1 - k * 0.8 : 1;
      ctx.globalAlpha = 0.30 + 0.45 * ext;
      ctx.strokeStyle = el;
      ctx.lineWidth = v.isBoss ? 6 : 4;
      ctx.beginPath();
      ctx.moveTo(v.x, v.y);
      ctx.quadraticCurveTo(
        v.x + cos * v.r * 1.4 - sin * v.r * 1.1 * (1 - ext),
        v.y + sin * v.r * 1.4 + cos * v.r * 1.1 * (1 - ext),
        v.x + cos * v.r * (1 + 2.2 * ext),
        v.y + sin * v.r * (1 + 2.2 * ext),
      );
      ctx.stroke();
      ctx.fillStyle = el;
      for (let i = 0; i < 5; i++) {
        const a = v.t * 4 + i * 1.3;
        ctx.globalAlpha = 0.3 * ext;
        ctx.beginPath();
        ctx.arc(v.x + cos * v.r * (0.6 + i * 0.35) + Math.sin(a) * v.r * 0.4, v.y + sin * v.r * (0.6 + i * 0.35) + Math.cos(a) * v.r * 0.4, v.r * 0.09, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    // ГЛАЗ: зрачок наливается светом → узкий луч до цели
    case 'gazeBeam': {
      const charge = ph.phase === 'windup' ? k : 1;
      const beam = ph.phase === 'windup' ? 0 : ph.phase === 'recover' ? 1 - k : 1;
      ctx.globalAlpha = 0.5 * charge;
      ctx.fillStyle = el;
      ctx.beginPath();
      ctx.arc(v.x, v.y, v.r * (0.22 + 0.3 * charge), 0, Math.PI * 2);
      ctx.fill();
      if (beam > 0) {
        ctx.globalAlpha = 0.85 * beam;
        ctx.strokeStyle = el;
        ctx.lineWidth = v.r * (0.22 + 0.16 * (1 - beam));
        ctx.beginPath();
        ctx.moveTo(v.x, v.y);
        ctx.lineTo(v.x + cos * v.r * 4.5, v.y + sin * v.r * 4.5);
        ctx.stroke();
        ctx.globalAlpha = beam;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = v.r * 0.1;
        ctx.beginPath();
        ctx.moveTo(v.x, v.y);
        ctx.lineTo(v.x + cos * v.r * 4.5, v.y + sin * v.r * 4.5);
        ctx.stroke();
      }
      break;
    }
    // ДУХ: кольца энергии сжимаются к телу, затем выброс
    case 'spiritDrain': {
      for (let i = 0; i < 3; i++) {
        const shrink = ph.phase === 'windup' ? 1 - k : k;
        const rr = v.r * (0.9 + i * 0.5 + shrink * 0.6);
        ctx.globalAlpha = 0.18 + 0.18 * (1 - i / 3);
        ctx.strokeStyle = el;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(v.x, v.y, rr, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (impact > 0) {
        ctx.globalAlpha = impact * 0.6;
        ctx.fillStyle = el;
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + v.t * 5;
          ctx.fillRect(v.x + Math.cos(a) * v.r * 1.6, v.y + Math.sin(a) * v.r * 1.6, 4, 4);
        }
      }
      break;
    }
    // ДРАКОН: вдох → конус дыхания стихией
    case 'dragonBreath': {
      const throwK = ph.phase === 'windup' ? 0.15 * k : ph.phase === 'recover' ? 1 - k * 0.7 : 1;
      const len = v.r * (1 + 5.2 * throwK);
      const spread = v.r * (0.35 + 0.75 * throwK);
      ctx.globalAlpha = 0.30 + 0.45 * throwK;
      ctx.fillStyle = el;
      ctx.beginPath();
      ctx.moveTo(v.x + cos * v.r * 0.6, v.y + sin * v.r * 0.6);
      ctx.lineTo(v.x + cos * len - sin * spread, v.y + sin * len + cos * spread);
      ctx.lineTo(v.x + cos * len + sin * spread, v.y + sin * len - cos * spread);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 0.7 * throwK;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(v.x + cos * len * 0.85, v.y + sin * len * 0.85, v.r * 0.3 * throwK, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    // ДАЛЬНИЕ ФОРМЫ: плевок/осколок/тьма/разряд — выброс из «рта» или ладони
    case 'webSpit':
    case 'spitBolt':
    case 'shardVolley':
    case 'darkBolt':
    case 'stormBolt': {
      const throwK = ph.phase === 'windup' ? 0.1 * k : ph.phase === 'recover' ? 1 - k : 1;
      ctx.globalAlpha = 0.35 + 0.5 * throwK;
      ctx.fillStyle = el;
      ctx.beginPath();
      ctx.arc(px + cos * v.r * (0.5 + 1.1 * throwK), py + sin * v.r * (0.5 + 1.1 * throwK), v.r * (0.16 + 0.16 * throwK), 0, Math.PI * 2);
      ctx.fill();
      if (kind === 'shardVolley' || kind === 'darkBolt') {
        ctx.globalAlpha = 0.6 * throwK;
        for (let i = 0; i < 3; i++) {
          ctx.fillRect(px + cos * v.r * (0.4 + i * 0.4 + throwK), py + sin * v.r * (0.4 + i * 0.4 + throwK) + (i - 1) * 3, 4, 4);
        }
      }
      break;
    }
    default:
      break;
  }
  ctx.restore();
}

