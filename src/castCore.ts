// ============================================================
// CAST CORE — ПОЗА КОЛДУЮЩЕЙ РУКИ
// ============================================================
// ПРОБЛЕМА. Монстр с посохом и монстр с мечом выглядели одинаково, когда
// «применяли способность»: движок просто ставил позу gazeBeam (корпус
// поджимался) и выпускал снаряд из ЦЕНТРА тела. По картинке нельзя было
// понять, ЧЕМ и КАК тварь бьёт: меч в руке оставался висеть, а магия летела
// из пуза. То же у боссов: у них по 3 способности, но все они выглядели
// как одна и та же «вспышка из корпуса».
//
// Теперь у каждой способности есть ПОЗА РУКИ, и она видна на спрайте:
//   - свободная (не с оружием) рука поднимается и сгибается в локте
//     (плечо вверх, локоть под ~90°) — классический жест каста;
//   - оружие остаётся в другой руке и на время каста отводится вниз-назад,
//     чтобы не перекрывать магию (и читалось, что им НЕ бьют прямо сейчас);
//   - в ладони свободной руки горит сфера стихии, из которой летит атака.
//
// Модуль чистый: только геометрия и данные, ни движка, ни канвы.
// ============================================================
import type { Element, EnemyShape } from './types';

/**
 * КАК ТВАРЬ «ПОКАЗЫВАЕТ» СВОЮ СПОСОБНОСТЬ. Это не механика удара, а
 * язык тела: игрок должен угадывать атаку по позе ДО того, как она прилетит.
 */
export type CastStyle =
  /** Свободная рука вверх, локоть ~90°, сфера стихии в ладони. */
  | 'freeHandOrb'
  /** Обе руки вперёд/вверх, оружие отведено вниз — «зов» перед залпом. */
  | 'bothHandsRaised'
  /** Свободная рука вперёд-вниз, «плюёт» снарядом из раскрытой ладони. */
  | 'pointForward'
  /** Оружие отведено за плечо — готовится бросок/выстрел. */
  | 'weaponBack'
  /** Кольцо силы: рука описывает круг, вокруг тела встаёт печать. */
  | 'circleWard'
  /** Обе руки прижаты к земле — удар «от земли», не от руки. */
  | 'groundPress'
  /** Рёв/крик: голова запрокинута, оружие вскинуто вверх. */
  | 'roarRaise';

/** Геометрия руки в системе спрайта: «лицом вправо», начало — центр фигуры. */
export interface ArmRig {
  /** Плечо свободной руки: доля радиуса от центра. */
  shoulderX: number;
  shoulderY: number;
  /** Куда указывает ПЛЕЧО, град. 0° = вправо (вперёд), −90° = вверх. */
  shoulderAngle: number;
  /** Длина плеча. */
  shoulderLen: number;
  /** Куда указывает ПРЕДПЛЕЧЬЕ относительно плеча, град. Локоть ≈ −90°. */
  elbowBend: number;
  /** Длина предплечья. */
  forearmLen: number;
  /** Радиус сферы/очага силы в ладони. */
  palmR: number;
}

/** Поворот и смещение ОРУЖИЯ на время каста (доли радиуса). */
export interface WeaponCastOffset {
  /** Насколько отвести оружие вниз-назад, рад. */
  rotate: number;
  /** Смещение кисти, доля радиуса. */
  dx: number;
  dy: number;
  /** 0..1 — насколько гасить оружие (чтобы не спорило со сферой). */
  dim: number;
}

/**
 * КАКУЮ РУКУ ТВАРЬ ДЕРЖИТ ОРУЖИЕ. У двуногих (humanoid, skeleton, imp)
 * правая; у зверей/паука/слизня оружия нет — «свободная» рука одна, и она
 * же бьёт. Поле читает движок, чтобы нарисовать свинг-спрайт оружия в
 * кисти той же руки, что поднята в касте.
 */
export type CastHand = 'right' | 'left' | 'none';

/** Полный профиль позы каста. */
export interface CastPose {
  rig: ArmRig;
  weapon: WeaponCastOffset;
  /** Держать ли сферу в ладони (магия «из руки»). */
  orb: boolean;
  /** Цвет/стиль ореола вокруг ладони. */
  handGlow: number;
  /** Наклон и подъём корпуса за время каста: пик в середине телеграфа. */
  bodyLean: number;
  bodyLift: number;
}

