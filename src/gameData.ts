import type { CharacterDef, DungeonDef, EnemyDef, PotionDef, BagLevelDef, SaveProfile, EnemyShape, EnemyAttackType, GaitKind } from './types';
import type { WeaponKit } from './monsterArt';
import { DUNGEON_MONSTERS } from './dungeonMonsters';
import { bossColor, monsterColor, resolveBossShape, resolveMonsterShape, rollTraits, themeFor, gaitForShape } from './dungeonIdentity';

export const CHARACTERS: CharacterDef[] = [
  {
    id: 'warrior',
    name: { ru: 'Воин', en: 'Warrior' },
    description: { ru: 'Прочный боец ближнего боя с мечом', en: 'Sturdy melee fighter with sword' },
    cost: 0,
    baseHealth: 150,
    baseStamina: 100,
    baseDamage: 25,
    baseSpeed: 2.2,
    color: '#c89b3c',
    weaponIcon: 'sword',
    hasUniqueRMB: true,
    skills: [
      {
        id: 'w_slash',
        name: { ru: 'Стальной Вихрь', en: 'Steel Slash' },
        description: { ru: 'Базовый удар мечом по дуге', en: 'Basic sword slash in an arc' },
        cost: 0,
        type: 'active-main',
        staminaCost: 8,
        icon: 'skill_warrior_slash',
      },
      {
        id: 'w_charge',
        name: { ru: 'Тяжёлый Прорыв', en: 'Heavy Charge' },
        description: { ru: 'Рывок вперёд, наносящий урон и оглушающий', en: 'Dash forward dealing damage and stunning' },
        cost: 200,
        type: 'active-unique',
        staminaCost: 25,
        icon: 'skill_warrior_charge',
        requires: 'w_slash',
      },
      {
        id: 'w_ironhide',
        name: { ru: 'Каменная Кожа', en: 'Iron Hide' },
        description: { ru: 'Пассивно увеличивает броню на 30%', en: 'Passively increases armor by 30%' },
        cost: 450,
        type: 'passive',
        staminaCost: 0,
        icon: 'skill_warrior_ironhide',
        requires: 'w_charge',
      },
      {
        id: 'w_secondwind',
        name: { ru: 'Второе Дыхание', en: 'Second Wind' },
        description: { ru: 'Пассивно ускоряет регенерацию выносливости', en: 'Passively speeds up stamina regeneration' },
        cost: 800,
        type: 'passive',
        staminaCost: 0,
        icon: 'skill_warrior_secondwind',
        requires: 'w_ironhide',
      },
      {
        id: 'w_earthwrath',
        name: { ru: 'Гнев Земли', en: 'Earth Wrath' },
        description: { ru: 'Пассивно увеличивает урон на 40%', en: 'Passively increases damage by 40%' },
        cost: 1500,
        type: 'passive',
        staminaCost: 0,
        icon: 'skill_warrior_earthwrath',
        requires: 'w_secondwind',
      },
    ],
  },
  {
    id: 'archer',
    name: { ru: 'Лучник', en: 'Archer' },
    description: { ru: 'Мастер дальнего боя с заряжаемым луком', en: 'Master of ranged combat with chargeable bow' },
    cost: 800,
    baseHealth: 100,
    baseStamina: 120,
    baseDamage: 20,
    baseSpeed: 2.5,
    color: '#3c9b6e',
    weaponIcon: 'bow',
    hasUniqueRMB: true,
    skills: [
      {
        id: 'a_shot',
        name: { ru: 'Быстрая Стрела', en: 'Quick Shot' },
        description: { ru: 'Базовый выстрел стрелой', en: 'Basic arrow shot' },
        cost: 0,
        type: 'active-main',
        staminaCost: 6,
        icon: 'skill_archer_shot',
      },
      {
        id: 'a_rapid',
        name: { ru: 'Ливень Стрел', en: 'Arrow Rain' },
        description: { ru: 'Выпуск залпа стрел в небо, падающих на врагов', en: 'Volley of arrows raining down on enemies' },
        cost: 200,
        type: 'active-unique',
        staminaCost: 30,
        icon: 'skill_archer_rain',
        requires: 'a_shot',
      },
      {
        id: 'a_hawk',
        name: { ru: 'Око Ястреба', en: 'Hawk Eye' },
        description: { ru: 'Пассивно увеличивает дальность на 40%', en: 'Passively increases range by 40%' },
        cost: 450,
        type: 'passive',
        staminaCost: 0,
        icon: 'skill_archer_hawkeye',
        requires: 'a_rapid',
      },
      {
        id: 'a_swift',
        name: { ru: 'Ветер в Ногах', en: 'Swift Wind' },
        description: { ru: 'Пассивно увеличивает скорость на 25%', en: 'Passively increases speed by 25%' },
        cost: 800,
        type: 'passive',
        staminaCost: 0,
        icon: 'skill_archer_swift',
        requires: 'a_hawk',
      },
      {
        id: 'a_storm',
        name: { ru: 'Шторм Клинков', en: 'Blade Storm' },
        description: { ru: 'Пассивно увеличивает урон на 45%', en: 'Passively increases damage by 45%' },
        cost: 1500,
        type: 'passive',
        staminaCost: 0,
        icon: 'skill_archer_storm',
        requires: 'a_swift',
      },
    ],
  },
  {
    id: 'mage',
    name: { ru: 'Маг', en: 'Mage' },
    description: { ru: 'Повелитель тайной магии и огненных шаров', en: 'Wielder of arcane magic and fireballs' },
    cost: 1200,
    baseHealth: 80,
    baseStamina: 150,
    baseDamage: 30,
    baseSpeed: 2.0,
    color: '#3c6ec8',
    weaponIcon: 'staff',
    hasUniqueRMB: true,
    skills: [
      {
        id: 'm_bolt',
        name: { ru: 'Молния', en: 'Lightning Bolt' },
        description: { ru: 'Базовый магический снаряд', en: 'Basic magic projectile' },
        cost: 0,
        type: 'active-main',
        staminaCost: 7,
        icon: 'skill_mage_bolt',
      },
      {
        id: 'm_nova',
        name: { ru: 'Ледяная Нова', en: 'Frost Nova' },
        description: { ru: 'Взрыв льда вокруг мага, замедляющий всех врагов', en: 'Ice explosion around mage, slowing all enemies' },
        cost: 200,
        type: 'active-unique',
        staminaCost: 35,
        icon: 'skill_mage_nova',
        requires: 'm_bolt',
      },
      {
        id: 'm_barrier',
        name: { ru: 'Магический Барьер', en: 'Magic Barrier' },
        description: { ru: 'Пассивно поглощает 20% входящего урона', en: 'Passively absorbs 20% of incoming damage' },
        cost: 450,
        type: 'passive',
        staminaCost: 0,
        icon: 'skill_mage_barrier',
        requires: 'm_nova',
      },
      {
        id: 'm_mana',
        name: { ru: 'Поток Маны', en: 'Mana Flow' },
        description: { ru: 'Пассивно ускоряет регенерацию выносливости', en: 'Passively speeds up stamina regeneration' },
        cost: 800,
        type: 'passive',
        staminaCost: 0,
        icon: 'skill_mage_manaflow',
        requires: 'm_barrier',
      },
      {
        id: 'm_apex',
        name: { ru: 'Вершина Магии', en: 'Arcane Apex' },
        description: { ru: 'Пассивно увеличивает урон на 50%', en: 'Passively increases damage by 50%' },
        cost: 1500,
        type: 'passive',
        staminaCost: 0,
        icon: 'skill_mage_apex',
        requires: 'm_mana',
      },
    ],
  },
  {
    id: 'assassin',
    name: { ru: 'Убийца', en: 'Assassin' },
    description: { ru: 'Быстрый убийца с цепью и серпом', en: 'Fast killer with chain and sickle' },
    cost: 2000,
    baseHealth: 90,
    baseStamina: 110,
    baseDamage: 28,
    baseSpeed: 2.8,
    color: '#9b3c3c',
    weaponIcon: 'chain',
    hasUniqueRMB: true,
    skills: [
      {
        id: 's_chain',
        name: { ru: 'Удар Цепью и Серпом', en: 'Chain Strike & Sickle' },
        description: { ru: 'ЛКМ — удар цепью с притягиванием к врагу. ПКМ — удар серпом по полу-дуге', en: 'LMB — chain strike that pulls you to the enemy. RMB — sickle swing along a semi-arc' },
        cost: 0,
        type: 'active-main',
        staminaCost: 6,
        icon: 'skill_assassin_chain',
      },
      {
        id: 's_sickle',
        name: { ru: 'Удар Серпом', en: 'Sickle Strike' },
        description: { ru: 'Удар серпом по полу-дуге: серп плавно описывает дугу и возвращается назад. Урон только при касании серпом врага. Привязка: ПКМ', en: 'Sickle swing along a semi-arc: the sickle sweeps forward and returns. Damage only on contact. Bound to RMB' },
        cost: 0,
        type: 'active-unique',
        staminaCost: 12,
        icon: 'skill_assassin_sickle',
      },
      {
        id: 's_shadowstep',
        name: { ru: 'Теневой Шаг', en: 'Shadowstep' },
        description: { ru: 'Пассивно увеличивает скорость на 35%', en: 'Passively increases speed by 35%' },
        cost: 200,
        type: 'passive',
        staminaCost: 0,
        icon: 'skill_assassin_shadowstep',
        requires: 's_sickle',
      },
      {
        id: 's_poison',
        name: { ru: 'Ядовитый Серп', en: 'Poisoned Sickle' },
        description: { ru: 'Пассивно добавляет урон ядом в течение 3 сек', en: 'Passively adds poison damage over 3 sec' },
        cost: 450,
        type: 'passive',
        staminaCost: 0,
        icon: 'skill_assassin_poison',
        requires: 's_shadowstep',
      },
      {
        id: 's_lifesteal',
        name: { ru: 'Кровавый Вампиризм', en: 'Blood Leech' },
        description: { ru: 'Пассивно восстанавливает ХП при попадании', en: 'Passively heals HP on hit' },
        cost: 800,
        type: 'passive',
        staminaCost: 0,
        icon: 'skill_assassin_lifesteal',
        requires: 's_poison',
      },
      {
        id: 's_deathmark',
        name: { ru: 'Метка Смерти', en: 'Death Mark' },
        description: { ru: 'Пассивно увеличивает урон на 55%', en: 'Passively increases damage by 55%' },
        cost: 1500,
        type: 'passive',
        staminaCost: 0,
        icon: 'skill_assassin_deathmark',
        requires: 's_lifesteal',
      },
    ],
  },
];

