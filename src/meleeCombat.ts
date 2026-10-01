import type { Element, EnemyShape, GaitKind } from './types';
import { ART_UNIT, SS, ART_N, WEAPON_UNIT, WEAPON_N, STAMP_UNIT, STAMP_N } from './monsterArt';
import { signatureProfile, signatureDuration, signatureReach } from './signatureAttacks';
import type { SignatureKind } from './signatureAttacks';
export { ART_UNIT, SS, ART_N, WEAPON_UNIT, WEAPON_N, STAMP_UNIT, STAMP_N };
export type MoveKind = 'walk' | 'flight' | 'leap' | 'ooze';
export type MeleeClass = 'melee' | 'ram';
export interface MeleeAbility {
  id: string;
  cls: MeleeClass;
  reach: number;
  damageMul: number;
  windup: number;
  contact: number;
  recover: number;
  cooldown: number;
  weight: number;
}
export interface Anatomy2D {
  legs: boolean;
  wings: boolean;
  bulk: number;
  hipY: number;
  neckY: number;
}
export interface Combatant {
  id: string;
  shape: EnemyShape;
  gait: GaitKind;
  radius: number;
  isBoss: boolean;
  element?: Element;
  weaponReach: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  alive: boolean;
}
export interface MoveState {
  phase: number;
  airborne: number;
  forward: number;
  bob: number;
  squash: number;
  speed: number;
}
export interface StrikeRect {
  x: number;
  y: number;
  w: number;
  h: number;
  reach: number;
}
export interface StrikeFrame {
  variant: string;
  contact: boolean;
  progress: number;
  handX: number;
  handY: number;
  tipX: number;
  tipY: number;
  stampSize: number;
  zone: StrikeRect;
}
export interface StrikeResult {
  hit: boolean;
  damage: number;
  frame: StrikeFrame;
}
const ANATOMY: Record<EnemyShape, Anatomy2D> = {
  humanoid: { legs: true, wings: false, bulk: 0.5, hipY: 0.64, neckY: 0.4 },
  skeleton: { legs: true, wings: false, bulk: 0.45, hipY: 0.64, neckY: 0.4 },
  imp: { legs: true, wings: false, bulk: 0.4, hipY: 0.64, neckY: 0.42 },
  golem: { legs: true, wings: false, bulk: 0.9, hipY: 0.62, neckY: 0.38 },
  gargoyle: { legs: true, wings: true, bulk: 0.85, hipY: 0.62, neckY: 0.38 },
  dragon: { legs: true, wings: true, bulk: 0.75, hipY: 0.62, neckY: 0.34 },
  wolf: { legs: true, wings: false, bulk: 0.5, hipY: 0.6, neckY: 0.3 },
  spider: { legs: true, wings: false, bulk: 0.35, hipY: 0.52, neckY: 0.36 },
  beetle: { legs: true, wings: false, bulk: 0.6, hipY: 0.58, neckY: 0.42 },
  bat: { legs: false, wings: true, bulk: 0.25, hipY: 0.6, neckY: 0.38 },
  blob: { legs: false, wings: false, bulk: 0.8, hipY: 0.7, neckY: 0.45 },
  spirit: { legs: false, wings: false, bulk: 0.4, hipY: 0.66, neckY: 0.44 },
  shadow: { legs: false, wings: false, bulk: 0.4, hipY: 0.66, neckY: 0.44 },
  eye: { legs: false, wings: false, bulk: 0.4, hipY: 0.66, neckY: 0.44 },
  crystal: { legs: false, wings: false, bulk: 0.5, hipY: 0.66, neckY: 0.44 },
};
const ABILITY: Record<string, MeleeAbility> = {
  sweep: { id: 'sweep', cls: 'melee', reach: 1.35, damageMul: 1, windup: 0.1, contact: 0.55, recover: 0.12, cooldown: 1.4, weight: 4.2 },
  cleave: { id: 'cleave', cls: 'melee', reach: 1.5, damageMul: 1.1, windup: 0.16, contact: 0.52, recover: 0.2, cooldown: 2.6, weight: 1.1 },
  bite: { id: 'bite', cls: 'melee', reach: 1.2, damageMul: 1.05, windup: 0.22, contact: 0.5, recover: 0.18, cooldown: 1.6, weight: 4.6 },
  claw: { id: 'claw', cls: 'melee', reach: 1.25, damageMul: 1.1, windup: 0.26, contact: 0.52, recover: 0.18, cooldown: 2.4, weight: 1.2 },
  ram: { id: 'ram', cls: 'ram', reach: 1.4, damageMul: 1.2, windup: 0.24, contact: 0.52, recover: 0.16, cooldown: 1.9, weight: 4.4 },
  crush: { id: 'crush', cls: 'ram', reach: 1.6, damageMul: 1.35, windup: 0.34, contact: 0.6, recover: 0.3, cooldown: 2.8, weight: 1 },
};
export class MeleeCombat {
  static readonly ART_UNIT = ART_UNIT;
  static readonly SS = SS;
  static readonly ART_N = ART_N;
  static readonly WEAPON_UNIT = WEAPON_UNIT;
  static readonly WEAPON_N = WEAPON_N;
  static readonly STAMP_UNIT = STAMP_UNIT;
  static readonly STAMP_N = STAMP_N;
  static readonly HAND_X = 27 * SS;
  static readonly HAND_Y = 22 * SS;
  static readonly CONTACT_VARIANT = 'attackC';
  static anatomy(shape: EnemyShape): Anatomy2D {
    return ANATOMY[shape] || ANATOMY.blob;
  }
  static moveKind(anatomy: Anatomy2D, gait: GaitKind): MoveKind {
    if (anatomy.wings) return 'flight';
    if (!anatomy.legs) return gait === 'float' || gait === 'glide' ? 'flight' : 'ooze';
    if (gait === 'hop') return 'leap';
    return 'walk';
  }
  abilities(e: Combatant): MeleeAbility[] {
    const biped = e.shape === 'humanoid' || e.shape === 'skeleton' || e.shape === 'imp';
    if (e.isBoss) {
      return [ABILITY.cleave, biped || e.shape === 'golem' ? ABILITY.crush : ABILITY.ram, ABILITY.bite];
    }
    if (e.shape === 'wolf') return [ABILITY.bite, ABILITY.claw];
    if (e.shape === 'golem' || e.shape === 'gargoyle' || e.shape === 'beetle') return [ABILITY.ram, ABILITY.crush];
    if (biped) return [ABILITY.sweep, ABILITY.cleave];
    if (e.shape === 'spider') return [ABILITY.bite, ABILITY.claw];
    if (MeleeCombat.anatomy(e.shape).legs) return [ABILITY.claw, ABILITY.bite];
    return [ABILITY.crush, ABILITY.ram];
  }
  bestAbility(e: Combatant, dist: number, cooldown: (id: string) => number): MeleeAbility | null {
    let best: MeleeAbility | null = null;
    let bestScore = -Infinity;
    for (const ab of this.abilities(e)) {
      if (cooldown(ab.id) > 0) continue;
      if (dist > this.reachPixels(ab, e.radius, e.isBoss)) continue;
      const score = ab.weight * ab.damageMul;
      if (score > bestScore) { bestScore = score; best = ab; }
    }
    return best;
  }

