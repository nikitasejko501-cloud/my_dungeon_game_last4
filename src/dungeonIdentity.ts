// === DUNGEON IDENTITY — «ДНК» каждого подземелья ===
// Каждое подземелье = свой пул форм, своя палитра, свой набор мутаций силуэта
// и своя семейство походки. Поэтому монстры из разных подземелий не выглядят
// одинаково, даже если базовая форма совпадает.
// Модуль чистый: типы + чистые функции, ни одной зависимости от движка.
import type { Element, EnemyShape, GaitKind, MonsterTrait } from './types';

/** Мутации силуэта: рога, шипы, хвост, лишние глаза и т.п. Пекутся в спрайт. */
export type { GaitKind, MonsterTrait };

export interface DungeonTheme {
  id: string;
  titleRu: string;
  titleEn: string;
  loreRu: string;
  body: string;      // основной цвет тела
  accent: string;    // акцент (глаза, броня, свечение)
  glow: string;      // цвет стихийного свечения
  element: Element;
  shapes: EnemyShape[];      // ИСКЛЮЧИТЕЛЬНЫЙ пул форм монстров этого подземелья
  bossShapes: EnemyShape[];  // ИСКЛЮЧИТЕЛЬНЫЙ пул форм боссов
  finalBoss: EnemyShape;     // уникальный финальный босс (не «дракон» у всех)
  traits: MonsterTrait[];    // разрешённые мутации силуэта
  gait: GaitKind;            // доминирующая походка
}

// Каждое подземелье получило СВОЮ «фирменную» форму (blob/golem/skeleton/dragon/eye/gargoyle),
// которая не встречается больше ни в одном другом подземелье, + 4 общие формы.
// Человекоподобная форма (humanoid) оставлена только двум локациям (чаща и некрополь) —
// именно из-за неё раньше половина подземелий выглядела одинаково.
export const DUNGEON_THEMES: Record<string, DungeonTheme> = {
  // 1. Органика, гниль, споры. Фирменная форма: слизень.
  whispering_grove: {
    id: 'whispering_grove', titleRu: 'Шепчущая Чаща', titleEn: 'Whispering Grove',
    loreRu: 'Гнилая органика, споры и живая плоть, размножившаяся во тьме.',
    body: '#5fbf3f', accent: '#d8f24a', glow: '#8bff5a', element: 'poison',
    shapes: ['blob', 'wolf', 'spider', 'beetle', 'humanoid'],
    bossShapes: ['blob', 'wolf', 'spider', 'beetle', 'imp'],
    finalBoss: 'golem',
    traits: ['horns', 'spikes', 'tendrils', 'bubbleSacs', 'tail', 'extraEyes', 'crest', 'mane'],
    gait: 'slither',
  },
  // 2. Камень, руда, огонь. Фирменная форма: голем-конструкт.
  gnomish_ruins: {
    id: 'gnomish_ruins', titleRu: 'Руины Гномов', titleEn: 'Gnomish Ruins',
    loreRu: 'Сломанные механизмы и рунный камень, ожившие под землёй.',
    body: '#b08a5a', accent: '#7fd8ff', glow: '#ffb43a', element: 'fire',
    shapes: ['golem', 'wolf', 'spider', 'beetle', 'crystal'],
    bossShapes: ['golem', 'wolf', 'spider', 'beetle', 'imp'],
    finalBoss: 'crystal',
    traits: ['armorPlates', 'rockArmor', 'horns', 'crest', 'halo', 'plume', 'crown', 'tusks'],
    gait: 'stomp',
  },
  // 3. Кость, прах, тьма. Фирменная форма: скелет.
  necropolis: {
    id: 'necropolis', titleRu: 'Некрополь Зла', titleEn: 'Necropolis',
    loreRu: 'Костяные галлереи и тени, что не отбрасывают тени сами.',
    body: '#c0bca8', accent: '#a86ad8', glow: '#c07bff', element: 'dark',
    shapes: ['skeleton', 'wolf', 'spider', 'beetle', 'imp'],
    bossShapes: ['wolf', 'spider', 'beetle', 'imp', 'crystal'],
    finalBoss: 'skeleton',
    traits: ['boneRibs', 'horns', 'crown', 'halo', 'tendrils', 'extraEyes', 'wingMembranes', 'plume'],
    gait: 'slink',
  },
  // 4. Хитин, яд, рептилия. Фирменная форма: ящер (дракон только здесь).
  idol_jungle: {
    id: 'idol_jungle', titleRu: 'Джунгли Идол-КараВ', titleEn: 'Idol Jungle',
    loreRu: 'Древние идолы пожирают джунгли, обрастая мхом и костью.',
    body: '#2f9a5a', accent: '#ff6ad8', glow: '#7cff9a', element: 'poison',
    shapes: ['dragon', 'humanoid', 'crystal', 'imp', 'shadow'],
    bossShapes: ['humanoid', 'crystal', 'imp', 'shadow', 'spider'],
    finalBoss: 'dragon',
    traits: ['spikes', 'tail', 'crest', 'antlers', 'horns', 'shell', 'extraEyes', 'mane'],
    gait: 'crawl',
  },
  // 5. Вода, бездна, иллюзии. Фирменная форма: глаз на дне.
  sunken_fleet: {
    id: 'sunken_fleet', titleRu: 'Затонувший Флот', titleEn: 'Sunken Fleet',
    loreRu: 'Затопленные корабли, гнилая вода и то, что смотрит со дна.',
    body: '#2f6a9a', accent: '#7affe8', glow: '#5ad8ff', element: 'ice',
    shapes: ['eye', 'humanoid', 'crystal', 'spirit', 'bat'],
    bossShapes: ['humanoid', 'crystal', 'spirit', 'bat', 'imp'],
    finalBoss: 'eye',
    traits: ['tentacles', 'tendrils', 'bubbleSacs', 'iceShards', 'tail', 'extraEyes', 'shell', 'crest'],
    gait: 'float',
  },
  // 6. Воздух, молния, прах богов. Фирменная форма: гаргулья.
  sky_citadel: {
    id: 'sky_citadel', titleRu: 'Небесная Крепость', titleEn: 'Sky Citadel',
    loreRu: 'Каменные шпили выше облаков, грозы и осколки павших богов.',
    body: '#8a8ac8', accent: '#ffe14a', glow: '#bfe8ff', element: 'storm',
    shapes: ['gargoyle', 'imp', 'shadow', 'spirit', 'bat'],
    bossShapes: ['imp', 'shadow', 'spirit', 'bat', 'humanoid'],
    finalBoss: 'gargoyle',
    traits: ['wingMembranes', 'crest', 'plume', 'crown', 'halo', 'armorPlates', 'horns', 'iceShards'],
    gait: 'glide',
  },
};