export const DUNGEONS: DungeonDef[] = [
  {
    id: 'whispering_grove',
    name: { ru: 'Шепчущая Чаща', en: 'Whispering Grove' },
    description: { ru: 'Древний лес, где слизни, орки и огры сталкиваются с эльфами и циклопами', en: 'Ancient grove where slimes, orcs and ogres clash with elves and cyclopes' },
    unlockCost: 0,
    minLevel: 1,
    bgGradient: ['#4a7c3a', '#2d5016'],
    enemyTypes: ['slime', 'goblin', 'wolf', 'elf', 'cyclops'],
    bossId: 'whispering_grove_boss_1',
    bossIds: [],
    icon: 'dungeon_grove',
  },
  {
    id: 'gnomish_ruins',
    name: { ru: 'Древние Руины Гномов', en: 'Gnomish Ancient Ruins' },
    description: { ru: 'Затерянные руины древних гномов с механизмами и кристаллами', en: 'Lost ruins of ancient gnomes with mechanisms and crystals' },
    unlockCost: 500,
    minLevel: 5,
    bgGradient: ['#5a4a6a', '#2d203a'],
    enemyTypes: ['rat', 'gnome_zombie', 'spider', 'skeleton', 'crystal'],
    bossId: 'gnomish_ruins_boss_1',
    bossIds: [],
    icon: 'dungeon_ruins',
  },
  {
    id: 'necropolis',
    name: { ru: 'Некрополь Зла', en: 'Necropolis of Evil' },
    description: { ru: 'Мрачный город мёртвых, где воскрешаются тьмыю', en: 'Grim city of the dead, revived by darkness' },
    unlockCost: 1500,
    minLevel: 10,
    bgGradient: ['#1a0a2a', '#050010'],
    enemyTypes: ['skeleton', 'zombie', 'rat', 'phantom', 'ghost'],
    bossId: 'necropolis_boss_1',
    bossIds: [],
    icon: 'dungeon_necropolis',
  },
  {
    id: 'idol_jungle',
    name: { ru: 'Джунгли Идол-КараВ', en: 'Idol-Car Jungle' },
    description: { ru: 'Дикие джунгли с кобольдами, змеями и древними идолами', en: 'Wild jungle with kobolds, snakes and ancient idols' },
    unlockCost: 3000,
    minLevel: 20,
    bgGradient: ['#2d7a1a', '#1a4a10'],
    enemyTypes: ['flower', 'leopard', 'kobold', 'crocodile', 'monkey'],
    bossId: 'idol_jungle_boss_1',
    bossIds: [],
    icon: 'dungeon_jungle',
  },
  {
    id: 'sunken_fleet',
    name: { ru: 'Затонувший Флот', en: 'Sunken Fleet' },
    description: { ru: 'Потонувшие корабли с пиратами, сиренами и глубинными чудовищами', en: 'Sunken ships with pirates, sirens and deep-sea monsters' },
    unlockCost: 6000,
    minLevel: 35,
    bgGradient: ['#1a4a7a', '#052040'],
    enemyTypes: ['sailor', 'seagull', 'siren', 'tentacle', 'shark'],
    bossId: 'sunken_fleet_boss_1',
    bossIds: [],
    icon: 'dungeon_fleet',
  },
  {
    id: 'sky_citadel',
    name: { ru: 'Небесная Цитадель', en: 'Sky Citadel' },
    description: { ru: 'Вожушающаяся цитадель в небесах с ангелами, демонами и драконами', en: 'Floating citadel among the clouds with angels, demons and dragons' },
    unlockCost: 12000,
    minLevel: 50,
    bgGradient: ['#3a2a6a', '#100520'],
    enemyTypes: ['gryphon', 'fallen_angel', 'demon', 'wyvern', 'dragon'],
    bossId: 'sky_citadel_boss_1',
    bossIds: [],
    icon: 'dungeon_sky',
  },
];