const RIG = (
  shoulderX: number, shoulderY: number, shoulderAngle: number, shoulderLen: number,
  elbowBend: number, forearmLen: number, palmR: number,
): ArmRig => ({ shoulderX, shoulderY, shoulderAngle, shoulderLen, elbowBend, forearmLen, palmR });

const OFF = (rotate: number, dx: number, dy: number, dim: number): WeaponCastOffset => ({ rotate, dx, dy, dim });

const POSE = (rig: ArmRig, weapon: WeaponCastOffset, orb: boolean, handGlow: number, bodyLean: number, bodyLift: number): CastPose =>
  ({ rig, weapon, orb, handGlow, bodyLean, bodyLift });

/**
 * ТАБЛИЦА ПОЗ. Значения подобраны так, чтобы силуэт читался на 32
 * авторских единицах: плечо вверх на 75–95°, предплечье под 90° —
 * «буква Г» из руки, ровно как на референсе игрока.
 */
export const CAST_POSES: Record<CastStyle, CastPose> = {
  // Рука ВВЕРХ, локоть 90°: плечо вверх-вперёд, предплечье строго вверх.
  freeHandOrb: POSE(
    RIG(0.34, -0.30, -78, 0.52, -86, 0.46, 0.15),
    OFF(-0.85, 0.06, 0.30, 0.45), true, 1.0, -0.05, -0.04,
  ),
  // Обе руки вверх: плечо выше, предплечье ещё круче — «зов».
  bothHandsRaised: POSE(
    RIG(0.30, -0.44, -88, 0.58, -70, 0.50, 0.13),
    OFF(-1.10, 0.02, 0.34, 0.60), true, 1.25, -0.10, -0.07,
  ),
  // Рука вперёд-вниз, «плюёт»: плечо вперёд, предплечье чуть вниз.
  pointForward: POSE(
    RIG(0.36, -0.24, -18, 0.50, 34, 0.44, 0.11),
    OFF(-0.45, 0.10, 0.18, 0.30), true, 0.85, 0.04, -0.02,
  ),
  // Оружие ЗА ПЛЕЧО (бросок/выстрел), свободная рука вперёд — прицел.
  weaponBack: POSE(
    RIG(0.40, -0.30, -8, 0.46, 8, 0.42, 0.09),
    OFF(-1.55, -0.04, 0.22, 0.20), false, 0.55, 0.06, -0.03,
  ),
  // Круг/печать: рука вытянута вперёд-вверх и «ведёт» окружность.
  circleWard: POSE(
    RIG(0.32, -0.36, -46, 0.54, -52, 0.48, 0.18),
    OFF(-0.70, 0.04, 0.26, 0.50), true, 1.15, -0.02, -0.05,
  ),
  // Удар ОТ ЗЕМЛИ: обе руки вниз, корпус приседает.
  groundPress: POSE(
    RIG(0.30, 0.06, 62, 0.44, 24, 0.40, 0.14),
    OFF(0.55, 0.08, 0.10, 0.55), true, 0.70, 0.16, 0.10,
  ),
  // Рёв: голова запрокинута, рука вскинута высоко и широко.
  roarRaise: POSE(
    RIG(0.38, -0.50, -96, 0.60, -40, 0.44, 0.16),
    OFF(-1.25, 0.00, 0.36, 0.35), true, 1.10, -0.14, -0.09,
  ),
};

/** Точки кисти и локтя в системе спрайта (доли радиуса). */
export interface ArmPoints {
  shoulder: { x: number; y: number };
  elbow: { x: number; y: number };
  hand: { x: number; y: number };
}

/**
 * РАСКЛАДКА РУКИ. Считает три сустава по двум углам, поэтому локоть всегда
 * «настоящий»: при shoulderAngle = −78° и elbowBend = −86° плечо идёт вверх,
 * а предплечье — ещё круче вверх, образуя ту самую «букву Г».
 *
 * @param rig   профиль руки
 * @param reach 0..1.35 — насколько рука ВЫТЯНУТА (на замахе чуть поджата,
 *              в момент выпуска выпрямлена). Даёт «дыхание» позы.
 */
export function armPoints(rig: ArmRig, reach = 1): ArmPoints {
  const k = Math.max(0, Math.min(1.35, reach));
  const a1 = (rig.shoulderAngle * Math.PI) / 180;
  const a2 = a1 + (rig.elbowBend * Math.PI) / 180;
  const sx = rig.shoulderX, sy = rig.shoulderY;
  const ex = sx + Math.cos(a1) * rig.shoulderLen * k;
  const ey = sy + Math.sin(a1) * rig.shoulderLen * k;
  const hx = ex + Math.cos(a2) * rig.forearmLen * k;
  const hy = ey + Math.sin(a2) * rig.forearmLen * k;
  return { shoulder: { x: sx, y: sy }, elbow: { x: ex, y: ey }, hand: { x: hx, y: hy } };
}

