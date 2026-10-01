// ============================================================
// BOSS KITS — ЛИЧНЫЕ НАБОРЫ АТАК КАЖДОГО БОССА
// ============================================================
// ПРОБЛЕМА, которую это чинит. У босса была ровно ОДНА фиксированная
// способность, выбираемая как `bossIndex % 20` (BOSS_ABILITY_POOL):
// 20 черт на 120 боссов, и выбор зависел ТОЛЬКО от номера босса.
// В итоге «Метеоритный дождь» выпадал и каменному голему, и ледяному
// духу; в бою повторялась одна атака; а урон был либо мгновенным без
// телеграфа (нечестно), либо вообще промахивался (скучно).
//
// Теперь у каждого босса СВОЙ набор из 3 атак по паре (форма,
// оружие/стихия) + фаза по HP: 100–60% — «дальний» набор, <60% —
// средний, <30% — залповой. У каждой атаки есть ТЕЛЕГРАФ (время на
// уход), ФОРМА (веер/кольцо/дождь/луч) и ЯВНАЯ зона опасности.
//
// Модуль чистый: только данные + чистые функции, без движка и канвы.
// ============================================================
import type { Element, EnemyShape } from './types';
import type { ArrowKind } from './arrows';

/** Форма атаки — как снаряды/удары разлетаются. */
export type BossAttackForm =
  | 'fan'        // веер в сторону игрока (2–9 штук с разбросом)
  | 'ring'       // кольцо во все стороны
  | 'rain'       // дождь сверху в заранее отмеченные точки
  | 'groundLine' // сектор/линия по земле с телеграфом
  | 'lunge'      // рывок к игроку с ударом
  | 'beam'       // луч с тонким телеграфом
  | 'mines';     // мины-ловушки, срабатывают по касанию

export type BossAttackId =
  | 'aimedVolley' | 'wideFan' | 'ringBurst' | 'safeRing'
  | 'meteorRain' | 'groundSlam' | 'quakeLine' | 'piercingLance'
  | 'lightningStrikes' | 'frostNova' | 'poisonSpray' | 'shadowTendrils'
  | 'voidOrbs' | 'crystalShards' | 'webSnare' | 'boneVolley'
  | 'flameBreath' | 'sonicScream' | 'charge'
  // приёмы этого прохода: луч взгляда и четыре новых паттерна
  | 'gazeBeam' | 'crossFan' | 'twinRunes' | 'riftLine' | 'mineSwarm';

export interface BossAttackDef {
  id: BossAttackId;
  form: BossAttackForm;
  /** Снарядов/ударов за каст. */
  count: number;
  /** Доля урона босса за ОДИН удар. */
  damageMul: number;
  /** Телеграф, сек: сколько есть на уход из зоны. */
  telegraph: number;
  /** Радиус зоны/снарядов, px. */
  radius: number;
  kind: ArrowKind;
  /** Тряска экрана при контакте, px. */
  shake: number;
  /** След на земле: лужа, остающаяся после удара. */
  puddle?: { element: Element; mul: number; scale: number; life: number };
  /** Подсказка (ru) во время телеграфа. */
  hintRu: string;
}

const D = (o: BossAttackDef): BossAttackDef => o;

/**
 * ПРЕСЕТЫ АТАК. Из них собираются личные наборы боссов (`kitForBoss`),
 * поэтому каждый пресет написан так, чтобы работать с ЛЮБОЙ формой.
 */