const FALLBACK = DUNGEON_THEMES.whispering_grove;

export function themeFor(dungeonId: string | undefined): DungeonTheme {
  if (!dungeonId) return FALLBACK;
  return DUNGEON_THEMES[dungeonId] || FALLBACK;
}

// === STEP 2. ЦВЕТ: сдвиг оттенка (наконец-то работающий hueShift) и рампа для боссов ===
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const v = h.length === 3
    ? [parseInt(h[0] + h[0], 16), parseInt(h[1] + h[1], 16), parseInt(h[2] + h[2], 16)]
    : [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  return [v[0] || 0, v[1] || 0, v[2] || 0];
}
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn;
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  let h: number;
  if (mx === r) h = ((g - b) / d + (g < b ? 6 : 0));
  else if (mx === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h * 60, s, l];
}
function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const seg = Math.floor(h / 60) % 6;
  const t: number[][] = [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]];
  const [r, g, b] = t[seg];
  const to = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
  return '#' + to(r) + to(g) + to(b);
}
/** Сдвиг оттенка на deg градусов (hueShift из EnemyDef). */
export function hueShiftHex(hex: string, deg: number): string {
  if (!hex || !deg) return hex;
  const [r, g, b] = hexToRgb(hex);
  const [h, s, l] = rgbToHsl(r, g, b);
  return hslToHex(h + deg, s, l);
}
/** Затемнение/осветление (множитель яркости). */
export function shadeHex(hex: string, mul: number): string {
  const [r, g, b] = hexToRgb(hex);
  const [h, s, l] = rgbToHsl(r, g, b);
  return hslToHex(h, s, Math.max(0.04, Math.min(0.92, l * mul)));
}
/**
 * Рампа цветов боссов: 20 боссов одного подземелья получают 20 РАЗНЫХ цветов.
 * Оттенок идёт по кругу от базового цвета темы, насыщенность и светлота —
 * четырьмя ступенями, поэтому соседние боссы отличаются и по тону, и по колеру.
 */