export const ENEMIES: Record<string, EnemyDef> = {
  // === BASIC ENEMIES (wave 1+) ===
  slime: {
    id: 'slime', name: { ru: 'Слизень', en: 'Slime' }, health: 30, damage: 5, speed: 0.8,
    expReward: 5, goldReward: 3, color: '#5fbf3f', radius: 14, isBoss: false, attackType: 'melee', sellPrice: 0, icon: 'enemy_slime', minWave: 1,
    element: 'poison',
    shape: 'blob', dungeonId: 'green_field',
  },
  goblin: {
    id: 'goblin', name: { ru: 'Гоблин', en: 'Goblin' }, health: 50, damage: 8, speed: 1.4,
    expReward: 8, goldReward: 5, color: '#8b6f3f', radius: 12, isBoss: false, attackType: 'melee', sellPrice: 0, icon: 'enemy_goblin', minWave: 1,
    element: 'poison',
    shape: 'humanoid', dungeonId: 'green_field',
  },
  wolf: {
    id: 'wolf', name: { ru: 'Волк', en: 'Wolf' }, health: 40, damage: 10, speed: 2.0,
    expReward: 7, goldReward: 4, color: '#6a6a6a', radius: 13, isBoss: false, attackType: 'charger', sellPrice: 0, icon: 'enemy_wolf', minWave: 1,
    element: 'poison',
    shape: 'wolf', dungeonId: 'green_field',
  },
  spider: {
    id: 'spider', name: { ru: 'Паук', en: 'Spider' }, health: 35, damage: 7, speed: 1.6,
    expReward: 6, goldReward: 4, color: '#3a2a1a', radius: 12, isBoss: false, attackType: 'melee', sellPrice: 0, icon: 'enemy_spider', minWave: 1,
    element: 'poison',
    shape: 'spider', dungeonId: 'dark_forest',
  },
  // === WAVE 3+ ENEMIES ===
  bat: {
    id: 'bat', name: { ru: 'Летучая Мышь', en: 'Bat' }, health: 25, damage: 6, speed: 2.2,
    expReward: 5, goldReward: 3, color: '#4a2a4a', radius: 10, isBoss: false, attackType: 'ranged', sellPrice: 0, icon: 'enemy_bat', minWave: 3,
    element: 'dark',
    shape: 'bat', dungeonId: 'caves',
  },
  skeleton: {
    id: 'skeleton', name: { ru: 'Скелет-Лучник', en: 'Skeleton Archer' }, health: 60, damage: 12, speed: 1.3,
    expReward: 10, goldReward: 7, color: '#c0c0a0', radius: 13, isBoss: false, attackType: 'ranged', sellPrice: 0, icon: 'enemy_skeleton', minWave: 3,
    element: 'ice',
    shape: 'skeleton', dungeonId: 'ancient_ruins',
  },
  // === WAVE 6+ ENEMIES ===
  troll: {
    id: 'troll', name: { ru: 'Тролль', en: 'Troll' }, health: 80, damage: 15, speed: 1.0,
    expReward: 12, goldReward: 8, color: '#5a7a4a', radius: 18, isBoss: false, attackType: 'melee', sellPrice: 0, icon: 'enemy_troll', minWave: 6,
    element: 'poison',
    shape: 'golem', dungeonId: 'caves',
  },
  imp: {
    id: 'imp', name: { ru: 'Бес-Огнемёт', en: 'Fire Imp' }, health: 55, damage: 13, speed: 2.0,
    expReward: 10, goldReward: 8, color: '#bf3f3f', radius: 12, isBoss: false, attackType: 'ranged', sellPrice: 0, icon: 'enemy_imp', minWave: 6,
    element: 'fire',
    shape: 'imp', dungeonId: 'volcano',
  },
  // === WAVE 9+ ENEMIES ===
  golem: {
    id: 'golem', name: { ru: 'Голем', en: 'Golem' }, health: 120, damage: 18, speed: 0.7,
    expReward: 15, goldReward: 12, color: '#8a7a6a', radius: 20, isBoss: false, attackType: 'melee', sellPrice: 0, icon: 'enemy_golem', minWave: 9,
    element: 'ice',
    shape: 'golem', dungeonId: 'ancient_ruins',
  },
  wraith: {
    id: 'wraith', name: { ru: 'Призрак', en: 'Wraith' }, health: 70, damage: 14, speed: 1.8,
    expReward: 12, goldReward: 9, color: '#6a4a8a', radius: 14, isBoss: false, attackType: 'ranged', sellPrice: 0, icon: 'enemy_wraith', minWave: 9,
    element: 'dark',
    shape: 'shadow', dungeonId: 'abyss',
  },
  // === WAVE 12+ ENEMIES ===
  salamander: {
    id: 'salamander', name: { ru: 'Саламандра', en: 'Salamander' }, health: 90, damage: 16, speed: 1.5,
    expReward: 14, goldReward: 10, color: '#df5f2f', radius: 15, isBoss: false, attackType: 'charger', sellPrice: 0, icon: 'enemy_salamander', minWave: 12,
    element: 'fire',
    shape: 'imp', dungeonId: 'volcano',
  },
  demon: {
    id: 'demon', name: { ru: 'Демон', en: 'Demon' }, health: 100, damage: 20, speed: 1.7,
    expReward: 18, goldReward: 15, color: '#8a1a1a', radius: 17, isBoss: false, attackType: 'melee', sellPrice: 0, icon: 'enemy_demon', minWave: 12,
    element: 'fire',
    shape: 'humanoid', dungeonId: 'abyss',
  },
  // === WAVE 15+ ENEMIES ===
  dark_knight: {
    id: 'dark_knight', name: { ru: 'Тёмный Рыцарь', en: 'Dark Knight' }, health: 130, damage: 22, speed: 1.4,
    expReward: 20, goldReward: 16, color: '#3a3a4a', radius: 16, isBoss: false, attackType: 'charger', sellPrice: 0, icon: 'enemy_dark_knight', minWave: 15,
    element: 'dark',
    shape: 'humanoid', dungeonId: 'ancient_ruins',
  },
  crystal_mage: {
    id: 'crystal_mage', name: { ru: 'Кристальный Маг', en: 'Crystal Mage' }, health: 85, damage: 18, speed: 1.2,
    expReward: 18, goldReward: 14, color: '#3aaacc', radius: 14, isBoss: false, attackType: 'ranged', sellPrice: 0, icon: 'enemy_crystal_mage', minWave: 15,
    element: 'ice',
    shape: 'crystal', dungeonId: 'caves',
  },
  // === WAVE 20+ ENEMIES ===
  hellhound: {
    id: 'hellhound', name: { ru: 'Адский Пёс', en: 'Hellhound' }, health: 110, damage: 24, speed: 2.2,
    expReward: 22, goldReward: 18, color: '#df2f0f', radius: 15, isBoss: false, attackType: 'charger', sellPrice: 0, icon: 'enemy_hellhound', minWave: 20,
    element: 'fire',
    shape: 'wolf', dungeonId: 'volcano',
  },
  shadow_archer: {
    id: 'shadow_archer', name: { ru: 'Теневой Лучник', en: 'Shadow Archer' }, health: 95, damage: 20, speed: 1.6,
    expReward: 20, goldReward: 16, color: '#2a1a3a', radius: 13, isBoss: false, attackType: 'ranged', sellPrice: 0, icon: 'enemy_shadow_archer', minWave: 20,
    element: 'dark',
    shape: 'humanoid', dungeonId: 'abyss',
  },
  // === WAVE 30+ ENEMIES ===
  ice_lancer: {
    id: 'ice_lancer', name: { ru: 'Ледяной Копейщик', en: 'Ice Lancer' }, health: 150, damage: 26, speed: 1.5,
    expReward: 25, goldReward: 20, color: '#5fcfff', radius: 16, isBoss: false, attackType: 'ranged', sellPrice: 0, icon: 'enemy_ice_lancer', minWave: 30,
    element: 'ice',
    shape: 'humanoid', dungeonId: 'caves',
  },
  void_reaper: {
    id: 'void_reaper', name: { ru: 'Жнец Пустоты', en: 'Void Reaper' }, health: 180, damage: 30, speed: 1.9,
    expReward: 30, goldReward: 25, color: '#1a0a2a', radius: 18, isBoss: false, attackType: 'charger', sellPrice: 0, icon: 'enemy_void_reaper', minWave: 30,
    element: 'dark',
    shape: 'shadow', dungeonId: 'abyss',
  },
  // === WAVE 40+ ENEMIES ===
  magma_brute: {
    id: 'magma_brute', name: { ru: 'Магмовый Громила', en: 'Magma Brute' }, health: 220, damage: 32, speed: 1.1,
    expReward: 35, goldReward: 28, color: '#df5f1f', radius: 22, isBoss: false, attackType: 'melee', sellPrice: 0, icon: 'enemy_magma_brute', minWave: 40,
    element: 'fire',
    shape: 'golem', dungeonId: 'volcano',
  },
  storm_caller: {
    id: 'storm_caller', name: { ru: 'Призыватель Бури', en: 'Storm Caller' }, health: 160, damage: 28, speed: 1.3,
    expReward: 32, goldReward: 26, color: '#cfcf3f', radius: 15, isBoss: false, attackType: 'ranged', sellPrice: 0, icon: 'enemy_storm_caller', minWave: 40,
    element: 'storm',
    shape: 'humanoid', dungeonId: 'ancient_ruins',
  },
  // === WAVE 50+ ENEMIES ===
  abyss_knight: {
    id: 'abyss_knight', name: { ru: 'Рыцарь Бездны', en: 'Abyss Knight' }, health: 280, damage: 36, speed: 1.6,
    expReward: 40, goldReward: 35, color: '#0a0a1a', radius: 19, isBoss: false, attackType: 'charger', sellPrice: 0, icon: 'enemy_abyss_knight', minWave: 50,
    element: 'dark',
    shape: 'humanoid', dungeonId: 'abyss',
  },
  soul_harvester: {
    id: 'soul_harvester', name: { ru: 'Жнец Душ', en: 'Soul Harvester' }, health: 200, damage: 34, speed: 1.4,
    expReward: 38, goldReward: 30, color: '#5a0a5a', radius: 17, isBoss: false, attackType: 'ranged', sellPrice: 0, icon: 'enemy_soul_harvester', minWave: 50,
    element: 'dark',
    shape: 'eye', dungeonId: 'abyss',
  },

  // === BOSSES (every 5 waves, unique per dungeon) ===
  field_boss: {
    id: 'field_boss', name: { ru: 'Хозяин Полей', en: 'Field Lord' }, health: 300, damage: 15, speed: 1.0,
    expReward: 50, goldReward: 40, color: '#3faf2f', radius: 28, isBoss: true, attackType: 'melee',
    ability: { ru: 'Призывает слизней каждые 5 сек', en: 'Summons slimes every 5 sec' },
    sellPrice: 100, icon: 'boss_field', minWave: 5, shape: 'blob', dungeonId: 'green_field',
    element: 'poison',
  },
  forest_boss: {
    id: 'forest_boss', name: { ru: 'Лесной Страж', en: 'Forest Warden' }, health: 500, damage: 20, speed: 1.2,
    expReward: 80, goldReward: 60, color: '#1f7f1f', radius: 30, isBoss: true, attackType: 'ranged',
    ability: { ru: 'Телепортируется и атакует пауками', en: 'Teleports and attacks with spiders' },
    sellPrice: 200, icon: 'boss_forest', minWave: 5, shape: 'spider', dungeonId: 'dark_forest',
    element: 'poison',
  },
  cave_boss: {
    id: 'cave_boss', name: { ru: 'Король Пещер', en: 'Cave King' }, health: 700, damage: 25, speed: 0.9,
    expReward: 120, goldReward: 90, color: '#7a5a3a', radius: 32, isBoss: true, attackType: 'charger',
    ability: { ru: 'Рывок с оглушением', en: 'Charge with stun' },
    sellPrice: 350, icon: 'boss_cave', minWave: 5, shape: 'golem', dungeonId: 'caves',
    element: 'ice',
  },
  ruins_boss: {
    id: 'ruins_boss', name: { ru: 'Древний Страж', en: 'Ancient Guardian' }, health: 1000, damage: 30, speed: 1.1,
    expReward: 180, goldReward: 140, color: '#7a5a8a', radius: 34, isBoss: true, attackType: 'melee',
    ability: { ru: 'AoE удар по земле', en: 'AoE ground slam' },
    sellPrice: 600, icon: 'boss_ruins', minWave: 5, shape: 'gargoyle', dungeonId: 'ancient_ruins',
    element: 'storm',
  },
  volcano_boss: {
    id: 'volcano_boss', name: { ru: 'Лавовый Титан', en: 'Lava Titan' }, health: 1400, damage: 35, speed: 1.0,
    expReward: 250, goldReward: 200, color: '#df3f1f', radius: 36, isBoss: true, attackType: 'ranged',
    ability: { ru: 'Метеоритный дождь', en: 'Meteor rain' },
    sellPrice: 1000, icon: 'boss_volcano', minWave: 5, shape: 'golem', dungeonId: 'volcano',
    element: 'fire',
  },
  abyss_boss: {
    id: 'abyss_boss', name: { ru: 'Владыка Бездны', en: 'Abyss Lord' }, health: 2000, damage: 45, speed: 1.3,
    expReward: 400, goldReward: 350, color: '#5a0a8a', radius: 38, isBoss: true, attackType: 'ranged',
    ability: { ru: 'Дальние теневые атаки', en: 'Ranged shadow attacks' },
    sellPrice: 2000, icon: 'boss_abyss', minWave: 5, shape: 'eye', dungeonId: 'abyss',
    element: 'dark',
  },
  field_boss_2: {
    id: 'field_boss_2', name: { ru: 'Гоблин-Вождь', en: 'Goblin Chieftain' }, health: 450, damage: 18, speed: 1.5,
    expReward: 70, goldReward: 55, color: '#bf8f3f', radius: 26, isBoss: true, attackType: 'charger',
    ability: { ru: 'Боевой рёв: бафает союзников', en: 'War cry: buffs allies' },
    sellPrice: 150, icon: 'boss_field_2', minWave: 10, shape: 'humanoid', dungeonId: 'green_field',
    element: 'poison',
  },
  forest_boss_2: {
    id: 'forest_boss_2', name: { ru: 'Паучья Королева', en: 'Spider Queen' }, health: 650, damage: 22, speed: 1.1,
    expReward: 100, goldReward: 75, color: '#5a2a1a', radius: 30, isBoss: true, attackType: 'ranged',
    ability: { ru: 'Паутина: замедляет игрока', en: 'Web: slows the player' },
    sellPrice: 250, icon: 'boss_forest_2', minWave: 10, shape: 'spider', dungeonId: 'dark_forest',
    element: 'poison',
  },
  cave_boss_2: {
    id: 'cave_boss_2', name: { ru: 'Каменный Колосс', en: 'Stone Colossus' }, health: 900, damage: 28, speed: 0.7,
    expReward: 140, goldReward: 100, color: '#6a5a4a', radius: 36, isBoss: true, attackType: 'melee',
    ability: { ru: 'Камнепад с потолка', en: 'Rockfall from ceiling' },
    sellPrice: 400, icon: 'boss_cave_2', minWave: 10, shape: 'golem', dungeonId: 'caves',
    element: 'ice',
  },
  ruins_boss_2: {
    id: 'ruins_boss_2', name: { ru: 'Дух Хранителя', en: 'Guardian Spirit' }, health: 1200, damage: 32, speed: 1.4,
    expReward: 200, goldReward: 160, color: '#9a7aba', radius: 32, isBoss: true, attackType: 'ranged',
    ability: { ru: 'Призрачные снаряды', en: 'Spectral projectiles' },
    sellPrice: 700, icon: 'boss_ruins_2', minWave: 15, shape: 'spirit', dungeonId: 'ancient_ruins',
    element: 'dark',
  },
  volcano_boss_2: {
    id: 'volcano_boss_2', name: { ru: 'Огненный Демон', en: 'Fire Demon' }, health: 1600, damage: 38, speed: 1.6,
    expReward: 280, goldReward: 220, color: '#df1f1f', radius: 34, isBoss: true, attackType: 'charger',
    ability: { ru: 'Огненный рывок', en: 'Fiery charge' },
    sellPrice: 1100, icon: 'boss_volcano_2', minWave: 20, shape: 'imp', dungeonId: 'volcano',
    element: 'fire',
  },
  abyss_boss_2: {
    id: 'abyss_boss_2', name: { ru: 'Теневой Владыка', en: 'Shadow Sovereign' }, health: 2400, damage: 48, speed: 1.5,
    expReward: 450, goldReward: 400, color: '#3a0a5a', radius: 40, isBoss: true, attackType: 'ranged',
    ability: { ru: 'Теневые копья', en: 'Shadow spears' },
    sellPrice: 2200, icon: 'boss_abyss_2', minWave: 25, shape: 'spirit', dungeonId: 'abyss',
    element: 'dark',
  },
};

