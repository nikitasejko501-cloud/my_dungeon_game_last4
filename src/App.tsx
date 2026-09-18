import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { SaveProfile, ScreenName, Platform, CharacterClass, CapturedBoss, Trophy, GameMode, CombatResult } from './types';
import { CHARACTERS, DUNGEONS, POTIONS, BAG_LEVELS, ENEMIES, MAX_WAVES, EXP_PER_LEVEL, EXP_LEVEL_MULTIPLIER, POTION_COOLDOWN, TALENT_DAMAGE_COST, TALENT_HEALTH_COST, TALENT_BONUS_PER_LEVEL, SHIELD_COST_MULTIPLIER, SHIELD_HITS_MULTIPLIER, MAX_SHIELD_LEVEL } from './gameData';
import { loadGame, saveGame, resetGame, registerAutosave } from './saveSystem';
import { audio } from './audio';
import { CombatEngine, CombatCallbacks } from './combatEngine';
import { GameIcon, SkillIcon } from './Icons';

const t = (profile: SaveProfile, ru: string, en: string) => profile.language === 'ru' ? ru : en;

// Count-up animation hook
function useCountUp(value: number, duration = 400): number {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const startRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (value === display) return;
    fromRef.current = display;
    startRef.current = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startRef.current;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(fromRef.current + (value - fromRef.current) * eased));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value]);

  return display;
}

// Circular cooldown indicator
function CooldownRing({ cooldown, maxCooldown, size = 48 }: { cooldown: number; maxCooldown: number; size?: number }) {
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = maxCooldown > 0 ? 1 - cooldown / maxCooldown : 1;
  const offset = circumference * (1 - progress);

  return (
    <svg className="cooldown-ring" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth="3" />
      <circle
        cx={size / 2} cy={size / 2} r={radius} fill="none"
        stroke="#f0c050" strokeWidth="3"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.1s linear' }}
      />
      {cooldown > 0 && (
        <text x={size / 2} y={size / 2 + 4} textAnchor="middle" fontSize="14" fill="#f0c050" fontWeight="bold">
          {Math.ceil(cooldown)}
        </text>
      )}
    </svg>
  );
}