export function bossColor(theme: DungeonTheme, index: number): string {
  const [r, g, b] = hexToRgb(theme.body);
  const [h, s, l] = rgbToHsl(r, g, b);
  return hslToHex(h + index * 17, Math.min(0.95, 0.45 + (index % 3) * 0.15), Math.min(0.72, 0.30 + (index % 4) * 0.09));
}
/** Цвет монстра: базовый цвет темы + сдвиг оттенка по тиру (каждый тир — иной цвет). */
export function monsterColor(theme: DungeonTheme, hueShift: number, isRanged: boolean): string {
  const base = isRanged ? theme.accent : theme.body;
  return hueShiftHex(base, hueShift);
}

// === STEP 3. ФОРМА: монстр подземелья не может выглядеть как монстр чужого ===
/** Правила «слово в имени → форма». Используются, только если форма разрешена в теме. */
const NAME_SHAPE_RULES: Array<[string[], EnemyShape]> = [
  [['слиз', 'slime', 'тина', 'mire', 'гриб', 'спор', 'молоко'], 'blob'],
  [['паук', 'spider', 'паути', 'web', 'тень-зверь'], 'spider'],
  [['жук', 'beetle', 'scarab', 'короед'], 'beetle'],
  [['волк', 'wolf', 'собака', 'hound', 'гиен', 'hyena', 'ящер', 'lizard', 'динозавр', 'рептил', 'ящер'], 'wolf'],
  [['кристалл', 'crystal', 'оскол', 'prism', 'алмаз', 'самоцвет'], 'crystal'],
  [['голем', 'golem', 'камен', 'stone', 'колосс', 'титан', 'статуя', 'истукан'], 'golem'],
  [['скелет', 'skeleton', 'костя', 'bone', 'реап', 'лич', 'necromant', 'костяной'], 'skeleton'],
  [['тень', 'shadow', 'силуэт', 'фантом', 'phantom', 'mor'], 'shadow'],
  [['призрак', 'spirit', 'дух', 'ghost', 'банши', 'banshee', 'сирена', 'утоплен', 'drowned', 'морок', 'wraith'], 'spirit'],
  [['мыш', 'bat', 'летуч', 'ворон', 'raven', 'птиц', 'сокол', 'ворон'], 'bat'],
  [['гаргуль', 'gargoyle', 'статуя-крыл', 'истукан-крыл'], 'gargoyle'],
  [['бес', 'imp', 'демон', 'demon', 'факел', 'ifrit', 'суккуб'], 'imp'],
  [['глаз', 'eye', 'ока', 'зрач', 'watcher', 'озеро'], 'eye'],
  [['дракон', 'dragon', 'ящер-крыл', 'змей', 'серпен', 'левиаф', 'рептил'], 'dragon'],
  [['огр', 'ogre', 'орк', 'orc', 'циклоп', 'cyclops', 'гоблин', 'goblin', 'тролл', 'troll'], 'golem'],
  [['эльф', 'elf', 'гном', 'dwarf', 'дворф', 'кобольд', 'kobold', 'маг', 'mage', 'шаман', 'shaman', 'жрец', 'priest', 'рыцар', 'knight', 'пират', 'pirate', 'утопленник'], 'humanoid'],
  [['леший', 'страж', 'guardian', 'древес', 'корень', 'root'], 'spider'],
];
/**
 * Итоговая форма монстра подземелья:
 * 1) авторская форма, если она разрешена в этом подземелье;
 * 2) иначе форма по слову в имени (если разрешена);
 * 3) иначе — по кругу из пула темы (гарантирует «свой» облик в каждом подземелье).
 */
export function resolveMonsterShape(theme: DungeonTheme, shape: EnemyShape, nameRu: string, nameEn: string, index: number): EnemyShape {
  const pool = theme.shapes;
  if (shape && pool.indexOf(shape) >= 0) return shape;
  const s = (nameRu + '|' + nameEn).toLowerCase();
  for (const [keys, sh] of NAME_SHAPE_RULES) {
    if (pool.indexOf(sh) < 0) continue;
    for (const k of keys) {
      if (s.indexOf(k) >= 0) return sh;
    }
  }
  return pool[index % pool.length];
}
/**
 * Форма босса: только из пула боссов темы, по кругу.
 * Финальный босс ВСЕГДА уникален для темы и вырезан из пула обычных боссов,
 * поэтому «Лесной Бог» не выглядит как ещё один голем в списке.
 */