export const BOSS_ATTACKS: Record<BossAttackId, BossAttackDef> = {
  aimedVolley: D({
    id: 'aimedVolley', form: 'fan', count: 3, damageMul: 0.42, telegraph: 0.45,
    radius: 420, kind: 'ice', shake: 2, hintRu: 'ЛУЧ ПРИЦЕЛА',
  }),
  wideFan: D({
    id: 'wideFan', form: 'fan', count: 5, damageMul: 0.30, telegraph: 0.5,
    radius: 380, kind: 'fire', shake: 3, hintRu: 'ВЕЕР ОГНЯ',
  }),
  ringBurst: D({
    id: 'ringBurst', form: 'ring', count: 10, damageMul: 0.24, telegraph: 0.55,
    radius: 520, kind: 'shard', shake: 3, hintRu: 'КОЛЬЦО ОСКОЛКОВ',
  }),
  safeRing: D({
    id: 'safeRing', form: 'ring', count: 12, damageMul: 0.20, telegraph: 0.6,
    radius: 560, kind: 'poison', shake: 2,
    puddle: { element: 'poison', mul: 0.22, scale: 1.2, life: 5 },
    hintRu: 'ЯДОВИТЫЙ КУСТ',
  }),
  meteorRain: D({
    id: 'meteorRain', form: 'rain', count: 7, damageMul: 0.45, telegraph: 0.95,
    radius: 62, kind: 'meteor', shake: 6,
    puddle: { element: 'fire', mul: 0.30, scale: 1.5, life: 5 },
    hintRu: 'МЕТЕОРИТНЫЙ ДОЖДЬ',
  }),
  groundSlam: D({
    id: 'groundSlam', form: 'groundLine', count: 1, damageMul: 0.85, telegraph: 0.7,
    radius: 190, kind: 'ember', shake: 8,
    puddle: { element: 'fire', mul: 0.28, scale: 1.6, life: 6 },
    hintRu: 'УДАР О ЗЕМЛЮ',
  }),
  quakeLine: D({
    id: 'quakeLine', form: 'groundLine', count: 3, damageMul: 0.55, telegraph: 0.65,
    radius: 120, kind: 'shard', shake: 7, hintRu: 'ТРЕЩИНЫ ЗЕМЛИ',
  }),
  piercingLance: D({
    id: 'piercingLance', form: 'fan', count: 2, damageMul: 0.62, telegraph: 0.4,
    radius: 620, kind: 'lance', shake: 4, hintRu: 'ПРОБИВАЮЩИЙ УДАР',
  }),
  lightningStrikes: D({
    id: 'lightningStrikes', form: 'rain', count: 5, damageMul: 0.40, telegraph: 0.55,
    radius: 54, kind: 'storm', shake: 5, hintRu: 'ГРОЗОВЫЕ ВЫСТРЕЛЫ',
  }),
  frostNova: D({
    id: 'frostNova', form: 'ring', count: 8, damageMul: 0.26, telegraph: 0.7,
    radius: 300, kind: 'frost', shake: 3,
    puddle: { element: 'ice', mul: 0.18, scale: 1.8, life: 4 },
    hintRu: 'ЛЕДЯНАЯ НОВА',
  }),
  poisonSpray: D({
    id: 'poisonSpray', form: 'fan', count: 6, damageMul: 0.24, telegraph: 0.5,
    radius: 340, kind: 'venom', shake: 2,
    puddle: { element: 'poison', mul: 0.26, scale: 1.4, life: 6 },
    hintRu: 'БРОСОК ЯДА',
  }),
  shadowTendrils: D({
    id: 'shadowTendrils', form: 'fan', count: 4, damageMul: 0.38, telegraph: 0.55,
    radius: 400, kind: 'void', shake: 3, hintRu: 'ЩУПАЛЬЦА ТЬМЫ',
  }),
  voidOrbs: D({
    id: 'voidOrbs', form: 'ring', count: 6, damageMul: 0.40, telegraph: 0.6,
    radius: 420, kind: 'sigil', shake: 4, hintRu: 'ПЕЧАТИ ПУСТОТЫ',
  }),
  crystalShards: D({
    id: 'crystalShards', form: 'fan', count: 7, damageMul: 0.26, telegraph: 0.5,
    radius: 360, kind: 'crystal', shake: 3, hintRu: 'ОСКОЛКИ КРИСТАЛЛА',
  }),
  webSnare: D({
    id: 'webSnare', form: 'mines', count: 4, damageMul: 0.30, telegraph: 0.6,
    radius: 70, kind: 'web', shake: 2,
    puddle: { element: 'poison', mul: 0.20, scale: 1.0, life: 8 },
    hintRu: 'ПАУТИННЫЕ ЛОВУШКИ',
  }),
  boneVolley: D({
    id: 'boneVolley', form: 'fan', count: 4, damageMul: 0.36, telegraph: 0.45,
    radius: 420, kind: 'bone', shake: 2, hintRu: 'КОСТЯНЫЕ КОПЬЯ',
  }),
  flameBreath: D({
    id: 'flameBreath', form: 'fan', count: 9, damageMul: 0.22, telegraph: 0.65,
    radius: 300, kind: 'fire', shake: 4,
    puddle: { element: 'fire', mul: 0.30, scale: 2.0, life: 5 },
    hintRu: 'ОГНЕННОЕ ДЫХАНИЕ',
  }),
  sonicScream: D({
    id: 'sonicScream', form: 'ring', count: 14, damageMul: 0.20, telegraph: 0.65,
    radius: 480, kind: 'shard', shake: 6, hintRu: 'БОЕВОЙ КРИК',
  }),
  charge: D({
    id: 'charge', form: 'lunge', count: 1, damageMul: 1.0, telegraph: 0.5,
    radius: 150, kind: 'jag', shake: 7, hintRu: 'ТАРАН!',
  }),
  // === НОВЫЕ ПРИЁМЫ (добавлены в этом проходе) ===
  // Форма 'beam' была объявлена в типах, но не имела НИ ОДНОГО пресета — то есть
  // сигнатура `gazeBeam` («взгляд-луч», см. startBossCast) физически не могла
  // выпасть в бою. Теперь у неё есть хозяева: глаз, призрак и кристалл.
  gazeBeam: D({
    id: 'gazeBeam', form: 'beam', count: 1, damageMul: 0.85, telegraph: 0.8,
    radius: 560, kind: 'void', shake: 5, hintRu: 'ВЗГЛЯД',
  }),
  // Двойной «ведёрный» веер — шире и злее обычного wideFan, но всё с карманом.
  crossFan: D({
    id: 'crossFan', form: 'fan', count: 7, damageMul: 0.28, telegraph: 0.6,
    radius: 400, kind: 'frost', shake: 3, hintRu: 'ЛЕДЯНОЙ КРЕСТ',
  }),
  // Кольцо с двумя «карманами»: игрок видит две безопасные зоны, выбор сложнее.
  twinRunes: D({
    id: 'twinRunes', form: 'ring', count: 16, damageMul: 0.20, telegraph: 0.7,
    radius: 500, kind: 'sigil', shake: 4, hintRu: 'РУННОЕ КОЛЬЦО',
  }),
  // Разлом по земле — длиннее обычной quakeLine, урон дороже.
  riftLine: D({
    id: 'riftLine', form: 'groundLine', count: 5, damageMul: 0.62, telegraph: 0.75,
    radius: 460, kind: 'void', shake: 6,
    puddle: { element: 'dark', mul: 0.35, scale: 1.1, life: 6 },
    hintRu: 'РАЗЛОМ',
  }),
  // Рой мин: игрок вынужден идти, а не стоять на месте.
  mineSwarm: D({
    id: 'mineSwarm', form: 'mines', count: 5, damageMul: 0.34, telegraph: 0.65,
    radius: 520, kind: 'venom', shake: 3, hintRu: 'МИНЫ',
  }),
};