  move(e: Combatant, dt: number, dirX: number, dirY: number, gaitPhase: number): MoveState {
    const kind = MeleeCombat.moveKind(MeleeCombat.anatomy(e.shape), e.gait);
    const p = ((gaitPhase * this.gaitRate(e.gait, e.isBoss)) % 1 + 1) % 1;
    const sin = Math.sin(p * Math.PI * 2);
    const cos = Math.cos(p * Math.PI * 2);
    let airborne = 0;
    let bob = 0;
    let squash = 1;
    if (kind === 'walk') {
      bob = -Math.abs(sin) * e.radius * 0.16;
      squash = 1 - Math.abs(cos) * 0.05;
    } else if (kind === 'flight') {
      const flap = Math.max(0, -cos);
      bob = (sin * 0.1 - flap * 0.22) * e.radius;
      airborne = 0.18 * e.radius;
      squash = 1 + sin * 0.04;
    } else if (kind === 'leap') {
      const u = Math.min(1, Math.max(0, (p - 0.3) / 0.56));
      airborne = Math.sin(Math.PI * u) * e.radius;
      squash = 1 + 0.16 * this.pulse(p, 0.335, 0.1) - 0.17 * this.pulse(p, 0.2, 0.16) - 0.15 * this.pulse(p, 0.9, 0.13);
    } else {
      const sw = 0.5 + 0.5 * sin;
      squash = 0.9 + sw * 0.17 - this.pulse(p, 0.45, 0.3) * 0.12;
      bob = -sw * e.radius * 0.16;
    }
    const len = Math.hypot(dirX, dirY) || 1;
    const step = dirX !== 0 || dirY !== 0;
    const speedMul = kind === 'leap' ? 1.15 : kind === 'ooze' ? 0.7 : kind === 'flight' ? 1.05 : 1;
    const forward = step ? e.radius * speedMul * dt : 0;
    e.vx = (dirX / len) * forward;
    e.vy = (dirY / len) * forward;
    e.x += e.vx;
    e.y += e.vy;
    return { phase: p, airborne, forward, bob, squash, speed: forward / Math.max(1e-6, dt) };
  }
  gaitRate(gait: GaitKind, boss: boolean): number {
    const base = gait === 'stomp' ? 0.55 : gait === 'glide' ? 0.5 : gait === 'slither' ? 0.7
      : gait === 'slink' ? 0.6 : gait === 'float' ? 0.35 : gait === 'hop' ? 0.8 : gait === 'crawl' ? 1.15 : 1;
    return base * (boss ? 0.8 : 1);
  }
  strike(e: Combatant, ab: MeleeAbility, t: number, targetX: number, targetY: number, damage: number): StrikeResult {
    const total = Math.max(1e-6, ab.windup + ab.recover + 0.14);
    const k = ((t / total) % 1 + 1) % 1;
    const contact = Math.abs(k - ab.contact) <= 0.06;
    const angle = Math.atan2(targetY - e.y, targetX - e.x);
    const reach = this.reachPixels(ab, e.radius, e.isBoss);
    const variant = contact ? MeleeCombat.CONTACT_VARIANT : k < ab.contact ? 'attackA' : 'attackD';
    const lunge = contact ? WEAPON_UNIT : WEAPON_UNIT * 0.35;
    const fx = e.x + Math.cos(angle) * e.radius * e.weaponReach;
    const fy = e.y + Math.sin(angle) * e.radius * e.weaponReach;
    const handX = fx + Math.cos(angle) * lunge * SS;
    const handY = fy + Math.sin(angle) * lunge * SS;
    const tipX = handX + Math.cos(angle) * reach * 0.6;
    const tipY = handY + Math.sin(angle) * reach * 0.6;
    const zone: StrikeRect = { x: tipX - reach * 0.5, y: tipY - reach * 0.35, w: reach, h: reach * 0.7, reach };
    const frame: StrikeFrame = { variant, contact, progress: k, handX, handY, tipX, tipY, stampSize: STAMP_N, zone };
    const inZone = targetX >= zone.x && targetX <= zone.x + zone.w && targetY >= zone.y && targetY <= zone.y + zone.h;
    const hit = contact && inZone;
    return { hit, damage: hit ? damage * ab.damageMul : 0, frame };
  }
  reachPixels(ab: MeleeAbility, radius: number, boss: boolean): number {
    return ab.reach * radius * (boss ? 1.3 : 1);
  }
  /** Тайминги удара из ОБЩЕГО профиля движка (signatureAttacks) — единый источник правды. */
  signatureAbility(kind: SignatureKind): MeleeAbility {
    const p = signatureProfile(kind);
    return { id: kind, cls: p.reach >= 1.4 ? 'ram' : 'melee', reach: p.reach, damageMul: p.damageMul, windup: p.windup, contact: p.contact, recover: p.recover, cooldown: Math.max(0.35, signatureDuration(kind) + 0.5), weight: 4 };
  }
  /** Дальность удара в пикселях по профилю движка (боссы бьют дальше — ×1.3). */
  signatureReachPx(kind: SignatureKind, radius: number, boss: boolean): number {
    return signatureReach(kind, radius, boss);
  }
  /** Полная длительность атаки из профиля движка (windup+strike+recover). */
  signatureTotal(kind: SignatureKind): number {
    return signatureDuration(kind);
  }
  artUnitToPixels(units: number): number {
    return units * SS;
  }
  private pulse(x: number, c: number, w: number): number {
    const d = Math.abs(x - c) / w;
    if (d >= 1) return 0;
    const s = Math.cos(d * Math.PI * 0.5);
    return s * s;
  }
}

