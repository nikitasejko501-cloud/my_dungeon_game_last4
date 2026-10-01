import type { Vec2, CharacterClass, EnemyDef, EnemyShape, SaveProfile, CapturedBoss, GameMode, CombatResult, Element } from './types';
import { CHARACTERS, ENEMIES, ALL_ENEMIES, DUNGEONS, MAX_WAVES, BOSS_WAVE_INTERVAL, STAMINA_REGEN_RATE, STAMINA_REGEN_SECOND_WIND, HEALTH_REGEN_RATE, POTION_HEALTH_AMOUNT, POTION_STAMINA_AMOUNT, REVIVAL_HP_PERCENT, EXP_PER_LEVEL, EXP_LEVEL_MULTIPLIER, POTION_COOLDOWN, WAVE_HEALTH_MULTIPLIER, WAVE_DAMAGE_MULTIPLIER, BOSS_WAVE_HEALTH_MULTIPLIER, BOSS_WAVE_DAMAGE_MULTIPLIER, HARD_HEALTH_MULTIPLIER, HARD_DAMAGE_MULTIPLIER, HARD_WAVE_HEALTH_MULTIPLIER, HARD_WAVE_DAMAGE_MULTIPLIER, HARD_BOSS_WAVE_HEALTH_MULTIPLIER, HARD_BOSS_WAVE_DAMAGE_MULTIPLIER, TALENT_BONUS_PER_LEVEL, PLAYER_DAMAGE_PER_LEVEL, PLAYER_HEALTH_PER_LEVEL, WAVE_SPEED_MULTIPLIER, WAVE_SPEED_MULTIPLIER_MAX, GOLD_WAVE_MULTIPLIER, generateDungeonBosses } from './gameData';
import { audio, SfxName } from './audio';
import { buildBossPattern, shadeColor } from './monsterVisuals';
import { buildMonsterArt, buildPalette, monsterKit, patternKey, ART_N, ArtGrid, ArtPalette, ArtVariant, MonsterArtMeta, ART_VARIANTS, buildWeaponSprite } from './monsterArt';
import type { WeaponKit, WeaponSprite } from './monsterArt';
import { MeleeAttack, SWORD_CONFIG, SICKLE_CONFIG, MeleeTarget } from './MeleeAttack';
import { drawSignature, elementColor, signatureDuration, signatureFor, signatureImpact, signaturePhase, signaturePose, signatureProfile, signatureReach } from './signatureAttacks';
import type { SignatureKind, SignatureView } from './signatureAttacks';
import { drawPuddles, insidePuddle, makePuddle, puddleColor, updatePuddles } from './hazards';
import type { GroundPuddle } from './hazards';
import { arrowElement, arrowKindFor, arrowProfile, drawArrow, drawArrowTrail, pushTrail } from './arrows';
import type { ArrowKind, TrailPoint } from './arrows';
import { attackForPhase, bossPhase as bossPhaseOf, escalateForPhase, fanAngles, groundLinePoints, kitForBoss, phaseDamageMul, rainTargets, ringAngles } from './bossAttacks';
import type { BossAttackDef, BossKit } from './bossAttacks';
import { monsterSprites } from './spriteLoader';
import { gaitForShape, gaitPose, gaitPhaseRate, idleBreath, GaitPose, flapStroke, flapsWings, hopsInsteadOfWalking, jumpArc } from './dungeonIdentity';
import type { GaitKind } from './types';
// === РќРћР’РћР•: СЃРїРѕСЃРѕР±РЅРѕСЃС‚Рё РѕР±С‹С‡РЅС‹С… С‚РІР°СЂРµР№ + РІРёРґРёРјР°СЏ РїРѕР·Р° РєР°СЃС‚Р° ===
// РЈ РјРѕРЅСЃС‚СЂР° С‚РµРїРµСЂСЊ РќР•РЎРљРћР›Р¬РљРћ СЃРїРѕСЃРѕР±РЅРѕСЃС‚РµР№ (monsterAbilities), Р° Сѓ РєР°Р¶РґРѕР№
// СЃРїРѕСЃРѕР±РЅРѕСЃС‚Рё вЂ” СЃРІРѕСЏ РїРѕР·Р° СЂСѓРєРё (castCore) Рё СЃРІРѕР№ РІРёРґРёРјС‹Р№ С‚РµР»РµРіСЂР°С„
// (castVisuals): СЃС„РµСЂР° РІ Р»Р°РґРѕРЅРё, РїСѓРЅРєС‚РёСЂ РїСѓС‚Рё, РІСЃРєРёРЅСѓС‚С‹Рµ Р»Р°РїС‹ РїР°СѓРєР°.
import { monsterAbilitiesFor } from './monsterAbilities';
import type { MonsterAbility } from './monsterAbilities';
import { armReach, castStyleFor, handGlowLevel, shouldDrawCastArm } from './castCore';
import type { CastStyle } from './castCore';
import { drawCastArm, drawCastPath, drawSpiderLegs, muzzleWorld } from './castVisuals';
import type { CastArmView } from './castVisuals';
import { MeleeCombat } from './meleeCombat';

/**
 * РљР°РєРёРµ РєР°РґСЂС‹ СЃРїСЂР°Р№С‚Р° РїРѕРєР°Р·С‹РІР°С‚СЊ РґР»СЏ РєР°Р¶РґРѕР№ РїРѕС…РѕРґРєРё.
 * 8 С„Р°Р· = РїРѕР»РЅС‹Р№ С†РёРєР» (4 С€Р°РіР°). РџРћР РЇР”РћРљ Р¤РђР— Р РђР—РќР«Р™ РґР»СЏ СЂР°Р·РЅС‹С… РїРѕС…РѕРґРѕРє вЂ” СЌС‚Рѕ
 * С‚Рѕ, С‡С‚Рѕ РґРµР»Р°РµС‚ РёС… РЅРµРїРѕС…РѕР¶РёРјРё РіР»Р°Р·Р°РјРё, Р° РЅРµ С‚РѕР»СЊРєРѕ СЂР°Р·РЅРѕР№ СЃРєРѕСЂРѕСЃС‚СЊСЋ:
 *   stomp  вЂ” С‚СЏР¶С‘Р»С‹Рµ В«РўРЈРљ-РўРЈРљВ»: РґРІРµ С„Р°Р·С‹ РїРѕС‡С‚Рё РѕРґРёРЅР°РєРѕРІС‹ (РґРІРѕР№РЅР°СЏ РѕРїРѕСЂР°),
 *   slink  вЂ” РєСЂР°РґСѓС‰РёР№СЃСЏ: С„Р°Р·С‹ РёРґСѓС‚ СЃ Р·Р°РґРµСЂР¶РєРѕР№ (РёРЅРµСЂС†РёСЏ),
 *   hop    вЂ” РїСЂС‹Р¶РѕРє: РїРѕРґСЉС‘Рј РЅР° РґРІСѓС… С†РµРЅС‚СЂР°Р»СЊРЅС‹С… С„Р°Р·Р°С…, РїРѕС‚РѕРј СЃРїРѕРєРѕР№РЅРѕРµ РґРІРёР¶РµРЅРёРµ,
 *   float  вЂ” РїР°СЂРµРЅРёРµ: С†РёРєР» В«РІРІРµСЂС…-РІРЅРёР·В» РЅР°РѕР±РѕСЂРѕС‚ (СЃРЅР°С‡Р°Р»Р° РїСЂРѕСЃР°РґРєР°, РїРѕС‚РѕРј РїРѕРґСЉС‘Рј),
 *   glide  вЂ” РґР»РёРЅРЅС‹Р№ РїР»Р°РЅРёСЂСѓСЋС‰РёР№ РјР°С…, РєСЂР°Р№РЅРёРµ С„Р°Р·С‹ = СЂР°СЃРїР»Р°С‚Р° РєСЂС‹Р»СЊРµРІ,
 *   slither/crawl вЂ” РЅРµРїСЂРµСЂС‹РІРЅР°СЏ РІРѕР»РЅР° Р±РµР· В«РїСЂРѕСЃР°РґРєРёВ».
 * Р Р°РЅСЊС€Рµ Сѓ РІСЃРµС… РїРѕС…РѕРґРѕРє Р±С‹Р» РѕРґРёРЅР°РєРѕРІС‹Р№ РјР°СЃСЃРёРІ, РїРѕСЌС‚РѕРјСѓ В«Р»РµС‚Р°Р±РµР»СЊРЅР°СЏВ» Рё
 * В«С…РѕРґРѕРІР°СЏВ» Р°РЅРёРјР°С†РёРё РѕС‚Р»РёС‡Р°Р»РёСЃСЊ С‚РѕР»СЊРєРѕ С‚РµРјРїРѕРј вЂ” РІРёР·СѓР°Р»СЊРЅРѕ РѕРґРЅРѕ Рё С‚Рѕ Р¶Рµ.
 */
const GAIT_FRAMES: Record<GaitKind, ArtVariant[]> = {
  walk: ['walkA', 'walkB', 'walkC', 'walkD', 'walkE', 'walkF', 'walkG', 'walkH'],
  stomp: ['walkA', 'walkB', 'walkB', 'walkC', 'walkD', 'walkD', 'walkE', 'walkF'],
  slink: ['walkA', 'walkB', 'walkC', 'walkC', 'walkD', 'walkE', 'walkF', 'walkG'],
  crawl: ['walkA', 'walkC', 'walkB', 'walkD', 'walkE', 'walkG', 'walkF', 'walkH'],
  // РџР Р«Р–РћРљ вЂ” С‚РѕР¶РґРµСЃС‚РІРµРЅРЅР°СЏ РїРѕРґСЃС‚Р°РЅРѕРІРєР°, Р° РЅРµ РїРµСЂРµСЃС‚Р°РЅРѕРІРєР°. РљР°РґСЂ walkX РЅРµСЃС‘С‚
  // С„Р°Р·Сѓ walkPhase = РёРЅРґРµРєСЃ/8, Рё РѕРЅР° РґРѕР»Р¶РЅР° Р РђР’РќРЇРўР¬РЎРЇ С„Р°Р·Рµ РґРІРёР¶РєР°, РёРЅР°С‡Рµ
  // jumpArc РІ РґРІРёР¶РєРµ (РїРѕРґСЉС‘Рј С‚РµР»Р°) Рё jumpArc РІ СЃРїСЂР°Р№С‚Рµ (СЃР¶Р°С‚РёРµ/РІС‹С‚СЏР¶РєР°)
  // СЃРјРѕС‚СЂСЏС‚ РЅР° СЂР°Р·РЅС‹Рµ РјРѕРјРµРЅС‚С‹ С†РёРєР»Р°: С‚РµР»Рѕ РїСЂРёР·РµРјР»СЏР»РѕСЃСЊ, РїРѕРєР° РєР°РґСЂ РµС‰С‘ Р»РµС‚РµР».
  hop: ['walkA', 'walkB', 'walkC', 'walkD', 'walkE', 'walkF', 'walkG', 'walkH'],
  slither: ['walkA', 'walkC', 'walkE', 'walkG', 'walkF', 'walkD', 'walkB', 'walkH'],
  float: ['walkE', 'walkG', 'walkF', 'walkA', 'walkC', 'walkD', 'walkB', 'walkH'],
  // РњРђРҐ РљР Р«Р›Рђ вЂ” РїРѕ С‚РѕР№ Р¶Рµ РїСЂРёС‡РёРЅРµ С‚РѕР¶РґРµСЃС‚РІРµРЅРЅРѕ: flapStroke (РґРІРёР¶РѕРє) Рё wingLift
  // (СЃРїСЂР°Р№С‚) РѕР±СЏР·Р°РЅС‹ Р±РёС‚СЊ РїРѕ РѕРґРЅРѕР№ С„Р°Р·Рµ, РёРЅР°С‡Рµ С‚РµР»Рѕ РїСѓР»СЊСЃРёСЂСѓРµС‚ РЅРµ РІ С‚Р°РєС‚ РєСЂС‹Р»Сѓ.
  glide: ['walkA', 'walkB', 'walkC', 'walkD', 'walkE', 'walkF', 'walkG', 'walkH'],
};
/** РЎРєРѕСЂРѕСЃС‚СЊ С†РёРєР»Р° РїРѕС…РѕРґРєРё (Сѓ Р±РѕСЃСЃРѕРІ С†РёРєР» РјРµРґР»РµРЅРЅРµРµ вЂ” С‚СЏР¶С‘Р»Р°СЏ РїРѕСЃС‚СѓРїСЊ). */
function gaitPhaseRateFor(gait: GaitKind, boss = false): number {
  return gaitPhaseRate(gait) * (boss ? 0.8 : 1);
}
/**
 * Р’РР”РРњРћРЎРўР¬ Р”Р’РР–Р•РќРРЇ. Р“Р»Р°РІРЅС‹Р№ Р±Р°Рі РїСЂРµР¶РЅРµР№ Р°РЅРёРјР°С†РёРё: pose.bob СѓР¶Рµ СЏРІР»СЏРµС‚СЃСЏ РґРѕР»РµР№
 * (РЅР°РїСЂРёРјРµСЂ 0.16), Р° РґРІРёР¶РѕРє СѓРјРЅРѕР¶Р°Р» РµРіРѕ РµС‰С‘ СЂР°Р· РЅР° r * 0.16. РџСЂРё СЂР°РґРёСѓСЃРµ 14
 * РїРѕРґСЃРєРѕРє СЃРѕСЃС‚Р°РІР»СЏР» 0.16*14*0.16 = 0.36 РїРёРєСЃРµР»СЏ, С‚Рѕ РµСЃС‚СЊ РґРІРёР¶РµРЅРёРµ С„РёР·РёС‡РµСЃРєРё
 * РЅРµ Р±С‹Р»Рѕ РІРёРґРЅРѕ РЅР° СЌРєСЂР°РЅРµ 28 px. РўРµРїРµСЂСЊ Р°РјРїР»РёС‚СѓРґС‹ Р·Р°РґР°РЅС‹ СЏРІРЅРѕ Рё РєСЂСѓРїРЅРѕ:
 * РЅР° СЃРїСЂР°Р№С‚Рµ 28 px РїРѕРґСЃРєРѕРє в‰€ 1.5вЂ“4 px, РїСЂРёСЃРµРґР°РЅРёРµ В±10%, РєСЂРµРЅ В±6В° вЂ” СЌС‚Рѕ С‡РёС‚Р°РµС‚СЃСЏ.
 */
const MOTION = {
  bob: 0.75,       // РїРѕРґСЃРєРѕРє РєРѕСЂРїСѓСЃР° (РґРѕР»СЏ СЂР°РґРёСѓСЃР° Р·Р° РµРґРёРЅРёС†Сѓ pose.bob)
  squash: 1.4,     // СѓСЃРёР»РµРЅРёРµ РїСЂРёСЃРµРґР°РЅРёСЏ/РІС‹С‚СЏР¶РµРЅРёСЏ (РѕС‚РєР»РѕРЅРµРЅРёРµ РѕС‚ 1)
  tilt: 1.0,       // РЅР°РєР»РѕРЅ РєРѕСЂРїСѓСЃР° РІРїРµСЂС‘Рґ-РЅР°Р·Р°Рґ
  roll: 1.7,       // Р±РѕРєРѕРІРѕРµ РїРµСЂРµРІР°Р»РёРІР°РЅРёРµ
  flap: 0.17,      // РІР·РјР°С… РєСЂС‹Р»СЊРµРІ (СЂР°Рґ)
  hover: 0.75,     // РїР°СЂРµРЅРёРµ (РґРѕР»СЏ СЂР°РґРёСѓСЃР°)
};
/**
 * РўРµРјРї С€Р°РіР° РїСЂРѕРїРѕСЂС†РёРѕРЅР°Р»РµРЅ СЃРєРѕСЂРѕСЃС‚Рё РґРІРёР¶РµРЅРёСЏ: Р±С‹СЃС‚СЂС‹Р№ Р¶СѓРє РїРµСЂРµР±РёСЂР°РµС‚ РЅРѕРіР°РјРё
 * С‡Р°С‰Рµ, С‚СЏР¶С‘Р»С‹Р№ РіРѕР»РµРј вЂ” СЂРµРґРєРѕ Рё РјРѕС‰РЅРѕ. Р‘РµР· СЌС‚РѕРіРѕ В«СЃРєРѕСЂРѕСЃС‚СЊВ» Рё В«РїРѕС…РѕРґРєР°В»
 * РїСЂРѕС‚РёРІРѕСЂРµС‡Р°С‚ РґСЂСѓРі РґСЂСѓРіСѓ Рё РїРµСЂСЃРѕРЅР°Р¶ РІС‹РіР»СЏРґРёС‚ РєР°Рє Р»СѓРЅРЅР°СЏ РїРѕС…РѕРґРєР°.
 */
function strideRate(def: EnemyDef, boss: boolean): number {
  const base = 3.2 + Math.max(0, def.speed) * 1.6;
  // Р›РёС‡РЅС‹Р№ С‚РµРјРї РґРІРёР¶РµРЅРёСЏ Р±РѕСЃСЃР° (EnemyDef.animationRate): РѕРґРёРЅ РёРґС‘С‚ С‚СЏР¶С‘Р»РѕР№
  // РїРѕСЃС‚СѓРїСЊСЋ, РґСЂСѓРіРѕР№ СЂС‹СЃРёС‚. Р”Р°Р¶Рµ РїСЂРё РѕРґРёРЅР°РєРѕРІРѕР№ speed Р±РѕСЃСЃС‹ СЂР°Р·РЅС‹С… РІРѕР»РЅ
  // РґРІРёРіР°СЋС‚СЃСЏ РїРѕ-СЂР°Р·РЅРѕРјСѓ вЂ” СЌС‚Рѕ С‡Р°СЃС‚СЊ РёС… СѓРЅРёРєР°Р»СЊРЅРѕР№ Р°РЅРёРјР°С†РёРё.
  return base * (boss ? 0.85 : 1) * (def.animationRate || 1);
}

/**
 * '#rrggbb' + РїСЂРѕР·СЂР°С‡РЅРѕСЃС‚СЊ в†’ 'rgba(...)'. РќСѓР¶РЅРѕ РґР»СЏ РјСЏРіРєРёС… СЃРІРµС‡РµРЅРёР№: РєР°РЅРІР°
 * РЅРµ СѓРјРµРµС‚ В«РїРѕР»СѓРїСЂРѕР·СЂР°С‡РЅС‹Р№ hexВ», Р° Р±РµР· Р°Р»СЊС„С‹ Р»СЋР±РѕРµ СЃРІРµС‡РµРЅРёРµ РїСЂРµРІСЂР°С‰Р°РµС‚СЃСЏ РІ
 * Р¶С‘СЃС‚РєСѓСЋ С„РёРіСѓСЂСѓ (РёРјРµРЅРЅРѕ С‚Р°Рє РїРѕСЏРІР»СЏР»РёСЃСЊ В«СЃС‚СЂР°РЅРЅС‹Рµ РїРѕР»РѕСЃС‹В» РІРѕРєСЂСѓРі Р±РѕСЃСЃРѕРІ).
 */
function withAlpha(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const v = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  if (!isFinite(v)) return hex;
  return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${a})`;
}

interface Enemy {
  id: string;
  def: EnemyDef;
  x: number;
  y: number;
  vx: number;
  vy: number;
  health: number;
  maxHealth: number;
  hitFlash: number;
  attackCooldown: number;
  isBoss: boolean;
  bossAbilityCooldown: number;
  slowTimer: number;
  poisonTimer: number;
  poisonDamage: number;
  spawnAnim: number;
  deathAnim: number;
  isDying: boolean;
  captured: boolean;
  walkAnim: number;
  isMoving: boolean;
  invuln: number;
  attackAnim: number;
  element?: Element;
  burnTimer: number;
  /** РћСЂРіР°РЅРёС‡РµСЃРєР°СЏ Р°С‚Р°РєР° РїРѕ Р°РЅР°С‚РѕРјРёРё + С„Р»Р°Рі В«СѓСЂРѕРЅ СѓР¶Рµ РЅР°РЅРµСЃС‘РЅ РІ СЌС‚РѕРј СѓРґР°СЂРµВ». */
  sigKind: SignatureKind;
  sigHit: boolean;
  /**
   * РќРђР‘РћР  РЎРџРћРЎРћР‘РќРћРЎРўР•Р™ РўР’РђР Р (СЃРј. monsterAbilities.ts). Р Р°РЅСЊС€Рµ Сѓ РјРѕРЅСЃС‚СЂР°
   * Р±С‹Р»Р° СЂРѕРІРЅРѕ РћР”РќРђ Р°С‚Р°РєР°, Рё В«РїСЂРёРјРµРЅРµРЅРёРµ СЃРїРѕСЃРѕР±РЅРѕСЃС‚РёВ» (doMonsterAbility)
   * РїСЂРѕРёСЃС…РѕРґРёР»Рѕ РЅРµРІРёРґРёРјРѕ. РўРµРїРµСЂСЊ Сѓ С‚РІР°СЂРё 2вЂ“3 СЃРїРѕСЃРѕР±РЅРѕСЃС‚Рё, РєР°Р¶РґР°СЏ СЃРѕ СЃРІРѕРµР№
   * РїРѕР·РѕР№ СЂСѓРєРё, СЃРЅР°СЂСЏРґРѕРј Рё С‚РµР»РµРіСЂР°С„РѕРј. РЈ Р±РѕСЃСЃРѕРІ РЅР°Р±РѕСЂ СЃРІРѕР№ (bossAttacks) вЂ”
   * СЌС‚Рѕ РїРѕР»Рµ РѕСЃС‚Р°С‘С‚СЃСЏ РїСѓСЃС‚С‹Рј.
   */
  abilities: MonsterAbility[];
  /** РќРѕРјРµСЂ РІС‹Р±СЂР°РЅРЅРѕР№ СЃРїРѕСЃРѕР±РЅРѕСЃС‚Рё РІ РЅР°Р±РѕСЂРµ (-1 = РѕР±С‹С‡РЅС‹Р№ СѓРґР°СЂ РїРѕ Р°РЅР°С‚РѕРјРёРё). */
  abilitySlot: number;
  /**
   * Р›РР§РќР«Р• РћРўРљРђРўР« РЎРџРћРЎРћР‘РќРћРЎРўР•Р™ (РїРѕ РѕРґРЅРѕР№ РЅР° СЃР»РѕС‚ РЅР°Р±РѕСЂР°). РћС‚РґРµР»СЊРЅС‹Рµ С‚Р°Р№РјРµСЂС‹
   * РЅСѓР¶РЅС‹, С‡С‚РѕР±С‹ РїСЂРёС‘РјС‹ Р§Р•Р Р•Р”РћР’РђР›РРЎР¬: СЃ РѕР±С‰РёРј РѕС‚РєР°С‚РѕРј С‚РІР°СЂСЊ РІСЃРµРіРґР° РІС‹Р±РёСЂР°Р»Р°
   * Р±С‹ РѕРґРЅСѓ Рё С‚Сѓ Р¶Рµ В«СЃР°РјСѓСЋ СѓРґРѕР±РЅСѓСЋВ» СЃРїРѕСЃРѕР±РЅРѕСЃС‚СЊ Рё СЃРЅРѕРІР° СЃС‚Р°Р»Р° Р±С‹ РѕРґРЅРѕС‚РёРїРЅРѕР№.
   */
  abilityCooldowns: number[];
  /**
   * ФОРМА ПОСЛЕДНЕГО ВЫБРАННОГО ПРИЁМА (может отличаться от `sigKind`):
   * например, у «мечника» дальняя способность — плевок, но при виде
   * дуги игрок должен понимать, что мечник бьёт МЕЧОМ. Значение живёт до
   * конца кулдауна и сбрасывается при старте нового приёма.
   */
  abilityCastShape?: SignatureKind;
  /**
   * РР”РЈР©РР™ Р—РђРњРђРҐ РќР•-Р‘РћРЎРЎРћР’РћР™ РўР’РђР Р. РџРѕРєР° `t` С‚РёРєР°РµС‚ РІРЅРёР·, С‚РІР°СЂСЊ СЃС‚РѕРёС‚ Рё
   * В«РїРѕРєР°Р·С‹РІР°РµС‚В» СЃРїРѕСЃРѕР±РЅРѕСЃС‚СЊ (СЂСѓРєР° РІРІРµСЂС… СЃРѕ СЃС„РµСЂРѕР№, СЂРѕС‚ СЂР°СЃРєСЂС‹С‚, Р»Р°РїС‹
   * РІР·РІРµРґРµРЅС‹), СѓСЂРѕРЅ РїСЂРёС…РѕРґРёС‚ РўРћР›Р¬РљРћ РІ РјРѕРјРµРЅС‚ `t <= 0`. РўР°Рє Сѓ РёРіСЂРѕРєР° РµСЃС‚СЊ
   * РѕРєРЅРѕ РЅР° СѓС…РѕРґ РѕС‚ РїР»РµРІРєР°/РјР°РіРёРё, Р° РЅРµ РјРіРЅРѕРІРµРЅРЅС‹Р№ СѓСЂРѕРЅ В«РёР· РЅРёРѕС‚РєСѓРґР°В».
   */
  castPhase: 'none' | 'windup' | 'active' | 'recover';
  castT: number;
  /** РРЅРґРµРєСЃ Р°РєС‚РёРІРЅРѕР№ СЃРїРѕСЃРѕР±РЅРѕСЃС‚Рё РІРѕ РІСЂРµРјСЏ РєР°СЃС‚Р°. */
  castSlot: number;
  /** РљСѓРґР° Р±С‹Р»Р° РЅР°РїСЂР°РІР»РµРЅР° СЃРїРѕСЃРѕР±РЅРѕСЃС‚СЊ РІ РјРѕРјРµРЅС‚ Р·Р°РјР°С…Р° (Р·Р°С„РёРєСЃРёСЂРѕРІР°РЅРѕ). */
  castAim: number;
  /**
   * РљСѓРґР° СЃРјРѕС‚СЂРёС‚ С‚РІР°СЂСЊ: +1 = РІРїСЂР°РІРѕ, -1 = РІР»РµРІРѕ. РћР±РЅРѕРІР»СЏРµС‚СЃСЏ СЃ РіРёСЃС‚РµСЂРµР·РёСЃРѕРј
   * (6 px), РїРѕСЌС‚РѕРјСѓ СЃРїСЂР°Р№С‚ РЅРµ РјРµСЂС†Р°РµС‚, РєРѕРіРґР° РёРіСЂРѕРє СЃС‚РѕРёС‚ СЂРѕРІРЅРѕ РЅР°Рґ РјРѕРЅСЃС‚СЂРѕРј.
   * РџРѕ СЌС‚РѕРјСѓ С„Р»Р°РіСѓ С‚РµР»Рѕ Р·РµСЂРєР°Р»РёС‚СЃСЏ С†РµР»РёРєРѕРј вЂ” РѕСЂСѓР¶РёРµ Рё Р°СЃРёРјРјРµС‚СЂРёС‡РЅС‹Рµ РґРµС‚Р°Р»Рё
   * РѕРєР°Р·С‹РІР°СЋС‚СЃСЏ СЃ С‚РѕР№ СЃС‚РѕСЂРѕРЅС‹, РєСѓРґР° С‚РІР°СЂСЊ РёРґС‘С‚.
   */
  faceDir: number;
}

interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  radius: number;
  life: number;
  fromPlayer: boolean;
  color: string;
  isArrow: boolean;
  isMagic: boolean;
  chainTargetId?: string;
  isChain: boolean;
  element?: Element;
  /**
   * Р’РёРґ СЃРЅР°СЂСЏРґР° (СЃРј. arrows.ArrowKind). Р Р°РЅСЊС€Рµ РІРёРґ РѕРїСЂРµРґРµР»СЏР»СЃСЏ РїРѕ
   * `isArrow`/`isMagic` вЂ” СЌС‚Рѕ Р”Р’Рђ РІР°СЂРёР°РЅС‚Р° РЅР° РІСЃРµС…: РїРѕР»РѕСЃРєР° РёР»Рё РєСЂСѓРі.
   * РўРµРїРµСЂСЊ РєР°Р¶РґС‹Р№ СЃРЅР°СЂСЏРґ СЂРёСЃСѓРµС‚СЃСЏ СЃР°Рј РїРѕ СЃРµР±Рµ (СЃС‚СЂРµР»Р°, Р»РµРґСЏРЅРѕР№ РЅР°РєРѕРЅРµС‡РЅРёРє,
   * РєСЂРёСЃС‚Р°Р»Р», РѕРіРЅРµРЅРЅРѕРµ РїР»Р°РјСЏвЂ¦), Рё РёРіСЂРѕРє Р’РР”РРў, С‡С‚Рѕ РІ РЅРµРіРѕ Р»РµС‚РёС‚.
   */
  kind: ArrowKind;
  /** РСЃС‚РѕСЂРёСЏ РїРѕР·РёС†РёР№ РґР»СЏ СЃР»РµРґР°: Р±РµР· РЅРµС‘ Р±С‹СЃС‚СЂС‹Р№ СЃРЅР°СЂСЏРґ вЂ” С‚РѕС‡РєР° РјРµР¶РґСѓ РєР°РґСЂР°РјРё. */
  trail: TrailPoint[];
  /** Р—Р°РґРµСЂР¶РєР° В«РІ РїРѕР»С‘С‚РµВ» РґР»СЏ С‚РµР»РµРіСЂР°С„РёСЂРѕРІР°РЅРЅС‹С… РІС‹СЃС‚СЂРµР»РѕРІ (rain/lunge). */
  age: number;
  /** РћС‚РєСѓРґР° РІС‹РїСѓС‰РµРЅ вЂ” РґР»СЏ В«СЂР°Р·Р»С‘С‚Р°В» РѕС‚ Р±РѕСЃСЃР° РїСЂРё РїРѕСЏРІР»РµРЅРёРё. */
  spin: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

/**
 * РР”РЈР©РђРЇ РђРўРђРљРђ Р‘РћРЎРЎРђ. РҐСЂР°РЅРёС‚ РІСЃС‘, С‡С‚Рѕ РЅСѓР¶РЅРѕ Рё РґР»СЏ Р»РѕРіРёРєРё (РєРѕРіРґР° Р±РёС‚СЊ),
 * Рё РґР»СЏ РѕС‚СЂРёСЃРѕРІРєРё С‚РµР»РµРіСЂР°С„Р° (С‡С‚Рѕ РїРѕРєР°Р·Р°С‚СЊ РёРіСЂРѕРєСѓ).
 */
/**
 * ЛУЧ ВЗГЛЯДА — «стойкий» приём: горит вдоль направления несколько секунд.
 * Урон по кадру, поэтому стоять в коридоре нельзя ни секунды.
 */
export interface BossBeam {
  x: number;
  y: number;
  /** Направление луча (радианы). */
  ang: number;
  /** Длина луча, px. */
  len: number;
  /** Полуширина коридора, px. */
  width: number;
  /** Урон за секунду пребывания в коридоре. */
  dps: number;
  /** Осталось жизни, сек. */
  life: number;
  /** Цвет для отрисовки. */
  color: string;
}

export interface BossCast {
  /** РљС‚Рѕ РєР°СЃС‚СѓРµС‚. */
  bossId: string;
  attack: BossAttackDef;
  /** Р¤Р°Р·Р°: 'windup' вЂ” С‚РµР»РµРіСЂР°С„, 'active' вЂ” СѓРґР°СЂ РЅР°РЅРѕСЃРёС‚СЃСЏ, 'recover' вЂ” РїР°СѓР·Р°. */
  phase: 'windup' | 'active' | 'recover';
  /** РЎРєРѕР»СЊРєРѕ СЃРµРєСѓРЅРґ РІ С‚РµРєСѓС‰РµР№ С„Р°Р·Рµ (СЃС‡РёС‚Р°РµС‚СЃСЏ РІРЅРёР·). */
  t: number;
  /** РќР°РїСЂР°РІР»РµРЅРёРµ РЅР° РёРіСЂРѕРєР° РІ РјРѕРјРµРЅС‚ Р·Р°РјР°С…Р° (Р±РѕСЃСЃ РЅРµ В«РІРµРґС‘С‚В» С†РµР»СЊ). */
  aim: number;
  /**
   * РџРѕР·Р° РљРћР›Р”РЈР®Р©Р•Р™ Р РЈРљР: РєР°РєРѕР№ Р¶РµСЃС‚ РїРѕРєР°Р·С‹РІР°РµС‚ Р±РѕСЃСЃ, РїРѕРєР° РєРѕРїРёС‚ СЃРёР»Сѓ.
   * РЎС‡РёС‚Р°РµС‚СЃСЏ РѕРґРёРЅ СЂР°Р· РїСЂРё СЃС‚Р°СЂС‚Рµ РєР°СЃС‚Р° (castStyleFor) Рё РґРµСЂР¶РёС‚СЃСЏ РґРѕ РєРѕРЅС†Р° вЂ”
   * РёРЅР°С‡Рµ РїРѕР·Р° В«РґСЂРѕР¶Р°Р»Р°В» Р±С‹ РјРµР¶РґСѓ РєР°РґСЂР°РјРё.
   */
  cast: CastStyle;
  /**
   * РћС‡РєРё РїСЂРёС†РµР»РёРІР°РЅРёСЏ: РґР»СЏ 'rain'/'mines' вЂ” РјРµСЃС‚Р° РїР°РґРµРЅРёСЏ, РґР»СЏ
   * 'groundLine' вЂ” С‚РѕС‡РєРё СЃРµРєС‚РѕСЂР°. РЈ СЃРµРєС‚РѕСЂРЅС‹С… С‚РѕС‡РµРє РµСЃС‚СЊ `r` (СЂР°РґРёСѓСЃ
   * РїРѕСЂР°Р¶РµРЅРёСЏ), Сѓ С‚РѕС‡РµРє РїР°РґРµРЅРёСЏ вЂ” РЅРµС‚, РїРѕСЌС‚РѕРјСѓ РѕРЅ РЅРµРѕР±СЏР·Р°С‚РµР»РµРЅ.
   */
  marks: Array<{ x: number; y: number; r?: number }>;
  /** Урон одного удара (уже с фазовым множителем). */
  damage: number;
  /** Случайный сдвиг для кольца, чтобы «карман» не был предсказуем. */
  roll: number;
  /**
   * ЧЕМ БОСС БЬЁТ (анатомия приёма) — гибрид из набора босса и формы
   * атаки: веер из меча → weaponSweep (дуга настоящего клинка), земляной
   * штамп → quakeSlam, дождь метеоров → shardBurst. Без этого у ЛЮБОГО
   * приёма играла бы одна и та же анимация, и «много интересных атак»
   * сводилось бы к разным снарядам при одинаковом теле.
   */
  sig: SignatureKind;
  /**
   * ОРУЖИЕ, которым босс замахивается в этот каст (null = без оружия).
   * Для ближних приёмов (weaponSweep) движок рисует НАСТОЯЩИЙ клинок в
   * кисти, а не линию канвы.
   */
  weapon: WeaponKit | null;
}

interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  vy: number;
}

interface PlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  health: number;
  maxHealth: number;
  stamina: number;
  maxStamina: number;
  damage: number;
  speed: number;
  facing: Vec2;
  attackCooldown: number;
  skillCooldown: number;
  hitFlash: number;
  walkAnim: number;
  isMoving: boolean;
  invuln: number;
  buffTimers: Record<string, number>;
  poisonStacks: number;
  slowTimer: number;
  burnTimer: number;
  attackAnim: number;
}

export interface CombatCallbacks {
  onWaveCleared: (wave: number, goldEarned: number, expEarned: number) => void;
  onPlayerDeath: () => void;
  onBossCaptured: (boss: CapturedBoss) => void;
  onProfileUpdate: (partial: Partial<SaveProfile>) => void;
  onPotionUsed: (type: 'health' | 'stamina' | 'revival') => void;
  onPotionCooldownUpdate: (type: 'health' | 'stamina', cooldown: number, maxCooldown: number) => void;
  onPotionBlocked: (type: 'health' | 'stamina' | 'revival', reason: 'full-health' | 'full-stamina' | 'none-owned' | 'cooldown') => void;
  onWaveResult: (result: 'victory' | 'defeat', wave: number, goldEarned: number, expEarned: number) => void;
  onBossHpChange: (bossName1: string | null, hpPercent1: number, bossName2?: string | null, hpPercent2?: number) => void;
}

export class CombatEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  profile: SaveProfile;
  characterClass: CharacterClass;
  callbacks: CombatCallbacks;

  player: PlayerState;
  enemies: Enemy[] = [];
  projectiles: Projectile[] = [];
  particles: Particle[] = [];
  floatingTexts: FloatingText[] = [];

  currentWave = 0;
  waveActive = false;
  waveTransitionTimer = 0;
  waveTransitionText = '';
  waveTransitionSubtext = '';

  goldThisWave = 0;
  expThisWave = 0;
  enemiesKilledThisWave = 0;
  enemiesNeededThisWave = 0;
  bossSpawnedThisWave = false;

  paused = false;
  gameOver = false;
  revivalUsed = false;

  healthPotionCooldown = 0;
  staminaPotionCooldown = 0;
  healthPotionUsedThisWave = false;
  staminaPotionUsedThisWave = false;

  waveResult: CombatResult = null;
  waveResultTimer = 0;

  bossHpBarVisible = false;
  bossHpPercent = 1;
  bossName = '';
  bossName1: string | null = null;
  bossHp1 = 0;
  bossName2: string | null = null;
  bossHp2 = 0;

  keys: Record<string, boolean> = {};
  mousePos: Vec2 = { x: 0, y: 0 };
  mouseDown = false;
  rightMouseDown = false;
  chargeTime = 0;
  isCharging = false;

  // Melee weapons: sword (warrior) and sickle (assassin) share the same semi-arc swing animation
  meleeSword = new MeleeAttack(SWORD_CONFIG);
  meleeSickle = new MeleeAttack(SICKLE_CONFIG);
  /** Автономный калькулятор ближнего боя (meleeCombat.ts): тайминги/дальность из signatureProfile. */
  private readonly meleeCalc = new MeleeCombat();

  // РќР°Р·РµРјРЅС‹Рµ Р·РѕРЅС‹ (РєРёСЃР»РѕС‚Р° СЃР»РёР·РЅСЏ, РіРѕСЂСЏС‰РёР№ СЃР»РµРґ РґСЂР°РєРѕРЅР°, РїР°СѓС‚РёРЅР°) Рё С‚СЂСЏСЃРєР° СЌРєСЂР°РЅР°
  puddles: GroundPuddle[] = [];
  /**
   * ЛУЧИ ВЗГЛЯДА (форма 'beam'). Приём gazeBeam был объявлен, но не имел ни
   * обработки, ни отрисовки — глаз/призрак/кристалл физически не могли его
   * применить. Теперь луч живёт на поле как отдельная сущность: несколько секунд
   * горит вдоль направления, бьёт игрока попаданием в коридор и гаснет.
   */
  beams: BossBeam[] = [];
  shake = 0;
  /**
   * В«Р—РђРњРђРҐВ» Р‘РћРЎРЎРђ вЂ” РёРґСѓС‰Р°СЏ Р°С‚Р°РєР°. Р Р°РЅСЊС€Рµ Р±РѕСЃСЃ РїСЂРёРјРµРЅСЏР» СЃРїРѕСЃРѕР±РЅРѕСЃС‚СЊ
   * РњР“РќРћР’Р•РќРќРћ (`doBossAbility` в†’ `playerTakeDamage` РІ С‚РѕС‚ Р¶Рµ РєР°РґСЂ), Рё
   * Р»РёР±Рѕ СѓСЂРѕРЅ РїСЂРёР»РµС‚Р°Р» Р±РµР· РїСЂРµРґСѓРїСЂРµР¶РґРµРЅРёСЏ (РЅРµС‡РµСЃС‚РЅРѕ), Р»РёР±Рѕ СЃРїРѕСЃРѕР±РЅРѕСЃС‚СЊ
   * РЅРµ РїРѕРїР°РґР°Р»Р° РІРѕРІСЃРµ (СЃРєСѓС‡РЅРѕ). РўРµРїРµСЂСЊ Р°С‚Р°РєР° Р¶РёРІС‘С‚ РІ С‚СЂС‘С… С„Р°Р·Р°С…:
   *   windup  вЂ” С‚РµР»РµРіСЂР°С„: РІРёРґРЅРѕ Р·РѕРЅСѓ/Р»СѓС‡/РєРѕР»СЊС†Рѕ, РµСЃС‚СЊ `telegraph` СЃРµРєСѓРЅРґ;
   *   active  вЂ” РІС‹СЃС‚СЂРµР»С‹/СѓРґР°СЂ Р»РµС‚СЏС‚ (СЃРЅР°СЂСЏРґС‹ СЃ С…РІРѕСЃС‚РѕРј);
   *   recover вЂ” РєРѕСЂРѕС‚РєР°СЏ РїР°СѓР·Р° РїРѕСЃР»Рµ СѓРґР°СЂР°.
   * РРјРµРЅРЅРѕ СЌС‚Рѕ РґРµР»Р°РµС‚ В«СѓРІРµСЂРЅСѓС‚СЊСЃСЏВ» РѕСЃРјС‹СЃР»РµРЅРЅС‹Рј: РёРіСЂРѕРє РІРёРґРёС‚, РєСѓРґР°
   * РїСЂРёРґС‘С‚ СѓРґР°СЂ, Рё СѓСЃРїРµРІР°РµС‚ СѓР№С‚Рё, Р° РЅРµ РіР°РґР°РµС‚.
   */
  casts: BossCast[] = [];
  /**
   * ТЕКУЩАЯ АТАКА КАЖДОГО БОССА (шаг ротации 0/1/2 личного набора).
   * Раньше босс бьёт РОВНО ОДНОЙ атакой своей фазы всю битву — «много
   * интересных атак» существовало только на бумаге. Теперь на смене
   * кулдауна босс ПЕРЕКЛЮЧАЕТСЯ на следующий приём своего набора:
   * веер → зона → рывок → веер… и игрок видит все три.
   */
  bossAtkIdx: Record<string, number> = {};
  /** РЎС‚РѕРї-РєР°РґСЂ (hitstop) РїСЂРё РїРѕРїР°РґР°РЅРёРё: РєР°РґСЂС‹ В«Р·Р°РјРёСЂР°СЋС‚В», СѓРґР°СЂ С‡РёС‚Р°РµС‚СЃСЏ. */
  hitstop = 0;
  /**
   * Р©РРў РћРў В«Р РЃР’РђВ»: СЃРєРѕР»СЊРєРѕ СѓСЂРѕРЅР° С‚РІР°СЂСЊ РµС‰С‘ РїСЂРѕРіР»РѕС‚РёС‚. РљР»СЋС‡ вЂ” id РІСЂР°РіР°, Р° РЅРµ
   * СЃР°Рј РѕР±СЉРµРєС‚: РІСЂР°РіРѕРІ РїРµСЂРµСЃРѕР·РґР°СЋС‚ РјРµР¶РґСѓ РІРѕР»РЅР°РјРё, Рё РїРѕ РѕР±СЉРµРєС‚Сѓ РєР°СЂС‚Р° С‚РµРєР»Р° Р±С‹.
   * Р Р°РЅСЊС€Рµ В«СЂС‘РІВ» РІРѕРѕР±С‰Рµ РЅРёС‡РµРіРѕ РЅРµ РґРµР»Р°Р» вЂ” С‚РµРїРµСЂСЊ СЌС‚Рѕ РЅР°СЃС‚РѕСЏС‰Р°СЏ РїРѕРґРґРµСЂР¶РєР°.
   */
  shielded: Record<string, number> = {};

  /**
   * Р­РҐРћ РџР РћРЁР›Р«РҐ Р’РћР›Рќ. Р”Р»СЏ РєР°Р¶РґРѕР№ РѕР±С‹С‡РЅРѕР№ РІРѕР»РЅС‹ С…СЂР°РЅРёС‚СЃСЏ СЃРїРёСЃРѕРє id РјРѕРЅСЃС‚СЂРѕРІ,
   * РєРѕС‚РѕСЂС‹Рµ СЂРµР°Р»СЊРЅРѕ РЅР° РЅРµС‘ РїСЂРёС€Р»Рё. Р‘РѕСЃСЃ-В«РїСЂРёР·С‹РІР°С‚РµР»СЊВ» РїРѕРґРЅРёРјР°РµС‚ РёРјРµРЅРЅРѕ РёС… вЂ”
   * РёРіСЂРѕРє СѓР·РЅР°С‘С‚ С‚РІР°СЂРµР№, РєРѕС‚РѕСЂС‹С… СѓР¶Рµ РїСЂРѕС…РѕРґРёР», РЅРѕ С‚РµРїРµСЂСЊ РѕРЅРё РјР°СЃС€С‚Р°Р±РёСЂРѕРІР°РЅС‹ РїРѕРґ
   * С‚РµРєСѓС‰СѓСЋ РІРѕР»РЅСѓ (СЃРј. summonEcho). Р”РµСЂР¶РёРј СЂРѕРІРЅРѕ 5 РїРѕСЃР»РµРґРЅРёС… РІРѕР»РЅ.
   */
  waveHistory: string[][] = [];

  mobileMove: Vec2 = { x: 0, y: 0 };
  mobileMainAttack = false;
  mobileUniqueAttack = false;

  lastTime = 0;
  animationFrame = 0;
  running = false;

  rafId: number | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    profile: SaveProfile,
    callbacks: CombatCallbacks,
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.profile = profile;
    this.characterClass = profile.equippedCharacter;
    this.callbacks = callbacks;

    const rect = canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    canvas.width = this.width;
    canvas.height = this.height;

    const char = CHARACTERS.find(c => c.id === this.characterClass)!;
    this.player = {
      x: this.width / 2,
      y: this.height / 2,
      vx: 0,
      vy: 0,
      health: char.baseHealth,
      maxHealth: char.baseHealth,
      stamina: char.baseStamina,
      maxStamina: char.baseStamina,
      damage: char.baseDamage,
      speed: char.baseSpeed,
      facing: { x: 1, y: 0 },
      attackCooldown: 0,
      skillCooldown: 0,
      hitFlash: 0,
      walkAnim: 0,
      isMoving: false,
      invuln: 0,
      buffTimers: {},
      poisonStacks: 0,
      slowTimer: 0,
      burnTimer: 0,
      attackAnim: 0,
    };

    this.applyPassives();
    // Escape guarantee: every hero outruns every monster/boss, so a chase can always
    // be broken. Р“РµСЂРѕР№ Рё РІСЂР°РіРё РїРѕР»СѓС‡Р°СЋС‚ РћР”РРќРђРљРћР’С‹Р№ РјРЅРѕР¶РёС‚РµР»СЊ СЃРєРѕСЂРѕСЃС‚Рё Р·Р° РІРѕР»РЅСѓ
    // (СЃРј. applyWaveSpeed Рё spawnEnemy), РїРѕСЌС‚РѕРјСѓ СЃРѕРѕС‚РЅРѕС€РµРЅРёРµ В«РєС‚Рѕ Р±С‹СЃС‚СЂРµРµВ» РЅРµ
    // РјРµРЅСЏРµС‚СЃСЏ РѕС‚ РІРѕР»РЅС‹ Рє РІРѕР»РЅРµ Рё РїРѕРіРѕРЅСЏ РІСЃРµРіРґР° РѕСЃС‚Р°С‘С‚СЃСЏ СЂР°Р·СЂС‹РІР°РµРјРѕР№.
    this.basePlayerSpeed = this.player.speed;
    this.player.speed *= 1.25;
    this.applyWaveSpeed();
  }

  /**
   * РџРµСЂРµСЃС‡РёС‚С‹РІР°РµС‚ СЃРєРѕСЂРѕСЃС‚СЊ РіРµСЂРѕСЏ РїРѕРґ С‚РµРєСѓС‰СѓСЋ РІРѕР»РЅСѓ. Р’С‹Р·С‹РІР°РµС‚СЃСЏ РїСЂРё СЃС‚Р°СЂС‚Рµ Р·Р°Р±РµРіР°
   * Рё РїСЂРё РїРѕРІС‚РѕСЂРµ РІРѕР»РЅС‹ (retryWave), РіРґРµ currentWave РјРµРЅСЏРµС‚СЃСЏ вЂ” РёРЅР°С‡Рµ РіРµСЂРѕР№
   * СЃРѕС…СЂР°РЅСЏР» Р±С‹ СЃРєРѕСЂРѕСЃС‚СЊ РѕС‚ РїСЂРµРґС‹РґСѓС‰РµР№ РІРѕР»РЅС‹.
   */
  applyWaveSpeed() {
    const mult = 1 + Math.min(WAVE_SPEED_MULTIPLIER_MAX, (this.currentWave - 1) * WAVE_SPEED_MULTIPLIER);
    this.player.speed = this.basePlayerSpeed * 1.25 * mult;
  }

  /** Р‘Р°Р·РѕРІР°СЏ СЃРєРѕСЂРѕСЃС‚СЊ РіРµСЂРѕСЏ Р±РµР· РІРѕР»РЅРѕРІРѕРіРѕ РјРЅРѕР¶РёС‚РµР»СЏ (РїРѕСЃР»Рµ РїР°СЃСЃРёРІРѕРє, РґРѕ Г—1.25). */
  basePlayerSpeed = 0;

  applyPassives() {
    const char = CHARACTERS.find(c => c.id === this.characterClass)!;
    const unlocked = this.profile.unlockedSkills[this.characterClass] || [];

    // Р РћРЎРў Р—Рђ РЈР РћР’Р•РќР¬ РћРџР«РўРђ. Р Р°РЅСЊС€Рµ РѕРїС‹С‚ РІРѕРѕР±С‰Рµ РЅРёС‡РµРіРѕ РЅРµ РґР°РІР°Р»: РµРґРёРЅСЃС‚РІРµРЅРЅС‹Рј
    // РёСЃС‚РѕС‡РЅРёРєРѕРј СЃРёР»С‹ Р±С‹Р»Рё С‚Р°Р»Р°РЅС‚С‹ Р·Р° Р·РѕР»РѕС‚Рѕ, РїРѕСЌС‚РѕРјСѓ РЅР° 40+ РІРѕР»РЅРµ РіРµСЂРѕР№ Р±С‹Р»
    // СЃР»Р°Р±РµРµ Р»СЋР±РѕРіРѕ РІСЂР°РіР°. РўРµРїРµСЂСЊ РєР°Р¶РґС‹Р№ СѓСЂРѕРІРµРЅСЊ РѕС‰СѓС‚РёРјРѕ СѓСЃРёР»РёРІР°РµС‚ РїРµСЂСЃРѕРЅР°Р¶Р°.
    const lvl = Math.max(1, this.profile.level || 1);
    if (lvl > 1) {
      this.player.damage = Math.floor(this.player.damage * (1 + (lvl - 1) * PLAYER_DAMAGE_PER_LEVEL));
      this.player.maxHealth = Math.floor(this.player.maxHealth * (1 + (lvl - 1) * PLAYER_HEALTH_PER_LEVEL));
    }

    // Per-character talent: +15% damage per level
    const charTalents = this.profile.talentLevels?.[this.characterClass] || { damage: 0, health: 0 };
    if (charTalents.damage > 0) {
      this.player.damage = Math.floor(this.player.damage * (1 + charTalents.damage * TALENT_BONUS_PER_LEVEL));
    }
    // Per-character talent: +15% health per level
    if (charTalents.health > 0) {
      this.player.maxHealth = Math.floor(this.player.maxHealth * (1 + charTalents.health * TALENT_BONUS_PER_LEVEL));
    }
    // РџРѕСЂРѕРі Р·РґРѕСЂРѕРІСЊСЏ РїРѕРґРЅСЏР»СЃСЏ РїРѕСЃР»Рµ РјРЅРѕР¶РёС‚РµР»РµР№ вЂ” СЃС‚Р°СЂС‚РѕРІРѕРµ HP С‚РѕР¶Рµ РґРѕР»Р¶РЅРѕ Р±С‹С‚СЊ РїРѕР»РЅС‹Рј.
    this.player.health = Math.min(this.player.maxHealth, this.player.health + (this.player.maxHealth - char.baseHealth));

    if (unlocked.includes('w_ironhide')) {
      this.player.maxHealth = Math.floor(this.player.maxHealth * 1.3);
      this.player.health = this.player.maxHealth;
    }
    if (unlocked.includes('w_earthwrath')) {
      this.player.damage = Math.floor(this.player.damage * 1.4);
    }
    if (unlocked.includes('a_swift')) {
      this.player.speed *= 1.25;
    }
    if (unlocked.includes('a_storm')) {
      this.player.damage = Math.floor(this.player.damage * 1.45);
    }
    if (unlocked.includes('m_apex')) {
      this.player.damage = Math.floor(this.player.damage * 1.5);
    }
    if (unlocked.includes('s_shadowstep')) {
      this.player.speed *= 1.35;
    }
    if (unlocked.includes('s_deathmark')) {
      this.player.damage = Math.floor(this.player.damage * 1.55);
    }
  }

  getStaminaRegen(): number {
    const unlocked = this.profile.unlockedSkills[this.characterClass] || [];
    let regen = STAMINA_REGEN_RATE;
    if (unlocked.includes('w_secondwind') || unlocked.includes('m_manaflow')) {
      regen = STAMINA_REGEN_SECOND_WIND;
    }
    return regen;
  }

  hasSkill(skillId: string): boolean {
    return (this.profile.unlockedSkills[this.characterClass] || []).includes(skillId);
  }

  startWave: number = 0;

  start() {
    this.running = true;
    this.lastTime = performance.now();
    if (this.startWave > 1) {
      this.currentWave = this.startWave - 1;
    }
    // РЎРєРѕСЂРѕСЃС‚СЊ РіРµСЂРѕСЏ РїРµСЂРµСЃС‡РёС‚С‹РІР°РµС‚СЃСЏ РїРѕРґ СЃС‚Р°СЂС‚РѕРІСѓСЋ РІРѕР»РЅСѓ (РІ РєРѕРЅСЃС‚СЂСѓРєС‚РѕСЂРµ
    // currentWave Р±С‹Р» СЂР°РІРµРЅ 0, РїРѕСЌС‚РѕРјСѓ РјРЅРѕР¶РёС‚РµР»СЊ Р±С‹Р» Р±С‹ РЅРµРІРµСЂРЅС‹Рј).
    this.applyWaveSpeed();
    this.startNextWave();
    this.loop();
  }

  stop() {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    audio.stopMusic();
  }

  loop = () => {
    if (!this.running) return;
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;

    try {
      if (!this.paused && !this.gameOver) {
        this.update(dt);
      }
      this.render();
    } catch (err) {
      // Р—Р°С‰РёС‚Р° РѕС‚ В«С‡С‘СЂРЅРѕРіРѕ СЌРєСЂР°РЅР°В»: РѕС€РёР±РєР° РЅРµ РґРѕР»Р¶РЅР° СѓР±РёРІР°С‚СЊ РёРіСЂРѕРІРѕР№ С†РёРєР».
      console.error('[CombatEngine] loop error:', err);
      try {
        const ctx = this.ctx;
        ctx.fillStyle = 'rgba(120,0,0,0.85)';
        ctx.fillRect(0, 0, this.width, this.height);
        ctx.fillStyle = '#fff';
        ctx.font = '13px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        const msg = err instanceof Error ? (err.stack || err.message) : String(err);
        msg.split('\n').slice(0, 14).forEach((l: string, i: number) => ctx.fillText(l, 12, 12 + i * 17));
      } catch { /* ignore */ }
    }
    this.rafId = requestAnimationFrame(this.loop);
  };

  /**
   * РњРЅРѕР¶РёС‚РµР»СЊ Р—Р”РћР РћР’Р¬РЇ РІСЂР°РіРѕРІ РЅР° С‚РµРєСѓС‰РµР№ РІРѕР»РЅРµ.
   * Р Р°РЅСЊС€Рµ Р·РґРѕСЂРѕРІСЊРµ Рё СѓСЂРѕРЅ СЂРѕСЃР»Рё РћР”РќРћР™ РєСЂРёРІРѕР№, Рё Рє 100-Р№ РІРѕР»РЅРµ РјРЅРѕР¶РёС‚РµР»СЊ СѓСЂРѕРЅР°
   * Р±С‹Р» ~9x РїСЂРё 150 HP Сѓ РіРµСЂРѕСЏ: Р»СЋР±РѕР№ СѓРґР°СЂ = СЃРјРµСЂС‚СЊ. РўРµРїРµСЂСЊ Сѓ СЌС‚РѕРіРѕ РјРЅРѕР¶РёС‚РµР»СЏ
   * СЃРІРѕСЏ, РІРґРІРѕРµ РїРѕР»РѕР¶РµСЏ РєСЂРёРІР°СЏ вЂ” Р±РѕР№ СЃС‚Р°РЅРѕРІРёС‚СЃСЏ РґР»РёРЅРЅРµРµ, Р° РЅРµ СЃРјРµСЂС‚РµР»СЊРЅРµРµ.
   */
  getWaveHealthMultiplier(isBoss = false): number {
    const hard = this.profile.gameMode === 'hard';
    const perWave = isBoss
      ? (hard ? HARD_BOSS_WAVE_HEALTH_MULTIPLIER : BOSS_WAVE_HEALTH_MULTIPLIER)
      : (hard ? HARD_WAVE_HEALTH_MULTIPLIER : WAVE_HEALTH_MULTIPLIER);
    return 1 + (this.currentWave - 1) * perWave;
  }

  /**
   * РњРЅРѕР¶РёС‚РµР»СЊ РЈР РћРќРђ РІСЂР°РіРѕРІ вЂ” СЂР°СЃС‚С‘С‚ РќРђРњРќРћР“Рћ РјРµРґР»РµРЅРЅРµРµ Р·РґРѕСЂРѕРІСЊСЏ.
   * РРјРµРЅРЅРѕ СЌС‚Рѕ РґРµР»Р°РµС‚ РёРіСЂСѓ РїСЂРѕС…РѕРґРёРјРѕР№: С‚РІР°СЂСЊ РЅР° РїРѕР·РґРЅРµР№ РІРѕР»РЅРµ РѕС‰СѓС‚РёРјРѕ РєСЂРµРїС‡Рµ,
   * РЅРѕ РЅРµ РІС‹РЅРѕСЃРёС‚ РіРµСЂРѕСЏ СЃ РѕРґРЅРѕРіРѕ РєР°СЃР°РЅРёСЏ.
   */
  getWaveDamageMultiplier(isBoss = false): number {
    const hard = this.profile.gameMode === 'hard';
    const perWave = isBoss
      ? (hard ? HARD_BOSS_WAVE_DAMAGE_MULTIPLIER : BOSS_WAVE_DAMAGE_MULTIPLIER)
      : (hard ? HARD_WAVE_DAMAGE_MULTIPLIER : WAVE_DAMAGE_MULTIPLIER);
    return 1 + (this.currentWave - 1) * perWave;
  }

  getDifficultyHealthMult(): number {
    return this.profile.gameMode === 'hard' ? HARD_HEALTH_MULTIPLIER : 1;
  }

  getDifficultyDamageMult(): number {
    return this.profile.gameMode === 'hard' ? HARD_DAMAGE_MULTIPLIER : 1;
  }

  startNextWave() {
    this.currentWave++;
    if (this.currentWave > MAX_WAVES) {
      this.currentWave = MAX_WAVES;
      return;
    }
    // РќРѕРІР°СЏ РїР°СЂС‚РёСЏ вЂ” С‡РёСЃС‚РѕРµ СЌС…Рѕ: Р±РѕСЃСЃ РІРѕР»РЅС‹ 5 РЅРµ РґРѕР»Р¶РµРЅ В«РІСЃРїРѕРјРёРЅР°С‚СЊВ» РјРѕРЅСЃС‚СЂРѕРІ
    // РїСЂРµРґС‹РґСѓС‰РµРіРѕ Р·Р°Р±РµРіР°.
    if (this.currentWave === 1) this.waveHistory = [];
    this.goldThisWave = 0;
    this.expThisWave = 0;
    this.enemiesKilledThisWave = 0;
    this.bossSpawnedThisWave = false;
    this.healthPotionUsedThisWave = false;
    this.staminaPotionUsedThisWave = false;
    this.waveResult = null;

    const isBossWave = this.currentWave % BOSS_WAVE_INTERVAL === 0;
    const equippedDungeons = this.profile.equippedDungeons.length > 0
      ? this.profile.equippedDungeons
      : ['whispering_grove'];

    if (isBossWave) {
      this.enemiesNeededThisWave = equippedDungeons.length;
      this.waveTransitionText = `Wave ${this.currentWave}`;
      this.waveTransitionSubtext = 'BOSS WAVE';
      audio.playSfx('boss-spawn');
    } else {
      const baseCount = 5 + Math.floor(this.currentWave / 3);
      this.enemiesNeededThisWave = baseCount + equippedDungeons.length;
      this.waveTransitionText = `Wave ${this.currentWave}`;
      this.waveTransitionSubtext = '';
      audio.playSfx('wave-start');
    }

    this.waveTransitionTimer = 2.0;
    this.waveActive = false;

    this.spawnWaveEnemies(isBossWave, equippedDungeons);
  }

  spawnWaveEnemies(isBossWave: boolean, equippedDungeons: string[]) {
    const dungeonDefs = DUNGEONS.filter(d => equippedDungeons.includes(d.id));
    // Р—РґРѕСЂРѕРІСЊРµ Рё СѓСЂРѕРЅ РІСЂР°РіР° СЂР°СЃС‚СѓС‚ Р РђР—РќР«РњР С‚РµРјРїР°РјРё: СЃРј. getWaveDamageMultiplier().
    const hpMult = this.getWaveHealthMultiplier(isBossWave);
    const dmgMult = this.getWaveDamageMultiplier(isBossWave);
    const healthMult = this.getDifficultyHealthMult();
    const damageMult = this.getDifficultyDamageMult();

    if (isBossWave) {
      const bossIndex = Math.floor(this.currentWave / BOSS_WAVE_INTERVAL) - 1;
      // On boss waves with multiple equipped dungeons, spawn up to 2 bosses (one from each of first 2 dungeons)
      const maxBosses = Math.min(2, dungeonDefs.length);
      for (let i = 0; i < maxBosses; i++) {
        const dg = dungeonDefs[i];
        const proceduralBosses = generateDungeonBosses(dg.id);
        const bossDef = proceduralBosses[bossIndex % proceduralBosses.length];
        if (bossDef) {
          this.spawnEnemy(bossDef, hpMult, true, healthMult, damageMult, dmgMult);
        }
      }
      // Set boss wave subtext for multi-dungeon
      if (dungeonDefs.length > 1) {
        this.waveTransitionSubtext = 'Р’РЅРёРјР°РЅРёРµ! РЎРёР»С‹ РїРѕРґР·РµРјРµР»РёР№ РѕР±СЉРµРґРёРЅРёР»РёСЃСЊ. Р’Р°СЃ Р¶РґСѓС‚ РґРІР° Р±РѕСЃСЃР° СЃ РєРѕРјР±РёРЅРёСЂРѕРІР°РЅРЅС‹РјРё СЃРїРѕСЃРѕР±РЅРѕСЃС‚СЏРјРё!';
      } else {
        this.waveTransitionSubtext = 'BOSS WAVE';
      }
    } else {
      // Collect procedural tier enemies from equipped dungeons, filtered by minWave
      const availableEnemies: string[] = [];
      for (const dg of dungeonDefs) {
        const dgEnemies = Object.values(ALL_ENEMIES).filter(
          e => !e.isBoss && e.dungeonId === dg.id && (!e.minWave || this.currentWave >= e.minWave)
        );
        for (const e of dgEnemies) {
          if (!availableEnemies.includes(e.id)) availableEnemies.push(e.id);
        }
      }

      // Also add original ENEMIES as fallback
      for (const id of Object.keys(ENEMIES)) {
        const def = ENEMIES[id];
        if (!def.isBoss && (!def.minWave || this.currentWave >= def.minWave) && !availableEnemies.includes(id)) {
          availableEnemies.push(id);
        }
      }

      const fallback = ['slime', 'goblin', 'wolf'];
      const pool = availableEnemies.length > 0 ? availableEnemies : fallback;

      // Limit to 3 unique enemy types per wave to avoid visual chaos
      const maxTypes = 3;
      const selectedTypes: string[] = [];
      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      for (const id of shuffled) {
        if (selectedTypes.length >= maxTypes) break;
        selectedTypes.push(id);
      }

      const totalToSpawn = this.enemiesNeededThisWave;
      // РЎРїРёСЃРѕРє С‚РѕРіРѕ, РєС‚Рѕ Р Р•РђР›Р¬РќРћ РїСЂРёС€С‘Р» РЅР° СЌС‚Сѓ РІРѕР»РЅСѓ: РѕРЅ Р¶Рµ СЃС‚Р°РЅРµС‚ В«СЌС…РѕРјВ» РґР»СЏ
      // Р±РѕСЃСЃР°-РїСЂРёР·С‹РІР°С‚РµР»СЏ (СЃРј. summonEcho) вЂ” С‚Рѕ РµСЃС‚СЊ Р±РѕСЃСЃ РїРѕРґРЅРёРјР°РµС‚ С‚РµС… СЃР°РјС‹С…
      // С‚РІР°СЂРµР№, СЃ РєРѕС‚РѕСЂС‹РјРё РёРіСЂРѕРє С‚РѕР»СЊРєРѕ С‡С‚Рѕ РґСЂР°Р»СЃСЏ, Р° РЅРµ Р°Р±СЃС‚СЂР°РєС‚РЅС‹С… РјРёРЅСЊРѕРЅРѕРІ.
      const spawnedIds: string[] = [];
      for (let i = 0; i < totalToSpawn; i++) {
        const enemyType = selectedTypes[Math.floor(Math.random() * selectedTypes.length)];
        const def = ALL_ENEMIES[enemyType] || ENEMIES[enemyType];
        if (def) {
          spawnedIds.push(def.id);
          this.spawnEnemy(def, hpMult, false, healthMult, damageMult, dmgMult);
        }
      }
      this.recordWaveHistory(spawnedIds);
    }
  }

  /**
   * @param multiplier РјРЅРѕР¶РёС‚РµР»СЊ Р—Р”РћР РћР’Р¬РЇ Р·Р° РІРѕР»РЅСѓ
   * @param damageMultiplier РјРЅРѕР¶РёС‚РµР»СЊ РЈР РћРќРђ Р·Р° РІРѕР»РЅСѓ (СЂР°СЃС‚С‘С‚ РјРµРґР»РµРЅРЅРµРµ Р·РґРѕСЂРѕРІСЊСЏ)
   */
  spawnEnemy(def: EnemyDef, multiplier: number, isBoss: boolean, healthMult = 1, damageMult = 1, damageMultiplier = multiplier) {
    const side = Math.floor(Math.random() * 4);
    let x = 0, y = 0;
    const margin = 40;
    if (side === 0) { x = Math.random() * this.width; y = -margin; }
    else if (side === 1) { x = this.width + margin; y = Math.random() * this.height; }
    else if (side === 2) { x = Math.random() * this.width; y = this.height + margin; }
    else { x = -margin; y = Math.random() * this.height; }

    const health = Math.floor(def.health * multiplier * healthMult);
    const dmg = Math.floor(def.damage * damageMultiplier * damageMult);
    // РЎРєРѕСЂРѕСЃС‚СЊ СЂР°СЃС‚С‘С‚, РЅРѕ СЃ РїРѕС‚РѕР»РєРѕРј: СЂР°РЅСЊС€Рµ Рє 100-Р№ РІРѕР»РЅРµ РјРЅРѕР¶РёС‚РµР»СЊ РґРѕС…РѕРґРёР» РґРѕ
    // 2.98, Рё СЃР°РјР°СЏ Р±С‹СЃС‚СЂР°СЏ С‚РІР°СЂСЊ РѕР±РіРѕРЅСЏР»Р° РіРµСЂРѕСЏ вЂ” РѕС‚ РїРѕРіРѕРЅРё РЅРµР»СЊР·СЏ Р±С‹Р»Рѕ СѓР№С‚Рё.
    const spd = def.speed * (1 + Math.min(WAVE_SPEED_MULTIPLIER_MAX, (this.currentWave - 1) * WAVE_SPEED_MULTIPLIER));

    // РџСЂРѕРіСЂРµРІР°РµРј РІСЃРµ 11 РєР°РґСЂРѕРІ Р°РЅРёРјР°С†РёРё Р—РђР РђРќР•Р•, РїРѕРєР° РјРѕРЅСЃС‚СЂ РїРѕСЏРІР»СЏРµС‚СЃСЏ
    // (spawnAnim 0.5СЃ) вЂ” РІ Р±РѕСЋ СѓР¶Рµ РЅРµ Р±СѓРґРµС‚ РЅРё РѕРґРЅРѕР№ РіРµРЅРµСЂР°С†РёРё СЃРїСЂР°Р№С‚Р°.
    this.warmMonsterFrames(
      def.id,
      def.shape || 'blob',
      isBoss,
      def.color || '#ffffff',
      { nameRu: def.name.ru, nameEn: def.name.en, element: def.element, traits: def.traits, gait: def.gait, weapon: def.weapon, regalia: def.regalia },
    );

    this.enemies.push({
      id: def.id + '_' + Math.random().toString(36).slice(2),
      def: { ...def, damage: dmg, speed: spd },
      x, y,
      vx: 0, vy: 0,
      health,
      maxHealth: health,
      hitFlash: 0,
      attackCooldown: 0,
      isBoss,
      // РџРµСЂРІР°СЏ СЃРїРѕСЃРѕР±РЅРѕСЃС‚СЊ вЂ” РЅР° С‚СЂРµС‚СЊРµРј-С‡РµС‚РІС‘СЂС‚РѕРј С‚Р°РєС‚Рµ Р±РѕСЏ, Р° РЅРµ СЃСЂР°Р·Сѓ:
      // РёРіСЂРѕРє СѓСЃРїРµРІР°РµС‚ СѓРІРёРґРµС‚СЊ Р±РѕСЃСЃР° Рё РїРѕРЅСЏС‚СЊ, С‡С‚Рѕ РѕС‚ РЅРµРіРѕ Р¶РґР°С‚СЊ.
      bossAbilityCooldown: 3 * (def.abilityRate || 1),
      slowTimer: 0,
      poisonTimer: 0,
      poisonDamage: 0,
      spawnAnim: 0.5,
      deathAnim: 0,
      isDying: false,
      captured: false,
      walkAnim: 0,
      isMoving: true,
      invuln: 0,
      attackAnim: 0,
      element: def.element,
      burnTimer: 0,
      sigKind: signatureFor(def.shape || 'blob', def.attackType),
      sigHit: false,
      // РќР°Р±РѕСЂ СЃРїРѕСЃРѕР±РЅРѕСЃС‚РµР№ С‚РІР°СЂРё: С‚РµР»РµСЃРЅР°СЏ + РґР°Р»СЊРЅСЏСЏ (+ СЂС‘РІ Сѓ РєСЂСѓРїРЅС‹С…).
      // Р”Р»СЏ Р±РѕСЃСЃРѕРІ РЅР°Р±РѕСЂ РЅРµ СЃРѕР±РёСЂР°РµРј вЂ” Сѓ РЅРёС… СЃРІРѕРё РєР°СЃС‚С‹ (bossAttacks).
      abilities: isBoss ? [] : monsterAbilitiesFor(
        def.shape || 'blob', def.attackType,
        { element: def.element, weapon: def.weapon, id: def.id },
      ),
      abilitySlot: -1,
      abilityCooldowns: [0, 0, 0],
      castPhase: 'none',
      castT: 0,
      castSlot: -1,
      castAim: 0,
      // РЎС‚Р°СЂС‚РѕРІРѕРµ РЅР°РїСЂР°РІР»РµРЅРёРµ вЂ” Рє РёРіСЂРѕРєСѓ (РІ Р±РѕСЋ РїРѕРїСЂР°РІРёС‚СЃСЏ СЃР°РјРѕ).
      faceDir: x < this.player.x ? 1 : -1,
    });

    if (isBoss && this.currentWave % BOSS_WAVE_INTERVAL === 0) {
      this.bossHpBarVisible = true;
      this.bossHpPercent = 1;
      // Assign to bossName1 or bossName2
      if (!this.bossName1) {
        this.bossName1 = this.profile.language === 'ru' ? def.name.ru : def.name.en;
        this.bossHp1 = 1;
        this.callbacks.onBossHpChange(this.bossName1, 1, null, 0);
      } else if (!this.bossName2) {
        this.bossName2 = this.profile.language === 'ru' ? def.name.ru : def.name.en;
        this.bossHp2 = 1;
        this.callbacks.onBossHpChange(this.bossName1, this.bossHp1, this.bossName2, 1);
      }
    }
  }

  update(dt: number) {
    if (this.waveTransitionTimer > 0) {
      this.waveTransitionTimer -= dt;
      if (this.waveTransitionTimer <= 0) {
        this.waveActive = true;
      }
    }

    if (this.waveResult) {
      this.waveResultTimer -= dt;
      return;
    }

    // РЎС‚РѕРї-РєР°РґСЂ (hitstop): РєРѕСЂРѕС‚РєР°СЏ Р·Р°РјРѕСЂРѕР·РєР° РЎРРњРЈР›РЇР¦РР СЃСЂР°Р·Сѓ РїРѕСЃР»Рµ
    // РїРѕРїР°РґР°РЅРёСЏ. Р‘РµР· РЅРµС‘ СѓРґР°СЂ С‡РёС‚Р°РµС‚СЃСЏ РєР°Рє В«РјРёРЅСѓСЃ РѕРґРЅРѕ HPВ», Р° СЃ РЅРµР№ вЂ” РєР°Рє
    // СѓРґР°СЂ. Р’СЃРµРіРѕ 0.05 СЃ (3 РєР°РґСЂР°) Рё РѕРЅ РќР• СѓРґР»РёРЅСЏРµС‚ i-frames РіРµСЂРѕСЏ, РїРѕСЌС‚РѕРјСѓ
    // РЅРµ РґР°С‘С‚ РїСЂРµРёРјСѓС‰РµСЃС‚РІР° РІ СѓРєСЂС‹С‚РёРё вЂ” С‚РѕР»СЊРєРѕ РѕР±СЂР°С‚РЅСѓСЋ СЃРІСЏР·СЊ.
    //
    // Р’Р°Р¶РЅРѕ: РїРѕРєР° РёРґС‘С‚ СЃС‚РѕРї-РєР°РґСЂ, СЃРёРјСѓР»СЏС†РёСЏ РЅРµ С€Р°РіР°РµС‚ Р’РћРћР‘Р©Р•, РЅРѕ СЂРµРЅРґРµСЂ
    // РІС‹Р·С‹РІР°РµС‚СЃСЏ РєР°Рє РѕР±С‹С‡РЅРѕ (РѕРЅ Р¶РёРІС‘С‚ РІ РѕС‚РґРµР»СЊРЅРѕРј requestAnimationFrame),
    // РїРѕСЌС‚РѕРјСѓ РєР°СЂС‚РёРЅРєР° Р·Р°РјРёСЂР°РµС‚, Р° РЅРµ РјРёРіР°РµС‚. РўР°Р№РјРµСЂС‹ Р·РµР»РёР№/СЂРµР·СѓР»СЊС‚Р°С‚Р° РІРѕР»РЅС‹
    // С‚РѕР¶Рµ Р·Р°РјРёСЂР°СЋС‚ вЂ” РёРЅР°С‡Рµ СЃС‚РѕРї-РєР°РґСЂ РЅРµР·Р°РјРµС‚РЅРѕ РїСЂРѕРґР»РµРІР°Р» Р±С‹ РїРµСЂРµС…РѕРґ.
    if (this.hitstop > 0) {
      this.hitstop = Math.max(0, this.hitstop - dt);
      return;
    }

    this.updatePlayer(dt);
    this.updateMelee(dt);
    this.updateEnemies(dt);
    // РђС‚Р°РєРё Р±РѕСЃСЃРѕРІ РёРґСѓС‚ РЎР’РћРРњ С‚Р°Р№РјРёРЅРіРѕРј (С‚РµР»РµРіСЂР°С„ в†’ СѓРґР°СЂ), РїРѕСЌС‚РѕРјСѓ РѕРЅРё
    // РѕР±РЅРѕРІР»СЏСЋС‚СЃСЏ РјРµР¶РґСѓ РІСЂР°РіР°РјРё Рё СЃРЅР°СЂСЏРґР°РјРё: С‚Р°Рє СѓРґР°СЂ РїСЂРёР»РµС‚Р°РµС‚ РІ
    // РѕС‚РґРµР»СЊРЅС‹Р№ РєР°РґСЂ, Р° РЅРµ РІ С‚РѕРј Р¶Рµ, РіРґРµ РёРіСЂРѕРє РїРѕР»СѓС‡РёР» СѓСЂРѕРЅ РѕС‚ С‚РІР°СЂРё.
    this.updateCasts(dt);
    this.updateProjectiles(dt);
    this.updateParticles(dt);
    this.updateFloatingTexts(dt);
    this.updateHazards(dt);
    this.shake = Math.max(0, this.shake - dt * 30);

    if (this.healthPotionCooldown > 0) {
      this.healthPotionCooldown = Math.max(0, this.healthPotionCooldown - dt);
      this.callbacks.onPotionCooldownUpdate('health', this.healthPotionCooldown, POTION_COOLDOWN);
    }
    if (this.staminaPotionCooldown > 0) {
      this.staminaPotionCooldown = Math.max(0, this.staminaPotionCooldown - dt);
      this.callbacks.onPotionCooldownUpdate('stamina', this.staminaPotionCooldown, POTION_COOLDOWN);
    }

    if (this.waveActive && this.enemies.length === 0 && this.waveTransitionTimer <= 0) {
      this.completeWave();
    }
  }

  startMelee(weapon: MeleeAttack, damage: number) {
    const p = this.player;
    weapon.pendingDamage = damage;
    weapon.start(Math.atan2(p.facing.y, p.facing.x), { x: p.x, y: p.y });
  }

  updateMelee(dt: number) {
    const p = this.player;
    for (const weapon of [this.meleeSword, this.meleeSickle]) {
      if (!weapon.isActive) continue;
      weapon.update(dt, { x: p.x, y: p.y }, Math.atan2(p.facing.y, p.facing.x), this.meleeTargets(), (target) => this.applyMeleeHit(weapon, target));
    }
  }

  /**
   * Р РђР”РРЈРЎ РџРћРџРђР”РђРќРРЇ = Р’РР”РРњР«Р™ СЂР°Р·РјРµСЂ С‚РІР°СЂРё, Р° РЅРµ РµС‘ Р»РѕРіРёС‡РµСЃРєРёР№ СЂР°РґРёСѓСЃ.
   * Р‘РѕСЃСЃ СЂРёСЃСѓРµС‚СЃСЏ РІ 2.5 СЂР°Р·Р° РєСЂСѓРїРЅРµРµ def.radius (СЃРј. renderEnemy), РїРѕСЌС‚РѕРјСѓ СЂР°РЅСЊС€Рµ
   * РјРµС‡, РєРѕСЃРЅСѓРІС€РёР№СЃСЏ РєСЂС‹Р»Р°, Р»Р°РїС‹ РёР»Рё Р±СЂРѕРЅРё Р±РѕСЃСЃР°, РќР• РЅР°РЅРѕСЃРёР» СѓСЂРѕРЅ: РїРѕРїР°РґР°РЅРёРµ
   * Р·Р°СЃС‡РёС‚С‹РІР°Р»РѕСЃСЊ С‚РѕР»СЊРєРѕ РµСЃР»Рё РєР»РёРЅРѕРє РѕРєР°Р·С‹РІР°Р»СЃСЏ РїРѕС‡С‚Рё РІ С†РµРЅС‚СЂРµ РЅРµРІРёРґРёРјРѕРіРѕ СЏРґСЂР°.
   * РўРµРїРµСЂСЊ РёРіСЂРѕРє Р±СЊС‘С‚ РїРѕ РІСЃРµР№ РІРёРґРёРјРѕР№ С‡Р°СЃС‚Рё С‚РµР»Р° вЂ” РєР°Рє Рё РІС‹РіР»СЏРґРёС‚.
   */
  hitRadius(e: Enemy): number {
    return e.def.radius * (e.isBoss ? 2.2 : 1);
  }

  meleeTargets(): MeleeTarget[] {
    const targets: MeleeTarget[] = [];
    for (const e of this.enemies) {
      if (e.isDying || e.invuln > 0) continue;
      targets.push({ id: e.id, x: e.x, y: e.y, radius: this.hitRadius(e) });
    }
    return targets;
  }

  applyMeleeHit(weapon: MeleeAttack, target: MeleeTarget) {
    const e = this.enemies.find(x => x.id === target.id);
    if (!e || e.isDying) return;
    const damage = weapon.pendingDamage;
    e.health -= damage;
    e.hitFlash = 0.3;
    this.spawnHitParticles(e.x, e.y, weapon.config.trailColor === '#ffffff' ? '#ffd966' : weapon.config.trailColor);
    this.spawnFloatingText(e.x, e.y, Math.floor(damage).toString(), weapon.config.trailColor === '#ffffff' ? '#ffd966' : '#ff6666');
    audio.playSfx('enemy-hit');
  }

  updatePlayer(dt: number) {
    const p = this.player;
    const char = CHARACTERS.find(c => c.id === this.characterClass)!;
    const speed = p.speed * 60 * (p.slowTimer > 0 ? 0.35 : 1);

    let dx = 0, dy = 0;

    if (this.profile.platform === 'mobile') {
      dx = this.mobileMove.x;
      dy = this.mobileMove.y;
    } else {
      const scheme = this.profile.settings.controlScheme;
      if (scheme === 'wasd') {
        if (this.keys['KeyW']) dy -= 1;
        if (this.keys['KeyS']) dy += 1;
        if (this.keys['KeyA']) dx -= 1;
        if (this.keys['KeyD']) dx += 1;
      } else {
        if (this.keys['ArrowUp']) dy -= 1;
        if (this.keys['ArrowDown']) dy += 1;
        if (this.keys['ArrowLeft']) dx -= 1;
        if (this.keys['ArrowRight']) dx += 1;
      }
    }

    const mag = Math.sqrt(dx * dx + dy * dy);
    if (mag > 0) {
      dx /= mag;
      dy /= mag;
      p.isMoving = true;
      p.walkAnim += dt * 8;
      if (p.attackCooldown <= 0 && Math.random() < dt * 3) {
        audio.playSfx('footstep');
      }
    } else {
      p.isMoving = false;
    }

    p.vx = dx * speed;
    p.vy = dy * speed;
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    p.x = Math.max(20, Math.min(this.width - 20, p.x));
    p.y = Math.max(20, Math.min(this.height - 20, p.y));

    if (this.profile.platform === 'pc') {
      p.facing.x = this.mousePos.x - p.x;
      p.facing.y = this.mousePos.y - p.y;
      const fmag = Math.sqrt(p.facing.x ** 2 + p.facing.y ** 2);
      if (fmag > 0) { p.facing.x /= fmag; p.facing.y /= fmag; }
    } else if (mag > 0) {
      p.facing.x = dx;
      p.facing.y = dy;
    }

    p.stamina = Math.min(p.maxStamina, p.stamina + this.getStaminaRegen() * dt);

    if (p.health < p.maxHealth) {
      p.health = Math.min(p.maxHealth, p.health + HEALTH_REGEN_RATE * dt);
    }

    p.attackCooldown = Math.max(0, p.attackCooldown - dt);
    p.skillCooldown = Math.max(0, p.skillCooldown - dt);
    p.hitFlash = Math.max(0, p.hitFlash - dt);
    p.invuln = Math.max(0, p.invuln - dt);
    p.attackAnim = Math.max(0, p.attackAnim - dt);
    p.slowTimer = Math.max(0, p.slowTimer - dt);
    p.burnTimer = Math.max(0, p.burnTimer - dt);
    if (p.burnTimer > 0 && Math.random() < dt * 3) {
      this.spawnHitParticles(p.x, p.y, '#ff7a2a');
      if (Math.random() < dt * 2) { this.playerTakeDamage(1); }
    }

    for (const key in p.buffTimers) {
      p.buffTimers[key] = Math.max(0, p.buffTimers[key] - dt);
      if (p.buffTimers[key] <= 0) delete p.buffTimers[key];
    }

    const wantAttack = this.profile.platform === 'mobile'
      ? this.mobileMainAttack
      : this.mouseDown;

    // Archer charged shot: track hold time for LMB
    const isArcher = this.characterClass === 'archer';
    if (isArcher && wantAttack) {
      this.isCharging = true;
      this.chargeTime += dt;
    } else {
      // On release: if was charging, fire charged or normal shot
      if (isArcher && this.isCharging && !wantAttack) {
        if (p.attackCooldown <= 0) {
          this.doMainAttack(this.chargeTime);
        }
        this.isCharging = false;
        this.chargeTime = 0;
      } else if (!isArcher && this.isCharging && !wantAttack) {
        this.isCharging = false;
        this.chargeTime = 0;
      }
    }

    // Non-archer: attack on hold as before; archer: only attack on tap (short press)
    if (wantAttack && p.attackCooldown <= 0 && !isArcher) {
      this.doMainAttack();
    }
    // Archer tap detection: if charge time is very short and still holding, do a quick shot
    if (isArcher && wantAttack && this.chargeTime > 0 && this.chargeTime < 0.15 && p.attackCooldown <= 0) {
      // Wait a tiny bit more to determine if it's a tap or hold
    }

    const wantUnique = this.profile.platform === 'mobile'
      ? this.mobileUniqueAttack
      : this.rightMouseDown;

    if (wantUnique && p.skillCooldown <= 0 && char.hasUniqueRMB) {
      this.doUniqueAttack();
    }
  }

  doMainAttack(chargeTime: number = 0) {
    const p = this.player;
    const char = CHARACTERS.find(c => c.id === this.characterClass)!;
    const mainSkill = char.skills.find(s => s.type === 'active-main')!;
    if (p.stamina < mainSkill.staminaCost) {
      audio.playSfx('reject');
      p.attackCooldown = 0.3;
      return;
    }

    // Archer charged shot: damage scales with charge time
    const isCharged = char.id === 'archer' && chargeTime >= 0.8;
    const chargeMultiplier = isCharged ? 2.5 + Math.min(chargeTime - 0.8, 1.2) * 1.5 : 1;

    p.stamina -= mainSkill.staminaCost;
    p.attackCooldown = isCharged ? 0.6 : 0.35;
    p.attackAnim = 0.2;

    const range = char.id === 'archer' ? (this.hasSkill('a_hawk') ? 420 : 300) : (char.id === 'mage' ? 350 : 80);
    const dmg = p.damage * chargeMultiplier;

    switch (char.id) {
      case 'warrior':
        audio.playSfx('slash');
        // Semi-arc swing: damage is applied only when the blade geometry touches a hitbox
        this.startMelee(this.meleeSword, dmg);
        p.attackAnim = 0.4;
        break;
      case 'archer':
        audio.playSfx(isCharged ? 'bow-shot' : 'bow-shot');
        this.spawnProjectile(p.x, p.y, p.facing, dmg, isCharged ? '#ffcc33' : '#6fbf9f', true, true, false);
        if (isCharged) {
          this.spawnChargeEffect(p.x, p.y);
        }
        break;
      case 'mage':
        audio.playSfx('magic-bolt');
        this.spawnProjectile(p.x, p.y, p.facing, dmg, '#5fa0ff', true, false, true);
        break;
      case 'assassin':
        // Assassin LMB: chain throw
        const chainTarget = this.findNearestEnemy(p.x, p.y, 250);
        if (chainTarget) {
          const dx = chainTarget.x - p.x;
          const dy = chainTarget.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const nx = dx / dist;
          const ny = dy / dist;
          // Throw chain projectile
          const chainProj: Projectile = {
            x: p.x, y: p.y,
            vx: nx * 700, vy: ny * 700,
            damage: 0, radius: 4, life: 0.5,
            fromPlayer: true, isArrow: false, isMagic: false,
            chainTargetId: chainTarget.id,
            isChain: true,
            color: '#c0c0c0',
            kind: 'spike',
            trail: [],
            age: 0,
            spin: 6,
          };
          this.projectiles.push(chainProj);
          // Miss в†’ chain returns to player
          setTimeout(() => {
            if (!this.running) return;
            const stillThere = this.enemies.find(e => e.id === chainTarget.id && !e.isDying);
            if (!stillThere) {
              // Miss: return chain to player
              this.spawnFloatingText(p.x, p.y - 20, this.profile.language === 'ru' ? 'РњРёРјРѕ! Р¦РµРїСЊ РІРµСЂРЅСѓР»Р°СЃСЊ' : 'Miss! Chain returned', '#8888a0');
              this.spawnChainEffect(p.x, p.y, { x: 0, y: 0 });
            } else {
              // Hit: pull assassin to enemy, overshoot and crit from behind
              const overshootX = chainTarget.x + nx * 30;
              const overshootY = chainTarget.y + ny * 30;
              p.x = Math.max(20, Math.min(this.width - 20, overshootX));
              p.y = Math.max(20, Math.min(this.height - 20, overshootY));
              // Crit from behind: 2.5x damage
              const critDmg = dmg * 2.5;
              chainTarget.health -= critDmg;
              chainTarget.hitFlash = 0.3;
              this.spawnChainEffect(p.x, p.y, { x: -nx, y: -ny });
              this.spawnHitParticles(chainTarget.x, chainTarget.y, '#df3fdf');
              this.spawnFloatingText(chainTarget.x, chainTarget.y - 20, Math.floor(critDmg) + ' (РљР РРў!)', '#df3fdf');
              audio.playSfx('chain-hit');
              if (this.hasSkill('s_poison')) {
                this.applyPoisonToNearby(chainTarget.x, chainTarget.y, 90, dmg * 0.3);
              }
              if (this.hasSkill('s_lifesteal')) {
                p.health = Math.min(p.maxHealth, p.health + critDmg * 0.15);
              }
            }
          }, 250);
        } else {
          // No target in range: sickle semi-arc swing (same animation as the warrior sword)
          this.startMelee(this.meleeSickle, dmg * 0.5);
          audio.playSfx('chain-hit');
        }
        break;
    }
  }

  findNearestEnemy(x: number, y: number, maxRange: number): Enemy | null {
    let nearest: Enemy | null = null;
    let nearDist = maxRange;
    for (const e of this.enemies) {
      if (e.isDying || e.invuln > 0) continue;
      const d = this.dist(x, y, e.x, e.y);
      if (d < nearDist) {
        nearDist = d;
        nearest = e;
      }
    }
    return nearest;
  }

  doUniqueAttack() {
    const p = this.player;
    const char = CHARACTERS.find(c => c.id === this.characterClass)!;
    const uniqueSkill = char.skills.find(s => s.type === 'active-unique');
    if (!uniqueSkill) return;
    // Only allow if the unique skill has been purchased/unlocked
    if (!this.hasSkill(uniqueSkill.id)) return;
    if (p.stamina < uniqueSkill.staminaCost) {
      audio.playSfx('reject');
      p.skillCooldown = 0.3;
      return;
    }
    p.stamina -= uniqueSkill.staminaCost;
    p.skillCooldown = 1.5;
    p.attackAnim = 0.3;

    switch (char.id) {
      case 'warrior':
        audio.playSfx('charge');
        this.warriorCharge();
        break;
      case 'archer':
        audio.playSfx('arrow-rain');
        this.archerArrowRain();
        break;
      case 'mage':
        audio.playSfx('frost-nova');
        this.mageFrostNova();
        break;
      case 'assassin':
        audio.playSfx('chain-hit');
        this.assassinSickleArc();
        break;
    }
  }

  warriorCharge() {
    const p = this.player;
    const dist = 120;
    p.x += p.facing.x * dist;
    p.y += p.facing.y * dist;
    p.x = Math.max(20, Math.min(this.width - 20, p.x));
    p.y = Math.max(20, Math.min(this.height - 20, p.y));
    this.dealAoeDamage(p.x, p.y, 100, p.damage * 1.5, p.facing);
    this.spawnChargeEffect(p.x, p.y);
    for (const e of this.enemies) {
      if (this.dist(p.x, p.y, e.x, e.y) < 100) {
        e.attackCooldown = 1.0;
      }
    }
  }

  assassinSickleArc() {
    const p = this.player;
    // Same semi-arc swing as the warrior sword: the sickle travels out and returns,
    // and damage lands only where the sickle geometry actually touches a hitbox.
    this.startMelee(this.meleeSickle, p.damage * 0.6);
    for (const e of this.enemies) {
      if (this.dist(p.x, p.y, e.x, e.y) < 100) {
        e.attackCooldown = 1.0;
      }
    }
  }

  archerArrowRain() {
    const p = this.player;
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const dir = { x: Math.cos(angle), y: Math.sin(angle) };
      setTimeout(() => {
        if (!this.running) return;
        this.spawnProjectile(p.x, p.y, dir, p.damage * 0.6, '#6fbf9f', true, true, false);
      }, i * 30);
    }
  }

  mageFrostNova() {
    const p = this.player;
    this.spawnNovaEffect(p.x, p.y);
    for (const e of this.enemies) {
      const d = this.dist(p.x, p.y, e.x, e.y);
      if (d < 200) {
        e.health -= p.damage * 0.8;
        e.hitFlash = 0.2;
        e.slowTimer = 3;
        this.spawnHitParticles(e.x, e.y, '#8fc8ff');
      }
    }
  }

  dealAoeDamage(cx: number, cy: number, radius: number, damage: number, facing: Vec2) {
    for (const e of this.enemies) {
      if (e.invuln > 0) continue;
      const d = this.dist(cx, cy, e.x, e.y);
      // РџРѕРїР°РґР°РЅРёРµ Р·Р°СЃС‡РёС‚С‹РІР°РµС‚СЃСЏ, РµСЃР»Рё Р·РѕРЅР° РЅР°РєСЂС‹Р»Р° Р›Р®Р‘РЈР® С‡Р°СЃС‚СЊ С‚РµР»Р° (СЃРј. hitRadius).
      if (d < radius + this.hitRadius(e) * 0.6) {
        const dot = ((e.x - cx) * facing.x + (e.y - cy) * facing.y) / (d || 1);
        if (dot > -0.3 || d < radius * 0.4) {
          e.health -= damage;
          e.hitFlash = 0.2;
          this.spawnHitParticles(e.x, e.y, '#ff4444');
          this.spawnFloatingText(e.x, e.y, Math.floor(damage).toString(), '#ff6666');
          audio.playSfx('enemy-hit');
        }
      }
    }
  }

  // Warrior arc-swing hit detection - damage when sword arc touches enemy shape
  dealArcDamage(cx: number, cy: number, arcRadius: number, arcAngle: number, damage: number, facing: Vec2) {
    for (const e of this.enemies) {
      if (e.invuln > 0) continue;
      const d = this.dist(cx, cy, e.x, e.y);
      // Use the VISIBLE enemy size for hit detection - damage when the sword arc
      // touches any part of the body (a boss is drawn 2.5x larger than def.radius).
      const hitRadius = arcRadius + this.hitRadius(e);
      if (d > hitRadius || d < 10) continue;
      // Check if enemy is within the arc cone in front of warrior
      const angleToEnemy = Math.atan2(e.y - cy, e.x - cx);
      const facingAngle = Math.atan2(facing.y, facing.x);
      let angleDiff = angleToEnemy - facingAngle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      const halfArc = arcAngle / 2;
      if (Math.abs(angleDiff) < halfArc || d < arcRadius * 0.3) {
        e.health -= damage;
        e.hitFlash = 0.3;
        this.spawnHitParticles(e.x, e.y, '#ffd966');
        this.spawnFloatingText(e.x, e.y, Math.floor(damage).toString(), '#ffd966');
        audio.playSfx('enemy-hit');
      }
    }
  }

  applyPoisonToNearby(cx: number, cy: number, radius: number, poisonDmg: number) {
    for (const e of this.enemies) {
      if (this.dist(cx, cy, e.x, e.y) < radius) {
        e.poisonTimer = 3;
        e.poisonDamage = poisonDmg;
      }
    }
  }

  // === SIGNATURE ATTACKS: С‚РµР»РµРіСЂР°С„ в†’ РєРёРЅРµС‚РёС‡РµСЃРєРёР№ СѓРґР°СЂ в†’ РІРѕР·РІСЂР°С‚ ===
  /**
   * Р РђР”РРЈРЎ Р“Р•Р РћРЇ Р”Р›РЇ РџРћРџРђР”РђРќРР™. Р­С‚Рѕ РєРѕСЂРµРЅСЊ Р¶Р°Р»РѕР±С‹ В«РјРѕРЅСЃС‚СЂС‹ РЅРµ РјРѕРіСѓС‚
   * РЅРѕСЂРјР°Р»СЊРЅРѕ СѓРґР°СЂРёС‚СЊВ»: СѓСЂРѕРЅ Р·Р°СЃС‡РёС‚С‹РІР°Р»СЃСЏ РїРѕ СЂР°СЃСЃС‚РѕСЏРЅРёСЋ РѕС‚ С†РµРЅС‚СЂР° Р±РѕСЃСЃР°
   * Р”Рћ С†РµРЅС‚СЂР° РіРµСЂРѕСЏ, Р±РµР· СѓС‡С‘С‚Р° СЂР°Р·РјРµСЂР° С‚РѕРіРѕ, РєРѕРіРѕ Р±СЊСЋС‚. Р‘РѕСЃСЃ СЃ СЂР°РґРёСѓСЃРѕРј
   * 28 Рё reach в‰€ 50 Р±РёР» РїРѕ РЅРµРІРёРґРёРјРѕР№ С‚РѕС‡РєРµ вЂ” С‡С‚РѕР±С‹ РїРѕР»СѓС‡РёС‚СЊ СѓСЂРѕРЅ, РіРµСЂРѕР№
   * РґРѕР»Р¶РµРЅ Р±С‹Р» Р±СѓРєРІР°Р»СЊРЅРѕ СЃС‚РѕСЏС‚СЊ РІ СЌРїРёС†РµРЅС‚СЂРµ. Р’С‹РіР»СЏРґРµР»Рѕ СЌС‚Рѕ С‚Р°Рє, Р±СѓРґС‚Рѕ
   * СѓРІРѕСЂРѕС‚ В«СЂР°Р±РѕС‚Р°Р» РІСЃРµРіРґР°В», С…РѕС‚СЏ РЅР° РґРµР»Рµ Р°С‚Р°РєРё РїСЂРѕСЃС‚Рѕ РїСЂРѕРјР°С…РёРІР°Р»РёСЃСЊ.
   *
   * РўРµРїРµСЂСЊ СЂР°РґРёСѓСЃ РїРѕРїР°РґР°РЅРёСЏ = Р·РѕРЅР° Р°С‚Р°РєРё + РіР°Р±Р°СЂРёС‚ РіРµСЂРѕСЏ: Р°С‚Р°РєР° РїРѕРїР°РґР°РµС‚,
   * РµСЃР»Рё РІРёР·СѓР°Р»СЊРЅРѕ РґРѕС‚СЏРЅСѓР»Р°СЃСЊ, Рё РїСЂРѕРјР°С…РёРІР°РµС‚СЃСЏ, РµСЃР»Рё РіРµСЂРѕР№ РІС‹С€РµР» РёР· Р·РѕРЅС‹.
   * Р­С‚Рѕ СЂРѕРІРЅРѕ С‚Рѕ, С‡С‚Рѕ С‡РёС‚Р°РµС‚СЃСЏ РЅР° СЌРєСЂР°РЅРµ.
   */
  static PLAYER_HIT_R = 18;

  /** РђС‚Р°РєР°, СЃРѕРѕС‚РІРµС‚СЃС‚РІСѓСЋС‰Р°СЏ Р°РЅР°С‚РѕРјРёРё С‚РІР°СЂРё (РґР»СЏ СЃС‚Р°СЂС‹С… РІСЂР°РіРѕРІ Р±РµР· РїРѕР»СЏ вЂ” СЃС‡РёС‚Р°РµС‚СЃСЏ РЅР° РјРµСЃС‚Рµ). */
  enemySignature(e: Enemy): SignatureKind {
    // Форма последнего ПРИМЕНЁННОГО приёма приоритетнее: иначе «мечник»
    // после плевка оставался бы в дуге меча или наоборот. Значение живёт,
    // пока идёт кулдаун/анимация; когда всё откатилось — берём анатомию.
    if (e.attackAnim > 0 || e.castPhase !== 'none') {
      if (e.abilityCastShape) return e.abilityCastShape;
      if (e.sigKind) return e.sigKind;
    }
    return signatureFor(e.def.shape || 'blob', e.def.attackType);
  }
  /** РЎС‚Р°СЂС‚ Р°С‚Р°РєРё: СѓСЂРѕРЅ РќР• РЅР°РЅРѕСЃРёС‚СЃСЏ вЂ” С‚РІР°СЂСЊ С‚РѕР»СЊРєРѕ Р·Р°РјР°С…РёРІР°РµС‚СЃСЏ (С‚РµР»РµРіСЂР°С„). */
  startSignature(e: Enemy) {
    const kind = this.enemySignature(e);
    const dur = signatureDuration(kind);
    // РЈ Р‘РћРЎРЎРћР’ СЃРІРѕР№ СЂРёС‚Рј: СѓРґР°СЂ СЂР°Р· РІ ~1.6 СЃ РІРјРµСЃС‚Рѕ 1.0. РўР°Рє Сѓ РёРіСЂРѕРєР° РІСЃРµРіРґР° РµСЃС‚СЊ
    // РѕРєРЅРѕ РЅР° СѓРІРѕСЂРѕС‚ РґР°Р¶Рµ РїРѕРґ РґРІСѓРјСЏ Р±РѕСЃСЃР°РјРё СЃСЂР°Р·Сѓ, РЅРѕ РїСЂРѕРїСѓСЃРєР°С‚СЊ СѓРґР°СЂС‹ РґРѕСЂРѕРіРѕ вЂ”
    // СѓСЂРѕРЅ Р±РѕСЃСЃР° С‚РµРїРµСЂСЊ СЂРµР°Р»СЊРЅРѕ РґРѕС…РѕРґРёС‚ (СЃРј. updateSignatureImpact).
    const base = e.isBoss ? 1.55 : e.def.attackType === 'charger' ? 2.0 : e.def.attackType === 'ranged' ? 1.5 : 1.0;
    e.attackAnim = dur;
    e.sigHit = false;
    e.attackCooldown = Math.max(base, dur + 0.25);
    audio.playSfx(e.def.attackType === 'ranged' ? 'charge' : 'slash');
  }
  /** РљР°Р¶РґС‹Р№ РєР°РґСЂ РїСЂРѕРІРµСЂСЏРµРј: РЅР°СЃС‚СѓРїРёР» Р»Рё РєР°РґСЂ С„РёР·РёС‡РµСЃРєРѕРіРѕ РєРѕРЅС‚Р°РєС‚Р°. РўРѕР»СЊРєРѕ С‚Р°Рј вЂ” СѓСЂРѕРЅ. */
  updateSignatureImpact(e: Enemy) {
    if (e.sigHit || e.attackAnim <= 0 || e.attackCooldown <= 0) return;
    const kind = this.enemySignature(e);
    const dur = signatureDuration(kind);
    const t = Math.max(0, Math.min(1, 1 - e.attackAnim / dur));
    const p = signatureProfile(kind);
    // РћРљРќРћ РљРћРќРўРђРљРўРђ: Сѓ Р±РѕСЃСЃРѕРІ РѕРЅРѕ РІ 2.2 СЂР°Р·Р° С€РёСЂРµ. РџСЂРµР¶РЅРµРµ РѕРєРЅРѕ 0.05вЂ“0.07 СЃ
    // РѕР·РЅР°С‡Р°Р»Рѕ, С‡С‚Рѕ СѓРґР°СЂ 200-РїРёРєСЃРµР»СЊРЅРѕРіРѕ Р±РѕСЃСЃР° РїРѕС‡С‚Рё РЅРёРєРѕРіРґР° РЅРµ Р·Р°СЃС‡РёС‚С‹РІР°Р»СЃСЏ вЂ”
    // В«Р±СЊС‘С‚ РјРёРјРѕВ», С…РѕС‚СЏ РёРіСЂРѕРє СЃС‚РѕСЏР» РІРїР»РѕС‚РЅСѓСЋ. РўРµРїРµСЂСЊ РїРѕРїР°РґР°РЅРёРµ СЂРµРіРёСЃС‚СЂРёСЂСѓРµС‚СЃСЏ
    // РЅР°РґС‘Р¶РЅРѕ, РЅРѕ Р·Р°РјР°С… РїРѕ-РїСЂРµР¶РЅРµРјСѓ РІРёРґРµРЅ С†РµР»РёРєРѕРј: СѓРІРѕСЂРѕС‚ РѕСЃС‚Р°С‘С‚СЃСЏ С‡РµСЃС‚РЅС‹Рј.
    const w = p.window * (e.isBoss ? 2.2 : 1);
    const tc = (p.windup + p.strike * p.contact) / dur;
    if (Math.abs(t - tc) >= w) return;
    e.sigHit = true;
    this.resolveSignatureImpact(e, kind);
  }
  /** РљРѕРЅС‚Р°РєС‚: СѓСЂРѕРЅ, РІРµСЃ СѓРґР°СЂР° (С‚СЂСЏСЃРєР°/С‡Р°СЃС‚РёС†С‹/Р·РІСѓРє) Рё Р»СѓР¶Р°, РµСЃР»Рё Р°РЅР°С‚РѕРјРёСЏ РµС‘ РѕСЃС‚Р°РІР»СЏРµС‚. */
  resolveSignatureImpact(e: Enemy, kind: SignatureKind) {
    const pr = signatureProfile(kind);
    const p = this.player;
    const dir = Math.atan2(p.y - e.y, p.x - e.x);
    const reach = signatureReach(kind, e.def.radius, !!e.isBoss);
    const hitX = e.x + Math.cos(dir) * reach * 0.8;
    const hitY = e.y + Math.sin(dir) * reach * 0.8;
    const el = e.def.element;
    this.shake = Math.max(this.shake, pr.shake * (e.isBoss ? 1.5 : 1));
    if (e.def.attackType === 'ranged') {
      // РЎРЅР°СЂСЏРґ РёРґС‘С‚ СЃ РІРёРґРѕРј, РєРѕС‚РѕСЂС‹Р№ РѕРїСЂРµРґРµР»СЏРµС‚СЃСЏ С„РѕСЂРјРѕР№+РѕСЂСѓР¶РёРµРј+СЃС‚РёС…РёРµР№
      // (СЃРј. arrowKindForEnemy), Р° РЅРµ В«РїСЂРѕСЃС‚Рѕ СЃРµСЂС‹Р№ С€Р°СЂВ». РЈСЂРѕРЅ/СЃРєРѕСЂРѕСЃС‚СЊ/
      // СЂР°РґРёСѓСЃ вЂ” РёР· РїСЂРѕС„РёР»СЏ РІРёРґР°, РїРѕСЌС‚РѕРјСѓ Сѓ СЃС‚СЂРµР»РєР° Р±С‹СЃС‚СЂР°СЏ СѓР·РєР°СЏ СЃС‚СЂРµР»Р°,
      // Р° Сѓ РіРѕР»РµРјР°-В«РјР°РіР°В» вЂ” С‚СЏР¶С‘Р»С‹Р№ РєСЂРёСЃС‚Р°Р»Р», РєРѕС‚РѕСЂС‹Р№ СЂРµР°Р»СЊРЅРѕ РјРѕР¶РЅРѕ
      // РїРµСЂРµР¶РґР°С‚СЊ.
      this.fireEnemyArrow(e, dir, pr.damageMul);
      audio.playSfx(kind === 'dragonBreath' ? 'frost-nova' : 'bow-shot');
    } else if (this.dist(e.x, e.y, p.x, p.y) <= reach + CombatEngine.PLAYER_HIT_R + (e.isBoss ? 6 : 0)) {
      // Р—РѕРЅР° СѓРґР°СЂР° = reach РѕСЂСѓР¶РёСЏ + РіР°Р±Р°СЂРёС‚ РіРµСЂРѕСЏ. Р‘РµР· РїРѕСЃР»РµРґРЅРµРіРѕ СЃР»Р°РіР°РµРјРѕРіРѕ
      // Р±РѕСЃСЃ СЃ Р±РѕР»СЊС€РёРј РѕСЂСѓР¶РёРµРј В«РјР°Р·Р°Р»В» РїРѕ РєСЂР°СЋ: РІРёР·СѓР°Р»СЊРЅРѕ РѕСЂСѓР¶РёРµ РЅР°РєСЂС‹РІР°Р»Рѕ
      // РіРµСЂРѕСЏ, Р° СѓСЂРѕРЅР° РЅРµ Р±С‹Р»Рѕ вЂ” Рё СѓРєР»РѕРЅСЏС‚СЊСЃСЏ Р±С‹Р»Рѕ РЅРµРІРѕР·РјРѕР¶РЅРѕ, РїРѕС‚РѕРјСѓ С‡С‚Рѕ
      // РЅРµС‡РµРјСѓ Р±С‹Р»Рѕ СѓРєР»РѕРЅСЏС‚СЊСЃСЏ. РўРµРїРµСЂСЊ РїРѕРїР°РґР°РЅРёРµ СЃРѕРІРїР°РґР°РµС‚ СЃ РєР°СЂС‚РёРЅРєРѕР№.
      this.playerTakeDamage(e.def.damage * pr.damageMul);
    }
    this.spawnHitParticles(hitX, hitY, elementColor(el, e.def.color || '#ffffff'));
    if (pr.shake >= 4) audio.playSfx('enemy-hit');
    if (pr.puddle > 0) {
      const radius = e.def.radius * pr.puddle * (e.isBoss ? 1.25 : 1);
      this.puddles.push(makePuddle(hitX, hitY, radius, el || 'poison', Math.max(1, e.def.damage * pr.puddleMul), false, 7));
    }
  }
  /** Р›СѓР¶Рё РЅР° Р·РµРјР»Рµ: РІСЂР°Р¶РµСЃРєРёРµ Р±СЊСЋС‚ РёРіСЂРѕРєР°, В«СЃРІРѕРёВ» (РѕС‚ РёРіСЂРѕРєР°) вЂ” РјРѕРЅСЃС‚СЂРѕРІ. */
  updateHazards(dt: number) {
    const p = this.player;
    updatePuddles(this.puddles, dt, (pd) => {
      if (pd.fromPlayer) {
        for (const e of this.enemies) {
          if (e.isDying) continue;
          if (insidePuddle(pd, e.x, e.y, e.def.radius * 0.4)) {
            e.health -= pd.damage;
            e.hitFlash = 0.12;
            this.spawnHitParticles(e.x, e.y, puddleColor(pd.element));
          }
        }
        return;
      }
      if (insidePuddle(pd, p.x, p.y, 12)) {
        this.playerTakeDamage(pd.damage);
        this.spawnHitParticles(p.x, p.y, puddleColor(pd.element));
      }
    });
    this.updateBeams(dt);
  }

  /**
   * ЛУЧИ ВЗГЛЯДА: тик жизни + урон по коридору. Урон идёт каждый кадр (dps),
   * поэтому войти в луч — значит мгновенно терять здоровье и сразу выходить.
   * Попадание считается, если проекция игрока на ось лежит в [0, len], а
   * расстояние до оси меньше полуширины коридора.
   */
  updateBeams(dt: number) {
    const p = this.player;
    for (let i = this.beams.length - 1; i >= 0; i--) {
      const b = this.beams[i];
      b.life -= dt;
      if (b.life <= 0) { this.beams.splice(i, 1); continue; }
      const dx = p.x - b.x, dy = p.y - b.y;
      const along = dx * Math.cos(b.ang) + dy * Math.sin(b.ang);
      if (along < 0 || along > b.len) continue;
      const perp = Math.abs(-dx * Math.sin(b.ang) + dy * Math.cos(b.ang));
      if (perp > b.width) continue;
      this.playerTakeDamage(b.dps * dt);
      this.spawnHitParticles(p.x, p.y, b.color);
    }
  }

  /** Луч на поле: горячее ядро + мягкий ореол. Только базовые вызовы канвы. */
  drawBeams(ctx: CanvasRenderingContext2D, now: number) {
    for (const b of this.beams) {
      const fade = Math.max(0, Math.min(1, b.life));
      const flicker = 0.85 + 0.15 * Math.sin(now * 26 + b.ang * 7);
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.ang);
      ctx.globalAlpha = 0.20 * fade;
      ctx.fillStyle = b.color;
      ctx.fillRect(0, -b.width * 1.6, b.len, b.width * 3.2);
      ctx.globalAlpha = 0.55 * fade * flicker;
      ctx.fillRect(0, -b.width * 0.6, b.len, b.width * 1.2);
      ctx.globalAlpha = 0.9 * fade;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, -b.width * 0.18, b.len, b.width * 0.36);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  /**
   * ПОДПИСИ МОНСТРОВ БОЛЬШЕ НЕ РИСУЮТСЯ.
   *
   * Раньше над каждым врагом висела строка с его названием («Зелёный слизень»,
   * «Плюющийся слизень»…), да ещё и с проверкой на наложение соседних подписей.
   * На арене это читалось как непонятные слова поверх боя. Теперь имя врага
   * видно только в бестиарии, а на поле силуэт и анимация говорят сами за себя.
   * Флаг оставлен, чтобы внешний код мог явно спросить «нужна ли подпись» —
   * ответ всегда нет для обычной твари. Босс подписывается отдельным золотым
   * блоком в renderEnemy (крупно + имя оружия).
   */
  shouldDrawNameLabel(e: Enemy): boolean {
    return false;
  }

  /**
   * РЎРќРђР РЇР”. РЎС‚Р°СЂР°СЏ СЃРёРіРЅР°С‚СѓСЂР° СЃРѕС…СЂР°РЅРµРЅР° (РІСЃРµ 40 РІС‹Р·РѕРІРѕРІ РІ РґРІРёР¶РєРµ СЂР°Р±РѕС‚Р°СЋС‚
   * РєР°Рє СЂР°РЅСЊС€Рµ), РЅРѕ РґРѕР±Р°РІР»РµРЅ `kind` вЂ” РІРёРґ. Р•СЃР»Рё РѕРЅ РЅРµ РїРµСЂРµРґР°РЅ, РІРёРґ
   * Р’Р«Р’РћР”РРўРЎРЇ РёР· СЃС‚РёС…РёРё/РѕСЂСѓР¶РёСЏ СЃС‚СЂРµР»РєР°, РїРѕСЌС‚РѕРјСѓ СЃРєРµР»РµС‚-Р»СѓС‡РЅРёРє РІ Р»РµРґСЏРЅРѕРј
   * РїРѕРґР·РµРјРµР»СЊРµ Р°РІС‚РѕРјР°С‚РёС‡РµСЃРєРё РїРѕР»СѓС‡Р°РµС‚ Р»РµРґСЏРЅС‹Рµ СЃС‚СЂРµР»С‹, Р° РѕРіРЅРµРЅРЅС‹Р№ РёРјРї вЂ”
   * СѓРіР»Рё, Р±РµР· РїСЂР°РІРѕРє РІ 40 РјРµСЃС‚Р°С… РІС‹Р·РѕРІР°.
   *
   * РЎРєРѕСЂРѕСЃС‚СЊ Рё Р РђР”РРЈРЎ РџРћРџРђР”РђРќРРЇ Р±РµСЂСѓС‚СЃСЏ РёР· РїСЂРѕС„РёР»СЏ РІРёРґР°, Р° РЅРµ РёР· С„Р»Р°РіРѕРІ
   * `isArrow`/`isMagic`: СЂР°РЅСЊС€Рµ Сѓ В«РјР°РіРёС‡РµСЃРєРѕРіРѕВ» СЃРЅР°СЂСЏРґР° СЂР°РґРёСѓСЃ Р±С‹Р» 8 px
   * РЅРµР·Р°РІРёСЃРёРјРѕ РѕС‚ СЂР°Р·РјРµСЂР° РєР°СЂС‚РёРЅРєРё, Рё Р±РѕСЃСЃРѕРІСЃРєРёР№ meteor-С€Р°СЂ 380 px/СЃ
   * РІС‹РіР»СЏРґРµР» С‚Р°Рє Р¶Рµ, РєР°Рє Р±С‹СЃС‚СЂС‹Р№ РєР»РёРЅРѕРє. РўРµРїРµСЂСЊ РєР°Р¶РґС‹Р№ РІРёРґ С‡РµСЃС‚РЅС‹Р№:
   * Р±С‹СЃС‚СЂС‹Р№ вЂ” СѓР·РєРёР№, РјРµРґР»РµРЅРЅС‹Р№ вЂ” С€РёСЂРѕРєРёР№.
   */
  spawnProjectile(
    x: number, y: number, dir: Vec2, damage: number, color: string,
    fromPlayer: boolean, isArrow: boolean, isMagic: boolean,
    isChain: boolean = false, element?: Element, kind?: ArrowKind,
  ) {
    // Р’РёРґ: СЏРІРЅС‹Р№ в†’ РёР· СЃС‚РёС…РёРё/РѕСЂСѓР¶РёСЏ СЃС‚СЂРµР»РєР° в†’ РїРѕ СЃС‚Р°СЂС‹Рј С„Р»Р°РіР°Рј.
    const k: ArrowKind = kind
      ?? (fromPlayer
        ? (isArrow ? 'plain' : isMagic ? 'sigil' : 'jag')
        : arrowKindFor(element, undefined, undefined));
    const prof = arrowProfile(k);
    // РЎРєРѕСЂРѕСЃС‚СЊ Рё СЂР°РґРёСѓСЃ РїРѕРїР°РґР°РЅРёСЏ вЂ” РёР· РїСЂРѕС„РёР»СЏ РІРёРґР°, Р° РЅРµ РёР· С„Р»Р°РіРѕРІ
    // `isArrow`/`isMagic`: СЂР°РЅСЊС€Рµ Сѓ В«РјР°РіРёС‡РµСЃРєРѕРіРѕВ» СЃРЅР°СЂСЏРґР° СЂР°РґРёСѓСЃ Р±С‹Р» 8 px
    // РЅРµР·Р°РІРёСЃРёРјРѕ РѕС‚ СЂР°Р·РјРµСЂР° РєР°СЂС‚РёРЅРєРё, Рё Р±РѕСЃСЃРѕРІСЃРєРёР№ meteor-С€Р°СЂ 380 px/СЃ
    // РІС‹РіР»СЏРґРµР» С‚Р°Рє Р¶Рµ, РєР°Рє Р±С‹СЃС‚СЂС‹Р№ РєР»РёРЅРѕРє. РўРµРїРµСЂСЊ РєР°Р¶РґС‹Р№ РІРёРґ С‡РµСЃС‚РЅС‹Р№:
    // Р±С‹СЃС‚СЂС‹Р№ вЂ” СѓР·РєРёР№, РјРµРґР»РµРЅРЅС‹Р№ вЂ” С€РёСЂРѕРєРёР№.
    const speed = prof.speed;
    this.projectiles.push({
      x, y,
      vx: dir.x * speed,
      vy: dir.y * speed,
      damage,
      radius: prof.radius,
      life: prof.speed < 450 ? 2.6 : 2.0,
      fromPlayer,
      color,
      isArrow: prof.head > 0,          // В«СЃС‚СЂРµР»Р°В» = РµСЃС‚СЊ РЅР°РєРѕРЅРµС‡РЅРёРє
      isMagic: k === 'orb' || k === 'sigil' || k === 'void',
      isChain,
      element: element ?? arrowElement(k),
      kind: k,
      trail: [],
      age: 0,
      spin: prof.spin,
    });
  }

  /**
   * РљСЌС€ РЅР°Р±РѕСЂРѕРІ Р°С‚Р°Рє Р±РѕСЃСЃР°. РљР»СЋС‡ вЂ” id Р±РѕСЃСЃР°; РЅР°Р±РѕСЂ СЃРѕР±РёСЂР°РµС‚СЃСЏ РѕРґРёРЅ СЂР°Р·
   * Рё РїРµСЂРµРёСЃРїРѕР»СЊР·СѓРµС‚СЃСЏ РІСЃРµРјРё РІС‹Р·РѕРІР°РјРё (РІ Р±РѕСЋ РёС… РґРµСЃСЏС‚РєРё Р·Р° СЃРµРєСѓРЅРґСѓ).
   */
  bossKitCache = new Map<string, BossKit>();

  bossKit(e: Enemy): BossKit {
    const id = e.def.id;
    let kit = this.bossKitCache.get(id);
    if (!kit) {
      kit = kitForBoss(id, e.def.shape, e.def.element, e.def.weapon, e.def.attackType);
      this.bossKitCache.set(id, kit);
    }
    return kit;
  }

  /**
   * Р’РР” РЎРќРђР РЇР”Рђ РўР’РђР Р. РЈС‡РёС‚С‹РІР°РµС‚ Рё СЃС‚РёС…РёСЋ, Рё РѕСЂСѓР¶РёРµ, Рё С„РѕСЂРјСѓ: СЃРєРµР»РµС‚ СЃ
   * Р»СѓРєРѕРј РІ РЅРµРєСЂРѕРїРѕР»Рµ СЃС‚СЂРµР»СЏРµС‚ РљРћРЎРўРЇРќР«РњР СЃС‚СЂРµР»Р°РјРё СЃ С‚С‘РјРЅС‹Рј РЅР°РєРѕРЅРµС‡РЅРёРєРѕРј,
   * Р»РµРґСЏРЅРѕР№ РіРѕР»РµРј вЂ” Р»РµРґСЏРЅС‹РјРё РѕСЃРєРѕР»РєР°РјРё, РїР°СѓРє вЂ” СЏРґРѕРІРёС‚С‹Рј РїР»РµРІРєРѕРј. Р Р°РЅСЊС€Рµ
   * РІРёРґ РІС‹Р±РёСЂР°Р»СЃСЏ С‚РѕР»СЊРєРѕ РїРѕ СЃС‚РёС…РёРё, РїРѕСЌС‚РѕРјСѓ РїРѕР»РѕРІРёРЅР° В«СЃС‚СЂРµР»РєРѕРІВ» РІС‹РіР»СЏРґРµР»Р°
   * РѕРґРёРЅР°РєРѕРІРѕ.
   */
  arrowKindForEnemy(e: Enemy): ArrowKind {
    return arrowKindFor(
      e.def.element,
      e.def.shape,
      this.enemyWeaponKit(e),
    );
  }

  /**
   * Р’С‹СЃС‚СЂРµР» РўР’РђР Р РїРѕ РЅР°РїСЂР°РІР»РµРЅРёСЋ `angle`. РћС‚РґРµР»СЊРЅС‹Р№ РјРµС‚РѕРґ РЅСѓР¶РµРЅ, РїРѕС‚РѕРјСѓ
   * С‡С‚Рѕ Сѓ РѕР±С‹С‡РЅС‹С… РјРѕРЅСЃС‚СЂРѕРІ РІ 20+ РјРµСЃС‚Р°С… РІС‹Р·РѕРІР° СЃС‚РѕСЏР»Рё В«РІРѕР»С€РµР±РЅС‹РµВ» С„Р»Р°РіРё
   * (`isMagic: true`) Рё С†РІРµС‚ `#c0c0d0` вЂ” РёР·-Р·Р° С‡РµРіРѕ СЃРєРµР»РµС‚-Р»СѓС‡РЅРёРє Рё
   * РѕРіРЅРµРЅРЅС‹Р№ РёРјРї СЃС‚СЂРµР»СЏР»Рё РѕРґРёРЅР°РєРѕРІС‹Рј СЃРµСЂС‹Рј С€Р°СЂРёРєРѕРј. РўРµРїРµСЂСЊ РІРёРґ
   * СЃС‡РёС‚Р°РµС‚СЃСЏ РѕРґРёРЅ СЂР°Р· Р·РґРµСЃСЊ Рё РїРµСЂРµРґР°С‘С‚СЃСЏ РІ СЃРїР°РІРЅ.
   */
  fireEnemyArrow(e: Enemy, angle: number, damageMul: number, kind?: ArrowKind, fromX?: number, fromY?: number) {
    const el = e.def.element;
    const k = kind ?? this.arrowKindForEnemy(e);
    const color = elementColor(el, e.def.color || '#ffffff');
    // РўРѕС‡РєР° СЃС‚Р°СЂС‚Р°: РїРѕ СѓРјРѕР»С‡Р°РЅРёСЋ С†РµРЅС‚СЂ С‚РµР»Р° (СЃС‚Р°СЂРѕРµ РїРѕРІРµРґРµРЅРёРµ), РЅРѕ РєР°СЃС‚СѓСЋС‰РёРµ
    // РІС‹Р·РѕРІС‹ РїРµСЂРµРґР°СЋС‚ Р›РђР”РћРќР¬ (СЃРј. muzzleWorld) вЂ” С‚РѕРіРґР° СЃРЅР°СЂСЏРґ РІРёР·СѓР°Р»СЊРЅРѕ
    // РІС‹Р»РµС‚Р°РµС‚ РёР· СЃС„РµСЂС‹, Р° РЅРµ РёР· Р¶РёРІРѕС‚Р°, Рё РєР°СЂС‚РёРЅРєР° СЃРѕРІРїР°РґР°РµС‚ СЃ РїРѕР·РѕР№.
    this.spawnProjectile(
      fromX ?? e.x, fromY ?? e.y,
      { x: Math.cos(angle), y: Math.sin(angle) },
      e.def.damage * damageMul,
      color, false, false, k === 'orb' || k === 'sigil' || k === 'void',
      false, el, k,
    );
  }

  /**
   * Р’РР” РџРћР—Р« РљРђРЎРўРђ Р”Р›РЇ РўР’РђР Р. Р•РґРёРЅР°СЏ С‚РѕС‡РєР° РїСЂР°РІРґС‹: РµС‘ РёСЃРїРѕР»СЊР·СѓСЋС‚ Рё РѕС‚СЂРёСЃРѕРІРєР°
   * СЂСѓРєРё, Рё СЃС‚Р°СЂС‚ СЃРЅР°СЂСЏРґР°, РїРѕСЌС‚РѕРјСѓ РєР°СЂС‚РёРЅРєР° Рё РјРµС…Р°РЅРёРєР° РЅРµ СЂР°СЃС…РѕРґСЏС‚СЃСЏ.
   * `bob` вЂ” РІРµСЂС‚РёРєР°Р»СЊРЅРѕРµ РїРѕРєР°С‡РёРІР°РЅРёРµ СЃРїСЂР°Р№С‚Р°, С‡С‚РѕР±С‹ СЂСѓРєР° РЅРµ В«РѕС‚РєР»РµРёРІР°Р»Р°СЃСЊВ»
   * РѕС‚ С‚РµР»Р° РїСЂРё С…РѕРґСЊР±Рµ.
   */
  private castArmView(e: Enemy, now: number, forcedStyle?: CastStyle): CastArmView {
    const shape: EnemyShape = e.def.shape || 'blob';
    const r = e.def.radius * (e.isBoss ? 2.5 : 1);
    let style: CastStyle = forcedStyle || 'freeHandOrb';
    let t = 0;
    let phase: 'windup' | 'active' | 'recover' = 'windup';
    let a: MonsterAbility | null = null;
    if (!forcedStyle) {
      if (e.castPhase !== 'none') {
        a = e.abilities[e.castSlot] || null;
        style = a ? a.cast : castStyleFor('fan', { element: e.def.element, shape, weapon: this.enemyWeaponKit(e) });
        const total = a ? a.telegraph : 0.4;
        t = e.castPhase === 'windup' ? Math.max(0, Math.min(1, 1 - e.castT / Math.max(0.05, total)))
          : e.castPhase === 'active' ? 1 : 0.5;
        phase = e.castPhase;
      } else {
        // РњРёСЂРЅР°СЏ С‚РІР°СЂСЊ С‚РѕР¶Рµ В«РґС‹С€РёС‚В» РјР°РіРёРµР№: СЃС„РµСЂР° РµРґРІР° С‚Р»РµРµС‚, С‡С‚РѕР±С‹ РёРіСЂРѕРє
        // Р·Р°СЂР°РЅРµРµ РІРёРґРµР», С‡С‚Рѕ РѕРЅР° СѓРјРµРµС‚ РєРѕР»РґРѕРІР°С‚СЊ (Рё РєСѓРґР° СЃРјРѕС‚СЂРµС‚СЊ).
        style = castStyleFor('fan', { element: e.def.element, shape, weapon: this.enemyWeaponKit(e) });
        t = 0.06;
        phase = 'recover';
      }
    }
    const bob = Math.sin(e.walkAnim + e.x * 0.03) * r * 0.03;
    return {
      x: e.x,
      y: e.y + bob,
      r,
      angle: e.castPhase !== 'none' ? e.castAim : Math.atan2(this.player.y - e.y, this.player.x - e.x),
      face: e.faceDir < 0 ? -1 : 1,
      style,
      t,
      phase,
      glow: e.castPhase === 'none' ? 0.12 : handGlowLevel(t, phase),
      reach: armReach(t),
      element: e.def.element,
      color: e.def.color || '#ffffff',
      isBoss: !!e.isBoss,
      spiderLegs: shape === 'spider' ? 4 : 0,
    };
    void now;
  }

  spawnSlashEffect(x: number, y: number, dir: Vec2) {
    // Р”СѓРіР° РјРµС‡Р° РїРѕ РїРѕР»Сѓ вЂ” С‚РѕР»СЊРєРѕ СЂРѕРІРЅР°СЏ Р±РµР»Р°СЏ РїРѕР»РѕСЃР° РЅР° РІСЂРµРјСЏ СѓРґР°СЂР° (РєР°Рє СЃР»РµРґ СЃР°РјРѕР»С‘С‚Р°)
    const angle = Math.atan2(dir.y, dir.x);
    const arcRadius = 70;
    const arcSpread = Math.PI * 0.5;
    const startAngle = angle - arcSpread / 2;
    const steps = 15;
    // РўРѕР»СЊРєРѕ Р±РµР»Р°СЏ РґСѓРіР° вЂ” Р±РµР· С‡Р°СЃС‚РёС†, Р±РµР· СЃР»РµРґР°
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const a = startAngle + t * arcSpread;
      const px = x + Math.cos(a) * arcRadius;
      const py = y + Math.sin(a) * arcRadius;
      this.particles.push({
        x: px, y: py,
        vx: 0, vy: 0,
        life: 0.15, maxLife: 0.15,
        color: '#ffffff',
        size: 2,
      });
    }
  }

  spawnChainEffect(x: number, y: number, dir: Vec2) {
    for (let i = 0; i < 6; i++) {
      this.particles.push({
        x: x + dir.x * (10 + i * 12),
        y: y + dir.y * (10 + i * 12),
        vx: dir.x * 100,
        vy: dir.y * 100,
        life: 0.25,
        maxLife: 0.25,
        color: '#9b3c3c',
        size: 4,
      });
    }
  }

  spawnChargeEffect(x: number, y: number) {
    for (let i = 0; i < 15; i++) {
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 300,
        vy: (Math.random() - 0.5) * 300,
        life: 0.4,
        maxLife: 0.4,
        color: '#df8f3f',
        size: 8,
      });
    }
  }

  spawnNovaEffect(x: number, y: number) {
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * 250,
        vy: Math.sin(angle) * 250,
        life: 0.5,
        maxLife: 0.5,
        color: '#8fc8ff',
        size: 10,
      });
    }
  }

  spawnHitParticles(x: number, y: number, color: string) {
    for (let i = 0; i < 5; i++) {
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 200,
        vy: (Math.random() - 0.5) * 200,
        life: 0.3,
        maxLife: 0.3,
        color,
        size: 4,
      });
    }
  }

  spawnDeathParticles(x: number, y: number, color: string) {
    for (let i = 0; i < 12; i++) {
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 300,
        vy: (Math.random() - 0.5) * 300,
        life: 0.6,
        maxLife: 0.6,
        color,
        size: 6,
      });
    }
  }

  spawnFloatingText(x: number, y: number, text: string, color: string) {
    this.floatingTexts.push({ x, y, text, color, life: 1, vy: -60 });
  }

  updateEnemies(dt: number) {
    let totalBossHp = 0;
    let bossCount = 0;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];

      if (e.isDying) {
        e.deathAnim += dt;
        if (e.deathAnim > 0.8) {
          if (e.isBoss && !e.captured) {
            this.captureBoss(e);
          }
          this.enemies.splice(i, 1);
        }
        continue;
      }

      e.spawnAnim = Math.max(0, e.spawnAnim - dt);
      e.hitFlash = Math.max(0, e.hitFlash - dt);
      e.attackCooldown = Math.max(0, e.attackCooldown - dt);
      e.attackAnim = Math.max(0, e.attackAnim - dt);
      e.slowTimer = Math.max(0, e.slowTimer - dt);
      e.bossAbilityCooldown = Math.max(0, e.bossAbilityCooldown - dt);
      e.invuln = Math.max(0, e.invuln - dt);
      // РўРµРјРї С€Р°РіР° РїСЂРёРІСЏР·Р°РЅ Рє СЃРєРѕСЂРѕСЃС‚Рё С‚РІР°СЂРё (СЃРј. strideRate) вЂ” СЂР°РЅСЊС€Рµ Р±С‹Р» С„РёРєСЃРёСЂРѕРІР°РЅРЅС‹Р№ dt*6
      // Сѓ РІСЃРµС…, РёР·-Р·Р° С‡РµРіРѕ Р±С‹СЃС‚СЂС‹Рµ Рё РјРµРґР»РµРЅРЅС‹Рµ РґРІРёРіР°Р»РёСЃСЊ В«РІ РЅРѕРіСѓВ».

      if (e.poisonTimer > 0) {
        e.poisonTimer -= dt;
        e.health -= e.poisonDamage * dt;
        if (Math.random() < dt * 4) {
          this.spawnHitParticles(e.x, e.y, '#7abf3f');
        }
        if (e.health <= 0 && !e.isDying) {
          this.killEnemy(e);
          continue;
        }
      }

      // РџРѕРґР¶РёРіР°РЅРёРµ: СѓСЂРѕРЅ РѕРіРЅС‘Рј + СѓРіР»Рё (РѕРіРѕРЅСЊ = РЅРµР±РѕР»СЊС€РѕРµ РІСЂРµРјСЏ, С‚РёРєР°РµС‚ РєР°Рє poison)
      if (e.burnTimer > 0) {
        e.burnTimer -= dt;
        e.health -= 8 * dt;
        if (Math.random() < dt * 6) {
          this.spawnHitParticles(e.x + (Math.random() - 0.5) * e.def.radius, e.y + (Math.random() - 0.5) * e.def.radius, '#ff7b2f');
        }
        if (e.health <= 0 && !e.isDying) {
          this.killEnemy(e);
          continue;
        }
      }

      if (e.health <= 0 && !e.isDying) {
        this.killEnemy(e);
        continue;
      }

      const p = this.player;
      const dx = p.x - e.x;
      const dy = p.y - e.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const speed = e.def.speed * 60 * (e.slowTimer > 0 ? 0.4 : 1);

      // РќРђРџР РђР’Р›Р•РќРР• Р’Р—Р“Р›РЇР”Рђ (РіРёСЃС‚РµСЂРµР·РёСЃ 6 px). Р‘РµР· РЅРµРіРѕ Р·РЅР°Рє dx РјРµРЅСЏР»СЃСЏ Р±С‹
      // РєР°Р¶РґС‹Р№ РєР°РґСЂ, РєРѕРіРґР° РёРіСЂРѕРє СЃС‚РѕРёС‚ С‚РѕС‡РЅРѕ РЅР°Рґ С‚РІР°СЂСЊСЋ, Рё СЃРїСЂР°Р№С‚ РјРµСЂС†Р°Р» Р±С‹,
      // СЂР°Р·РІРѕСЂР°С‡РёРІР°СЏСЃСЊ РІР»РµРІРѕ-РІРїСЂР°РІРѕ РЅР° РјРµСЃС‚Рµ.
      if (Math.abs(dx) > 6) e.faceDir = dx < 0 ? -1 : 1;

      // РР”РЈР©РР™ Р—РђРњРђРҐ РЎРџРћРЎРћР‘РќРћРЎРўР: С‚РІР°СЂСЊ РЎРўРћРРў Рё В«РїРѕРєР°Р·С‹РІР°РµС‚В» РїСЂРёС‘Рј
      // (СЂСѓРєР° РІРІРµСЂС… СЃРѕ СЃС„РµСЂРѕР№, СЂР°СЃРєСЂС‹РІ СЂС‚Р°, РІР·РІРµРґС‘РЅРЅС‹Рµ Р»Р°РїС‹). Р‘РµР· СЌС‚РѕР№ РІРµС‚РєРё
      // РјРѕРЅСЃС‚СЂ СѓР±РµРіР°Р» Р±С‹ РІРѕ РІСЂРµРјСЏ СЃРѕР±СЃС‚РІРµРЅРЅРѕР№ Р°РЅРёРјР°С†РёРё, Рё С‚РµР»РµРіСЂР°С„ РЅРµ С‡РёС‚Р°Р»СЃСЏ.
      const casting = e.castPhase !== 'none';
      if (casting) {
        e.isMoving = false;
        this.updateMonsterCast(e, dt);
        e.x = Math.max(e.def.radius, Math.min(this.width - e.def.radius, e.x));
        e.y = Math.max(e.def.radius, Math.min(this.height - e.def.radius, e.y));
        if (e.isBoss) { totalBossHp += e.health / e.maxHealth; bossCount++; }
        continue;
      }

      // Attack type-specific behavior
      if (e.def.attackType === 'ranged') {
        // Ranged enemies maintain distance and shoot
        const idealRange = 200;
        if (d > idealRange + 30) {
          e.x += (dx / d) * speed * dt;
          e.y += (dy / d) * speed * dt;
          e.isMoving = true;
        } else if (d < idealRange - 30) {
          e.x -= (dx / d) * speed * dt;
          e.y -= (dy / d) * speed * dt;
          e.isMoving = true;
        } else {
          e.isMoving = false;
        }
        // Strafe slightly
        if (e.isMoving) e.walkAnim += dt * strideRate(e.def, !!e.isBoss);

        if (d < 350 && e.attackCooldown <= 0) {
          this.startSignature(e);
        }
      } else if (e.def.attackType === 'charger') {
        // Charger enemies lunge at player
        if (e.attackCooldown > 1.0) {
          // Wind-up: stand still
          e.isMoving = false;
        } else if (e.attackCooldown > 0.1 && e.attackCooldown <= 1.0) {
          // Lunge вЂ” 1.7x (was 3x): a well-timed dodge always escapes it
          e.x += (dx / d) * speed * 1.7 * dt;
          e.y += (dy / d) * speed * 1.7 * dt;
          e.isMoving = true;
          e.walkAnim += dt * 12;
        } else {
          // Chase normally
          e.x += (dx / d) * speed * dt;
          e.y += (dy / d) * speed * dt;
          e.isMoving = true;
          e.walkAnim += dt * strideRate(e.def, !!e.isBoss);
        }
        const attackRange = e.def.radius + 30;
        if (d < attackRange && e.attackCooldown <= 0) {
          this.startSignature(e);
        }
      } else {
        // Melee: chase and attack
        e.x += (dx / d) * speed * dt;
        e.y += (dy / d) * speed * dt;
        e.isMoving = true;
        e.walkAnim += dt * strideRate(e.def, !!e.isBoss);
        const attackRange = e.def.radius + 20;
        if (d < attackRange + e.def.radius && e.attackCooldown <= 0) {
          this.startSignature(e);
        }
      }

      // РљРѕРЅС‚Р°РєС‚ РѕСЂРіР°РЅРёС‡РµСЃРєРѕРіРѕ СѓРґР°СЂР°: СѓСЂРѕРЅ С‚РѕР»СЊРєРѕ РІ РєР°РґСЂРµ С„РёР·РёС‡РµСЃРєРѕРіРѕ РїРѕРїР°РґР°РЅРёСЏ
      this.updateSignatureImpact(e);

      // Clamp enemy to canvas bounds
      e.x = Math.max(e.def.radius, Math.min(this.width - e.def.radius, e.x));
      e.y = Math.max(e.def.radius, Math.min(this.height - e.def.radius, e.y));

      // Р‘РѕСЃСЃ РЅРµ В«РїСЂРёРјРµРЅСЏРµС‚ СЃРїРѕСЃРѕР±РЅРѕСЃС‚СЊВ», Р° РќРђР§РРќРђР•Рў РђРўРђРљРЈ СЃ С‚РµР»РµРіСЂР°С„РѕРј.
      // РЎР°Рј СѓРґР°СЂ РїСЂРёР»РµС‚Р°РµС‚ РїРѕР·Р¶Рµ, РёР· updateCasts(), вЂ” С‚Р°Рє Сѓ РёРіСЂРѕРєР° РµСЃС‚СЊ
      // РІСЂРµРјСЏ СѓР№С‚Рё, Рё РїСЂРё СЌС‚РѕРј РѕРЅ РЅРµ РјРѕР¶РµС‚ РїСЂРѕСЃС‚Рѕ СЃС‚РѕСЏС‚СЊ Рё РјРѕР»РѕС‚РёС‚СЊ.
      if (e.isBoss && e.bossAbilityCooldown <= 0 && !this.casts.some(c => c.bossId === e.id)) {
        this.startBossCast(e);
        // Р РёС‚Рј СЃРїРѕСЃРѕР±РЅРѕСЃС‚РµР№ вЂ” Р»РёС‡РЅС‹Р№ (EnemyDef.abilityRate): РѕРґРёРЅ Р±РѕСЃСЃ В«РєР°СЃС‚СѓРµС‚В»
        // С‡Р°СЃС‚Рѕ Рё РјРµР»РєРѕ, РґСЂСѓРіРѕР№ СЂРµРґРєРѕ Рё С‚СЏР¶РµР»Рѕ. РџСЂРµР¶РЅРёРµ С„РёРєСЃРёСЂРѕРІР°РЅРЅС‹Рµ 5 СЃ
        // РґРµР»Р°Р»Рё РІСЃРµС… Р±РѕСЃСЃРѕРІ РѕРґРёРЅР°РєРѕРІС‹РјРё РїРѕ С‚РµРјРїСѓ.
        e.bossAbilityCooldown = 4.5 * (e.def.abilityRate || 1);
      } else if (!e.isBoss && e.attackCooldown <= 0) {
        this.updateMonsterAbilities(e, dt);
      }

      if (e.isBoss) {
        totalBossHp += e.health / e.maxHealth;
        bossCount++;
      }
    }

    // РџРѕР»РѕСЃРєР° HP Р±РѕСЃСЃРѕРІ РІ С€Р°РїРєРµ Р±РѕСЏ. Р‘Р»РѕРє РѕСЃС‚Р°Р»СЃСЏ Р·РґРµСЃСЊ Р¶Рµ вЂ” СЂР°РЅСЊС€Рµ РѕРЅ
    // СЃС‚РѕСЏР» СЃСЂР°Р·Сѓ РїРѕСЃР»Рµ С†РёРєР»Р°, Рё РЅРѕРІР°СЏ СЃРёСЃС‚РµРјР° Р°С‚Р°Рє РµРіРѕ РІС‹С‚РµСЃРЅРёР»Р°.
    if (bossCount > 0 && this.currentWave % BOSS_WAVE_INTERVAL === 0) {
      const bossList = this.enemies.filter(e => e.isBoss && !e.isDying);
      if (bossList.length === 1) {
        this.bossName1 = this.profile.language === 'ru' ? bossList[0].def.name.ru : bossList[0].def.name.en;
        this.bossHp1 = bossList[0].health / bossList[0].maxHealth;
        this.bossName2 = null;
        this.bossHp2 = 0;
        this.callbacks.onBossHpChange(this.bossName1, this.bossHp1, null, 0);
      } else if (bossList.length >= 2) {
        this.bossName1 = this.profile.language === 'ru' ? bossList[0].def.name.ru : bossList[0].def.name.en;
        this.bossHp1 = bossList[0].health / bossList[0].maxHealth;
        this.bossName2 = this.profile.language === 'ru' ? bossList[1].def.name.ru : bossList[1].def.name.en;
        this.bossHp2 = bossList[1].health / bossList[1].maxHealth;
        this.callbacks.onBossHpChange(this.bossName1, this.bossHp1, this.bossName2, this.bossHp2);
      }
    } else if (this.bossHpBarVisible) {
      this.bossHpBarVisible = false;
      this.bossName1 = null;
      this.bossHp1 = 0;
      this.bossName2 = null;
      this.bossHp2 = 0;
      this.callbacks.onBossHpChange(null, 0, null, 0);
    }
  }

  // ============================================================
  // РќРћР’РђРЇ РЎРРЎРўР•РњРђ РђРўРђРљ Р‘РћРЎРЎРђ: С‚РµР»РµРіСЂР°С„ в†’ СѓРґР°СЂ в†’ РІРѕСЃСЃС‚Р°РЅРѕРІР»РµРЅРёРµ
  // ============================================================

  /**
   * РќРђР§РђРўР¬ РђРўРђРљРЈ. Р’С‹Р±РёСЂР°РµС‚СЃСЏ Р°С‚Р°РєР° РўР•РљРЈР©Р•Р™ Р¤РђР—Р« (РїРѕ РґРѕР»Рµ HP) РёР· Р»РёС‡РЅРѕРіРѕ
   * РЅР°Р±РѕСЂР° Р±РѕСЃСЃР°. РќР°РїСЂР°РІР»РµРЅРёРµ С„РёРєСЃРёСЂСѓРµС‚СЃСЏ Р—Р”Р•РЎР¬ Рё Р±РѕР»СЊС€Рµ РЅРµ В«РІРµРґС‘С‚СЃСЏВ»:
   * Р±РѕСЃСЃ РЅРµ СЃС‚СЂРµР»СЏРµС‚ РІСЃР»РµРґ Р·Р° РёРіСЂРѕРєРѕРј вЂ” РѕРЅ С†РµР»РёС‚СЃСЏ С‚СѓРґР°, РіРґРµ РёРіСЂРѕРє Р±С‹Р»
   * РІ РјРѕРјРµРЅС‚ Р·Р°РјР°С…Р°. РРјРµРЅРЅРѕ СЌС‚Рѕ РґРµР»Р°РµС‚ СѓРєР»РѕРЅРµРЅРёРµ РѕСЃРјС‹СЃР»РµРЅРЅС‹Рј.
   */
  startBossCast(e: Enemy) {
    const kit = this.bossKit(e);
    const hpFrac = e.maxHealth > 0 ? e.health / e.maxHealth : 1;
    const phase = bossPhaseOf(hpFrac);
    // РОТАЦИЯ АТАК: босс ПЕРЕКЛЮЧАЕТСЯ между всеми тремя приёмами своего
    // набора (idx 0→1→2→0), а не бьёт одной фазовой атакой всю битву.
    // Благодаря этому игрок реально видит «много интересных атак».
    const idx = ((this.bossAtkIdx[e.id] || 0) + 1) % kit.all.length;
    this.bossAtkIdx[e.id] = idx;
    // ФАЗА МЕНЯЕТ САМ ПРИЁМ, а не только урон (escalateForPhase): в фазах 2/3
    // босс добавляет снаряды и сокращает замах. Пресет не мутируется — берётся
    // копия, иначе поздняя фаза испортила бы раннюю для всего забега.
    const atk = escalateForPhase(kit.all[idx] || attackForPhase(kit, hpFrac), phase);
    const aim = Math.atan2(this.player.y - e.y, this.player.x - e.x);

    // РћС‡РєРё РїСЂРёС†РµР»РёРІР°РЅРёСЏ СЃС‡РёС‚Р°СЋС‚СЃСЏ Р—РђР РђРќР•Р• Рё СЂРёСЃСѓСЋС‚СЃСЏ РєР°Рє С‚РµР»РµРіСЂР°С„:
    // РёРіСЂРѕРє РІРёРґРёС‚, РєСѓРґР° РїСЂРёРґС‘С‚ СѓРґР°СЂ, Рё СѓСЃРїРµРІР°РµС‚ СѓР№С‚Рё.
    const marks: Array<{ x: number; y: number }> = [];
    if (atk.form === 'rain' || atk.form === 'mines') {
      for (const t of rainTargets(this.player.x, this.player.y, atk.count, atk.radius * 1.8, Math.random)) {
        marks.push({
          x: Math.max(0, Math.min(this.width, t.x)),
          y: Math.max(0, Math.min(this.height, t.y)),
        });
      }
    } else if (atk.form === 'groundLine') {
      for (const t of groundLinePoints(e.x, e.y, aim, atk.radius, atk.count, atk.radius * 0.55)) marks.push(t);
    }

    // АНАТОМИЯ ПРИЁМА: чем босс реально бьёт в ЭТОМ касте. Ближние формы
    // (веер/рывок/линия земли) играют удар ТЕЛА/ОРУЖИЯ (weaponSweep/quake/
    // pounce), дальние — «замах» стихии. Так каждая из трёх атак босса
    // выглядит ПО-РАЗНОМУ, а не одинаковой вспышкой.
    const kitW = this.enemyWeaponKit(e);
    const HAND_WEAPONS = ['sword', 'axe', 'halberd', 'spear', 'trident', 'scythe',
      'sickle', 'dagger', 'hammer', 'mace', 'club'];
    let sig: SignatureKind;
    if (atk.form === 'lunge') sig = kitW === 'none' ? 'pounce' : 'weaponSweep';
    else if (atk.form === 'groundLine') sig = 'quakeSlam';
    else if (atk.form === 'fan' && HAND_WEAPONS.includes(kitW)) sig = 'weaponSweep';
    else if (atk.form === 'beam') sig = 'gazeBeam';
    else if (atk.form === 'rain') sig = e.def.shape === 'dragon' ? 'dragonBreath' : 'shardBurst';
    else if (atk.form === 'ring') sig = e.def.shape === 'blob' ? 'slimeSlam' : 'shardBurst';
    else if (atk.form === 'mines') sig = 'webSpit';
    else sig = e.def.shape === 'spirit' ? 'spiritDrain' : 'shardBurst';
    // Оружие нужно только «телесным» приёмам: у каста магии рука занята сферой.
    const holdWeapon: WeaponKit | null = sig === 'weaponSweep' && kitW !== 'none' ? kitW : null;
    // Поза колдующей руки выводится из ФОРМЫ приёма + оружия (castStyleFor),
    // поэтому «дождь» всегда «от земли», а «рывок» — оружие за плечом.
    const cast = castStyleFor(atk.form, {
      element: e.def.element, shape: e.def.shape, weapon: kitW,
    });

    this.casts.push({
      bossId: e.id,
      attack: atk,
      phase: 'windup',
      t: atk.telegraph,
      aim,
      cast,
      marks,
      damage: e.def.damage * atk.damageMul * phaseDamageMul(phase),
      roll: Math.random() * Math.PI * 2,
      sig,
      weapon: holdWeapon,
    });
    // Босс «замерает» на замахе: это читается как накопление силы.
    e.sigKind = sig;
    e.abilityCastShape = sig;
    e.attackAnim = 0;
    e.sigHit = true;
    audio.playSfx('charge');
  }

  /**
   * РџРћРЁРђР“РћР’РћР• Р’Р«РџРћР›РќР•РќРР• РђРўРђРљР, РІС‹Р·С‹РІР°РµС‚СЃСЏ РєР°Р¶РґС‹Р№ РєР°РґСЂ РёР· update():
   *   windup в†’ active (СѓСЂРѕРЅ/СЃРЅР°СЂСЏРґС‹) в†’ recover (РїР°СѓР·Р°) в†’ СѓРґР°Р»РµРЅРёРµ.
   * РЈСЂРѕРЅ РЅР°РЅРѕСЃРёС‚СЃСЏ РћР”РРќ Р РђР— РІ С„Р°Р·Рµ `active`. РЎРЅР°СЂСЏРґС‹ (fan/ring) Р»РµС‚СЏС‚
   * РєР°Рє РѕР±С‹С‡РЅС‹Рµ вЂ” СЃ С…РІРѕСЃС‚РѕРј, вЂ” Рё РёС… РјРѕР¶РЅРѕ РїРµСЂРµР¶РґР°С‚СЊ; Р·РѕРЅС‹ (rain/groundLine)
   * Р±СЊСЋС‚ РїРѕ РїР»РѕС‰Р°РґРё РІ РјРѕРјРµРЅС‚ РїР°РґРµРЅРёСЏ.
   */
  updateCasts(dt: number) {
    for (let i = this.casts.length - 1; i >= 0; i--) {
      const c = this.casts[i];
      const e = this.enemies.find(x => x.id === c.bossId);
      if (!e || e.isDying) { this.casts.splice(i, 1); continue; }
      c.t -= dt;
      if (c.phase === 'windup') {
        if (c.t <= 0) {
          c.phase = 'active';
          c.t = 0.05;
          // Босс в момент удара ИГРАЕТ анатомию своего приёма: мечник рубит
          // дугой клинка, голем вбивает лапу в землю, дракон дышит пламенем.
          // Раньше здесь стоял attackAnim = 0, и все три атаки выглядели
          // одинаково — различались только снаряды (ТЗ: «много атак, разных»).
          if (e.attackAnim <= 0) {
            e.sigKind = c.sig;
            e.abilityCastShape = c.sig;
            e.attackAnim = signatureDuration(c.sig) * (e.isBoss ? 1.5 : 1);
            // Урон уже наносит resolveBossCast (снаряды/зоны/рывок), поэтому
            // авто-удар анимации не должен бить по игроку второй раз.
            e.sigHit = true;
          }
          this.resolveBossCast(e, c);
        }
        continue;
      }
      if (c.phase === 'active') {
        if (c.t <= 0) { c.phase = 'recover'; c.t = 0.28; }
        continue;
      }
      if (c.t <= 0) this.casts.splice(i, 1);
    }
  }

  /** РЎРѕР±СЃС‚РІРµРЅРЅРѕ СѓРґР°СЂ: Р»РёР±Рѕ РІС‹СЃС‚СЂРµР»С‹, Р»РёР±Рѕ СѓРґР°СЂ РїРѕ Р·РѕРЅРµ. */
  resolveBossCast(e: Enemy, c: BossCast) {
    const a = c.attack;
    const kind = a.kind;
    const el = e.def.element;
    const col = elementColor(el, e.def.color || '#ffffff');
    const isOrb = kind === 'orb' || kind === 'sigil';
    this.shake = Math.max(this.shake, a.shake);
    audio.playSfx(isOrb ? 'frost-nova' : 'bow-shot');

    if (a.form === 'fan') {
      // Р’РµРµСЂ РІРѕРєСЂСѓРі Р—РђР¤РРљРЎРР РћР’РђРќРќРћР“Рћ aim вЂ” Р±РѕСЃСЃ РЅРµ РІРµРґС‘С‚ С†РµР»СЊ.
      const spread = a.count > 1 ? Math.min(1.4, 0.32 * a.count) : 0;
      for (const ang of fanAngles(c.aim, a.count, spread)) {
        this.spawnProjectile(e.x, e.y, { x: Math.cos(ang), y: Math.sin(ang) },
          c.damage, col, false, false, isOrb, false, el, kind);
      }
    } else if (a.form === 'ring') {
      // РљРѕР»СЊС†Рѕ СЃ Р±РµР·РѕРїР°СЃРЅС‹Рј В«РєР°СЂРјР°РЅРѕРјВ» вЂ” РёРЅР°С‡Рµ Р°С‚Р°РєР° РЅРµСѓРІРµСЂРЅСѓС‚Р°.
      for (const ang of ringAngles(c.aim, a.count, Math.PI / 4.5, c.roll)) {
        this.spawnProjectile(e.x, e.y, { x: Math.cos(ang), y: Math.sin(ang) },
          c.damage, col, false, false, isOrb, false, el, kind);
      }
    } else if (a.form === 'rain' || a.form === 'mines') {
      for (const m of c.marks) {
        this.spawnProjectile(m.x, m.y - 260, { x: 0, y: 1 },
          c.damage, col, false, false, isOrb, false, el, kind);
      }
    } else if (a.form === 'groundLine') {
      for (const m of c.marks) {
        const mr = m.r || a.radius;
        if (this.dist(m.x, m.y, this.player.x, this.player.y) < mr + 14) {
          this.playerTakeDamage(c.damage);
        }
        this.spawnHitParticles(m.x, m.y, col);
        if (a.puddle) {
          this.puddles.push(makePuddle(m.x, m.y, mr * a.puddle.scale,
            a.puddle.element, Math.max(1, c.damage * a.puddle.mul), false, a.puddle.life));
        }
      }
    } else if (a.form === 'lunge') {
      const dx = this.player.x - e.x, dy = this.player.y - e.y;
      const d = Math.hypot(dx, dy) || 1;
      const step = Math.min(d, 320);
      e.x = Math.max(e.def.radius, Math.min(this.width - e.def.radius, e.x + (dx / d) * step));
      e.y = Math.max(e.def.radius, Math.min(this.height - e.def.radius, e.y + (dy / d) * step));
      this.spawnHitParticles(e.x, e.y, col);
      if (this.dist(e.x, e.y, this.player.x, this.player.y) < e.def.radius * 1.4 + 16) {
        this.playerTakeDamage(c.damage);
      }
    } else if (a.form === 'beam') {
      // ЛУЧ ВЗГЛЯДА: коридор от босса в сторону игрока. Живёт дольше обычного
      // приёма, поэтому заставляет игрока уходить из линии огня, а не просто
      // «перетерпеть замах».
      this.beams.push({
        x: e.x, y: e.y, ang: c.aim, len: a.radius, width: 26,
        dps: Math.max(1, c.damage), life: 1.6, color: col,
      });
    }

    // Р›СѓР¶Р° РїРѕРґ Р±РѕСЃСЃРѕРј РґР»СЏ В«Р·РѕРЅРѕРІС‹С…В» Р°С‚Р°Рє (Сѓ РґРѕР¶РґСЏ СЃРІРѕСЏ вЂ” С‚Р°Рј РїРѕ С‚РѕС‡РєР°Рј).
    if (a.puddle && (a.form === 'lunge' || a.form === 'ring' || a.form === 'fan')) {
      this.puddles.push(makePuddle(e.x, e.y, a.radius * a.puddle.scale * 0.5,
        a.puddle.element, Math.max(1, c.damage * a.puddle.mul), false, a.puddle.life));
    }
  }

  doBossAbility(e: Enemy) {
    const p = this.player;
    // Extract boss index from id (format: dungeonId_boss_N)
    const match = e.def.id.match(/_boss_(\d+)$/);
    const bossIndex = match ? parseInt(match[1]) - 1 : 0;
    const abilityIndex = bossIndex % 20;

    // Legacy bosses with hardcoded IDs
    switch (e.def.id) {
      case 'field_boss':
        this.summonEcho(e, 2);
        return;
      case 'forest_boss':
        e.x = Math.max(20, Math.min(this.width - 20, p.x + (Math.random() - 0.5) * 200));
        e.y = Math.max(20, Math.min(this.height - 20, p.y + (Math.random() - 0.5) * 200));
        this.spawnHitParticles(e.x, e.y, '#1f7f1f');
        this.summonEcho(e, 3);
        return;
      case 'cave_boss': {
        const dx0 = p.x - e.x, dy0 = p.y - e.y, d0 = Math.sqrt(dx0 * dx0 + dy0 * dy0) || 1;
        e.x += (dx0 / d0) * 80; e.y += (dy0 / d0) * 80;
        if (this.dist(e.x, e.y, p.x, p.y) < 40) this.playerTakeDamage(e.def.damage * 1.5);
        return;
      }
      case 'ruins_boss':
        this.spawnNovaEffect(p.x, p.y);
        if (this.dist(e.x, e.y, p.x, p.y) < 200) this.playerTakeDamage(e.def.damage);
        return;
      case 'volcano_boss':
        for (let i = 0; i < 5; i++) {
          const mx = p.x + (Math.random() - 0.5) * 200;
          const my = p.y + (Math.random() - 0.5) * 200;
          this.spawnProjectile(mx, my - 200, { x: 0, y: 1 }, e.def.damage * 0.5, '#df3f1f', false, false, false);
        }
        return;
      case 'abyss_boss':
        for (let i = 0; i < 3; i++) {
          const angle = Math.atan2(p.y - e.y, p.x - e.x) + (i - 1) * 0.3;
          this.spawnProjectile(e.x, e.y, { x: Math.cos(angle), y: Math.sin(angle) }, e.def.damage * 0.6, '#5a0a8a', false, false, true);
        }
        return;
    }

    // Procedural boss abilities based on index
    switch (abilityIndex) {
      case 0: // Split into 3 copies when HP < 50%
        if (e.health < e.maxHealth * 0.5) {
          for (let i = 0; i < 3; i++) {
            const mini: EnemyDef = { ...e.def, id: e.def.id + '_mini', health: Math.floor(e.maxHealth * 0.2), isBoss: false, radius: e.def.radius * 0.5, sellPrice: 0 };
            this.spawnEnemy(mini, 1, false);
          }
          this.spawnFloatingText(e.x, e.y - 30, this.profile.language === 'ru' ? 'Р”Р•Р›Р•РќРР•!' : 'SPLIT!', '#ffaa44');
        }
        break;
      case 1: // Immobilize roots
        p.vx = 0; p.vy = 0;
        this.spawnFloatingText(p.x, p.y - 20, this.profile.language === 'ru' ? 'РљРћР РќР!' : 'ROOTS!', '#3faf2f');
        this.spawnHitParticles(p.x, p.y, '#3faf2f');
        break;
      case 2: // 8-directional fan
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2;
          this.spawnProjectile(e.x, e.y, { x: Math.cos(angle), y: Math.sin(angle) }, e.def.damage * 0.5, e.def.color, false, false, true);
        }
        break;
      case 3: // Invisibility
        e.spawnAnim = 0.3;
        this.spawnFloatingText(e.x, e.y - 30, this.profile.language === 'ru' ? 'РќР•Р’РР”РРњРћРЎРўР¬' : 'INVISIBLE', '#6a4a8a');
        break;
      case 4: // Stunning scream with knockback
        this.spawnNovaEffect(e.x, e.y);
        for (const enemy of this.enemies) {
          if (enemy === e) continue;
          const edx = enemy.x - e.x, edy = enemy.y - e.y, ed = Math.sqrt(edx * edx + edy * edy) || 1;
          if (ed < 200) { enemy.x += (edx / ed) * 50; enemy.y += (edy / ed) * 50; }
        }
        if (this.dist(e.x, e.y, p.x, p.y) < 200) {
          const pdx = p.x - e.x, pdy = p.y - e.y, pd = Math.sqrt(pdx * pdx + pdy * pdy) || 1;
          p.x += (pdx / pd) * 60; p.y += (pdy / pd) * 60;
          this.playerTakeDamage(e.def.damage * 0.8);
        }
        break;
      case 5: // Dark meteors
        for (let i = 0; i < 5; i++) {
          const mx = p.x + (Math.random() - 0.5) * 250;
          const my = p.y + (Math.random() - 0.5) * 250;
          this.spawnProjectile(mx, my - 250, { x: 0, y: 1 }, e.def.damage * 0.7, '#3a0a3a', false, false, false);
        }
        break;
      case 6: // Р­РҐРћ РџР РћРЁР›Р«РҐ Р’РћР›Рќ: РїРѕРґРЅРёРјР°РµС‚ РјРѕРЅСЃС‚СЂРѕРІ, РєРѕС‚РѕСЂС‹С… РёРіСЂРѕРє СѓР¶Рµ РїСЂРѕС…РѕРґРёР»
        this.summonEcho(e, 3);
        break;
      case 7: // Burrow (invulnerable)
        e.invuln = 2;
        this.spawnFloatingText(e.x, e.y - 30, this.profile.language === 'ru' ? 'РџРћР” Р—Р•РњР›РЃР™' : 'BURROW', '#8a7a5a');
        break;
      case 8: // Thorns (reflect damage)
        if (this.dist(e.x, e.y, p.x, p.y) < 150) {
          this.playerTakeDamage(e.def.damage * 0.5);
          this.spawnFloatingText(p.x, p.y - 20, this.profile.language === 'ru' ? 'РЁРРџР«' : 'THORNS', '#df5f3f');
        }
        break;
      case 9: // Stone form (invuln + regen)
        e.health = Math.min(e.maxHealth, e.health + e.maxHealth * 0.1);
        this.spawnFloatingText(e.x, e.y - 30, this.profile.language === 'ru' ? 'РљРђРњР•РќРќРђРЇ Р¤РћР РњРђ' : 'STONE FORM', '#8a8a8a');
        break;
      case 10: // Blade vortex
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2 + e.walkAnim;
          this.spawnProjectile(e.x, e.y, { x: Math.cos(angle), y: Math.sin(angle) }, e.def.damage * 0.4, '#c0c0d0', false, false, true);
        }
        break;
      case 11: // Quicksand
        p.vx *= 0.2; p.vy *= 0.2;
        this.spawnFloatingText(p.x, p.y - 20, this.profile.language === 'ru' ? 'Р—Р«Р‘РЈР§РР™ РџР•РЎРћРљ' : 'QUICKSAND', '#c8a050');
        break;
      case 12: // Fiery charge with burning
        { const dxc = p.x - e.x, dyc = p.y - e.y, dc = Math.sqrt(dxc * dxc + dyc * dyc) || 1;
        e.x += (dxc / dc) * 120; e.y += (dyc / dc) * 120;
        for (let i = 0; i < 8; i++) this.spawnHitParticles(e.x + (Math.random() - 0.5) * 60, e.y + (Math.random() - 0.5) * 60, '#df3f1f');
        if (this.dist(e.x, e.y, p.x, p.y) < 50) this.playerTakeDamage(e.def.damage * 1.5); }
        break;
      case 13: // Target markers + meteors
        for (let i = 0; i < 4; i++) {
          const mx = p.x + (Math.random() - 0.5) * 200;
          const my = p.y + (Math.random() - 0.5) * 200;
          this.spawnProjectile(mx, my - 200, { x: 0, y: 1 }, e.def.damage * 0.8, '#df1f1f', false, false, false);
        }
        break;
      case 14: // Egg (revives if not killed in 4 sec)
        if (e.health < e.maxHealth * 0.2) {
          e.health = Math.floor(e.maxHealth * 0.5);
          this.spawnFloatingText(e.x, e.y - 30, this.profile.language === 'ru' ? 'Р’РћРЎРљР Р•РЁР•РќРР•!' : 'REVIVE!', '#df3f3f');
          this.spawnNovaEffect(e.x, e.y);
        }
        break;
      case 15: // Thick laser beam
        for (let i = 0; i < 10; i++) {
          const dx = p.x - e.x, dy = p.y - e.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
          this.spawnProjectile(e.x + (dx / d) * i * 30, e.y + (dy / d) * i * 30, { x: dx / d, y: dy / d }, e.def.damage * 0.3, '#5a0a8a', false, false, true);
        }
        break;
      case 16: // Key inversion
        this.spawnFloatingText(p.x, p.y - 20, this.profile.language === 'ru' ? 'РРќР’Р•Р РЎРРЇ!' : 'INVERTED!', '#df3fdf');
        break;
      case 17: // Tentacle pull
        { const dxp = e.x - p.x, dyp = e.y - p.y, dp = Math.sqrt(dxp * dxp + dyp * dyp) || 1;
        p.x += (dxp / dp) * 80; p.y += (dyp / dp) * 80;
        this.spawnFloatingText(p.x, p.y - 20, this.profile.language === 'ru' ? 'РџР РРўРЇР–Р•РќРР•' : 'PULLED', '#5a0a5a'); }
        break;
      case 18: // Ring projectiles
        for (let i = 0; i < 12; i++) {
          const angle = (i / 12) * Math.PI * 2;
          this.spawnProjectile(e.x, e.y, { x: Math.cos(angle), y: Math.sin(angle) }, e.def.damage * 0.4, e.def.color, false, false, true);
        }
        break;
      case 19: { // Final boss: echo of the last waves + random ability from any previous
        this.summonEcho(e, 4);
        const randomIdx = Math.floor(Math.random() * 19);
                const fakeId = `${e.def.dungeonId || 'whispering_grove'}_boss_${randomIdx + 1}`;
        this.doBossAbility({ ...e, def: { ...e.def, id: fakeId } });
        break; }
    }
  }

  // === РЎРџРћРЎРћР‘РќРћРЎРўР РўР’РђР Р: Р’РР”РРњР«Р•, РЎ РџРћР—РћР™ Р РЈРљР Р РЎРќРђР РЇР”РћРњ ===
  // Р РђРќР¬РЁР• Р·РґРµСЃСЊ СЃС‚РѕСЏР» doMonsterAbility(): switch РїРѕ С„РѕСЂРјРµ, РіРґРµ РєР°Р¶РґР°СЏ РІРµС‚РєР°
  // СЃСЂР°Р±Р°С‚С‹РІР°Р»Р° РїРѕ Math.random() < 0.02 Р’РњР•РЎРўРћ Р»СЋР±РѕР№ Р°РЅРёРјР°С†РёРё вЂ” С‚Рѕ РµСЃС‚СЊ
  // В«РїСЂРёРјРµРЅРµРЅРёРµ СЃРїРѕСЃРѕР±РЅРѕСЃС‚РёВ» Р±С‹Р»Рѕ РЅРµРІРёРґРёРјС‹Рј. РЎР»РёР·РµРЅСЊ В«РґРµР»РёР»СЃСЏВ», РїР°СѓРє
  // В«РїР»РµРІР°Р» РїР°СѓС‚РёРЅРѕР№В», РіР»Р°Р· В«Р±РёР» Р»Р°Р·РµСЂРѕРјВ» вЂ” РЅРѕ РЅР° СЌРєСЂР°РЅРµ РЅРµ РјРµРЅСЏР»РѕСЃСЊ РќРР§Р•Р“Рћ,
  // РєСЂРѕРјРµ РјРіРЅРѕРІРµРЅРЅРѕ РїРѕСЏРІРёРІС€РµРіРѕСЃСЏ СЃРЅР°СЂСЏРґР°. РџР»СЋСЃ РЅР°Р±РѕСЂ Р±С‹Р» СЂРѕРІРЅРѕ РѕРґРёРЅ РЅР°
  // С„РѕСЂРјСѓ: РїР°СѓРє РІСЃСЋ РёРіСЂСѓ СЃС‚СЂРµР»СЏР» С‚РѕР»СЊРєРѕ СЃРµС‚СЊСЋ.
  //
  // РўРµРїРµСЂСЊ СЃРїРѕСЃРѕР±РЅРѕСЃС‚Рё Р±РµСЂСѓС‚СЃСЏ РёР· РЅР°Р±РѕСЂР° С‚РІР°СЂРё (monsterAbilities.ts):
  //   1) РІС‹Р±РѕСЂ СЃРїРѕСЃРѕР±РЅРѕСЃС‚Рё РїРѕ РґРёСЃС‚Р°РЅС†РёРё Рё РІРµСЃСѓ;
  //   2) Р—РђРњРђРҐ СЃ РІРёРґРёРјРѕР№ РїРѕР·РѕР№ (СЂСѓРєР° РІРІРµСЂС…, СЃС„РµСЂР°, Р»Р°РїС‹, СЂРѕС‚);
  //   3) СѓРґР°СЂ РІ РєРѕРЅС†Рµ Р·Р°РјР°С…Р° вЂ” СЃРЅР°СЂСЏРґ РёР· Р›РђР”РћРќР РёР»Рё Р±СЂРѕСЃРѕРє С‚РµР»Р°;
  //   4) Р»РёС‡РЅС‹Р№ РѕС‚РєР°С‚ Сѓ РєР°Р¶РґРѕР№ СЃРїРѕСЃРѕР±РЅРѕСЃС‚Рё, РїРѕСЌС‚РѕРјСѓ РѕРЅРё С‡РµСЂРµРґСѓСЋС‚СЃСЏ.
  /**
   * Р’С‹Р±РѕСЂ СЃРїРѕСЃРѕР±РЅРѕСЃС‚Рё РїРѕРґ С‚РµРєСѓС‰СѓСЋ РґРёСЃС‚Р°РЅС†РёСЋ. РЈРєСѓСЃ вЂ” РІ СѓРїРѕСЂ, РїР»РµРІРѕРє/РјР°РіРёСЏ вЂ”
   * СЃ 240вЂ“340 px. Р•СЃР»Рё РЅРёС‡РµРіРѕ РЅРµ РїРѕРґС…РѕРґРёС‚, РІРѕР·РІСЂР°С‰Р°РµС‚ -1: С‚РІР°СЂСЊ РёРґС‘С‚
   * СЃР±Р»РёР¶Р°С‚СЊСЃСЏ, Р° РЅРµ В«СЃС‚СЂРµР»СЏРµС‚ РІ СѓРїРѕСЂ СѓРєСѓСЃРѕРјВ».
   */
  chooseAbility(e: Enemy, dist: number): number {
    const list = e.abilities;
    if (!list || list.length === 0) return -1;
    let best = -1, bestScore = 0;
    const kit = this.enemyWeaponKit(e);
    // Дальние «плевки» не должны вытеснять ближние приёмы: у мечника меч
    // важнее магии, у волка — укус, у паука — хелицеры (ТЗ).
    const pureBody = ['wolf', 'spider', 'beetle', 'blob', 'golem', 'dragon'].includes(e.def.shape || '');
    const heldRanged = kit === 'bow' || kit === 'crossbow' || kit === 'staff' || kit === 'orb' || kit === 'book' || kit === 'torch';
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      if (e.abilityCooldowns[i] > 0) continue;
      // Телесные удары — только вблизи, дальние — на своей дистанции.
      if (a.range <= 0 && dist > e.def.radius + signatureReach(a.body, e.def.radius, false) + 6) continue;
      if (a.range > 0 && dist > a.range) continue;
      // Ближе 40 px дальняя способность бесполезна — тварь бьёт телом.
      if (a.range > 0 && dist < 40 && list.some(x => x.range <= 0)) continue;
      // Приоритет: чем уместнее дистанция, тем выше счёт; вес — «характер».
      const fit = a.range > 0 ? 1 - Math.abs(dist - a.range * 0.7) / Math.max(1, a.range) : 1 - dist / Math.max(1, e.def.radius * 3);
      let score = a.weight * (0.4 + Math.max(0, fit));
      if (a.range > 0 && pureBody && !heldRanged) score *= 0.30;   // звери/пауки почти не плевкают
      if (a.range > 0 && !pureBody && !heldRanged) score *= 0.72;  // прочие — редкая магия
      if (a.range > 0 && heldRanged) score *= 1.1;                 // стрелок с луком/посохом стреляет часто
      if (score > bestScore) { bestScore = score; best = i; }
    }
    // ТЕЛЕСНЫЙ УДАР через автономный калькулятор meleeCombat.ts: если обычный
    // scoring не выбрал приём (все дальнние на кулде, ближние «за границей»),
    // спрашиваем класс — в его зоне досягаемости (оружие + габарит) удар ещё
    // доступен. Если класс говорит «нет» — тварь просто сближается без приёма.
    if (best < 0) {
      const near = this.meleeCalc.bestAbility(
        { id: e.id, shape: e.def.shape || 'blob', gait: e.def.gait || 'walk', radius: e.def.radius, isBoss: !!e.isBoss, weaponReach: 0.5, x: e.x, y: e.y, vx: 0, vy: 0, alive: !e.isDying },
        dist,
        () => 0,
      );
      if (near) {
        // Класс подтвердил удар в зоне — берём первый доступный телесный приём.
        const meleeSlot = list.findIndex((a, i) => a.range <= 0 && e.abilityCooldowns[i] <= 0);
        if (meleeSlot >= 0) best = meleeSlot;
      }
    }
    return best;
  }

  /**
   * РќР°С‡Р°С‚СЊ РІРёРґРёРјС‹Р№ Р·Р°РјР°С…. РЈСЂРѕРЅ РќР• РЅР°РЅРѕСЃРёС‚СЃСЏ вЂ” С‚РІР°СЂСЊ В«РїРѕРєР°Р·С‹РІР°РµС‚В» РїСЂРёС‘Рј:
   * РїРѕРґРЅРёРјР°РµС‚ СЂСѓРєСѓ СЃРѕ СЃС„РµСЂРѕР№, СЂР°СЃРєСЂС‹РІР°РµС‚ СЂРѕС‚, РІР·РІРѕРґРёС‚ Р»Р°РїС‹. РРіСЂРѕРє СѓСЃРїРµРІР°РµС‚
   * СѓР№С‚Рё РР›Р РїРѕРґРѕР№С‚Рё (РµСЃР»Рё СЌС‚Рѕ РґР°Р»СЊРЅСЏСЏ СЃРїРѕСЃРѕР±РЅРѕСЃС‚СЊ).
   */
  startMonsterCast(e: Enemy, slot: number) {
    const a = e.abilities[slot];
    if (!a) return;
    e.castPhase = 'windup';
    e.castT = a.telegraph;
    e.castSlot = slot;
    e.castAim = Math.atan2(this.player.y - e.y, this.player.x - e.x);
    e.isMoving = false;
    // РўРµР»Рѕ РїСЂРѕРёРіСЂС‹РІР°РµС‚ СЃРІРѕСЋ Р°РЅР°С‚РѕРјРёС‡РµСЃРєСѓСЋ РїРѕР·Сѓ вЂ” СЂСѓРєР° Рё СЃС„РµСЂР° СЂРёСЃСѓСЋС‚СЃСЏ РїРѕРІРµСЂС….
    e.sigKind = a.body;
    e.abilityCastShape = a.body;
    e.attackAnim = 0;
    e.sigHit = true;
    audio.playSfx(a.kind === 'bite' || a.kind === 'thrust' ? 'slash' : 'charge');
    void this.profile;
  }

  /** РњРѕРјРµРЅС‚ СѓРґР°СЂР°: СЃРЅР°СЂСЏРґ РёР· Р»Р°РґРѕРЅРё РёР»Рё С‚РµР»РµСЃРЅС‹Р№ Р±СЂРѕСЃРѕРє РІ Р·Р°С„РёРєСЃРёСЂРѕРІР°РЅРЅРѕРј РЅР°РїСЂР°РІР»РµРЅРёРё. */
  resolveMonsterCast(e: Enemy) {
    const a = e.abilities[e.castSlot];
    if (!a) return;
    const view = this.castArmView(e, performance.now() / 1000);
    if (a.kind === 'bite' || a.kind === 'thrust') {
      // Телесный/оружейный удар: анимация signature-модуля + урон по своему reach.
      const kind = a.body;
      e.sigKind = kind;
      e.abilityCastShape = kind;
      e.attackAnim = signatureDuration(kind);
      e.sigHit = false;
      e.attackCooldown = Math.max(0.35, a.cooldown * 0.5);
      this.updateSignatureImpact(e);
    } else if (a.kind === 'roar') {
      // Р РЃР’ вЂ” СЌС‚Рѕ РџРћР”Р”Р•Р Р–РљРђ, Р° РЅРµ СѓСЂРѕРЅ: С‚РІР°СЂСЊ РІСЃРєРёРґС‹РІР°РµС‚ РіРѕР»РѕРІСѓ Рё РЅР° РІСЂРµРјСЏ
      // РїРѕР»СѓС‡Р°РµС‚ В«РІС‚РѕСЂРѕРµ РґС‹С…Р°РЅРёРµВ» вЂ” С‰РёС‚ РёР· С€РєСѓСЂС‹/СЌРЅРµСЂРіРёРё, РєРѕС‚РѕСЂС‹Р№ РіР»РѕС‚Р°РµС‚
      // С‡Р°СЃС‚СЊ СЃР»РµРґСѓСЋС‰РµРіРѕ СѓСЂРѕРЅР°. Р Р°РЅСЊС€Рµ Р·РґРµСЃСЊ Р±С‹Р» РЅРµРІРёРґРёРјС‹Р№ СЃР±СЂРѕСЃ СЃРєРѕСЂРѕСЃС‚Рё.
      this.shielded[e.id] = (this.shielded[e.id] || 0) + Math.max(8, e.def.damage * 0.6);
      this.spawnNovaEffect(e.x, e.y);
      this.spawnFloatingText(e.x, e.y - e.def.radius - 20,
        this.profile.language === 'ru' ? 'В«Р РЃР’!В»' : '"ROAR!"', '#c9a0ff');
    } else {
      // Р”Р°Р»СЊРЅСЏСЏ: СЃРЅР°СЂСЏРґ Р РћР’РќРћ РёР· Р»Р°РґРѕРЅРё РїРѕРґРЅСЏС‚РѕР№ СЂСѓРєРё (РїРѕР·Р° РєР°СЃС‚Р°).
      const m = muzzleWorld(view);
      this.fireEnemyArrow(e, e.castAim, a.damageMul, a.arrow, m.x, m.y);
      this.spawnNovaEffect(m.x, m.y);
    }
    audio.playSfx(a.kind === 'bite' ? 'enemy-hit' : 'bow-shot');
  }

  /**
   * РўРёРє РІРёРґРёРјРѕРіРѕ РєР°СЃС‚Р°. Р”РµСЂР¶РёС‚ С‚РІР°СЂСЊ РЅР° РјРµСЃС‚Рµ РІРѕ РІСЂРµРјСЏ Р·Р°РјР°С…Р° (РёРЅР°С‡Рµ РѕРЅР°
   * В«СѓР±РµРіР°РµС‚В» РѕС‚ СЃРѕР±СЃС‚РІРµРЅРЅРѕР№ Р°РЅРёРјР°С†РёРё), РІ РєРѕРЅС†Рµ вЂ” РЅР°РЅРѕСЃРёС‚ СѓРґР°СЂ.
   */
  updateMonsterCast(e: Enemy, dt: number) {
    if (e.castPhase === 'none') return;
    e.castT -= dt;
    if (e.castPhase === 'windup') {
      if (e.castT <= 0) {
        const slot = e.castSlot;
        this.resolveMonsterCast(e);
        // Р›РёС‡РЅС‹Р№ РѕС‚РєР°С‚ РўРћР›Р¬РљРћ Сѓ СЃСЂР°Р±РѕС‚Р°РІС€РµР№ СЃРїРѕСЃРѕР±РЅРѕСЃС‚Рё: РѕСЃС‚Р°Р»СЊРЅС‹Рµ РѕСЃС‚Р°СЋС‚СЃСЏ
        // РґРѕСЃС‚СѓРїРЅС‹РјРё, РїРѕСЌС‚РѕРјСѓ СЃР»РµРґСѓСЋС‰РёР№ РїСЂРёС‘Рј Р±СѓРґРµС‚ РґСЂСѓРіРёРј.
        const a = e.abilities[slot];
        if (a) e.abilityCooldowns[slot] = a.cooldown;
        e.castPhase = 'recover';
        e.castT = 0.22;
      }
    } else if (e.castT <= 0) {
      e.castPhase = 'none';
      e.castSlot = -1;
    }
  }

  updateMonsterAbilities(e: Enemy, dt: number) {
    if (e.isBoss) return;
    // Cooldowns tick always — even while the creature is stuck against a wall.
    for (let i = 0; i < e.abilityCooldowns.length; i++) {
      if (e.abilityCooldowns[i] > 0) e.abilityCooldowns[i] -= dt;
    }
    // «Забыть» прошлый приём, когда его кулдаун откатился: дуга и поза
    // возвращаются к настоящей анатомии твари, а не к вчерашнему плевку.
    if (e.abilityCastShape && e.attackAnim <= 0 && e.castPhase === 'none'
      && e.abilityCooldowns.every(cd => cd <= 0)) {
      e.abilityCastShape = undefined;
    }
    if (e.attackCooldown > 0 || e.castPhase !== 'none') return;
    const d = this.dist(e.x, e.y, this.player.x, this.player.y);
    const slot = this.chooseAbility(e, d);
    if (slot < 0) return;
    this.startMonsterCast(e, slot);
  }

  killEnemy(e: Enemy) {
    e.isDying = true;
    e.deathAnim = 0;
    this.spawnDeathParticles(e.x, e.y, e.def.color);

    if (e.isBoss) {
      audio.playSfx('boss-death');
    } else {
      audio.playSfx('enemy-death');
    }

    // Р—РѕР»РѕС‚Рѕ СЂР°СЃС‚С‘С‚ РІРјРµСЃС‚Рµ СЃ РІРѕР»РЅРѕР№ вЂ” РёРЅР°С‡Рµ С†РµРЅР° С‚Р°Р»Р°РЅС‚Р° (+3%/РІРѕР»РЅР°) РѕР±РіРѕРЅСЏР»Р° Р±С‹
    // РґРѕС…РѕРґ, Рё С‚Р°Р»Р°РЅС‚С‹ РїРµСЂРµСЃС‚Р°Р»Рё Р±С‹ Р±С‹С‚СЊ РґРѕСЃС‚СѓРїРЅС‹ Рє СЃРµСЂРµРґРёРЅРµ РёРіСЂС‹.
    this.goldThisWave += Math.floor(e.def.goldReward * (1 + (this.currentWave - 1) * GOLD_WAVE_MULTIPLIER));
    this.expThisWave += e.def.expReward;
    this.enemiesKilledThisWave++;

    if (this.hasSkill('s_lifesteal')) {
      this.player.health = Math.min(this.player.maxHealth, this.player.health + 3);
    }
  }

  captureBoss(e: Enemy) {
    e.captured = true;
    audio.playSfx('capture');

    const boss: CapturedBoss = {
      uid: Math.random().toString(36).slice(2) + Date.now().toString(36),
      enemyId: e.def.id,
      name: e.def.name,
      ability: e.def.ability || { ru: 'РќРµС‚ СЃРїРѕСЃРѕР±РЅРѕСЃС‚Рё', en: 'No ability' },
      sellPrice: e.def.sellPrice,
      difficulty: Math.ceil(e.maxHealth / 100),
      icon: e.def.icon,
      capturedAt: Date.now(),
    };

    this.callbacks.onBossCaptured(boss);
  }

  playerTakeDamage(rawDmg: number) {
    const p = this.player;
    if (p.invuln > 0) return;

    let dmg = rawDmg;
    if (this.hasSkill('m_barrier')) {
      dmg *= 0.8;
    }

    p.health -= dmg;
    p.hitFlash = 0.3;
    p.invuln = 0.5;
    // РЎС‚РѕРї-РєР°РґСЂ РЅР° РїРѕРїР°РґР°РЅРёРё: СѓРґР°СЂ В«С‡СѓРІСЃС‚РІСѓРµС‚СЃСЏВ», Р° РЅРµ РїСЂРѕСЃС‚Рѕ РјРµРЅСЏРµС‚ С†РёС„СЂСѓ.
    this.hitstop = Math.max(this.hitstop, 0.05);
    audio.playSfx('player-hit');
    this.spawnHitParticles(p.x, p.y, '#ff4444');
    this.spawnFloatingText(p.x, p.y - 20, Math.floor(dmg).toString(), '#ff6666');

    if (p.health <= 0) {
      p.health = 0;
      this.onPlayerDeath();
    }
  }

  onPlayerDeath() {
    if (this.profile.ownedPotions.revival > 0 && !this.revivalUsed) {
      this.revivalUsed = true;
      this.profile.ownedPotions.revival--;
      this.callbacks.onPotionUsed('revival');
      this.player.health = Math.floor(this.player.maxHealth * REVIVAL_HP_PERCENT);
      this.player.invuln = 2;
      audio.playSfx('revive');
      this.spawnNovaEffect(this.player.x, this.player.y);
      return;
    }

    this.gameOver = true;
    this.waveResult = 'defeat';
    audio.stopMusic();
    audio.playSfx('enemy-death');
    this.callbacks.onWaveResult('defeat', this.currentWave, this.goldThisWave, this.expThisWave);
    this.callbacks.onPlayerDeath();
  }

  useHealthPotion(): boolean {
    // Cannot drink at full health вЂ” the potion would be wasted
    if (this.player.health >= this.player.maxHealth) {
      this.callbacks.onPotionBlocked('health', 'full-health');
      audio.playSfx('reject');
      return false;
    }
    if (this.profile.ownedPotions.health <= 0) {
      this.callbacks.onPotionBlocked('health', 'none-owned');
      audio.playSfx('reject');
      return false;
    }
    if (this.healthPotionCooldown > 0 && this.healthPotionUsedThisWave) {
      this.callbacks.onPotionBlocked('health', 'cooldown');
      return false;
    }

    this.profile.ownedPotions.health--;
    this.player.health = Math.min(this.player.maxHealth, this.player.health + POTION_HEALTH_AMOUNT);
    audio.playSfx('potion-health');
    this.spawnFloatingText(this.player.x, this.player.y - 20, '+' + POTION_HEALTH_AMOUNT + ' HP', '#3faf3f');
    this.spawnHitParticles(this.player.x, this.player.y, '#3faf3f');
    this.callbacks.onPotionUsed('health');

    if (this.healthPotionUsedThisWave) {
      this.healthPotionCooldown = POTION_COOLDOWN;
      this.callbacks.onPotionCooldownUpdate('health', POTION_COOLDOWN, POTION_COOLDOWN);
    }
    this.healthPotionUsedThisWave = true;
    return true;
  }

  useStaminaPotion(): boolean {
    // Cannot drink at full stamina вЂ” the potion would be wasted
    if (this.player.stamina >= this.player.maxStamina) {
      this.callbacks.onPotionBlocked('stamina', 'full-stamina');
      audio.playSfx('reject');
      return false;
    }
    if (this.profile.ownedPotions.stamina <= 0) {
      this.callbacks.onPotionBlocked('stamina', 'none-owned');
      audio.playSfx('reject');
      return false;
    }
    if (this.staminaPotionCooldown > 0 && this.staminaPotionUsedThisWave) {
      this.callbacks.onPotionBlocked('stamina', 'cooldown');
      return false;
    }

    this.profile.ownedPotions.stamina--;
    this.player.stamina = Math.min(this.player.maxStamina, this.player.stamina + POTION_STAMINA_AMOUNT);
    audio.playSfx('potion-stamina');
    this.spawnFloatingText(this.player.x, this.player.y - 20, '+' + POTION_STAMINA_AMOUNT + ' STA', '#3faf3f');
    this.spawnHitParticles(this.player.x, this.player.y, '#3fa0ff');
    this.callbacks.onPotionUsed('stamina');

    if (this.staminaPotionUsedThisWave) {
      this.staminaPotionCooldown = POTION_COOLDOWN;
      this.callbacks.onPotionCooldownUpdate('stamina', POTION_COOLDOWN, POTION_COOLDOWN);
    }
    this.staminaPotionUsedThisWave = true;
    return true;
  }

  useRevivalPotion(): boolean {
    if (this.profile.ownedPotions.revival <= 0) {
      this.callbacks.onPotionBlocked('revival', 'none-owned');
      return false;
    }
    if (!this.gameOver || this.waveResult !== 'defeat') return false;

    this.profile.ownedPotions.revival--;
    this.callbacks.onPotionUsed('revival');
    this.gameOver = false;
    this.waveResult = null;
    this.player.health = Math.floor(this.player.maxHealth * REVIVAL_HP_PERCENT);
    this.player.invuln = 3;
    audio.playSfx('revive');
    this.spawnNovaEffect(this.player.x, this.player.y);
    audio.startMusic();
    return true;
  }

  completeWave() {
    this.waveActive = false;
    audio.playSfx('wave-clear');

    const goldEarned = this.goldThisWave;
    const expEarned = this.expThisWave;

    this.callbacks.onWaveCleared(this.currentWave, goldEarned, expEarned);

    // In easy mode, save progress per dungeon so player can resume from last cleared wave
    if (this.profile.gameMode === 'easy') {
      for (const dgId of this.profile.equippedDungeons) {
        const current = this.profile.dungeonProgress[dgId] || 0;
        if (this.currentWave > current) {
          this.callbacks.onProfileUpdate({
            dungeonProgress: { ...this.profile.dungeonProgress, [dgId]: this.currentWave },
          });
        }
      }
    }

    this.revivalUsed = false;

    if (this.currentWave >= MAX_WAVES) {
      this.gameOver = true;
      this.waveResult = 'victory';
      this.callbacks.onWaveResult('victory', this.currentWave, goldEarned, expEarned);
      audio.stopMusic();
      return;
    }

    this.waveResult = 'victory';
    this.callbacks.onWaveResult('victory', this.currentWave, goldEarned, expEarned);
  }

  continueToNextWave() {
    this.waveResult = null;
    this.startNextWave();
  }

  retryWave() {
    this.waveResult = null;
    this.gameOver = false;
    this.enemies = [];
    this.projectiles = [];
    this.particles = [];
    this.floatingTexts = [];
    this.currentWave--;
    this.applyWaveSpeed();
    this.player.health = Math.floor(this.player.maxHealth * 0.5);
    this.player.invuln = 2;
    audio.startMusic();
    this.startNextWave();
  }

  exitToGuild() {
    // In easy mode, dungeon progress is already saved during completeWave.
    // This is called when player chooses to exit after defeat.
    this.stop();
  }

  updateProjectiles(dt: number) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const pr = this.projectiles[i];
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      pr.life -= dt;
      pr.age += dt;
      // РЎР»РµРґ: РїРёС€РµРј РїРѕР·РёС†РёСЋ Р”Рћ РїСЂРѕРІРµСЂРѕРє РїРѕРїР°РґР°РЅРёСЏ, С‡С‚РѕР±С‹ Сѓ РїРѕСЃР»РµРґРЅРµРіРѕ
      // РєР°РґСЂР° РїРµСЂРµРґ СѓРґР°СЂРѕРј РѕСЃС‚Р°Р»СЃСЏ РІРёРґРёРјС‹Р№ В«С…РІРѕСЃС‚В» вЂ” РїРѕ РЅРµРјСѓ РёРіСЂРѕРє С‡РёС‚Р°РµС‚
      // РЅР°РїСЂР°РІР»РµРЅРёРµ СѓРґР°СЂР° Рё СѓСЃРїРµРІР°РµС‚ СѓР№С‚Рё (СЌС‚Рѕ Рё РµСЃС‚СЊ В«С‡РµСЃС‚РЅС‹Р№В» РІС‹СЃС‚СЂРµР»).
      if (pr.trail) pushTrail(pr.trail, pr.x, pr.y);

      if (pr.life <= 0 || pr.x < -50 || pr.x > this.width + 50 || pr.y < -50 || pr.y > this.height + 50) {
        this.projectiles.splice(i, 1);
        continue;
      }

      // Clamp projectiles to canvas bounds
      pr.x = Math.max(0, Math.min(this.width, pr.x));
      pr.y = Math.max(0, Math.min(this.height, pr.y));

      if (pr.fromPlayer && !pr.isChain) {
        for (const e of this.enemies) {
          if (e.isDying) continue;
          if (e.invuln > 0) continue;
          if (this.dist(pr.x, pr.y, e.x, e.y) < e.def.radius + pr.radius) {
            e.health -= pr.damage;
            e.hitFlash = 0.2;
            this.spawnHitParticles(e.x, e.y, pr.color);
            this.spawnFloatingText(e.x, e.y, Math.floor(pr.damage).toString(), '#ff6666');
            audio.playSfx('enemy-hit');
            if (this.hasSkill('s_lifesteal')) {
              this.player.health = Math.min(this.player.maxHealth, this.player.health + pr.damage * 0.15);
            }
            this.projectiles.splice(i, 1);
            break;
          }
        }
      } else if (pr.fromPlayer && pr.isChain) {
        // Chain projectile: check if it hit its specific target
        const target = this.enemies.find(e => e.id === pr.chainTargetId && !e.isDying);
        if (!target) {
          // Target died or gone - chain will return (handled in setTimeout)
          this.projectiles.splice(i, 1);
        }
      } else {
        if (this.dist(pr.x, pr.y, this.player.x, this.player.y) < 16 + pr.radius) {
          this.playerTakeDamage(pr.damage);
          if (pr.kind === 'web') {
            // ПАУТИНА (ТЗ): «бросаются паутиной и замедляют» — главный
            // эффект сети именно ЗАМЕДЛЕНИЕ, урон у неё мал.
            this.player.slowTimer = 2.6;
            this.spawnFloatingText(this.player.x, this.player.y - 40, this.profile.language === 'ru' ? 'ЗАПУТАН!' : 'WEBBED!', '#e8f0ff');
          } else if (pr.element === 'ice') {
            this.player.slowTimer = 0.65;
            this.spawnFloatingText(this.player.x, this.player.y - 40, this.profile.language === 'ru' ? 'Р—РђРњРћР РћР—РљРђ' : 'FROZEN', '#8fd8ff');
          } else if (pr.element === 'fire') {
            this.player.burnTimer = 2.5;
            this.spawnFloatingText(this.player.x, this.player.y - 40, this.profile.language === 'ru' ? 'РџРћР”РћР–Р–РЃРќ' : 'BURNING', '#ff8a3a');
          } else if (pr.element === 'poison') {
            this.spawnFloatingText(this.player.x, this.player.y - 40, this.profile.language === 'ru' ? 'РћРўР РђР’Р›Р•Рќ' : 'POISONED', '#7fd44a');
          } else if (pr.element === 'storm') {
            this.player.slowTimer = 0.4;
            this.spawnFloatingText(this.player.x, this.player.y - 40, this.profile.language === 'ru' ? 'РЁРћРљ' : 'SHOCKED', '#ffe14a');
          } else if (pr.element === 'dark') {
            this.spawnFloatingText(this.player.x, this.player.y - 40, this.profile.language === 'ru' ? 'РўР¬РњРђ' : 'DARKNESS', '#a86ad8');
          }
          this.projectiles.splice(i, 1);
        }
      }
    }
  }

  updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.92;
      p.vy *= 0.92;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  updateFloatingTexts(dt: number) {
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const t = this.floatingTexts[i];
      t.y += t.vy * dt;
      t.life -= dt;
      if (t.life <= 0) this.floatingTexts.splice(i, 1);
    }
  }

  dist(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  }

  // === RENDERING ===
  render() {
    const now = performance.now() / 1000;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    // РўСЂСЏСЃРєР° СЌРєСЂР°РЅР° РѕС‚ С‚СЏР¶С‘Р»С‹С… signature-СѓРґР°СЂРѕРІ (СЃР»РёР·РµРЅСЊ-СЃР»СЌРј, РѕР±СЂСѓС€РµРЅРёРµ РіРѕР»РµРјР°)
    ctx.save();
    if (this.shake > 0) {
      ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    }

    const dg = DUNGEONS.find(d => d.id === (this.profile.equippedDungeons[0] || 'whispering_grove')) || DUNGEONS[0];
    const grad = ctx.createRadialGradient(this.width / 2, this.height / 2, 0, this.width / 2, this.height / 2, Math.max(this.width, this.height) / 1.5);
    grad.addColorStop(0, dg.bgGradient[0]);
    grad.addColorStop(1, dg.bgGradient[1]);
    ctx.fillStyle = grad;
    ctx.fillRect(-32, -32, this.width + 64, this.height + 64);

    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < this.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
      ctx.stroke();
    }
    for (let y = 0; y < this.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }

    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Р›СѓР¶Рё/Р·РѕРЅС‹ РЅР° Р·РµРјР»Рµ вЂ” РїРѕРґ РјРѕРЅСЃС‚СЂР°РјРё, РїРѕРІРµСЂС… С„РѕРЅР°
    drawPuddles(ctx, this.puddles, now);
    this.drawBeams(ctx, now);

    for (const e of this.enemies) {
      this.renderEnemy(e);
    }

    // РўР•Р›Р•Р“Р РђР¤Р« РђРўРђРљ Р‘РћРЎРЎРђ. Р Р°РЅСЊС€Рµ СѓРґР°СЂР° РЅРµ Р±С‹Р»Рѕ РІРёРґРЅРѕ РІРѕРѕР±С‰Рµ: Р±РѕСЃСЃ
    // В«СЃС‚СЂРµР»СЏР»В» РІ С‚РѕС‚ Р¶Рµ РєР°РґСЂ, РєРѕРіРґР° РёРіСЂРѕРє РµС‰С‘ РЅРµ РїРѕРЅСЏР», С‡С‚Рѕ РїСЂРѕРёР·РѕР№РґС‘С‚.
    // РўРµРїРµСЂСЊ Р·Р° `telegraph` СЃРµРєСѓРЅРґ РґРѕ СѓРґР°СЂР° РЅР° Р·РµРјР»Рµ/РІ РІРѕР·РґСѓС…Рµ СЂРёСЃСѓРµС‚СЃСЏ
    // Р·РѕРЅР° РїРѕСЂР°Р¶РµРЅРёСЏ: РєСЂСѓРі РїР°РґРµРЅРёСЏ РјРµС‚РµРѕСЂРёС‚Р°, Р»СѓС‡ РїСЂРёС†РµР»Р°, СЃРµРєС‚РѕСЂ
    // ground-СѓРґР°СЂР° РёР»Рё РєРѕР»СЊС†Рѕ РІС‹Р»РµС‚Р°СЋС‰РёС… СЃРЅР°СЂСЏРґРѕРІ. РљСЂСѓРі РЎРЈР–РђР•РўРЎРЇ Рє
    // РјРѕРјРµРЅС‚Сѓ СѓРґР°СЂР° вЂ” СЌС‚Рѕ С‡РёС‚Р°РµС‚СЃСЏ РєР°Рє В«СЃРµР№С‡Р°СЃВ».
    this.drawCastTelegraphs(now);

    for (const pr of this.projectiles) {
      // Р¦Р•РџР¬ Р°СЃСЃР°СЃРёРЅР° вЂ” РµРґРёРЅСЃС‚РІРµРЅРЅС‹Р№ СЃРЅР°СЂСЏРґ, РєРѕС‚РѕСЂС‹Р№ СЂРёСЃСѓРµС‚СЃСЏ Р»РёРЅРёРµР№
      // (СЌС‚Рѕ РЅРµ В«СЃРЅР°СЂСЏРґВ», Р° РЅР°С‚СЏРЅСѓС‚Р°СЏ С†РµРїСЊ), РїРѕСЌС‚РѕРјСѓ Сѓ РЅРµРіРѕ СЃРІРѕСЏ РІРµС‚РєР°.
      if (pr.isChain) {
        ctx.strokeStyle = pr.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(this.player.x, this.player.y);
        ctx.lineTo(pr.x, pr.y);
        ctx.stroke();
        ctx.fillStyle = '#c0c0c0';
        ctx.beginPath();
        ctx.arc(pr.x, pr.y, 4, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      // РҐР’РћРЎРў: РїРѕ РёСЃС‚РѕСЂРёРё РїРѕР·РёС†РёР№. Р Р°РЅСЊС€Рµ РµРіРѕ РЅРµ Р±С‹Р»Рѕ РІРѕРѕР±С‰Рµ, РїРѕСЌС‚РѕРјСѓ
      // Р±С‹СЃС‚СЂС‹Р№ СЃРЅР°СЂСЏРґ (720 px/СЃ) РЅР° СЌРєСЂР°РЅРµ РІС‹РіР»СЏРґРµР» РєР°Рє РјРµР»СЊРєР°СЋС‰РёР№
      // РїРёРєСЃРµР»СЊ: РЅР°РїСЂР°РІР»РµРЅРёРµ СѓРґР°СЂР° Р±С‹Р»Рѕ РЅРµРІРѕР·РјРѕР¶РЅРѕ РїСЂРѕС‡РёС‚Р°С‚СЊ Р·Р°СЂР°РЅРµРµ,
      // Рё В«СѓРІРµСЂРЅСѓС‚СЊСЃСЏВ» РјРѕР¶РЅРѕ Р±С‹Р»Рѕ С‚РѕР»СЊРєРѕ РЅР°СѓРіР°Рґ.
      if (pr.trail && pr.trail.length > 1) {
        drawArrowTrail(ctx, pr.trail, pr.kind, now);
      }
      // РЎРђРњ РЎРќРђР РЇР”: РЅР°СЃС‚РѕСЏС‰Р°СЏ СЃС‚СЂРµР»Р°/РєСЂРёСЃС‚Р°Р»Р»/РїР»Р°РјСЏ РїРѕ РІРёРґСѓ `kind`.
      // РњР°СЃС€С‚Р°Р± вЂ” РѕС‚ СЂР°РґРёСѓСЃР° РїРѕРїР°РґР°РЅРёСЏ, С‡С‚РѕР±С‹ РєР°СЂС‚РёРЅРєР° СЃРѕРІРїР°РґР°Р»Р° СЃ Р·РѕРЅРѕР№
      // СѓСЂРѕРЅР° (РёРЅР°С‡Рµ В«Р»РµР·РІРёРµВ» РІС‹РіР»СЏРґРёС‚ РѕРіСЂРѕРјРЅС‹Рј, Р° Р±СЊС‘С‚ РєР°Рє С‚РѕС‡РєР°).
      const prof = arrowProfile(pr.kind);
      const scale = Math.max(0.7, Math.min(2.6, pr.radius / Math.max(2, prof.radius)) * (pr.fromPlayer ? 1 : 1.25));
      drawArrow(ctx, {
        x: pr.x, y: pr.y,
        angle: Math.atan2(pr.vy, pr.vx),
        kind: pr.kind,
        scale,
        // РЅР° РёР·Р»С‘С‚Рµ СЃРЅР°СЂСЏРґ С‚Р°РµС‚ вЂ” С‚Р°Рє РІРёРґРЅРѕ, С‡С‚Рѕ РѕРЅ СЃРєРѕСЂРѕ РёСЃС‡РµР·РЅРµС‚
        fade: Math.max(0, 1 - pr.life / 0.45),
        now,
      });
    }

    // Melee swing trails (semi-arc) drawn under the player, in each weapon's own color
    this.meleeSword.drawSweep(ctx);
    this.meleeSickle.drawSweep(ctx);

    this.renderPlayer();

    for (const t of this.floatingTexts) {
      ctx.globalAlpha = t.life;
      ctx.fillStyle = t.color;
      ctx.font = 'bold 14px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;

    if (this.waveTransitionTimer > 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.fillStyle = '#f0c050';
      ctx.font = 'bold 48px Cinzel, serif';
      ctx.textAlign = 'center';
      ctx.fillText(this.waveTransitionText, this.width / 2, this.height / 2);
      if (this.waveTransitionSubtext) {
        ctx.fillStyle = '#8888a0';
        ctx.font = '20px Cinzel, serif';
        ctx.fillText(this.waveTransitionSubtext, this.width / 2, this.height / 2 + 40);
      }
    }
    ctx.restore();
  }




  /** РљСЌС€ РїРёРєСЃРµР»СЊ-Р°СЂС‚Р°: РєР»СЋС‡ в†’ СЃРµС‚РєР°. Р”РµС‚РµСЂРјРёРЅРёСЂРѕРІР°РЅ, РїРѕСЌС‚РѕРјСѓ СЃС‚СЂРѕРёС‚СЃСЏ РѕРґРёРЅ СЂР°Р·. */
  artCache = new Map<string, ArtGrid>();
  palCache = new Map<string, ArtPalette>();
  /** РЎРїСЂР°Р№С‚С‹ 1 СЂР°Р· РЅР° (РІСЂР°Рі, С†РІРµС‚, РєР°РґСЂ). Р‘РµР»Р°СЏ РІСЃРїС‹С€РєР° СЃРѕР·РґР°С‘С‚СЃСЏ РїРѕ С‚СЂРµР±РѕРІР°РЅРёСЋ. */
  spriteCache = new Map<string, { normal: ImageBitmap; n: number; white?: ImageBitmap }>();
  /**
   * РљСЌС€ СЃРїСЂР°Р№С‚РѕРІ РћР РЈР–РРЇ РґР»СЏ СѓРґР°СЂРѕРІ: РєР»СЋС‡ в†’ РѕР±СЂРµР·Р°РЅРЅРѕРµ РїРѕ РіР°Р±Р°СЂРёС‚Р°Рј РёР·РѕР±СЂР°Р¶РµРЅРёРµ
   * (РІ РїРёРєСЃРµР»СЏС… СЃРїСЂР°Р№С‚Р°) + С‚РѕС‡РєР° С…РІР°С‚Р° Рё РѕСЃСЊ РєР»РёРЅРєР°. РҐСЂР°РЅРёС‚СЃСЏ РѕРґРёРЅ СЂР°Р· РЅР°
   * (РЅР°Р±РѕСЂ, Р±РѕСЃСЃ, id, С†РІРµС‚, СЃС‚РёС…РёСЏ): РІРѕ РІСЂРµРјСЏ Р±РѕСЏ С‚РѕР»СЊРєРѕ РїРѕРІРѕСЂРѕС‚С‹ drawImage.
   */
  weaponCache = new Map<string, { bmp: OffscreenCanvas; pivotX: number; pivotY: number; axis: number; length: number; w: number; h: number }>();
  /** РќР°Р±РѕСЂ РєР°РґСЂРѕРІ РјРѕРЅСЃС‚СЂР°: 11 РїРѕР· (РїРѕРєРѕР№, РґС‹С…Р°РЅРёРµ, 4 С€Р°РіР°, 4 С„Р°Р·С‹ СѓРґР°СЂР°, С‚СЏРіР°). */
  static FRAME_VARIANTS: ArtVariant[] = ART_VARIANTS;

  getMonsterArt(id: string, shape: EnemyShape, boss: boolean, meta?: MonsterArtMeta, variant: ArtVariant = 'idle'): ArtGrid {
    // РљР»СЋС‡ РѕР±СЏР·Р°РЅ РІРєР»СЋС‡Р°С‚СЊ gait Рё РЅР°Р±РѕСЂ traits: РёРЅР°С‡Рµ РґРІР° РјРѕРЅСЃС‚СЂР° РѕРґРЅРѕРіРѕ РІРёРґР°
    // (РЅР°РїСЂРёРјРµСЂ В«Р—РµР»С‘РЅС‹Р№ СЃР»РёР·РµРЅСЊВ» Рё В«РљРёСЃР»РѕС‚РЅС‹Р№ СЃР»РёР·РµРЅСЊВ») РїРѕР»СѓС‡РёР»Рё Р±С‹ РѕРґРёРЅ
    // Рё С‚РѕС‚ Р¶Рµ СЃРїСЂР°Р№С‚ РёР· РєСЌС€Р°, Рё РІРёР·СѓР°Р»СЊРЅРѕ СЃС‚Р°Р»Рё Р±С‹ РЅРµСЂР°Р·Р»РёС‡РёРјС‹.
    const key = patternKey(id, shape, boss) + '|' + variant + '|' + (meta?.gait || 'walk') + '|' + (meta?.attack || '-') + '|' + (meta?.traits ? meta.traits.join(',') : '-');
    let art = this.artCache.get(key);
    if (!art) { art = buildMonsterArt(id, shape, boss, meta, variant); this.artCache.set(key, art); }
    return art;
  }

  /**
   * РџСЂРѕРіСЂРµРІР°РµС‚ РєСЌС€ СЃРїСЂР°Р№С‚РѕРІ Р·Р°СЂР°РЅРµРµ (РІСЃРµ 11 РєР°РґСЂРѕРІ), С‡С‚РѕР±С‹ РІРѕ РІСЂРµРјСЏ Р±РѕСЏ
   * РЅРµ Р±С‹Р»Рѕ РµРґРёРЅРѕРіРѕ В«РїРѕРґРІРёСЃР°РЅРёСЏВ» РЅР° РіРµРЅРµСЂР°С†РёСЋ 256Г—256 РїРёРєСЃРµР»СЊ-Р°СЂС‚Р°.
   * Р’С‹Р·С‹РІР°РµС‚СЃСЏ РїСЂРё СЃРїР°РІРЅРµ РІРѕР»РЅС‹, РїРѕРєР° РІСЂР°РіРё РµС‰С‘ РїРѕСЏРІР»СЏСЋС‚СЃСЏ (spawnAnim).
   */
  warmMonsterFrames(id: string, shape: EnemyShape, boss: boolean, color: string, meta: MonsterArtMeta) {
    for (const v of ART_VARIANTS) {
      this.getMonsterSprite(id, shape, boss, color, meta, v);
      monsterSprites.get(id, boss, v);
    }
  }

  private layerFill(v: number, pal: ArtPalette): string {
    switch (v) {
      case 1: return pal.outline;
      case 2: return pal.bodyDark;
      case 3: return pal.body;
      case 4: return pal.bodyLight;
      case 5: return pal.metalDark;
      case 6: return pal.metal;
      case 7: return pal.metalLight;
      case 8: return pal.gold;
      case 9: return pal.eye;
      case 10: return pal.bone;
      case 11: return pal.mouth;
      case 12: return pal.accent;
      default: return pal.body;
    }
  }

  /** Р¦РІРµС‚: РїР°Р»РёС‚СЂР° РєСЌС€РёСЂСѓРµС‚СЃСЏ, РїРѕСЌС‚РѕРјСѓ СЃРїСЂР°Р№С‚ СЃС‚СЂРѕРёС‚СЃСЏ РѕРґРёРЅ СЂР°Р· РЅР° (РІСЂР°Рі, С†РІРµС‚, РєР°РґСЂ). */
  private rasterizeSprite(art: ArtGrid, pal: ArtPalette): { normal: ImageBitmap; n: number; white?: ImageBitmap } {
    // Р Р°Р·РјРµСЂ С…РѕР»СЃС‚Р° Р±РµСЂС‘С‚СЃСЏ РР— РЎР•РўРљР: С‚РµР»Рѕ СЂРёСЃСѓРµС‚СЃСЏ РЅР° 256, РЅРѕ РµСЃР»Рё Сѓ РјРѕРЅСЃС‚СЂР°
    // РґР»РёРЅРЅРѕРµ РѕСЂСѓР¶РёРµ, СЃРїСЂР°Р№С‚ СЃРѕР±РёСЂР°РµС‚СЃСЏ РЅР° СЂР°СЃС€РёСЂРµРЅРЅРѕРј С…РѕР»СЃС‚Рµ (WEAPON_N = 384)
    // вЂ” РёРЅР°С‡Рµ РєР»РёРЅРѕРє РѕР±СЂРµР·Р°Р»СЃСЏ РєСЂР°РµРј. РњР°СЃС€С‚Р°Р± РїРёРєСЃРµР»СЏ РІ РѕР±РѕРёС… СЃР»СѓС‡Р°СЏС… РѕРґРёРЅ Рё
    // С‚РѕС‚ Р¶Рµ, РїРѕСЌС‚РѕРјСѓ С‚РµР»Рѕ РЅР° СЌРєСЂР°РЅРµ РЅРµ РјРµРЅСЏРµС‚ СЂР°Р·РјРµСЂ (СЃРј. drawPixelMonster).
    const n = art.length;
    const off = new OffscreenCanvas(n, n);
    const c = off.getContext('2d')!;
    c.clearRect(0, 0, n, n);
    // Р‘С‹СЃС‚СЂС‹Р№ РїСѓС‚СЊ: РѕРґРёРЅ РїСЂРѕС…РѕРґ С‡РµСЂРµР· Uint32Array РІРјРµСЃС‚Рѕ fillRect РЅР° РєР°Р¶РґС‹Р№
    // РїРёРєСЃРµР»СЊ. РџСЂРё ART_N=256 СЌС‚Рѕ 65 536 РІС‹Р·РѕРІРѕРІ РєР°РЅРІС‹ РЅР° СЃРїСЂР°Р№С‚ (11 РєР°РґСЂРѕРІ Г—
    // РЅРµСЃРєРѕР»СЊРєРѕ РІСЂР°РіРѕРІ РЅР° СЃРїР°РІРЅРµ) вЂ” РѕС‚РґРµР»СЊРЅС‹Рµ fillRect РґР°РІР°Р»Рё РїСЂРѕСЃР°РґРєСѓ РєР°РґСЂР°.
    const img = c.createImageData(n, n);
    const buf = new Uint32Array(img.data.buffer);
    const fills = new Uint32Array(13);
    for (let v = 1; v <= 12; v++) fills[v] = this.fillU32(this.layerFill(v, pal));
    for (let y = 0; y < n; y++) {
      const row = art[y], base = y * n;
      for (let x = 0; x < n; x++) {
        const v = row[x];
        if (v !== 0) buf[base + x] = fills[v] || fills[3];
      }
    }
    c.putImageData(img, 0, 0);
    // РСЃРєСЂР° РІ РіР»Р°Р·Р°С… (СЃР»РѕР№ 9): РјР°Р»РµРЅСЊРєРёР№ РїРѕР»СѓРїСЂРѕР·СЂР°С‡РЅС‹Р№ Р±Р»РёРє РїРѕРІРµСЂС… Р·СЂР°С‡РєР°.
    c.fillStyle = 'rgba(255,255,255,0.85)';
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        if (art[y][x] === 9) c.fillRect(x + 0.3, y + 0.3, 0.4, 0.4);
      }
    }
    const normal = off.transferToImageBitmap();
    // Р‘РµР»Р°СЏ РІРµСЂСЃРёСЏ (РІСЃРїС‹С€РєР° РїСЂРё СѓСЂРѕРЅРµ) РќР• СЃРѕР·РґР°С‘С‚СЃСЏ СЃСЂР°Р·Сѓ: РѕРЅР° РЅСѓР¶РЅР° С‚РѕР»СЊРєРѕ РІ
    // РјРѕРјРµРЅС‚ РїРѕРїР°РґР°РЅРёСЏ, Р° РїР°РјСЏС‚СЊ Р·Р°РЅРёРјР°РµС‚ СЃС‚РѕР»СЊРєРѕ Р¶Рµ, СЃРєРѕР»СЊРєРѕ РѕР±С‹С‡РЅС‹Р№ СЃРїСЂР°Р№С‚.
    // РџСЂРё 15 РєР°РґСЂР°С… Г— РґРµСЃСЏС‚РєР°С… РјРѕРЅСЃС‚СЂРѕРІ СЌС‚Рѕ СЌРєРѕРЅРѕРјРёС‚ СЃРѕС‚РЅРё РњР‘ вЂ” СЃРїСЂР°Р№С‚С‹ СЃС‚Р°Р»Рё
    // Р±РѕР»СЊС€Рµ (384 РІРјРµСЃС‚Рѕ 256) РёР·-Р·Р° РґР»РёРЅРЅРѕРіРѕ РѕСЂСѓР¶РёСЏ.
    return { normal, n };
  }

  /** Р‘РµР»Р°СЏ В«РІСЃРїС‹С€РєР° РїСЂРё СѓСЂРѕРЅРµВ» вЂ” СЃС‚СЂРѕРёС‚СЃСЏ РїРѕ С‚СЂРµР±РѕРІР°РЅРёСЋ Рё РѕСЃС‚Р°С‘С‚СЃСЏ РІ РєСЌС€Рµ. */
  private whiteFlash(bmp: ImageBitmap, n: number): ImageBitmap {
    const off = new OffscreenCanvas(n, n);
    const c = off.getContext('2d')!;
    c.drawImage(bmp, 0, 0);
    c.globalCompositeOperation = 'source-atop';
    c.fillStyle = 'rgba(255,255,255,0.92)';
    c.fillRect(0, 0, n, n);
    return off.transferToImageBitmap();
  }

  /** '#rrggbb' в†’ 0xAABBGGRR (little-endian) РґР»СЏ Uint32Array РїРѕРІРµСЂС… ImageData. */
  private fillU32(hex: string): number {
    const h = parseInt(hex.slice(1), 16);
    return (0xff000000 | ((h & 0xff) << 16) | (h & 0xff00) | ((h >>> 16) & 0xff)) >>> 0;
  }

  private getMonsterSprite(
    id: string,
    shape: EnemyShape,
    boss: boolean,
    color: string,
    meta: MonsterArtMeta | undefined,
    variant: ArtVariant,
  ): { normal: ImageBitmap; n: number; white?: ImageBitmap } {
    const key = patternKey(id, shape, boss) + '|' + color + '|' + variant + '|' + (meta?.gait || 'walk') + '|' + (meta?.attack || '-') + '|' + (meta?.traits ? meta.traits.join(',') : '-');
    let sp = this.spriteCache.get(key);
    if (!sp) {
      const art = this.getMonsterArt(id, shape, boss, meta, variant);
      const palKey = color || '#ffffff';
      let pal = this.palCache.get(palKey);
      if (!pal) { pal = buildPalette(palKey); this.palCache.set(palKey, pal); }
      sp = this.rasterizeSprite(art, pal);
      this.spriteCache.set(key, sp);
    }
    return sp;
  }

  /**
   * РќРђР‘РћР  РћР РЈР–РРЇ РўР’РђР Р. РЈ Р±РѕСЃСЃР° вЂ” Р»РёС‡РЅС‹Р№ (EnemyDef.weapon), Сѓ РѕР±С‹С‡РЅРѕРіРѕ РјРѕРЅСЃС‚СЂР° вЂ”
   * РїРѕ РёРјРµРЅРё Рё С„РѕСЂРјРµ (monsterKit). РРјРµРЅРЅРѕ СЌС‚Рѕ РѕСЂСѓР¶РёРµ РІРёРґРЅРѕ РІ СЂСѓРєРµ РЅР° СЃРїСЂР°Р№С‚Рµ Рё
   * РёРјРµРЅРЅРѕ РёРј С‚РІР°СЂСЊ РјР°С€РµС‚ РІ Р±РѕСЋ: РєР°СЂС‚РёРЅРєР° Рё СѓРґР°СЂ РІСЃРµРіРґР° СЃРѕРІРїР°РґР°СЋС‚.
   */
  enemyWeaponKit(e: Enemy): WeaponKit {
    if (e.def.weapon) return e.def.weapon;
    return monsterKit(e.def.id, e.def.name.ru, e.def.name.en, e.def.shape || 'blob', !!e.isBoss).weapon;
  }

  /**
   * РЎРџР РђР™Рў РћР РЈР–РРЇ Р”Р›РЇ РЈР”РђР Рђ. Р Р°РЅСЊС€Рµ СѓРґР°СЂ СЂРёСЃРѕРІР°Р»СЃСЏ Р»РёРЅРёРµР№ РєР°РЅРІС‹ вЂ” В«Р±РµР»Р°СЏ РїР°Р»РєР°В»
   * РІРјРµСЃС‚Рѕ РєР»РёРЅРєР°. РўРµРїРµСЂСЊ Р±РµСЂС‘С‚СЃСЏ С‚РѕС‚ Р¶Рµ РїРёРєСЃРµР»СЊ-Р°СЂС‚, С‡С‚Рѕ Сѓ С‚РІР°СЂРё РІ СЂСѓРєРµ
   * (buildWeaponSprite), РѕР±СЂРµР·Р°РµС‚СЃСЏ РїРѕ РіР°Р±Р°СЂРёС‚Р°Рј Рё РєСЌС€РёСЂСѓРµС‚СЃСЏ; РІ Р±РѕСЋ РѕСЃС‚Р°С‘С‚СЃСЏ
   * С‚РѕР»СЊРєРѕ РїРѕРІРµСЂРЅСѓС‚СЊ РµРіРѕ РІРѕРєСЂСѓРі РєРёСЃС‚Рё. РЎС‚РёС…РёСЏ Р±РѕСЃСЃР° В«РїСЂРѕСЏРІР»СЏРµС‚СЃСЏВ» РЅР° РѕСЂСѓР¶РёРё:
   * СЃР°РјРѕС†РІРµС‚С‹ Рё Р±Р»РёРєРё РіРѕСЂСЏС‚ С†РІРµС‚РѕРј РµРіРѕ СЃС‚РёС…РёРё.
   */
  getWeaponSwingSprite(
    kit: WeaponKit,
    boss: boolean,
    seed: string,
    color: string,
    element?: Element,
  ): { bmp: OffscreenCanvas; pivotX: number; pivotY: number; axis: number; length: number; w: number; h: number } | null {
    const key = `${kit}|${boss ? 'B' : 'm'}|${seed}|${color}|${element || '-'}`;
    const cached = this.weaponCache.get(key);
    if (cached) return cached;
    const ws: WeaponSprite | null = buildWeaponSprite(kit, boss, seed);
    if (!ws) return null;
    const palKey = color || '#ffffff';
    let pal = this.palCache.get(palKey);
    if (!pal) { pal = buildPalette(palKey); this.palCache.set(palKey, pal); }
    const wpal: ArtPalette = element
      ? { ...pal, eye: elementColor(element, pal.eye), accent: elementColor(element, pal.accent), glow: elementColor(element, pal.glow) }
      : pal;
    const n = ws.grid.length;
    const off = new OffscreenCanvas(n, n);
    const c = off.getContext('2d')!;
    const img = c.createImageData(n, n);
    const buf = new Uint32Array(img.data.buffer);
    const fills = new Uint32Array(13);
    for (let v = 1; v <= 12; v++) fills[v] = this.fillU32(this.layerFill(v, wpal));
    // Р“Р°Р±Р°СЂРёС‚С‹ РѕСЂСѓР¶РёСЏ: РѕР±СЂРµР·РєР° СЂР°РґРё СЃРєРѕСЂРѕСЃС‚Рё РєР°РґСЂР° (СЂРёСЃСѓРµРј С‚РѕР»СЊРєРѕ СЃР°РјРѕ РѕСЂСѓР¶РёРµ,
    // Р° РЅРµ РїСѓСЃС‚РѕР№ С…РѕР»СЃС‚ 256Г—256) вЂ” РїСЂРё РІРµРµСЂРµ РёР· 5-7 РєРѕРїРёР№ РЅР° РєР°Р¶РґС‹Р№ СѓРґР°СЂ СЌС‚Рѕ
    // РІ СЂР°Р·С‹ РјРµРЅСЊС€Рµ СЂР°Р±РѕС‚С‹ РґР»СЏ РєР°РЅРІС‹.
    let minX = n, minY = n, maxX = -1, maxY = -1;
    for (let y = 0; y < n; y++) {
      const row = ws.grid[y], base = y * n;
      for (let x = 0; x < n; x++) {
        const v = row[x];
        if (v === 0) continue;
        buf[base + x] = fills[v] || fills[3];
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
    if (maxX < 0) return null;
    c.putImageData(img, 0, 0);
    const w = maxX - minX + 1, h = maxY - minY + 1;
    const crop = new OffscreenCanvas(w, h);
    crop.getContext('2d')!.drawImage(off, -minX, -minY);
    const out = {
      bmp: crop,
      pivotX: ws.pivotX - minX,
      pivotY: ws.pivotY - minY,
      axis: ws.axis,
      length: ws.length,
      w, h,
    };
    this.weaponCache.set(key, out);
    return out;
  }

  /** Р­С…Рѕ: СЃРєРѕР»СЊРєРѕ РІРѕР»РЅ В«РїРѕРјРЅРёС‚В» Р±РѕСЃСЃ, Рё РєС‚Рѕ РёРјРµРЅРЅРѕ РїСЂРёС…РѕРґРёР» (id РјРѕРЅСЃС‚СЂРѕРІ). */
  recordWaveHistory(ids: string[]) {
    if (ids.length === 0) return;
    this.waveHistory.push(ids);
    while (this.waveHistory.length > 5) this.waveHistory.shift();
  }

  /**
   * Р­РҐРћ РџР РћРЁР›Р«РҐ Р’РћР›Рќ: Р±РѕСЃСЃ РїРѕРґРЅРёРјР°РµС‚ РёР· В«РїР°РјСЏС‚РёВ» РјРѕРЅСЃС‚СЂРѕРІ РїРѕСЃР»РµРґРЅРёС… 5 РІРѕР»РЅ.
   * Р•РґРёРЅРёС†С‹ Р±РµСЂСѓС‚СЃСЏ РёР· РёСЃС‚РѕСЂРёРё СЃРїР°РІРЅР° Рё РјР°СЃС€С‚Р°Р±РёСЂСѓСЋС‚СЃСЏ РїРѕРґ РўР•РљРЈР©РЈР® РІРѕР»РЅСѓ С‚РµРјРё
   * Р¶Рµ РјРЅРѕР¶РёС‚РµР»СЏРјРё, С‡С‚Рѕ Рё РѕР±С‹С‡РЅС‹Рµ РІСЂР°РіРё, РїРѕСЌС‚РѕРјСѓ СЌС…Рѕ РЅРµ СЃР»Р°Р±РµРµ Рё РЅРµ СЃРёР»СЊРЅРµРµ
   * С‚РѕРіРѕ, С‡С‚Рѕ РёРіСЂРѕРє СѓР¶Рµ РїСЂРѕС…РѕРґРёР». РџРѕСЏРІР»СЏСЋС‚СЃСЏ РѕРЅРё Сѓ СЃР°РјРѕРіРѕ Р±РѕСЃСЃР° вЂ” РІРёРґРЅРѕ, РѕС‚РєСѓРґР°
   * РІР·СЏР»РёСЃСЊ, Рё РїРѕРЅСЏС‚РЅРѕ, РєС‚Рѕ РёРјРµРЅРЅРѕ РїСЂРёС€С‘Р» (РёРіСЂРѕРє СѓР·РЅР°С‘С‚ Р·РЅР°РєРѕРјС‹С… РјРѕРЅСЃС‚СЂРѕРІ).
   */
  summonEcho(e: Enemy, count: number) {
    const ru = this.profile.language === 'ru';
    const pool: string[] = [];
    for (const waveIds of this.waveHistory) {
      for (const id of waveIds) if (pool.indexOf(id) < 0) pool.push(id);
    }
    if (pool.length === 0) {
      // РџРµСЂРІС‹Р№ РІ РёСЃС‚РѕСЂРёРё Р±РѕСЃСЃ (РІРѕР»РЅР° 5) РµС‰С‘ РЅРёС‡РµРіРѕ РЅРµ В«РїРѕРјРЅРёС‚В»: РїРѕРґРЅРёРјР°РµС‚
      // РјРѕРЅСЃС‚СЂРѕРІ СЃРІРѕРµРіРѕ РїРѕРґР·РµРјРµР»СЊСЏ, С‡С‚РѕР±С‹ РїСЂРёС‘Рј РЅРµ РІС‹РіР»СЏРґРµР» РїСѓСЃС‚С‹Рј.
      for (const def of Object.values(ENEMIES)) {
        if (!def.isBoss && def.dungeonId === e.def.dungeonId) pool.push(def.id);
      }
      if (pool.length === 0) pool.push('slime');
    }
    const hpMult = this.getWaveHealthMultiplier(false);
    const dmgMult = this.getWaveDamageMultiplier(false);
    const healthMult = this.getDifficultyHealthMult();
    const damageMult = this.getDifficultyDamageMult();
    let summoned = 0;
    for (let i = 0; i < count; i++) {
      const id = pool[Math.floor(Math.random() * pool.length)];
      const def = ALL_ENEMIES[id] || ENEMIES[id];
      if (!def) continue;
      const before = this.enemies.length;
      this.spawnEnemy(def, hpMult, false, healthMult, damageMult, dmgMult);
      if (this.enemies.length <= before) continue;
      const m = this.enemies[this.enemies.length - 1];
      const angle = (i / Math.max(1, count)) * Math.PI * 2 + Math.random() * 0.6;
      const rad = e.def.radius * 1.3 + m.def.radius + Math.random() * 30;
      m.x = Math.max(m.def.radius, Math.min(this.width - m.def.radius, e.x + Math.cos(angle) * rad));
      m.y = Math.max(m.def.radius, Math.min(this.height - m.def.radius, e.y + Math.sin(angle) * rad));
      m.spawnAnim = 0.5;
      summoned++;
    }
    this.spawnNovaEffect(e.x, e.y);
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2;
      this.spawnHitParticles(e.x + Math.cos(a) * e.def.radius * 0.9, e.y + Math.sin(a) * e.def.radius * 0.9, shadeColor(e.def.color, 1.5));
    }
    this.spawnFloatingText(e.x, e.y - e.def.radius - 26, ru ? 'Р­РҐРћ Р’РћР›Рќ!' : 'ECHO OF WAVES!', '#c9a0ff');
    audio.playSfx('boss-spawn');
    return summoned;
  }

  /**
   * РљР°РґСЂ РјРѕРЅСЃС‚СЂР° РїРѕ СЃРѕСЃС‚РѕСЏРЅРёСЋ.
   * РџРѕС…РѕРґРєР°: РЅР°Р±РѕСЂ РєР°РґСЂРѕРІ РїРѕРґР±РёСЂР°РµС‚СЃСЏ РїРѕРґ Р°РЅР°С‚РѕРјРёСЋ (Сѓ СЃР»РёР·РЅРё 2 РїР»Р°РІРЅС‹С… РєР°РґСЂР°
   * РїРµСЂРµС‚РµРєР°РЅРёСЏ, Сѓ РїСЂС‹РіР°СЋС‰РёС… 2 РєР°РґСЂР° СЃ РѕС‚СЂС‹РІРѕРј, Сѓ С…РѕРґСЏС‰РёС… 4 С„Р°Р·С‹), Р° РґР»РёС‚РµР»СЊРЅРѕСЃС‚СЊ
   * С†РёРєР»Р° вЂ” РёР· gaitPhaseRate, РїРѕСЌС‚РѕРјСѓ РіРѕР»РµРј С‚РѕРїРѕС‡РµС‚ РјРµРґР»РµРЅРЅРѕ, Р° Р¶СѓРє Р±С‹СЃС‚СЂРѕ.
   * РђС‚Р°РєР°: 4 С„Р°Р·С‹ (Р·Р°РјР°С… в†’ РЅР°С‡Р°Р»Рѕ СѓРґР°СЂР° в†’ РєРѕРЅС‚Р°РєС‚ в†’ РїСЂРѕРІРѕРґРєР°), Р·Р°С‚РµРј РїРѕРєРѕР№.
   */
  /**
   * РљРђР”Р  РђРўРђРљР + РЎР›Р•Р”РЈР®Р©РР™ Р”Р›РЇ РЎРњР•РЁРР’РђРќРРЇ.
   *
   * РђС‚Р°РєР° РїСЂРѕРёРіСЂС‹РІР°РµС‚СЃСЏ РІСЃРµРіРѕ 4вЂ“5 Р·Р°РїРµС‡С‘РЅРЅС‹РјРё РєР°РґСЂР°РјРё (attackAв†’Bв†’Cв†’Dв†’reach)
   * Р·Р° ~0.3вЂ“0.7 СЃ, РїРѕСЌС‚РѕРјСѓ РѕРЅР° С€Р»Р° В«СЃС‚СѓРїРµРЅСЊРєР°РјРёВ»: СЃРїСЂР°Р№С‚ РјРіРЅРѕРІРµРЅРЅРѕ РјРµРЅСЏР»СЃСЏ
   * СЃ РѕРґРЅРѕРіРѕ РЅР° РґСЂСѓРіРѕР№, Рё РІРјРµСЃС‚Рѕ Р·Р°РјР°С…Р° СЃ СѓРґР°СЂРѕРј РїРѕР»СѓС‡Р°Р»Р°СЃСЊ СЃРµСЂРёСЏ
   * РґС‘СЂРіР°РЅРёР№. РћСЃРѕР±РµРЅРЅРѕ СЌС‚Рѕ РІРёРґРЅРѕ РЅР° Р±С‹СЃС‚СЂС‹С… Р°С‚Р°РєР°С… (fangs, dagger) вЂ” С‚Р°Рј
   * РјРµР¶РґСѓ РєР°РґСЂР°РјРё РїСЂРѕС…РѕРґРёС‚ 2вЂ“3 РєР°РґСЂС‹ СЂРµРЅРґРµСЂР°, С‚Рѕ РµСЃС‚СЊ РїРѕР»РѕРІРёРЅСѓ РІСЂРµРјРµРЅРё
   * Р°С‚Р°РєРё РёРіСЂРѕРє РІРёРґРµР» РѕРґРЅСѓ Рё С‚Сѓ Р¶Рµ РїРѕР·Сѓ, Р° РїРѕС‚РѕРј вЂ” СЂРµР·РєРёР№ СЃРєР°С‡РѕРє.
   *
   * Р—РґРµСЃСЊ РІРѕР·РІСЂР°С‰Р°РµС‚СЃСЏ РўР•РљРЈР©РР™ РєР°РґСЂ, РЎР›Р•Р”РЈР®Р©РР™ Рё РґРѕР»СЏ РїРµСЂРµС…РѕРґР° `blend`.
   * Р РёСЃРѕРІР°Р»СЊС‰РёРє РєР»Р°РґС‘С‚ СЃР»РµРґСѓСЋС‰РёР№ РєР°РґСЂ РїРѕРІРµСЂС… С‚РµРєСѓС‰РµРіРѕ СЃ РїСЂРѕР·СЂР°С‡РЅРѕСЃС‚СЊСЋ
   * `blend` вЂ” РїРѕР»СѓС‡Р°РµС‚СЃСЏ В«СЂР°Р·РјС‹С‚РёРµ РґРІРёР¶РµРЅРёСЏВ»: СѓРґР°СЂ С‡РёС‚Р°РµС‚СЃСЏ РєР°Рє
   * РЅРµРїСЂРµСЂС‹РІРЅС‹Р№ РІР·РјР°С…, Р° РЅРµ РєР°Рє РїРµСЂРµРєР»СЋС‡РµРЅРёРµ РєР°СЂС‚РёРЅРєРё. РџРѕР·С‹ Рё С‚Р°Р№РјРёРЅРіРё
   * РїСЂРё СЌС‚РѕРј РќР• РјРµРЅСЏСЋС‚СЃСЏ вЂ” С‚РѕР»СЊРєРѕ РґРѕР±Р°РІР»СЏРµС‚СЃСЏ РїСЂРѕРјРµР¶СѓС‚РѕС‡РЅР°СЏ РѕРїСЂР°РІР°.
   */
  private attackFramePair(e: Enemy): { cur: ArtVariant; next: ArtVariant; blend: number } | null {
    if (!(e.attackAnim > 0 && e.attackCooldown > 0)) return null;
    const kind = this.enemySignature(e);
    const t = Math.max(0, Math.min(1, 1 - e.attackAnim / signatureDuration(kind)));
    const ph = signaturePhase(kind, t);
    // РџРѕСЂСЏРґРѕРє РєР°РґСЂРѕРІ Р°С‚Р°РєРё = С‚РѕС‚ Р¶Рµ, С‡С‚Рѕ Сѓ pickFrame, РЅРѕ СЏРІРЅС‹Рј СЃРїРёСЃРєРѕРј.
    const seq: ArtVariant[] = ['attackA', 'attackB', 'attackC', 'attackD', 'reach'];
    // РЎРјРµС‰РµРЅРёРµ РІРЅСѓС‚СЂРё СЃРµРіРјРµРЅС‚Р°: РіРґРµ РёРјРµРЅРЅРѕ РјС‹ РјРµР¶РґСѓ РґРІСѓРјСЏ РєР°РґСЂР°РјРё.
    let idx: number, frac: number;
    if (ph.phase === 'windup') {
      const w = Math.max(0.001, ph.k / 0.55);
      idx = w >= 1 ? 1 : 0;
      frac = Math.min(0.999, w);
    } else if (ph.phase === 'strike') {
      idx = 2;
      frac = Math.min(0.999, ph.k);
    } else {
      const w = Math.min(0.999, ph.k / 0.5);
      idx = w < 1 ? 3 : 4;
      frac = w;
    }
    const cur = seq[idx];
    const next = seq[Math.min(seq.length - 1, idx + 1)];
    return { cur, next, blend: frac };
  }

  private pickFrame(e: Enemy): ArtVariant {
    const ap = this.attackFramePair(e);
    if (ap) return ap.cur;
    if (e.isMoving) {
      const shape: EnemyShape = e.def.shape || 'blob';
      const gait = gaitForShape(shape, e.def.gait || 'walk');
      // Р¤Р°Р·Р° 0..1 СЃ СѓС‡С‘С‚РѕРј РёРЅРґРёРІРёРґСѓР°Р»СЊРЅРѕР№ СЃРєРѕСЂРѕСЃС‚Рё С†РёРєР»Р° РїРѕС…РѕРґРєРё (С‚РѕС‚ Р¶Рµ РјРЅРѕР¶РёС‚РµР»СЊ, С‡С‚Рѕ РІ renderEnemy).
      const p = (e.walkAnim * gaitPhaseRateFor(gait, !!e.isBoss)) / (Math.PI * 2);
      const phase = ((p % 1) + 1) % 1;
      const frames = GAIT_FRAMES[gait] || GAIT_FRAMES.walk;
      // РљР°РґСЂ Р±РµСЂС‘Рј Р‘Р›РР–РђР™РЁРР™ Рє С‚РµРєСѓС‰РµР№ С„Р°Р·Рµ (round), Р° РЅРµ В«РЅР°С‡Р°Р»Рѕ С€Р°РіР°В» (floor).
      // РџСЂРё identity-РїРѕРґСЃС‚Р°РЅРѕРІРєР°С… (hop/glide) РєР°РґСЂ РЅРµСЃС‘С‚ С„Р°Р·Сѓ РёРЅРґРµРєСЃ/8, Рё СЃ floor
      // СЃРїСЂР°Р№С‚ РѕС‚СЃС‚Р°РІР°Р» РѕС‚ С‚РµР»Р° РЅР° РїРѕР»С€Р°РіР° вЂ” РґРѕ 45В° С†РёРєР»Р°: С‚РµР»Рѕ СѓР¶Рµ РїСЂРёР·РµРјР»СЏР»РѕСЃСЊ,
      // Р° РєР°РґСЂ РµС‰С‘ РїРѕРєР°Р·С‹РІР°Р» РїРѕР»С‘С‚. РћРєСЂСѓРіР»РµРЅРёРµ СЃСЂРµР·Р°РµС‚ СЂР°СЃС…РѕР¶РґРµРЅРёРµ РІРґРІРѕРµ.
      const idx = Math.round(phase * frames.length) % frames.length;
      return frames[idx];
    }
    // РџРѕРєРѕР№: Р»С‘РіРєРѕРµ В«РґС‹С…Р°РЅРёРµВ» (РјРµРґР»РµРЅРЅР°СЏ СЃРјРµРЅР° РґРІСѓС… РєР°РґСЂРѕРІ, Сѓ РєР°Р¶РґРѕРіРѕ СЃРІРѕР№ СЃРґРІРёРі С„Р°Р·С‹)
    return Math.sin(performance.now() / 700 + e.x * 0.05) > 0 ? 'idle' : 'breath';
  }

  /**
   * Р‘С‹СЃС‚СЂР°СЏ РѕС‚СЂРёСЃРѕРІРєР° РѕРґРЅРёРј drawImage (СЃРїСЂР°Р№С‚ РєСЌС€РёСЂСѓРµС‚СЃСЏ РѕРґРёРЅ СЂР°Р·, РЅРµ РїРµСЂРµСЂРёСЃРѕРІС‹РІР°РµС‚СЃСЏ РєР°Р¶РґС‹Р№ РєР°РґСЂ).
   */
  drawPixelMonster(ctx: CanvasRenderingContext2D, e: Enemy, r: number, hit: boolean, now: number) {
    const shape: EnemyShape = e.def.shape || 'blob';
    // Р’РђР–РќРћ: traits РѕР±СЏР·Р°С‚РµР»РµРЅ Р·РґРµСЃСЊ. Р‘РµР· РЅРµРіРѕ buildMonsterArt РЅРµ СЂРёСЃСѓРµС‚
    // СЂРѕРіР°/С€РёРїС‹/С…РІРѕСЃС‚, Рё РІСЃРµ РјРѕРЅСЃС‚СЂС‹ РІС‹РіР»СЏРґСЏС‚ РєР°Рє РѕРґРёРЅ Рё С‚РѕС‚ Р¶Рµ С€Р°Р±Р»РѕРЅ.
    // attack вЂ” С‡С‚РѕР±С‹ РїРѕР·Р° СѓРґР°СЂР° Р±С‹Р»Р° Р°РЅР°С‚РѕРјРёС‡РµСЃРєРѕР№ (СЃРїР»СЋС‰РёРІР°РЅРёРµ/РїСЂС‹Р¶РѕРє/СЃРІРµСЂС…Сѓ).
    const meta: MonsterArtMeta = {
      nameRu: e.def.name.ru,
      nameEn: e.def.name.en,
      element: e.def.element,
      traits: e.def.traits,
      gait: gaitForShape(shape, e.def.gait || 'walk'),
      attack: this.enemySignature(e),
      // Р›РёС‡РЅРѕРµ РѕСЂСѓР¶РёРµ Рё СЂРµРіР°Р»РёРё Р±РѕСЃСЃР°: СЃРїСЂР°Р№С‚, СѓРґР°СЂ Рё РїРѕРґРїРёСЃСЊ вЂ” РёР· РѕРґРЅРѕРіРѕ def.
      weapon: e.def.weapon,
      regalia: e.def.regalia,
    };
    const variant = this.pickFrame(e);
    // РЎРіР»Р°Р¶РёРІР°РЅРёРµ РїСЂРё РјР°СЃС€С‚Р°Р±РёСЂРѕРІР°РЅРёРё. РЎРїСЂР°Р№С‚ СЂРµРЅРґРµСЂРёС‚СЃСЏ РІ 256Г—256, РЅР° СЌРєСЂР°РЅРµ
    // РѕР±С‹С‡РЅС‹Р№ РІСЂР°Рі 20вЂ“40 px, Р±РѕСЃСЃ 140вЂ“200 px: nearest РїСЂРё С‚Р°РєРѕРј СѓРјРµРЅСЊС€РµРЅРёРё
    // В«СЂРІС‘С‚В» РєРѕРЅС‚СѓСЂ (С‚РµСЂСЏРµС‚СЃСЏ ~95% РїРёРєСЃРµР»РµР№, РєСЂР°СЏ РґСЂРѕР¶Р°С‚ РїСЂРё РґРІРёР¶РµРЅРёРё).
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    // PNG-СЃРїСЂР°Р№С‚ (РµСЃР»Рё РїРѕР»РѕР¶РёС‚СЊ С„Р°Р№Р» РІ public/monsters/<id>.png) вЂ” РёРЅР°С‡Рµ РїСЂРѕС†РµРґСѓСЂРЅС‹Р№ Р°СЂС‚
    const png = monsterSprites.get(e.def.id, !!e.isBoss, variant);
    if (png) {
      const src = hit ? (monsterSprites.white(e.def.id, !!e.isBoss, variant) || png) : png;
      ctx.drawImage(src, -r, -r, r * 2, r * 2);
      ctx.imageSmoothingEnabled = false;
      return;
    }
    const sprite = this.getMonsterSprite(e.def.id, shape, !!e.isBoss, e.def.color || '#ffffff', meta, variant);
    const bmp = hit
      ? (sprite.white || (sprite.white = this.whiteFlash(sprite.normal, sprite.n)))
      : sprite.normal;
    // РЁРёСЂРёРЅР° РїСЂСЏРјРѕСѓРіРѕР»СЊРЅРёРєР° РІС‹РІРѕРґР° РїСЂРѕРїРѕСЂС†РёРѕРЅР°Р»СЊРЅР° С…РѕР»СЃС‚Сѓ СЃРїСЂР°Р№С‚Р°: Сѓ СЃРїСЂР°Р№С‚РѕРІ
    // СЃ РґР»РёРЅРЅС‹Рј РѕСЂСѓР¶РёРµРј С…РѕР»СЃС‚ Р±РѕР»СЊС€Рµ (384 РїСЂРѕС‚РёРІ 256), РїРѕСЌС‚РѕРјСѓ Рё РїСЂСЏРјРѕСѓРіРѕР»СЊРЅРёРє
    // РІ 1.5 СЂР°Р·Р° Р±РѕР»СЊС€Рµ вЂ” РјР°СЃС€С‚Р°Р± РїРёРєСЃРµР»СЏ С‚РѕС‚ Р¶Рµ, С‚РµР»Рѕ С‚РѕРіРѕ Р¶Рµ СЂР°Р·РјРµСЂР°, Р°
    // РѕСЂСѓР¶РёРµ С†РµР»РёРєРѕРј РїРѕРїР°РґР°РµС‚ РЅР° СЌРєСЂР°РЅ (СЂР°РЅСЊС€Рµ РѕРЅРѕ РѕР±СЂРµР·Р°Р»РѕСЃСЊ РєСЂР°РµРј С…РѕР»СЃС‚Р°).
    const dSize = r * 2 * (sprite.n / ART_N);
    ctx.drawImage(bmp, -r, -r, dSize, dSize);

    // === РЎРњР•РЁРР’РђРќРР• РљРђР”Р РћР’ РђРўРђРљР (РїР»Р°РІРЅРѕСЃС‚СЊ) ===
    // РџРѕРІРµСЂС… С‚РµРєСѓС‰РµРіРѕ РєР°РґСЂР° РєР»Р°РґС‘Рј РЎР›Р•Р”РЈР®Р©РР™ РєР°РґСЂ СЃ РїСЂРѕР·СЂР°С‡РЅРѕСЃС‚СЊСЋ РїРѕ
    // РїСЂРѕРіСЂРµСЃСЃСѓ РїРµСЂРµС…РѕРґР°. Р‘РµР· СЌС‚РѕРіРѕ Р°С‚Р°РєР° РёРґС‘С‚ СЂС‹РІРєР°РјРё: 4вЂ“5 Р·Р°РїРµС‡С‘РЅРЅС‹С… РїРѕР·
    // РЅР° 0.3вЂ“0.7 СЃ, Рё РјРµР¶РґСѓ РЅРёРјРё СЃРїСЂР°Р№С‚ РїСЂРѕСЃС‚Рѕ С‰С‘Р»РєР°Р». РЎРјРµС€РёРІР°РЅРёРµ РґР°С‘С‚
    // В«СЂР°Р·РјС‹С‚РёРµ РґРІРёР¶РµРЅРёСЏВ» вЂ” Р·Р°РјР°С… Рё СѓРґР°СЂ С‡РёС‚Р°СЋС‚СЃСЏ РєР°Рє РѕРґРЅРѕ РЅРµРїСЂРµСЂС‹РІРЅРѕРµ
    // РґРІРёР¶РµРЅРёРµ. Р Р°Р±РѕС‚Р°РµС‚ Рё РґР»СЏ PNG-СЃРїСЂР°Р№С‚РѕРІ, Рё РґР»СЏ РїСЂРѕС†РµРґСѓСЂРЅРѕР№ РіСЂР°С„РёРєРё.
    const ap = this.attackFramePair(e);
    if (ap && ap.blend > 0.08) {
      const nextSprite = this.getMonsterSprite(
        e.def.id, shape, !!e.isBoss, e.def.color || '#ffffff', meta, ap.next,
      );
      const nb = hit
        ? (nextSprite.white || (nextSprite.white = this.whiteFlash(nextSprite.normal, nextSprite.n)))
        : nextSprite.normal;
      // РџСЂРѕР·СЂР°С‡РЅРѕСЃС‚СЊ РѕРіСЂР°РЅРёС‡РµРЅР° 0.5: РїСЂРё Р±РѕР»СЊС€РµРј Р·РЅР°С‡РµРЅРёРё В«РїСЂРёР·СЂР°РєВ» СЃР»РµРґСѓСЋС‰РµР№
      // РїРѕР·С‹ РїРµСЂРµРєСЂС‹РІР°РµС‚ С‚РµРєСѓС‰СѓСЋ Рё СЃРЅРѕРІР° РІС‹РіР»СЏРґРёС‚ РєР°Рє СЃРєР°С‡РѕРє, С‚РѕР»СЊРєРѕ СЂР°Р·РјС‹С‚С‹Р№.
      const a = Math.min(0.5, ap.blend * 0.5);
      ctx.globalAlpha = a;
      const nSize = r * 2 * (nextSprite.n / ART_N);
      ctx.drawImage(nb, -r, -r, nSize, nSize);
      ctx.globalAlpha = 1;
    }
    // РћСЃС‚Р°Р»СЊРЅС‹Рµ СЃРёСЃС‚РµРјС‹ (СЃРЅР°СЂСЏРґС‹, С‡Р°СЃС‚РёС†С‹, Р±РµР№РґР¶Рё) СЂРёСЃСѓСЋС‚СЃСЏ РІ РїРёРєСЃРµР»СЊ-СЂРµР¶РёРјРµ.
    ctx.imageSmoothingEnabled = false;
    // Р’РђР–РќРћ: Р·РґРµСЃСЊ Р‘РћР›Р¬РЁР• РќР•Рў Р±РµР»РѕРіРѕ РєРІР°РґСЂР°С‚РёРєР° В«Р±Р»РёРєР° РіР»Р°Р·Р°В». РћРЅ СЂРёСЃРѕРІР°Р»СЃСЏ РїРѕ
    // С„РёРєСЃРёСЂРѕРІР°РЅРЅРѕР№ РґРѕР»Рµ СЃРїСЂР°Р№С‚Р° (42 % С€РёСЂРёРЅС‹, 20 % РІС‹СЃРѕС‚С‹) Рё Сѓ Р±РѕСЃСЃР° РїРѕРїР°РґР°Р»
    // РЅРµ РІ РіР»Р°Р·, Р° РІ РіСЂСѓРґСЊ вЂ” С‚Рѕ РµСЃС‚СЊ РІС‹РіР»СЏРґРµР» РєР°Рє СЃР»СѓС‡Р°Р№РЅС‹Р№ Р±РµР»С‹Р№ С€С‚СЂРёС… РїРѕРІРµСЂС…
    // РґРѕСЃРїРµС…Р°. Р‘Р»РёРє РіР»Р°Р·Р° СѓР¶Рµ Р·Р°РїРµС‡С‘РЅ РІ СЃРїСЂР°Р№С‚ (СЃР»РѕР№ 9 + СЃРІРµС‡РµРЅРёРµ РІ polishArt).
  }

  /**
   * РўР•Р›Р•Р“Р РђР¤Р« РР”РЈР©РРҐ РђРўРђРљ. Р­С‚Рѕ С‚Рѕ, С‡С‚Рѕ РїСЂРµРІСЂР°С‰Р°РµС‚ В«РІРЅРµР·Р°РїРЅС‹Р№ СѓСЂРѕРЅВ» РІ
   * В«СѓРґР°СЂ, РєРѕС‚РѕСЂС‹Р№ РјРѕР¶РЅРѕ СѓРІРёРґРµС‚СЊ Рё РїРµСЂРµР¶РґР°С‚СЊВ». Р РёСЃСѓРµС‚СЃСЏ РњР•Р–Р”РЈ РІСЂР°РіР°РјРё Рё
   * СЃРЅР°СЂСЏРґР°РјРё, РІ РјРёСЂРѕРІС‹С… РєРѕРѕСЂРґРёРЅР°С‚Р°С…, Рё РІСЃРµРіРґР° В«РїРѕРґВ» Р±РѕСЃСЃРѕРј РїРѕ
   * РЅР°СЃС‹С‰РµРЅРЅРѕСЃС‚Рё, РЅРѕ В«РїРѕРІРµСЂС…В» РїРѕР»Р° вЂ” РёРЅР°С‡Рµ РєСЂСѓРі РїР°РґРµРЅРёСЏ РЅРµ С‡РёС‚Р°Р»СЃСЏ Р±С‹.
   *
   * Р§С‚Рѕ СЂРёСЃСѓРµС‚СЃСЏ РїРѕ С„РѕСЂРјРµ Р°С‚Р°РєРё:
   *   fan        вЂ” СЃРµРєС‚РѕСЂ/РІРµРµСЂ РёР· Р±РѕСЃСЃР° РІ СЃС‚РѕСЂРѕРЅСѓ РёРіСЂРѕРєР° (С‚РѕРЅРєР°СЏ Р»РёРЅРёСЏ);
   *   ring       вЂ” РєРѕР»СЊС†Рѕ СЃ Р·Р°РјРµС‚РЅС‹Рј РџР РћРџРЈРЎРљРћРњ (Р±РµР·РѕРїР°СЃРЅС‹Р№ РєР°СЂРјР°РЅ);
   *   rain/mines вЂ” РєСЂСѓРіРё РїР°РґРµРЅРёСЏ РЅР° Р·РµРјР»Рµ, СЃСѓР¶Р°СЋС‰РёРµСЃСЏ Рє СѓРґР°СЂСѓ;
   *   groundLine вЂ” РїРѕР»РѕСЃР°/СЃРµРєС‚РѕСЂ Р·РµРјР»Рё, Р·Р°Р»РёРІР°СЋС‰РёР№СЃСЏ Рє СѓРґР°СЂСѓ;
   *   lunge      вЂ” СЂС‹РІРѕРє Р±РѕСЃСЃР°: Р»РёРЅРёСЏ РїСѓС‚Рё + РєСЂСѓРі РІ С‚РѕС‡РєРµ РїСЂРёР±С‹С‚РёСЏ.
   */
  drawCastTelegraphs(now: number) {
    const ctx = this.ctx;
    for (const c of this.casts) {
      if (c.phase === 'recover') continue;
      const e = this.enemies.find(x => x.id === c.bossId);
      if (!e || e.isDying) continue;
      const a = c.attack;
      const el = elementColor(e.def.element, e.def.color || '#ffffff');
      // РїСЂРѕРіСЂРµСЃСЃ 0..1: 0 вЂ” С‚РѕР»СЊРєРѕ РЅР°С‡Р°Р»СЃСЏ, 1 вЂ” СѓРґР°СЂ РІРѕС‚-РІРѕС‚.
      const k = c.phase === 'active' ? 1 : 1 - Math.max(0, c.t) / Math.max(0.001, a.telegraph);
      const pulse = 0.35 + 0.65 * k;
      ctx.save();
      ctx.strokeStyle = withAlpha(el, 0.30 + 0.45 * pulse);
      ctx.lineWidth = 2;

      if (a.form === 'fan') {
        // РЎРµРєС‚РѕСЂ РїСЂРёС†РµР»Р°: РґРІРµ РіСЂР°РЅРёС†С‹ + РїСѓРЅРєС‚РёСЂРЅР°СЏ РѕСЃСЊ.
        const spread = a.count > 1 ? Math.min(1.4, 0.32 * a.count) : 0.25;
        ctx.beginPath();
        ctx.moveTo(e.x, e.y);
        ctx.arc(e.x, e.y, a.radius * 0.9, c.aim - spread * 0.5, c.aim + spread * 0.5);
        ctx.closePath();
        ctx.fillStyle = withAlpha(el, 0.10 + 0.16 * pulse);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(e.x, e.y);
        ctx.lineTo(e.x + Math.cos(c.aim) * a.radius * 0.9, e.y + Math.sin(c.aim) * a.radius * 0.9);
        ctx.stroke();
      } else if (a.form === 'ring') {
        // РљРѕР»СЊС†Рѕ: СЂРёСЃСѓРµРј РґСѓРіРё РўРћР›Р¬РљРћ С‚Р°Рј, РіРґРµ СЂРµР°Р»СЊРЅРѕ РїРѕР»РµС‚СЏС‚ СЃРЅР°СЂСЏРґС‹
        // (СЃ РІС‹СЂРµР·РѕРј В«РєР°СЂРјР°РЅР°В») вЂ” РёРіСЂРѕРє СЃСЂР°Р·Сѓ РІРёРґРёС‚ Р±РµР·РѕРїР°СЃРЅС‹Р№ СЃРµРєС‚РѕСЂ.
        const angs = ringAngles(c.aim, a.count, Math.PI / 4.5, c.roll);
        ctx.fillStyle = withAlpha(el, 0.10 + 0.14 * pulse);
        for (const ang of angs) {
          ctx.beginPath();
          ctx.arc(e.x, e.y, a.radius * 0.5, ang - 0.1, ang + 0.1);
          ctx.lineTo(e.x + Math.cos(ang) * a.radius, e.y + Math.sin(ang) * a.radius);
          ctx.closePath();
          ctx.fill();
        }
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(e.x, e.y, a.radius * 0.5, 0, Math.PI * 2);
        ctx.strokeStyle = withAlpha(el, 0.25);
        ctx.stroke();
      } else if (a.form === 'rain' || a.form === 'mines') {
        // РљСЂСѓРіРё РїР°РґРµРЅРёСЏ: Р·Р°РїРѕР»РЅСЏСЋС‚СЃСЏ Рё РЎРЈР–РђР®РўРЎРЇ Рє РјРѕРјРµРЅС‚Сѓ СѓРґР°СЂР°.
        for (const m of c.marks) {
          const rr = a.radius * (0.45 + 0.55 * k);
          ctx.beginPath();
          ctx.ellipse(m.x, m.y, rr, rr * 0.42, 0, 0, Math.PI * 2);
          ctx.fillStyle = withAlpha(el, 0.14 + 0.20 * pulse);
          ctx.fill();
          ctx.lineWidth = 1.5 + 2 * k;
          ctx.strokeStyle = withAlpha(el, 0.45 + 0.4 * pulse);
          ctx.beginPath();
          ctx.ellipse(m.x, m.y, rr, rr * 0.42, 0, 0, Math.PI * 2);
          ctx.stroke();
          // РєСЂРµСЃС‚-РїСЂРёС†РµР» РІ С†РµРЅС‚СЂРµ
          ctx.beginPath();
          ctx.moveTo(m.x - rr * 0.4, m.y); ctx.lineTo(m.x + rr * 0.4, m.y);
          ctx.moveTo(m.x, m.y - rr * 0.2); ctx.lineTo(m.x, m.y + rr * 0.2);
          ctx.stroke();
        }
      } else if (a.form === 'groundLine') {
        // РџРѕР»РѕСЃР° Р·РµРјР»Рё РѕС‚ Р±РѕСЃСЃР° Рє РёРіСЂРѕРєСѓ, Р·Р°Р»РёРІР°СЋС‰Р°СЏСЃСЏ Рє СѓРґР°СЂСѓ.
        const cos = Math.cos(c.aim), sin = Math.sin(c.aim);
        const L = a.radius;
        ctx.beginPath();
        ctx.moveTo(e.x, e.y);
        ctx.lineTo(e.x + cos * L - sin * L * 0.35, e.y + sin * L + cos * L * 0.35);
        ctx.lineTo(e.x + cos * L + sin * L * 0.35, e.y + sin * L - cos * L * 0.35);
        ctx.closePath();
        ctx.fillStyle = withAlpha(el, 0.12 + 0.20 * pulse);
        ctx.fill();
        ctx.strokeStyle = withAlpha(el, 0.4 + 0.4 * pulse);
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (a.form === 'lunge') {
        // Р С‹РІРѕРє: Р»РёРЅРёСЏ РїСѓС‚Рё Рё РєСЂСѓРі РІ С‚РѕС‡РєРµ РїСЂРёР±С‹С‚РёСЏ.
        const dx = this.player.x - e.x, dy = this.player.y - e.y;
        const d = Math.hypot(dx, dy) || 1;
        const step = Math.min(d, 320);
        const tx = e.x + (dx / d) * step, ty = e.y + (dy / d) * step;
        ctx.beginPath();
        ctx.moveTo(e.x, e.y);
        ctx.lineTo(tx, ty);
        ctx.lineWidth = 3;
        ctx.strokeStyle = withAlpha(el, 0.35 + 0.4 * pulse);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(tx, ty, e.def.radius * 1.4 * (0.5 + 0.5 * k), 0, Math.PI * 2);
        ctx.fillStyle = withAlpha(el, 0.14 + 0.2 * pulse);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  /**
   * РџР•Р§РђРўР¬ Р‘РћРЎРЎРђ РЅР° Р·РµРјР»Рµ. РџСЂРµР¶РґРµ РІРѕРєСЂСѓРі Р±РѕСЃСЃР° РєСЂСѓС‚РёР»РѕСЃСЊ РєРѕР»СЊС†Рѕ РёР· РІРѕСЃСЊРјРё
   * С‚РѕС‡РµРє-В«СЂСѓРЅВ» РџРћР’Р•Р РҐ С„РёРіСѓСЂС‹ вЂ” РЅР° СЌРєСЂР°РЅРµ СЌС‚Рѕ С‡РёС‚Р°Р»РѕСЃСЊ РєР°Рє СЂСЏР±СЊ Рё СЃС‚СЂР°РЅРЅС‹Рµ
   * РїРѕР»РѕСЃС‹, РїРѕР»Р·Р°СЋС‰РёРµ РїРѕ РґРѕСЃРїРµС…Сѓ. РўРµРїРµСЂСЊ СЌС‚Рѕ Р°РєРєСѓСЂР°С‚РЅС‹Р№ РјР°РіРёС‡РµСЃРєРёР№ РєСЂСѓРі РџРћР”
   * Р±РѕСЃСЃРѕРј: РјСЏРіРєРѕРµ СЃРІРµС‡РµРЅРёРµ РІ С†РІРµС‚ СЃС‚РёС…РёРё, РґРІР° С‚РѕРЅРєРёС… РєРѕР»СЊС†Р° СЃРѕ РјРµРґР»РµРЅРЅРѕ
   * РІСЂР°С‰Р°СЋС‰РёРјСЃСЏ СЂР°Р·СЂС‹РІРѕРј Рё С‡РµС‚С‹СЂРµ СЂСѓРЅРЅС‹С… РґСѓРіРё РїРѕ РєСЂР°СЋ.
   */
  drawBossSigil(e: Enemy, r: number, now: number, hit: boolean) {
    const ctx = this.ctx;
    const el = elementColor(e.def.element, e.def.color || '#ffffff');
    const R = r * 1.55 * (1 + Math.sin(now * 1.4) * 0.02);
    ctx.save();
    ctx.translate(e.x, e.y + r * 0.92);
    // РћСЃРЅРѕРІР°РЅРёРµ РїРµС‡Р°С‚Рё: СЂР°РґРёР°Р»СЊРЅС‹Р№ РіСЂР°РґРёРµРЅС‚, СЃР¶Р°С‚С‹Р№ РїРѕ РІРµСЂС‚РёРєР°Р»Рё РІ СЌР»Р»РёРїСЃ вЂ”
    // РєСЂР°СЏ РіР°СЃРЅСѓС‚ РІ РЅРѕР»СЊ, РїРѕСЌС‚РѕРјСѓ В«РѕР±СЂСѓР±Р»РµРЅРЅС‹С…В» РіСЂР°РЅРёС† РЅРµ РІРёРґРЅРѕ.
    ctx.save();
    ctx.scale(1, 0.34);
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
    grad.addColorStop(0, withAlpha(el, 0.30));
    grad.addColorStop(0.7, withAlpha(el, 0.12));
    grad.addColorStop(1, withAlpha(el, 0));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.fill();
    // Р”РІР° РєРѕР»СЊС†Р° РїРµС‡Р°С‚Рё: РІСЂР°С‰Р°СЋС‚СЃСЏ РІ СЂР°Р·РЅС‹Рµ СЃС‚РѕСЂРѕРЅС‹ (Сѓ РєР°Р¶РґРѕРіРѕ Р±РѕСЃСЃР° СЃРІРѕСЏ С„Р°Р·Р°).
    ctx.lineWidth = 3;
    ctx.strokeStyle = withAlpha(hit ? '#ffffff' : el, 0.5);
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.74, now * 0.5, now * 0.5 + 4.7);
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.strokeStyle = withAlpha(el, 0.32);
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.5, -now * 0.7, -now * 0.7 + 3.5);
    ctx.stroke();
    ctx.restore();
    // Р СѓРЅРЅС‹Рµ РґСѓРіРё РїРѕ РєСЂР°СЋ: С‡РµС‚С‹СЂРµ СЃРµРіРјРµРЅС‚Р°, РјРµСЂС†Р°СЋС‚ РєР°Р¶РґС‹Р№ РІ СЃРІРѕРµР№ С„Р°Р·Рµ.
    for (let i = 0; i < 4; i++) {
      const a = -now * 0.45 + (i / 4) * Math.PI * 2;
      ctx.lineWidth = 3;
      ctx.strokeStyle = withAlpha(hit ? '#ffffff' : el, 0.24 + 0.20 * Math.sin(now * 2 + i * 1.7));
      ctx.beginPath();
      ctx.ellipse(0, 0, R * 0.92, R * 0.31, 0, a, a + 0.36);
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * РђРЈР Рђ РЎРўРРҐРР Р’ РњРР РћР’Р«РҐ РљРћРћР Р”РРќРђРўРђРҐ. РЎС‚РёР»СЊ (EnemyDef.aura, 0..3) Р·Р°РґР°С‘С‚
   * С…Р°СЂР°РєС‚РµСЂ РґРІРёР¶РµРЅРёСЏ, РїРѕСЌС‚РѕРјСѓ Сѓ РєР°Р¶РґРѕРіРѕ Р±РѕСЃСЃР° СЃРІРѕСЏ В«РјР°РЅРµСЂР°В»:
   *   0 вЂ” РёСЃРєСЂС‹ РІРІРµСЂС… (РѕРіРѕРЅСЊ), 1 вЂ” РјРѕСЂРѕР·РЅС‹Р№ С‚СѓРјР°РЅ, 2 вЂ” С‚Р»РµСЋС‰РёРµ СѓРіР»Рё РїРѕ РєСЂСѓРіСѓ,
   *   3 вЂ” С‚С‘РјРЅС‹Рµ Р¶РіСѓС‚С‹, С‚СЏРЅСѓС‰РёРµСЃСЏ РІРѕРєСЂСѓРі С„РёРіСѓСЂС‹.
   * РљР°Р¶РґРѕРµ РїСЏС‚РЅРѕ вЂ” РґРІСѓС…СЃР»РѕР№РЅРѕРµ СЃРІРµС‡РµРЅРёРµ (С€РёСЂРѕРєРёР№ СЃР»Р°Р±С‹Р№ РѕСЂРµРѕР» + СЏСЂРєРѕРµ СЏРґСЂРѕ):
   * РЅРё РєРІР°РґСЂР°С‚РѕРІ, РЅРё С€С‚СЂРёС…РѕРІ, РЅРёС‡РµРіРѕ, С‡С‚Рѕ С‡РёС‚Р°Р»РѕСЃСЊ Р±С‹ РєР°Рє В«РїРѕР»РѕСЃР°В».
   */
  drawElementAura(e: Enemy, r: number, now: number, alpha: number, hit: boolean) {
    const el = e.def.element;
    if (!el || e.isDying) return;
    const ctx = this.ctx;
    const base = elementColor(el, e.def.color || '#ffffff');
    const style = e.isBoss ? (e.def.aura ?? 0) : 0;
    const count = e.isBoss ? 6 : 3;
    const spread = e.isBoss ? 1.5 : 1.15;
    ctx.save();
    ctx.globalAlpha = alpha;
    for (let i = 0; i < count; i++) {
      const phase = i * 1.7 + (e.x + e.y) * 0.01;
      const t = ((now * (0.35 + style * 0.06) + i / count) % 1 + 1) % 1;
      const ang = phase + now * 0.25 + (i / count) * Math.PI * 2;
      let px = e.x + Math.cos(ang) * r * spread;
      let py = e.y + Math.sin(ang) * r * spread * 0.5;
      let rad = r * 0.12;
      let a = 0.35;
      if (style === 0) {          // РёСЃРєСЂС‹ РІРІРµСЂС…
        py = e.y + r * 0.8 - t * r * 1.5;
        px = e.x + Math.sin(ang) * r * 0.7;
        rad = r * 0.03 + r * 0.08 * (1 - t);
        a = 0.5 * (1 - t);
      } else if (style === 1) {   // РјРѕСЂРѕР·РЅС‹Р№ С‚СѓРјР°РЅ: РІСЃРїР»С‹РІР°РµС‚ Рё С‚Р°РµС‚
        py = e.y + r * 0.6 - t * r * 1.1;
        px = e.x + Math.sin(ang * 0.7) * r * 0.9;
        rad = r * (0.16 + t * 0.18);
        a = 0.22 * (1 - t);
      } else if (style === 2) {   // СѓРіР»Рё РїРѕ РєСЂСѓРіСѓ: С‚Р»РµСЋС‚ Рё РіР°СЃРЅСѓС‚
        rad = r * 0.1 * (1 - t * 0.5);
        a = 0.45 * (1 - t);
      } else {                    // С‚С‘РјРЅС‹Рµ Р¶РіСѓС‚С‹: С‚СЏРЅСѓС‚СЃСЏ РїРѕ РєСЂСѓРіСѓ
        rad = r * 0.13;
        a = 0.1 + 0.3 * (1 - t);
      }
      ctx.fillStyle = withAlpha(base, a * 0.35);
      ctx.beginPath();
      ctx.arc(px, py, rad * 2.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = withAlpha(hit ? '#ffffff' : base, a);
      ctx.beginPath();
      ctx.arc(px, py, rad, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  renderEnemy(e: Enemy) {
    const ctx = this.ctx;
    let alpha = 1;
    let scale = 1;

    if (e.spawnAnim > 0) {
      alpha = 1 - e.spawnAnim / 0.5;
      scale = 0.5 + alpha * 0.5;
    }

    if (e.isDying) {
      alpha = 1 - e.deathAnim / 0.8;
      scale = 1 + e.deathAnim * 0.3;
    }

    // Bosses render 2.5x larger
    if (e.isBoss) scale *= 2.5;

    ctx.globalAlpha = alpha;

    const r = e.def.radius;
    const now = performance.now() / 1000;
    const shape: EnemyShape = e.def.shape || 'blob';
    const hueShift = e.def.hueShift || 0;

    // === РџРћРҐРћР”РљРђ: СЃРІРѕСЏ Р°РЅР°С‚РѕРјРёСЏ РґРІРёР¶РµРЅРёСЏ РґР»СЏ РєР°Р¶РґРѕРіРѕ СЃРµРјРµР№СЃС‚РІР° ===
    // Р Р°РЅСЊС€Рµ Сѓ РІСЃРµС… Р±С‹Р» РѕРґРёРЅ Рё С‚РѕС‚ Р¶Рµ В«РјР°СЏС‚РЅРёРєВ»: Math.sin(walkAnim).
    // РўРµРїРµСЂСЊ РїРѕР·Р° СЃС‡РёС‚Р°РµС‚СЃСЏ С„СѓРЅРєС†РёРµР№ gaitPose(gait) вЂ” СЃР»РёР·СЊ РїРµСЂРµС‚РµРєР°РµС‚, РїР°СѓРє
    // РїРµСЂРµРєР°С‚С‹РІР°РµС‚СЃСЏ, РіРѕР»РµРј С‚РѕРїРѕС‡РµС‚, Р»РµС‚СѓС‡РёРµ РїР°СЂСЏС‚, СЃРєРµР»РµС‚С‹ РєСЂР°РґСѓС‚СЃСЏ.
    const gait: GaitKind = gaitForShape(shape, e.def.gait || 'walk');
    const moving = e.isMoving && e.spawnAnim <= 0;
    // Р¤Р°Р·Р° С†РёРєР»Р°: walkAnim СЂР°СЃС‚С‘С‚ РІ СЂР°РґРёР°РЅР°С…. РњРЅРѕР¶РёС‚РµР»СЊ С‚РѕС‚ Р¶Рµ, С‡С‚Рѕ Рё РІ pickFrame(),
    // РёРЅР°С‡Рµ РєРѕСЂРїСѓСЃ Рё РєР°РґСЂ СЃРїСЂР°Р№С‚Р° С€Р»Рё Р±С‹ РІСЂР°Р·РЅРѕР±РѕР№ (СЌС‚Рѕ Рё Р±С‹Р»Рѕ РіР»Р°РІРЅРѕРµ В«РїР»Р°РІР°РЅРёРµВ» Р°РЅРёРјР°С†РёРё).
    const gaitP = ((e.walkAnim * gaitPhaseRateFor(gait, !!e.isBoss)) / (Math.PI * 2) % 1 + 1) % 1;
    const pose: GaitPose = moving ? gaitPose(gait, gaitP, true) : idleBreath(now, e.x * 0.07, !!e.isBoss);
    // === РџР Р«Р–РћРљ Р РњРђРҐ РљР Р«Р›Рђ: РўРђ Р–Р• РњРђРўР•РњРђРўРРљРђ, Р§РўРћ Р’ РЎРџР РђР™РўР• ===
    // Р Р°РЅСЊС€Рµ РґРІРёР¶РѕРє РїСЂС‹РіР°Р» СЃРІРѕРёРј СЃРёРЅСѓСЃРѕРј (bob = -sin), Р° СЃРїСЂР°Р№С‚ СЃР¶РёРјР°Р»СЃСЏ СЃРІРѕРёРј,
    // Рё РѕРЅРё СЂР°СЃС…РѕРґРёР»РёСЃСЊ РїРѕ С„Р°Р·Рµ: С‚РµР»Рѕ РѕС‚СЂС‹РІР°Р»РѕСЃСЊ РѕС‚ Р·РµРјР»Рё РЅРµ С‚РѕРіРґР°, РєРѕРіРґР° РєР°РґСЂ
    // РїРѕРєР°Р·С‹РІР°Р» С‚РѕР»С‡РѕРє. РўРµРїРµСЂСЊ РѕР±Р° Р±РµСЂСѓС‚ jumpArc/flapStroke РёР· dungeonIdentity вЂ”
    // РѕРґРЅР° РєСЂРёРІР°СЏ РЅР° РґРІРѕРёС…, РїРѕСЌС‚РѕРјСѓ РїСЂС‹Р¶РѕРє Рё РјР°С… С‡РёС‚Р°СЋС‚СЃСЏ С†РµР»СЊРЅРѕ.
    const hopping = moving && hopsInsteadOfWalking(shape, gait);
    const arc = hopping ? jumpArc(gaitP) : null;
    const woosh = moving && flapsWings(shape, gait) ? flapStroke(gaitP) : null;
    // 1) РџРѕРґСЃРєРѕРє/РѕРїСѓСЃРєР°РЅРёРµ РєРѕСЂРїСѓСЃР°.
    //    РџСЂС‹РіСѓРЅР°Рј вЂ” РїРѕ РїР°СЂР°Р±РѕР»Рµ jumpArc: РЅР° Р·Р°РјР°С…Рµ РєРѕСЂРїСѓСЃ РІРЅРёР·Сѓ, РІ РїРѕР»С‘С‚Рµ РІС‹СЃРѕРєРѕ.
    //    Р›РµС‚Р°СЋС‰РёРј вЂ” РѕС‚ Р РђР‘РћР§Р•Р“Рћ РіСЂРµР±РєР° (bodyBob): С‚РµР»Рѕ РїРѕРґР±СЂР°СЃС‹РІР°РµС‚ РїРѕРґ РјР°С…РѕРј
    //    РІРЅРёР·, Р° РЅРµ РІ РєСЂР°Р№РЅРёС… С‚РѕС‡РєР°С… РєСЂС‹Р»Р° (РёРЅР°С‡Рµ В«РІР·РјС‹РІР°Р» РІС…РѕР»РѕСЃС‚СѓСЋВ»).
    //    РћСЃС‚Р°Р»СЊРЅС‹Рј вЂ” РєР°Рє СЂР°РЅСЊС€Рµ, РёР· РїРѕС…РѕРґРєРё.
    const bob = arc ? -arc.airborne * r * 0.85
      : woosh ? woosh.bodyBob * r
      : pose.bob * r * MOTION.bob;
    // 2) Squash & stretch: СѓСЃРёР»РµРЅРЅРѕРµ РїСЂРёСЃРµРґР°РЅРёРµ, РїР»РѕС‰Р°РґСЊ РєРѕСЂРїСѓСЃР° СЃРѕС…СЂР°РЅСЏРµС‚СЃСЏ.
    //    РџСЂС‹РіСѓРЅР°Рј РєРѕСЌС„С„РёС†РёРµРЅС‚ РЅРёР¶Рµ (0.3): РѕСЃРЅРѕРІРЅСѓСЋ РґРµС„РѕСЂРјР°С†РёСЋ СѓР¶Рµ РґР°С‘С‚ СЃРїСЂР°Р№С‚
    //    (crouch РёР· С‚РѕРіРѕ Р¶Рµ jumpArc), РёРЅР°С‡Рµ С‚РІР°СЂСЊ СЂР°СЃРїР»СЋС‰РёРІР°Р»Р°СЃСЊ Р±С‹ РІРґРІРѕРµ.
    const sy = arc ? 1 + (arc.squash - 1) * 0.3
      : 1 + (pose.squash - 1) * MOTION.squash;
    const sx = 1 / (sy || 1);
    // 3) РџРѕР·Р° РѕСЂРіР°РЅРёС‡РµСЃРєРѕР№ Р°С‚Р°РєРё: Р·Р°РјР°С… в†’ РїСЂС‹Р¶РѕРє/СѓРґР°СЂ в†’ РІРѕР·РІСЂР°С‚ (РјРѕРґСѓР»СЊ signatureAttacks)
    const sigKind = e.attackAnim > 0 && e.attackCooldown > 0 ? this.enemySignature(e) : null;
    const sigPose = sigKind ? signaturePose(sigKind, Math.max(0, Math.min(1, 1 - e.attackAnim / signatureDuration(sigKind)))) : null;
    // 4) Р”СЂРѕР¶СЊ РїСЂРё Р·Р°РјР°С…Рµ (charger)
    const windup = e.def.attackType === 'charger' && e.attackCooldown > 1.0
      ? Math.sin(now * 45) * 2.5 : 0;
    // 5) РЎРјРµСЂС‚СЊ: РІСЂР°С‰РµРЅРёРµ Рё РѕСЃРµРґР°РЅРёРµ
    const deathRot = e.isDying ? e.deathAnim * 0.9 : 0;
    const spawnRise = e.spawnAnim > 0 ? e.spawnAnim * 26 : 0;
    // 6) РќР°РєР»РѕРЅ Рё Р±РѕРєРѕРІРѕРµ РїРµСЂРµРІР°Р»РёРІР°РЅРёРµ РєРѕСЂРїСѓСЃР°. РќР°РєР»РѕРЅ РёРґС‘С‚ Р’ РЎРўРћР РћРќРЈ РґРІРёР¶РµРЅРёСЏ:
    // СЂР°РЅСЊС€Рµ РѕРЅ Р±С‹Р» Р·РЅР°РєРѕРїРѕСЃС‚РѕСЏРЅРЅС‹Рј, РїРѕСЌС‚РѕРјСѓ С‚РІР°СЂСЊ, РёРґСѓС‰Р°СЏ РІР»РµРІРѕ, РѕС‚РєР»РѕРЅСЏР»Р°СЃСЊ РЅР°Р·Р°Рґ.
    // faceDir РїСЂРёС…РѕРґРёС‚ РёР· Р»РѕРіРёРєРё (С‚Р°Рј РіРёСЃС‚РµСЂРµР·РёСЃ), РІ СЂРµРЅРґРµСЂРµ Р·РЅР°Рє РЅРµ СЃС‡РёС‚Р°РµРј.
    // `|| 1` вЂ” СЃС‚СЂР°С…РѕРІРєР°: Сѓ РІСЂР°РіР° РёР· СЃРѕС…СЂР°РЅРµРЅРёСЏ РїРѕР»Рµ РјРѕР¶РµС‚ Р±С‹С‚СЊ РїСѓСЃС‚С‹Рј, Р°
    // undefined РІ РЅР°РєР»РѕРЅРµ РґР°Р» Р±С‹ NaN Рё СЃРїСЂР°Р№С‚ РёСЃС‡РµР· Р±С‹ СЃРѕРІСЃРµРј.
    const face = e.faceDir || 1;
    const walkTilt = pose.tilt * face * MOTION.tilt + pose.roll * MOTION.roll;
    // 7) РџР°СЂРµРЅРёРµ: РёР· РїРѕР·С‹ (Сѓ Р»РµС‚СѓС‡РёС… Рё Р±РµСЃС„РѕСЂРјРµРЅРЅС‹С… вЂ” РїР»СЋСЃ РёРЅРґРёРІРёРґСѓР°Р»СЊРЅР°СЏ С„Р°Р·Р°).
    //    РџСЂС‹РіСѓРЅР°Рј РїР°СЂРµРЅРёРµ РќР• РґРѕР±Р°РІР»СЏРµРј: Сѓ РЅРёС… РїРѕРґСЉС‘Рј СѓР¶Рµ Р·Р°РґР°РЅ РїР°СЂР°Р±РѕР»РѕР№ jumpArc,
    //    Рё СЃРёРЅСѓСЃРѕРІРѕРµ РїРѕРєР°С‡РёРІР°РЅРёРµ РїРѕРІРµСЂС… РїР°СЂР°Р±РѕР»С‹ В«СЃРјР°Р·С‹РІР°Р»РѕВ» РјРѕРјРµРЅС‚ РѕС‚СЂС‹РІР°.
    const floating = pose.hover > 0 || shape === 'spirit' || shape === 'shadow' || shape === 'bat' || shape === 'eye';
    const hover = arc ? 0 : pose.hover * r * MOTION.hover + (floating ? Math.sin(now * 1.8 + e.x * 0.1) * 1.6 + (e.isBoss ? 3 : 1.5) : 0);
    // 8) РџСѓР»СЊСЃ РїСЂРё Р·Р°РјР°С…Рµ ranged-РєР°СЃС‚Р° (СЃР¶Р°С‚РёРµ РїРµСЂРµРґ РІС‹СЃС‚СЂРµР»РѕРј)
    const castPulse = e.def.attackType === 'ranged' && e.attackCooldown > 1.2
      ? 1 + Math.sin(now * 12) * 0.03 : 1;
    // 9) РђРіРѕРЅРёСЏ: РјРµР»РєР°СЏ С‚СЂСЏСЃРєР° РІ РїРѕСЃР»РµРґРЅРёРµ РјРіРЅРѕРІРµРЅРёСЏ Р¶РёР·РЅРё
    const lowHp = e.health / e.maxHealth < 0.25 && !e.isDying ? Math.sin(now * 30) * 0.8 : 0;
    // 10) РљСЂРµРЅ РѕС‚ РјР°С…Р° РєСЂС‹Р»Р°: РњРђР›Р«Р™ (pitch РёР· flapStroke). РљСЂС‹Р»Рѕ РІСЂР°С‰Р°РµС‚СЃСЏ РІ
    //     СЃР°РјРѕРј СЃРїСЂР°Р№С‚Рµ (wingStroke), РєРѕСЂРїСѓСЃ Р»РёС€СЊ СЃР»РµРіРєР° РІРµРґС‘С‚ Р·Р° РЅРёРј вЂ” СЂР°РЅСЊС€Рµ
    //     Р·РґРµСЃСЊ СЃС‚РѕСЏР» СѓРіРѕР» РєСЂС‹Р»Р° С†РµР»РёРєРѕРј (MOTION.flap), Рё С‚РµР»Рѕ РєР°С‡Р°Р»РѕСЃСЊ СЃРёР»СЊРЅРµРµ,
    //     С‡РµРј РјР°С…Р°Р»Рё РєСЂС‹Р»СЊСЏ.
    const flap = woosh ? woosh.pitch : 0;

    // РўРµРЅСЊ (РјСЏРіРєР°СЏ, СЃР»РµРґСѓРµС‚ Р·Р° С‚РµР»РѕРј; РїРѕРґ РїР°СЂСЏС‰РёРјРё вЂ” РјРµРЅСЊС€Рµ Рё Р±Р»РµРґРЅРµРµ).
    // РџСЂС‹РіСѓРЅСѓ РІ РїРѕР»С‘С‚Рµ С‚РµРЅСЊ СЃР¶РёРјР°РµС‚СЃСЏ Рё РіР°СЃРЅРµС‚: РїРѕ РЅРµР№ Рё РІРёРґРЅРѕ, С‡С‚Рѕ С‚РІР°СЂСЊ
    // Р Р•РђР›Р¬РќРћ РѕС‚РѕСЂРІР°Р»Р°СЃСЊ РѕС‚ Р·РµРјР»Рё, Р° РЅРµ РїСЂРѕСЃС‚Рѕ РїРѕРєР°С‡РёРІР°РµС‚СЃСЏ РЅР° РјРµСЃС‚Рµ.
    const air = arc ? arc.airborne : 0;
    const shadowAlpha = ((floating ? 0.15 : 0.25) + Math.sin(now * 1.5) * 0.05) * (1 - air * 0.45);
    const shadowScale = (floating ? 0.45 : 0.65) * (1 - air * 0.35);
    ctx.fillStyle = `rgba(0,0,0,${shadowAlpha})`;
    ctx.beginPath();
    ctx.ellipse(e.x, e.y + r * 0.88, r * shadowScale * sx, r * 0.22 * sy, 0, 0, Math.PI * 2);
    ctx.fill();

    // РџР•Р§РђРўР¬ Р‘РћРЎРЎРђ (РЅР° Р·РµРјР»Рµ, РџРћР” С„РёРіСѓСЂРѕР№) Рё РђРЈР Рђ РЎРўРРҐРР (РјРёСЂРѕРІС‹Рµ РєРѕРѕСЂРґРёРЅР°С‚С‹).
    // РћР±Р° СЌС„С„РµРєС‚Р° СЂРёСЃСѓСЋС‚СЃСЏ РґРѕ С‚РµР»Р°, С‡С‚РѕР±С‹ СЃРёР»СѓСЌС‚ Р±РѕСЃСЃР° РѕСЃС‚Р°РІР°Р»СЃСЏ С‡РёСЃС‚С‹Рј: РїСЂРµР¶РЅРёРµ
    // С‚РѕС‡РєРё-В«СЂСѓРЅС‹В» РїРѕРІРµСЂС… Рё СЌР»РµРјРµРЅС‚РЅС‹Рµ РєРІР°РґСЂР°С‚РёРєРё РІРЅСѓС‚СЂРё СЃРґРІРёРЅСѓС‚РѕРіРѕ РєРѕРЅС‚РµРєСЃС‚Р°
    // РґР°РІР°Р»Рё СЂСЏР±СЊ Рё РїРѕР»РѕСЃС‹ СЂСЏРґРѕРј СЃ С„РёРіСѓСЂРѕР№ (Сѓ Р±РѕСЃСЃР° РІ С†РµРЅС‚СЂРµ Р°СЂРµРЅС‹ вЂ” РІРѕРѕР±С‰Рµ
    // СѓР»РµС‚Р°Р»Рё Р·Р° СЌРєСЂР°РЅ, РїРѕС‚РѕРјСѓ С‡С‚Рѕ СѓРјРЅРѕР¶Р°Р»РёСЃСЊ РЅР° translate).
    if (e.isBoss && !e.isDying) this.drawBossSigil(e, r, now, e.hitFlash > 0);
    this.drawElementAura(e, r, now, alpha, e.hitFlash > 0);

    ctx.save();
    ctx.translate(e.x + windup + lowHp, e.y + bob - spawnRise - hover);
    // Р—Р•Р РљРђР›Рћ вЂ” РЎР РђР—РЈ РџРћРЎР›Р• РЎР”Р’РР“Рђ, Р”Рћ РџРћР’РћР РћРўРћР’. РЎРїСЂР°Р№С‚ РїРµС‡С‘С‚СЃСЏ В«Р»РёС†РѕРј РІРїСЂР°РІРѕВ»,
    // РїРѕСЌС‚РѕРјСѓ РёРґСѓС‰Р°СЏ РІР»РµРІРѕ С‚РІР°СЂСЊ СЂР°РЅСЊС€Рµ С€Р»Р° РІРїРµСЂС‘Рґ СЃРїРёРЅРѕР№: РјРѕСЂРґР° Рё РѕСЂСѓР¶РёРµ
    // РѕСЃС‚Р°РІР°Р»РёСЃСЊ СЃРїСЂР°РІР°. РЎС‚Р°РІРёРј Р·РµСЂРєР°Р»Рѕ Р·РґРµСЃСЊ, Р° РЅРµ РІ РєРѕРЅС†Рµ, РїРѕС‚РѕРјСѓ С‡С‚Рѕ Р·РЅР°Рє
    // walkTilt СѓР¶Рµ СѓС‡РёС‚С‹РІР°РµС‚ face: РµСЃР»Рё Р·РµСЂРєР°Р»РёС‚СЊ РџРћРЎР›Р• РїРѕРІРѕСЂРѕС‚Р°, РЅР°РєР»РѕРЅ
    // РїРµСЂРµРІРѕСЂР°С‡РёРІР°РµС‚СЃСЏ Рё С‚РІР°СЂСЊ, РёРґСѓС‰Р°СЏ РІР»РµРІРѕ, РѕС‚РєР»РѕРЅСЏРµС‚СЃСЏ РЅР°Р·Р°Рґ (СЌС‚Рѕ СЂРѕРІРЅРѕ С‚РѕС‚
    // Р±Р°Рі, РєРѕС‚РѕСЂС‹Р№ Р·РґРµСЃСЊ РєРѕРіРґР°-С‚Рѕ С‡РёРЅРёР»Рё). Р’СЃС‘, С‡С‚Рѕ СЂРёСЃСѓРµС‚СЃСЏ РґР°Р»СЊС€Рµ, Р·Р°РґР°С‘С‚СЃСЏ РІ
    // СЃРёСЃС‚РµРјРµ В«СЃРїСЂР°Р№С‚ СЃРјРѕС‚СЂРёС‚ РІРїСЂР°РІРѕВ», Рё Р·РµСЂРєР°Р»Рѕ РїРµСЂРµРІРѕРґРёС‚ СЌС‚Рѕ РІ РјРёСЂ.
    if (face < 0) ctx.scale(-1, 1);
    if (deathRot) ctx.rotate(deathRot);
    else if (walkTilt || flap) ctx.rotate(walkTilt + flap);
    ctx.scale(scale * sx * castPulse, scale * sy / castPulse);
    // РџРѕР·Р° signature-Р°С‚Р°РєРё: РїСЂС‹Р¶РѕРє/СЂР°СЃРїР»СЋС‰РёРІР°РЅРёРµ/РІС‹РїР°Рґ РІ СЃС‚РѕСЂРѕРЅСѓ С†РµР»Рё
    if (sigPose) {
      // Р’С‹РїР°Рґ вЂ” РІРїРµСЂС‘Рґ РџРћ РЎРџР РђР™РўРЈ (Р»РёС†РѕРј), Р·РµСЂРєР°Р»Рѕ СѓР¶Рµ РЅР°РїСЂР°РІРёР»Рѕ РµРіРѕ РІ С†РµР»СЊ.
      ctx.translate(sigPose.lean * r, sigPose.lift * r);
      ctx.scale(sigPose.squashX, sigPose.squashY);
      if (sigPose.roll !== 0) ctx.rotate(sigPose.roll);
    }

    const baseColor = e.hitFlash > 0 ? '#ffffff' : e.def.color;
    const hit = e.hitFlash > 0;

    if (e.isBoss) {
      // РЎРІРµС‡РµРЅРёРµ вЂ” РІ С†РІРµС‚ РЎРўРРҐРР РїРѕРґР·РµРјРµР»СЊСЏ: Р»РµРґСЏРЅРѕР№ Р±РѕСЃСЃ РѕР±РІРµРґС‘РЅ С…РѕР»РѕРґРЅС‹Рј,
      // РѕРіРЅРµРЅРЅС‹Р№ вЂ” С‚С‘РїР»С‹Рј. РўР°Рє Р±РѕСЃСЃС‹ СЂР°Р·РЅС‹С… Р»РѕРєР°С†РёР№ СЂР°Р·Р»РёС‡Р°СЋС‚СЃСЏ РґР°Р¶Рµ РёР·РґР°Р»РµРєР°.
      ctx.shadowColor = hit ? '#fff' : elementColor(e.def.element, e.def.color || '#ffffff');
      ctx.shadowBlur = 8 + Math.sin(now * 2.4) * 3;
    } else {
      ctx.shadowColor = hit ? '#fff' : shadeColor(e.def.color, 0.8);
      ctx.shadowBlur = 6;
    }

    const aura = shadeColor(e.def.color, 0.42);
    ctx.globalAlpha = alpha * 0.3;
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.ellipse(0, r * 0.12, r * 0.88, r * 0.78, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = alpha;

    // === VFX РЎРўРРҐРР: СЃРј. drawElementAura() ===
    // Р Р°РЅСЊС€Рµ С‡Р°СЃС‚РёС†С‹ СЃС‚РёС…РёРё СЂРёСЃРѕРІР°Р»РёСЃСЊ Р—Р”Р•РЎР¬ вЂ” РІРЅСѓС‚СЂРё СѓР¶Рµ СЃРґРІРёРЅСѓС‚РѕРіРѕ РєРѕРЅС‚РµРєСЃС‚Р°
    // (translate РЅР° РїРѕР·РёС†РёСЋ РІСЂР°РіР°), РїРѕСЌС‚РѕРјСѓ РїРѕРїР°РґР°Р»Рё РЅРµ Рє РІСЂР°РіСѓ, Р° Рє С‚РѕС‡РєРµ СЃ
    // СѓРґРІРѕРµРЅРЅС‹РјРё РєРѕРѕСЂРґРёРЅР°С‚Р°РјРё: Сѓ Р±РѕСЃСЃР° РІ С†РµРЅС‚СЂРµ Р°СЂРµРЅС‹ РєРІР°РґСЂР°С‚РёРєРё 3Г—3 СѓР»РµС‚Р°Р»Рё Р·Р°
    // СЌРєСЂР°РЅ, Сѓ РєСЂР°СЏ вЂ” СЃРѕР±РёСЂР°Р»РёСЃСЊ В«СЃС‚СЂР°РЅРЅС‹РјРё РїРѕР»РѕСЃР°РјРёВ» СЂСЏРґРѕРј СЃ С„РёРіСѓСЂРѕР№. РўРµРїРµСЂСЊ
    // Р°СѓСЂР° СЂРёСЃСѓРµС‚СЃСЏ РІ РјРёСЂРѕРІС‹С… РєРѕРѕСЂРґРёРЅР°С‚Р°С… РјСЏРіРєРёРјРё РїСЏС‚РЅР°РјРё (drawElementAura)
    // РґРѕ С‚РµР»Р° вЂ” СЃРёР»СѓСЌС‚ Р±РѕСЃСЃР° С‡РёСЃС‚С‹Р№, РЅРёС‡РµРіРѕ Р»РёС€РЅРµРіРѕ РїРѕРІРµСЂС… РґРѕСЃРїРµС…Р°.

    // === Р”РµС‚Р°Р»РёР·РёСЂРѕРІР°РЅРЅС‹Р№ РїРёРєСЃРµР»СЊ-Р°СЂС‚ (256Г—256, РєР°РґСЂС‹ Р°РЅРёРјР°С†РёРё) вЂ” РµРґРёРЅС‹Р№ СЃС‚РёР»СЊ РґР»СЏ РјРѕРЅСЃС‚СЂРѕРІ Рё Р±РѕСЃСЃРѕРІ ===
    this.drawPixelMonster(ctx, e, r, hit, now);

    ctx.shadowBlur = 0;
    ctx.restore();

    // === РџРћР›РќРђРЇ РђРќРРњРђР¦РРЇ РђРўРђРљР: Р·Р°РјР°С… в†’ СѓРґР°СЂ в†’ РІРѕР·РІСЂР°С‚ (РЅР°СЃС‚РѕСЏС‰РµРµ РѕСЂСѓР¶РёРµ) ===
    if (e.attackAnim > 0 && !e.isDying) {
      this.drawEnemyAttackArc(ctx, e, r);
    }

    // === Р’РР”РРњРђРЇ РњРђР“РРЇ: Р РЈРљРђ, РЎР¤Р•Р Рђ, РџРЈРўР¬ РђРўРђРљР, Р›РђРџР« РџРђРЈРљРђ ===
    // Р­С‚Рѕ С‚Рѕ, СЂР°РґРё С‡РµРіРѕ РІСЃС‘ РґРµР»Р°Р»РѕСЃСЊ: РёРіСЂРѕРє РґРѕР»Р¶РµРЅ Р’РР”Р•РўР¬ СЃРїРѕСЃРѕР±РЅРѕСЃС‚СЊ.
    // Р Р°РЅСЊС€Рµ СЃРЅР°СЂСЏРґ РїРѕСЏРІР»СЏР»СЃСЏ РёР· С†РµРЅС‚СЂР° С‚РµР»Р°, Р° В«Р·Р°РјР°С…В» Р±С‹Р» С‚РѕР»СЊРєРѕ РІ РїРѕР·Рµ
    // РєРѕСЂРїСѓСЃР°. РўРµРїРµСЂСЊ СЃРІРѕР±РѕРґРЅР°СЏ СЂСѓРєР° РїРѕРґРЅСЏС‚Р° Рё СЃРѕРіРЅСѓС‚Р° РІ Р»РѕРєС‚Рµ (~90В°),
    // РІ Р»Р°РґРѕРЅРё СЂР°Р·РіРѕСЂР°РµС‚СЃСЏ СЃС„РµСЂР° СЃС‚РёС…РёРё, РѕС‚ РЅРµС‘ РёРґС‘С‚ РїСѓРЅРєС‚РёСЂРЅС‹Р№ РїСѓС‚СЊ Рє С†РµР»Рё,
    // Р° Сѓ РїР°СѓРєР° РїРµСЂРµРґ СѓРєСѓСЃРѕРј РІР·РІРѕРґСЏС‚СЃСЏ Рё СЃРјС‹РєР°СЋС‚СЃСЏ РїРµСЂРµРґРЅРёРµ Р»Р°РїС‹.
    if (!e.isDying && e.spawnAnim <= 0) {
      this.drawCastOverlay(ctx, e, now);
    }

    // === Р§Р°СЃС‚РёС†С‹ РїРѕ С‚РёРїСѓ СЃСѓС‰РµСЃС‚РІР° ===
    if (!e.isDying && (shape === 'blob' || shape === 'crystal' || shape === 'imp')) {
      const pcolor = shape === 'imp' ? '#ff7a1a' : shape === 'crystal' ? shadeColor(e.def.color, 1.7) : e.def.color;
      ctx.save();
      for (let i = 0; i < 3; i++) {
        const t = (now * 0.7 + i * 0.33) % 1;
        const px = e.x + Math.sin(now * 2 + i * 2) * r * 0.5;
        const py = e.y + r * 0.6 - t * r * 1.6;
        ctx.fillStyle = pcolor;
        ctx.globalAlpha = alpha * (1 - t) * 0.55;
        ctx.beginPath();
        ctx.arc(px, py, r * 0.07, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.globalAlpha = alpha;

    // === Enhanced status effects ===
    if (e.slowTimer > 0) {
      ctx.strokeStyle = 'rgba(143,200,255,0.7)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(e.x, e.y + bob, r + 6, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (e.poisonTimer > 0) {
      ctx.fillStyle = 'rgba(122,191,63,0.5)';
      ctx.beginPath();
      ctx.arc(e.x, e.y + bob, r + 2, 0, Math.PI * 2);
      ctx.fill();
    }
    if (e.invuln > 0) {
      ctx.strokeStyle = `rgba(255,255,255,${e.invuln / 3})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(e.x, e.y + bob, r + 8, 0, Math.PI * 2);
      ctx.stroke();
    }


    // === БЕЗ ПОДПИСИ НАД ТВАРЬЮ ===
    // Раньше над каждым монстром висела строка с названием («Зелёный слизень»,
    // «Плюющийся слизень»…) — на экране это читалось как непонятные надписи
    // поверх боя. Имя врага есть в бестиарии; на арене силуэт и анимация говорят
    // сами за себя. Полоска здоровья ниже — только индикатор урона (у раненого).
    if (!e.isDying && e.health < e.maxHealth) {
      const barW = r * 2.5;
      const barH = e.isBoss ? 8 : 5;
      const barY = e.y - r - 15;
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(e.x - barW / 2, barY, barW, barH);
      ctx.fillStyle = e.isBoss ? '#ffeb3b' : '#ff6b6b';
      ctx.fillRect(e.x - barW / 2, barY, barW * (e.health / e.maxHealth), barH);
    }

    if (e.isBoss && !e.isDying) {
      ctx.textAlign = 'center';
      const name = this.profile.language === 'ru' ? e.def.name.ru : e.def.name.en;
      const weapon = e.def.weaponName
        ? (this.profile.language === 'ru' ? e.def.weaponName.ru : e.def.weaponName.en)
        : null;
      const nameY = e.y - r * 2.35 - 34;
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,0.8)';
      ctx.font = 'bold 16px Cinzel, serif';
      ctx.strokeText(name, e.x, nameY);
      ctx.fillStyle = '#ffeb3b';
      ctx.fillText(name, e.x, nameY);
      // Р›РР§РќРћР• РћР РЈР–РР• Р±РѕСЃСЃР° вЂ” РІС‚РѕСЂРѕР№ СЃС‚СЂРѕРєРѕР№ РІ С†РІРµС‚Рµ РµРіРѕ СЃС‚РёС…РёРё: В«Р–РµР»РµР№РЅС‹Р№
      // РљРѕСЂРѕР»СЊВ» СЃ В«РћРєРѕРј РџСѓСЃС‚РѕС‚С‹В» РЅРё СЃ РєРµРј РЅРµ СЃРїСѓС‚Р°С‚СЊ, Рё РІРёРґРЅРѕ, С‡РµРј РѕРЅ Р±СЊС‘С‚.
      if (weapon) {
        ctx.font = 'bold 12px Cinzel, serif';
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(0,0,0,0.8)';
        ctx.strokeText(`«${weapon}»`, e.x, nameY + 15);
        ctx.fillStyle = elementColor(e.def.element, '#cfd6ff');
        ctx.fillText(`«${weapon}»`, e.x, nameY + 15);
      }
    }

    ctx.globalAlpha = 1;
  }

  /**
   * Р’РР”РРњРђРЇ РњРђР“РРЇ РџРћР’Р•Р РҐ РЎРџР РђР™РўРђ. РЎРѕР±РёСЂР°РµС‚ РІРѕРµРґРёРЅРѕ:
   *   1) СЃРІРѕР±РѕРґРЅСѓСЋ СЂСѓРєСѓ СЃ Р»РѕРєС‚РµРј ~90В° Рё СЃС„РµСЂРѕР№ СЃС‚РёС…РёРё РІ Р»Р°РґРѕРЅРё;
   *   2) РїСѓРЅРєС‚РёСЂРЅС‹Р№ РїСѓС‚СЊ РґРѕ С†РµР»Рё (С‚РѕР»СЊРєРѕ Сѓ РґР°Р»СЊРЅРёС… РїСЂРёС‘РјРѕРІ);
   *   3) РІСЃРєРёРЅСѓС‚С‹Рµ Рё СЃРјС‹РєР°СЋС‰РёРµСЃСЏ Р»Р°РїС‹ РїР°СѓРєР°;
   *   4) РїРѕРґРїРёСЃСЊ Р·Р°РјР°С…Р° (В«РџР›Р•Р’РћРљВ», В«РџРђРЈРўРРќРђВ», В«РћР“РќР•РќРќРћР• Р”Р«РҐРђРќРР•В»вЂ¦).
   *
   * Р’С‹Р·С‹РІР°РµС‚СЃСЏ РџРћРЎР›Р• С‚РµР»Р°: СЂСѓРєР° СЂРёСЃСѓРµС‚СЃСЏ РїРѕРІРµСЂС… РєРѕСЂРїСѓСЃР°, РїРѕСЌС‚РѕРјСѓ РµС‘ РІРёРґРЅРѕ,
   * РґР°Р¶Рµ РµСЃР»Рё РѕРЅР° С‡Р°СЃС‚РёС‡РЅРѕ РїРµСЂРµРєСЂС‹РІР°РµС‚ СЃРїСЂР°Р№С‚. РљРѕРѕСЂРґРёРЅР°С‚С‹ РјРёСЂРѕРІС‹Рµ вЂ” С„СѓРЅРєС†РёСЏ
   * СЃР°РјР° РќР• РїРѕР»Р°РіР°РµС‚СЃСЏ РЅР° СЃРґРІРёРЅСѓС‚С‹Р№ РєРѕРЅС‚РµРєСЃС‚ СЃРїСЂР°Р№С‚Р° (РѕРЅ СѓР¶Рµ РІРѕСЃСЃС‚Р°РЅРѕРІР»РµРЅ).
   */
  drawCastOverlay(ctx: CanvasRenderingContext2D, e: Enemy, now: number) {
    // Р‘РѕСЃСЃС‹ РєР°СЃС‚СѓСЋС‚ РёР· casts[] (СЃРІРѕСЏ СЃРёСЃС‚РµРјР°), РјРѕРЅСЃС‚СЂС‹ вЂ” РёР· castPhase.
    if (e.isBoss) {
      const c = this.casts.find(x => x.bossId === e.id);
      if (!c) return;
      const r = e.def.radius * 2.5;
      const total = Math.max(0.05, c.attack.telegraph);
      const t = c.phase === 'windup' ? Math.max(0, Math.min(1, 1 - c.t / total))
        : c.phase === 'active' ? 1 : 0.5;
      const view: CastArmView = {
        x: e.x,
        y: e.y,
        r,
        angle: c.aim,
        face: e.faceDir < 0 ? -1 : 1,
        style: c.cast,
        t,
        phase: c.phase,
        glow: handGlowLevel(t, c.phase),
        reach: armReach(t),
        element: e.def.element,
        color: e.def.color || '#ffffff',
        isBoss: true,
        spiderLegs: (e.def.shape || 'blob') === 'spider' ? 6 : 0,
      };
      // РџСѓС‚СЊ РїРѕРєР°Р·С‹РІР°РµРј С‚РѕР»СЊРєРѕ РґР°Р»СЊРЅРёРј С„РѕСЂРјР°Рј: Сѓ В«СѓРґР°СЂР° РѕС‚ Р·РµРјР»РёВ» Рё СЂС‹РІРєР°
      // СЃРЅР°СЂСЏРґР° РЅРµС‚, Рё Р»РёРЅРёСЏ РІРІРѕРґРёР»Р° Р±С‹ РІ Р·Р°Р±Р»СѓР¶РґРµРЅРёРµ.
      const ranged = c.attack.form === 'fan' || c.attack.form === 'ring'
        || c.attack.form === 'beam' || c.attack.form === 'rain';
      if (ranged) drawCastPath(ctx, view, Math.min(520, c.attack.radius * 0.85));
      // HAND ONLY for unarmed magic casters. A boss holding an axe or halberd
      // swings it; a raised "magic" hand next to the blade read as a bug.
      const bossMagic = c.cast === 'freeHandOrb' || c.cast === 'circleWard' || c.cast === 'bothHandsRaised';
      if (shouldDrawCastArm(
        bossMagic ? 'castHand' : 'bite',
        this.enemyWeaponKit(e),
        c.phase !== 'recover',
      )) drawCastArm(ctx, view, now);
      // Без текстовой подсказки: телеграф теперь ВИЗУАЛЬНЫЙ (поза руки, разгорающаяся
      // сфера, зона на земле). Слова «МЕТЕОРИТНЫЙ ДОЖДЬ» / «ВЫПАД» / «ПАУТИНА»
      // только засоряли экран и ничего не объясняли.
      return;
    }

    // --- РѕР±С‹С‡РЅР°СЏ С‚РІР°СЂСЊ ---
    const view = this.castArmView(e, now);
    const a = e.abilities[e.castSlot];
    const far = !!a && a.range > 0;
    if (far) drawCastPath(ctx, view, a.range * 0.9);
    // HAND ONLY for unarmed magic casters, and only WHILE casting. Swordsmen,
    // archers, spiders and wolves get no arm at all: they attack with what is
    // drawn on the sprite. Previously this ran unconditionally, so every
    // creature kept a floating arm even at rest (castPhase === 'none').
    if (shouldDrawCastArm(a?.kind, this.enemyWeaponKit(e), e.castPhase !== 'none')) {
      drawCastArm(ctx, view, now);
    }
    // Р›РђРџР« РџРђРЈРљРђ: РІР·РІРѕРґ РЅР° Р·Р°РјР°С…Рµ, СЃРјС‹РєР°РЅРёРµ РІ РјРѕРјРµРЅС‚ СѓРєСѓСЃР°. В«РћС‡РµРЅСЊ
    // Р°РЅРёРјРёСЂРѕРІР°РЅРЅС‹Р№В» СѓРєСѓСЃ С‡РёС‚Р°РµС‚СЃСЏ Р±РµР· РµРґРёРЅРѕР№ С†РёС„СЂС‹ СѓСЂРѕРЅР°.
    if (view.spiderLegs && e.castPhase !== 'none' && a && a.kind === 'bite') {
      const w = e.castPhase === 'windup'
        ? Math.max(0, Math.min(1, 1 - e.castT / Math.max(0.05, a.telegraph)))
        : e.castPhase === 'active' ? 1 : 0;
      const close = e.castPhase === 'active' ? 1 : w * w;
      drawSpiderLegs(ctx, view, now, w, close);
    }
  }

  /**
   * РђРЅРёРјР°С†РёСЏ Р°С‚Р°РєРё РІСЂР°РіР°. РћСЂСѓР¶РёРµ (weaponSweep) вЂ” РґСѓРіР° Р»РµР·РІРёСЏ: Р·Р°РјР°С… в†’ СѓРґР°СЂ в†’ РІРѕР·РІСЂР°С‚.
   * Р’СЃРµ РѕСЂРіР°РЅРёС‡РµСЃРєРёРµ СѓРґР°СЂС‹ (СЃР»РёР·РµРЅСЊ, РІРѕР»Рє, РїР°СѓРє, РіРѕР»РµРј, РєСЂРёСЃС‚Р°Р»Р», РіР»Р°Р·вЂ¦) СЂРёСЃСѓРµС‚ РјРѕРґСѓР»СЊ
   * signatureAttacks: Сѓ РєР°Р¶РґРѕР№ Р°РЅР°С‚РѕРјРёРё СЃРІРѕР№ СЏР·С‹Рє СѓРґР°СЂР°, Р±РµР· В«РїР°Р»РѕРєВ» Рё РґСѓР±РёРЅ.
   */
  drawEnemyAttackArc(ctx: CanvasRenderingContext2D, e: Enemy, r: number) {
    const kind = this.enemySignature(e);
    const t = Math.max(0, Math.min(1, 1 - e.attackAnim / signatureDuration(kind))); // 0 в†’ 1 РїРѕ С…РѕРґСѓ Р°С‚Р°РєРё
    const dir = Math.atan2(this.player.y - e.y, this.player.x - e.x);
    const now = performance.now() / 1000;   // РґР»СЏ РјРµСЂС†Р°РЅРёСЏ РёСЃРєСЂ РЅР° Р·Р°РјР°С…Рµ

    if (kind !== 'weaponSweep') {
      const view: SignatureView = {
        x: e.x,
        y: e.y + r * 0.5,
        r,
        angle: dir,
        t,
        color: e.def.color || '#ffffff',
        element: e.def.element,
        isBoss: !!e.isBoss,
      };
      drawSignature(ctx, kind, view);
      return;
    }

    ctx.save();
    ctx.translate(e.x, e.y);

    // Р‘Р»РёР¶РЅРёР№ Р±РѕР№ / СЂС‹РІРѕРє: РїРѕР»Сѓ-РґСѓРіР° РѕСЂСѓР¶РёСЏ РѕС‚ Р·Р°РјР°С…Р° РґРѕ СѓРґР°СЂР°.
    // Р”СѓРіР° РЅР°С‡РёРЅР°РµС‚СЃСЏ Р·Р° СЃРїРёРЅРѕР№ (dir - PI/2 * swingBack) Рё СѓС…РѕРґРёС‚ РІРїРµСЂС‘Рґ (dir + PI/2).
    const swingBack = 0.85;                      // РЅР°СЃРєРѕР»СЊРєРѕ РґР°Р»РµРєРѕ РЅР°Р·Р°Рґ СѓС…РѕРґРёС‚ Р·Р°РјР°С…
    const a0 = dir - Math.PI * 0.5 * swingBack;  // СЃС‚Р°СЂС‚ РґСѓРіРё
    const a1 = dir + Math.PI * 0.5;              // РєРѕРЅРµС† РґСѓРіРё (РїРµСЂРµРґ РІСЂР°РіРѕРј)
    const ang = a0 + (a1 - a0) * t;              // С‚РµРєСѓС‰РёР№ СѓРіРѕР» Р»РµР·РІРёСЏ
    const reach = r * (e.def.attackType === 'charger' ? 1.5 : 1.35);
    const bladeCol = e.def.attackType === 'charger' ? '#ffffff' : (e.isBoss ? '#ffdca8' : '#d6dcea');
    const boss = !!e.isBoss;
    const el = elementColor(e.def.element, bladeCol);
    // === РќРђРЎРўРћРЇР©Р•Р• РћР РЈР–РР• Р’РњР•РЎРўРћ Р›РРќРР РљРђРќР’Р« ===
    // Р‘РµСЂС‘С‚СЃСЏ РўРћРў Р–Р• РїРёРєСЃРµР»СЊ-Р°СЂС‚, С‡С‚Рѕ СЃС‚РѕРёС‚ Сѓ С‚РІР°СЂРё РІ СЂСѓРєРµ (РєР»РёРЅРѕРє, С‚РѕРїРѕСЂ, РєРѕСЃР°,
    // РјРѕР»РѕС‚, РїРѕСЃРѕС…), Рё РІСЂР°С‰Р°РµС‚СЃСЏ РІРѕРєСЂСѓРі РєРёСЃС‚Рё РїРѕ РґСѓРіРµ СѓРґР°СЂР°. Р Р°РЅСЊС€Рµ Р»СЋР±РѕР№ СѓРґР°СЂ
    // СЂРёСЃРѕРІР°Р»СЃСЏ С€С‚СЂРёС…РѕРј РєР°РЅРІС‹ вЂ” В«Р±РµР»Р°СЏ РїР°Р»РєР°В»: РїРѕ РєР°СЂС‚РёРЅРєРµ РЅРµР»СЊР·СЏ Р±С‹Р»Рѕ РїРѕРЅСЏС‚СЊ,
    // С‡РµРј РёРјРµРЅРЅРѕ Р±СЊСЋС‚, Р° РјРµС‡, РєРѕСЃР° Рё РґСѓР±РёРЅР° РІС‹РіР»СЏРґРµР»Рё РѕРґРёРЅР°РєРѕРІРѕ.
    const spr = this.getWeaponSwingSprite(this.enemyWeaponKit(e), boss, e.def.id, e.def.color || '#ffffff', e.def.element);
    const wScale = (r * 2) / ART_N;
    const drawWeapon = (angle: number, a: number, scaleMul: number) => {
      if (!spr) return;
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, a));
      ctx.rotate(angle - spr.axis);
      ctx.scale(wScale * scaleMul, wScale * scaleMul);
      ctx.drawImage(spr.bmp, -spr.pivotX, -spr.pivotY);
      ctx.restore();
    };
    // РЈ Р·РІРµСЂРµР№ РѕСЂСѓР¶РёСЏ РЅРµС‚: РёС… СѓРґР°СЂ вЂ” СЂРѕСЃС‡РµСЂРє РёР· РўР РЃРҐ РєРѕРіС‚РµР№ (С‚РѕР¶Рµ РЅРµ Р»РёРЅРёСЏ,
    // Р° СЃР»РµРґ РЅР°СЃС‚РѕСЏС‰РµР№ Р»Р°РїС‹, СЃ СЂР°Р·РЅРѕР№ РґР»РёРЅРѕР№ Рё С‚РѕР»С‰РёРЅРѕР№).
    const drawClawRake = (angle: number, a: number) => {
      if (spr) return;
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, a));
      ctx.strokeStyle = withAlpha(el, 0.9);
      ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const off = (i - 1) * 0.11;
        ctx.lineWidth = Math.max(1, (boss ? 4 : 2.6) - i * 0.4);
        ctx.beginPath();
        ctx.arc(0, 0, reach * (0.62 + i * 0.16), angle + off - 0.16, angle + off + 0.16);
        ctx.stroke();
      }
      ctx.restore();
    };
    const drawStrike = (angle: number, a: number, scaleMul: number) => {
      if (spr) drawWeapon(angle, a, scaleMul);
      else drawClawRake(angle, a);
    };

    // === РўР•Р›Р•Р“Р РђР¤ Р—РђРњРђРҐРђ ===
    // РћСЂСѓР¶РёРµ РѕС‚РІРµРґРµРЅРѕ РЅР°Р·Р°Рґ, РЅР° РЅС‘Рј РєРѕРїРёС‚СЃСЏ СЌРЅРµСЂРіРёСЏ СЃС‚РёС…РёРё Рё РѕРЅРѕ РїРѕРґСЂР°РіРёРІР°РµС‚:
    // РёРіСЂРѕРє Р’РР”РРў, С‡РµРј Рё РєРѕРіРґР° РїРѕ РЅРµРјСѓ СѓРґР°СЂСЏС‚, Рё СѓСЃРїРµРІР°РµС‚ СѓР№С‚Рё.
    const wUp = Math.max(0, Math.min(1, t / 0.32));
    if (wUp > 0 && wUp < 1) {
      const glow = wUp * wUp;
      const gx = Math.cos(a0) * reach * 0.55, gy = Math.sin(a0) * reach * 0.55;
      ctx.globalAlpha = glow * 0.5;
      const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, reach * 0.75);
      g.addColorStop(0, withAlpha(el, 0.55));
      g.addColorStop(1, withAlpha(el, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(gx, gy, reach * 0.75, 0, Math.PI * 2);
      ctx.fill();
      drawStrike(a0 + Math.sin(now * 26) * 0.03, 0.6 + glow * 0.4, boss ? 1.04 : 1);
      // РСЃРєСЂС‹ РЅР° РѕСЂСѓР¶РёРё вЂ” СЌРЅРµСЂРіРёСЏ РєРѕРїРёС‚СЃСЏ РїРµСЂРµРґ СѓРґР°СЂРѕРј
      ctx.globalAlpha = glow * 0.8;
      ctx.fillStyle = withAlpha('#fff3c4', 1);
      for (let s = 0; s < 3; s++) {
        const sa = a0 + (s - 1) * 0.22 + Math.sin(now * 30 + s) * 0.06;
        const sr = reach * (0.5 + 0.42 * glow) * (0.8 + 0.2 * Math.sin(now * 18 + s * 2));
        ctx.beginPath();
        ctx.arc(Math.cos(sa) * sr, Math.sin(sa) * sr, (boss ? 2.4 : 1.6) * glow, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // РЎР›Р•Р” РЈР”РђР Рђ: РІРµРµСЂ РёР· РќРђРЎРўРћРЇР©РРҐ СЃРёР»СѓСЌС‚РѕРІ РѕСЂСѓР¶РёСЏ вЂ” РІРёРґРЅРѕ, РєР°Рє РєР»РёРЅРѕРє РїСЂРѕС€С‘Р»
    // РїРѕ РґСѓРіРµ. Р Р°РЅСЊС€Рµ СЌС‚Рѕ Р±С‹Р»Р° РѕРґРЅР° Р»РёРЅРёСЏ РєР°РЅРІС‹ (В«РїР°Р»РєР°В»), С‚РµРїРµСЂСЊ вЂ” РґРІРёР¶РµРЅРёРµ
    // СЃС‚Р°Р»Рё. Р§РёСЃР»Рѕ РєРѕРїРёР№ РѕРіСЂР°РЅРёС‡РµРЅРѕ, РїРѕСЌС‚РѕРјСѓ С†РµРЅР° РєР°РґСЂР° РѕСЃС‚Р°С‘С‚СЃСЏ РЅРёР·РєРѕР№.
    const trailAlpha = (t < 0.28 ? t / 0.28 * 0.35 : 0.45 * (1 - (t - 0.28) / 0.72));
    if (trailAlpha > 0.01) {
      const steps = boss ? 7 : 5;
      for (let i = 0; i < steps; i++) {
        const f = i / (steps - 1);
        const aa = a0 + (ang - a0) * f;
        drawStrike(aa, trailAlpha * (0.25 + 0.75 * f), 1);
      }
    }
    // Р­РЅРµСЂРіРёСЏ СЃС‚РёС…РёРё РІРґРѕР»СЊ РґСѓРіРё вЂ” РјСЏРіРєР°СЏ РїРѕР»РѕСЃР° СЃ РїСЂРѕР·СЂР°С‡РЅС‹РјРё РєСЂР°СЏРјРё
    // (Р¶С‘СЃС‚РєР°СЏ Р»РёРЅРёСЏ С‡РёС‚Р°Р»Р°СЃСЊ Р±С‹ РєР°Рє С‚Р° СЃР°РјР°СЏ В«РїР°Р»РєР°В»).
    ctx.globalAlpha = boss ? 0.22 : 0.14;
    ctx.strokeStyle = withAlpha(el, 1);
    ctx.lineCap = 'round';
    ctx.lineWidth = boss ? 12 : 6;
    ctx.beginPath();
    ctx.arc(0, 0, reach * 0.6, a0, ang);
    ctx.stroke();

    // РЎРђРњРћ РћР РЈР–РР• РЅР° С‚РµРєСѓС‰РµРј СѓРіР»Рµ СѓРґР°СЂР°: РєР»РёРЅРѕРє РѕСЃС‚Р°С‘С‚СЃСЏ РєР»РёРЅРєРѕРј, РєРѕСЃР° вЂ” РєРѕСЃРѕР№,
    // РјРѕР»РѕС‚ вЂ” РјРѕР»РѕС‚РѕРј. РЈ Р±РѕСЃСЃРѕРІ РѕРЅРѕ РєСЂСѓРїРЅРµРµ: РёС… Р»РёС‡РЅРѕРµ РѕСЂСѓР¶РёРµ РІРёРґРЅРѕ СЃСЂР°Р·Сѓ.
    ctx.globalAlpha = 1;
    drawStrike(ang, 1, boss ? 1.05 : 1);

    // Р’СЃРїС‹С€РєР° РІ РјРѕРјРµРЅС‚ СѓРґР°СЂР°: СЏРґСЂРѕ + СЂР°СЃС…РѕРґСЏС‰РµРµСЃСЏ РєРѕР»СЊС†Рѕ СѓРґР°СЂРЅРѕР№ РІРѕР»РЅС‹.
    // Р Р°РЅСЊС€Рµ Р±С‹Р» С‚РѕР»СЊРєРѕ РјР°Р»РµРЅСЊРєРёР№ РєСЂСѓРі вЂ” СѓРґР°СЂ С‡РёС‚Р°Р»СЃСЏ РєР°Рє В«С‡С‚Рѕ-С‚Рѕ РјРµР»СЊРєРЅСѓР»РѕВ».
    if (t >= 0.28 && t < 0.62) {
      const impact = Math.sin(((t - 0.28) / 0.34) * Math.PI);
      const hx = Math.cos(a1) * reach, hy = Math.sin(a1) * reach;
      // Р’СЃРїС‹С€РєР° вЂ” РІ С†РІРµС‚ СЃС‚РёС…РёРё: РѕРіРЅРµРЅРЅС‹Р№ СѓРґР°СЂ СЂС‹Р¶РёР№, Р»РµРґСЏРЅРѕР№ С…РѕР»РѕРґРЅС‹Р№,
      // Сѓ Р±РѕСЃСЃРѕРІ СЌС‚Рѕ СЃСЂР°Р·Сѓ С‡РёС‚Р°РµС‚СЃСЏ (СЂР°РЅСЊС€Рµ Сѓ РІСЃРµС… Р±С‹Р»Р° РѕРґРЅР° В«С‚С‘РїР»Р°СЏВ» РІСЃРїС‹С€РєР°).
      const hot = e.def.attackType === 'charger' ? '#ffffff' : (e.def.element ? elementColor(e.def.element, '#ffe9a8') : '#ffe9a8');
      // РЈРґР°СЂРЅР°СЏ РІРѕР»РЅР°: РєРѕР»СЊС†Рѕ СЂР°СЃС…РѕРґРёС‚СЃСЏ РѕС‚ С‚РѕС‡РєРё РєРѕРЅС‚Р°РєС‚Р°
      ctx.globalAlpha = impact * 0.55;
      ctx.strokeStyle = hot;
      ctx.lineWidth = (e.isBoss ? 3.5 : 2) * impact;
      ctx.beginPath();
      ctx.arc(hx, hy, r * 0.2 + (1 - impact) * r * 0.85, 0, Math.PI * 2);
      ctx.stroke();
      // РЇРґСЂРѕ РІСЃРїС‹С€РєРё
      ctx.globalAlpha = impact * 0.9;
      ctx.fillStyle = hot;
      ctx.beginPath();
      ctx.arc(hx, hy, r * 0.26 * (0.6 + impact), 0, Math.PI * 2);
      ctx.fill();
      // РљСЂРµСЃС‚РѕРѕР±СЂР°Р·РЅС‹Рµ Р»СѓС‡Рё вЂ” СѓРґР°СЂ РІС‹РіР»СЏРґРёС‚ РєР°Рє СѓРґР°СЂ, Р° РЅРµ РєР°Рє В«РєСЂСѓРіР»С‹Р№ Р±Р»РёРєВ»
      ctx.globalAlpha = impact * 0.6;
      ctx.lineWidth = (e.isBoss ? 2.5 : 1.6) * impact;
      for (let i = 0; i < 4; i++) {
        const sa = a1 + (i * Math.PI) / 2;
        const len = r * 0.55 * impact;
        ctx.beginPath();
        ctx.moveTo(hx + Math.cos(sa) * r * 0.12, hy + Math.sin(sa) * r * 0.12);
        ctx.lineTo(hx + Math.cos(sa) * (r * 0.12 + len), hy + Math.sin(sa) * (r * 0.12 + len));
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  renderPlayer() {
    const ctx = this.ctx;
    const p = this.player;
    const char = CHARACTERS.find(c => c.id === this.characterClass)!;
    const r = 16;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + r * 0.9, r * 0.8, r * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();

    const bob = p.isMoving ? Math.sin(p.walkAnim) * 3 : 0;
    const attackOffset = p.attackAnim > 0 ? Math.sin((0.2 - p.attackAnim) * Math.PI * 5) * 5 : 0;
    const flash = p.hitFlash > 0;

    ctx.save();
    ctx.translate(p.x, p.y + bob);

    // Draw character body based on class
    if (char.id === 'warrior') {
      this.drawWarrior(ctx, r, flash, p.facing, attackOffset, this.meleeSword.angle, this.meleeSword.isActive);
    } else if (char.id === 'archer') {
      this.drawArcher(ctx, r, flash, p.facing, attackOffset, this.isCharging ? this.chargeTime : 0);
    } else if (char.id === 'mage') {
      this.drawMage(ctx, r, flash, p.facing, attackOffset);
    } else {
      this.drawAssassin(ctx, r, flash, p.facing, attackOffset, this.meleeSickle.angle, this.meleeSickle.isActive);
    }

    ctx.restore();

    if (p.invuln > 0) {
      ctx.strokeStyle = `rgba(143,200,255,${p.invuln / 2})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r + 6, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  drawWarrior(ctx: CanvasRenderingContext2D, r: number, flash: boolean, facing: Vec2, attackOffset: number, swingAngle: number = 0, swinging: boolean = false) {
    // Knight in blue-steel armor
    const armorColor = flash ? '#fff' : '#4a6a9a';
    const armorDark = flash ? '#fff' : '#3a5a8a';
    const armorLight = flash ? '#fff' : '#5a7aba';

    // Body (armored torso)
    ctx.fillStyle = armorColor;
    ctx.beginPath();
    ctx.ellipse(0, r * 0.1, r * 0.6, r * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = armorDark;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Shoulder pauldrons
    ctx.fillStyle = armorLight;
    ctx.beginPath();
    ctx.arc(-r * 0.5, -r * 0.2, r * 0.3, 0, Math.PI * 2);
    ctx.arc(r * 0.5, -r * 0.2, r * 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Head with helmet
    ctx.fillStyle = armorDark;
    ctx.beginPath();
    ctx.arc(0, -r * 0.6, r * 0.35, 0, Math.PI * 2);
    ctx.fill();
    // Helmet visor slit
    ctx.fillStyle = '#1a1a2a';
    ctx.fillRect(-r * 0.2, -r * 0.65, r * 0.4, r * 0.1);

    // Legs
    ctx.fillStyle = armorDark;
    ctx.fillRect(-r * 0.3, r * 0.5, r * 0.25, r * 0.4);
    ctx.fillRect(r * 0.05, r * 0.5, r * 0.25, r * 0.4);

    // Sword in right hand вЂ” РІСЂР°С‰Р°РµС‚СЃСЏ РїРѕ РїРѕР»Сѓ-РґСѓРіРµ РІРѕРєСЂСѓРі РІРѕРёРЅР° РїСЂРё Р°С‚Р°РєРµ
    const angle = Math.atan2(facing.y, facing.x);
    ctx.save();
    // РџСЂРё Р°С‚Р°РєРµ РјРµС‡ РёРґС‘С‚ РїРѕ РёРЅС‚РµСЂРїРѕР»РёСЂРѕРІР°РЅРЅРѕР№ РїРѕР»Сѓ-РґСѓРіРµ (С‚Р° Р¶Рµ, С‡С‚Рѕ Сѓ СЃРµСЂРїР° СѓР±РёР№С†С‹)
    ctx.rotate(swinging ? swingAngle : angle);
    ctx.translate(r * 0.6, 0);
    // Blade
    ctx.fillStyle = '#d0d0e0';
    ctx.fillRect(0, -r * 0.12, r * 1.6, r * 0.08);
    // Blade tip
    ctx.beginPath();
    ctx.moveTo(r * 1.6, -r * 0.12);
    ctx.lineTo(r * 1.9, 0);
    ctx.lineTo(r * 1.6, r * 0.08);
    ctx.fill();
    // Crossguard
    ctx.fillStyle = '#c0a040';
    ctx.fillRect(-r * 0.05, -r * 0.25, r * 0.1, r * 0.5);
    // Handle
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(-r * 0.3, -r * 0.06, r * 0.25, r * 0.12);
    // Pommel
    ctx.fillStyle = '#c0a040';
    ctx.beginPath();
    ctx.arc(-r * 0.35, 0, r * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();


    }

  drawArcher(ctx: CanvasRenderingContext2D, r: number, flash: boolean, facing: Vec2, attackOffset: number, chargeTime: number) {
    // Elf in green clothes
    const greenColor = flash ? '#fff' : '#3c9b6e';
    const greenDark = flash ? '#fff' : '#2c7b5e';

    // Body
    ctx.fillStyle = greenColor;
    ctx.beginPath();
    ctx.ellipse(0, r * 0.1, r * 0.5, r * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = greenDark;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Head with pointed ears
    ctx.fillStyle = flash ? '#fff' : '#d0c0a0';
    ctx.beginPath();
    ctx.arc(0, -r * 0.5, r * 0.3, 0, Math.PI * 2);
    ctx.fill();
    // Ears
    ctx.beginPath();
    ctx.moveTo(-r * 0.3, -r * 0.5); ctx.lineTo(-r * 0.45, -r * 0.7); ctx.lineTo(-r * 0.2, -r * 0.55);
    ctx.moveTo(r * 0.3, -r * 0.5); ctx.lineTo(r * 0.45, -r * 0.7); ctx.lineTo(r * 0.2, -r * 0.55);
    ctx.fill();

    // Hood
    ctx.fillStyle = greenDark;
    ctx.beginPath();
    ctx.arc(0, -r * 0.55, r * 0.35, Math.PI, 0);
    ctx.fill();

    // Legs
    ctx.fillStyle = greenDark;
    ctx.fillRect(-r * 0.25, r * 0.5, r * 0.2, r * 0.4);
    ctx.fillRect(r * 0.05, r * 0.5, r * 0.2, r * 0.4);

    // Bow in hands (facing direction)
    const angle = Math.atan2(facing.y, facing.x);
    ctx.save();
    ctx.rotate(angle);
    ctx.translate(r * 0.4 + attackOffset, 0);
    // Wooden bow
    ctx.strokeStyle = '#6b4f2f';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.6, -Math.PI / 2.5, Math.PI / 2.5);
    ctx.stroke();
    // Bowstring вЂ” pulls back with charge time
    const stringPull = Math.min(chargeTime * 8, r * 0.5);
    ctx.strokeStyle = '#d0d0d0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const bowR = r * 0.6;
    const topY = Math.sin(-Math.PI / 2.5) * bowR;
    const botY = Math.sin(Math.PI / 2.5) * bowR;
    const handX = -stringPull;
    ctx.moveTo(Math.cos(-Math.PI / 2.5) * bowR, topY);
    ctx.lineTo(handX, 0);
    ctx.lineTo(Math.cos(Math.PI / 2.5) * bowR, botY);
    ctx.stroke();
    // Nocked arrow when charging
    if (chargeTime > 0.1) {
      ctx.strokeStyle = '#8b6f3f';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(handX, 0);
      ctx.lineTo(handX + r * 0.6, 0);
      ctx.stroke();
      // Arrowhead
      ctx.fillStyle = '#c0c0c0';
      ctx.beginPath();
      ctx.moveTo(handX + r * 0.6, 0);
      ctx.lineTo(handX + r * 0.7, -r * 0.08);
      ctx.lineTo(handX + r * 0.7, r * 0.08);
      ctx.fill();
    }
    ctx.restore();
  }

  drawMage(ctx: CanvasRenderingContext2D, r: number, flash: boolean, facing: Vec2, attackOffset: number) {
    // Old mage in purple robe
    const robeColor = flash ? '#fff' : '#5a3a8a';
    const robeDark = flash ? '#fff' : '#3a2a6a';

    // Robe (wider at bottom)
    ctx.fillStyle = robeColor;
    ctx.beginPath();
    ctx.moveTo(-r * 0.3, -r * 0.2);
    ctx.lineTo(r * 0.3, -r * 0.2);
    ctx.lineTo(r * 0.55, r * 0.8);
    ctx.lineTo(-r * 0.55, r * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = robeDark;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Head (old man)
    ctx.fillStyle = flash ? '#fff' : '#d0c8b0';
    ctx.beginPath();
    ctx.arc(0, -r * 0.5, r * 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Beard
    ctx.fillStyle = flash ? '#fff' : '#c0c0c0';
    ctx.beginPath();
    ctx.moveTo(-r * 0.2, -r * 0.3);
    ctx.quadraticCurveTo(0, r * 0.1, r * 0.2, -r * 0.3);
    ctx.fill();

    // Hood
    ctx.fillStyle = robeDark;
    ctx.beginPath();
    ctx.arc(0, -r * 0.55, r * 0.35, Math.PI, 0);
    ctx.fill();

    // Staff in right hand (facing direction)
    const angle = Math.atan2(facing.y, facing.x);
    ctx.save();
    ctx.rotate(angle);
    ctx.translate(r * 0.4 + attackOffset, 0);
    // Staff shaft
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(0, -r * 0.05, r * 1.3, r * 0.1);
    // Staff orb with pulsing glow
    const pulse = 0.5 + Math.sin(performance.now() / 200) * 0.5;
    ctx.shadowColor = '#5fa0ff';
    ctx.shadowBlur = 8 + pulse * 6;
    ctx.fillStyle = '#3c6ec8';
    ctx.beginPath();
    ctx.arc(r * 1.3, 0, r * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8fcfff';
    ctx.beginPath();
    ctx.arc(r * 1.3, 0, r * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  drawAssassin(ctx: CanvasRenderingContext2D, r: number, flash: boolean, facing: Vec2, attackOffset: number, swingAngle: number = 0, swinging: boolean = false) {
    // Dark hooded figure
    const darkColor = flash ? '#fff' : '#1a1a2a';
    const cloakColor = flash ? '#fff' : '#2a2a3a';

    // Cloak
    ctx.fillStyle = cloakColor;
    ctx.beginPath();
    ctx.moveTo(-r * 0.4, -r * 0.3);
    ctx.lineTo(r * 0.4, -r * 0.3);
    ctx.lineTo(r * 0.5, r * 0.7);
    ctx.lineTo(-r * 0.5, r * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = darkColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Head (dark, hidden in hood)
    ctx.fillStyle = darkColor;
    ctx.beginPath();
    ctx.arc(0, -r * 0.5, r * 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Glowing eyes under hood
    ctx.fillStyle = '#df3f3f';
    ctx.beginPath();
    ctx.arc(-r * 0.1, -r * 0.55, r * 0.06, 0, Math.PI * 2);
    ctx.arc(r * 0.1, -r * 0.55, r * 0.06, 0, Math.PI * 2);
    ctx.fill();

    // Hood
    ctx.fillStyle = darkColor;
    ctx.beginPath();
    ctx.arc(0, -r * 0.55, r * 0.4, Math.PI, 0);
    ctx.fill();

    // Chain in right hand, Sickle in left hand
    const angle = Math.atan2(facing.y, facing.x);
    ctx.save();
    // Sickle swings along the same semi-arc as the warrior's sword while attacking
    ctx.rotate(swinging ? swingAngle : angle);
    ctx.translate(r * 0.4 + attackOffset, 0);

    // Chain (right side, +y offset)
    ctx.strokeStyle = '#8a8a9a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, r * 0.2);
    ctx.quadraticCurveTo(r * 0.4, r * 0.5, r * 0.8, r * 0.2);
    ctx.stroke();
    // Chain tip
    ctx.fillStyle = '#c0c0c0';
    ctx.beginPath();
    ctx.arc(r * 0.8, r * 0.2, r * 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Sickle (left side, -y offset)
    ctx.strokeStyle = '#9b3c3c';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.2);
    ctx.quadraticCurveTo(r * 0.5, -r * 0.6, r * 0.7, -r * 0.2);
    ctx.stroke();
    // Sickle blade
    ctx.fillStyle = '#c0a0a0';
    ctx.beginPath();
    ctx.moveTo(r * 0.7, -r * 0.3);
    ctx.lineTo(r * 0.8, -r * 0.1);
    ctx.lineTo(r * 0.6, -r * 0.15);
    ctx.fill();

    ctx.restore();
  }

  setPaused(paused: boolean) {
    this.paused = paused;
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }
}