export function resolveBossShape(theme: DungeonTheme, index: number, isFinal: boolean): EnemyShape {
  if (isFinal) return theme.finalBoss;
  const pool = theme.bossShapes.filter((s) => s !== theme.finalBoss);
  const use = pool.length > 0 ? pool : theme.bossShapes;
  return use[index % use.length];
}

// === STEP 4. МУТАЦИИ СИЛУЭТА: детерминированный набор рогов/шипов/хвостов ===
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
/**
 * Набор мутаций для конкретного монстра/босса. Один и тот же id всегда даёт один
 * и тот же набор (стабильно между кадрами и перезагрузками), но у разных тварей
 * наборы разные — силуэты перестают повторяться.
 * ВАЖНО: берём СТАРШИЕ биты генератора. У LCG младшие биты сильно коррелированы
 * (период 2, 4, 8...), поэтому `seed % n` давал бы всего несколько повторяющихся
 * комбинаций вместо всех возможных.
 */
export function rollTraits(theme: DungeonTheme, id: string, isBoss: boolean, shape: EnemyShape): MonsterTrait[] {
  const pool = theme.traits;
  if (pool.length === 0) return [];
  const want = isBoss ? 3 : 2;
  const out: MonsterTrait[] = [];
  let seed = hash(id + '|' + shape + '|' + theme.id);
  for (let i = 0; i < 16 && out.length < want; i++) {
    // xorshift32 — перемешивает все биты
    seed ^= seed << 13; seed >>>= 0;
    seed ^= seed >>> 17;
    seed ^= seed << 5; seed >>>= 0;
    // старшие 16 бит → равномерное число в [0, 65535)
    const pick = Math.floor((seed >>> 16) / 65536 * pool.length) % pool.length;
    const t = pool[pick];
    if (out.indexOf(t) < 0) out.push(t);
  }
  return out;
}

// === STEP 5. ПОХОДКА: анатомически разные циклы движения ===
/**
 * Фаза цикла: 0..1. Все кривые построены на sin/cos, поэтому движение
 * непрерывно: нет рывков на стыках фаз (проверено самотестом).
 */
export interface GaitPose {
  /** Смещение центра масс по вертикали (px в долях радиуса). */
  bob: number;
  /** Покачивание корпуса (наклон вперёд/назад, радианы). */
  tilt: number;
  /** Боковое переваливание корпуса (для пауков/ящеров — ходьба боком). */
  roll: number;
  /** Сжатие по вертикали: 1 = нейтрально, <1 = приседание/прижимание. */
  squash: number;
  /** Разведение/сведение лап (радианы поворота конечности от корпуса). */
  legs: [number, number, number, number];
  /** Доворот головы/морды — инерция, отстаёт от корпуса. */
  headLag: number;
  /** Подъём/опускание тела от «в воздухе» (парение, полёт). */
  hover: number;
  /** Скорость фазы для этого шага (главный цикл — 1). */
  phaseRate: number;
}

const G_ZERO: GaitPose = { bob: 0, tilt: 0, roll: 0, squash: 1, legs: [0, 0, 0, 0], headLag: 0, hover: 0, phaseRate: 1 };

/**
 * Походка по форме и теме. Один и тот же набор костей движется по-разному:
 * гном-голем ТОПОТОМ (stance широкий, подъём рывком), слизь ПЕРЕТЕКАЕТ
 * (тело колышется волной, ног нет), паук шагает боком (перекатывание корпуса).
 */
export function gaitForShape(shape: EnemyShape, themeGait: GaitKind): GaitKind {
  // Некоторые формы диктуют походку независимо от темы (анатомия важнее декораций).
  if (shape === 'blob') return 'slither';
  if (shape === 'spider' || shape === 'beetle') return 'crawl';
  if (shape === 'spirit' || shape === 'shadow' || shape === 'eye') return 'float';
  if (shape === 'bat' || shape === 'dragon') return 'glide';
  // Гаргулья — каменные статуи: тяжело топочут, а не парят.
  if (shape === 'gargoyle') return 'stomp';
  if (shape === 'wolf') return 'hop';
  if (shape === 'skeleton') return 'slink';
  // Двуногие (гуманоиды, бесы, импы) всегда ходят/скачут, а не висят в воздухе.
  if (shape === 'imp') return 'hop';
  return themeGait;
}