export const POTIONS: PotionDef[] = [
  {
    id: 'health',
    name: { ru: 'Зелье Здоровья', en: 'Health Potion' },
    description: { ru: 'Мгновенно восстанавливает 60 ХП', en: 'Instantly restores 60 HP' },
    cost: 50,
    icon: 'potion_health',
    hotkey: '1',
  },
  {
    id: 'stamina',
    name: { ru: 'Зелье Выносливости', en: 'Stamina Potion' },
    description: { ru: 'Мгновенно восстанавливает 50 выносливости', en: 'Instantly restores 50 stamina' },
    cost: 40,
    icon: 'potion_stamina',
    hotkey: '2',
  },
  {
    id: 'revival',
    name: { ru: 'Зелье Возрождения', en: 'Revival Elixir' },
    description: { ru: 'При смерти оживляет с 50% ХП', en: 'On death, revives with 50% HP' },
    cost: 1500,
    icon: 'potion_revival',
  },
];

export const BAG_LEVELS: BagLevelDef[] = [
  { level: 1, capacity: 1, cost: 0 },
  { level: 2, capacity: 2, cost: 300 },
  { level: 3, capacity: 3, cost: 800 },
  { level: 4, capacity: 5, cost: 2000 },
];

export function createDefaultProfile(): SaveProfile {
  return {
    platform: null,
    language: 'ru',
    gameMode: 'easy',
    gold: 0,
    level: 1,
    exp: 0,
    ownedCharacters: ['warrior'],
    equippedCharacter: 'warrior',
    unlockedSkills: {
      warrior: ['w_slash'],
      archer: ['a_shot'],
      mage: ['m_bolt'],
      assassin: ['s_chain', 's_sickle'],
    },
    ownedPotions: { health: 0, stamina: 0, revival: 0 },
    bagLevel: 1,
    bag: [],
    trophies: [],
    dungeonProgress: {},
    unlockedDungeons: ['whispering_grove'],
    equippedDungeons: ['whispering_grove'],
    totalWavesCleared: 0,
    settings: {
      brightness: 100,
      volume: 70,
      controlScheme: 'wasd',
      soundEnabled: true,
    },
    hasSeenIntro: false,
    talentLevels: {
      warrior: { damage: 0, health: 0 },
      archer: { damage: 0, health: 0 },
      mage: { damage: 0, health: 0 },
      assassin: { damage: 0, health: 0 },
    },
  };
}

export const MAX_WAVES = 100;
export const BOSS_WAVE_INTERVAL = 5;
export const STAMINA_REGEN_RATE = 8;
export const STAMINA_REGEN_SECOND_WIND = 15;
export const HEALTH_REGEN_RATE = 0.5;
export const POTION_HEALTH_AMOUNT = 60;
export const POTION_STAMINA_AMOUNT = 50;
// === POTION CAPACITY — max you may own at once (buying beyond this is refused) ===
export const POTION_MAX_HEALTH = 3;
export const POTION_MAX_STAMINA = 3;
export const POTION_MAX_REVIVAL = 1;
export const POTION_MAX_BY_ID: Record<'health' | 'stamina' | 'revival', number> = {
  health: POTION_MAX_HEALTH,
  stamina: POTION_MAX_STAMINA,
  revival: POTION_MAX_REVIVAL,
};
export const REVIVAL_HP_PERCENT = 0.5;
export const EXP_PER_LEVEL = 100;
export const EXP_LEVEL_MULTIPLIER = 1.3;
export const POTION_COOLDOWN = 30;
// === БАЛАНС: ЗДОРОВЬЕ и УРОН врагов растут РАЗНЫМИ темпами ===
// Раньше и здоровье, и урон шли одной кривой (+8% за волну). К 100-й волне
// множитель урона доходил до ~9x при 150 HP у героя — один удар = смерть,
// пройти игру было физически невозможно. Теперь здоровье растёт заметно
// (бой становится длиннее и интереснее), а урон — в разы медленнее: враг
// остаётся угрозой, но не сносит героя с ног.
export const WAVE_HEALTH_MULTIPLIER = 0.045;      // обычный режим: +4.5% HP за волну
export const WAVE_DAMAGE_MULTIPLIER = 0.018;      // обычный режим: +1.8% DMG за волну
export const HARD_WAVE_HEALTH_MULTIPLIER = 0.07;  // сложный: +7% HP за волну
export const HARD_WAVE_DAMAGE_MULTIPLIER = 0.03; // сложный: +3% DMG за волну
// Боссы растут ещё положе: их собственная кривая уже учитывает номер босса.
export const BOSS_WAVE_HEALTH_MULTIPLIER = 0.015;
// Урон босса по волне: 0.010 → 0.015. Причина — у боссов ПОЧИНИЛИ попадание
// (окно контакта ×2.2, дальность ×1.3, личное оружие с длинным хватом) и добавили
// личный ритм боя. Раньше удар 200-пиксельного босса почти никогда не засчитывался,
// поэтому «страшные» цифры в таблице были теорией: босс махал мимо, и его можно
// было убивать в упор. Теперь урон реально доходит, поэтому он поднят умеренно:
// босс ощутимо наказывает за ошибку, но с полного здоровья убивает не мгновенно.
export const BOSS_WAVE_DAMAGE_MULTIPLIER = 0.015;
export const HARD_BOSS_WAVE_HEALTH_MULTIPLIER = 0.025;
export const HARD_BOSS_WAVE_DAMAGE_MULTIPLIER = 0.028;
export const HARD_HEALTH_MULTIPLIER = 1.35;
export const HARD_DAMAGE_MULTIPLIER = 1.2;
export const REVIVAL_POTION_COST = 1500;

// Золото за волну тоже растёт: цена таланта должна расти «в той же пропорции»,
// что и доход. Множитель золота повторяет кривую здоровья волны, поэтому
// одна и та же доля заработка всегда стоит одинаковое число покупок.
export const GOLD_WAVE_MULTIPLIER = 0.045;

// Скорость врага растёт, но С ПОТОЛКА: раньше к 100-й волне тварь ускорялась
// почти втрое и обгоняла героя, ломая гарантию «от любой погони можно уйти».
export const WAVE_SPEED_MULTIPLIER = 0.008;
export const WAVE_SPEED_MULTIPLIER_MAX = 0.55;

// Рост героя за уровень опыта. Раньше опыт не давал НИЧЕГО, поэтому таланты
// за золото были единственным источником силы — и волны 40+ были непроходимы.
export const PLAYER_DAMAGE_PER_LEVEL = 0.10;
export const PLAYER_HEALTH_PER_LEVEL = 0.12;

// === ТАЛАНТЫ: +15% к урону и макс. здоровью за уровень ===
// Первая покупка — ровно 100 золота. Дальше цена растёт по двум осям:
//   • за каждый купленный уровень (+35% от базы) — иначе можно было бы
//     прокачать талант до бесконечности за первую же волну;
//   • за каждую пройденную волну (+3%) — примерно так же, насколько растёт
//     золото, которое капает после волны (врагов становится больше, а
//     у них дороже награда). Цена держит тот же «темп» прогрессии, что и доход.
export const TALENT_BASE_COST = 100;
export const TALENT_BONUS_PER_LEVEL = 0.15;
export const TALENT_COST_LEVEL_GROWTH = 0.35;
export const TALENT_COST_WAVE_GROWTH = 0.03;