// ============================================================
// ПУЛЫ АТАК ПО (ФОРМА, ОРУЖИЕ, СТИХИЯ)
// ============================================================
// Порядок важен: сначала проверяется ОРУЖИЕ (оно говорит, чем босс
// реально бьёт), потом СТИХИЯ, потом ФОРМА (как фолбэк). Так у стрелка
// с луком будет стрелковый набор, даже если он из «ледяного» подземелья,
// а голем с кувалдой — земляной/залповой независимо от цвета.
const RANGED_POOL: BossAttackId[] = [
  'aimedVolley', 'wideFan', 'boneVolley', 'flameBreath', 'poisonSpray',
  'lightningStrikes', 'shadowTendrils', 'crystalShards', 'voidOrbs',
  'piercingLance', 'frostNova', 'ringBurst', 'crossFan', 'twinRunes',
  'mineSwarm', 'gazeBeam',
];
const MELEE_POOL: BossAttackId[] = [
  'groundSlam', 'quakeLine', 'charge', 'sonicScream', 'wideFan',
  'ringBurst', 'flameBreath', 'crystalShards', 'lightningStrikes',
  'riftLine', 'twinRunes', 'crossFan',
];
const ELEMENT_FAVORITES: Partial<Record<Element, BossAttackId[]>> = {
  fire: ['flameBreath', 'meteorRain', 'groundSlam'],
  ice: ['frostNova', 'aimedVolley', 'piercingLance', 'crossFan'],
  poison: ['poisonSpray', 'safeRing', 'webSnare', 'mineSwarm'],
  storm: ['lightningStrikes', 'wideFan', 'quakeLine', 'twinRunes'],
  dark: ['shadowTendrils', 'voidOrbs', 'safeRing', 'gazeBeam', 'riftLine'],
};
const SHAPE_FAVORITES: Partial<Record<EnemyShape, string[]>> = {
  blob: ['safeRing', 'groundSlam', 'charge'],
  golem: ['groundSlam', 'quakeLine', 'meteorRain'],
  humanoid: ['wideFan', 'quakeLine', 'charge'],
  skeleton: ['boneVolley', 'aimedVolley', 'sonicScream'],
  spider: ['webSnare', 'poisonSpray', 'legStabFan'],
  wolf: ['charge', 'pounceFan', 'sonicScream'],
  bat: ['wideFan', 'sonicScream', 'ringBurst'],
  spirit: ['voidOrbs', 'shadowTendrils', 'safeRing', 'gazeBeam'],
  shadow: ['shadowTendrils', 'voidOrbs', 'aimedVolley', 'riftLine'],
  crystal: ['crystalShards', 'ringBurst', 'piercingLance', 'gazeBeam'],
  gargoyle: ['charge', 'wideFan', 'lightningStrikes'],
  imp: ['flameBreath', 'aimedVolley', 'groundSlam'],
  eye: ['voidOrbs', 'lightningStrikes', 'aimedVolley', 'gazeBeam', 'twinRunes'],
  beetle: ['quakeLine', 'wideFan', 'charge'],
  dragon: ['flameBreath', 'meteorRain', 'piercingLance'],
};
// псевдо-атаки, которые превращаются в существующие пресеты
const ALIAS: Record<string, BossAttackId> = {
  legStabFan: 'aimedVolley',   // «когти веером» = частый прицельный веер
  pounceFan: 'charge',         // «прыжок» = таран
};