/** Поза походки на фазе цикла p (0..1). Чистая функция — легко тестировать. */
export function gaitPose(gait: GaitKind, p: number, moving: boolean): GaitPose {
  if (!moving) return G_ZERO;
  const a = p * Math.PI * 2;
  const s = Math.sin(a), c = Math.cos(a);
  switch (gait) {
    // ПЕШАЯ ХОДЬБА: противофаза ног, корпус вверх на переносе, лёгкий наклон вперёд.
    case 'walk':
      return { bob: -Math.abs(s) * 0.16, tilt: 0.10 + s * 0.02, roll: c * 0.05, squash: 1 - Math.abs(c) * 0.05, legs: [s * 0.55, -s * 0.55, s * 0.35, -s * 0.35], headLag: -s * 0.06, hover: 0, phaseRate: 1 };
    // ТОПОТ: тяжёлый шаг, глубокое приседание в опоре, мощный отскок.
    case 'stomp':
      return { bob: (c * 0.5 + 0.5) * 0.34 - 0.2, tilt: 0.14 + Math.abs(s) * 0.06, roll: c * 0.10, squash: 0.86 + (c * 0.5 + 0.5) * 0.16, legs: [Math.max(0, s) * 0.7, Math.max(0, -s) * 0.7, Math.max(0, -s) * 0.45, Math.max(0, s) * 0.45], headLag: -c * 0.10, hover: 0, phaseRate: 0.55 };
    // ПРЫЖКИ: фаза с отрывом от земли и сжатием при приземлении.
    case 'hop':
      return { bob: -Math.max(0, Math.sin(a)) * 0.5, tilt: 0.18 * s, roll: 0.04 * c, squash: 0.82 + (0.5 + 0.5 * Math.cos(a)) * 0.2, legs: [-0.5 * Math.max(0, s), -0.5 * Math.max(0, -s), 0.2, 0.2], headLag: -s * 0.12, hover: Math.max(0, Math.sin(a)) * 0.12, phaseRate: 0.8 };
    // ПОЛЗАНИЕ: корпус перекатывается, конечности поднимаются попарно диагонально.
    case 'crawl':
      return { bob: -Math.abs(c) * 0.08, tilt: 0.05, roll: s * 0.22, squash: 1 - Math.abs(s) * 0.06, legs: [Math.max(0, s) * 0.5, Math.max(0, -s) * 0.5, Math.max(0, s) * 0.5, Math.max(0, -s) * 0.5], headLag: s * 0.05, hover: 0, phaseRate: 1.15 };
    // ПЕРЕТЕКАНИЕ (слизи): тело идёт волной, ног нет, корпус «дышит» объёмом.
    // Фаза подскока смещена на четверть цикла относительно «крадущейся» походки,
    // иначе слизь и скелет двигались синхронно и читались как один и тот же цикл.
    case 'slither':
      return { bob: -(0.5 + 0.5 * s) * 0.16, tilt: 0.03 + s * 0.06, roll: s * 0.14, squash: 0.90 + (0.5 + 0.5 * c) * 0.17, legs: [0, 0, 0, 0], headLag: s * 0.09, hover: 0, phaseRate: 0.7 };
    // ПАРЕНИЕ: тело висит, корпус чуть покачивается, ноги подобраны.
    case 'float':
      return { bob: s * 0.10, tilt: 0.02 * s, roll: 0.05 * c, squash: 1 + s * 0.04, legs: [-0.25 + 0.1 * s, -0.25 - 0.1 * s, -0.2, -0.2], headLag: -s * 0.04, hover: 0.18 + s * 0.06, phaseRate: 0.35 };
    // ПЛЁТ/ПАРЕНИЕ КРЫЛЬЯМИ: взмах даёт вертикальную дугу, корпус рыскает.
    case 'glide':
      return { bob: -Math.abs(s) * 0.22, tilt: 0.08, roll: c * 0.16, squash: 1 - Math.abs(s) * 0.08, legs: [-0.15 - 0.25 * Math.max(0, s), -0.15 - 0.25 * Math.max(0, -s), 0.1, 0.1], headLag: -c * 0.05, hover: Math.max(0, s) * 0.08, phaseRate: 0.5 };
    // ПОЛЗАЮЩИЙ ШАГ (скелеты/тени): тягучий, ноги редко, корпус ниже.
    case 'slink':
      return { bob: -Math.abs(s) * 0.07, tilt: 0.07 + s * 0.04, roll: c * 0.07, squash: 0.96 + (0.5 + 0.5 * c) * 0.07, legs: [s * 0.32, -s * 0.32, s * 0.18, -s * 0.18], headLag: -s * 0.08, hover: 0, phaseRate: 0.6 };
    default:
      return G_ZERO;
  }
}