/** Цена следующего уровня таланта. level — текущий уровень, wavesCleared — пройденные волны. */
export function talentCost(level: number, wavesCleared: number): number {
  const perLevel = 1 + Math.max(0, level) * TALENT_COST_LEVEL_GROWTH;
  const perWave = 1 + Math.max(0, wavesCleared) * TALENT_COST_WAVE_GROWTH;
  return Math.round((TALENT_BASE_COST * perLevel * perWave) / 5) * 5;
}

// === PROCEDURAL ENEMY GENERATION ===
// Each dungeon has base enemy shapes. Every 2 waves a new tier unlocks (1 melee + 1 ranged).
// Names auto-generated with prefixes. Color shifted via hue-rotate per tier.

interface DungeonBaseShapes {
  melee: EnemyShape;
  ranged: EnemyShape;
  colors: [string, string]; // [melee base color, ranged base color]
}

const DUNGEON_SHAPES: Record<string, DungeonBaseShapes> = {
  whispering_grove: { melee: 'blob', ranged: 'beetle', colors: ['#5fbf3f', '#8bbf3f'] },
  gnomish_ruins: { melee: 'humanoid', ranged: 'crystal', colors: ['#8a7a6a', '#5a8a7a'] },
  necropolis: { melee: 'skeleton', ranged: 'shadow', colors: ['#c0c0a0', '#6a4a8a'] },
  idol_jungle: { melee: 'wolf', ranged: 'blob', colors: ['#3f8a2f', '#8abf3f'] },
  sunken_fleet: { melee: 'humanoid', ranged: 'eye', colors: ['#3a6a9a', '#2a8a9a'] },
  sky_citadel: { melee: 'gargoyle', ranged: 'dragon', colors: ['#8a8abf', '#bf8a3f'] },
};

const TIER_PREFIXES_RU = ['Молодой', 'Закалённый', 'Древний', 'Лорд'];
const TIER_PREFIXES_EN = ['Young', 'Hardened', 'Ancient', 'Lord'];

// Generate procedural enemies for a dungeon at a given tier (every 2 waves)
export function generateTierEnemies(dungeonId: string, tier: number): EnemyDef[] {
    const shapes = DUNGEON_SHAPES[dungeonId] || DUNGEON_SHAPES.whispering_grove;
  const prefixIdx = Math.min(tier, TIER_PREFIXES_RU.length - 1);
  const hueShift = tier * 18; // +18 degrees per tier
  const statMult = 1 + tier * 0.25;

  const baseNameRu = shapes.melee === 'blob' ? 'Слизень' :
    shapes.melee === 'spider' ? 'Паук' :
    shapes.melee === 'bat' ? 'Летучая Мышь' :
    shapes.melee === 'gargoyle' ? 'Горгулья' :
    shapes.melee === 'golem' ? 'Голем' :
    shapes.melee === 'eye' ? 'Око' : 'Создание';
  const baseNameEn = shapes.melee === 'blob' ? 'Slime' :
    shapes.melee === 'spider' ? 'Spider' :
    shapes.melee === 'bat' ? 'Bat' :
    shapes.melee === 'gargoyle' ? 'Gargoyle' :
    shapes.melee === 'golem' ? 'Golem' :
    shapes.melee === 'eye' ? 'Eye' : 'Creature';

  const rangedNameRu = shapes.ranged === 'beetle' ? 'Жук' :
    shapes.ranged === 'shadow' ? 'Тень' :
    shapes.ranged === 'crystal' ? 'Кристалл' :
    shapes.ranged === 'skeleton' ? 'Скелет' :
    shapes.ranged === 'imp' ? 'Бес' :
    shapes.ranged === 'spirit' ? 'Дух' : 'Создание';
  const rangedNameEn = shapes.ranged === 'beetle' ? 'Beetle' :
    shapes.ranged === 'shadow' ? 'Shadow' :
    shapes.ranged === 'crystal' ? 'Crystal' :
    shapes.ranged === 'skeleton' ? 'Skeleton' :
    shapes.ranged === 'imp' ? 'Imp' :
    shapes.ranged === 'spirit' ? 'Spirit' : 'Creature';

  const meleeId = `${dungeonId}_t${tier}_melee`;
  const rangedId = `${dungeonId}_t${tier}_ranged`;

  const melee: EnemyDef = {
    id: meleeId,
    name: { ru: `${TIER_PREFIXES_RU[prefixIdx]} ${baseNameRu}`, en: `${TIER_PREFIXES_EN[prefixIdx]} ${baseNameEn}` },
    health: Math.floor(30 * statMult),
    damage: Math.floor(6 * statMult),
    speed: 0.8 + tier * 0.1,
    expReward: 5 + tier * 3,
    goldReward: 3 + tier * 2,
    color: shapes.colors[0],
    radius: 13 + tier * 0.5,
    isBoss: false,
    attackType: 'melee',
    sellPrice: 0,
    icon: `enemy_${dungeonId}_t${tier}_m`,
    minWave: 1 + tier * 2,
    shape: shapes.melee,
    dungeonId,
    hueShift,
  };

  const ranged: EnemyDef = {
    id: rangedId,
    name: { ru: `${TIER_PREFIXES_RU[prefixIdx]} ${rangedNameRu}`, en: `${TIER_PREFIXES_EN[prefixIdx]} ${rangedNameEn}` },
    health: Math.floor(25 * statMult),
    damage: Math.floor(5 * statMult),
    speed: 1.2 + tier * 0.1,
    expReward: 5 + tier * 3,
    goldReward: 3 + tier * 2,
    color: shapes.colors[1],
    radius: 11 + tier * 0.5,
    isBoss: false,
    attackType: 'ranged',
    sellPrice: 0,
    icon: `enemy_${dungeonId}_t${tier}_r`,
    minWave: 1 + tier * 2,
    shape: shapes.ranged,
    dungeonId,
    hueShift,
  };

  return [melee, ranged];
}

// Generate all procedural enemies for a dungeon (tiers 0..49 for waves 1..99)
export function generateAllTierEnemies(dungeonId: string): EnemyDef[] {
  const result: EnemyDef[] = [];
  for (let tier = 0; tier < 50; tier++) {
    result.push(...generateTierEnemies(dungeonId, tier));
  }
  return result;
}

// === NAMED DUNGEON MONSTERS ===
// Generates the exact named monsters for each dungeon from DUNGEON_MONSTERS,
// grouped into blocks of 4 waves (1-4, 6-9, 11-14, ... 96-99).
export function generateNamedDungeonEnemies(dungeonId: string): EnemyDef[] {
  const list = DUNGEON_MONSTERS[dungeonId];
  if (!list || list.length === 0) return [];
  const theme = themeFor(dungeonId);
  const shapes = DUNGEON_SHAPES[dungeonId] || DUNGEON_SHAPES.whispering_grove;
  const dg = DUNGEONS.find(d => d.id === dungeonId);
  const baseColor = dg?.bgGradient[0] || theme.body;
  const id = `${dungeonId}_m_`;
  // 25 blocks of 4 waves: 1-4, 6-9, 11-14, ... Each block holds 2-4 monsters.
  const blocks = 25;
  const perBlock = Math.ceil(list.length / blocks);
  const result: EnemyDef[] = [];

  for (let block = 0; block < blocks; block++) {
    const blockStart = block * perBlock;
    const blockEnd = Math.min(list.length, blockStart + perBlock);
    // Wave where this block first appears (block 0 → wave 1, block 1 → wave 6, block 2 → wave 11, ...)
    const firstWave = block === 0 ? 1 : block * 5 + 1;

    for (let i = blockStart; i < blockEnd; i++) {
      const m = list[i];
      const statMult = 1 + block * 0.45;
      const isRanged = m.attackType === 'ranged';
      const isCharger = m.attackType === 'charger';
      // ФОРМА: только из пула этого подземелья (иначе берём по слову в имени).
      const shape = resolveMonsterShape(theme, m.shape, m.ru, m.en, i);
      // ЦВЕТ: базовый цвет темы со сдвигом оттенка по тиру — каждый тир выглядит иначе.
      const hueShift = Math.floor(block / 2) * 22;
      const monsterId = `${id}${i}`;
      const def: EnemyDef = {
        id: monsterId,
        name: { ru: m.ru, en: m.en },
        health: Math.floor((isCharger ? 45 : isRanged ? 30 : 38) * statMult),
        damage: Math.floor((isRanged ? 8 : isCharger ? 11 : 9) * statMult),
        speed: isCharger ? 1.45 + block * 0.03 : isRanged ? 1.1 + block * 0.01 : 1.2 + block * 0.02,
        expReward: 5 + block * 4,
        goldReward: 3 + block * 3,
        color: monsterColor(theme, hueShift, isRanged),
        radius: (isCharger ? 14 : isRanged ? 12 : 13) + block * 0.2,
        isBoss: false,
        attackType: m.attackType,
        sellPrice: 0,
        icon: `enemy_${dungeonId}_${i}`,
        minWave: firstWave,
        shape,
        dungeonId,
        // Tier for hue-rotate/emoji variation: changes every 2 blocks (every 2 bosses)
        hueShift,
        // Мутации силуэта: детерминированы по id → у каждого монстра свой облик.
        traits: rollTraits(theme, monsterId, false, shape),
        // Семейство походки подземелья → своя анимация движения в каждом подземелье.
        gait: theme.gait,
      };
      result.push(def);
    }
  }
  return result;
}

