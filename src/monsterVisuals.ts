import type { EnemyShape } from './types';

// ============================================================
// ВИЗУАЛ МОНСТРОВ: эмодзи-подписи + процедурный пиксель-арт боссов
// Покрывает ВЕСЬ список монстров из dungeonMonsters.ts и 120 боссов.
// ============================================================

export function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Таблица эмодзи: [эмодзи, ключевые слова...] (порядок важен!)
const EMOJI_RULES: Array<[string, string[]]> = [
  ['🐦‍🔥', ['феникс', 'phoenix']],
  ['🦖', ['тираннозавр', 'tyrann', 'раптор', 'raptor', 'динозавр', 'dinosaur']],
  ['🦈', ['акул', 'shark', 'скат', ' ray']],
  ['🐙', ['кракен', 'kraken', 'щупальц', 'tentacle', 'каракатиц', 'cuttlefish', 'осьминог']],
  ['🪸', ['коралл', 'coral']],
  ['🐟', ['рыб', 'fish', 'мурлок', 'murloc', 'удильщик', 'angler']],
  ['🐡', ['иглобрюх', 'puffer']],
  ['🦀', ['краб', 'crab']],
  ['🐢', ['черепах', 'turtle']],
  ['🐆', ['леопард', 'leopard', 'пантера', 'panther']],
  ['🐺', ['волк', 'wolf', 'ищейка', 'seeker']],
  ['🐕', ['гончая', 'hound', 'пёс', ' dog']],
  ['🐴', ['всадник', 'rider', 'кентавр', 'centaur']],
  ['🐊', ['крокодил', 'crocodile']],
  ['🦎', ['ящер', 'lizard']],
  ['🐍', ['зме', 'гадюк', 'viper', 'нага', 'naga', 'угорь', 'eel', 'serpent']],
  ['🦅', ['грифон', 'gryphon', 'гарпия', 'harpy', 'орел', 'eagle', 'рух', 'roc', 'птеродактиль', 'pterodactyl']],
  ['🕊️', ['чайк', 'gull', 'ворон', 'raven', 'сокол', 'falcon', 'пернат', 'feathered']],
  ['🦍', ['горилл', 'gorilla', 'павиан', 'baboon']],
  ['🐵', ['обезьян', 'monkey']],
  ['👺', ['кобольд', 'kobold']],
  ['🧝', ['эльф', 'elf']],
  ['🧛', ['вампир', 'vampire']],
  ['🧟', ['зомби', 'zombie', 'мумия', 'mummy', 'гуль', 'ghoul', 'мертвец', 'dead', 'кадавр', 'cadaver', 'утопленник', 'drowned', 'сшит']],
  ['💀', ['скелет', 'skeleton', 'костя', 'bone', 'череп']],
  ['☠️', ['жнец', 'reaper', 'смерт', 'death']],
  ['👻', ['призрак', 'ghost', 'привидение', 'apparition', 'фантом', 'phantom', 'дух', 'spirit', 'банши', 'banshee']],
  ['🌑', ['тень', 'shadow', 'тьма']],
  ['😈', ['демон', 'demon', 'бес', 'imp', 'ифрит', 'ifrit', 'суккуб', 'succubus', 'мучитель', 'tormentor']],
  ['👹', ['орк', 'orc', 'огр', 'ogre', 'гоблин', 'goblin', 'людоед', 'циклоп', 'cyclops']],
  ['🧙', ['маг', 'mage', 'чернокнижник', 'warlock', 'колдун', 'шаман', 'shaman', 'жрец', 'priest', 'лич', 'lich', 'некромант']],
  ['⚔️', ['воин', 'warrior', 'дикарь', 'savage', 'копейщик', 'lancer', 'меч', 'sword', 'правосуд']],
  ['🛡️', ['страж', 'guard', 'паладин', 'paladin', 'гвард', 'рыцарь', 'knight', 'щит', 'shield']],
  ['🏹', ['лучник', 'archer', 'арбалет', 'crossbow', 'стрелок', 'shooter', 'marksman', 'мушкет', 'musket', 'охотник', 'hunter']],
  ['🥷', ['сталкер', 'stalker', 'маскир', 'camouflaged']],
  ['🪓', ['палач', 'executioner', 'карат', 'punish']],
  ['⚓', ['матрос', 'sailor', 'адмирал', 'admiral', 'командир', 'commander', 'флот', 'fleet']],
  ['🏴‍☠️', ['пират', 'pirate', 'корсар', 'corsair']],
  ['🔫', ['пушкар', 'gunner', 'лучемет']],
  ['🍳', ['кок', 'cook']],
  ['⛵', ['корабл', 'ship']],
  ['🔱', ['трезуб', 'trident', 'нептун', 'neptune', 'посейдон']],
  ['🧜‍♀️', ['сирен', 'siren', 'русалк', 'mermaid', 'нимфа', 'nymph']],
  ['👼', ['ангел', 'angel', 'серафим', 'seraph']],
  ['🔥', ['огнен', 'fire', 'лавов', 'lava', 'магм', 'magma', 'пламен', 'горящ', 'burning', 'вулканич', 'volcanic']],
  ['⚡', ['грозов', 'storm', 'молни', 'lightning', 'штормов']],
  ['🌊', ['волн', 'wave', 'цунами', 'tsunami', 'хлыст', 'whip', 'океан', 'ocean', 'мор', 'sea']],
  ['🌫️', ['элементаль', 'elemental', 'туман']],
  ['✨', ['искр', 'spark', 'звезд', 'star', 'свет', 'light', 'свят', 'holy', 'радужн']],
  ['☄️', ['комет', 'comet', 'метеор', 'meteor']],
  ['☁️', ['облак', 'cloud', 'туч', 'stormcloud']],
  ['🗿', ['голем', 'golem', 'титан', 'titan', 'исполин', 'colossus', 'статуя', 'statue', 'тотем', 'totem', 'идол', 'idol', 'монолит', 'monolith', 'горгулья', 'gargoyle', 'конструкт', 'construct']],
  ['⚙️', ['механич', 'mechanical', 'заводн', 'clockwork', 'техно', 'techno', 'дрон', 'drone', 'пила', 'saw']],
  ['📜', ['рун', 'runic']],
  ['💎', ['кристалл', 'crystal', 'оскол', 'shard', 'изумрудн', 'emerald']],
  ['🦠', ['паразит', 'parasite']],
  ['🕷️', ['паук', 'spider', 'клещ', 'tick']],
  ['🦂', ['скорпион', 'scorpion']],
  ['🪲', ['жук', 'beetle', 'скарабей', 'scarab']],
  ['🪰', ['муха', ' fly', ' flye', 'оса', 'wasp', 'шмель', 'bumblebee']],
  ['🦇', ['летун', 'flyer', 'flier', 'летучая', ' bat']],
  ['🪱', ['червь', 'worm', 'ползун', 'crawler']],
  ['🌸', ['цветок', 'flower']],
  ['🌿', ['лоза', 'vine', 'корень', 'root', 'мох', 'moss']],
  ['🐸', ['жаб', 'toad']],
  ['🫧', ['тина', 'mire', ' ил', 'silt', 'гряз', 'mud', 'слизень', 'slime', 'желе', 'jelly']],
  ['🧪', ['мутаген', 'mutagen', 'алхим', 'alchem']],
  ['💥', ['взрыв', 'explosive']],
  ['⛓️', ['цеп', 'chain']],
  ['💰', ['золот', 'gold']],
  ['🏺', ['терракот', 'terracotta']],
  ['👤', ['безликий', 'faceless']],
  ['🕯️', ['сектант', 'sectarian', 'вестник', 'harbinger', 'призыват', 'summoner', 'проклят', 'порождение']],
  ['👑', ['корол', 'king', 'владык', 'overlord', 'лорд', 'lord', 'император', 'emperor', 'властелин', 'царь', 'бог ', 'god ']],
];