/**
 * Оружие говорит, чем босс бьёт РУКАМИ, поэтому его слой приоритетнее
 * стихии: алебардой бьют в упор, луком — веером, посохом — печатью.
 */
const WEAPON_FAVORITES: Record<string, string[]> = {
  bow: ['aimedVolley', 'boneVolley', 'wideFan'],
  crossbow: ['piercingLance', 'aimedVolley', 'lightningStrikes'],
  staff: ['voidOrbs', 'lightningStrikes', 'crystalShards'],
  book: ['shadowTendrils', 'voidOrbs', 'aimedVolley'],
  orb: ['voidOrbs', 'frostNova', 'safeRing'],
  scythe: ['shadowTendrils', 'sonicScream', 'safeRing'],
  whip: ['shadowTendrils', 'poisonSpray', 'ringBurst'],
  claw: ['charge', 'quakeLine', 'aimedVolley'],
  dagger: ['charge', 'aimedVolley', 'shadowTendrils'],
  hammer: ['groundSlam', 'quakeLine', 'meteorRain'],
  mace: ['groundSlam', 'quakeLine', 'sonicScream'],
  club: ['groundSlam', 'charge', 'quakeLine'],
  axe: ['wideFan', 'charge', 'quakeLine'],
  sword: ['wideFan', 'charge', 'sonicScream'],
  halberd: ['piercingLance', 'charge', 'quakeLine'],
  spear: ['piercingLance', 'wideFan', 'aimedVolley'],
  trident: ['piercingLance', 'aimedVolley', 'frostNova'],
  torch: ['flameBreath', 'aimedVolley', 'groundSlam'],
  banner: ['sonicScream', 'wideFan', 'lightningStrikes'],
  shield: ['groundSlam', 'charge', 'sonicScream'],
  sickle: ['charge', 'quakeLine', 'aimedVolley'],
  horn: ['sonicScream', 'ringBurst', 'lightningStrikes'],
};