// === PROCEDURAL BOSS GENERATION ===
// 20 bosses per dungeon (waves 5, 10, 15... 100). Wave 100 = final boss.
const BOSS_ABILITY_POOL: { ru: string; en: string }[] = [
  { ru: 'Деление на 3 копии при HP < 50%', en: 'Splits into 3 copies at HP < 50%' },
  { ru: 'Обездвиживание корнями на 2 сек', en: 'Roots immobilize for 2 sec' },
  { ru: 'Веер снарядов в 8 направлениях', en: 'Fan of projectiles in 8 directions' },
  { ru: 'Уход в невидимость', en: 'Turns invisible' },
  { ru: 'Оглушающий крик с отбрасыванием', en: 'Stunning scream with knockback' },
  { ru: 'Метеориты тьмы с неба', en: 'Dark meteors from sky' },
  { ru: 'Эхо прошлых волн: призывает монстров из последних 5 волн', en: 'Echo of past waves: summons monsters from the last 5 waves' },
  { ru: 'Уход под землю (неуязвимость)', en: 'Burrows underground (invulnerable)' },
  { ru: 'Шипы: возврат части урона', en: 'Thorns: reflects damage' },
  { ru: 'Каменная форма: неуязвимость + регенерация', en: 'Stone form: invulnerable + regen' },
  { ru: 'Вихрь клинков', en: 'Blade vortex' },
  { ru: 'Зыбучий песок под ногами', en: 'Quicksand underfoot' },
  { ru: 'Огненный рывок с выжиганием', en: 'Fiery charge with burning' },
  { ru: 'Маркеры прицела + метеоры', en: 'Target markers + meteors' },
  { ru: 'Превращение в яйцо (воскрешение)', en: 'Turns into egg (revives)' },
  { ru: 'Толстый лазерный луч', en: 'Thick laser beam' },
  { ru: 'Инверсия клавиш на 3 сек', en: 'Key inversion for 3 sec' },
  { ru: 'Притягивание щупальцами', en: 'Tentacle pull' },
  { ru: 'Кольцевые снаряды во все стороны', en: 'Ring projectiles in all directions' },
  { ru: 'Финальная сущность: случайное умение', en: 'Final entity: random ability' },
];

const BOSS_NAMES_RU: string[][] = [
  // 1. Шепчущая Чаща (Слизни, Орки, Огры, Эльфы, Циклопы)
  ['Желейный Король', 'Магма-Желе', 'Гарг Клыкастый', 'Вождь Громмак', 'Дробитель Черепов',
   'Колдун Чо-Галл', 'Следопыт Иллидан', 'Чародейка Малфурия', 'Одноглазый Брут', 'Громовержец Полифем',
   'Исполинский Кислотник', 'Палач Кровавого Клыка', 'Железнобрюх', 'Лорд Кель', 'Бронированный Титан',
   'Радужный Оливер', 'Гулдан Разрушитель', 'Древний Людоед Корог', 'Полубог Кенарий', 'Лесной Бог Сильванус'],
  // 2. Древние Руины Гномов
  ['Дробитель', 'Шахтер Грюм', 'Плавщик', 'Железный Горн', 'Осколок',
   'Камнегрыз', 'Барон Брок', 'Стальной Клык', 'Суховей', 'Архитектор Руин',
   'Рудный Ужас', 'Искровед', 'Базальт', 'Мрак', 'Главный Мастер',
   'Изумрудный Огонь', 'Стальной Титан', 'Генерал Бэлин', 'Вулканиум', 'Каменный Король Тор'],
  // 3. Некрополь Зла
  ['Костеглод', 'Капитан Морг', 'Охотник Ночи', 'Черный Дворецкий', 'Жрец Малхор',
   'Объект №9', 'Граф фон Смерть', 'Кровавая Графиня', 'Чумной Пророк', 'Газовый Ужас',
   'Палач Душ', 'Королева Банши', 'Лорд Гробниц', 'Костяной Царь', 'Жнец Косы',
   'Владыка Бездны', 'Гниющий Дракон', 'Генерал Некрос', 'Синдра', 'Архилич Малакар'],
  // 4. Джунгли Идол-КараВ
  ['Зеленый Людоед', 'Вожак Кобольдов', 'Охотник Челюсть', 'Жабий Король', 'Королева Ос',
   'Анаконда-Убийца', 'Пророк Клыков', 'Страж Тотема', 'Древесный дух Лозобрюх', 'Болотная Ведьма',
   'Громила Балу', 'Вождь Угу', 'Изумрудный Крылан', 'Зеленый Клык', 'Король Ящеров',
   'Чешуйчатый Титан', 'Хранитель Оазиса', 'Магистр Змей', 'Пернатый Ужас', 'Змей Кукулькан'],
  // 5. Затонувший Флот
  ['Одноглазый Джо', 'Призрак Барбоссы', 'Нереида', 'Морская Ведьма Урсула', 'Щупальцебес',
   'Левиафан Глубин', 'Вождь Мурлоков Мура', 'Посейдонис', 'Белая Смерть', 'Дейви Джонс',
   'Королева Воронок Сильфия', 'Младший Кракен', 'Принц Наг Назарий', 'Капитан Черная Борода', 'Медуза Горгона',
   'Древний Тритон', 'Императрица Азшара', 'Призрак Фрегата', 'Царь Нептун', 'Великий Кракен Пожиратель'],
  // 6. Небесная Цитадель
  ['Вожак Стаи Скай', 'Железный Коготь', 'Кастиэль', 'Архангел Гавриил', 'Адская Гончая Бальзак',
   'Повелитель Ужаса Баал', 'Лазурный Клык', 'Сапфирон Штормовой', 'Магма-Титан Пирос', 'Серафим Уриил',
   'Владыка Смерчей Стрибог', 'Иллидан Небесный', 'Зеленый Властелин Изэра', 'Архангел Михаил', 'Владыка Инферно Асмодей',
   'Нефариан Тёмный', 'Хранитель Света Люцифер', 'Владыка Тьмы Диабло', 'Королева Драконов Алекстраза', 'Бог Небес Зевс Олимпиец'],
];

const BOSS_NAMES_EN: string[][] = [
  // 1. Whispering Grove
  ['Jelly King', 'Magma Jelly', 'Fang Garg', 'Warchief Grommak', 'Skull Crusher',
   'Warlock Cho-Gall', 'Ranger Illidan', 'Sorceress Malfuria', 'One-Eyed Brute', 'Thunderer Polyphemus',
   'Colossal Acidic One', 'Blood Fang Executioner', 'Iron Belly', 'Lord Kel', 'Armored Titan',
   'Rainbow Oliver', 'Guldan the Destroyer', 'Ancient Maneater Korog', 'Demigod Cenarius', 'Forest God Silvanus'],
  // 2. Gnomish Ancient Ruins
  ['Crusher', 'Miner Grum', 'Smelter', 'Iron Forge', 'Shard',
   'Stonegnaw', 'Baron Brock', 'Steel Fang', 'Dry Wind', 'Architect of Ruins',
   'Ore Horror', 'Sparkseer', 'Basalt', 'Gloom', 'Grand Master',
   'Emerald Fire', 'Steel Titan', 'General Belin', 'Volcanium', 'Stone King Thor'],
  // 3. Necropolis of Evil
  ['Bonegnaw', 'Captain Morg', 'Night Hunter', 'Black Butler', 'Priest Malhor',
   'Subject #9', 'Count von Death', 'Blood Countess', 'Plague Prophet', 'Gas Horror',
   'Soul Executioner', 'Banshee Queen', 'Lord of Tombs', 'Bone Tsar', 'Reaper of Scythes',
   'Abyss Overlord', 'Rotting Dragon', 'General Necros', 'Sindragosa', 'Archlich Malakar'],
  // 4. Idol-Car Jungle
  ['Green Maneater', 'Kobold Alpha', 'Jaw Hunter', 'Toad King', 'Wasp Queen',
   'Anaconda Assassin', 'Fang Prophet', 'Totem Guardian', 'Vinebelly Tree Spirit', 'Swamp Witch',
   'Brute Balu', 'Chief Ugu', 'Emerald Wyvern', 'Green Fang', 'Lizard King',
   'Scaled Titan', 'Oasis Keeper', 'Serpent Magister', 'Feathered Horror', 'Serpent Kukulkan'],
  // 5. Sunken Fleet
  ['One-Eyed Joe', 'Ghost of Barbossa', 'Nereid', 'Sea Witch Ursula', 'Tentacle Fiend',
   'Leviathan of the Deep', 'Murloc Chief Mura', 'Poseidonis', 'White Death', 'Davy Jones',
   'Maelstrom Queen Sylphia', 'Young Kraken', 'Naga Prince Nazarius', 'Captain Blackbeard', 'Medusa Gorgon',
   'Ancient Triton', 'Empress Azshara', 'Ghost Frigate', 'Tsar Neptune', 'Great Kraken Devourer'],
  // 6. Sky Citadel
  ['Sky Pack Alpha', 'Iron Claw', 'Castiel', 'Archangel Gabriel', 'Hellhound Balzak',
   'Dread Lord Baal', 'Azure Fang', 'Sapphiron the Stormy', 'Magma Titan Pyros', 'Seraph Uriel',
   'Storm Lord Stribog', 'Illidan the Celestial', 'Green Lord Ysera', 'Archangel Michael', 'Inferno Lord Asmodeus',
   'Nefarian the Dark', 'Light Keeper Lucifer', 'Dark Lord Diablo', 'Dragon Queen Alexstrasza', 'Sky God Zeus Olympian'],
];

const DUNGEON_ORDER = ['whispering_grove', 'gnomish_ruins', 'necropolis', 'idol_jungle', 'sunken_fleet', 'sky_citadel'];

const FINAL_BOSS_SHAPES: Record<string, EnemyShape> = {
  whispering_grove: 'humanoid',
  gnomish_ruins: 'golem',
  necropolis: 'dragon',
  idol_jungle: 'dragon',
  sunken_fleet: 'dragon',
  sky_citadel: 'dragon',
};

