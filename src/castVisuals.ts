// ============================================================
// CAST OVERLAY — ВИДИМАЯ МАГИЯ: РУКА, СФЕРА, ПУТЬ СНАРЯДА
// ============================================================
// ПРОБЛЕМА. Снаряд летел из центра тела, а «замах» был только в позе
// корпуса: игрок видел, что монстр поджался, и получал шар в лицо. Ни руки,
// ни сферы, ни понимания, ОТКУДА прилетит. Модуль рисует поверх спрайта:
//   1) свободную руку, поднятую и согнутую в локте (~90°) — тот самый жест;
//   2) сферу стихии в ладони, разгорающуюся к моменту выпуска;
//   3) ПУНКТИРНЫЙ ПУТЬ от ладони к цели — куда именно уйдёт атака;
//   4) 8-паучьи лапы, взводимые перед укусом (их видно ДО удара).
//
// Модуль получает только ctx и числа: движок решает КОГДА, модуль — КАК.
// ============================================================
import type { Element } from './types';
import { elementColor } from './signatureAttacks';
import { CAST_POSES, armPoints, castMuzzle, type CastStyle } from './castCore';

/** Прозрачность «#rrggbb» → rgba(...). Локальная копия: модуль автономен. */
function rgba(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const n = h.length === 3
    ? parseInt(h.split('').map(ch => ch + ch).join(''), 16)
    : parseInt(h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export interface CastArmView {
  /** Центр тела в мире. */
  x: number;
  y: number;
  /** Радиус врага (доля спрайта) — все длины считаются от него. */
  r: number;
  /** Направление на цель (или зафиксированный аим), радианы. */
  angle: number;
  /** Зеркало: +1 спрайт смотрит вправо, -1 — влево (faceDir врага). */
  face: number;
  style: CastStyle;
  /** Прогресс каста 0..1. */
  t: number;
  /** Фаза каста. */
  phase: 'windup' | 'active' | 'recover';
  /** 0..1 яркость сферы (см. handGlowLevel). */
  glow: number;
  /** 0..1 насколько вытянута рука (см. armReach). */
  reach: number;
  element?: Element;
  /** Цвет тела — фолбэк, если стихии нет. */
  color: string;
  isBoss: boolean;
  /** Для паука — сколько лап взводить (0 = не паук). */
  spiderLegs?: number;
}

/**
 * ПЕРЕВОД В МИРОВЫЕ КООРДИНАТЫ. Поза задана «лицом вправо»; если тварь
 * смотрит влево, X отражается, а любое смещение по X — вместе с ним.
 * Угол же остаётся мировым: он уже пришёл из движка.
 */
function toWorld(v: CastArmView, localX: number, localY: number): { x: number; y: number } {
  const sx = v.face < 0 ? -localX : localX;
  return { x: v.x + sx * v.r, y: v.y + localY * v.r };
}

/** Точка ладони в мире — нужна и отрисовке, и старту снаряда. */
export function palmWorld(v: CastArmView): { x: number; y: number } {
  const p = CAST_POSES[v.style];
  const a = armPoints(p.rig, v.reach);
  return toWorld(v, a.hand.x, a.hand.y);
}

/** Точка выпуска снаряда в мире (ладонь/плечо/земля по стилю). */
export function muzzleWorld(v: CastArmView): { x: number; y: number } {
  const m = castMuzzle(v.style, v.reach);
  return toWorld(v, m.x, m.y);
}

/**
 * РИСУЕТ ПОЗУ КАСТА. Всё уже в системе врага (ctx сдвинут в его центр), но
 * без масштаба спрайта: длины считаем в экранных пикселях от r, иначе на
 * боссах 2.5× сфера уезжала бы за кадр.
 */
function limbQuad(
  ctx: CanvasRenderingContext2D,
  ax: number, ay: number, bx: number, by: number,
  wa: number, wb: number,
): void {
  const dx = bx - ax, dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  ctx.beginPath();
  ctx.moveTo(ax + nx * wa, ay + ny * wa);
  ctx.lineTo(bx + nx * wb, by + ny * wb);
  ctx.lineTo(bx - nx * wb, by - ny * wb);
  ctx.lineTo(ax - nx * wa, ay - ny * wa);
  ctx.closePath();
}

export function drawCastArm(ctx: CanvasRenderingContext2D, v: CastArmView, now: number): void {
  const p = CAST_POSES[v.style];
  const el = elementColor(v.element, v.color);
  const a = armPoints(p.rig, v.reach);
  const g = Math.max(0, Math.min(1, v.glow));
  const sh = toWorld(v, a.shoulder.x, a.shoulder.y);
  const elb = toWorld(v, a.elbow.x, a.elbow.y);
  const hand = toWorld(v, a.hand.x, a.hand.y);
  const shake = v.phase === 'windup' ? Math.sin(now * 34) * g * v.r * 0.028 : 0;
  const wUp = v.r * (v.isBoss ? 0.105 : 0.125);
  const wElb = wUp * 0.84;
  const wWr = wUp * 0.62;
  const outline = Math.max(1, wUp * 0.30);

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // 1) Тёмный контур по всей конечности — рука читается на любом фоне.
  ctx.strokeStyle = rgba('#08080f', 0.9);
  ctx.lineWidth = wUp * 1.32;
  ctx.beginPath();
  ctx.moveTo(sh.x, sh.y + shake);
  ctx.lineTo(elb.x, elb.y + shake);
  ctx.lineTo(hand.x, hand.y + shake);
  ctx.stroke();

  // 2) Два СУЖАЮЩИХСЯ сегмента вместо «палки»: плечо→локоть, локоть→кисть.
  limbQuad(ctx, sh.x, sh.y + shake, elb.x, elb.y + shake, wUp, wElb);
  ctx.fillStyle = rgba(v.color, 1);
  ctx.fill();
  ctx.strokeStyle = rgba('#08080f', 0.9);
  ctx.lineWidth = outline;
  ctx.stroke();
  limbQuad(ctx, elb.x, elb.y + shake, hand.x, hand.y + shake, wElb, wWr);
  ctx.fill();
  ctx.stroke();
  ctx.lineWidth = outline * 0.9;
  ctx.stroke();

  // 3) Контровой блик по верхней кромке — конечность выглядит объёмной.
  ctx.strokeStyle = rgba('#ffffff', 0.28);
  ctx.lineWidth = Math.max(1, wUp * 0.20);
  ctx.beginPath();
  ctx.moveTo(sh.x - wUp * 0.32, sh.y - wUp * 0.32 + shake);
  ctx.lineTo(elb.x - wElb * 0.32, elb.y - wElb * 0.32 + shake);
  ctx.lineTo(hand.x - wWr * 0.32, hand.y - wWr * 0.32 + shake);
  ctx.stroke();

  // 4) Суставы: плечо, локоть, запястье — иначе «буква Г» не читается.
  const joints: Array<[{ x: number; y: number }, number]> = [[sh, wUp], [elb, wElb], [hand, wWr]];
  for (const [j, w] of joints) {
    ctx.fillStyle = rgba('#08080f', 0.9);
    ctx.beginPath();
    ctx.arc(j.x, j.y + shake, w * 1.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(v.color, 1);
    ctx.beginPath();
    ctx.arc(j.x, j.y + shake, w * 0.88, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba('#ffffff', 0.26);
    ctx.beginPath();
    ctx.arc(j.x - w * 0.28, j.y - w * 0.32 + shake, w * 0.30, 0, Math.PI * 2);
    ctx.fill();
  }

  // 5) КИСТЬ: ладонь эллипсом + четыре пальца, сжатые вокруг сферы.
  const hAng = Math.atan2(hand.y - elb.y, hand.x - elb.x);
  const palmW = wWr * 1.6;
  ctx.fillStyle = rgba('#08080f', 0.9);
  ctx.beginPath();
  ctx.ellipse(hand.x, hand.y + shake, palmW * 1.2, palmW * 1.34, hAng, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba(v.color, 1);
  ctx.beginPath();
  ctx.ellipse(hand.x, hand.y + shake, palmW, palmW * 1.14, hAng, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = rgba('#08080f', 0.85);
  ctx.lineWidth = Math.max(1, wWr * 0.34);
  for (let i = 0; i < 4; i++) {
    const fa = hAng + (i - 1.5) * 0.46;
    const fl = palmW * (1.55 - Math.abs(i - 1.5) * 0.24);
    ctx.beginPath();
    ctx.moveTo(hand.x, hand.y + shake);
    ctx.lineTo(hand.x + Math.cos(fa) * fl, hand.y + shake + Math.sin(fa) * fl);
    ctx.stroke();
  }

  // 6) СФЕРА В ЛАДОНИ — «двигатель» атаки. Пока она не разгорелась, урона
  //    не будет: игрок читает замах по её размеру и яркости.
  if (p.orb || g > 0.05) {
    const orbR = v.r * p.rig.palmR * (0.55 + 0.75 * g) * (v.isBoss ? 1.35 : 1);
    const hx = hand.x, hy = hand.y + shake;
    const grad = ctx.createRadialGradient(hx, hy, 0, hx, hy, orbR * 2.6);
    grad.addColorStop(0, rgba('#ffffff', 0.85 * g));
    grad.addColorStop(0.28, rgba(el, 0.75 * g));
    grad.addColorStop(1, rgba(el, 0));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(hx, hy, orbR * 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(el, 0.9 * Math.max(0.25, g));
    ctx.beginPath();
    ctx.arc(hx, hy, orbR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba('#ffffff', 0.7 * g);
    ctx.beginPath();
    ctx.arc(hx, hy, orbR * 0.42, 0, Math.PI * 2);
    ctx.fill();
    // Искры-орбиты: энергия «живая», и видно, куда уйдёт удар.
    ctx.fillStyle = rgba(el, 0.85 * g);
    for (let i = 0; i < 3; i++) {
      const ang = now * 4 + (i * Math.PI * 2) / 3;
      ctx.beginPath();
      ctx.arc(hx + Math.cos(ang) * orbR * 1.9, hy + Math.sin(ang) * orbR * 1.2,
        Math.max(1, orbR * 0.22), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/**
 * ПУТЬ АТАКИ ОТ ЛАДОНИ. Пунктир от сферы до точки прицела: игрок видит не
 * только «куда смотрит монстр», а ОТКУДА и КУДА полетит. Раньше снаряд
 * появлялся из тела и летел — предсказать точку старта было нельзя.
 */
export function drawCastPath(ctx: CanvasRenderingContext2D, v: CastArmView, length: number): void {
  const p = CAST_POSES[v.style];
  const el = elementColor(v.element, v.color);
  const m = muzzleWorld(v);
  const dx = Math.cos(v.angle), dy = Math.sin(v.angle);
  const g = Math.max(0, Math.min(1, v.glow));
  ctx.save();
  ctx.globalAlpha = 0.20 + 0.55 * g;
  ctx.strokeStyle = rgba(el, 0.9);
  ctx.lineWidth = Math.max(1, v.r * 0.05);
  ctx.setLineDash([Math.max(3, v.r * 0.16), Math.max(4, v.r * 0.22)]);
  ctx.lineDashOffset = -(v.t * v.r * 1.2);
  ctx.beginPath();
  ctx.moveTo(m.x, m.y);
  ctx.lineTo(m.x + dx * length, m.y + dy * length);
  ctx.stroke();
  ctx.setLineDash([]);
  // Стрелка на конце: читается «куда», даже если пунктир сливается с полом.
  const ax = m.x + dx * length, ay = m.y + dy * length;
  ctx.globalAlpha = 0.3 + 0.55 * g;
  ctx.fillStyle = rgba(el, 0.95);
  ctx.beginPath();
  ctx.moveTo(ax + dx * v.r * 0.22, ay + dy * v.r * 0.22);
  ctx.lineTo(ax - dy * v.r * 0.13 - dx * v.r * 0.06, ay + dx * v.r * 0.13 - dy * v.r * 0.06);
  ctx.lineTo(ax + dy * v.r * 0.13 - dx * v.r * 0.06, ay - dx * v.r * 0.13 - dy * v.r * 0.06);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  void p;
}

/**
 * ЛАПЫ ПАУКА В МИРЕ. Укус паука — не «толчок телом»: паук ВСКИДЫВАЕТ
 * переднюю пару лап, раскрывает их над головой и смыкает на цель. Раньше
 * этого не было видно вообще: спрайт просто менял кадр, и «укус» читался
 * как удар невидимым предметом.
 *
 * Лапы рисуются с суставом (бедро → голень → коготь), поэтому сгибаются
 * по-настоящему: на замахе поднимаются и разводятся, в ударе — сходятся
 * вперёд и вниз, после — медленно возвращаются в стойку.
 *
 * @param raise 0..1 — насколько лапы взведены (0 = стойка, 1 = полный вскид).
 * @param close 0..1 — насколько лапы СОШЛИСЬ вперёд (момент укуса).
 */
export function drawSpiderLegs(
  ctx: CanvasRenderingContext2D, v: CastArmView, now: number, raise: number, close: number,
): void {
  const legs = v.spiderLegs || 0;
  if (legs <= 0) return;
  const el = elementColor(v.element, v.color);
  const face = v.face < 0 ? -1 : 1;
  const rise = Math.max(0, Math.min(1, raise));
  const snap = Math.max(0, Math.min(1, close));
  const bodyCol = rgba(v.color, 0.95);
  const jointCol = rgba(el, 0.85);
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < legs; i++) {
    const side = i % 2 === 0 ? -1 : 1;                  // верхняя/нижняя пара
    const pair = Math.floor(i / 2);                     // 0 = передняя пара
    // Базовая стойка: лапы отходят назад и в стороны. Вскид поднимает их
    // ВПЕРЁД и ВВЕРХ, смыкание тянет к центру — «объятие» перед укусом.
    const baseAng = side * (0.55 + pair * 0.42);
    const ang = baseAng * (1 - 0.55 * rise) - rise * 0.85 + snap * (0.85 + pair * 0.25);
    const len = v.r * (1.05 + pair * 0.22) * (1 + 0.30 * rise);
    const knee = v.r * 0.44 * (1 + 0.35 * rise);
    const sh = toWorld(v, 0.10 * face, -0.05 + side * 0.10 + pair * 0.06);
    const a1 = v.angle + ang * 0.55;
    const kx = sh.x + Math.cos(a1) * knee;
    const ky = sh.y + Math.sin(a1) * knee - rise * v.r * 0.30;
    const a2 = a1 + ang * 0.45 + snap * 0.5 - rise * 0.5;
    const tx = kx + Math.cos(a2) * len;
    const ty = ky + Math.sin(a2) * len + snap * v.r * 0.22;
    // Тень-подложка контура, потом сама лапа, потом коготь-искра.
    ctx.strokeStyle = rgba('#0a0a12', 0.5);
    ctx.lineWidth = Math.max(2.5, v.r * 0.13);
    ctx.beginPath();
    ctx.moveTo(sh.x, sh.y);
    ctx.lineTo(kx, ky);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    ctx.strokeStyle = bodyCol;
    ctx.lineWidth = Math.max(1.6, v.r * 0.085);
    ctx.beginPath();
    ctx.moveTo(sh.x, sh.y);
    ctx.lineTo(kx, ky);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    ctx.fillStyle = jointCol;
    ctx.beginPath();
    ctx.arc(kx, ky, Math.max(1.6, v.r * 0.075), 0, Math.PI * 2);
    ctx.fill();
    // Коготь: светится на замахе — видно, что сейчас будет укус.
    ctx.fillStyle = rgba(el, 0.35 + 0.6 * rise);
    ctx.beginPath();
    ctx.arc(tx, ty, Math.max(1.4, v.r * (0.055 + 0.05 * rise)), 0, Math.PI * 2);
    ctx.fill();
  }
  // Вспышка в момент смыкания: «хелицеры сошлись».
  if (snap > 0.05) {
    const cx = v.x + face * v.r * 0.55, cy = v.y + v.r * 0.05;
    ctx.globalAlpha = snap * 0.8;
    ctx.fillStyle = rgba(el, 0.85);
    ctx.beginPath();
    ctx.arc(cx, cy, v.r * (0.10 + 0.22 * snap), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    void now;
  }
  ctx.restore();
}

/**
 * ПОДПИСЬ ЗАМАХА: «ПЛЕВОК», «КОГТИ», «ТАРАН»… Одна короткая строка над
 * тварью в момент телеграфа. Игрок, который впервые видит монстра, сразу
 * понимает, ЧТО происходит, а не догадывается по урону.
 *
 * Подпись рисуется только во время замаха и гаснет к удару — никакого
 * спама поверх экрана.
 */
export function drawCastHint(
  ctx: CanvasRenderingContext2D, v: CastArmView, text: string,
): void {
  const g = Math.max(0, Math.min(1, v.glow));
  ctx.save();
  ctx.globalAlpha = 0.25 + 0.65 * g;
  ctx.font = `700 ${Math.max(10, Math.round(v.r * 0.30))}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  const y = v.y - v.r * 1.55;
  ctx.lineWidth = Math.max(2, v.r * 0.07);
  ctx.strokeStyle = rgba('#000000', 0.75);
  ctx.strokeText(text, v.x, y);
  ctx.fillStyle = rgba(elementColor(v.element, '#ffe9a8'), 0.98);
  ctx.fillText(text, v.x, y);
  ctx.restore();
}