/** Множитель скорости цикла для походки (медленные гуллы vs быстрые жуки). */
export function gaitPhaseRate(gait: GaitKind): number {
  switch (gait) {
    case 'stomp': return 0.55;
    case 'glide': return 0.5;
    case 'slither': return 0.7;
    case 'slink': return 0.6;
    case 'float': return 0.35;
    case 'hop': return 0.8;
    case 'crawl': return 1.15;
    default: return 1;
  }
}

/**
 * Плавный импульс: 1 в центре c, 0 за пределами окна w (косинус — без изломов,
 * поэтому фазы приседа/толчка стыкуются бесшовно и цикл не «щёлкает»).
 */
function pulse(x: number, c: number, w: number): number {
  const d = Math.abs(x - c) / w;
  if (d >= 1) return 0;
  const s = Math.cos(d * Math.PI * 0.5);
  return s * s;
}

// === АНАТОМИЯ ===
/**
 * Анатомия формы: есть ли ноги/крылья, где таз и шея, насколько массивен корпус.
 *
 * Живёт ЗДЕСЬ (а не в генераторе спрайтов), потому что нужна двум системам
 * сразу: арт печёт по ней изгиб скелета, а движок — прыжок, полёт и поворот.
 * Раньше «скелет» был прописан только в monsterArt, и движок про анатомию
 * монстра не знал вовсе: он не мог отличить прыгуна от ходока, поэтому всем
 * раздавал одну и ту же тряску корпуса.
 */
export interface Anatomy {
  legs: boolean;      // есть ноги (иначе — волновое перетекание корпуса)
  wings: boolean;     // есть крылья
  hipY: number;       // линия таза (0 = верх, 1 = низ)
  neckY: number;      // линия плеч/шеи
  tail: boolean;      // есть хвост (отстаёт от корпуса)
  bulk: number;       // массивность тела 0..1 — задаёт амплитуду изгиба
}

/** Профиль скелета по форме: у кого ноги, у кого крылья, где таз. */
export function anatomyFor(shape: EnemyShape): Anatomy {
  switch (shape) {
    case 'humanoid': case 'skeleton': case 'imp':
      return { legs: true, wings: false, hipY: 0.64, neckY: 0.40, tail: false, bulk: 0.5 };
    case 'golem': case 'gargoyle':
      return { legs: true, wings: true, hipY: 0.62, neckY: 0.38, tail: false, bulk: 0.9 };
    case 'wolf':
      return { legs: true, wings: false, hipY: 0.60, neckY: 0.30, tail: true, bulk: 0.5 };
    case 'spider':
      return { legs: true, wings: false, hipY: 0.52, neckY: 0.36, tail: false, bulk: 0.35 };
    case 'beetle':
      return { legs: true, wings: false, hipY: 0.58, neckY: 0.42, tail: false, bulk: 0.6 };
    case 'bat':
      return { legs: false, wings: true, hipY: 0.60, neckY: 0.38, tail: true, bulk: 0.25 };
    case 'dragon':
      return { legs: true, wings: true, hipY: 0.62, neckY: 0.34, tail: true, bulk: 0.75 };
    case 'blob':
      return { legs: false, wings: false, hipY: 0.70, neckY: 0.45, tail: false, bulk: 0.8 };
    case 'spirit': case 'shadow': case 'eye': case 'crystal':
      return { legs: false, wings: false, hipY: 0.66, neckY: 0.44, tail: false, bulk: 0.4 };
    default:
      return { legs: true, wings: false, hipY: 0.62, neckY: 0.40, tail: false, bulk: 0.5 };
  }
}

/**
 * НОГИ НЕТ — ЗНАЧИТ ПРЫГАЕТ. Бесформенные и беспёрые (слизь, глаз, кристалл,
 * дух, тень) не ходят: у них нет опоры на конечности, поэтому единственная
 * читаемая локомоция — отталкивание всем телом. Парящие (духи/тени/глаза)
 * исключены: они висят в воздухе, прыжок им не нужен.
 */