const BOSS_SHAPES_BY_DUNGEON: Record<string, EnemyShape[]> = {
  // 1. Шепчущая Чаща: слизни → орки → огры → эльфы → циклопы
  whispering_grove: ['blob', 'blob', 'humanoid', 'humanoid', 'golem',
    'humanoid', 'humanoid', 'humanoid', 'golem', 'humanoid',
    'blob', 'humanoid', 'golem', 'humanoid', 'golem',
    'blob', 'humanoid', 'golem', 'humanoid', 'humanoid'],
  // 2. Древние Руины Гномов: крысы, гномы, механизмы, элементали, маги
  gnomish_ruins: ['wolf', 'spirit', 'blob', 'golem', 'crystal',
    'skeleton', 'humanoid', 'golem', 'spirit', 'humanoid',
    'beetle', 'humanoid', 'golem', 'shadow', 'imp',
    'dragon', 'golem', 'spirit', 'imp', 'golem'],
  // 3. Некрополь Зла: гули, скелеты, призраки, вампиры, личи, драконы
  necropolis: ['humanoid', 'skeleton', 'bat', 'spirit', 'humanoid',
    'humanoid', 'humanoid', 'humanoid', 'humanoid', 'spirit',
    'imp', 'spirit', 'humanoid', 'golem', 'gargoyle',
    'shadow', 'dragon', 'humanoid', 'dragon', 'spirit'],
  // 4. Джунгли Идол-КараВ: цветы, ящеры, змеи, обезьяны, динозавры
  idol_jungle: ['blob', 'humanoid', 'wolf', 'blob', 'beetle',
    'dragon', 'humanoid', 'golem', 'golem', 'spirit',
    'humanoid', 'spirit', 'dragon', 'spider', 'humanoid',
    'dragon', 'golem', 'humanoid', 'dragon', 'dragon'],
  // 5. Затонувший Флот: пираты, утопленники, сирены, кракены, наги
  sunken_fleet: ['humanoid', 'spirit', 'humanoid', 'spirit', 'eye',
    'eye', 'humanoid', 'humanoid', 'wolf', 'spirit',
    'spirit', 'eye', 'humanoid', 'humanoid', 'humanoid',
    'humanoid', 'humanoid', 'spirit', 'humanoid', 'eye'],
  // 6. Небесная Цитадель: грифоны, ангелы, демоны, виверны, драконы
  sky_citadel: ['gargoyle', 'gargoyle', 'humanoid', 'humanoid', 'wolf',
    'humanoid', 'dragon', 'dragon', 'golem', 'humanoid',
    'humanoid', 'humanoid', 'dragon', 'humanoid', 'imp',
    'dragon', 'humanoid', 'dragon', 'dragon', 'humanoid'],
};

// ============================================================
// ЛИЧНОСТЬ БОССА: личное оружие + его имя, регалии, аура, ритм боя и походка.
// Всё считается от id босса (одинаково между запусками), поэтому два босса не
// совпадают ни по оружию, ни по силуэту регалий, ни по темпу анимации — даже
// если у них одна форма и один цвет.
// ============================================================
function bossHash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** Оружие по анатомии: в руках у силуэта оказывается то, что ему «идёт». */
const BOSS_WEAPON_BY_SHAPE: Partial<Record<EnemyShape, WeaponKit[]>> = {
  humanoid: ['sword', 'axe', 'halberd', 'mace', 'hammer', 'scythe', 'spear', 'banner', 'shield'],
  skeleton: ['sword', 'scythe', 'spear', 'shield', 'dagger', 'book'],
  golem: ['hammer', 'mace', 'club', 'shield', 'banner'],
  blob: ['orb', 'whip', 'claw'],
  spider: ['claw', 'whip', 'dagger'],
  wolf: ['claw', 'dagger', 'axe'],
  bat: ['claw', 'dagger', 'whip'],
  spirit: ['staff', 'scythe', 'book', 'orb'],
  shadow: ['scythe', 'dagger', 'whip'],
  crystal: ['staff', 'orb', 'spear'],
  gargoyle: ['spear', 'trident', 'halberd'],
  imp: ['torch', 'dagger', 'staff'],
  eye: ['staff', 'orb', 'book'],
  beetle: ['spear', 'halberd', 'club'],
  dragon: ['trident', 'halberd', 'staff', 'orb'],
};
/** Дистанционные боссы стреляют из дальнобойного оружия, а не машут мечом. */
const BOSS_RANGED_WEAPONS: WeaponKit[] = ['bow', 'crossbow', 'staff', 'orb', 'book'];
/** Боссы-тараны идут в бой с длинным колющим оружием. */
const BOSS_CHARGE_WEAPONS: WeaponKit[] = ['spear', 'halberd', 'trident', 'banner'];
/** Финальный босс — только «легендарное» оружие. */
const FINAL_BOSS_WEAPONS: WeaponKit[] = ['trident', 'scythe', 'halberd', 'staff', 'torch'];

/** Имена личного оружия по набору — у каждого босса своё. */
const WEAPON_NAMES: Partial<Record<WeaponKit, { ru: string; en: string }[]>> = {
  sword: [{ ru: 'Погибель Душ', en: 'Soulbane' }, { ru: 'Клятворез', en: 'Oathcleaver' }, { ru: 'Зарёванный Клинок', en: 'Dawnblade' }],
  axe: [{ ru: 'Кровопийца', en: 'Bloodquench' }, { ru: 'Раздор', en: 'Strife' }, { ru: 'Головосек', en: 'Headripper' }],
  halberd: [{ ru: 'Гибельная Грань', en: 'Doomedge' }, { ru: 'Дробитель Врат', en: 'Gatebreaker' }, { ru: 'Страж Погибели', en: 'Warden of Ruin' }],
  mace: [{ ru: 'Молот Костей', en: 'Bonehammer' }, { ru: 'Сокрушитель', en: 'Shatterer' }],
  hammer: [{ ru: 'Кузнь Грома', en: 'Thunderforge' }, { ru: 'Могильный Молот', en: 'Gravehammer' }],
  spear: [{ ru: 'Клык Бездны', en: 'Abyssfang' }, { ru: 'Жало Зари', en: 'Dawnspike' }, { ru: 'Прокол Титанов', en: 'Titanpiercer' }],
  scythe: [{ ru: 'Жатва Стенаний', en: 'Harvest of Wails' }, { ru: 'Последний Серп', en: 'Last Reaper' }],
  dagger: [{ ru: 'Шёпот Тьмы', en: 'Whisper of Dark' }, { ru: 'Крысиный Клык', en: 'Ratfang' }],
  claw: [{ ru: 'Рвущая Длань', en: 'Rending Palm' }, { ru: 'Когти Гнева', en: 'Claws of Wrath' }],
  whip: [{ ru: 'Плеть Мучений', en: 'Lash of Torment' }, { ru: 'Хлыст Бездны', en: 'Abyss Lash' }],
  staff: [{ ru: 'Посох Проклятий', en: 'Staff of Ruin' }, { ru: 'Гнев Стихий', en: 'Elemental Wrath' }, { ru: 'Венец Гроз', en: 'Crown of Storms' }],
  orb: [{ ru: 'Око Пустоты', en: 'Void Eye' }, { ru: 'Ядро Погибели', en: 'Doom Core' }],
  book: [{ ru: 'Книга Имён', en: 'Tome of Names' }, { ru: 'Свиток Рока', en: 'Scroll of Fate' }],
  torch: [{ ru: 'Пламя Погибели', en: 'Doomflame' }, { ru: 'Вечный Костёр', en: 'Everburn' }],
  bow: [{ ru: 'Стрел Гнева', en: 'Bane Bow' }, { ru: 'Лук Пепельной Бури', en: 'Ashstorm Bow' }],
  crossbow: [{ ru: 'Громовая Баллиста', en: 'Thunder Ballista' }, { ru: 'Арбалет Казни', en: 'Execution Crossbow' }],
  trident: [{ ru: 'Трезубец Глубин', en: 'Trident of Deeps' }, { ru: 'Кара Приливов', en: 'Tidewrack' }],
  club: [{ ru: 'Дубина Людоеда', en: 'Ogre Maul' }, { ru: 'Корень Гнева', en: 'Wrathroot' }],
  shield: [{ ru: 'Бастион Веры', en: 'Bastion of Faith' }, { ru: 'Стена Клятв', en: 'Oathwall' }],
  banner: [{ ru: 'Знамёна Войны', en: 'Warbanner' }, { ru: 'Плащ Погибели', en: 'Doomshroud' }],
  horn: [{ ru: 'Рог Ужаса', en: 'Horn of Dread' }],
  sickle: [{ ru: 'Серп Мора', en: 'Plaguesickle' }],
};

/** Походка босса: у форм без «жёсткой» анатомии цикл шага тоже свой. */
const BOSS_GAIT_POOL: Partial<Record<EnemyShape, GaitKind[]>> = {
  humanoid: ['walk', 'stomp', 'hop'],
  golem: ['stomp', 'walk'],
  crystal: ['stomp', 'float'],
};

interface BossIdentity {
  weapon: WeaponKit;
  weaponName: { ru: string; en: string };
  regalia: number;
  aura: number;
  abilityRate: number;
  animationRate: number;
  gait: GaitKind;
}

