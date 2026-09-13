import type { SaveProfile } from './types';
import { createDefaultProfile } from './gameData';

const STORAGE_KEY = 'eota_save_v1';

export function loadGame(): SaveProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultProfile();
    const data = JSON.parse(raw) as Partial<SaveProfile>;
    const def = createDefaultProfile();
    return {
      ...def,
      ...data,
      gameMode: data.gameMode || 'easy',
      ownedCharacters: data.ownedCharacters || def.ownedCharacters,
      unlockedSkills: { ...def.unlockedSkills, ...(data.unlockedSkills || {}) },
      ownedPotions: { ...def.ownedPotions, ...(data.ownedPotions || {}) },
      bag: data.bag || [],
      trophies: data.trophies || [],
      dungeonProgress: data.dungeonProgress || {},
      unlockedDungeons: data.unlockedDungeons || def.unlockedDungeons,
      equippedDungeons: data.equippedDungeons || def.equippedDungeons,
      settings: { ...def.settings, ...(data.settings || {}) },
      talentLevels: data.talentLevels || def.talentLevels,
      shieldLevel: data.shieldLevel ?? def.shieldLevel,
      shieldHits: data.shieldHits ?? def.shieldHits,
      shieldEquipped: data.shieldEquipped ?? def.shieldEquipped,
    };
  } catch {
    return createDefaultProfile();
  }
}

export function saveGame(profile: SaveProfile) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch (e) {
    console.warn('Save failed', e);
  }
}

export function resetGame(): SaveProfile {
  const def = createDefaultProfile();
  saveGame(def);
  return def;
}

// Aliases for backward compatibility
export const loadProfile = loadGame;
export const saveProfile = saveGame;
export const resetProfile = resetGame;

// Autosave on tab close / page hide
let autosaveRegistered = false;
export function registerAutosave(getProfile: () => SaveProfile) {
  if (autosaveRegistered) return;
  autosaveRegistered = true;
  const handler = () => {
    saveGame(getProfile());
  };
  window.addEventListener('beforeunload', handler);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') handler();
  });
}