export function hopsInsteadOfWalking(shape: EnemyShape, gait: GaitKind): boolean {
  if (gait === 'hop') return true;
  const a = anatomyFor(shape);
  if (a.legs || a.wings) return false;
  return gait !== 'float' && gait !== 'glide' && gait !== 'slink';
}

/**
 * МАШЕТ ЛИ КРЫЛОМ. Единое правило для арта и движка: крыло бьёт только в
 * воздушных походках. Каменная гаргулья (stomp) крыльями НЕ машет — она
 * топает, крылья у неё сложены; иначе спрайт крутил бы крыло, пока движок
 * считает её ходоком, и наклон корпуса шёл бы не в такт.
 */
export function flapsWings(shape: EnemyShape, gait: GaitKind): boolean {
  if (!anatomyFor(shape).wings) return false;
  return gait === 'glide' || gait === 'float';
}

// === ПРЫЖОК ===
export interface JumpArc {
  /** 0 = на земле, 1 = высшая точка полёта (доля радиуса подъёма). */
  airborne: number;
  /** Вертикальный масштаб корпуса: >1 вытянулся в толчке, <1 сплющился. */
  squash: number;
}

/**
 * ДУГА ПРЫЖКА. Раньше «прыжок» (походка hop) был просто синусом корпуса: тело
 * симметрично проваливалось НИЖЕ земли и поднималось, тень не реагировала, а
 * фаз приседа и приземления не было вовсе — прыжок читался как качание.
 * Теперь это настоящий прыжок из четырёх фаз: присед → толчок → полёт по
 * параболе → приземление. Чистая математика, поэтому одинаково работает и в
 * спрайте (squash & stretch корпуса), и в движке (подъём тела + реакция тени).
 */
export function jumpArc(p: number): JumpArc {
  const t = ((p % 1) + 1) % 1;
  // Полёт: парабола от 0.30 до 0.86 цикла — толчок быстрый, посадка мягкая.
  const u = Math.min(1, Math.max(0, (t - 0.30) / 0.56));
  const airborne = Math.sin(Math.PI * u);
  const crouch = pulse(t, 0.20, 0.16);   // замах: сел на лапы
  const launch = pulse(t, 0.335, 0.10);  // толчок: вытянулся в струну
  const land = pulse(t, 0.90, 0.13);     // посадка: расплющился
  const squash = 1 + 0.16 * launch - 0.17 * crouch - 0.15 * land;
  return { airborne, squash };
}

// === ВЗМАХ КРЫЛА ===
export interface FlapStroke {
  /** Угол крыла: +1 = крылья вверху, -1 = внизу (арт поворачивает крыло по нему). */
  lift: number;
  /** Пронос крыла вперёд/назад: +1 = раскрыто вперёд, -1 = отведено. */
  sweep: number;
  /** Подъём корпуса на рабочем махе вниз (доля радиуса, минус = вверх). */
  bodyBob: number;
  /** Крен корпуса в взмахе (радианы) — малый: машут крылья, а не корпус. */
  pitch: number;
}

/**
 * Взмах крыла: один полный мах за цикл походки. Мах ВНИЗ — рабочий, поэтому
 * корпус подбрасывает именно под ним (не в крайних точках, как было раньше,
 * когда корпус просто повторял синус угла крыла и «взмывал» вхолостую).
 */
export function flapStroke(p: number): FlapStroke {
  const a = ((p % 1) + 1) % 1 * Math.PI * 2;
  const lift = Math.sin(a);
  const down = Math.max(0, -Math.cos(a));   // 1 = середина маха вниз
  return { lift, sweep: Math.cos(a) * 0.55, bodyBob: -0.22 * down, pitch: -0.06 * lift };
}

/** Дыхание в покое: медленное расширение груди + микро-покачивание. */

export function idleBreath(now: number, seed: number, isBoss: boolean): GaitPose {
  const p = now * (isBoss ? 0.9 : 1.4) + seed;
  return {
    bob: Math.sin(p) * (isBoss ? 0.05 : 0.03),
    tilt: Math.sin(p * 0.6) * 0.02,
    roll: 0,
    squash: 1 + Math.sin(p) * (isBoss ? 0.05 : 0.035),
    legs: [0, 0, 0, 0],
    headLag: Math.sin(p - 0.6) * 0.02,
    hover: 0,
    phaseRate: 1,
  };
}