/**
 * КАКОЙ СТИЛЬ КАСТА У ЭТОЙ СПОСОБНОСТИ. Правило: смотрим на ФОРМУ атаки
 * (как она летит) и на СТИХИЮ/ОРУЖИЕ твари, а не на её номер в списке.
 * Поэтому две способности одного босса физически не могут получить одну
 * позу: «дождь по площади» всегда «от земли», «кольцо» — печать, «веер» —
 * вытянутая рука, а «рывок» — оружие за плечом.
 */
export function castStyleFor(
  form: string,
  opts: { ranged?: boolean; weapon?: string; element?: Element; shape?: EnemyShape } = {},
): CastStyle {
  const w = opts.weapon || 'none';
  const el = opts.element;

  // 1) Форма атаки — самый сильный признак.
  if (form === 'groundLine' || form === 'mines') return 'groundPress';
  if (form === 'lunge' || form === 'charge') return 'weaponBack';
  if (form === 'ring' || form === 'sigil') {
    // Кольцо магии (посох/сфера/книга/без оружия) — круг силы;
    // кольцо от оружия (меч, топор) — обе руки вверх на замахе.
    if (w === 'staff' || w === 'orb' || w === 'book' || w === 'none') return 'circleWard';
    return 'bothHandsRaised';
  }
  if (form === 'rain') {
    // «Дождь» зовут вскинутыми руками, знаменем или рогом — но не клинком.
    if (w === 'banner' || w === 'horn' || w === 'none') return 'roarRaise';
    return 'bothHandsRaised';
  }
  if (form === 'beam') {
    return w === 'staff' || w === 'orb' || w === 'book' ? 'freeHandOrb' : 'pointForward';
  }
  if (form === 'fan') {
    // Веер ИЗ ОРУЖИЯ — прицел/бросок (лук, копьё, трезубец);
    // веер магии — вытянутая свободная рука со сферой.
    if (opts.ranged) return 'pointForward';
    if (w === 'bow' || w === 'crossbow' || w === 'spear' || w === 'trident' || w === 'sickle') return 'weaponBack';
    return 'freeHandOrb';
  }

  // 2) Стихия: гроза/тьма/яд диктуют свой жест, если форма не сказала.
  if (el === 'storm') return 'roarRaise';
  if (el === 'dark') return 'circleWard';
  if (el === 'poison') return 'pointForward';

  // 3) Последний фолбэк — по анатомии.
  if (opts.shape === 'dragon' || opts.shape === 'bat' || opts.shape === 'gargoyle') return 'roarRaise';
  if (opts.shape === 'blob' || opts.shape === 'beetle') return 'groundPress';
  return 'freeHandOrb';
}

/**
 * ЕСТЬ ЛИ У ТВАРИ ОРУЖИЕ. Если нет (слизень, зверь, дух), «свободная рука»
 * — это просто рука/щупальце, и отводить нечего; зато сфера в ладони
 * становится главным телеграфом. Если оружие есть — оно уходит за плечо.
 */
export function hasWeapon(weapon: string | undefined): boolean {
  return !!weapon && weapon !== 'none';
}

/**
 * Прогресс каста 0..1 → насколько вытянута рука. На замахе рука поджата
 * (локоть сильнее согнут), в момент выпуска — выпрямлена до конца. Это
 * делает позу ЖИВОЙ: одна и та же рука «раскрывается» перед ударом.
 */
export function armReach(t: number): number {
  const k = Math.max(0, Math.min(1, t));
  // 0.82 на старте каста → 1.06 в момент выпуска, по гладкой кривой.
  const s = k * k * (3 - 2 * k);
  return 0.82 + s * 0.24;
}

/**
 * ЯРКОСТЬ СФЕРЫ В ЛАДОНИ: 0..1 по прогрессу каста. На замахе сфера только
 * разгорается (игрок успевает прочитать), к удару — максимальна, после —
 * гаснет. Ровно как телеграф: рано «вспыхнувший» снаряд обманывает.
 */