/** Приводит любой id (в т.ч. алиас) к реальному пресету. */
function resolve(id: string): BossAttackDef {
  const real = (ALIAS[id] || id) as BossAttackId;
  return BOSS_ATTACKS[real] || BOSS_ATTACKS.aimedVolley;
}

/** Детерминированный хэш строки (тот же, что у gameData), чтобы набор
 *  атак босса был ОДИНАКОВ при каждом запуске и не «прыгал» по боям. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** Личный набор из 3 атак + фаза по HP. */
export interface BossKit {
  /** Атаки фазы 1 (100–60% HP) — базовые. */
  phase1: BossAttackDef;
  /** Фаза 2 (<60%) — средние, чаще. */
  phase2: BossAttackDef;
  /** Фаза 3 (<30%) — залповые, самые опасные. */
  phase3: BossAttackDef;
  /** Все три по порядку — для превью/аудита. */
  all: BossAttackDef[];
}

/**
 * СОБИРАЕТ НАБОР БОССА. Порядок выбора:
 *   1) из «любимых» по стихии — первой (она самая тематическая);
 *   2) из «любимых» по форме — второй;
 *   3) из общего пула (ranged/melee по attackType) — третьей, с
 *      детерминированным сдвигом от id (чтобы соседние боссы не совпали).
 * Так у каждого из 120 боссов набор уникален, и при этом каждая атака
 * соответствует его виду и оружию.
 */
