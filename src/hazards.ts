// === GROUND HAZARDS — ЛУЖИ И ЗОНЫ НА ЗЕМЛЕ (кислота, лёд, огонь). Независимый модуль ===
// Именно они делают signature-удары «лore-точными»: слизень бьёт массой и растекается,
// дракон оставляет горящий след, паук — паутинную зону.
import type { Element } from './types';
// === STEP 0. TUNING BLOCK ===
export const PUDDLE_TICK = 0.45;   // сек между тиками урона для стоящего внутри
export const PUDDLE_FADE = 1.1;    // сек затухания в конце жизни
export interface GroundPuddle {
  x: number;
  y: number;
  radius: number;
  life: number;
  maxLife: number;
  element: Element;
  damage: number;
  fromPlayer: boolean;
  tick: number;
  seed: number;
}
export function makePuddle(
  x: number,
  y: number,
  radius: number,
  element: Element,
  damage: number,
  fromPlayer: boolean,
  duration: number,
): GroundPuddle {
  return { x, y, radius, life: duration, maxLife: duration, element, damage, fromPlayer, tick: 0, seed: Math.random() * 1000 };
}
/** Тик урона вызывается ровно раз в PUDDLE_TICK секунд — движок решает, кого задело. */
export function updatePuddles(list: GroundPuddle[], dt: number, onTick: (puddle: GroundPuddle) => void): void {
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i];
    p.life -= dt;
    if (p.life <= 0) { list.splice(i, 1); continue; }
    p.tick -= dt;
    if (p.tick <= 0) { p.tick = PUDDLE_TICK; onTick(p); }
  }
}
export function insidePuddle(p: GroundPuddle, x: number, y: number, extra = 0): boolean {
  const dx = x - p.x, dy = (y - p.y) / 0.55;  // лужа на земле — сплюснутый эллипс
  const rr = p.radius + extra;
  return dx * dx + dy * dy <= rr * rr;
}
export function puddleColor(element: Element): string {
  switch (element) {
    case 'fire': return '#ff7b2f';
    case 'ice': return '#8fd8ff';
    case 'storm': return '#ffe14a';
    case 'dark': return '#7a3ab0';
    case 'poison': return '#8adf4f';
  }
}
/** Отрисовка луж — под врагами, «пиксельными» мазками с пузырями. */
export function drawPuddles(ctx: CanvasRenderingContext2D, list: GroundPuddle[], now: number): void {
  for (const p of list) {
    const fade = p.maxLife <= 0 ? 1 : Math.min(1, p.life / PUDDLE_FADE);
    const col = puddleColor(p.element);
    ctx.save();
    ctx.globalAlpha = 0.30 * fade;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, p.radius, p.radius * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.55 * fade;
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, p.radius * 0.85, p.radius * 0.47, 0, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 4; i++) {
      const a = p.seed + i * 1.9 + now * 0.9;
      const d = p.radius * (0.25 + 0.5 * ((i * 0.37 + p.seed * 0.01) % 1));
      const bx = p.x + Math.cos(a) * d;
      const by = p.y + Math.sin(a) * d * 0.5;
      ctx.globalAlpha = (0.35 + 0.35 * Math.sin(now * 3 + i)) * fade;
      ctx.beginPath();
      ctx.arc(bx, by, 2 + (i % 2), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
