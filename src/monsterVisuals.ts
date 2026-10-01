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
      // Enhanced slime blob with more organic shape and internal details
      fillEllipse(7.5, 9, 6.5, 5.5, 1);
      fillEllipse(7.5, 6, 4.5, 3.5, 1);
      fillEllipse(5, 6, 1.8, 1.3, 5);
      // Add internal glow effect
      for (let i = 0; i < 3; i++) {
        const angle = (i / 3) * Math.PI * 2;
        const innerX = 7.5 + Math.cos(angle) * 2.5;
        const innerY = 6 + Math.sin(angle) * 2.5;
        put(Math.round(innerX), Math.round(innerY), 4);
      }
      break;
    case 'golem':
      // Enhanced golem with more detailed armor plates and texture
      fillRect(5, 2, 10, 5, 1);
      fillRect(3, 6, 12, 12, 1);
      fillRect(1, 6, 2, 11, 1);
      fillRect(13, 6, 14, 11, 1);
      fillRect(4, 13, 6, 15, 1);
      fillRect(9, 13, 11, 15, 1);
      // Add more detailed armor plating
      for (let i = 0; i < 6; i++) {
        const x = 4 + Math.floor(rng() * 8);
        const y = 7 + Math.floor(rng() * 5);
        put(x, y, 5);
        // Add rivets and details
        if (rng() > 0.7) put(x, y, 3);
      }
      // Add glowing core
      put(7, 8, 3);
      break;
    case 'humanoid':
      // Enhanced humanoid with detailed armor and features
      fillEllipse(7.5, 4, 2.8, 2.8, 1);
      fillRect(4, 7, 11, 11, 1);
      fillRect(2, 7, 3, 10, 1);
      fillRect(12, 7, 13, 10, 1);
      fillRect(5, 12, 6, 15, 1);
      fillRect(9, 12, 10, 15, 1);
      // Add helmet details
      if (rng() > 0.35) {
        put(4, 2, 4);
        put(3, 1, 4);
        // Add helmet crest
        put(4, 1, 5);
      }
      // Add armor plates
      for (let i = 0; i < 4; i++) {
        const x = 5 + i * 2;
        put(x, 9, 5);
      }
      break;
    case 'skeleton':
      // Enhanced skeleton with more detailed bones and texture
      fillEllipse(7.5, 4, 3.5, 3.2, 1);
      fillRect(6, 9, 9, 12, 1);
      for (let y = 8; y <= 12; y += 2) fillRect(3, y, 12, y, 1);
      fillRect(5, 13, 5, 15, 1); fillRect(10, 13, 10, 15, 1);
      // Add bone fragments and details
      for (let i = 0; i < 6; i++) {
        const x = 4 + Math.floor(rng() * 8);
        const y = 10 + Math.floor(rng() * 3);
        put(x, y, 3);
      }
      break;
    case 'dragon':
      // Enhanced dragon with more detailed scales and wings
      fillRect(6, 3, 9, 12, 1);
      fillEllipse(7.5, 3, 2.6, 2.4, 1);
      for (let y = 4; y <= 10; y++) { const w = 6 - (y - 4); for (let x = Math.max(0, 5 - w); x <= 4; x++) put(x, y, 1); }
      if (rng() > 0.3) { put(6, 1, 4); put(5, 0, 4); }
      fillRect(7, 13, 8, 15, 1);
      // Add more detailed scales and texture
      for (let i = 0; i < 8; i++) {
        const x = 6 + Math.floor(rng() * 3);
        const y = 4 + Math.floor(rng() * 7);
        put(x, y, 2);
      }
      break;
    case 'bat':
    case 'gargoyle':
      // Enhanced bat/gargoyle with more detailed wings and features
      fillEllipse(7.5, 6, 2.8, 3.5, 1);
      fillEllipse(7.5, 3, 2.4, 2.2, 1);
      for (let y = 3; y <= 9; y++) { const w = 7 - (y - 3); for (let x = Math.max(0, 6 - w); x <= 5; x++) put(x, y, 1); }
      put(6, 1, 2); put(5, 0, 2);
      fillRect(6, 10, 8, 11, 1);
      // Add wing details and membranes
      for (let i = 0; i < 4; i++) {
        const wingX = 6 + i * 2;
        for (let y = 3; y <= 9; y++) {
          if (rng() > 0.7) put(wingX, y, 2);
        }
      }
      break;
    case 'spirit':
    case 'shadow':
      // Enhanced spirit/shadow with more ethereal and detailed appearance
      fillEllipse(7.5, 6, 5.2, 4.6, 1);
      for (let x = 3; x <= 12; x++) {
        const len = 2 + Math.floor(rng() * 5);
        for (let y = 9; y < 9 + len && y < 16; y++) put(x, y, 1);
      }
      // Add ghostly tendrils
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 + Math.sin(hashStr(id + i) * 0.1) * 0.3;
        const length = 3 + Math.floor(rng() * 4);
        for (let j = 0; j < length; j++) {
          const tx = Math.round(7.5 + Math.cos(angle) * (j + 1));
          const ty = 9 + j;
          if (tx >= 0 && tx < 16 && ty < 16) put(tx, ty, 2);
        }
      }
      break;
    case 'eye':
      // Enhanced eye with more detailed iris and patterns
      fillEllipse(7.5, 7.5, 6.6, 6.6, 1);
      fillEllipse(7.5, 7.5, 3.6, 3.6, 5);
      fillEllipse(7.5, 7.5, 1.6, 1.6, 3);
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 + 0.3;
        put(Math.round(7.5 + Math.cos(a) * 7.2), Math.round(7.5 + Math.sin(a) * 7.2), 2);
      }
      // Add detailed pupil and iris patterns
      put(7, 7, 1);
      for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2;
        put(Math.round(7.5 + Math.cos(angle) * 2), Math.round(7.5 + Math.sin(angle) * 2), 3);
      }
      break;
    case 'imp':
      // Enhanced imp with more detailed features and demonic appearance
      fillEllipse(7.5, 4, 3.2, 2.9, 1);
      fillRect(5, 7, 10, 11, 1);
      put(3, 1, 4); put(2, 0, 4);
      fillRect(7, 12, 8, 14, 1);
      // Add demonic horns and features
      put(6, 2, 4);
      put(8, 2, 4);
      // Add wings and demonic details
      for (let i = 0; i < 3; i++) {
        const wingX = 6 + i * 2;
        for (let y = 7; y <= 11; y++) {
          if (rng() > 0.6) put(wingX, y, 2);
        }
      }
      break;
    case 'wolf':
      // Enhanced wolf with more detailed fur and features
      put(4, 1, 1); put(4, 2, 1); put(3, 0, 1);
      fillEllipse(7.5, 4.5, 3.6, 2.9, 1);
      fillRect(6, 6, 9, 7, 5);
      fillEllipse(7.5, 10, 4.8, 3.7, 1);
      fillRect(4, 13, 5, 15, 1); fillRect(10, 13, 11, 15, 1);
      // Add fur texture and details
      for (let i = 0; i < 8; i++) {
        const x = 6 + Math.floor(rng() * 3);
        const y = 6 + Math.floor(rng() * 2);
        put(x, y, 5);
      }
      // Add detailed eyes and teeth
      put(6, 4, 1);
      put(8, 4, 1);
      break;
    case 'crystal':
      // Enhanced crystal with more detailed geometric patterns
      for (let y = 1; y <= 14; y++) {
        const w = y <= 7 ? y - 1 : 14 - y;
        for (let x = Math.max(0, 8 - w); x <= Math.min(15, 7 + w); x++) put(x, y, 1);
      }
      put(2, 6, 1); put(2, 7, 1); put(3, 8, 1);
      put(13, 9, 1); put(13, 10, 1); put(12, 11, 1);
      for (let y = 3; y <= 12; y++) put(Math.max(0, 8 - Math.min(5, y - 2)), y, 5);
      // Add crystal facets and internal glow
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const facetX = Math.round(7.5 + Math.cos(angle) * 6);
        const facetY = Math.round(7.5 + Math.sin(angle) * 6);
        put(facetX, facetY, 3);
      }
      break;
    case 'beetle':
      // Enhanced beetle with more detailed shell and features
      fillEllipse(7.5, 7, 5.8, 4.7, 1);
      fillEllipse(7.5, 13, 2.6, 2.3, 1);
      put(8, 11, 2);
      fillRect(1, 6, 2, 9, 1); fillRect(13, 6, 14, 9, 1);
      put(6, 1, 2); put(9, 1, 2);
      // Add beetle shell details and patterns
      for (let i = 0; i < 5; i++) {
        const spotX = 2 + i * 2;
        const spotY = 7 + Math.floor(rng() * 5);
        put(spotX, spotY, 2);
      }
      break;
    default:
      // Enhanced default blob with more organic shape
      fillEllipse(7.5, 8, 5.8, 5.8, 1);
      // Add internal details
      for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2;
        const innerX = 7.5 + Math.cos(angle) * 2;
        const innerY = 8 + Math.sin(angle) * 2;
        put(Math.round(innerX), Math.round(innerY), 4);
      }
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

// Оттенок hex-цвета (mult <1 темнее, >1 светлее).
// ВАЖНО: возвращаем ТОЛЬКО '#rrggbb'. Палитра спрайтов (buildPalette) отдаёт эти
// строки: (а) в канву как fillStyle и (б) в разборщики '#rrggbb' — combatEngine
// .fillU32 (parseInt(hex.slice(1),16)) и инструменты превью. Формат `rgb(r,g,b)`
// ломал оба: fillU32 получал NaN → пиксель рисовался БЕЛЫМ, а идущая следом
// покраска «подсветка → base + '55'» давала 'rgb(...,...)55' и портила сетку.
export function shadeColor(hex: string, mult: number): string {
  try {
    const h = hex.replace('#', '');
    const v = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    if (!Number.isFinite(v)) return hex;
    const cl = (x: number) => Math.max(0, Math.min(255, Math.round(x)));
    const r = cl(((v >> 16) & 255) * mult);
    const g = cl(((v >> 8) & 255) * mult);
    const b = cl((v & 255) * mult);
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  } catch {
    return hex;
  }
}