export function handGlowLevel(t: number, phase: 'windup' | 'active' | 'recover'): number {
  if (phase === 'active') return 1;
  if (phase === 'recover') return Math.max(0, 1 - t * 1.6);
  // windup: 0.15 → 1.0 с ускорением к концу («разгон» перед выстрелом).
  const k = Math.max(0, Math.min(1, t));
  return 0.15 + 0.85 * k * k;
}

/**
 * ОТКУДА ВЫЛЕТАЕТ СНАРЯД. Раньше ВСЕ выстрелы шли из центра тела: сфера в
 * поднятой руке светилась, а снаряд появлялся из живота — картинка и
 * механика расходились. Теперь снаряд стартует из точки ПОЗЫ (ладонь, плечо
 * или земля), а смещение зависит от формы атаки.
 *
 * Возвращает смещение в долях радиуса в системе спрайта («лицом вправо»),
 * поэтому для целей слева оно зеркалится тем же faceDir, что и тело.
 */
export function castMuzzle(style: CastStyle, reach = 1): { x: number; y: number } {
  const p = CAST_POSES[style];
  const a = armPoints(p.rig, reach);
  switch (style) {
    case 'groundPress':
      // Из-под рук: от земли перед тварью, а не из груди.
      return { x: a.hand.x + 0.10, y: Math.max(a.hand.y, 0.34) };
    case 'weaponBack':
      // От отведённого оружия (за плечом) — видно, что это удар/бросок.
      return { x: 0.30, y: -0.44 };
    case 'roarRaise':
      // Из пасти/вскинутой руки, высоко.
      return { x: a.hand.x * 0.75, y: a.hand.y - 0.06 };
    case 'circleWard':
      return { x: a.hand.x, y: a.hand.y };
    default:
      // freeHandOrb / bothHandsRaised / pointForward — ровно из ладони.
      return { x: a.hand.x, y: a.hand.y };
  }
}

/**
 * ОРУЖИЕ В КИСТИ ПОЗЫ. Для ближних приёмов со свинг-спрайтом (меч, топор…)
 * движок рисует НАСТОЯЩЕЕ оружие, повёрнутое на угол кулака — так «удар
 * мечом» выглядит как удар мечом, а не как белая дуга канвы.
 *
 * Возвращает угол мира (рад) и точку кисти в долях радиуса (спрайт «смотрит
 * вправо»; для левых целей координаты зеркалит faceDir, как и всю позу).
 */
export function weaponGrip(
  style: CastStyle, reach: number, angle: number,
): { angle: number; x: number; y: number } {
  const a = armPoints(CAST_POSES[style].rig, reach);
  // Направление предплечья — туда же «смотрит» кулак с оружием.
  const rig = CAST_POSES[style].rig;
  const a1 = (rig.shoulderAngle * Math.PI) / 180;
  const a2 = a1 + (rig.elbowBend * Math.PI) / 180;
  return { angle: angle + a2 * 0.35, x: a.hand.x, y: a.hand.y };
}

/** Минимальный срез типа способности (строкой — модуль не тянет типы лишний раз). */
export type CastKindLike = 'bite' | 'spit' | 'castHand' | 'roar' | 'web' | 'thrust';

/**
 * ГДЕ ВООБЩЕ ИМЕЕТ СМЫСЛ РИСОВАТЬ РУКУ.
 *
 * ПРАВИЛО ИГРОКА: «рука рисуется только у тех, кто стреляет магией и у кого
 * нет никакого оружия». Раньше рука вызывалась БЕЗУСЛОВНО, из-за чего:
 *   - мечник/лучник/паук поднимали руку, хотя бьют оружием или хелицерами;
 *   - боссы с алебардой показывали «магическую» руку рядом с оружием;
 *   - рука висела даже в ПОКОЕ (castPhase === 'none' → t = 0.06): монстр
 *     выглядел так, будто всегда что-то колдовал.
 *
 * Три условия, и все три обязательны:
 *   1) ФОРМА УМЕЕТ КОЛДОВАТЬ — дальняя стихийная атака (не укус, не выпад);
 *   2) ОРУЖИЯ НЕТ — иначе поднятая рука спорна с оружием в другой кисти;
 *   3) КАСТ ИДЁТ СЕЙЧАС — в покое руки нет, она появляется только на замахе.
 */
export function shouldDrawCastArm(
  kind: CastKindLike | undefined,
  weapon: string | undefined,
  casting: boolean,
): boolean {
  if (!casting) return false;
  if (weapon && weapon !== 'none') return false;
  return kind === 'spit' || kind === 'castHand' || kind === 'web' || kind === 'roar';
}