export default function App() {
  const [profile, setProfile] = useState<SaveProfile>(() => loadGame());
  const [screen, setScreen] = useState<ScreenName>('platform-select');
  const [toast, setToast] = useState<{ msg: string; type: 'info' | 'error' | 'success' } | null>(null);
  const [bagOpen, setBagOpen] = useState(false);
  const [bagTab, setBagTab] = useState<'bag' | 'trophies'>('bag');
  const [selectedBagItem, setSelectedBagItem] = useState<string | null>(null);
  const [selectedTrophy, setSelectedTrophy] = useState<string | null>(null);
  const [waveResult, setWaveResult] = useState<{ result: CombatResult; wave: number; gold: number; exp: number } | null>(null);
  const [hudData, setHudData] = useState({
    wave: 1, health: 100, maxHealth: 100, stamina: 100, maxStamina: 100,
    exp: 0, expNeeded: 100, level: 1, gold: 0,
    potions: { health: 0, stamina: 0, revival: 0 },
    healthCd: 0, staminaCd: 0,
    bossName1: null as string | null, bossHp1: 0,
    bossName2: null as string | null, bossHp2: 0,
  });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<CombatEngine | null>(null);
  const joystickRef = useRef<{ active: boolean; cx: number; cy: number; dx: number; dy: number }>({ active: false, cx: 0, cy: 0, dx: 0, dy: 0 });
  const profileRef = useRef(profile);
  profileRef.current = profile;

  // Count-up animated values (hooks must be at top level, not conditional)
  const displayGold = useCountUp(hudData.gold);
  const displayHealth = useCountUp(hudData.health);
  const displayStamina = useCountUp(hudData.stamina);

  // Register autosave on tab close
  useEffect(() => {
    registerAutosave(() => profileRef.current);
  }, []);

  // Determine initial screen
  useEffect(() => {
    if (!profile.hasSeenIntro) {
      setScreen('platform-select');
    } else {
      setScreen('title');
    }
    audio.setVolume(profile.settings.volume);
  }, []);

  // Persist profile on every change
  useEffect(() => {
    saveGame(profile);
  }, [profile]);

  const showToast = useCallback((msg: string, type: 'info' | 'error' | 'success' = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2000);
  }, []);

  const updateProfile = useCallback((partial: Partial<SaveProfile>) => {
    setProfile(prev => {
      const next = { ...prev, ...partial };
      saveGame(next);
      return next;
    });
  }, []);

  // === PLATFORM SELECT ===
  const selectPlatform = (platform: Platform) => {
    audio.init();
    audio.resume();
    audio.playSfx('ui-click');
    updateProfile({ platform, hasSeenIntro: true });
    setScreen('title');
  };

  // === TITLE SCREEN ===
  const startGame = () => {
    audio.init();
    audio.resume();
    audio.playSfx('ui-click');
    audio.startMusic();
    setScreen('guild');
  };

  const goToSettings = () => {
    audio.playSfx('ui-click');
    setScreen('settings');
  };

  // === SETTINGS ===
  const changeLanguage = (lang: 'ru' | 'en') => {
    audio.playSfx('ui-click');
    updateProfile({ language: lang });
  };

  const changeGameMode = (mode: GameMode) => {
    audio.playSfx('ui-click');
    updateProfile({ gameMode: mode });
  };

  const changeControlScheme = (scheme: 'wasd' | 'arrows') => {
    audio.playSfx('ui-click');
    updateProfile({ settings: { ...profile.settings, controlScheme: scheme } });
  };

  const changeVolume = (vol: number) => {
    audio.setVolume(vol);
    updateProfile({ settings: { ...profile.settings, volume: vol } });
  };

  const changeBrightness = (b: number) => {
    updateProfile({ settings: { ...profile.settings, brightness: b } });
  };

  const toggleSound = () => {
    audio.playSfx('ui-click');
    const enabled = !profile.settings.soundEnabled;
    audio.setVolume(enabled ? profile.settings.volume : 0);
    updateProfile({ settings: { ...profile.settings, soundEnabled: enabled } });
  };

  const resetSave = () => {
    const def = resetGame();
    setProfile(def);
    setScreen('platform-select');
    showToast(t(def, 'Прогресс сброшен', 'Progress reset'), 'info');
  };

  // === GUILD: CHARACTER PURCHASE & EQUIP ===
  const buyCharacter = (charId: CharacterClass) => {
    const char = CHARACTERS.find(c => c.id === charId)!;
    if (profile.ownedCharacters.includes(charId)) return;
    if (profile.gold < char.cost) {
      showToast(t(profile, 'Недостаточно золота', 'Not enough gold'), 'error');
      audio.playSfx('reject');
      return;
    }
    audio.playSfx('purchase');
    updateProfile({
      gold: profile.gold - char.cost,
      ownedCharacters: [...profile.ownedCharacters, charId],
    });
    showToast(t(profile, `Куплен: ${char.name.ru}`, `Purchased: ${char.name.en}`), 'success');
  };

  const equipCharacter = (charId: CharacterClass) => {
    if (!profile.ownedCharacters.includes(charId)) return;
    audio.playSfx('ui-click');
    updateProfile({ equippedCharacter: charId });
  };

  // === GUILD: SKILL PURCHASE ===
  const buySkill = (charId: CharacterClass, skillId: string) => {
    const char = CHARACTERS.find(c => c.id === charId)!;
    const skill = char.skills.find(s => s.id === skillId)!;
    const unlocked = profile.unlockedSkills[charId] || [];

    if (unlocked.includes(skillId)) return;
    if (skill.requires && !unlocked.includes(skill.requires)) {
      showToast(t(profile, 'Сначала откройте предыдущий навык', 'Unlock previous skill first'), 'error');
      audio.playSfx('reject');
      return;
    }
    if (profile.gold < skill.cost) {
      showToast(t(profile, 'Недостаточно золота', 'Not enough gold'), 'error');
      audio.playSfx('reject');
      return;
    }
    audio.playSfx('skill-up');
    const newSkills = [...unlocked, skillId];
    updateProfile({
      gold: profile.gold - skill.cost,
      unlockedSkills: { ...profile.unlockedSkills, [charId]: newSkills },
    });
    showToast(t(profile, `Открыт навык: ${skill.name.ru}`, `Unlocked: ${skill.name.en}`), 'success');
  };

  // === GUILD: POTION PURCHASE ===
  const buyPotion = (potionId: 'health' | 'stamina' | 'revival') => {
    const potion = POTIONS.find(p => p.id === potionId)!;
    if (profile.gold < potion.cost) {
      showToast(t(profile, 'Недостаточно золота', 'Not enough gold'), 'error');
      audio.playSfx('reject');
      return;
    }
    audio.playSfx('purchase');
    updateProfile({
      gold: profile.gold - potion.cost,
      ownedPotions: { ...profile.ownedPotions, [potionId]: profile.ownedPotions[potionId] + 1 },
    });
    showToast(t(profile, `Куплено: ${potion.name.ru}`, `Bought: ${potion.name.en}`), 'success');
  };

  // === GUILD: BAG UPGRADE ===
  const upgradeBag = () => {
    const nextLevel = profile.bagLevel + 1;
    const nextBag = BAG_LEVELS.find(b => b.level === nextLevel);
    if (!nextBag) {
      showToast(t(profile, 'Максимальный уровень мешка', 'Bag at max level'), 'info');
      return;
    }
    if (profile.gold < nextBag.cost) {
      showToast(t(profile, 'Недостаточно золота', 'Not enough gold'), 'error');
      audio.playSfx('reject');
      return;
    }
    audio.playSfx('purchase');
    updateProfile({ gold: profile.gold - nextBag.cost, bagLevel: nextLevel });
    showToast(t(profile, `Мешок улучшен до ур. ${nextLevel}`, `Bag upgraded to lvl ${nextLevel}`), 'success');
  };

  // === GUILD: DUNGEON UNLOCK ===
  const unlockDungeon = (dungeonId: string) => {
    const dg = DUNGEONS.find(d => d.id === dungeonId)!;
    if (profile.unlockedDungeons.includes(dungeonId)) return;
    if (profile.level < dg.minLevel) {
      showToast(t(profile, `Требуется уровень ${dg.minLevel}`, `Requires level ${dg.minLevel}`), 'error');
      audio.playSfx('reject');
      return;
    }
    if (profile.gold < dg.unlockCost) {
      showToast(t(profile, 'Недостаточно золота', 'Not enough gold'), 'error');
      audio.playSfx('reject');
      return;
    }
    audio.playSfx('purchase');
    updateProfile({
      gold: profile.gold - dg.unlockCost,
      unlockedDungeons: [...profile.unlockedDungeons, dungeonId],
    });
    showToast(t(profile, `Открыто: ${dg.name.ru}`, `Unlocked: ${dg.name.en}`), 'success');
  };

  const toggleDungeonEquip = (dungeonId: string) => {
    if (!profile.unlockedDungeons.includes(dungeonId)) return;
    const equipped = profile.equippedDungeons.includes(dungeonId);
    if (equipped) {
      if (profile.equippedDungeons.length <= 1) {
        showToast(t(profile, 'Должно быть хотя бы одно подземелье', 'At least one dungeon required'), 'error');
        return;
      }
      updateProfile({ equippedDungeons: profile.equippedDungeons.filter(d => d !== dungeonId) });
    } else {
      // Multi-equip rule: can only equip multiple dungeons if all have equal progress
      const currentProgress = profile.equippedDungeons.length > 0
        ? (profile.dungeonProgress[profile.equippedDungeons[0]] || 0)
        : 0;
      if (profile.equippedDungeons.length > 0) {
        for (const dgId of profile.equippedDungeons) {
          const prog = profile.dungeonProgress[dgId] || 0;
          if (prog !== currentProgress) {
            showToast(profile.language === 'ru'
              ? 'Вы можете экипировать несколько подземелий одновременно, только если у них совпадает текущее количество пройденных волн!'
              : 'You can equip multiple dungeons simultaneously only if they have the same number of completed waves!',
              'error');
            return;
          }
        }
      }
      updateProfile({ equippedDungeons: [...profile.equippedDungeons, dungeonId] });
    }
    audio.playSfx('ui-click');
  };

  // === BAG: SELL/MOVE ===
  const sellBoss = (uid: string) => {
    const boss = profile.bag.find(b => b.uid === uid);
    if (!boss) return;
    audio.playSfx('gold');
    updateProfile({
      bag: profile.bag.filter(b => b.uid !== uid),
      gold: profile.gold + boss.sellPrice,
    });
    setSelectedBagItem(null);
    showToast(t(profile, `Продано за ${boss.sellPrice} зол.`, `Sold for ${boss.sellPrice} gold`), 'success');
  };

  const moveToTrophy = (uid: string) => {
    const boss = profile.bag.find(b => b.uid === uid);
    if (!boss) return;
    const trophy: Trophy = {
      uid: boss.uid, enemyId: boss.enemyId, name: boss.name,
      ability: boss.ability, sellPrice: boss.sellPrice,
      difficulty: boss.difficulty, icon: boss.icon, trophyAt: Date.now(),
    };
    audio.playSfx('ui-click');
    updateProfile({
      bag: profile.bag.filter(b => b.uid !== uid),
      trophies: [...profile.trophies, trophy],
    });
    setSelectedBagItem(null);
    showToast(t(profile, 'Перемещено в Трофеи', 'Moved to Trophies'), 'success');
  };

  const takeTrophyBack = (uid: string) => {
    const capacity = BAG_LEVELS.find(b => b.level === profile.bagLevel)?.capacity || 1;
    if (profile.bag.length >= capacity) {
      showToast(t(profile, 'Мешок полон', 'Bag is full'), 'error');
      return;
    }
    const trophy = profile.trophies.find(t => t.uid === uid);
    if (!trophy) return;
    const boss: CapturedBoss = {
      uid: trophy.uid, enemyId: trophy.enemyId, name: trophy.name,
      ability: trophy.ability, sellPrice: trophy.sellPrice,
      difficulty: trophy.difficulty, icon: trophy.icon, capturedAt: trophy.trophyAt,
    };
    audio.playSfx('ui-click');
    updateProfile({
      trophies: profile.trophies.filter(t => t.uid !== uid),
      bag: [...profile.bag, boss],
    });
    setSelectedTrophy(null);
    showToast(t(profile, 'Возвращено в мешок', 'Returned to bag'), 'success');
  };

  // === START COMBAT ===
  const startCombat = () => {
    if (profile.equippedDungeons.length === 0) {
      showToast(t(profile, 'Выберите подземелье', 'Select a dungeon'), 'error');
      return;
    }
    audio.playSfx('ui-click');
    audio.startMusic();
    setWaveResult(null);
    setScreen('combat');
  };

  // === COMBAT: init engine ===
  useEffect(() => {
    if (screen !== 'combat' || !canvasRef.current) return;

    const timer = setTimeout(() => {
      if (!canvasRef.current) return;
      const canvas = canvasRef.current;
      const currentProfile = profileRef.current;

      const callbacks: CombatCallbacks = {
        onWaveCleared: (wave, goldEarned, expEarned) => {
          setProfile(prev => {
            let newExp = prev.exp + expEarned;
            let newLevel = prev.level;
            let expNeeded = Math.floor(EXP_PER_LEVEL * Math.pow(EXP_LEVEL_MULTIPLIER, newLevel - 1));
            while (newExp >= expNeeded) {
              newExp -= expNeeded;
              newLevel++;
              expNeeded = Math.floor(EXP_PER_LEVEL * Math.pow(EXP_LEVEL_MULTIPLIER, newLevel - 1));
            }
            const next = {
              ...prev,
              gold: prev.gold + goldEarned,
              exp: newExp,
              level: newLevel,
              totalWavesCleared: prev.totalWavesCleared + 1,
            };
            saveGame(next);
            return next;
          });
        },
        onPlayerDeath: () => {},
        onBossCaptured: (boss) => {
          setProfile(prev => {
            const capacity = BAG_LEVELS.find(b => b.level === prev.bagLevel)?.capacity || 1;
            if (prev.bag.length >= capacity) {
              showToast(t(prev, 'Мешок полон! Босс не пойман', 'Bag full! Boss not captured'), 'error');
              return prev;
            }
            const next = { ...prev, bag: [...prev.bag, boss] };
            saveGame(next);
            return next;
          });
        },
        onProfileUpdate: (partial) => {
          setProfile(prev => {
            const next = { ...prev, ...partial };
            saveGame(next);
            return next;
          });
        },
        onPotionUsed: (type) => {
          setProfile(prev => {
            const next = {
              ...prev,
              ownedPotions: { ...prev.ownedPotions, [type]: Math.max(0, prev.ownedPotions[type] - 1) },
            };
            saveGame(next);
            return next;
          });
        },
        onPotionCooldownUpdate: (type, cd, max) => {
          setHudData(prev => type === 'health' ? { ...prev, healthCd: cd } : { ...prev, staminaCd: cd });
        },
        onWaveResult: (result, wave, goldEarned, expEarned) => {
          setWaveResult({ result, wave, gold: goldEarned, exp: expEarned });
        },
        onBossHpChange: (bossName1, hpPercent1, bossName2?, hpPercent2?) => {
          setHudData(prev => ({
            ...prev,
            bossName1: bossName1 || null,
            bossHp1: hpPercent1,
            bossName2: bossName2 || null,
            bossHp2: hpPercent2 ?? 0,
          }));
        },
        onShieldHit: (remainingHits) => {
          // Update shield hits in profile via ref without causing re-render mid-combat
          profileRef.current = { ...profileRef.current, shieldHits: remainingHits };
        },
      };

      const engine = new CombatEngine(canvas, currentProfile, callbacks);
      // In easy mode, resume from last cleared wave for the first equipped dungeon
      if (currentProfile.gameMode === 'easy') {
        const maxProgress = Math.max(0, ...currentProfile.equippedDungeons.map(
          dgId => currentProfile.dungeonProgress[dgId] || 0
        ));
        if (maxProgress > 0) {
          engine.startWave = maxProgress + 1;
        }
      }
      engineRef.current = engine;
      engine.start();

      const hudInterval = setInterval(() => {
        if (!engineRef.current) return;
        const e = engineRef.current;
        const p = e.player;
        const curProfile = profileRef.current;
        const expNeeded = Math.floor(EXP_PER_LEVEL * Math.pow(EXP_LEVEL_MULTIPLIER, curProfile.level - 1));
        setHudData(prev => ({
          ...prev,
          wave: e.currentWave,
          health: Math.max(0, Math.floor(p.health)),
          maxHealth: Math.floor(p.maxHealth),
          stamina: Math.max(0, Math.floor(p.stamina)),
          maxStamina: Math.floor(p.maxStamina),
          exp: Math.floor(curProfile.exp),
          expNeeded,
          level: curProfile.level,
          gold: curProfile.gold,
          potions: { ...curProfile.ownedPotions },
          healthCd: e.healthPotionCooldown,
          staminaCd: e.staminaPotionCooldown,
          bossName1: e.bossName1 || null,
          bossHp1: e.bossHp1,
          bossName2: e.bossName2 || null,
          bossHp2: e.bossHp2,
        }));
      }, 100);

      return () => {
        clearInterval(hudInterval);
        engine.stop();
        engineRef.current = null;
      };
    }, 100);

    return () => clearTimeout(timer);
  }, [screen]);

  // === KEYBOARD HANDLERS ===
  useEffect(() => {
    if (screen !== 'combat') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!engineRef.current) return;
      const engine = engineRef.current;
      engine.keys[e.code] = true;

      if (e.code === 'Digit1') {
        engine.useHealthPotion();
      } else if (e.code === 'Digit2') {
        engine.useStaminaPotion();
      } else if (e.code === 'KeyB' || e.code === 'Escape') {
        e.preventDefault();
        setBagOpen(prev => {
          const next = !prev;
          engine.setPaused(next);
          return next;
        });
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!engineRef.current) return;
      engineRef.current.keys[e.code] = false;
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (!engineRef.current) return;
      if (e.button === 0) engineRef.current.mouseDown = true;
      if (e.button === 2) engineRef.current.rightMouseDown = true;
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!engineRef.current) return;
      if (e.button === 0) engineRef.current.mouseDown = false;
      if (e.button === 2) engineRef.current.rightMouseDown = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!engineRef.current || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      engineRef.current.mousePos.x = e.clientX - rect.left;
      engineRef.current.mousePos.y = e.clientY - rect.top;
    };

    const handleContextMenu = (e: Event) => e.preventDefault();

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [screen]);

  useEffect(() => {
    const handleResize = () => {
      if (engineRef.current) engineRef.current.resize();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // === MOBILE JOYSTICK ===
  const handleJoystickStart = (e: React.TouchEvent | React.MouseEvent) => {
    const base = e.currentTarget as HTMLElement;
    const rect = base.getBoundingClientRect();
    joystickRef.current = { active: true, cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2, dx: 0, dy: 0 };
  };

  const handleJoystickMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!joystickRef.current.active || !engineRef.current) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    const dx = clientX - joystickRef.current.cx;
    const dy = clientY - joystickRef.current.cy;
    const mag = Math.sqrt(dx * dx + dy * dy);
    const maxDist = 50;
    const clampedMag = Math.min(mag, maxDist);
    const nx = mag > 0 ? dx / mag : 0;
    const ny = mag > 0 ? dy / mag : 0;
    joystickRef.current.dx = nx * (clampedMag / maxDist);
    joystickRef.current.dy = ny * (clampedMag / maxDist);
    engineRef.current.mobileMove.x = joystickRef.current.dx;
    engineRef.current.mobileMove.y = joystickRef.current.dy;

    const knob = document.getElementById('joystick-knob');
    if (knob) {
      knob.style.transform = `translate(calc(-50% + ${nx * clampedMag}px), calc(-50% + ${ny * clampedMag}px))`;
    }
  };

  const handleJoystickEnd = () => {
    joystickRef.current.active = false;
    if (engineRef.current) {
      engineRef.current.mobileMove.x = 0;
      engineRef.current.mobileMove.y = 0;
    }
    const knob = document.getElementById('joystick-knob');
    if (knob) knob.style.transform = 'translate(-50%, -50%)';
  };

  // === WAVE RESULT ACTIONS ===
  const continueNextWave = () => {
    setWaveResult(null);
    engineRef.current?.continueToNextWave();
  };

  const retryWave = () => {
    setWaveResult(null);
    engineRef.current?.retryWave();
  };

  // === TALENT PURCHASE (per-character) ===
  const buyTalent = (type: 'damage' | 'health') => {
    const cost = type === 'damage' ? TALENT_DAMAGE_COST : TALENT_HEALTH_COST;
    if (profile.gold < cost) {
      showToast(t(profile, 'Недостаточно золота', 'Not enough gold'), 'error');
      audio.playSfx('reject');
      return;
    }
    audio.playSfx('skill-up');
    const charId = profile.equippedCharacter;
    const charTalents = profile.talentLevels[charId] || { damage: 0, health: 0 };
    const currentLevel = charTalents[type];
    updateProfile({
      gold: profile.gold - cost,
      talentLevels: {
        ...profile.talentLevels,
        [charId]: { ...charTalents, [type]: currentLevel + 1 },
      },
    });
    showToast(t(profile, `Талант улучшен до ур. ${currentLevel + 1}`, `Talent upgraded to lvl ${currentLevel + 1}`), 'success');
  };

  // === SHIELD PURCHASE (warrior only) ===
  const buyShield = () => {
    const nextLevel = profile.shieldLevel + 1;
    if (nextLevel > MAX_SHIELD_LEVEL) {
      showToast(t(profile, 'Максимальный уровень щита', 'Shield at max level'), 'info');
      return;
    }
    const cost = nextLevel * SHIELD_COST_MULTIPLIER;
    if (profile.gold < cost) {
      showToast(t(profile, 'Недостаточно золота', 'Not enough gold'), 'error');
      audio.playSfx('reject');
      return;
    }
    audio.playSfx('purchase');
    updateProfile({
      gold: profile.gold - cost,
      shieldLevel: nextLevel,
      shieldHits: nextLevel * SHIELD_HITS_MULTIPLIER,
    });
    showToast(t(profile, `Щит улучшен до ур. ${nextLevel}`, `Shield upgraded to lvl ${nextLevel}`), 'success');
  };

  const toggleShieldEquip = () => {
    if (profile.shieldLevel === 0) {
      showToast(t(profile, 'Сначала купите щит', 'Buy a shield first'), 'error');
      return;
    }
    audio.playSfx('ui-click');
    if (profile.shieldEquipped) {
      updateProfile({ shieldEquipped: false });
      showToast(t(profile, 'Щит снят', 'Shield unequipped'), 'info');
    } else {
      const maxHits = profile.shieldLevel * SHIELD_HITS_MULTIPLIER;
      updateProfile({ shieldEquipped: true, shieldHits: maxHits });
      showToast(t(profile, 'Щит экипирован (заряд заменяет рывок)', 'Shield equipped (charge replaced)'), 'success');
    }
  };

  const exitToGuild = () => {
    // Hard mode: exiting always resets wave progress for equipped dungeons
    if (profile.gameMode === 'hard') {
      const resetProgress = { ...profile.dungeonProgress };
      for (const dgId of profile.equippedDungeons) {
        delete resetProgress[dgId];
      }
      updateProfile({ dungeonProgress: resetProgress });
    }
    // Easy mode: progress is saved, no reset
    if (engineRef.current) {
      engineRef.current.stop();
      engineRef.current = null;
    }
    setWaveResult(null);
    setScreen('guild');
    audio.playSfx('ui-click');
  };

  const restartFromWave1 = () => {
    // Hard mode defeat: restart from wave 1 with full reset
    const resetProgress = { ...profile.dungeonProgress };
    for (const dgId of profile.equippedDungeons) {
      delete resetProgress[dgId];
    }
    updateProfile({ dungeonProgress: resetProgress });
    if (engineRef.current) {
      engineRef.current.stop();
      engineRef.current = null;
    }
    setWaveResult(null);
    setScreen('guild');
    audio.playSfx('ui-click');
  };

  const resetWaveProgress = () => {
    const resetProgress = { ...profile.dungeonProgress };
    for (const dgId of profile.equippedDungeons) {
      resetProgress[dgId] = 0;
    }
    updateProfile({ dungeonProgress: resetProgress });
    showToast(profile.language === 'ru' ? 'Прогресс волн сброшен' : 'Wave progress reset', 'info');
    audio.playSfx('ui-click');
  };

  const useRevival = () => {
    if (engineRef.current?.useRevivalPotion()) {
      setWaveResult(null);
    }
  };

  // === BAG CAPACITY ===
  const bagCapacity = BAG_LEVELS.find(b => b.level === profile.bagLevel)?.capacity || 1;
  const selectedBoss = profile.bag.find(b => b.uid === selectedBagItem);
  const selectedTrophyItem = profile.trophies.find(t => t.uid === selectedTrophy);

  // === RENDER SCREENS ===
  if (screen === 'platform-select' && !profile.hasSeenIntro) {
    return (
      <div className="app-container">
        <div className="screen">
          <div className="platform-select-bg" />
          <div className="platform-select-content">
            <h1 className="platform-select-title">{t(profile, 'Выбор платформы', 'Select Platform')}</h1>
            <p className="platform-select-subtitle">{t(profile, 'На чём вы играете?', 'What are you playing on?')}</p>
            <div className="platform-select-buttons">
              <button className="platform-btn" onClick={() => selectPlatform('mobile')}>
                <div className="platform-btn-icon">
                  <svg viewBox="0 0 80 80" width="80" height="80">
                    <rect x="20" y="8" width="40" height="64" rx="6" fill="none" stroke="#c89b3c" strokeWidth="3" />
                    <circle cx="40" cy="56" r="4" fill="#c89b3c" />
                    <rect x="28" y="16" width="24" height="32" fill="#c89b3c" opacity="0.15" />
                  </svg>
                </div>
                <span className="platform-btn-label">{t(profile, 'Телефон', 'Phone')}</span>
              </button>
              <button className="platform-btn" onClick={() => selectPlatform('pc')}>
                <div className="platform-btn-icon">
                  <svg viewBox="0 0 80 80" width="80" height="80">
                    <rect x="8" y="12" width="64" height="44" rx="4" fill="none" stroke="#c89b3c" strokeWidth="3" />
                    <rect x="14" y="18" width="52" height="32" fill="#c89b3c" opacity="0.15" />
                    <rect x="24" y="60" width="32" height="4" fill="#c89b3c" />
                    <rect x="16" y="64" width="48" height="4" rx="2" fill="#c89b3c" />
                  </svg>
                </div>
                <span className="platform-btn-label">{t(profile, 'Компьютер', 'Computer')}</span>
              </button>
            </div>
          </div>
        </div>
        {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
      </div>
    );
  }

  if (screen === 'title') {
    return (
      <div className="app-container">
        <div className="screen">
          <div className="title-bg" />
          <div className="title-content">
            <h1 className="title-logo">{t(profile, 'Эхо Приключенца', 'Echoes of the Adventurer')}</h1>
            <p className="title-subtitle">{t(profile, 'RPG Волновой Бой', 'Wave Action RPG')}</p>
            <div className="title-buttons">
              <button className="title-btn title-btn-primary" onClick={startGame}>
                {t(profile, 'Начать игру', 'Start Game')}
              </button>
              <button className="title-btn" onClick={goToSettings}>
                {t(profile, 'Настройки', 'Settings')}
              </button>
            </div>
            <div className="title-mode-display">
              {t(profile, 'Режим', 'Mode')}: {profile.gameMode === 'easy' ? t(profile, 'Лёгкий', 'Easy') : t(profile, 'Сложный', 'Hard')}
            </div>
          </div>
          <div className="title-footer">
            {t(profile, 'Прогресс сохраняется автоматически', 'Progress saves automatically')}
          </div>
        </div>
        {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
      </div>
    );
  }

  if (screen === 'settings') {
    return (
      <div className="app-container">
        <div className="screen" style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <div className="settings-panel">
            <h2 className="guild-title" style={{ textAlign: 'center', marginBottom: '24px' }}>
              {t(profile, 'Настройки', 'Settings')}
            </h2>
            <div className="settings-row">
              <span className="settings-label">{t(profile, 'Язык', 'Language')}</span>
              <div className="settings-value">
                <button className={`guild-tab ${profile.language === 'ru' ? 'active' : ''}`} onClick={() => changeLanguage('ru')}>RU</button>
                <button className={`guild-tab ${profile.language === 'en' ? 'active' : ''}`} onClick={() => changeLanguage('en')}>EN</button>
              </div>
            </div>
            <div className="settings-row">
              <span className="settings-label">{t(profile, 'Режим игры', 'Game Mode')}</span>
              <div className="settings-value">
                <button className={`guild-tab ${profile.gameMode === 'easy' ? 'active' : ''}`} onClick={() => changeGameMode('easy')}>
                  {t(profile, 'Лёгкий', 'Easy')}
                </button>
                <button className={`guild-tab ${profile.gameMode === 'hard' ? 'active' : ''}`} onClick={() => changeGameMode('hard')}>
                  {t(profile, 'Сложный', 'Hard')}
                </button>
              </div>
            </div>
            <div className="settings-row">
              <span className="settings-label">{t(profile, 'Устройство', 'Device')}</span>
              <div className="settings-value">
                <button className={`guild-tab ${profile.platform === 'mobile' ? 'active' : ''}`} onClick={() => { audio.playSfx('ui-click'); updateProfile({ platform: 'mobile' }); }}>
                  {t(profile, 'Телефон', 'Phone')}
                </button>
                <button className={`guild-tab ${profile.platform === 'pc' ? 'active' : ''}`} onClick={() => { audio.playSfx('ui-click'); updateProfile({ platform: 'pc' }); }}>
                  {t(profile, 'Компьютер', 'Computer')}
                </button>
              </div>
            </div>
            {profile.platform === 'pc' && (
              <div className="settings-row">
                <span className="settings-label">{t(profile, 'Управление', 'Controls')}</span>
                <select className="settings-select" value={profile.settings.controlScheme} onChange={e => changeControlScheme(e.target.value as 'wasd' | 'arrows')}>
                  <option value="wasd">WASD</option>
                  <option value="arrows">{t(profile, 'Стрелки', 'Arrow Keys')}</option>
                </select>
              </div>
            )}
            <div className="settings-row">
              <span className="settings-label">{t(profile, 'Звук', 'Sound')}</span>
              <div className="settings-value">
                <button className={`guild-tab ${profile.settings.soundEnabled ? 'active' : ''}`} onClick={toggleSound}>
                  {profile.settings.soundEnabled ? t(profile, 'Вкл', 'On') : t(profile, 'Выкл', 'Off')}
                </button>
              </div>
            </div>
            <div className="settings-row">
              <span className="settings-label">{t(profile, 'Громкость', 'Volume')}</span>
              <div className="settings-value">
                <input type="range" className="settings-slider" min="0" max="100" value={profile.settings.volume} onChange={e => changeVolume(Number(e.target.value))} />
                <span className="settings-value-display">{profile.settings.volume}%</span>
              </div>
            </div>
            <div className="settings-row">
              <span className="settings-label">{t(profile, 'Яркость', 'Brightness')}</span>
              <div className="settings-value">
                <input type="range" className="settings-slider" min="50" max="150" value={profile.settings.brightness} onChange={e => changeBrightness(Number(e.target.value))} />
                <span className="settings-value-display">{profile.settings.brightness}%</span>
              </div>
            </div>
            <div className="settings-row">
              <span className="settings-label">{t(profile, 'Сбросить прогресс', 'Reset Progress')}</span>
              <button className="btn-buy" style={{ background: 'linear-gradient(135deg, #8a1a1a, #df3f3f)' }} onClick={resetSave}>
                {t(profile, 'Сбросить', 'Reset')}
              </button>
            </div>
            <div style={{ textAlign: 'center', marginTop: '24px' }}>
              <button className="title-btn" onClick={() => { audio.playSfx('ui-click'); setScreen('title'); }}>
                {t(profile, 'Назад', 'Back')}
              </button>
            </div>
          </div>
        </div>
        {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
      </div>
    );
  }

  if (screen === 'guild') {
    return (
      <div className="app-container">
        <GuildScreen
          profile={profile}
          updateProfile={updateProfile}
          showToast={showToast}
          buyCharacter={buyCharacter}
          equipCharacter={equipCharacter}
          buySkill={buySkill}
          buyPotion={buyPotion}
          upgradeBag={upgradeBag}
          unlockDungeon={unlockDungeon}
          toggleDungeonEquip={toggleDungeonEquip}
          sellBoss={sellBoss}
          moveToTrophy={moveToTrophy}
          takeTrophyBack={takeTrophyBack}
          startCombat={startCombat}
          buyTalent={buyTalent}
          buyShield={buyShield}
          toggleShieldEquip={toggleShieldEquip}
          resetWaveProgress={resetWaveProgress}
          onBack={() => { audio.playSfx('ui-click'); setScreen('title'); }}
        />
        {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
      </div>
    );
  }

  if (screen === 'combat') {
    return (
      <div className="app-container" style={{ filter: `brightness(${profile.settings.brightness}%)` }}>
        <div className="combat-screen">
          <canvas ref={canvasRef} className="combat-canvas" />

          {/* HUD Top Left: Health, Stamina, Exp bars */}
          <div className="hud-top-left">
            <div className="hud-bar-container">
              <div className="hud-bar-fill health" style={{ width: `${(displayHealth / hudData.maxHealth) * 100}%` }} />
              <span className="hud-bar-label">{displayHealth} / {hudData.maxHealth} HP</span>
            </div>
            <div className="hud-bar-container">
              <div className="hud-bar-fill stamina" style={{ width: `${(displayStamina / hudData.maxStamina) * 100}%` }} />
              <span className="hud-bar-label">{displayStamina} / {hudData.maxStamina} STA</span>
            </div>
            <div className="hud-bar-container" style={{ height: '14px' }}>
              <div className="hud-bar-fill exp" style={{ width: `${(hudData.exp / hudData.expNeeded) * 100}%` }} />
              <span className="hud-bar-label">Lv.{hudData.level} - {hudData.exp}/{hudData.expNeeded}</span>
            </div>
          </div>

          {/* HUD Top Right: Wave info, Gold */}
          <div className="hud-top-right">
            <div className="hud-wave-info">
              <div className="hud-wave-number">{t(profile, 'Волна', 'Wave')} {hudData.wave}</div>
              <div className="hud-wave-label">{t(profile, 'из', 'of')} {MAX_WAVES}</div>
            </div>
            <div className="hud-gold">
              <svg viewBox="0 0 24 24" width="16" height="16"><circle cx="12" cy="12" r="10" fill="#c89b3c" stroke="#8a6a20" strokeWidth="1" /><text x="12" y="16" textAnchor="middle" fontSize="12" fill="#fff" fontWeight="bold">G</text></svg>
              {displayGold}
            </div>
          </div>

          {/* Boss HP bars - up to 2 bars (one below another) for multi-boss waves */}
          {hudData.bossName1 && (
            <div className="boss-hp-bar-container" style={{ top: '16px', left: '50%', transform: 'translateX(-50%)' }}>
              <div className="boss-hp-name">{hudData.bossName1}</div>
              <div className="boss-hp-bar-bg">
                <div className="boss-hp-bar-fill" style={{ width: `${hudData.bossHp1 * 100}%` }} />
              </div>
            </div>
          )}
          {hudData.bossName2 && (
            <div className="boss-hp-bar-container" style={{ top: hudData.bossName1 ? '52px' : '16px', left: '50%', transform: 'translateX(-50%)' }}>
              <div className="boss-hp-name">{hudData.bossName2}</div>
              <div className="boss-hp-bar-bg">
                <div className="boss-hp-bar-fill" style={{ width: `${hudData.bossHp2 * 100}%` }} />
              </div>
            </div>
          )}

          {/* Potions */}
          <div className="hud-potions">
            {hudData.potions.health > 0 && (
              <div className="hud-potion-wrapper">
                <button
                  className="hud-potion-btn"
                  onClick={() => engineRef.current?.useHealthPotion()}
                  disabled={hudData.healthCd > 0}
                >
                  <div className="hud-potion-key">1</div>
                  <GameIcon name="potion_health" size={28} />
                  <span className="hud-potion-count">{hudData.potions.health}</span>
                  {hudData.healthCd > 0 && (
                    <div className="cooldown-overlay">
                      <CooldownRing cooldown={hudData.healthCd} maxCooldown={POTION_COOLDOWN} />
                    </div>
                  )}
                </button>
              </div>
            )}
            {hudData.potions.stamina > 0 && (
              <div className="hud-potion-wrapper">
                <button
                  className="hud-potion-btn"
                  onClick={() => engineRef.current?.useStaminaPotion()}
                  disabled={hudData.staminaCd > 0}
                >
                  <div className="hud-potion-key">2</div>
                  <GameIcon name="potion_stamina" size={28} />
                  <span className="hud-potion-count">{hudData.potions.stamina}</span>
                  {hudData.staminaCd > 0 && (
                    <div className="cooldown-overlay">
                      <CooldownRing cooldown={hudData.staminaCd} maxCooldown={POTION_COOLDOWN} />
                    </div>
                  )}
                </button>
              </div>
            )}
            {hudData.potions.revival > 0 && (
              <div className="hud-potion-btn" style={{ opacity: 0.7 }}>
                <GameIcon name="potion_revival" size={28} />
                <span className="hud-potion-count">{hudData.potions.revival}</span>
              </div>
            )}
          </div>

          {/* Controls bottom left */}
          <div className="hud-controls-left">
            <button className="hud-btn" onClick={() => {
              const eng = engineRef.current;
              if (!eng) return;
              setBagOpen(prev => {
                eng.setPaused(!prev);
                return !prev;
              });
            }}>
              {t(profile, 'Мешок (B)', 'Bag (B)')}
            </button>
          </div>

          {/* Mobile controls */}
          {profile.platform === 'mobile' && (
            <>
              <div
                className="mobile-joystick"
                onTouchStart={handleJoystickStart}
                onTouchMove={handleJoystickMove}
                onTouchEnd={handleJoystickEnd}
                onMouseDown={handleJoystickStart}
                onMouseMove={handleJoystickMove}
                onMouseUp={handleJoystickEnd}
                onMouseLeave={handleJoystickEnd}
              >
                <div className="joystick-base">
                  <div className="joystick-knob" id="joystick-knob" />
                </div>
              </div>
              <div className="mobile-buttons">
                <button
                  className="mobile-btn main"
                  onTouchStart={() => { if (engineRef.current) engineRef.current.mobileMainAttack = true; }}
                  onTouchEnd={() => { if (engineRef.current) engineRef.current.mobileMainAttack = false; }}
                  onMouseDown={() => { if (engineRef.current) engineRef.current.mobileMainAttack = true; }}
                  onMouseUp={() => { if (engineRef.current) engineRef.current.mobileMainAttack = false; }}
                >
                  <GameIcon name={CHARACTERS.find(c => c.id === profile.equippedCharacter)!.weaponIcon} size={28} />
                  {t(profile, 'Атака', 'Attack')}
                </button>
                {(() => {
                  const char = CHARACTERS.find(c => c.id === profile.equippedCharacter)!;
                  if (!char.hasUniqueRMB) return null;
                  const uniqueSkill = char.skills.find(s => s.type === 'active-unique');
                  if (!uniqueSkill) return null;
                  const isUnlocked = (profile.unlockedSkills[char.id] || []).includes(uniqueSkill.id);
                  if (!isUnlocked) return null;
                  return (
                    <button
                      className="mobile-btn unique"
                      onTouchStart={() => { if (engineRef.current) engineRef.current.mobileUniqueAttack = true; }}
                      onTouchEnd={() => { if (engineRef.current) engineRef.current.mobileUniqueAttack = false; }}
                      onMouseDown={() => { if (engineRef.current) engineRef.current.mobileUniqueAttack = true; }}
                      onMouseUp={() => { if (engineRef.current) engineRef.current.mobileUniqueAttack = false; }}
                    >
                      <SkillIcon name={uniqueSkill.icon} size={28} />
                      {t(profile, 'Уник.', 'Unique')}
                    </button>
                  );
                })()}
                {hudData.potions.health > 0 && (
                  <button
                    className="mobile-btn"
                    onTouchStart={() => engineRef.current?.useHealthPotion()}
                    onClick={() => engineRef.current?.useHealthPotion()}
                  >
                    <GameIcon name="potion_health" size={24} />
                    <span className="hud-potion-key">1</span>
                  </button>
                )}
                {hudData.potions.stamina > 0 && (
                  <button
                    className="mobile-btn"
                    onTouchStart={() => engineRef.current?.useStaminaPotion()}
                    onClick={() => engineRef.current?.useStaminaPotion()}
                  >
                    <GameIcon name="potion_stamina" size={24} />
                    <span className="hud-potion-key">2</span>
                  </button>
                )}
              </div>
            </>
          )}

          {/* Bag overlay during combat */}
          {bagOpen && (
            <BagOverlay
              profile={profile}
              bagTab={bagTab}
              setBagTab={setBagTab}
              selectedBagItem={selectedBagItem}
              setSelectedBagItem={setSelectedBagItem}
              selectedTrophy={selectedTrophy}
              setSelectedTrophy={setSelectedTrophy}
              selectedBoss={selectedBoss}
              selectedTrophyItem={selectedTrophyItem}
              bagCapacity={bagCapacity}
              sellBoss={sellBoss}
              moveToTrophy={moveToTrophy}
              takeTrophyBack={takeTrophyBack}
              onClose={() => {
                setBagOpen(false);
                engineRef.current?.setPaused(false);
              }}
            />
          )}

          {/* Wave result overlay */}
          {waveResult && (
            <div className="wave-result-overlay">
              <div className="wave-result-panel">
                {waveResult.result === 'victory' ? (
                  <>
                    <h2 className="wave-result-title victory">
                      {t(profile, 'Волна пройдена!', 'Wave Cleared!')}
                    </h2>
                    <p className="wave-result-text">
                      {t(profile, 'Волна', 'Wave')} {waveResult.wave}
                      <br />
                      +{waveResult.gold} {t(profile, 'золота', 'gold')} / +{waveResult.exp} {t(profile, 'опыта', 'exp')}
                    </p>
                    {waveResult.wave >= MAX_WAVES ? (
                      <div className="wave-result-buttons">
                        <button className="title-btn title-btn-primary" onClick={exitToGuild}>
                          {t(profile, 'Вернуться в Гильдию', 'Return to Guild')}
                        </button>
                      </div>
                    ) : (
                      <div className="wave-result-buttons">
                        <button className="title-btn title-btn-primary" onClick={continueNextWave}>
                          {t(profile, 'Продолжить', 'Continue')}
                        </button>
                        <button className="title-btn" onClick={exitToGuild}>
                          {t(profile, 'Выйти в гильдию', 'Exit to Guild')}
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <h2 className="wave-result-title defeat">
                      {t(profile, 'Поражение', 'Defeat')}
                    </h2>
                    <p className="wave-result-text">
                      {t(profile, 'Волна', 'Wave')} {waveResult.wave}
                      <br />
                      {t(profile, 'Золото за волну потеряно.', 'Wave gold lost.')}
                      <br />
                      {profile.gameMode === 'hard'
                        ? t(profile, 'Сложный режим: прогресс будет сброшен.', 'Hard mode: progress will be reset.')
                        : t(profile, 'Лёгкий режим: прогресс сохранён.', 'Easy mode: progress saved.')}
                    </p>
                    <div className="wave-result-buttons">
                      {hudData.potions.revival > 0 && (
                        <button className="title-btn revival-btn" onClick={useRevival}>
                          {t(profile, 'Возродиться', 'Revive')} ({hudData.potions.revival})
                        </button>
                      )}
                      {profile.gameMode === 'hard' ? (
                        <>
                          <button className="title-btn title-btn-primary" onClick={restartFromWave1}>
                            {t(profile, 'Начать сначала (с 1 волны)', 'Restart from Wave 1')}
                          </button>
                          <button className="title-btn" onClick={exitToGuild}>
                            {t(profile, 'Выйти в гильдию', 'Exit to Guild')}
                          </button>
                        </>
                      ) : (
                        <>
                          <button className="title-btn title-btn-primary" onClick={retryWave}>
                            {t(profile, `Начать заново волну ${waveResult.wave}`, `Retry Wave ${waveResult.wave}`)}
                          </button>
                          <button className="title-btn" onClick={exitToGuild}>
                            {t(profile, 'Выйти в гильдию', 'Exit to Guild')}
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
        {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
      </div>
    );
  }

  return null;
}

// ============================================================
// GUILD SCREEN COMPONENT
// ============================================================
interface GuildScreenProps {
  profile: SaveProfile;
  updateProfile: (partial: Partial<SaveProfile>) => void;
  showToast: (msg: string, type?: 'info' | 'error' | 'success') => void;
  buyCharacter: (id: CharacterClass) => void;
  equipCharacter: (id: CharacterClass) => void;
  buySkill: (charId: CharacterClass, skillId: string) => void;
  buyPotion: (id: 'health' | 'stamina' | 'revival') => void;
  upgradeBag: () => void;
  unlockDungeon: (id: string) => void;
  toggleDungeonEquip: (id: string) => void;
  sellBoss: (uid: string) => void;
  moveToTrophy: (uid: string) => void;
  takeTrophyBack: (uid: string) => void;
  startCombat: () => void;
  buyTalent: (type: 'damage' | 'health') => void;
  buyShield: () => void;
  toggleShieldEquip: () => void;
  resetWaveProgress: () => void;
  onBack: () => void;
}

function GuildScreen(props: GuildScreenProps) {
  const { profile } = props;
  const [tab, setTab] = useState<'characters' | 'skills' | 'potions' | 'dungeons'>('characters');
  const [bagOpen, setLocalBagOpen] = useState(false);
  const [bagTab, setLocalBagTab] = useState<'bag' | 'trophies'>('bag');
  const [selectedBagItem, setLocalSelectedBag] = useState<string | null>(null);
  const [selectedTrophy, setLocalSelectedTrophy] = useState<string | null>(null);
  const [skillPreview, setSkillPreview] = useState<{ charId: CharacterClass; skillId: string } | null>(null);

  const tt = (ru: string, en: string) => profile.language === 'ru' ? ru : en;

  const selectedBoss = profile.bag.find(b => b.uid === selectedBagItem);
  const selectedTrophyItem = profile.trophies.find(t => t.uid === selectedTrophy);
  const bagCapacity = BAG_LEVELS.find(b => b.level === profile.bagLevel)?.capacity || 1;
  const nextBag = BAG_LEVELS.find(b => b.level === profile.bagLevel + 1);

  const previewSkill = skillPreview
    ? CHARACTERS.find(c => c.id === skillPreview.charId)!.skills.find(s => s.id === skillPreview.skillId)!
    : null;
  const previewChar = skillPreview ? CHARACTERS.find(c => c.id === skillPreview.charId)! : null;

  const confirmBuySkill = () => {
    if (!skillPreview) return;
    props.buySkill(skillPreview.charId, skillPreview.skillId);
    setSkillPreview(null);
  };

  return (
    <div className="app-container">
      <div className="guild-bg">
        <div className="guild-header">
          <div>
            <h2 className="guild-title">{tt('Гильдия', 'Guild')}</h2>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginTop: '4px' }}>
              <div className="hud-gold">
                <svg viewBox="0 0 24 24" width="16" height="16"><circle cx="12" cy="12" r="10" fill="#c89b3c" stroke="#8a6a20" strokeWidth="1" /><text x="12" y="16" textAnchor="middle" fontSize="12" fill="#fff" fontWeight="bold">G</text></svg>
                {profile.gold}
              </div>
              <div style={{ fontSize: '14px', color: 'var(--color-text-dim)' }}>
                {tt('Режим', 'Mode')}: <span style={{ color: profile.gameMode === 'easy' ? '#3faf3f' : '#df3f3f' }}>
                  {profile.gameMode === 'easy' ? tt('Лёгкий', 'Easy') : tt('Сложный', 'Hard')}
                </span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="hud-btn" onClick={() => setLocalBagOpen(true)}>
              {tt('Мешок / Трофеи', 'Bag / Trophies')}
            </button>
            <button className="title-btn" style={{ minWidth: 'auto', padding: '10px 24px', fontSize: '15px' }} onClick={props.startCombat}>
              {tt('В бой', 'To Battle')}
            </button>
            <button className="hud-btn" onClick={props.onBack}>
              {tt('Меню', 'Menu')}
            </button>
          </div>
        </div>

        <div className="guild-tabs" style={{ marginBottom: '16px' }}>
          <button className={`guild-tab ${tab === 'characters' ? 'active' : ''}`} onClick={() => setTab('characters')}>{tt('Персонажи', 'Characters')}</button>
          <button className={`guild-tab ${tab === 'skills' ? 'active' : ''}`} onClick={() => setTab('skills')}>{tt('Навыки', 'Skills')}</button>
          <button className={`guild-tab ${tab === 'potions' ? 'active' : ''}`} onClick={() => setTab('potions')}>{tt('Зелья', 'Potions')}</button>
          <button className={`guild-tab ${tab === 'dungeons' ? 'active' : ''}`} onClick={() => setTab('dungeons')}>{tt('Подземелья', 'Dungeons')}</button>
        </div>

        <div className="guild-content" style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
          {tab === 'characters' && (
            <div className="guild-grid">
              {CHARACTERS.map(char => {
                const owned = profile.ownedCharacters.includes(char.id);
                const equipped = profile.equippedCharacter === char.id;
                return (
                  <div key={char.id} className={`shop-card ${owned ? 'owned' : ''} ${equipped ? 'equipped' : ''}`}>
                    <div className="shop-card-icon">
                      <GameIcon name={char.weaponIcon} size={40} />
                    </div>
                    <div className="shop-card-info">
                      <div className="shop-card-name">{tt(char.name.ru, char.name.en)}</div>
                      <div className="shop-card-desc">{tt(char.description.ru, char.description.en)}</div>
                      <div className="shop-card-price">
                        {tt('ХП', 'HP')}: {char.baseHealth} / {tt('Стамина', 'Stam')}: {char.baseStamina} / {tt('Урон', 'Dmg')}: {char.baseDamage}
                      </div>
                    </div>
                    <div className="shop-card-action">
                      {!owned ? (
                        <>
                          <span className="shop-card-price">{char.cost} {tt('зол.', 'gold')}</span>
                          <button className="btn-buy" disabled={profile.gold < char.cost} onClick={() => props.buyCharacter(char.id)}>
                            {tt('Купить', 'Buy')}
                          </button>
                        </>
                      ) : equipped ? (
                        <span className="status-badge status-equipped">{tt('Экипирован', 'Equipped')}</span>
                      ) : (
                        <button className="btn-equip" onClick={() => props.equipCharacter(char.id)}>{tt('Экипировать', 'Equip')}</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'skills' && (
            <div>
              {/* Per-Character Talent Slots */}
              {(() => {
                const equippedChar = CHARACTERS.find(c => c.id === profile.equippedCharacter)!;
                const charTalents = profile.talentLevels[profile.equippedCharacter] || { damage: 0, health: 0 };
                return (
                  <div className="skill-tree-container" style={{ marginBottom: '32px', borderColor: 'var(--color-gold-bright)' }}>
                    <div className="skill-tree-header">
                      <div className="skill-tree-char-icon" style={{ background: 'rgba(240,192,80,0.15)' }}>
                        <GameIcon name={equippedChar.weaponIcon} size={40} />
                      </div>
                      <div>
                        <div className="skill-tree-char-name">{tt('Таланты: ', 'Talents: ')}{tt(equippedChar.name.ru, equippedChar.name.en)}</div>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-dim)' }}>{tt('Только для экипированного персонажа', 'For equipped character only')}</div>
                      </div>
                    </div>
                    <div className="skill-tree-list">
                      <div className={`skill-item unlocked`}>
                        <div className="skill-icon-box">
                          <svg viewBox="0 0 48 48" width="40" height="40"><path d="M24 8 L28 20 L40 20 L30 28 L34 40 L24 32 L14 40 L18 28 L8 20 L20 20 Z" fill="#df5f2f" /></svg>
                        </div>
                        <div className="skill-info">
                          <div className="skill-name">{tt('Увеличить урон на +10%', 'Increase Damage by +10%')}</div>
                          <div className="skill-desc">{tt('Многократная покупка: каждый уровень добавляет +10% к урону', 'Repeatable: each level adds +10% damage')}</div>
                          <div style={{ fontSize: '12px', color: 'var(--color-gold-bright)' }}>
                            {tt('Уровень', 'Level')}: {charTalents.damage} — {tt('Бонус', 'Bonus')}: +{Math.round(charTalents.damage * TALENT_BONUS_PER_LEVEL * 100)}%
                          </div>
                        </div>
                        <div className="skill-action">
                          <span className="skill-price">{TALENT_DAMAGE_COST} {tt('зол.', 'gold')}</span>
                          <button className="btn-buy" disabled={profile.gold < TALENT_DAMAGE_COST} onClick={() => props.buyTalent('damage')}>
                            {tt('Улучшить', 'Upgrade')}
                          </button>
                        </div>
                      </div>
                      <div className={`skill-item unlocked`}>
                        <div className="skill-icon-box">
                          <svg viewBox="0 0 48 48" width="40" height="40"><path d="M24 8 L32 16 L32 30 L24 40 L16 30 L16 16 Z" fill="#df3f5f" /></svg>
                        </div>
                        <div className="skill-info">
                          <div className="skill-name">{tt('Увеличить макс. здоровье на +10%', 'Increase Max Health by +10%')}</div>
                          <div className="skill-desc">{tt('Многократная покупка: каждый уровень добавляет +10% к макс. здоровью', 'Repeatable: each level adds +10% to max health')}</div>
                          <div style={{ fontSize: '12px', color: 'var(--color-gold-bright)' }}>
                            {tt('Уровень', 'Level')}: {charTalents.health} — {tt('Бонус', 'Bonus')}: +{Math.round(charTalents.health * TALENT_BONUS_PER_LEVEL * 100)}%
                          </div>
                        </div>
                        <div className="skill-action">
                          <span className="skill-price">{TALENT_HEALTH_COST} {tt('зол.', 'gold')}</span>
                          <button className="btn-buy" disabled={profile.gold < TALENT_HEALTH_COST} onClick={() => props.buyTalent('health')}>
                            {tt('Улучшить', 'Upgrade')}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Shield Shop (warrior only) */}
              {profile.equippedCharacter === 'warrior' && (
                <div className="skill-tree-container" style={{ marginBottom: '32px', borderColor: 'var(--color-primary-bright)' }}>
                  <div className="skill-tree-header">
                    <div className="skill-tree-char-icon" style={{ background: 'rgba(95,160,255,0.15)' }}>
                      <svg viewBox="0 0 48 48" width="40" height="40"><path d="M24 6 L36 12 L36 26 Q36 38 24 44 Q12 38 12 26 L12 12 Z" fill="#5fa0ff" stroke="#3a7acc" strokeWidth="2" /></svg>
                    </div>
                    <div>
                      <div className="skill-tree-char-name">{tt('Щит Воина', 'Warrior Shield')}</div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-dim)' }}>
                        {tt('Заменяет рывок (ПКМ) на блок щитом', 'Replaces charge (RMB) with shield block')}
                      </div>
                    </div>
                  </div>
                  <div className="skill-tree-list">
                    <div className={`skill-item ${profile.shieldLevel > 0 ? 'unlocked' : 'locked'}`}>
                      <div className="skill-icon-box">
                        <svg viewBox="0 0 48 48" width="40" height="40"><path d="M24 6 L36 12 L36 26 Q36 38 24 44 Q12 38 12 26 L12 12 Z" fill={profile.shieldLevel > 0 ? '#5fa0ff' : '#3a3a4a'} stroke="#3a7acc" strokeWidth="2" /></svg>
                      </div>
                      <div className="skill-info">
                        <div className="skill-name">{tt('Щит', 'Shield')} — {tt('Ур.', 'Lvl')} {profile.shieldLevel}/{MAX_SHIELD_LEVEL}</div>
                        <div className="skill-desc">
                          {tt('Поглощает удары. Зарядов: ', 'Absorbs hits. Charges: ')}{profile.shieldLevel > 0 ? profile.shieldLevel * SHIELD_HITS_MULTIPLIER : 0}
                          <br />
                          {tt('ПКМ: блок (взаимоисключающе с рывком)', 'RMB: block (mutually exclusive with charge)')}
                        </div>
                        {profile.shieldLevel > 0 && (
                          <div style={{ fontSize: '12px', color: profile.shieldEquipped ? '#3faf3f' : 'var(--color-text-dim)' }}>
                            {profile.shieldEquipped ? tt('Экипирован', 'Equipped') : tt('Снято', 'Unequipped')}
                          </div>
                        )}
                      </div>
                      <div className="skill-action">
                        {profile.shieldLevel < MAX_SHIELD_LEVEL ? (
                          <>
                            <span className="skill-price">{(profile.shieldLevel + 1) * SHIELD_COST_MULTIPLIER} {tt('зол.', 'gold')}</span>
                            <button className="btn-buy" disabled={profile.gold < (profile.shieldLevel + 1) * SHIELD_COST_MULTIPLIER} onClick={props.buyShield}>
                              {tt('Улучшить', 'Upgrade')}
                            </button>
                          </>
                        ) : (
                          <span className="status-badge status-opened">{tt('Максимум', 'Max')}</span>
                        )}
                      </div>
                    </div>
                    {profile.shieldLevel > 0 && (
                      <div className="skill-item unlocked">
                        <div className="skill-icon-box">
                          <svg viewBox="0 0 48 48" width="40" height="40">
                            {profile.shieldEquipped
                              ? <path d="M16 24 L22 30 L34 18" fill="none" stroke="#3faf3f" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                              : <path d="M24 12 V36 M12 24 H36" stroke="#df3f3f" strokeWidth="4" strokeLinecap="round" />}
                          </svg>
                        </div>
                        <div className="skill-info">
                          <div className="skill-name">{profile.shieldEquipped ? tt('Снять щит', 'Unequip Shield') : tt('Экипировать щит', 'Equip Shield')}</div>
                          <div className="skill-desc">
                            {profile.shieldEquipped
                              ? tt('Снимает щит и возвращает рывок (ПКМ)', 'Removes shield and restores charge (RMB)')
                              : tt('Экипирует щит — заменяет рывок на блок', 'Equips shield — replaces charge with block')}
                          </div>
                        </div>
                        <div className="skill-action">
                          <button className="btn-equip" onClick={props.toggleShieldEquip}>
                            {profile.shieldEquipped ? tt('Снять', 'Unequip') : tt('Надеть', 'Equip')}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {CHARACTERS.map(char => {
                const owned = profile.ownedCharacters.includes(char.id);
                if (!owned) return null;
                const unlocked = profile.unlockedSkills[char.id] || [];
                return (
                  <div key={char.id} className="skill-tree-container" style={{ marginBottom: '32px' }}>
                    <div className="skill-tree-header">
                      <div className="skill-tree-char-icon">
                        <GameIcon name={char.weaponIcon} size={40} />
                      </div>
                      <div>
                        <div className="skill-tree-char-name">{tt(char.name.ru, char.name.en)}</div>
                        {!char.hasUniqueRMB && <div style={{ fontSize: '12px', color: 'var(--color-text-dim)' }}>{tt('Нет ПКМ-способности (только баффы)', 'No RMB skill (buffs only)')}</div>}
                      </div>
                    </div>
                    <div className="skill-tree-list">
                      {char.skills.map(skill => {
                        const isUnlocked = unlocked.includes(skill.id);
                        const reqMet = !skill.requires || unlocked.includes(skill.requires);
                        const canBuy = !isUnlocked && reqMet && profile.gold >= skill.cost;
                        return (
                          <div key={skill.id} className={`skill-item ${isUnlocked ? 'unlocked' : 'locked'} ${canBuy ? 'can-unlock' : ''}`}>
                            <div className="skill-icon-box">
                              {isUnlocked ? (
                                <SkillIcon name={skill.icon} size={40} />
                              ) : (
                                <div className="skill-locked-icon">
                                  <SkillIcon name={skill.icon} size={40} />
                                  <div className="skill-lock-overlay">
                                    <svg viewBox="0 0 24 24" width="20" height="20"><path d="M6 10V8a6 6 0 0112 0v2h1a1 1 0 011 1v8a1 1 0 01-1 1H5a1 1 0 01-1-1v-8a1 1 0 011-1h1zm2 0h8V8a4 4 0 00-8 0v2z" fill="rgba(0,0,0,0.7)" /></svg>
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="skill-info">
                              <div className="skill-name">{tt(skill.name.ru, skill.name.en)}</div>
                              <div className="skill-desc">{tt(skill.description.ru, skill.description.en)}</div>
                              {skill.requires && (
                                <div className={`skill-requirement ${reqMet ? 'met' : ''}`}>
                                  {tt('Требует', 'Requires')}: {tt(char.skills.find(s => s.id === skill.requires)!.name.ru, char.skills.find(s => s.id === skill.requires)!.name.en)}
                                </div>
                              )}
                              {skill.type === 'active-main' && <div style={{ fontSize: '12px', color: 'var(--color-gold-bright)' }}>{tt('ЛКМ', 'LMB')} - {tt('Основная', 'Main')}</div>}
                              {skill.type === 'active-unique' && <div style={{ fontSize: '12px', color: 'var(--color-primary-bright)' }}>{tt('ПКМ', 'RMB')} - {tt('Уникальная', 'Unique')}</div>}
                              {skill.type === 'passive' && <div style={{ fontSize: '12px', color: 'var(--color-text-dim)' }}>{tt('Пассивный', 'Passive')}</div>}
                              {!isUnlocked && skill.cost > 0 && <div className="skill-price">{skill.cost} {tt('зол.', 'gold')}</div>}
                              {skill.staminaCost > 0 && <div style={{ fontSize: '12px', color: 'var(--color-stamina)' }}>{tt('Выносливость', 'Stamina')}: {skill.staminaCost}</div>}
                            </div>
                            <div className="skill-action">
                              {isUnlocked ? (
                                <span className="status-badge status-opened">{tt('Открыто', 'Unlocked')}</span>
                              ) : (
                                <button
                                  className="btn-buy"
                                  disabled={!canBuy}
                                  onClick={() => setSkillPreview({ charId: char.id, skillId: skill.id })}
                                >
                                  {tt('Превью', 'Preview')}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'potions' && (
            <div className="guild-grid">
              {POTIONS.map(potion => (
                <div key={potion.id} className="shop-card">
                  <div className="shop-card-icon">
                    <GameIcon name={potion.icon} size={40} />
                  </div>
                  <div className="shop-card-info">
                    <div className="shop-card-name">{tt(potion.name.ru, potion.name.en)}</div>
                    <div className="shop-card-desc">{tt(potion.description.ru, potion.description.en)}</div>
                    <div style={{ fontSize: '13px', color: 'var(--color-text-dim)' }}>
                      {tt('В наличии', 'In stock')}: {profile.ownedPotions[potion.id]}
                      {potion.hotkey && ` / ${tt('Клавиша', 'Key')}: ${potion.hotkey}`}
                    </div>
                  </div>
                  <div className="shop-card-action">
                    <span className="shop-card-price">{potion.cost} {tt('зол.', 'gold')}</span>
                    <button className="btn-buy" disabled={profile.gold < potion.cost} onClick={() => props.buyPotion(potion.id)}>
                      {tt('Купить', 'Buy')}
                    </button>
                  </div>
                </div>
              ))}
              <div className="shop-card">
                <div className="shop-card-icon">
                  <svg viewBox="0 0 48 48" width="40" height="40"><rect x="8" y="16" width="32" height="24" rx="2" fill="#5a4a3a" stroke="#3a2a1a" strokeWidth="2" /><rect x="12" y="8" width="24" height="12" rx="2" fill="#7a6a5a" stroke="#5a4a3a" strokeWidth="2" /><circle cx="24" cy="28" r="6" fill="#c89b3c" opacity="0.3" /><circle cx="24" cy="28" r="3" fill="#c89b3c" /></svg>
                </div>
                <div className="shop-card-info">
                  <div className="shop-card-name">{tt('Мешок', 'Bag')} - {tt('Ур.', 'Lvl')} {profile.bagLevel}</div>
                  <div className="shop-card-desc">{tt('Вместимость', 'Capacity')}: {bagCapacity} {tt('боссов', 'bosses')}</div>
                  {nextBag && <div style={{ fontSize: '13px', color: 'var(--color-text-dim)' }}>{tt('След. уровень', 'Next lvl')}: {nextBag.capacity} - {nextBag.cost} {tt('зол.', 'gold')}</div>}
                </div>
                <div className="shop-card-action">
                  {nextBag ? (
                    <>
                      <span className="shop-card-price">{nextBag.cost} {tt('зол.', 'gold')}</span>
                      <button className="btn-buy" disabled={profile.gold < nextBag.cost} onClick={props.upgradeBag}>
                        {tt('Улучшить', 'Upgrade')}
                      </button>
                    </>
                  ) : (
                    <span className="status-badge status-opened">{tt('Максимум', 'Max')}</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {tab === 'dungeons' && (
            <div className="dungeon-grid">
              {DUNGEONS.map(dg => {
                const unlocked = profile.unlockedDungeons.includes(dg.id);
                const equipped = profile.equippedDungeons.includes(dg.id);
                const progress = profile.dungeonProgress[dg.id] || 0;
                const levelLocked = profile.level < dg.minLevel;
                return (
                  <div
                    key={dg.id}
                    className={`dungeon-card ${equipped ? 'equipped' : ''} ${!unlocked ? 'locked' : ''}`}
                    onClick={() => unlocked ? props.toggleDungeonEquip(dg.id) : props.unlockDungeon(dg.id)}
                  >
                    <div className="dungeon-card-header">
                      <GameIcon name={dg.icon} size={40} />
                      <div>
                        <div className="dungeon-card-name">{tt(dg.name.ru, dg.name.en)}</div>
                        <div className="dungeon-card-desc">{tt(dg.description.ru, dg.description.en)}</div>
                      </div>
                    </div>
                    {unlocked ? (
                      <>
                        <div className="dungeon-card-progress">
                          <span>{tt('Прогресс', 'Progress')}: {progress}/{MAX_WAVES}</span>
                          {equipped && <span className="status-badge status-equipped">{tt('Экипировано', 'Equipped')}</span>}
                        </div>
                        <div className="dungeon-progress-bar">
                          <div className="dungeon-progress-fill" style={{ width: `${(progress / MAX_WAVES) * 100}%` }} />
                        </div>
                        <div className="dungeon-card-footer">
                          <span style={{ fontSize: '13px', color: 'var(--color-text-dim)' }}>
                            {tt('Нажмите для', 'Click to')} {equipped ? tt('снятия', 'unequip') : tt('экипировки', 'equip')}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="dungeon-card-footer">
                        <div>
                          <div style={{ fontSize: '13px', color: levelLocked ? 'var(--color-error)' : 'var(--color-gold-bright)' }}>
                            {tt('Требуется уровень', 'Requires level')} {dg.minLevel}
                          </div>
                          <div className="shop-card-price">{dg.unlockCost} {tt('зол.', 'gold')}</div>
                        </div>
                        <button className="btn-buy" disabled={profile.gold < dg.unlockCost || levelLocked} onClick={(e) => { e.stopPropagation(); props.unlockDungeon(dg.id); }}>
                          {tt('Открыть', 'Unlock')}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', marginTop: '16px' }}>
                <div style={{ fontSize: '14px', color: 'var(--color-text-dim)', marginBottom: '12px' }}>
                  {tt('Экипировано подземелий', 'Equipped dungeons')}: {profile.equippedDungeons.length}
                  {' - '}
                  {tt('Враги из всех экипированных смешиваются в 100 волнах', 'Enemies from all equipped mix in 100 waves')}
                </div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button className="title-btn title-btn-primary" onClick={props.startCombat}>
                    {tt('Начать бой', 'Start Battle')}
                  </button>
                  {profile.gameMode === 'easy' && (
                    <button
                      className="title-btn"
                      style={{ borderColor: 'var(--color-warning)', color: 'var(--color-warning)' }}
                      onClick={() => {
                        if (confirm(tt('Вы уверены, что хотите обнулить прогресс волн до 1-й?', 'Are you sure you want to reset wave progress to 1?'))) {
                          props.resetWaveProgress();
                        }
                      }}
                    >
                      {tt('Сбросить прогресс волн', 'Reset Wave Progress')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Skill preview modal */}
        {skillPreview && previewSkill && previewChar && (
          <div className="skill-preview-overlay" onClick={() => setSkillPreview(null)}>
            <div className="skill-preview-panel" onClick={e => e.stopPropagation()}>
              <h3 className="skill-preview-title">{tt(previewSkill.name.ru, previewSkill.name.en)}</h3>
              <div className="skill-preview-icon">
                <SkillIcon name={previewSkill.icon} size={64} />
              </div>
              <div className="skill-preview-desc">{tt(previewSkill.description.ru, previewSkill.description.en)}</div>
              <div className="skill-preview-stats">
                <div>{tt('Персонаж', 'Character')}: {tt(previewChar.name.ru, previewChar.name.en)}</div>
                <div>{tt('Тип', 'Type')}: {previewSkill.type === 'active-main' ? tt('Основная атака', 'Main Attack') : previewSkill.type === 'active-unique' ? tt('Уникальная', 'Unique') : tt('Пассивный', 'Passive')}</div>
                {previewSkill.staminaCost > 0 && <div>{tt('Стоимость выносливости', 'Stamina Cost')}: {previewSkill.staminaCost}</div>}
                <div style={{ color: 'var(--color-gold-bright)' }}>{tt('Цена', 'Price')}: {previewSkill.cost} {tt('зол.', 'gold')}</div>
              </div>
              <div className="skill-preview-buttons">
                <button
                  className="btn-buy"
                  disabled={profile.gold < previewSkill.cost}
                  onClick={confirmBuySkill}
                >
                  {tt('Подтвердить покупку', 'Confirm Purchase')}
                </button>
                <button className="title-btn" onClick={() => setSkillPreview(null)}>
                  {tt('Отмена', 'Cancel')}
                </button>
              </div>
            </div>
          </div>
        )}

        {bagOpen && (
          <BagOverlay
            profile={profile}
            bagTab={bagTab}
            setBagTab={setLocalBagTab}
            selectedBagItem={selectedBagItem}
            setSelectedBagItem={setLocalSelectedBag}
            selectedTrophy={selectedTrophy}
            setSelectedTrophy={setLocalSelectedTrophy}
            selectedBoss={selectedBoss}
            selectedTrophyItem={selectedTrophyItem}
            bagCapacity={bagCapacity}
            sellBoss={props.sellBoss}
            moveToTrophy={props.moveToTrophy}
            takeTrophyBack={props.takeTrophyBack}
            onClose={() => setLocalBagOpen(false)}
          />
        )}
      </div>
    </div>
  );
}

// ============================================================
// BAG OVERLAY COMPONENT
// ============================================================
interface BagOverlayProps {
  profile: SaveProfile;
  bagTab: 'bag' | 'trophies';
  setBagTab: (tab: 'bag' | 'trophies') => void;
  selectedBagItem: string | null;
  setSelectedBagItem: (id: string | null) => void;
  selectedTrophy: string | null;
  setSelectedTrophy: (id: string | null) => void;
  selectedBoss: CapturedBoss | undefined;
  selectedTrophyItem: Trophy | undefined;
  bagCapacity: number;
  sellBoss: (uid: string) => void;
  moveToTrophy: (uid: string) => void;
  takeTrophyBack: (uid: string) => void;
  onClose: () => void;
}

function BagOverlay(props: BagOverlayProps) {
  const { profile } = props;
  const tt = (ru: string, en: string) => profile.language === 'ru' ? ru : en;

  return (
    <div className="bag-overlay" onClick={props.onClose}>
      <div className="bag-panel" onClick={e => e.stopPropagation()}>
        <div className="bag-header">
          <div>
            <h3 className="bag-title">{tt('Мешок и Трофеи', 'Bag & Trophies')}</h3>
            <div style={{ fontSize: '13px', color: 'var(--color-text-dim)' }}>
              {tt('Вместимость', 'Capacity')}: {profile.bag.length}/{props.bagCapacity}
            </div>
          </div>
          <button className="bag-close" onClick={props.onClose}>X</button>
        </div>
        <div className="bag-tabs">
          <button className={`bag-tab ${props.bagTab === 'bag' ? 'active' : ''}`} onClick={() => props.setBagTab('bag')}>
            {tt('Мешок', 'Bag')} ({profile.bag.length})
          </button>
          <button className={`bag-tab ${props.bagTab === 'trophies' ? 'active' : ''}`} onClick={() => props.setBagTab('trophies')}>
            {tt('Трофеи', 'Trophies')} ({profile.trophies.length})
          </button>
        </div>
        <div className="bag-content">
          {props.bagTab === 'bag' && (
            <>
              {profile.bag.length === 0 ? (
                <div className="bag-empty-msg">
                  {tt('Мешок пуст. Поймайте боссов в бою!', 'Bag is empty. Capture bosses in combat!')}
                </div>
              ) : (
                <>
                  <div className="bag-slots">
                    {Array.from({ length: props.bagCapacity }).map((_, i) => {
                      const boss = profile.bag[i];
                      if (!boss) return (
                        <div key={i} className="bag-slot bag-slot-empty">
                          {tt('Пусто', 'Empty')}
                        </div>
                      );
                      return (
                        <div
                          key={boss.uid}
                          className={`bag-slot ${props.selectedBagItem === boss.uid ? 'selected' : ''}`}
                          onClick={() => props.setSelectedBagItem(boss.uid)}
                        >
                          <div className="bag-slot-icon">
                            <svg viewBox="0 0 48 48" width="48" height="48"><circle cx="24" cy="24" r="20" fill={ENEMIES[boss.enemyId]?.color || '#888'} stroke="#f0c050" strokeWidth="2" /><circle cx="18" cy="20" r="3" fill="#ff4444" /><circle cx="30" cy="20" r="3" fill="#ff4444" /></svg>
                          </div>
                          <div className="bag-slot-name">{tt(boss.name.ru, boss.name.en)}</div>
                          <div className="bag-slot-price">{boss.sellPrice} {tt('зол.', 'gold')}</div>
                        </div>
                      );
                    })}
                  </div>
                  {props.selectedBoss && (
                    <div className="bag-detail">
                      <div className="bag-detail-name">{tt(props.selectedBoss.name.ru, props.selectedBoss.name.en)}</div>
                      <div className="bag-detail-row">
                        <span>{tt('Сложность', 'Difficulty')}</span>
                        <span>{props.selectedBoss.difficulty}</span>
                      </div>
                      <div className="bag-detail-row">
                        <span>{tt('Способность', 'Ability')}</span>
                        <span>{tt(props.selectedBoss.ability.ru, props.selectedBoss.ability.en)}</span>
                      </div>
                      <div className="bag-detail-row">
                        <span>{tt('Цена продажи', 'Sell price')}</span>
                        <span style={{ color: 'var(--color-gold-bright)' }}>{props.selectedBoss.sellPrice} {tt('зол.', 'gold')}</span>
                      </div>
                      <div className="bag-detail-actions">
                        <button className="btn-sell" onClick={() => props.sellBoss(props.selectedBoss!.uid)}>
                          {tt('Продать', 'Sell')} (+{props.selectedBoss.sellPrice})
                        </button>
                        <button className="btn-trophy" onClick={() => props.moveToTrophy(props.selectedBoss!.uid)}>
                          {tt('В Трофеи', 'To Trophies')}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {props.bagTab === 'trophies' && (
            <>
              {profile.trophies.length === 0 ? (
                <div className="bag-empty-msg">
                  {tt('Нет трофеев. Переместите боссов из мешка сюда.', 'No trophies. Move bosses from bag to here.')}
                </div>
              ) : (
                <>
                  <div className="bag-slots">
                    {profile.trophies.map(trophy => (
                      <div
                        key={trophy.uid}
                        className={`bag-slot ${props.selectedTrophy === trophy.uid ? 'selected' : ''}`}
                        onClick={() => props.setSelectedTrophy(trophy.uid)}
                      >
                        <div className="bag-slot-icon">
                          <svg viewBox="0 0 48 48" width="48" height="48"><circle cx="24" cy="24" r="20" fill={ENEMIES[trophy.enemyId]?.color || '#888'} stroke="#f0c050" strokeWidth="3" /><path d="M 12 8 L 24 4 L 36 8 L 34 16 L 14 16 Z" fill="#c89b3c" opacity="0.3" /><circle cx="18" cy="20" r="3" fill="#ff4444" /><circle cx="30" cy="20" r="3" fill="#ff4444" /></svg>
                        </div>
                        <div className="bag-slot-name">{tt(trophy.name.ru, trophy.name.en)}</div>
                        <div className="bag-slot-price">{tt('Трофей', 'Trophy')}</div>
                      </div>
                    ))}
                  </div>
                  {props.selectedTrophyItem && (
                    <div className="bag-detail">
                      <div className="bag-detail-name">{tt(props.selectedTrophyItem.name.ru, props.selectedTrophyItem.name.en)}</div>
                      <div className="bag-detail-row">
                        <span>{tt('Сложность', 'Difficulty')}</span>
                        <span>{props.selectedTrophyItem.difficulty}</span>
                      </div>
                      <div className="bag-detail-row">
                        <span>{tt('Способность', 'Ability')}</span>
                        <span>{tt(props.selectedTrophyItem.ability.ru, props.selectedTrophyItem.ability.en)}</span>
                      </div>
                      <div className="bag-detail-row">
                        <span>{tt('Базовая цена', 'Base price')}</span>
                        <span style={{ color: 'var(--color-gold-bright)' }}>{props.selectedTrophyItem.sellPrice} {tt('зол.', 'gold')}</span>
                      </div>
                      <div className="bag-detail-actions">
                        <button className="btn-take-bag" onClick={() => props.takeTrophyBack(props.selectedTrophyItem!.uid)}>
                          {tt('Забрать в мешок', 'Take to Bag')}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