const SHAPE_EMOJI: Record<EnemyShape, string> = {
  blob: '🟢', spider: '🕷️', bat: '🦇', beetle: '🪲', spirit: '👻',
  shadow: '🌑', gargoyle: '🗿', skeleton: '💀', golem: '🗿', imp: '😈',
  wolf: '🐺', crystal: '💎', humanoid: '👹', eye: '👁️', dragon: '🐉',
};

/** Эмодзи-подпись для монстра/босса по имени и форме. */
export function getMonsterEmoji(name: { ru: string; en: string }, shape: EnemyShape): string {
  const s = (name.ru + '|' + name.en).toLowerCase();
  for (const [emoji, keys] of EMOJI_RULES) {
    for (const k of keys) {
      if (s.includes(k)) return emoji;
    }
  }
  return SHAPE_EMOJI[shape] || '👹';
}

// ============================================================
// ПРОЦЕДУРНЫЙ ПИКСЕЛЬ-АРТ БОССОВ (16×16, зеркальный, детерминированный)
// Ячейки: 0 пусто, 1 основной, 2 контур, 3 глаза(свечение),
//         4 золото(корона/рога), 5 акцент(светлый)
// ============================================================
export function buildBossPattern(id: string, shape: EnemyShape, finalBoss: boolean): number[][] {
  const rng = mulberry32(hashStr(id));
  const g: number[][] = [];
  for (let y = 0; y < 16; y++) g.push(new Array(16).fill(0));

  const put = (x: number, y: number, v: number) => {
    if (x >= 0 && x < 16 && y >= 0 && y < 16 && v > g[y][x]) g[y][x] = v;
  };
  const fillRect = (x0: number, y0: number, x1: number, y1: number, v: number) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) put(x, y, v);
  };
  const fillEllipse = (cx: number, cy: number, rx: number, ry: number, v: number) => {
    for (let y = Math.max(0, Math.floor(cy - ry)); y <= Math.min(15, Math.ceil(cy + ry)); y++) {
      for (let x = Math.max(0, Math.floor(cx - rx)); x <= Math.min(15, Math.ceil(cx + rx)); x++) {
        const dx = (x - cx) / rx, dy = (y - cy) / ry;
        if (dx * dx + dy * dy <= 1) put(x, y, v);
      }
    }
  };
  const mirror = () => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 8; x++) g[y][15 - x] = Math.max(g[y][15 - x], g[y][x]);
  };

  switch (shape) {
    case 'blob':
      fillEllipse(7.5, 9, 6.2, 5.2, 1);
      fillEllipse(7.5, 6, 4.2, 3.2, 1);
      fillEllipse(5, 6, 1.6, 1.2, 5);
      break;
    case 'golem':
      fillRect(5, 2, 10, 5, 1);
      fillRect(3, 6, 12, 12, 1);
      fillRect(1, 6, 2, 11, 1);
      fillRect(13, 6, 14, 11, 1);
      fillRect(4, 13, 6, 15, 1);
      fillRect(9, 13, 11, 15, 1);
      for (let i = 0; i < 4; i++) put(4 + Math.floor(rng() * 8), 7 + Math.floor(rng() * 5), 5);
      break;
    case 'humanoid':
      fillEllipse(7.5, 4, 2.6, 2.6, 1);
      fillRect(4, 7, 11, 11, 1);
      fillRect(2, 7, 3, 10, 1);
      fillRect(12, 7, 13, 10, 1);
      fillRect(5, 12, 6, 15, 1);
      fillRect(9, 12, 10, 15, 1);
      if (rng() > 0.35) { put(4, 2, 4); put(3, 1, 4); }
      break;
    case 'skeleton':
      fillEllipse(7.5, 4, 3.2, 3.0, 1);
      fillRect(6, 9, 9, 12, 1);
      for (let y = 8; y <= 12; y += 2) fillRect(3, y, 12, y, 1);
      fillRect(5, 13, 5, 15, 1); fillRect(10, 13, 10, 15, 1);
      break;
    case 'dragon':
      fillRect(6, 3, 9, 12, 1);
      fillEllipse(7.5, 3, 2.4, 2.2, 1);
      for (let y = 4; y <= 10; y++) { const w = 6 - (y - 4); for (let x = Math.max(0, 5 - w); x <= 4; x++) put(x, y, 1); }
      if (rng() > 0.3) { put(6, 1, 4); put(5, 0, 4); }
      fillRect(7, 13, 8, 15, 1);
      break;
    case 'bat':
    case 'gargoyle':
      fillEllipse(7.5, 6, 2.6, 3.2, 1);
      fillEllipse(7.5, 3, 2.2, 2.0, 1);
      for (let y = 3; y <= 9; y++) { const w = 7 - (y - 3); for (let x = Math.max(0, 6 - w); x <= 5; x++) put(x, y, 1); }
      put(6, 1, 2); put(5, 0, 2);
      fillRect(6, 10, 8, 11, 1);
      break;
    case 'spirit':
    case 'shadow':
      fillEllipse(7.5, 6, 5.0, 4.4, 1);
      for (let x = 3; x <= 12; x++) {
        const len = 2 + Math.floor(rng() * 4);
        for (let y = 9; y < 9 + len && y < 16; y++) put(x, y, 1);
      }
      break;
    case 'eye':
      fillEllipse(7.5, 7.5, 6.4, 6.4, 1);
      fillEllipse(7.5, 7.5, 3.4, 3.4, 5);
      fillEllipse(7.5, 7.5, 1.6, 1.6, 3);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + 0.3;
        put(Math.round(7.5 + Math.cos(a) * 7.2), Math.round(7.5 + Math.sin(a) * 7.2), 2);
      }
      break;
    case 'imp':
      fillEllipse(7.5, 4, 3.0, 2.8, 1);
      fillRect(5, 7, 10, 11, 1);
      put(3, 1, 4); put(2, 0, 4);
      fillRect(7, 12, 8, 14, 1);
      break;
    case 'wolf':
      put(4, 1, 1); put(4, 2, 1); put(3, 0, 1);
      fillEllipse(7.5, 4.5, 3.4, 2.8, 1);
      fillRect(6, 6, 9, 7, 5);
      fillEllipse(7.5, 10, 4.6, 3.6, 1);
      fillRect(4, 13, 5, 15, 1); fillRect(10, 13, 11, 15, 1);
      break;
    case 'crystal':
      for (let y = 1; y <= 14; y++) {
        const w = y <= 7 ? y - 1 : 14 - y;
        for (let x = Math.max(0, 8 - w); x <= Math.min(15, 7 + w); x++) put(x, y, 1);
      }
      put(2, 6, 1); put(2, 7, 1); put(3, 8, 1);
      put(13, 9, 1); put(13, 10, 1); put(12, 11, 1);
      for (let y = 3; y <= 12; y++) put(Math.max(0, 8 - Math.min(5, y - 2)), y, 5);
      break;
    case 'beetle':
      fillEllipse(7.5, 7, 5.6, 4.6, 1);
      fillEllipse(7.5, 13, 2.4, 2.2, 1);
      put(8, 11, 2);
      fillRect(1, 6, 2, 9, 1); fillRect(13, 6, 14, 9, 1);
      put(6, 1, 2); put(9, 1, 2);
      break;
    default:
      fillEllipse(7.5, 8, 5.5, 5.5, 1);
  }

  mirror();

  // Глаза (свечение)
  const eyeY = shape === 'beetle' ? 13 : shape === 'wolf' ? 4 : 4;
  const eyeX = shape === 'blob' ? 5 : 6;
  if (g[eyeY][eyeX] > 0) put(eyeX, eyeY, 3);
  if (g[eyeY][15 - eyeX] > 0) put(15 - eyeX, eyeY, 3);

  // Корона финального босса
  if (finalBoss) {
    for (let x = 4; x <= 11; x++) if (x % 2 === 0) put(x, 0, 4);
    for (let x = 4; x <= 11; x++) put(x, 1, 4);
  }

  // Внешний контур вокруг силуэта
  const out: number[][] = g.map(r => r.slice());
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      if (g[y][x] !== 0) continue;
      const up = y > 0 && g[y - 1][x] > 0;
      const dn = y < 15 && g[y + 1][x] > 0;
      const lf = x > 0 && g[y][x - 1] > 0;
      const rt = x < 15 && g[y][x + 1] > 0;
      if (up || dn || lf || rt) out[y][x] = 2;
    }
  }
  return out;
}

// Оттенок hex-цвета (mult <1 темнее, >1 светлее)
export function shadeColor(hex: string, mult: number): string {
  try {
    const h = hex.replace('#', '');
    const v = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    const cl = (x: number) => Math.max(0, Math.min(255, Math.round(x)));
    return `rgb(${cl(((v >> 16) & 255) * mult)},${cl(((v >> 8) & 255) * mult)},${cl((v & 255) * mult)})`;
  } catch {
    return hex;
  }
}

