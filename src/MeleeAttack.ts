// === MELEE ATTACK — CLEAN INDEPENDENT CLASS (no engine dependencies) ===
// === STEP 0. TUNING BLOCK — edit these values only (world units = pixels, same as enemy radius) ===
const SWORD_LENGTH = 62;           // weapon (hitbox) length — raise it to make the sword longer
const SWORD_BLADE_WIDTH = 10;      // blade thickness (capsule radius) — small buffer so grazing hits count
const ARC_RADIUS = 70;             // semi-arc radius (how far the sweep travels from the body)
const ARC_ANGLE = Math.PI;         // sweep width: PI = half-circle (semi-arc) in front of the player
const SWING_SPEED = 4.0;           // forward swing speed (curve units/sec) — bigger = faster swing
const RETURN_SPEED = 2.5;          // return speed (curve units/sec) — bigger = softer comeback
const DAMAGE_WINDOW = 0.95;        // fraction of the curve where the blade is live (0.05..0.95 = whole swing)
const MIN_HIT_DISTANCE = 4;        // ignore targets closer than this (avoids overlap glitches)
// === STEP 0b. ASSASSIN SICKLE — same animation, its own reach/color ===
const SICKLE_LENGTH = 74;          // sickle reach — a bit longer than the sword
const SICKLE_BLADE_WIDTH = 10;     // sickle thickness (capsule radius)
const SICKLE_ARC_RADIUS = 78;      // sickle semi-arc radius
const SICKLE_SWING_SPEED = SWING_SPEED;   // same swing speed as the sword (identical animation)
const SICKLE_RETURN_SPEED = RETURN_SPEED; // same return speed as the sword (identical animation)
const SWORD_TRAIL_COLOR = '#ffffff'; // sword trail particle color
const SICKLE_TRAIL_COLOR = '#9b3c3c'; // sickle trail particle color (matches its blade)
const TRAIL_LINE_WIDTH = 1.6;      // trail thickness — lower = thinner (was 3)
const TRAIL_ALPHA = 0.35;          // trail opacity 0..1 — lower = more transparent (was 1)
export interface MeleeConfig {
  length: number;
  bladeWidth: number;
  arcRadius: number;
  swingSpeed: number;
  returnSpeed: number;
  trailColor: string;
  trailWidth: number;
  trailAlpha: number;
}
export const SWORD_CONFIG: MeleeConfig = { length: SWORD_LENGTH, bladeWidth: SWORD_BLADE_WIDTH, arcRadius: ARC_RADIUS, swingSpeed: SWING_SPEED, returnSpeed: RETURN_SPEED, trailColor: SWORD_TRAIL_COLOR, trailWidth: TRAIL_LINE_WIDTH, trailAlpha: TRAIL_ALPHA };
export const SICKLE_CONFIG: MeleeConfig = { length: SICKLE_LENGTH, bladeWidth: SICKLE_BLADE_WIDTH, arcRadius: SICKLE_ARC_RADIUS, swingSpeed: SICKLE_SWING_SPEED, returnSpeed: SICKLE_RETURN_SPEED, trailColor: SICKLE_TRAIL_COLOR, trailWidth: TRAIL_LINE_WIDTH, trailAlpha: TRAIL_ALPHA };
export type MeleePhase = 'idle' | 'swing' | 'return';
export interface MeleeTarget { id: string; x: number; y: number; radius: number; }
export interface Vec2Like { x: number; y: number; }
export interface MeleeTrailPoint { x: number; y: number; angle: number; }
export class MeleeAttack {
  // === STEP 1. RUNTIME STATE ===
  config: MeleeConfig = SWORD_CONFIG;
  phase: MeleePhase = 'idle';
  t = 0;                           // interpolation timer 0..1 along the curve
  angle = 0;                       // current blade angle (rad, world space)
  baseAngle = 0;                   // start/end angle = player facing angle
  center: Vec2Like = { x: 0, y: 0 }; // blade pivot = player position
  tipPrev: Vec2Like = { x: 0, y: 0 }; // previous blade tip (used for swept contact)
  trail: MeleeTrailPoint[] = [];   // cleared by the engine after drawing
  pendingDamage = 0;               // damage applied on a confirmed contact hit
  hitThisSwing = new Set<string>();
  constructor(config: MeleeConfig = SWORD_CONFIG) { this.config = config; }
  // === STEP 2. LIFE-CYCLE ===
  get isActive(): boolean { return this.phase !== 'idle'; }
  get progress(): number { return this.t; }
  start(facingAngle: number, origin: Vec2Like) {
    this.baseAngle = facingAngle;
    this.angle = facingAngle - ARC_ANGLE / 2;
    this.center = { x: origin.x, y: origin.y };
    this.t = 0;
    this.phase = 'swing';
    this.hitThisSwing.clear();
    this.trail.length = 0;
    this.tipPrev = this.tipPosition();
    this.trail.push({ x: this.tipPrev.x, y: this.tipPrev.y, angle: this.angle });
  }
  cancel() {
    this.phase = 'idle';
    this.t = 0;
    this.hitThisSwing.clear();
    this.trail.length = 0;
  }
  // === STEP 3. PER-FRAME UPDATE (call once per frame, dt in seconds) ===
  update(dt: number, origin: Vec2Like, facingAngle: number, targets: MeleeTarget[], onHit: (target: MeleeTarget) => void) {
    if (this.phase === 'idle') return;
    this.center = { x: origin.x, y: origin.y };
    this.baseAngle = facingAngle;
    const speed = this.phase === 'swing' ? this.config.swingSpeed : this.config.returnSpeed;
    this.t = Math.min(1, this.t + dt * speed);
    const curve = this.phase === 'swing' ? this.t : 1 - this.t;
    this.angle = this.baseAngle - ARC_ANGLE / 2 + ARC_ANGLE * curve;
    const tip = this.tipPosition();
    this.trail.push({ x: tip.x, y: tip.y, angle: this.angle });
    if (this.trail.length > 24) this.trail.shift();
    if (curve > 0.05 && curve < DAMAGE_WINDOW) this.checkContact(tip, targets, onHit);
    this.tipPrev = tip;
    if (this.t >= 1) {
      if (this.phase === 'swing') { this.phase = 'return'; this.t = 0; }
      else { this.phase = 'idle'; this.t = 0; }
    }
  }
  // === STEP 4. GEOMETRY HELPERS ===
  tipPosition(): Vec2Like {
    return { x: this.center.x + Math.cos(this.angle) * this.config.length, y: this.center.y + Math.sin(this.angle) * this.config.length };
  }
  distance(ax: number, ay: number, bx: number, by: number): number {
    const dx = ax - bx, dy = ay - by;
    return Math.sqrt(dx * dx + dy * dy);
  }
  pointSegmentDistance(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
    const abx = bx - ax, aby = by - ay;
    const lenSq = abx * abx + aby * aby;
    const k = lenSq <= 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / lenSq));
    return this.distance(px, py, ax + abx * k, ay + aby * k);
  }
  // === STEP 5. STRICT CONTACT DAMAGE — only when the blade actually overlaps a hitbox ===
  checkContact(tip: Vec2Like, targets: MeleeTarget[], onHit: (target: MeleeTarget) => void) {
    for (const target of targets) {
      if (this.hitThisSwing.has(target.id)) continue;
      if (this.distance(this.center.x, this.center.y, target.x, target.y) < MIN_HIT_DISTANCE) continue;
      const hitRadius = target.radius + this.config.bladeWidth;
      const distToBlade = this.pointSegmentDistance(target.x, target.y, this.center.x, this.center.y, tip.x, tip.y);
      const distToSweep = this.pointSegmentDistance(target.x, target.y, this.tipPrev.x, this.tipPrev.y, tip.x, tip.y);
      if (distToBlade > hitRadius && distToSweep > hitRadius) continue;
      this.hitThisSwing.add(target.id);
      onHit(target);
    }
  }
  // === STEP 6. OPTIONAL DEBUG DRAW (blade line of the current swing) ===
  draw(ctx: CanvasRenderingContext2D, origin: Vec2Like) {
    if (this.phase === 'idle') return;
    const tip = this.tipPosition();
    ctx.save();
    ctx.globalAlpha = this.config.trailAlpha;
    ctx.strokeStyle = this.config.trailColor;
    ctx.lineWidth = this.config.trailWidth;
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(tip.x, tip.y);
    ctx.stroke();
    ctx.restore();
  }
  // === STEP 6b. DRAW THE SWEPT SEMI-ARC TRAIL — thin + semi-transparent ===
  drawSweep(ctx: CanvasRenderingContext2D, alpha: number = 1) {
    if (this.phase === 'idle' || this.trail.length < 2) return;
    ctx.save();
    ctx.strokeStyle = this.config.trailColor;
    ctx.lineCap = 'round';
    ctx.globalAlpha = this.config.trailAlpha * alpha;
    ctx.lineWidth = this.config.trailWidth;
    // Oldest segment is faintest, newest (near the blade) is brightest
    for (let i = 1; i < this.trail.length; i++) {
      ctx.globalAlpha = this.config.trailAlpha * alpha * (i / this.trail.length);
      ctx.beginPath();
      ctx.moveTo(this.trail[i - 1].x, this.trail[i - 1].y);
      ctx.lineTo(this.trail[i].x, this.trail[i].y);
      ctx.stroke();
    }
    ctx.restore();
  }
}
// === STEP 7. INTEGRATION (CombatEngine) ===
// import { MeleeAttack, SWORD_CONFIG, SICKLE_CONFIG, MeleeTarget } from './MeleeAttack';
// fields: meleeSword = new MeleeAttack(SWORD_CONFIG);  meleeSickle = new MeleeAttack(SICKLE_CONFIG);
// doMainAttack(): sword  -> this.startMelee(this.meleeSword, dmg)
//                 assassin-> this.startMelee(this.meleeSickle, dmg)   // LMB uses the sickle swing
// update(dt):     this.updateMelee(dt)   // drives both instances + applies contact damage