export function kitForBoss(
  id: string, shape: EnemyShape | undefined, element: Element | undefined,
  weapon: string | undefined, attackType: 'melee' | 'ranged' | 'charger',
): BossKit {
  const h = hash(id);
  const ranged = attackType === 'ranged';
  const basePool = ranged ? RANGED_POOL : MELEE_POOL;
  // ИСТОЧНИКИ в порядке убывания приоритета. Первый исчерпывается раньше
  // остальных — это и даёт боссу «характер» (оружие важнее стихии).
  const sources: string[][] = [
    weapon ? (WEAPON_FAVORITES[weapon] || []) : [],
    element ? (ELEMENT_FAVORITES[element] || []) : [],
    shape ? (SHAPE_FAVORITES[shape] || []) : [],
    basePool,
  ].filter(s => s.length > 0);

  /**
   * РАУНД-РОБИН, а не «жадный» сбор. Первая версия брала все три
   * атаки из первого подошедшего пула, и 19 из 132 боссов получали
   * НАБОР-ТРОЙКУ «как у соседа»: голем-кувалда и гаргулья-алебарда
   * оказались идентичны. Теперь каждый слот берётся из СВОЕГО источника
   * (индекс источника зависит от хэша id), а внутри пула старт тоже
   * сдвинут — поэтому два босса с одинаковым (оружие, стихия, форма)
   * всё равно получают разные наборы.
   */
  const picked: string[] = [];
  // Уже взятые ФОРМЫ. ТЗ: у босса должно быть «много интересных атак», а не
  // три снаряда одинаковой формы. Раньше дедуп шёл только по id, и голем
  // получал groundSlam + quakeLine + ещё одну groundLine — два приёма из трёх
  // выглядели одинаково (и одинаково анимировались). Теперь форма тоже уникальна.
  const usedForms = new Set<string>();
  const take = (from: string[], startIdx: number) => {
    for (let k = 0; k < from.length; k++) {
      const c = from[(startIdx + k) % from.length];
      const real = (ALIAS[c] || c);
      const def = BOSS_ATTACKS[real as BossAttackId];
      if (!def || picked.includes(real) || usedForms.has(def.form)) continue;
      picked.push(real);
      usedForms.add(def.form);
      return true;
    }
    return false;
  };
  for (let slot = 0; slot < 3; slot++) {
    if (picked.length >= 3) break;
    // источники для этого слота: стартуем с «своего» и идём по кругу
    const order = sources.length
      ? [(slot + (h % sources.length)) % sources.length]
      : [];
    for (let step = 0; step < sources.length && picked.length < 3; step++) {
      const si = order.length ? order[0] : 0;
      const idx = (si + step) % sources.length;
      take(sources[idx], h >>> (3 + slot * 2));
    }
  }
  // Аварийный добор: сначала ищем атаку с НОВОЙ формой (чтобы набор остался
  // разнообразным), и только если таких нет — любую не взятую (лучше три
  // разные атаки одной формы, чем два одинаковых id и пустой слот).
  for (let i = 0; picked.length < 3 && i < basePool.length * 2; i++) {
    const c = basePool[(h + i) % basePool.length];
    if (picked.includes(c)) continue;
    const def = BOSS_ATTACKS[c];
    if (def && !usedForms.has(def.form)) { picked.push(c); usedForms.add(def.form); }
  }
  for (let i = 0; picked.length < 3 && i < basePool.length * 2; i++) {
    const c = basePool[(h + i) % basePool.length];
    if (!picked.includes(c)) picked.push(c);
  }
  const defs = picked.slice(0, 3).map(resolve);
  while (defs.length < 3) defs.push(resolve(basePool[h % basePool.length]));

  // фазы: по умолчанию 1→2→3, но дальние/залповые атаки идут раньше
  return {
    phase1: defs[0],
    phase2: defs[1],
    phase3: defs[2],
    all: defs,
  };
}

/** Какой номер фазы сейчас (1/2/3) по доле HP. Пороги — «мягкие»: 0.6/0.3. */
export function bossPhase(hpFrac: number): 1 | 2 | 3 {
  if (hpFrac <= 0.3) return 3;
  if (hpFrac <= 0.6) return 2;
  return 1;
}

/** Текущая атака фазы по доле HP. */
export function attackForPhase(kit: BossKit, hpFrac: number): BossAttackDef {
  return kit.phase1 === undefined ? BOSS_ATTACKS.aimedVolley
    : bossPhase(hpFrac) === 1 ? kit.phase1
    : bossPhase(hpFrac) === 2 ? kit.phase2
    : kit.phase3;
}

/**
 * Урон атаки с поправкой на фазу: в фазе 3 босс бьёт на ~35% сильнее
 * (он уже «загнан»), но НЕ настолько, чтобы это было неувернуто —
 * множитель остаётся в узком коридоре 1.0…1.35.
 */
export function phaseDamageMul(phase: 1 | 2 | 3): number {
  return phase === 3 ? 1.35 : phase === 2 ? 1.15 : 1.0;
}

/**
 * ЭСКАЛАЦИЯ ПАТТЕРНА ПО ФАЗЕ. До этого фаза меняла ТОЛЬКО множитель урона, и
 * один и тот же приём выглядел на 100% и на 30% HP абсолютно одинаково — босс
 * «не злился». Теперь поздняя фаза делает сам приём злее:
 *   фаза 2 → +1 снаряд, телеграф короче на 0.05 с;
 *   фаза 3 → +2 снаряда, телеграф короче на 0.12 с.
 * Важно: возвращается НОВЫЙ объект (копия), а сам пресет не мутируется — иначе
 * вторая фаза навсегда испортила бы первую для всех остальных бойцов.
 *
 * Счётчики ограничены сверху по форме: у кольца больше 18 снарядов превращается
 * в нечитаемую стену, у минут — больше 6 точек уже не обойти, рывок всегда один.
 */
