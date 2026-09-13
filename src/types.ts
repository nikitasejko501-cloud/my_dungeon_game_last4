export type Platform = 'mobile' | 'pc';
export type Language = 'ru' | 'en';
export type ScreenName = 'platform-select' | 'title' | 'settings' | 'guild' | 'dungeon-select' | 'combat' | 'game-over';
export type GameMode = 'easy' | 'hard';
export type CombatResult = 'victory' | 'defeat' | null;

export type CharacterClass = 'warrior' | 'archer' | 'mage' | 'assassin';

export interface SkillDef {
  id: string;
  name: { ru: string; en: string };
  description: { ru: string; en: string };
  cost: number;
  requires?: string;
  type: 'active-main' | 'active-unique' | 'passive';
  staminaCost: number;
  icon: string;
  level?: number;
}

export interface CharacterDef {
  id: CharacterClass;
  name: { ru: string; en: string };
  description: { ru: string; en: string };
  cost: number;
  baseHealth: number;
  baseStamina: number;
  baseDamage: number;
  baseSpeed: number;
  color: string;
  weaponIcon: string;
  skills: SkillDef[];
  hasUniqueRMB: boolean;
}

export interface DungeonDef {
  id: string;
  name: { ru: string; en: string };
  description: { ru: string; en: string };
  unlockCost: number;
  minLevel: number;
  bgGradient: [string, string];
  enemyTypes: string[];
  bossId: string;
  bossIds: string[];
  icon: string;
}

export type EnemyAttackType = 'melee' | 'ranged' | 'charger';
export type EnemyShape = 'blob' | 'beetle' | 'spider' | 'shadow' | 'bat' | 'crystal' | 'gargoyle' | 'skeleton' | 'golem' | 'imp' | 'wolf' | 'humanoid' | 'eye' | 'spirit' | 'dragon';

export interface EnemyDef {
  id: string;
  name: { ru: string; en: string };
  health: number;
  damage: number;
  speed: number;
  expReward: number;
  goldReward: number;
  color: string;
  radius: number;
  isBoss: boolean;
  attackType: EnemyAttackType;
  ability?: { ru: string; en: string };
  sellPrice: number;
  icon: string;
  minWave?: number;
  shape?: EnemyShape;
  dungeonId?: string;
  hueShift?: number;
  isFinalBoss?: boolean;
}

export interface PotionDef {
  id: 'health' | 'stamina' | 'revival';
  name: { ru: string; en: string };
  description: { ru: string; en: string };
  cost: number;
  icon: string;
  hotkey?: string;
}

export interface BagLevelDef {
  level: number;
  capacity: number;
  cost: number;
}

export interface CapturedBoss {
  uid: string;
  enemyId: string;
  name: { ru: string; en: string };
  ability: { ru: string; en: string };
  sellPrice: number;
  difficulty: number;
  icon: string;
  capturedAt: number;
}

export interface Trophy {
  uid: string;
  enemyId: string;
  name: { ru: string; en: string };
  ability: { ru: string; en: string };
  sellPrice: number;
  difficulty: number;
  icon: string;
  trophyAt: number;
}

export interface SaveProfile {
  platform: Platform | null;
  language: Language;
  gameMode: GameMode;
  gold: number;
  level: number;
  exp: number;
  ownedCharacters: CharacterClass[];
  equippedCharacter: CharacterClass;
  unlockedSkills: Record<CharacterClass, string[]>;
  ownedPotions: { health: number; stamina: number; revival: number };
  bagLevel: number;
  bag: CapturedBoss[];
  trophies: Trophy[];
  dungeonProgress: Record<string, number>;
  unlockedDungeons: string[];
  equippedDungeons: string[];
  totalWavesCleared: number;
  settings: {
    brightness: number;
    volume: number;
    controlScheme: 'wasd' | 'arrows';
    soundEnabled: boolean;
  };
  hasSeenIntro: boolean;
  talentLevels: Record<CharacterClass, { damage: number; health: number }>;
  shieldLevel: number;
  shieldHits: number;
  shieldEquipped: boolean;
}

export interface Vec2 {
  x: number;
  y: number;
}
