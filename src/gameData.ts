import type { CharacterDef, DungeonDef, EnemyDef, PotionDef, BagLevelDef, SaveProfile, EnemyShape } from './types';

export const CHARACTERS: CharacterDef[] = [
  {
    id: 'warrior',
    name: { ru: 'Воин', en: 'Warrior' },
    description: { ru: 'Прочный боец ближнего боя с мечом и щитом', en: 'Sturdy melee fighter with sword and shield' },
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
    hasUniqueRMB: false,
    skills: [
      {
        id: 's_chain',
        name: { ru: 'Удар Цепью', en: 'Chain Strike' },
        description: { ru: 'Базовый удар цепью на близкой дистанции', en: 'Basic chain strike at close range' },
        cost: 0,
        type: 'active-main',
        staminaCost: 6,
        icon: 'skill_assassin_chain',
      },
      {
        id: 's_shadowstep',
        name: { ru: 'Теневой Шаг', en: 'Shadowstep' },
        description: { ru: 'Пассивно увеличивает скорость на 35%', en: 'Passively increases speed by 35%' },
        cost: 200,
        type: 'passive',
        staminaCost: 0,
        icon: 'skill_assassin_shadowstep',
        requires: 's_chain',
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
    id: 'green_field',
    name: { ru: 'Зелёное Поле', en: 'Green Field' },
    description: { ru: 'Спокойные луга для начинающих', en: 'Peaceful meadows for beginners' },
    unlockCost: 0,
    minLevel: 1,
    bgGradient: ['#4a7c3a', '#2d5016'],
    enemyTypes: ['slime', 'goblin', 'wolf'],
    bossId: 'field_boss',
    bossIds: ['field_boss', 'field_boss_2'],
    icon: 'dungeon_field',
  },
  {
    id: 'dark_forest',
    name: { ru: 'Тёмный Лес', en: 'Dark Forest' },
    description: { ru: 'Мрачный лес, полный опасностей', en: 'Gloomy forest full of dangers' },
    unlockCost: 500,
    minLevel: 5,
    bgGradient: ['#2d4a1f', '#1a2d10'],
    enemyTypes: ['spider', 'wolf', 'goblin'],
    bossId: 'forest_boss',
    bossIds: ['forest_boss', 'forest_boss_2'],
    icon: 'dungeon_forest',
  },
  {
    id: 'caves',
    name: { ru: 'Пещеры', en: 'Caves' },
    description: { ru: 'Глубокие пещеры с троглодитами', en: 'Deep caves with troglodytes' },
    unlockCost: 1500,
    minLevel: 10,
    bgGradient: ['#4a3a2a', '#2d2015'],
    enemyTypes: ['bat', 'troll', 'spider'],
    bossId: 'cave_boss',
    bossIds: ['cave_boss', 'cave_boss_2'],
    icon: 'dungeon_cave',
  },
  {
    id: 'ancient_ruins',
    name: { ru: 'Древние Руины', en: 'Ancient Ruins' },
    description: { ru: 'Затерянные руины древней цивилизации', en: 'Lost ruins of an ancient civilization' },
    unlockCost: 3000,
    minLevel: 20,
    bgGradient: ['#5a4a6a', '#2d203a'],
    enemyTypes: ['skeleton', 'golem', 'wraith'],
    bossId: 'ruins_boss',
    bossIds: ['ruins_boss', 'ruins_boss_2'],
    icon: 'dungeon_ruins',
  },
  {
    id: 'volcano',
    name: { ru: 'Вулкан', en: 'Volcano' },
    description: { ru: 'Раскалённые туннели вулкана', en: 'Scorching volcanic tunnels' },
    unlockCost: 6000,
    minLevel: 35,
    bgGradient: ['#7a2a1a', '#3d1505'],
    enemyTypes: ['imp', 'golem', 'salamander'],
    bossId: 'volcano_boss',
    bossIds: ['volcano_boss', 'volcano_boss_2'],
    icon: 'dungeon_volcano',
  },
  {
    id: 'abyss',
    name: { ru: 'Бездна', en: 'The Abyss' },
    description: { ru: 'Сердце тьмы, финальное испытание', en: 'Heart of darkness, the final challenge' },
    unlockCost: 12000,
    minLevel: 50,
    bgGradient: ['#1a0a2a', '#050010'],
    enemyTypes: ['wraith', 'demon', 'salamander'],
    bossId: 'abyss_boss',
    bossIds: ['abyss_boss', 'abyss_boss_2'],
    icon: 'dungeon_abyss',
  },
];

export const ENEMIES: Record<string, EnemyDef> = {
  // === BASIC ENEMIES (wave 1+) ===
  slime: {
    id: 'slime', name: { ru: 'Слизень', en: 'Slime' }, health: 30, damage: 5, speed: 0.8,
    expReward: 5, goldReward: 3, color: '#5fbf3f', radius: 14, isBoss: false, attackType: 'melee', sellPrice: 0, icon: 'enemy_slime', minWave: 1,
    shape: 'blob', dungeonId: 'green_field',
  },
  goblin: {
    id: 'goblin', name: { ru: 'Гоблин', en: 'Goblin' }, health: 50, damage: 8, speed: 1.4,
    expReward: 8, goldReward: 5, color: '#8b6f3f', radius: 12, isBoss: false, attackType: 'melee', sellPrice: 0, icon: 'enemy_goblin', minWave: 1,
    shape: 'humanoid', dungeonId: 'green_field',
  },
  wolf: {
    id: 'wolf', name: { ru: 'Волк', en: 'Wolf' }, health: 40, damage: 10, speed: 2.0,
    expReward: 7, goldReward: 4, color: '#6a6a6a', radius: 13, isBoss: false, attackType: 'charger', sellPrice: 0, icon: 'enemy_wolf', minWave: 1,
    shape: 'wolf', dungeonId: 'green_field',
  },
  spider: {
    id: 'spider', name: { ru: 'Паук', en: 'Spider' }, health: 35, damage: 7, speed: 1.6,
    expReward: 6, goldReward: 4, color: '#3a2a1a', radius: 12, isBoss: false, attackType: 'melee', sellPrice: 0, icon: 'enemy_spider', minWave: 1,
    shape: 'spider', dungeonId: 'dark_forest',
  },
  // === WAVE 3+ ENEMIES ===
  bat: {
    id: 'bat', name: { ru: 'Летучая Мышь', en: 'Bat' }, health: 25, damage: 6, speed: 2.2,
    expReward: 5, goldReward: 3, color: '#4a2a4a', radius: 10, isBoss: false, attackType: 'ranged', sellPrice: 0, icon: 'enemy_bat', minWave: 3,
    shape: 'bat', dungeonId: 'caves',
  },
  skeleton: {
    id: 'skeleton', name: { ru: 'Скелет-Лучник', en: 'Skeleton Archer' }, health: 60, damage: 12, speed: 1.3,
    expReward: 10, goldReward: 7, color: '#c0c0a0', radius: 13, isBoss: false, attackType: 'ranged', sellPrice: 0, icon: 'enemy_skeleton', minWave: 3,
    shape: 'skeleton', dungeonId: 'ancient_ruins',
  },
  // === WAVE 6+ ENEMIES ===
  troll: {
    id: 'troll', name: { ru: 'Тролль', en: 'Troll' }, health: 80, damage: 15, speed: 1.0,
    expReward: 12, goldReward: 8, color: '#5a7a4a', radius: 18, isBoss: false, attackType: 'melee', sellPrice: 0, icon: 'enemy_troll', minWave: 6,
    shape: 'golem', dungeonId: 'caves',
  },
  imp: {
    id: 'imp', name: { ru: 'Бес-Огнемёт', en: 'Fire Imp' }, health: 55, damage: 13, speed: 2.0,
    expReward: 10, goldReward: 8, color: '#bf3f3f', radius: 12, isBoss: false, attackType: 'ranged', sellPrice: 0, icon: 'enemy_imp', minWave: 6,
    shape: 'imp', dungeonId: 'volcano',
  },
  // === WAVE 9+ ENEMIES ===
  golem: {
    id: 'golem', name: { ru: 'Голем', en: 'Golem' }, health: 120, damage: 18, speed: 0.7,
    expReward: 15, goldReward: 12, color: '#8a7a6a', radius: 20, isBoss: false, attackType: 'melee', sellPrice: 0, icon: 'enemy_golem', minWave: 9,
    shape: 'golem', dungeonId: 'ancient_ruins',
  },
  wraith: {
    id: 'wraith', name: { ru: 'Призрак', en: 'Wraith' }, health: 70, damage: 14, speed: 1.8,
    expReward: 12, goldReward: 9, color: '#6a4a8a', radius: 14, isBoss: false, attackType: 'ranged', sellPrice: 0, icon: 'enemy_wraith', minWave: 9,
    shape: 'shadow', dungeonId: 'abyss',
  },
  // === WAVE 12+ ENEMIES ===
  salamander: {
    id: 'salamander', name: { ru: 'Саламандра', en: 'Salamander' }, health: 90, damage: 16, speed: 1.5,
    expReward: 14, goldReward: 10, color: '#df5f2f', radius: 15, isBoss: false, attackType: 'charger', sellPrice: 0, icon: 'enemy_salamander', minWave: 12,
    shape: 'imp', dungeonId: 'volcano',
  },
  demon: {
    id: 'demon', name: { ru: 'Демон', en: 'Demon' }, health: 100, damage: 20, speed: 1.7,
    expReward: 18, goldReward: 15, color: '#8a1a1a', radius: 17, isBoss: false, attackType: 'melee', sellPrice: 0, icon: 'enemy_demon', minWave: 12,
    shape: 'humanoid', dungeonId: 'abyss',
  },
  // === WAVE 15+ ENEMIES ===
  dark_knight: {
    id: 'dark_knight', name: { ru: 'Тёмный Рыцарь', en: 'Dark Knight' }, health: 130, damage: 22, speed: 1.4,
    expReward: 20, goldReward: 16, color: '#3a3a4a', radius: 16, isBoss: false, attackType: 'charger', sellPrice: 0, icon: 'enemy_dark_knight', minWave: 15,
    shape: 'humanoid', dungeonId: 'ancient_ruins',
  },
  crystal_mage: {
    id: 'crystal_mage', name: { ru: 'Кристальный Маг', en: 'Crystal Mage' }, health: 85, damage: 18, speed: 1.2,
    expReward: 18, goldReward: 14, color: '#3aaacc', radius: 14, isBoss: false, attackType: 'ranged', sellPrice: 0, icon: 'enemy_crystal_mage', minWave: 15,
    shape: 'crystal', dungeonId: 'caves',
  },
  // === WAVE 20+ ENEMIES ===
  hellhound: {
    id: 'hellhound', name: { ru: 'Адский Пёс', en: 'Hellhound' }, health: 110, damage: 24, speed: 2.2,
    expReward: 22, goldReward: 18, color: '#df2f0f', radius: 15, isBoss: false, attackType: 'charger', sellPrice: 0, icon: 'enemy_hellhound', minWave: 20,
    shape: 'wolf', dungeonId: 'volcano',
  },
  shadow_archer: {
    id: 'shadow_archer', name: { ru: 'Теневой Лучник', en: 'Shadow Archer' }, health: 95, damage: 20, speed: 1.6,
    expReward: 20, goldReward: 16, color: '#2a1a3a', radius: 13, isBoss: false, attackType: 'ranged', sellPrice: 0, icon: 'enemy_shadow_archer', minWave: 20,
    shape: 'humanoid', dungeonId: 'abyss',
  },
  // === WAVE 30+ ENEMIES ===
  ice_lancer: {
    id: 'ice_lancer', name: { ru: 'Ледяной Копейщик', en: 'Ice Lancer' }, health: 150, damage: 26, speed: 1.5,
    expReward: 25, goldReward: 20, color: '#5fcfff', radius: 16, isBoss: false, attackType: 'ranged', sellPrice: 0, icon: 'enemy_ice_lancer', minWave: 30,
    shape: 'humanoid', dungeonId: 'caves',
  },
  void_reaper: {
    id: 'void_reaper', name: { ru: 'Жнец Пустоты', en: 'Void Reaper' }, health: 180, damage: 30, speed: 1.9,
    expReward: 30, goldReward: 25, color: '#1a0a2a', radius: 18, isBoss: false, attackType: 'charger', sellPrice: 0, icon: 'enemy_void_reaper', minWave: 30,
    shape: 'shadow', dungeonId: 'abyss',
  },
  // === WAVE 40+ ENEMIES ===
  magma_brute: {
    id: 'magma_brute', name: { ru: 'Магмовый Громила', en: 'Magma Brute' }, health: 220, damage: 32, speed: 1.1,
    expReward: 35, goldReward: 28, color: '#df5f1f', radius: 22, isBoss: false, attackType: 'melee', sellPrice: 0, icon: 'enemy_magma_brute', minWave: 40,
    shape: 'golem', dungeonId: 'volcano',
  },
  storm_caller: {
    id: 'storm_caller', name: { ru: 'Призыватель Бури', en: 'Storm Caller' }, health: 160, damage: 28, speed: 1.3,
    expReward: 32, goldReward: 26, color: '#cfcf3f', radius: 15, isBoss: false, attackType: 'ranged', sellPrice: 0, icon: 'enemy_storm_caller', minWave: 40,
    shape: 'humanoid', dungeonId: 'ancient_ruins',
  },
  // === WAVE 50+ ENEMIES ===
  abyss_knight: {
    id: 'abyss_knight', name: { ru: 'Рыцарь Бездны', en: 'Abyss Knight' }, health: 280, damage: 36, speed: 1.6,
    expReward: 40, goldReward: 35, color: '#0a0a1a', radius: 19, isBoss: false, attackType: 'charger', sellPrice: 0, icon: 'enemy_abyss_knight', minWave: 50,
    shape: 'humanoid', dungeonId: 'abyss',
  },
  soul_harvester: {
    id: 'soul_harvester', name: { ru: 'Жнец Душ', en: 'Soul Harvester' }, health: 200, damage: 34, speed: 1.4,
    expReward: 38, goldReward: 30, color: '#5a0a5a', radius: 17, isBoss: false, attackType: 'ranged', sellPrice: 0, icon: 'enemy_soul_harvester', minWave: 50,
    shape: 'eye', dungeonId: 'abyss',
  },

  // === BOSSES (every 5 waves, unique per dungeon) ===
  field_boss: {
    id: 'field_boss', name: { ru: 'Хозяин Полей', en: 'Field Lord' }, health: 300, damage: 15, speed: 1.0,
    expReward: 50, goldReward: 40, color: '#3faf2f', radius: 28, isBoss: true, attackType: 'melee',
    ability: { ru: 'Призывает слизней каждые 5 сек', en: 'Summons slimes every 5 sec' },
    sellPrice: 100, icon: 'boss_field', minWave: 5, shape: 'blob', dungeonId: 'green_field',
  },
  forest_boss: {
    id: 'forest_boss', name: { ru: 'Лесной Страж', en: 'Forest Warden' }, health: 500, damage: 20, speed: 1.2,
    expReward: 80, goldReward: 60, color: '#1f7f1f', radius: 30, isBoss: true, attackType: 'ranged',
    ability: { ru: 'Телепортируется и атакует пауками', en: 'Teleports and attacks with spiders' },
    sellPrice: 200, icon: 'boss_forest', minWave: 5, shape: 'spider', dungeonId: 'dark_forest',
  },
  cave_boss: {
    id: 'cave_boss', name: { ru: 'Король Пещер', en: 'Cave King' }, health: 700, damage: 25, speed: 0.9,
    expReward: 120, goldReward: 90, color: '#7a5a3a', radius: 32, isBoss: true, attackType: 'charger',
    ability: { ru: 'Рывок с оглушением', en: 'Charge with stun' },
    sellPrice: 350, icon: 'boss_cave', minWave: 5, shape: 'golem', dungeonId: 'caves',
  },
  ruins_boss: {
    id: 'ruins_boss', name: { ru: 'Древний Страж', en: 'Ancient Guardian' }, health: 1000, damage: 30, speed: 1.1,
    expReward: 180, goldReward: 140, color: '#7a5a8a', radius: 34, isBoss: true, attackType: 'melee',
    ability: { ru: 'AoE удар по земле', en: 'AoE ground slam' },
    sellPrice: 600, icon: 'boss_ruins', minWave: 5, shape: 'gargoyle', dungeonId: 'ancient_ruins',
  },
  volcano_boss: {
    id: 'volcano_boss', name: { ru: 'Лавовый Титан', en: 'Lava Titan' }, health: 1400, damage: 35, speed: 1.0,
    expReward: 250, goldReward: 200, color: '#df3f1f', radius: 36, isBoss: true, attackType: 'ranged',
    ability: { ru: 'Метеоритный дождь', en: 'Meteor rain' },
    sellPrice: 1000, icon: 'boss_volcano', minWave: 5, shape: 'golem', dungeonId: 'volcano',
  },
  abyss_boss: {
    id: 'abyss_boss', name: { ru: 'Владыка Бездны', en: 'Abyss Lord' }, health: 2000, damage: 45, speed: 1.3,
    expReward: 400, goldReward: 350, color: '#5a0a8a', radius: 38, isBoss: true, attackType: 'ranged',
    ability: { ru: 'Дальние теневые атаки', en: 'Ranged shadow attacks' },
    sellPrice: 2000, icon: 'boss_abyss', minWave: 5, shape: 'eye', dungeonId: 'abyss',
  },
  field_boss_2: {
    id: 'field_boss_2', name: { ru: 'Гоблин-Вождь', en: 'Goblin Chieftain' }, health: 450, damage: 18, speed: 1.5,
    expReward: 70, goldReward: 55, color: '#bf8f3f', radius: 26, isBoss: true, attackType: 'charger',
    ability: { ru: 'Боевой рёв: бафает союзников', en: 'War cry: buffs allies' },
    sellPrice: 150, icon: 'boss_field_2', minWave: 10, shape: 'humanoid', dungeonId: 'green_field',
  },
  forest_boss_2: {
    id: 'forest_boss_2', name: { ru: 'Паучья Королева', en: 'Spider Queen' }, health: 650, damage: 22, speed: 1.1,
    expReward: 100, goldReward: 75, color: '#5a2a1a', radius: 30, isBoss: true, attackType: 'ranged',
    ability: { ru: 'Паутина: замедляет игрока', en: 'Web: slows the player' },
    sellPrice: 250, icon: 'boss_forest_2', minWave: 10, shape: 'spider', dungeonId: 'dark_forest',
  },
  cave_boss_2: {
    id: 'cave_boss_2', name: { ru: 'Каменный Колосс', en: 'Stone Colossus' }, health: 900, damage: 28, speed: 0.7,
    expReward: 140, goldReward: 100, color: '#6a5a4a', radius: 36, isBoss: true, attackType: 'melee',
    ability: { ru: 'Камнепад с потолка', en: 'Rockfall from ceiling' },
    sellPrice: 400, icon: 'boss_cave_2', minWave: 10, shape: 'golem', dungeonId: 'caves',
  },
  ruins_boss_2: {
    id: 'ruins_boss_2', name: { ru: 'Дух Хранителя', en: 'Guardian Spirit' }, health: 1200, damage: 32, speed: 1.4,
    expReward: 200, goldReward: 160, color: '#9a7aba', radius: 32, isBoss: true, attackType: 'ranged',
    ability: { ru: 'Призрачные снаряды', en: 'Spectral projectiles' },
    sellPrice: 700, icon: 'boss_ruins_2', minWave: 15, shape: 'spirit', dungeonId: 'ancient_ruins',
  },
  volcano_boss_2: {
    id: 'volcano_boss_2', name: { ru: 'Огненный Демон', en: 'Fire Demon' }, health: 1600, damage: 38, speed: 1.6,
    expReward: 280, goldReward: 220, color: '#df1f1f', radius: 34, isBoss: true, attackType: 'charger',
    ability: { ru: 'Огненный рывок', en: 'Fiery charge' },
    sellPrice: 1100, icon: 'boss_volcano_2', minWave: 20, shape: 'imp', dungeonId: 'volcano',
  },
  abyss_boss_2: {
    id: 'abyss_boss_2', name: { ru: 'Теневой Владыка', en: 'Shadow Sovereign' }, health: 2400, damage: 48, speed: 1.5,
    expReward: 450, goldReward: 400, color: '#3a0a5a', radius: 40, isBoss: true, attackType: 'ranged',
    ability: { ru: 'Теневые копья', en: 'Shadow spears' },
    sellPrice: 2200, icon: 'boss_abyss_2', minWave: 25, shape: 'spirit', dungeonId: 'abyss',
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
      assassin: ['s_chain'],
    },
    ownedPotions: { health: 0, stamina: 0, revival: 0 },
    bagLevel: 1,
    bag: [],
    trophies: [],
    dungeonProgress: {},
    unlockedDungeons: ['green_field'],
    equippedDungeons: ['green_field'],
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
    shieldLevel: 0,
    shieldHits: 0,
    shieldEquipped: false,
  };
}

export const MAX_WAVES = 100;
export const BOSS_WAVE_INTERVAL = 5;
export const STAMINA_REGEN_RATE = 8;
export const STAMINA_REGEN_SECOND_WIND = 15;
export const HEALTH_REGEN_RATE = 0.5;
export const POTION_HEALTH_AMOUNT = 60;
export const POTION_STAMINA_AMOUNT = 50;
export const REVIVAL_HP_PERCENT = 0.5;
export const EXP_PER_LEVEL = 100;
export const EXP_LEVEL_MULTIPLIER = 1.3;
export const POTION_COOLDOWN = 30;
export const WAVE_DIFFICULTY_MULTIPLIER = 0.08; // Easy mode: +8% per wave
export const HARD_HEALTH_MULTIPLIER = 1.5;
export const HARD_DAMAGE_MULTIPLIER = 1.4;
export const HARD_WAVE_DIFFICULTY_MULTIPLIER = 0.15; // Hard mode: +15% per wave
export const REVIVAL_POTION_COST = 1500;

export const TALENT_DAMAGE_COST = 200;
export const TALENT_HEALTH_COST = 250;
export const TALENT_BONUS_PER_LEVEL = 0.10;
export const SHIELD_COST_MULTIPLIER = 200;
export const SHIELD_HITS_MULTIPLIER = 10;
export const MAX_SHIELD_LEVEL = 5;

// === PROCEDURAL ENEMY GENERATION ===
// Each dungeon has base enemy shapes. Every 2 waves a new tier unlocks (1 melee + 1 ranged).
// Names auto-generated with prefixes. Color shifted via hue-rotate per tier.

interface DungeonBaseShapes {
  melee: EnemyShape;
  ranged: EnemyShape;
  colors: [string, string]; // [melee base color, ranged base color]
}

const DUNGEON_SHAPES: Record<string, DungeonBaseShapes> = {
  green_field: { melee: 'blob', ranged: 'beetle', colors: ['#5fbf3f', '#8bbf3f'] },
  dark_forest: { melee: 'spider', ranged: 'shadow', colors: ['#3a2a1a', '#6a4a8a'] },
  caves: { melee: 'bat', ranged: 'crystal', colors: ['#4a2a4a', '#5a8a7a'] },
  ancient_ruins: { melee: 'gargoyle', ranged: 'skeleton', colors: ['#7a6a8a', '#c0c0a0'] },
  volcano: { melee: 'golem', ranged: 'imp', colors: ['#df5f1f', '#bf3f3f'] },
  abyss: { melee: 'eye', ranged: 'spirit', colors: ['#5a0a5a', '#3a0a5a'] },
};

const TIER_PREFIXES_RU = ['Молодой', 'Закалённый', 'Древний', 'Лорд'];
const TIER_PREFIXES_EN = ['Young', 'Hardened', 'Ancient', 'Lord'];

// Generate procedural enemies for a dungeon at a given tier (every 2 waves)
export function generateTierEnemies(dungeonId: string, tier: number): EnemyDef[] {
  const shapes = DUNGEON_SHAPES[dungeonId] || DUNGEON_SHAPES.green_field;
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

// === PROCEDURAL BOSS GENERATION ===
// 20 bosses per dungeon (waves 5, 10, 15... 100). Wave 100 = final boss.
const BOSS_ABILITY_POOL: { ru: string; en: string }[] = [
  { ru: 'Деление на 3 копии при HP < 50%', en: 'Splits into 3 copies at HP < 50%' },
  { ru: 'Обездвиживание корнями на 2 сек', en: 'Roots immobilize for 2 sec' },
  { ru: 'Веер снарядов в 8 направлениях', en: 'Fan of projectiles in 8 directions' },
  { ru: 'Уход в невидимость', en: 'Turns invisible' },
  { ru: 'Оглушающий крик с отбрасыванием', en: 'Stunning scream with knockback' },
  { ru: 'Метеориты тьмы с неба', en: 'Dark meteors from sky' },
  { ru: 'Призыв волн с бафом +30% скорости', en: 'Summons waves with +30% speed buff' },
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
  ['Хозяин Полей', 'Гоблин-Вождь', 'Лесной Страж', 'Корень-Древень', 'Лесной Дракончик', 'Полевой Титан', 'Зелёный Рыцарь', 'Дикий Вепрь', 'Лесная Горгулья', 'Король Слизней',
   'Лесной Маг', 'Шипастый Страж', 'Гнилой Великан', 'Травяной Голем', 'Лесная Ведьма', 'Корневой Властелин', 'Древний Лесной Дух', 'Лесной Пожиратель', 'Страж Поляны', 'Лесной Дракон'],
  ['Лесной Страж', 'Паучья Королева', 'Теневой Крадущийся', 'Лесной Призрак', 'Костяной Лучник', 'Тёмный Охотник', 'Лесной Убийца', 'Паучий Лорд', 'Теневой Маг', 'Гнилой Дух',
   'Лесной Жнец', 'Тёмный Мститель', 'Паучий Бог', 'Теневой Демон', 'Лесной Кошмар', 'Костяной Лорд', 'Тёмный Шаман', 'Лесной Разрушитель', 'Паучья Богиня', 'Летающий Призрак'],
  ['Король Пещер', 'Каменный Колосс', 'Кристальный Страж', 'Грязевой Титан', 'Пещерный Дракончик', 'Кристальный Маг', 'Каменный Голем', 'Пещерный Жнец', 'Кристальный Лучник', 'Глубинный Дух',
   'Пещерный Лорд', 'Каменный Страж', 'Кристальный Великан', 'Грязевой Пожиратель', 'Пещерный Титан', 'Кристальный Голем', 'Каменный Дракон', 'Глубинный Пожиратель', 'Кристальный Страж', 'Кристальный Дракон'],
  ['Древний Страж', 'Дух Хранителя', 'Каменная Горгулья', 'Костяной Лич', 'Руинный Рыцарь', 'Древний Маг', 'Каменный Страж', 'Руинный Голем', 'Костяной Дракон', 'Древний Дух',
   'Руинный Страж', 'Древний Колосс', 'Каменный Лорд', 'Костяной Титан', 'Руинный Маг', 'Древний Голем', 'Каменный Пожиратель', 'Руинный Дух', 'Древний Лич', 'Древний Лич'],
  ['Лавовый Титан', 'Огненный Демон', 'Магмовый Голем', 'Огненный Страж', 'Вулканический Дракончик', 'Лавовый Маг', 'Магмовый Страж', 'Огненный Рыцарь', 'Лавовый Голем', 'Вулканический Дух',
   'Магмовый Титан', 'Огненный Колосс', 'Лавовый Страж', 'Вулканический Лучник', 'Огненный Голем', 'Магмовый Демон', 'Лавовый Дракон', 'Вулканический Титан', 'Огненный Пожиратель', 'Огненный Испепеляющий Дракон'],
  ['Владыка Бездны', 'Теневой Владыка', 'Дух Пустоты', 'Око Бездны', 'Теневой Демон', 'Пустотный Жнец', 'Дух Тьмы', 'Око Пустоты', 'Теневой Колосс', 'Пустотный Страж',
   'Дух Бездны', 'Око Тьмы', 'Теневой Голем', 'Пустотный Маг', 'Теневой Дракон', 'Дух Пустоты', 'Око Забвения', 'Теневой Пожиратель', 'Пустотный Лорд', 'Финальная Сущность Бездны'],
];

const BOSS_NAMES_EN: string[][] = [
  ['Field Lord', 'Goblin Chieftain', 'Forest Warden', 'Root Treant', 'Forest Drake', 'Field Titan', 'Green Knight', 'Wild Boar', 'Forest Gargoyle', 'Slime King',
   'Forest Mage', 'Thorn Guardian', 'Rotting Giant', 'Grass Golem', 'Forest Witch', 'Root Overlord', 'Ancient Forest Spirit', 'Forest Devourer', 'Glade Sentinel', 'Forest Dragon'],
  ['Forest Warden', 'Spider Queen', 'Shadow Stalker', 'Forest Phantom', 'Bone Archer', 'Dark Hunter', 'Forest Slayer', 'Spider Lord', 'Shadow Mage', 'Rotting Spirit',
   'Forest Reaper', 'Dark Avenger', 'Spider God', 'Shadow Demon', 'Forest Nightmare', 'Bone Lord', 'Dark Shaman', 'Forest Destroyer', 'Spider Goddess', 'Flying Phantom'],
  ['Cave King', 'Stone Colossus', 'Crystal Guardian', 'Mud Titan', 'Cave Drake', 'Crystal Mage', 'Stone Golem', 'Cave Reaper', 'Crystal Archer', 'Depths Spirit',
   'Cave Lord', 'Stone Guardian', 'Crystal Giant', 'Mud Devourer', 'Cave Titan', 'Crystal Golem', 'Stone Dragon', 'Depths Devourer', 'Crystal Sentinel', 'Crystal Dragon'],
  ['Ancient Guardian', 'Guardian Spirit', 'Stone Gargoyle', 'Bone Lich', 'Ruin Knight', 'Ancient Mage', 'Stone Guardian', 'Ruin Golem', 'Bone Dragon', 'Ancient Spirit',
   'Ruin Sentinel', 'Ancient Colossus', 'Stone Lord', 'Bone Titan', 'Ruin Mage', 'Ancient Golem', 'Stone Devourer', 'Ruin Spirit', 'Ancient Lich', 'Ancient Lich'],
  ['Lava Titan', 'Fire Demon', 'Magma Golem', 'Fire Guardian', 'Volcanic Drake', 'Lava Mage', 'Magma Guardian', 'Fire Knight', 'Lava Golem', 'Volcanic Spirit',
   'Magma Titan', 'Fire Colossus', 'Lava Sentinel', 'Volcanic Archer', 'Fire Golem', 'Magma Demon', 'Lava Dragon', 'Volcanic Titan', 'Fire Devourer', 'Fire Incinerating Dragon'],
  ['Abyss Lord', 'Shadow Sovereign', 'Void Spirit', 'Abyssal Eye', 'Shadow Demon', 'Void Reaper', 'Dark Spirit', 'Void Eye', 'Shadow Colossus', 'Void Guardian',
   'Abyss Spirit', 'Eye of Darkness', 'Shadow Golem', 'Void Mage', 'Shadow Dragon', 'Void Spirit', 'Eye of Oblivion', 'Shadow Devourer', 'Void Lord', 'Final Abyss Entity'],
];

const DUNGEON_ORDER = ['green_field', 'dark_forest', 'caves', 'ancient_ruins', 'volcano', 'abyss'];

const FINAL_BOSS_SHAPES: Record<string, EnemyShape> = {
  green_field: 'dragon',
  dark_forest: 'shadow',
  caves: 'dragon',
  ancient_ruins: 'humanoid',
  volcano: 'dragon',
  abyss: 'spirit',
};

const BOSS_SHAPES_BY_DUNGEON: Record<string, EnemyShape[]> = {
  green_field: ['blob', 'humanoid', 'humanoid', 'humanoid', 'dragon', 'golem', 'humanoid', 'beetle', 'gargoyle', 'blob',
    'humanoid', 'beetle', 'golem', 'golem', 'humanoid', 'humanoid', 'spirit', 'golem', 'humanoid', 'dragon'],
  dark_forest: ['humanoid', 'spider', 'shadow', 'spirit', 'skeleton', 'humanoid', 'humanoid', 'spider', 'shadow', 'spirit',
    'humanoid', 'humanoid', 'spider', 'shadow', 'spirit', 'skeleton', 'humanoid', 'golem', 'spider', 'shadow'],
  caves: ['humanoid', 'golem', 'crystal', 'golem', 'dragon', 'humanoid', 'golem', 'humanoid', 'skeleton', 'spirit',
    'humanoid', 'golem', 'crystal', 'golem', 'golem', 'crystal', 'dragon', 'spirit', 'crystal', 'dragon'],
  ancient_ruins: ['golem', 'spirit', 'gargoyle', 'skeleton', 'humanoid', 'humanoid', 'golem', 'golem', 'dragon', 'spirit',
    'humanoid', 'golem', 'golem', 'skeleton', 'humanoid', 'golem', 'golem', 'spirit', 'humanoid', 'humanoid'],
  volcano: ['golem', 'imp', 'golem', 'humanoid', 'dragon', 'humanoid', 'golem', 'humanoid', 'golem', 'spirit',
    'golem', 'imp', 'humanoid', 'humanoid', 'golem', 'imp', 'dragon', 'golem', 'imp', 'dragon'],
  abyss: ['eye', 'spirit', 'spirit', 'eye', 'shadow', 'humanoid', 'spirit', 'eye', 'golem', 'humanoid',
    'spirit', 'eye', 'golem', 'humanoid', 'dragon', 'spirit', 'eye', 'shadow', 'humanoid', 'spirit'],
};

export function generateDungeonBosses(dungeonId: string): EnemyDef[] {
  const dgIdx = DUNGEON_ORDER.indexOf(dungeonId);
  if (dgIdx < 0) return [];
  const namesRu = BOSS_NAMES_RU[dgIdx] || BOSS_NAMES_RU[0];
  const namesEn = BOSS_NAMES_EN[dgIdx] || BOSS_NAMES_EN[0];
  const namesRuArr = Array.isArray(namesRu) ? namesRu : BOSS_NAMES_RU[0] || namesRu;
  const namesEnArr = Array.isArray(namesEn) ? namesEn : BOSS_NAMES_EN[0] || namesEn;
  const shapes = BOSS_SHAPES_BY_DUNGEON[dungeonId] || BOSS_SHAPES_BY_DUNGEON['green_field'];
  const dg = DUNGEONS.find(d => d.id === dungeonId);
  const baseColor = dg?.bgGradient[0] || '#3faf2f';
  const bosses: EnemyDef[] = [];

  for (let i = 0; i < 20; i++) {
    const wave = (i + 1) * 5;
    const isFinal = i === 19;
    const statMult = 1 + i * 0.6;
    const shape: EnemyShape = isFinal ? (FINAL_BOSS_SHAPES[dungeonId] || 'dragon') : shapes[i % shapes.length];
    bosses.push({
      id: `${dungeonId}_boss_${i + 1}`,
      name: { ru: namesRuArr[i] || `Босс ${i + 1}`, en: namesEnArr[i] || `Boss ${i + 1}` },
      health: Math.floor((300 + i * 200) * statMult),
      damage: Math.floor((15 + i * 5) * statMult),
      speed: 0.9 + i * 0.05,
      expReward: 50 + i * 50,
      goldReward: 40 + i * 40,
      color: baseColor,
      radius: 28 + i * 1.5,
      isBoss: true,
      attackType: i % 3 === 0 ? 'melee' : i % 3 === 1 ? 'ranged' : 'charger',
      ability: BOSS_ABILITY_POOL[i % BOSS_ABILITY_POOL.length],
      sellPrice: 100 + i * 150,
      icon: `boss_${dungeonId}_${i + 1}`,
      minWave: wave,
      shape,
      dungeonId,
      hueShift: i * 18,
      isFinalBoss: isFinal,
    });
  }
  return bosses;
}

// Build the full procedural enemy+boss registry
export function buildProceduralEnemies(): Record<string, EnemyDef> {
  const registry: Record<string, EnemyDef> = { ...ENEMIES };
  for (const dgId of DUNGEON_ORDER) {
    for (const e of generateAllTierEnemies(dgId)) {
      registry[e.id] = e;
    }
    for (const b of generateDungeonBosses(dgId)) {
      registry[b.id] = b;
    }
  }
  return registry;
}

export const ALL_ENEMIES = buildProceduralEnemies();