export function escalateForPhase(atk: BossAttackDef, phase: 1 | 2 | 3): BossAttackDef {
  if (phase === 1) return atk;
  const bonus = phase === 2 ? 1 : 2;
  const LIMIT: Record<BossAttackForm, number> = {
    fan: 9, ring: 18, rain: 9, groundLine: 7, lunge: 1, beam: 1, mines: 6,
  };
  const count = Math.min(LIMIT[atk.form] ?? atk.count, atk.count + bonus);
  const telegraph = Math.max(0.28, Math.round((atk.telegraph - 0.05 * bonus) * 100) / 100);
  if (count === atk.count && telegraph === atk.telegraph) return atk;
  return { ...atk, count, telegraph };
}

// ============================================================
// ГЕОМЕТРИЯ АТАК (чистые функции — их считает и движок, и превью)
// ============================================================
/** Направление на цель + разброс веера. count=1 → точное попадание. */
export function fanAngles(baseAngle: number, count: number, spreadRad: number): number[] {
  if (count <= 1) return [baseAngle];
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0 : (i / (count - 1)) * 2 - 1;   // −1…+1
    out.push(baseAngle + t * spreadRad * 0.5);
  }
  return out;
}

/**
 * Кольцо с БЕЗОПАСНЫМ КАРМАНОМ. Один «пропуск» в кольце даёт игроку
 * гарантированное место, куда можно встать. Без этого кольцо из 12
 * снарядов с радиусом попадания 5 px неувернуто в принципе (игрок
 * физически не успевает ни уйти, ни проскочить), и бой становится
 * нечестным. Карман всегда СМЕЩЁН относительно направления на игрока,
 * поэтому «куда встать» нельзя угадать заранее — надо смотреть.
 */
export function ringAngles(
  baseAngle: number, count: number, gapWidthRad = Math.PI / 5, phaseShift = 0,
): number[] {
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + phaseShift;
    // пропускаем сектор вокруг «убежища» (сдвинут от направления на игрока)
    let d = a - (baseAngle + Math.PI);
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    if (Math.abs(d) < gapWidthRad) continue;
    out.push(a);
  }
  return out;
}

/** Точки падения «дождя»: смещены ОТ игрока, чтобы уйти можно было. */
export function rainTargets(
  targetX: number, targetY: number, count: number, spread: number, rng: () => number,
): Array<{ x: number; y: number }> {
  const out: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < count; i++) {
    if (i === 0) { out.push({ x: targetX, y: targetY }); continue; }   // одна точно по игроку
    const a = rng() * Math.PI * 2;
    const d = spread * (0.45 + rng() * 0.55);
    out.push({ x: targetX + Math.cos(a) * d, y: targetY + Math.sin(a) * d * 0.6 });
  }
  return out;
}

/** Сектор земли: список точек вдоль луча из (x,y) в сторону угла. */
export function groundLinePoints(
  x: number, y: number, angle: number, length: number, steps: number, width: number,
): Array<{ x: number; y: number; r: number }> {
  const out: Array<{ x: number; y: number; r: number }> = [];
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const per = length / steps;
  for (let i = 0; i < steps; i++) {
    const t = (i + 0.5) * per;
    out.push({ x: x + cos * t, y: y + sin * t, r: width });
  }
  return out;
}

/** Сколько «попаданий» в секунду реально выдаёт атака (для баланса). */
export function attackDps(def: BossAttackDef, bossDamage: number, hits: number): number {
  const perHit = bossDamage * def.damageMul;
  return (perHit * hits) / Math.max(0.1, def.telegraph + 0.3);
}