function bossIdentity(
  shape: EnemyShape,
  attackType: EnemyAttackType,
  bossId: string,
  isFinal: boolean,
  themeGait: GaitKind,
): BossIdentity {
  const h = bossHash(bossId);
  let pool: WeaponKit[];
  if (isFinal) pool = FINAL_BOSS_WEAPONS;
  else if (attackType === 'ranged') pool = BOSS_RANGED_WEAPONS;
  else if (attackType === 'charger') pool = BOSS_CHARGE_WEAPONS;
  else pool = BOSS_WEAPON_BY_SHAPE[shape] || BOSS_WEAPON_BY_SHAPE.humanoid!;
  const weapon = pool[(h >>> 3) % pool.length];
  const names = WEAPON_NAMES[weapon] || WEAPON_NAMES.sword!;
  const gaitPool = BOSS_GAIT_POOL[shape];
  return {
    weapon,
    weaponName: names[(h >>> 11) % names.length],
    // Финальный босс всегда под гало Бездны — его видно издалека.
    regalia: isFinal ? 4 : (h >>> 5) % 6,
    aura: (h >>> 7) % 4,
    // Разный ритм: один босс «кастует» часто и мелко, другой редко и тяжело.
    abilityRate: 0.85 + ((h >>> 13) % 7) * 0.06,
    // Разная манера движения: тяжёлая поступь или быстрая рысь.
    animationRate: 0.85 + ((h >>> 17) % 6) * 0.07,
    gait: gaitPool ? gaitPool[(h >>> 19) % gaitPool.length] : themeGait,
  };
}

export function generateDungeonBosses(dungeonId: string): EnemyDef[] {
  const dgIdx = DUNGEON_ORDER.indexOf(dungeonId);
  if (dgIdx < 0) return [];
  const namesRu = BOSS_NAMES_RU[dgIdx] || BOSS_NAMES_RU[0];
  const namesEn = BOSS_NAMES_EN[dgIdx] || BOSS_NAMES_EN[0];
  const namesRuArr = Array.isArray(namesRu) ? namesRu : BOSS_NAMES_RU[0] || namesRu;
  const namesEnArr = Array.isArray(namesEn) ? namesEn : BOSS_NAMES_EN[0] || namesEn;
  const theme = themeFor(dungeonId);
  const bosses: EnemyDef[] = [];

  for (let i = 0; i < 20; i++) {
    const wave = (i + 1) * 5;
    const isFinal = i === 19;
    // ФОРМА: из пула боссов этого подземелья; финальный босс — уникальный для темы.
    const shape = resolveBossShape(theme, i, isFinal);
    const bossId = `${dungeonId}_boss_${i + 1}`;
    // Special: Whispering Grove wave 10 boss = "Гоблин-Разрушитель" (index 1, melee with charge ability)
    const isGreenFieldWave10 = dungeonId === 'whispering_grove' && i === 1;
    // ФОРМА и ТИП УДАРА считаются заранее: от них зависит личное оружие босса.
    const bossShape: EnemyShape = isGreenFieldWave10 ? 'humanoid' : shape;
    const attackType: EnemyAttackType = isGreenFieldWave10 ? 'melee' : (i % 3 === 0 ? 'melee' : i % 3 === 1 ? 'ranged' : 'charger');
    // ЛИЧНОСТЬ БОССА: личное оружие с именем, регалии, аура, ритм боя и походка.
    // Ни один босс не повторяет другого даже при совпадении формы и цвета.
    const identity: BossIdentity = bossIdentity(bossShape, attackType, bossId, isFinal, theme.gait);
    if (isGreenFieldWave10) {
      identity.weapon = 'halberd';
      identity.weaponName = { ru: 'Дробитель Врат', en: 'Gatebreaker' };
      identity.regalia = 5;
      identity.aura = 1;
    }
    // КРИВАЯ РОСТА. Раньше было statMult = 1 + i*0.6 и HP = (300 + i*200)*statMult:
    // финальный босс получал 50 840 HP, а после множителя волны — 277 000.
    // Бой длился бы 15+ минут, а его удар (1 364 базы × 2.8) убивал героя с одного
    // попадания. Теперь кривая пологая: рост пропорционален силе героя к этой
    // волне (урон за уровень + таланты), поэтому каждый босс дерётся 20–40 секунд.
    bosses.push({
      id: `${dungeonId}_boss_${i + 1}`,
      name: { ru: isGreenFieldWave10 ? 'Гоблин-Разрушитель' : (namesRuArr[i] || `Босс ${i + 1}`), en: isGreenFieldWave10 ? 'Goblin Wrecker' : (namesEnArr[i] || `Boss ${i + 1}`) },
      health: Math.floor((550 + i * 200) * (1 + i * 0.18)),
      // Кривая урона: чуть круче прежней, потому что попадания боссов теперь
      // РЕАЛЬНО засчитываются (см. BOSS_WAVE_DAMAGE_MULTIPLIER).
      damage: Math.floor((16 + i * 6) * (1 + i * 0.07)),
      speed: isGreenFieldWave10 ? 1.6 : 0.72 + i * 0.03,
      expReward: 50 + i * 50,
      goldReward: 40 + i * 40,
      color: bossColor(theme, i),
      radius: 28 + i * 1.5,
      isBoss: true,
      attackType,
      ability: isGreenFieldWave10 ? { ru: 'Каждые 6 сек бежит тараном в игрока. Врезаясь в край экрана, трясет экран и оглушается на 1.5 сек', en: 'Every 6s charges at player. Hitting screen edge shakes screen and stuns for 1.5s' } : BOSS_ABILITY_POOL[i % BOSS_ABILITY_POOL.length],
      sellPrice: 100 + i * 150,
      icon: `boss_${dungeonId}_${i + 1}`,
      minWave: wave,
      shape: bossShape,
      dungeonId,
      hueShift: i * 18,
      isFinalBoss: isFinal,
      isGreenFieldWave10,
      // Стихия подземелья — «свой» вид атак у боссов разных локаций.
      element: theme.element,
      // Мутации силуэта: 3 признака на босса, детерминированы по id.
      traits: rollTraits(theme, bossId, true, bossShape),
      // Походка: своя у каждого босса (в пределах анатомии формы).
      gait: identity.gait,
      // ЛИЧНОЕ ОРУЖИЕ: картинка в руке, удар в бою и имя — из одного набора.
      weapon: identity.weapon,
      weaponName: identity.weaponName,
      // Регалии (корона/шлем/гало…), аура и ритм — тоже личные.
      regalia: identity.regalia,
      aura: identity.aura,
      abilityRate: identity.abilityRate,
      animationRate: identity.animationRate,
    });
  }
  return bosses;
}

// Build the full procedural enemy+boss registry
export function buildProceduralEnemies(): Record<string, EnemyDef> {
  const registry: Record<string, EnemyDef> = { ...ENEMIES };
  // КЛАССИЧЕСКИЕ БОССЫ (поле field_boss, forest_boss…) описаны вручную и НЕ проходят
  // через generateDungeonBosses, поэтому у них не было ни личного оружия, ни имени
  // клинка, ни регалий, ни ауры, ни ритма: в замахе такие боссы махали «пустой рукой»,
  // а облики двух боссов одной формы совпадали один в один. Додадим личность тем же
  // способом, что и процедурным, — детерминированно от id, чтобы облик был стабилен.
  const seenSigs = new Set<string>();
  const sigOf = (shape: EnemyShape | undefined, weapon: WeaponKit, regalia: number, aura: number, element: string | undefined, gait: GaitKind | undefined) =>
    [shape, weapon, regalia, aura, element, gait].join('/');
  // Облики ПРОЦЕДУРНЫХ боссов уже заняты — классические не должны «задвоиться»
  // даже со случайно совпавшим хэшем (иначе два босса одной формы станут близнецами).
  for (const dgId of DUNGEON_ORDER) {
    for (const b of generateDungeonBosses(dgId)) {
      seenSigs.add(sigOf(b.shape, b.weapon!, b.regalia ?? 0, b.aura ?? 0, b.element, b.gait || 'walk'));
    }
  }
  for (const def of Object.values(registry)) {
    if (!def.isBoss || def.weapon) continue;
    const theme = themeFor(def.dungeonId);
    // Владыка Бездны — коренной «финальный» босс классического набора.
    const isFinal = def.id === 'abyss_boss_2';
    // Походку подбираем ПО ФОРМЕ (gaitForShape), а не по теме: классические
    // подземелья не входят в DUNGEON_THEMES, и их боссы иначе получили бы
    // чужую походку (гаргулья начала бы «перетекать», как слизень).
    const shape: EnemyShape = def.shape || 'humanoid';
    const idn = bossIdentity(shape, def.attackType, def.id, isFinal, gaitForShape(shape, theme.gait));
    const gait = def.gait || idn.gait;
    let regalia = idn.regalia;
    let aura = idn.aura;
    const sig = () => sigOf(shape, idn.weapon, regalia, aura, def.element, gait);
    // На случай совпадения сигнатуры (тот же хэш) крутим регалии/ауру, пока облик
    // не станет единственным. Финальный босс сохраняет гало (регалия 4).
    for (let t = 0; t < (isFinal ? 4 : 24) && seenSigs.has(sig()); t++) {
      if (isFinal) aura = (aura + 1) % 4;
      else {
        regalia = (regalia + 1) % 6;
        if (t % 6 === 5) aura = (aura + 1) % 4;
      }
    }
    seenSigs.add(sig());
    registry[def.id] = {
      ...def,
      gait,
      weapon: idn.weapon,
      weaponName: idn.weaponName,
      regalia,
      aura,
      abilityRate: idn.abilityRate,
      animationRate: idn.animationRate,
    };
  }
  for (const dgId of DUNGEON_ORDER) {
    for (const e of generateNamedDungeonEnemies(dgId)) {
      registry[e.id] = e;
    }
    for (const b of generateDungeonBosses(dgId)) {
      registry[b.id] = b;
    }
  }
  return registry;
}

export const ALL_ENEMIES = buildProceduralEnemies();

