import type { Vec2, CharacterClass, EnemyDef, EnemyShape, SaveProfile, CapturedBoss, GameMode, CombatResult } from './types';
import { CHARACTERS, ENEMIES, ALL_ENEMIES, DUNGEONS, MAX_WAVES, BOSS_WAVE_INTERVAL, STAMINA_REGEN_RATE, STAMINA_REGEN_SECOND_WIND, HEALTH_REGEN_RATE, POTION_HEALTH_AMOUNT, POTION_STAMINA_AMOUNT, REVIVAL_HP_PERCENT, EXP_PER_LEVEL, EXP_LEVEL_MULTIPLIER, POTION_COOLDOWN, WAVE_DIFFICULTY_MULTIPLIER, HARD_HEALTH_MULTIPLIER, HARD_DAMAGE_MULTIPLIER, HARD_WAVE_DIFFICULTY_MULTIPLIER, TALENT_BONUS_PER_LEVEL, SHIELD_HITS_MULTIPLIER, generateDungeonBosses } from './gameData';
import { audio, SfxName } from './audio';
import { getMonsterEmoji, buildBossPattern, shadeColor } from './monsterVisuals';

interface Enemy {
  id: string;
  def: EnemyDef;
  x: number;
  y: number;
  vx: number;
  vy: number;
  health: number;
  maxHealth: number;
  hitFlash: number;
  attackCooldown: number;
  isBoss: boolean;
  bossAbilityCooldown: number;
  slowTimer: number;
  poisonTimer: number;
  poisonDamage: number;
  spawnAnim: number;
  deathAnim: number;
  isDying: boolean;
  captured: boolean;
  walkAnim: number;
  isMoving: boolean;
  invuln: number;
  attackAnim: number;
}

interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  radius: number;
  life: number;
  fromPlayer: boolean;
  color: string;
  isArrow: boolean;
  isMagic: boolean;
  chainTargetId?: string;
  isChain: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  vy: number;
}

interface PlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  health: number;
  maxHealth: number;
  stamina: number;
  maxStamina: number;
  damage: number;
  speed: number;
  facing: Vec2;
  attackCooldown: number;
  skillCooldown: number;
  hitFlash: number;
  walkAnim: number;
  isMoving: boolean;
  invuln: number;
  buffTimers: Record<string, number>;
  poisonStacks: number;
  attackAnim: number;
}

export interface CombatCallbacks {
  onWaveCleared: (wave: number, goldEarned: number, expEarned: number) => void;
  onPlayerDeath: () => void;
  onBossCaptured: (boss: CapturedBoss) => void;
  onProfileUpdate: (partial: Partial<SaveProfile>) => void;
  onPotionUsed: (type: 'health' | 'stamina' | 'revival') => void;
  onPotionCooldownUpdate: (type: 'health' | 'stamina', cooldown: number, maxCooldown: number) => void;
  onWaveResult: (result: 'victory' | 'defeat', wave: number, goldEarned: number, expEarned: number) => void;
  onBossHpChange: (bossName1: string | null, hpPercent1: number, bossName2?: string | null, hpPercent2?: number) => void;
  onShieldHit: (remainingHits: number) => void;
}

export class CombatEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  profile: SaveProfile;
  characterClass: CharacterClass;
  callbacks: CombatCallbacks;

  player: PlayerState;
  enemies: Enemy[] = [];
  projectiles: Projectile[] = [];
  particles: Particle[] = [];
  floatingTexts: FloatingText[] = [];

  currentWave = 0;
  waveActive = false;
  waveTransitionTimer = 0;
  waveTransitionText = '';
  waveTransitionSubtext = '';

  goldThisWave = 0;
  expThisWave = 0;
  enemiesKilledThisWave = 0;
  enemiesNeededThisWave = 0;
  bossSpawnedThisWave = false;

  paused = false;
  gameOver = false;
  revivalUsed = false;

  healthPotionCooldown = 0;
  staminaPotionCooldown = 0;
  healthPotionUsedThisWave = false;
  staminaPotionUsedThisWave = false;

  waveResult: CombatResult = null;
  waveResultTimer = 0;

  bossHpBarVisible = false;
  bossHpPercent = 1;
  bossName = '';
  bossName1: string | null = null;
  bossHp1 = 0;
  bossName2: string | null = null;
  bossHp2 = 0;

  keys: Record<string, boolean> = {};
  mousePos: Vec2 = { x: 0, y: 0 };
  mouseDown = false;
  rightMouseDown = false;
  chargeTime = 0;
  isCharging = false;

  mobileMove: Vec2 = { x: 0, y: 0 };
  mobileMainAttack = false;
  mobileUniqueAttack = false;

  lastTime = 0;
  animationFrame = 0;
  running = false;

  rafId: number | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    profile: SaveProfile,
    callbacks: CombatCallbacks,
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.profile = profile;
    this.characterClass = profile.equippedCharacter;
    this.callbacks = callbacks;

    const rect = canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    canvas.width = this.width;
    canvas.height = this.height;

    const char = CHARACTERS.find(c => c.id === this.characterClass)!;
    this.player = {
      x: this.width / 2,
      y: this.height / 2,
      vx: 0,
      vy: 0,
      health: char.baseHealth,
      maxHealth: char.baseHealth,
      stamina: char.baseStamina,
      maxStamina: char.baseStamina,
      damage: char.baseDamage,
      speed: char.baseSpeed,
      facing: { x: 1, y: 0 },
      attackCooldown: 0,
      skillCooldown: 0,
      hitFlash: 0,
      walkAnim: 0,
      isMoving: false,
      invuln: 0,
      buffTimers: {},
      poisonStacks: 0,
      attackAnim: 0,
    };

    this.applyPassives();
  }

  applyPassives() {
    const char = CHARACTERS.find(c => c.id === this.characterClass)!;
    const unlocked = this.profile.unlockedSkills[this.characterClass] || [];

    // Per-character talent: +10% damage per level
    const charTalents = this.profile.talentLevels?.[this.characterClass] || { damage: 0, health: 0 };
    if (charTalents.damage > 0) {
      this.player.damage = Math.floor(this.player.damage * (1 + charTalents.damage * TALENT_BONUS_PER_LEVEL));
    }
    // Per-character talent: +10% health per level
    if (charTalents.health > 0) {
      this.player.maxHealth = Math.floor(this.player.maxHealth * (1 + charTalents.health * TALENT_BONUS_PER_LEVEL));
      this.player.health = this.player.maxHealth;
    }

    if (unlocked.includes('w_ironhide')) {
      this.player.maxHealth = Math.floor(this.player.maxHealth * 1.3);
      this.player.health = this.player.maxHealth;
    }
    if (unlocked.includes('w_earthwrath')) {
      this.player.damage = Math.floor(this.player.damage * 1.4);
    }
    if (unlocked.includes('a_swift')) {
      this.player.speed *= 1.25;
    }
    if (unlocked.includes('a_storm')) {
      this.player.damage = Math.floor(this.player.damage * 1.45);
    }
    if (unlocked.includes('m_apex')) {
      this.player.damage = Math.floor(this.player.damage * 1.5);
    }
    if (unlocked.includes('s_shadowstep')) {
      this.player.speed *= 1.35;
    }
    if (unlocked.includes('s_deathmark')) {
      this.player.damage = Math.floor(this.player.damage * 1.55);
    }
  }

  getStaminaRegen(): number {
    const unlocked = this.profile.unlockedSkills[this.characterClass] || [];
    let regen = STAMINA_REGEN_RATE;
    if (unlocked.includes('w_secondwind') || unlocked.includes('m_manaflow')) {
      regen = STAMINA_REGEN_SECOND_WIND;
    }
    return regen;
  }

  hasSkill(skillId: string): boolean {
    return (this.profile.unlockedSkills[this.characterClass] || []).includes(skillId);
  }

  startWave: number = 0;

  start() {
    this.running = true;
    this.lastTime = performance.now();
    if (this.startWave > 1) {
      this.currentWave = this.startWave - 1;
    }
    this.startNextWave();
    this.loop();
  }

  stop() {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    audio.stopMusic();
  }

  loop = () => {
    if (!this.running) return;
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;

    try {
      if (!this.paused && !this.gameOver) {
        this.update(dt);
      }
      this.render();
    } catch (err) {
      // Защита от «чёрного экрана»: ошибка не должна убивать игровой цикл.
      console.error('[CombatEngine] loop error:', err);
      try {
        const ctx = this.ctx;
        ctx.fillStyle = 'rgba(120,0,0,0.85)';
        ctx.fillRect(0, 0, this.width, this.height);
        ctx.fillStyle = '#fff';
        ctx.font = '13px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        const msg = err instanceof Error ? (err.stack || err.message) : String(err);
        msg.split('\n').slice(0, 14).forEach((l: string, i: number) => ctx.fillText(l, 12, 12 + i * 17));
      } catch { /* ignore */ }
    }
    this.rafId = requestAnimationFrame(this.loop);
  };

  getWaveMultiplier(): number {
    const perWave = this.profile.gameMode === 'hard' ? HARD_WAVE_DIFFICULTY_MULTIPLIER : WAVE_DIFFICULTY_MULTIPLIER;
    return 1 + (this.currentWave - 1) * perWave;
  }

  getDifficultyHealthMult(): number {
    return this.profile.gameMode === 'hard' ? HARD_HEALTH_MULTIPLIER : 1;
  }

  getDifficultyDamageMult(): number {
    return this.profile.gameMode === 'hard' ? HARD_DAMAGE_MULTIPLIER : 1;
  }

  startNextWave() {
    this.currentWave++;
    if (this.currentWave > MAX_WAVES) {
      this.currentWave = MAX_WAVES;
      return;
    }

    this.goldThisWave = 0;
    this.expThisWave = 0;
    this.enemiesKilledThisWave = 0;
    this.bossSpawnedThisWave = false;
    this.healthPotionUsedThisWave = false;
    this.staminaPotionUsedThisWave = false;
    this.waveResult = null;

    const isBossWave = this.currentWave % BOSS_WAVE_INTERVAL === 0;
    const equippedDungeons = this.profile.equippedDungeons.length > 0
      ? this.profile.equippedDungeons
      : ['whispering_grove'];

    if (isBossWave) {
      this.enemiesNeededThisWave = equippedDungeons.length;
      this.waveTransitionText = `Wave ${this.currentWave}`;
      this.waveTransitionSubtext = 'BOSS WAVE';
      audio.playSfx('boss-spawn');
    } else {
      const baseCount = 5 + Math.floor(this.currentWave / 3);
      this.enemiesNeededThisWave = baseCount + equippedDungeons.length;
      this.waveTransitionText = `Wave ${this.currentWave}`;
      this.waveTransitionSubtext = '';
      audio.playSfx('wave-start');
    }

    this.waveTransitionTimer = 2.0;
    this.waveActive = false;

    this.spawnWaveEnemies(isBossWave, equippedDungeons);
  }

  spawnWaveEnemies(isBossWave: boolean, equippedDungeons: string[]) {
    const dungeonDefs = DUNGEONS.filter(d => equippedDungeons.includes(d.id));
    const waveMultiplier = this.getWaveMultiplier();
    const healthMult = this.getDifficultyHealthMult();
    const damageMult = this.getDifficultyDamageMult();
    const combinedMult = waveMultiplier;

    if (isBossWave) {
      const bossIndex = Math.floor(this.currentWave / BOSS_WAVE_INTERVAL) - 1;
      // On boss waves with multiple equipped dungeons, spawn up to 2 bosses (one from each of first 2 dungeons)
      const maxBosses = Math.min(2, dungeonDefs.length);
      for (let i = 0; i < maxBosses; i++) {
        const dg = dungeonDefs[i];
        const proceduralBosses = generateDungeonBosses(dg.id);
        const bossDef = proceduralBosses[bossIndex % proceduralBosses.length];
        if (bossDef) {
          this.spawnEnemy(bossDef, combinedMult, true, healthMult, damageMult);
        }
      }
      // Set boss wave subtext for multi-dungeon
      if (dungeonDefs.length > 1) {
        this.waveTransitionSubtext = 'Внимание! Силы подземелий объединились. Вас ждут два босса с комбинированными способностями!';
      } else {
        this.waveTransitionSubtext = 'BOSS WAVE';
      }
    } else {
      // Collect procedural tier enemies from equipped dungeons, filtered by minWave
      const availableEnemies: string[] = [];
      for (const dg of dungeonDefs) {
        const dgEnemies = Object.values(ALL_ENEMIES).filter(
          e => !e.isBoss && e.dungeonId === dg.id && (!e.minWave || this.currentWave >= e.minWave)
        );
        for (const e of dgEnemies) {
          if (!availableEnemies.includes(e.id)) availableEnemies.push(e.id);
        }
      }

      // Also add original ENEMIES as fallback
      for (const id of Object.keys(ENEMIES)) {
        const def = ENEMIES[id];
        if (!def.isBoss && (!def.minWave || this.currentWave >= def.minWave) && !availableEnemies.includes(id)) {
          availableEnemies.push(id);
        }
      }

      const fallback = ['slime', 'goblin', 'wolf'];
      const pool = availableEnemies.length > 0 ? availableEnemies : fallback;

      // Limit to 3 unique enemy types per wave to avoid visual chaos
      const maxTypes = 3;
      const selectedTypes: string[] = [];
      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      for (const id of shuffled) {
        if (selectedTypes.length >= maxTypes) break;
        selectedTypes.push(id);
      }

      const totalToSpawn = this.enemiesNeededThisWave;
      for (let i = 0; i < totalToSpawn; i++) {
        const enemyType = selectedTypes[Math.floor(Math.random() * selectedTypes.length)];
        const def = ALL_ENEMIES[enemyType] || ENEMIES[enemyType];
        if (def) {
          this.spawnEnemy(def, combinedMult, false, healthMult, damageMult);
        }
      }
    }
  }

  spawnEnemy(def: EnemyDef, multiplier: number, isBoss: boolean, healthMult = 1, damageMult = 1) {
    const side = Math.floor(Math.random() * 4);
    let x = 0, y = 0;
    const margin = 40;
    if (side === 0) { x = Math.random() * this.width; y = -margin; }
    else if (side === 1) { x = this.width + margin; y = Math.random() * this.height; }
    else if (side === 2) { x = Math.random() * this.width; y = this.height + margin; }
    else { x = -margin; y = Math.random() * this.height; }

    const health = Math.floor(def.health * multiplier * healthMult);
    const dmg = Math.floor(def.damage * multiplier * damageMult);
    const spd = def.speed * (1 + (this.currentWave - 1) * 0.02);

    this.enemies.push({
      id: def.id + '_' + Math.random().toString(36).slice(2),
      def: { ...def, damage: dmg, speed: spd },
      x, y,
      vx: 0, vy: 0,
      health,
      maxHealth: health,
      hitFlash: 0,
      attackCooldown: 0,
      isBoss,
      bossAbilityCooldown: 5,
      slowTimer: 0,
      poisonTimer: 0,
      poisonDamage: 0,
      spawnAnim: 0.5,
      deathAnim: 0,
      isDying: false,
      captured: false,
      walkAnim: 0,
      isMoving: true,
      invuln: 0,
      attackAnim: 0,
    });

    if (isBoss && this.currentWave % BOSS_WAVE_INTERVAL === 0) {
      this.bossHpBarVisible = true;
      this.bossHpPercent = 1;
      // Assign to bossName1 or bossName2
      if (!this.bossName1) {
        this.bossName1 = this.profile.language === 'ru' ? def.name.ru : def.name.en;
        this.bossHp1 = 1;
        this.callbacks.onBossHpChange(this.bossName1, 1, null, 0);
      } else if (!this.bossName2) {
        this.bossName2 = this.profile.language === 'ru' ? def.name.ru : def.name.en;
        this.bossHp2 = 1;
        this.callbacks.onBossHpChange(this.bossName1, this.bossHp1, this.bossName2, 1);
      }
    }
  }

  update(dt: number) {
    if (this.waveTransitionTimer > 0) {
      this.waveTransitionTimer -= dt;
      if (this.waveTransitionTimer <= 0) {
        this.waveActive = true;
      }
    }

    if (this.waveResult) {
      this.waveResultTimer -= dt;
      return;
    }

    this.updatePlayer(dt);
    this.updateEnemies(dt);
    this.updateProjectiles(dt);
    this.updateParticles(dt);
    this.updateFloatingTexts(dt);

    if (this.healthPotionCooldown > 0) {
      this.healthPotionCooldown = Math.max(0, this.healthPotionCooldown - dt);
      this.callbacks.onPotionCooldownUpdate('health', this.healthPotionCooldown, POTION_COOLDOWN);
    }
    if (this.staminaPotionCooldown > 0) {
      this.staminaPotionCooldown = Math.max(0, this.staminaPotionCooldown - dt);
      this.callbacks.onPotionCooldownUpdate('stamina', this.staminaPotionCooldown, POTION_COOLDOWN);
    }

    if (this.waveActive && this.enemies.length === 0 && this.waveTransitionTimer <= 0) {
      this.completeWave();
    }
  }

  updatePlayer(dt: number) {
    const p = this.player;
    const char = CHARACTERS.find(c => c.id === this.characterClass)!;
    const speed = p.speed * 60;

    let dx = 0, dy = 0;

    if (this.profile.platform === 'mobile') {
      dx = this.mobileMove.x;
      dy = this.mobileMove.y;
    } else {
      const scheme = this.profile.settings.controlScheme;
      if (scheme === 'wasd') {
        if (this.keys['KeyW']) dy -= 1;
        if (this.keys['KeyS']) dy += 1;
        if (this.keys['KeyA']) dx -= 1;
        if (this.keys['KeyD']) dx += 1;
      } else {
        if (this.keys['ArrowUp']) dy -= 1;
        if (this.keys['ArrowDown']) dy += 1;
        if (this.keys['ArrowLeft']) dx -= 1;
        if (this.keys['ArrowRight']) dx += 1;
      }
    }

    const mag = Math.sqrt(dx * dx + dy * dy);
    if (mag > 0) {
      dx /= mag;
      dy /= mag;
      p.isMoving = true;
      p.walkAnim += dt * 8;
      if (p.attackCooldown <= 0 && Math.random() < dt * 3) {
        audio.playSfx('footstep');
      }
    } else {
      p.isMoving = false;
    }

    p.vx = dx * speed;
    p.vy = dy * speed;
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    p.x = Math.max(20, Math.min(this.width - 20, p.x));
    p.y = Math.max(20, Math.min(this.height - 20, p.y));

    if (this.profile.platform === 'pc') {
      p.facing.x = this.mousePos.x - p.x;
      p.facing.y = this.mousePos.y - p.y;
      const fmag = Math.sqrt(p.facing.x ** 2 + p.facing.y ** 2);
      if (fmag > 0) { p.facing.x /= fmag; p.facing.y /= fmag; }
    } else if (mag > 0) {
      p.facing.x = dx;
      p.facing.y = dy;
    }

    p.stamina = Math.min(p.maxStamina, p.stamina + this.getStaminaRegen() * dt);

    if (p.health < p.maxHealth) {
      p.health = Math.min(p.maxHealth, p.health + HEALTH_REGEN_RATE * dt);
    }

    p.attackCooldown = Math.max(0, p.attackCooldown - dt);
    p.skillCooldown = Math.max(0, p.skillCooldown - dt);
    p.hitFlash = Math.max(0, p.hitFlash - dt);
    p.invuln = Math.max(0, p.invuln - dt);
    p.attackAnim = Math.max(0, p.attackAnim - dt);

    for (const key in p.buffTimers) {
      p.buffTimers[key] = Math.max(0, p.buffTimers[key] - dt);
      if (p.buffTimers[key] <= 0) delete p.buffTimers[key];
    }

    const wantAttack = this.profile.platform === 'mobile'
      ? this.mobileMainAttack
      : this.mouseDown;

    // Archer charged shot: track hold time for LMB
    const isArcher = this.characterClass === 'archer';
    if (isArcher && wantAttack) {
      this.isCharging = true;
      this.chargeTime += dt;
    } else {
      // On release: if was charging, fire charged or normal shot
      if (isArcher && this.isCharging && !wantAttack) {
        if (p.attackCooldown <= 0) {
          this.doMainAttack(this.chargeTime);
        }
        this.isCharging = false;
        this.chargeTime = 0;
      } else if (!isArcher && this.isCharging && !wantAttack) {
        this.isCharging = false;
        this.chargeTime = 0;
      }
    }

    // Non-archer: attack on hold as before; archer: only attack on tap (short press)
    if (wantAttack && p.attackCooldown <= 0 && !isArcher) {
      this.doMainAttack();
    }
    // Archer tap detection: if charge time is very short and still holding, do a quick shot
    if (isArcher && wantAttack && this.chargeTime > 0 && this.chargeTime < 0.15 && p.attackCooldown <= 0) {
      // Wait a tiny bit more to determine if it's a tap or hold
    }

    const wantUnique = this.profile.platform === 'mobile'
      ? this.mobileUniqueAttack
      : this.rightMouseDown;

    if (wantUnique && p.skillCooldown <= 0 && char.hasUniqueRMB) {
      this.doUniqueAttack();
    }
  }

  doMainAttack(chargeTime: number = 0) {
    const p = this.player;
    const char = CHARACTERS.find(c => c.id === this.characterClass)!;
    const mainSkill = char.skills.find(s => s.type === 'active-main')!;
    if (p.stamina < mainSkill.staminaCost) {
      audio.playSfx('reject');
      p.attackCooldown = 0.3;
      return;
    }

    // Archer charged shot: damage scales with charge time
    const isCharged = char.id === 'archer' && chargeTime >= 0.8;
    const chargeMultiplier = isCharged ? 2.5 + Math.min(chargeTime - 0.8, 1.2) * 1.5 : 1;

    p.stamina -= mainSkill.staminaCost;
    p.attackCooldown = isCharged ? 0.6 : 0.35;
    p.attackAnim = 0.2;

    const range = char.id === 'archer' ? (this.hasSkill('a_hawk') ? 420 : 300) : (char.id === 'mage' ? 350 : 80);
    const dmg = p.damage * chargeMultiplier;

    switch (char.id) {
      case 'warrior':
        audio.playSfx('slash');
        this.spawnSlashEffect(p.x, p.y, p.facing);
        this.dealAoeDamage(p.x, p.y, 80, dmg, p.facing);
        break;
      case 'archer':
        audio.playSfx(isCharged ? 'bow-shot' : 'bow-shot');
        this.spawnProjectile(p.x, p.y, p.facing, dmg, isCharged ? '#ffcc33' : '#6fbf9f', true, true, false);
        if (isCharged) {
          this.spawnChargeEffect(p.x, p.y);
        }
        break;
      case 'mage':
        audio.playSfx('magic-bolt');
        this.spawnProjectile(p.x, p.y, p.facing, dmg, '#5fa0ff', true, false, true);
        break;
      case 'assassin':
        // Assassin LMB: chain throw
        const chainTarget = this.findNearestEnemy(p.x, p.y, 250);
        if (chainTarget) {
          const dx = chainTarget.x - p.x;
          const dy = chainTarget.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const nx = dx / dist;
          const ny = dy / dist;
          // Throw chain projectile
          const chainProj: any = {
            x: p.x, y: p.y,
            vx: nx * 700, vy: ny * 700,
            damage: 0, radius: 4, life: 0.5,
            fromPlayer: true, isArrow: false, isMagic: false,
            chainTargetId: chainTarget.id,
            isChain: true,
            color: '#c0c0c0',
          };
          (this.projectiles as any).push(chainProj);
          // Miss → chain returns to player
          setTimeout(() => {
            if (!this.running) return;
            const stillThere = this.enemies.find(e => e.id === chainTarget.id && !e.isDying);
            if (!stillThere) {
              // Miss: return chain to player
              this.spawnFloatingText(p.x, p.y - 20, this.profile.language === 'ru' ? 'Мимо! Цепь вернулась' : 'Miss! Chain returned', '#8888a0');
              this.spawnChainEffect(p.x, p.y, { x: 0, y: 0 });
            } else {
              // Hit: pull assassin to enemy, overshoot and crit from behind
              const overshootX = chainTarget.x + nx * 30;
              const overshootY = chainTarget.y + ny * 30;
              p.x = Math.max(20, Math.min(this.width - 20, overshootX));
              p.y = Math.max(20, Math.min(this.height - 20, overshootY));
              // Crit from behind: 2.5x damage
              const critDmg = dmg * 2.5;
              chainTarget.health -= critDmg;
              chainTarget.hitFlash = 0.3;
              this.spawnChainEffect(p.x, p.y, { x: -nx, y: -ny });
              this.spawnHitParticles(chainTarget.x, chainTarget.y, '#df3fdf');
              this.spawnFloatingText(chainTarget.x, chainTarget.y - 20, Math.floor(critDmg) + ' (КРИТ!)', '#df3fdf');
              audio.playSfx('chain-hit');
              if (this.hasSkill('s_poison')) {
                this.applyPoisonToNearby(chainTarget.x, chainTarget.y, 90, dmg * 0.3);
              }
              if (this.hasSkill('s_lifesteal')) {
                p.health = Math.min(p.maxHealth, p.health + critDmg * 0.15);
              }
            }
          }, 250);
        } else {
          // No target in range: small arc slash
          this.spawnChainEffect(p.x, p.y, p.facing);
          this.dealAoeDamage(p.x, p.y, 60, dmg * 0.5, p.facing);
          audio.playSfx('chain-hit');
        }
        break;
    }
  }

  findNearestEnemy(x: number, y: number, maxRange: number): Enemy | null {
    let nearest: Enemy | null = null;
    let nearDist = maxRange;
    for (const e of this.enemies) {
      if (e.isDying || e.invuln > 0) continue;
      const d = this.dist(x, y, e.x, e.y);
      if (d < nearDist) {
        nearDist = d;
        nearest = e;
      }
    }
    return nearest;
  }

  doUniqueAttack() {
    const p = this.player;
    const char = CHARACTERS.find(c => c.id === this.characterClass)!;
    const uniqueSkill = char.skills.find(s => s.type === 'active-unique');
    if (!uniqueSkill) return;
    // Only allow if the unique skill has been purchased/unlocked
    if (!this.hasSkill(uniqueSkill.id)) return;
    if (p.stamina < uniqueSkill.staminaCost) {
      audio.playSfx('reject');
      p.skillCooldown = 0.3;
      return;
    }
    p.stamina -= uniqueSkill.staminaCost;
    p.skillCooldown = 1.5;
    p.attackAnim = 0.3;

    switch (char.id) {
      case 'warrior':
        if (this.profile.shieldEquipped) {
          audio.playSfx('player-hit');
          this.warriorShieldBlock();
        } else {
          audio.playSfx('charge');
          this.warriorCharge();
        }
        break;
      case 'archer':
        audio.playSfx('arrow-rain');
        this.archerArrowRain();
        break;
      case 'mage':
        audio.playSfx('frost-nova');
        this.mageFrostNova();
        break;
      case 'assassin':
        // Assassin RMB: sickle arc (circular sweep)
        audio.playSfx('chain-hit');
        this.assassinSickleArc();
        break;
    }
  }

  warriorShieldBlock() {
    const p = this.player;
    if (this.profile.shieldHits <= 0) {
      audio.playSfx('reject');
      p.skillCooldown = 0.5;
      return;
    }
    this.profile.shieldHits--;
    this.callbacks.onProfileUpdate({ shieldHits: this.profile.shieldHits });
    if (this.profile.shieldHits <= 0) {
      this.callbacks.onProfileUpdate({ shieldEquipped: false, shieldHits: 0 });
    }
    p.invuln = 1.5;
    this.spawnNovaEffect(p.x, p.y);
    this.spawnHitParticles(p.x, p.y, '#5fa0ff');
    this.spawnFloatingText(p.x, p.y - 25, this.profile.language === 'ru' ? 'ЩИТ!' : 'SHIELD!', '#5fa0ff');
    this.callbacks.onShieldHit(this.profile.shieldHits);
  }

  warriorCharge() {
    const p = this.player;
    const dist = 120;
    p.x += p.facing.x * dist;
    p.y += p.facing.y * dist;
    p.x = Math.max(20, Math.min(this.width - 20, p.x));
    p.y = Math.max(20, Math.min(this.height - 20, p.y));
    this.dealAoeDamage(p.x, p.y, 100, p.damage * 1.5, p.facing);
    this.spawnChargeEffect(p.x, p.y);
    for (const e of this.enemies) {
      if (this.dist(p.x, p.y, e.x, e.y) < 100) {
        e.attackCooldown = 1.0;
      }
    }
  }

  assassinSickleArc() {
    const p = this.player;
    const facingAngle = Math.atan2(p.facing.y, p.facing.x);
    // Sweep 180 degrees arc centered on facing direction
    for (let i = 0; i < 8; i++) {
      const angle = facingAngle - Math.PI * 0.5 + (i / 7) * Math.PI;
      const dir = { x: Math.cos(angle), y: Math.sin(angle) };
      this.spawnProjectile(p.x, p.y, dir, p.damage * 0.6, '#9b3c3c', true, false, false, false);
    }
    // Apply damage to enemies in arc range
    for (const e of this.enemies) {
      if (e.isDying || e.invuln > 0) continue;
      const d = this.dist(p.x, p.y, e.x, e.y);
      if (d < 100) {
        const angleToEnemy = Math.atan2(e.y - p.y, e.x - p.x);
        let diff = angleToEnemy - facingAngle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        if (Math.abs(diff) < Math.PI * 0.5) {
          e.health -= p.damage * 0.6;
          e.hitFlash = 0.2;
          this.spawnHitParticles(e.x, e.y, '#9b3c3c');
          this.spawnFloatingText(e.x, e.y, Math.floor(p.damage * 0.6).toString(), '#ff4444');
          audio.playSfx('enemy-hit');
        }
      }
    }
    this.spawnChainEffect(p.x, p.y, p.facing);
  }

  archerArrowRain() {
    const p = this.player;
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const dir = { x: Math.cos(angle), y: Math.sin(angle) };
      setTimeout(() => {
        if (!this.running) return;
        this.spawnProjectile(p.x, p.y, dir, p.damage * 0.6, '#6fbf9f', true, true, false);
      }, i * 30);
    }
  }

  mageFrostNova() {
    const p = this.player;
    this.spawnNovaEffect(p.x, p.y);
    for (const e of this.enemies) {
      const d = this.dist(p.x, p.y, e.x, e.y);
      if (d < 200) {
        e.health -= p.damage * 0.8;
        e.hitFlash = 0.2;
        e.slowTimer = 3;
        this.spawnHitParticles(e.x, e.y, '#8fc8ff');
      }
    }
  }

  dealAoeDamage(cx: number, cy: number, radius: number, damage: number, facing: Vec2) {
    for (const e of this.enemies) {
      if (e.invuln > 0) continue;
      const d = this.dist(cx, cy, e.x, e.y);
      if (d < radius) {
        const dot = ((e.x - cx) * facing.x + (e.y - cy) * facing.y) / (d || 1);
        if (dot > -0.3 || d < radius * 0.4) {
          e.health -= damage;
          e.hitFlash = 0.2;
          this.spawnHitParticles(e.x, e.y, '#ff4444');
          this.spawnFloatingText(e.x, e.y, Math.floor(damage).toString(), '#ff6666');
          audio.playSfx('enemy-hit');
        }
      }
    }
  }

  applyPoisonToNearby(cx: number, cy: number, radius: number, poisonDmg: number) {
    for (const e of this.enemies) {
      if (this.dist(cx, cy, e.x, e.y) < radius) {
        e.poisonTimer = 3;
        e.poisonDamage = poisonDmg;
      }
    }
  }

  spawnProjectile(x: number, y: number, dir: Vec2, damage: number, color: string, fromPlayer: boolean, isArrow: boolean, isMagic: boolean, isChain: boolean = false) {
    const speed = isMagic ? 500 : isArrow ? 600 : 400;
    this.projectiles.push({
      x, y,
      vx: dir.x * speed,
      vy: dir.y * speed,
      damage,
      radius: isArrow ? 4 : isMagic ? 8 : 5,
      life: 2,
      fromPlayer,
      color,
      isArrow,
      isMagic,
      isChain,
    });
  }

  spawnSlashEffect(x: number, y: number, dir: Vec2) {
    for (let i = 0; i < 8; i++) {
      const angle = Math.atan2(dir.y, dir.x) + (i - 4) * 0.15;
      this.particles.push({
        x: x + dir.x * 30,
        y: y + dir.y * 30,
        vx: Math.cos(angle) * 200,
        vy: Math.sin(angle) * 200,
        life: 0.3,
        maxLife: 0.3,
        color: '#ffd966',
        size: 6,
      });
    }
  }

  spawnChainEffect(x: number, y: number, dir: Vec2) {
    for (let i = 0; i < 6; i++) {
      this.particles.push({
        x: x + dir.x * (10 + i * 12),
        y: y + dir.y * (10 + i * 12),
        vx: dir.x * 100,
        vy: dir.y * 100,
        life: 0.25,
        maxLife: 0.25,
        color: '#9b3c3c',
        size: 4,
      });
    }
  }

  spawnChargeEffect(x: number, y: number) {
    for (let i = 0; i < 15; i++) {
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 300,
        vy: (Math.random() - 0.5) * 300,
        life: 0.4,
        maxLife: 0.4,
        color: '#df8f3f',
        size: 8,
      });
    }
  }

  spawnNovaEffect(x: number, y: number) {
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * 250,
        vy: Math.sin(angle) * 250,
        life: 0.5,
        maxLife: 0.5,
        color: '#8fc8ff',
        size: 10,
      });
    }
  }

  spawnHitParticles(x: number, y: number, color: string) {
    for (let i = 0; i < 5; i++) {
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 200,
        vy: (Math.random() - 0.5) * 200,
        life: 0.3,
        maxLife: 0.3,
        color,
        size: 4,
      });
    }
  }

  spawnDeathParticles(x: number, y: number, color: string) {
    for (let i = 0; i < 12; i++) {
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 300,
        vy: (Math.random() - 0.5) * 300,
        life: 0.6,
        maxLife: 0.6,
        color,
        size: 6,
      });
    }
  }

  spawnFloatingText(x: number, y: number, text: string, color: string) {
    this.floatingTexts.push({ x, y, text, color, life: 1, vy: -60 });
  }

  updateEnemies(dt: number) {
    let totalBossHp = 0;
    let bossCount = 0;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];

      if (e.isDying) {
        e.deathAnim += dt;
        if (e.deathAnim > 0.8) {
          if (e.isBoss && !e.captured) {
            this.captureBoss(e);
          }
          this.enemies.splice(i, 1);
        }
        continue;
      }

      e.spawnAnim = Math.max(0, e.spawnAnim - dt);
      e.hitFlash = Math.max(0, e.hitFlash - dt);
      e.attackCooldown = Math.max(0, e.attackCooldown - dt);
      e.attackAnim = Math.max(0, e.attackAnim - dt);
      e.slowTimer = Math.max(0, e.slowTimer - dt);
      e.bossAbilityCooldown = Math.max(0, e.bossAbilityCooldown - dt);
      e.invuln = Math.max(0, e.invuln - dt);
      e.walkAnim += dt * 6;

      if (e.poisonTimer > 0) {
        e.poisonTimer -= dt;
        e.health -= e.poisonDamage * dt;
        if (Math.random() < dt * 4) {
          this.spawnHitParticles(e.x, e.y, '#7abf3f');
        }
        if (e.health <= 0 && !e.isDying) {
          this.killEnemy(e);
          continue;
        }
      }

      if (e.health <= 0 && !e.isDying) {
        this.killEnemy(e);
        continue;
      }

      const p = this.player;
      const dx = p.x - e.x;
      const dy = p.y - e.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const speed = e.def.speed * 60 * (e.slowTimer > 0 ? 0.4 : 1);

      // Attack type-specific behavior
      if (e.def.attackType === 'ranged') {
        // Ranged enemies maintain distance and shoot
        const idealRange = 200;
        if (d > idealRange + 30) {
          e.x += (dx / d) * speed * dt;
          e.y += (dy / d) * speed * dt;
          e.isMoving = true;
        } else if (d < idealRange - 30) {
          e.x -= (dx / d) * speed * dt;
          e.y -= (dy / d) * speed * dt;
          e.isMoving = true;
        } else {
          e.isMoving = false;
        }
        // Strafe slightly
        if (e.isMoving) e.walkAnim += dt * 6;

        if (d < 350 && e.attackCooldown <= 0) {
          const dir = { x: dx / d, y: dy / d };
          this.spawnProjectile(e.x, e.y, dir, e.def.damage, e.def.color, false, false, true);
          e.attackCooldown = 1.5;
          audio.playSfx('magic-bolt');
        }
      } else if (e.def.attackType === 'charger') {
        // Charger enemies lunge at player
        if (e.attackCooldown > 1.0) {
          // Wind-up: stand still
          e.isMoving = false;
        } else if (e.attackCooldown > 0.1 && e.attackCooldown <= 1.0) {
          // Lunge
          e.x += (dx / d) * speed * 3 * dt;
          e.y += (dy / d) * speed * 3 * dt;
          e.isMoving = true;
          e.walkAnim += dt * 12;
        } else {
          // Chase normally
          e.x += (dx / d) * speed * dt;
          e.y += (dy / d) * speed * dt;
          e.isMoving = true;
          e.walkAnim += dt * 6;
        }
        const attackRange = e.def.radius + 24;
        if (d < attackRange && e.attackCooldown <= 0) {
          this.playerTakeDamage(e.def.damage * 1.3);
          e.attackCooldown = 2.0;
          e.attackAnim = 0.35;
        }
      } else {
        // Melee: chase and attack
        e.x += (dx / d) * speed * dt;
        e.y += (dy / d) * speed * dt;
        e.isMoving = true;
        const attackRange = e.def.radius + 20;
        if (d < attackRange && e.attackCooldown <= 0) {
          this.playerTakeDamage(e.def.damage);
          e.attackCooldown = 1.0;
          e.attackAnim = 0.3;
        }
      }

      // Clamp enemy to canvas bounds
      e.x = Math.max(e.def.radius, Math.min(this.width - e.def.radius, e.x));
      e.y = Math.max(e.def.radius, Math.min(this.height - e.def.radius, e.y));

      if (e.isBoss && e.bossAbilityCooldown <= 0) {
        this.doBossAbility(e);
        e.bossAbilityCooldown = 5;
      }

      if (e.isBoss) {
        totalBossHp += e.health / e.maxHealth;
        bossCount++;
      }
    }

    if (bossCount > 0 && this.currentWave % BOSS_WAVE_INTERVAL === 0) {
      const bossList = this.enemies.filter(e => e.isBoss && !e.isDying);
      if (bossList.length === 1) {
        this.bossName1 = this.profile.language === 'ru' ? bossList[0].def.name.ru : bossList[0].def.name.en;
        this.bossHp1 = bossList[0].health / bossList[0].maxHealth;
        this.bossName2 = null;
        this.bossHp2 = 0;
        this.callbacks.onBossHpChange(this.bossName1, this.bossHp1, null, 0);
      } else if (bossList.length >= 2) {
        this.bossName1 = this.profile.language === 'ru' ? bossList[0].def.name.ru : bossList[0].def.name.en;
        this.bossHp1 = bossList[0].health / bossList[0].maxHealth;
        this.bossName2 = this.profile.language === 'ru' ? bossList[1].def.name.ru : bossList[1].def.name.en;
        this.bossHp2 = bossList[1].health / bossList[1].maxHealth;
        this.callbacks.onBossHpChange(this.bossName1, this.bossHp1, this.bossName2, this.bossHp2);
      }
    } else if (this.bossHpBarVisible) {
      this.bossHpBarVisible = false;
      this.bossName1 = null;
      this.bossHp1 = 0;
      this.bossName2 = null;
      this.bossHp2 = 0;
      this.callbacks.onBossHpChange(null, 0, null, 0);
    }
  }

  doBossAbility(e: Enemy) {
    const p = this.player;
    // Extract boss index from id (format: dungeonId_boss_N)
    const match = e.def.id.match(/_boss_(\d+)$/);
    const bossIndex = match ? parseInt(match[1]) - 1 : 0;
    const abilityIndex = bossIndex % 20;

    // Legacy bosses with hardcoded IDs
    switch (e.def.id) {
      case 'field_boss':
        for (let i = 0; i < 2; i++) this.spawnEnemy(ENEMIES['slime'], 1, false);
        return;
      case 'forest_boss':
        e.x = Math.max(20, Math.min(this.width - 20, p.x + (Math.random() - 0.5) * 200));
        e.y = Math.max(20, Math.min(this.height - 20, p.y + (Math.random() - 0.5) * 200));
        this.spawnHitParticles(e.x, e.y, '#1f7f1f');
        for (let i = 0; i < 2; i++) this.spawnEnemy(ENEMIES['spider'], 1, false);
        return;
      case 'cave_boss': {
        const dx0 = p.x - e.x, dy0 = p.y - e.y, d0 = Math.sqrt(dx0 * dx0 + dy0 * dy0) || 1;
        e.x += (dx0 / d0) * 80; e.y += (dy0 / d0) * 80;
        if (this.dist(e.x, e.y, p.x, p.y) < 40) this.playerTakeDamage(e.def.damage * 1.5);
        return;
      }
      case 'ruins_boss':
        this.spawnNovaEffect(p.x, p.y);
        if (this.dist(e.x, e.y, p.x, p.y) < 200) this.playerTakeDamage(e.def.damage);
        return;
      case 'volcano_boss':
        for (let i = 0; i < 5; i++) {
          const mx = p.x + (Math.random() - 0.5) * 200;
          const my = p.y + (Math.random() - 0.5) * 200;
          this.spawnProjectile(mx, my - 200, { x: 0, y: 1 }, e.def.damage * 0.5, '#df3f1f', false, false, false);
        }
        return;
      case 'abyss_boss':
        for (let i = 0; i < 3; i++) {
          const angle = Math.atan2(p.y - e.y, p.x - e.x) + (i - 1) * 0.3;
          this.spawnProjectile(e.x, e.y, { x: Math.cos(angle), y: Math.sin(angle) }, e.def.damage * 0.6, '#5a0a8a', false, false, true);
        }
        return;
    }

    // Procedural boss abilities based on index
    switch (abilityIndex) {
      case 0: // Split into 3 copies when HP < 50%
        if (e.health < e.maxHealth * 0.5) {
          for (let i = 0; i < 3; i++) {
            const mini: EnemyDef = { ...e.def, id: e.def.id + '_mini', health: Math.floor(e.maxHealth * 0.2), isBoss: false, radius: e.def.radius * 0.5, sellPrice: 0 };
            this.spawnEnemy(mini, 1, false);
          }
          this.spawnFloatingText(e.x, e.y - 30, this.profile.language === 'ru' ? 'ДЕЛЕНИЕ!' : 'SPLIT!', '#ffaa44');
        }
        break;
      case 1: // Immobilize roots
        p.vx = 0; p.vy = 0;
        this.spawnFloatingText(p.x, p.y - 20, this.profile.language === 'ru' ? 'КОРНИ!' : 'ROOTS!', '#3faf2f');
        this.spawnHitParticles(p.x, p.y, '#3faf2f');
        break;
      case 2: // 8-directional fan
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2;
          this.spawnProjectile(e.x, e.y, { x: Math.cos(angle), y: Math.sin(angle) }, e.def.damage * 0.5, e.def.color, false, false, true);
        }
        break;
      case 3: // Invisibility
        e.spawnAnim = 0.3;
        this.spawnFloatingText(e.x, e.y - 30, this.profile.language === 'ru' ? 'НЕВИДИМОСТЬ' : 'INVISIBLE', '#6a4a8a');
        break;
      case 4: // Stunning scream with knockback
        this.spawnNovaEffect(e.x, e.y);
        for (const enemy of this.enemies) {
          if (enemy === e) continue;
          const edx = enemy.x - e.x, edy = enemy.y - e.y, ed = Math.sqrt(edx * edx + edy * edy) || 1;
          if (ed < 200) { enemy.x += (edx / ed) * 50; enemy.y += (edy / ed) * 50; }
        }
        if (this.dist(e.x, e.y, p.x, p.y) < 200) {
          const pdx = p.x - e.x, pdy = p.y - e.y, pd = Math.sqrt(pdx * pdx + pdy * pdy) || 1;
          p.x += (pdx / pd) * 60; p.y += (pdy / pd) * 60;
          this.playerTakeDamage(e.def.damage * 0.8);
        }
        break;
      case 5: // Dark meteors
        for (let i = 0; i < 5; i++) {
          const mx = p.x + (Math.random() - 0.5) * 250;
          const my = p.y + (Math.random() - 0.5) * 250;
          this.spawnProjectile(mx, my - 250, { x: 0, y: 1 }, e.def.damage * 0.7, '#3a0a3a', false, false, false);
        }
        break;
      case 6: // Summon waves with speed buff
        for (let i = 0; i < 3; i++) {
          const minion: EnemyDef = { ...e.def, id: e.def.id + '_minion', health: Math.floor(e.maxHealth * 0.1), isBoss: false, radius: e.def.radius * 0.4, speed: e.def.speed * 1.3, sellPrice: 0 };
          this.spawnEnemy(minion, 1, false);
        }
        break;
      case 7: // Burrow (invulnerable)
        e.invuln = 2;
        this.spawnFloatingText(e.x, e.y - 30, this.profile.language === 'ru' ? 'ПОД ЗЕМЛЁЙ' : 'BURROW', '#8a7a5a');
        break;
      case 8: // Thorns (reflect damage)
        if (this.dist(e.x, e.y, p.x, p.y) < 150) {
          this.playerTakeDamage(e.def.damage * 0.5);
          this.spawnFloatingText(p.x, p.y - 20, this.profile.language === 'ru' ? 'ШИПЫ' : 'THORNS', '#df5f3f');
        }
        break;
      case 9: // Stone form (invuln + regen)
        e.health = Math.min(e.maxHealth, e.health + e.maxHealth * 0.1);
        this.spawnFloatingText(e.x, e.y - 30, this.profile.language === 'ru' ? 'КАМЕННАЯ ФОРМА' : 'STONE FORM', '#8a8a8a');
        break;
      case 10: // Blade vortex
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2 + e.walkAnim;
          this.spawnProjectile(e.x, e.y, { x: Math.cos(angle), y: Math.sin(angle) }, e.def.damage * 0.4, '#c0c0d0', false, false, true);
        }
        break;
      case 11: // Quicksand
        p.vx *= 0.2; p.vy *= 0.2;
        this.spawnFloatingText(p.x, p.y - 20, this.profile.language === 'ru' ? 'ЗЫБУЧИЙ ПЕСОК' : 'QUICKSAND', '#c8a050');
        break;
      case 12: // Fiery charge with burning
        { const dxc = p.x - e.x, dyc = p.y - e.y, dc = Math.sqrt(dxc * dxc + dyc * dyc) || 1;
        e.x += (dxc / dc) * 120; e.y += (dyc / dc) * 120;
        for (let i = 0; i < 8; i++) this.spawnHitParticles(e.x + (Math.random() - 0.5) * 60, e.y + (Math.random() - 0.5) * 60, '#df3f1f');
        if (this.dist(e.x, e.y, p.x, p.y) < 50) this.playerTakeDamage(e.def.damage * 1.5); }
        break;
      case 13: // Target markers + meteors
        for (let i = 0; i < 4; i++) {
          const mx = p.x + (Math.random() - 0.5) * 200;
          const my = p.y + (Math.random() - 0.5) * 200;
          this.spawnProjectile(mx, my - 200, { x: 0, y: 1 }, e.def.damage * 0.8, '#df1f1f', false, false, false);
        }
        break;
      case 14: // Egg (revives if not killed in 4 sec)
        if (e.health < e.maxHealth * 0.2) {
          e.health = Math.floor(e.maxHealth * 0.5);
          this.spawnFloatingText(e.x, e.y - 30, this.profile.language === 'ru' ? 'ВОСКРЕШЕНИЕ!' : 'REVIVE!', '#df3f3f');
          this.spawnNovaEffect(e.x, e.y);
        }
        break;
      case 15: // Thick laser beam
        for (let i = 0; i < 10; i++) {
          const dx = p.x - e.x, dy = p.y - e.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
          this.spawnProjectile(e.x + (dx / d) * i * 30, e.y + (dy / d) * i * 30, { x: dx / d, y: dy / d }, e.def.damage * 0.3, '#5a0a8a', false, false, true);
        }
        break;
      case 16: // Key inversion
        this.spawnFloatingText(p.x, p.y - 20, this.profile.language === 'ru' ? 'ИНВЕРСИЯ!' : 'INVERTED!', '#df3fdf');
        break;
      case 17: // Tentacle pull
        { const dxp = e.x - p.x, dyp = e.y - p.y, dp = Math.sqrt(dxp * dxp + dyp * dyp) || 1;
        p.x += (dxp / dp) * 80; p.y += (dyp / dp) * 80;
        this.spawnFloatingText(p.x, p.y - 20, this.profile.language === 'ru' ? 'ПРИТЯЖЕНИЕ' : 'PULLED', '#5a0a5a'); }
        break;
      case 18: // Ring projectiles
        for (let i = 0; i < 12; i++) {
          const angle = (i / 12) * Math.PI * 2;
          this.spawnProjectile(e.x, e.y, { x: Math.cos(angle), y: Math.sin(angle) }, e.def.damage * 0.4, e.def.color, false, false, true);
        }
        break;
      case 19: { // Final boss: random ability from any previous
        const randomIdx = Math.floor(Math.random() * 19);
                const fakeId = `${e.def.dungeonId || 'whispering_grove'}_boss_${randomIdx + 1}`;
        this.doBossAbility({ ...e, def: { ...e.def, id: fakeId } });
        break; }
    }
  }

  killEnemy(e: Enemy) {
    e.isDying = true;
    e.deathAnim = 0;
    this.spawnDeathParticles(e.x, e.y, e.def.color);

    if (e.isBoss) {
      audio.playSfx('boss-death');
    } else {
      audio.playSfx('enemy-death');
    }

    this.goldThisWave += e.def.goldReward;
    this.expThisWave += e.def.expReward;
    this.enemiesKilledThisWave++;

    if (this.hasSkill('s_lifesteal')) {
      this.player.health = Math.min(this.player.maxHealth, this.player.health + 3);
    }
  }

  captureBoss(e: Enemy) {
    e.captured = true;
    audio.playSfx('capture');

    const boss: CapturedBoss = {
      uid: Math.random().toString(36).slice(2) + Date.now().toString(36),
      enemyId: e.def.id,
      name: e.def.name,
      ability: e.def.ability || { ru: 'Нет способности', en: 'No ability' },
      sellPrice: e.def.sellPrice,
      difficulty: Math.ceil(e.maxHealth / 100),
      icon: e.def.icon,
      capturedAt: Date.now(),
    };

    this.callbacks.onBossCaptured(boss);
  }

  playerTakeDamage(rawDmg: number) {
    const p = this.player;
    if (p.invuln > 0) return;

    let dmg = rawDmg;
    if (this.hasSkill('m_barrier')) {
      dmg *= 0.8;
    }

    // Shield absorbs hits if equipped and has hits remaining
    if (this.profile.shieldEquipped && this.profile.shieldHits > 0) {
      this.profile.shieldHits--;
      this.callbacks.onProfileUpdate({ shieldHits: this.profile.shieldHits });
      audio.playSfx('player-hit');
      this.spawnHitParticles(p.x, p.y, '#5fa0ff');
      this.spawnFloatingText(p.x, p.y - 20, this.profile.language === 'ru' ? 'БЛОК' : 'BLOCK', '#5fa0ff');
      // Shield broke → auto-unequip
      if (this.profile.shieldHits <= 0) {
        this.spawnNovaEffect(p.x, p.y);
        audio.playSfx('enemy-death');
        this.callbacks.onProfileUpdate({ shieldEquipped: false, shieldHits: 0 });
        const lang = this.profile.language;
        this.spawnFloatingText(p.x, p.y - 45, lang === 'ru' ? 'ЩИТ СЛОМАН!' : 'SHIELD BROKEN!', '#df3f3f');
      }
      this.callbacks.onShieldHit(this.profile.shieldHits);
      return;
    }

    p.health -= dmg;
    p.hitFlash = 0.3;
    p.invuln = 0.5;
    audio.playSfx('player-hit');
    this.spawnHitParticles(p.x, p.y, '#ff4444');
    this.spawnFloatingText(p.x, p.y - 20, Math.floor(dmg).toString(), '#ff6666');

    if (p.health <= 0) {
      p.health = 0;
      this.onPlayerDeath();
    }
  }

  onPlayerDeath() {
    if (this.profile.ownedPotions.revival > 0 && !this.revivalUsed) {
      this.revivalUsed = true;
      this.profile.ownedPotions.revival--;
      this.callbacks.onPotionUsed('revival');
      this.player.health = Math.floor(this.player.maxHealth * REVIVAL_HP_PERCENT);
      this.player.invuln = 2;
      audio.playSfx('revive');
      this.spawnNovaEffect(this.player.x, this.player.y);
      return;
    }

    this.gameOver = true;
    this.waveResult = 'defeat';
    audio.stopMusic();
    audio.playSfx('enemy-death');
    this.callbacks.onWaveResult('defeat', this.currentWave, this.goldThisWave, this.expThisWave);
    this.callbacks.onPlayerDeath();
  }

  useHealthPotion(): boolean {
    if (this.profile.ownedPotions.health <= 0) return false;
    if (this.healthPotionCooldown > 0 && this.healthPotionUsedThisWave) return false;

    this.profile.ownedPotions.health--;
    this.player.health = Math.min(this.player.maxHealth, this.player.health + POTION_HEALTH_AMOUNT);
    audio.playSfx('potion-health');
    this.spawnFloatingText(this.player.x, this.player.y - 20, '+' + POTION_HEALTH_AMOUNT + ' HP', '#3faf3f');
    this.spawnHitParticles(this.player.x, this.player.y, '#3faf3f');
    this.callbacks.onPotionUsed('health');

    if (this.healthPotionUsedThisWave) {
      this.healthPotionCooldown = POTION_COOLDOWN;
      this.callbacks.onPotionCooldownUpdate('health', POTION_COOLDOWN, POTION_COOLDOWN);
    }
    this.healthPotionUsedThisWave = true;
    return true;
  }

  useStaminaPotion(): boolean {
    if (this.profile.ownedPotions.stamina <= 0) return false;
    if (this.staminaPotionCooldown > 0 && this.staminaPotionUsedThisWave) return false;

    this.profile.ownedPotions.stamina--;
    this.player.stamina = Math.min(this.player.maxStamina, this.player.stamina + POTION_STAMINA_AMOUNT);
    audio.playSfx('potion-stamina');
    this.spawnFloatingText(this.player.x, this.player.y - 20, '+' + POTION_STAMINA_AMOUNT + ' STA', '#3faf3f');
    this.spawnHitParticles(this.player.x, this.player.y, '#3fa0ff');
    this.callbacks.onPotionUsed('stamina');

    if (this.staminaPotionUsedThisWave) {
      this.staminaPotionCooldown = POTION_COOLDOWN;
      this.callbacks.onPotionCooldownUpdate('stamina', POTION_COOLDOWN, POTION_COOLDOWN);
    }
    this.staminaPotionUsedThisWave = true;
    return true;
  }

  useRevivalPotion(): boolean {
    if (this.profile.ownedPotions.revival <= 0) return false;
    if (!this.gameOver || this.waveResult !== 'defeat') return false;

    this.profile.ownedPotions.revival--;
    this.callbacks.onPotionUsed('revival');
    this.gameOver = false;
    this.waveResult = null;
    this.player.health = Math.floor(this.player.maxHealth * REVIVAL_HP_PERCENT);
    this.player.invuln = 3;
    audio.playSfx('revive');
    this.spawnNovaEffect(this.player.x, this.player.y);
    audio.startMusic();
    return true;
  }

  completeWave() {
    this.waveActive = false;
    audio.playSfx('wave-clear');

    const goldEarned = this.goldThisWave;
    const expEarned = this.expThisWave;

    this.callbacks.onWaveCleared(this.currentWave, goldEarned, expEarned);

    // In easy mode, save progress per dungeon so player can resume from last cleared wave
    if (this.profile.gameMode === 'easy') {
      for (const dgId of this.profile.equippedDungeons) {
        const current = this.profile.dungeonProgress[dgId] || 0;
        if (this.currentWave > current) {
          this.callbacks.onProfileUpdate({
            dungeonProgress: { ...this.profile.dungeonProgress, [dgId]: this.currentWave },
          });
        }
      }
    }

    this.revivalUsed = false;

    if (this.currentWave >= MAX_WAVES) {
      this.gameOver = true;
      this.waveResult = 'victory';
      this.callbacks.onWaveResult('victory', this.currentWave, goldEarned, expEarned);
      audio.stopMusic();
      return;
    }

    this.waveResult = 'victory';
    this.callbacks.onWaveResult('victory', this.currentWave, goldEarned, expEarned);
  }

  continueToNextWave() {
    this.waveResult = null;
    this.startNextWave();
  }

  retryWave() {
    this.waveResult = null;
    this.gameOver = false;
    this.enemies = [];
    this.projectiles = [];
    this.particles = [];
    this.floatingTexts = [];
    this.currentWave--;
    this.player.health = Math.floor(this.player.maxHealth * 0.5);
    this.player.invuln = 2;
    audio.startMusic();
    this.startNextWave();
  }

  exitToGuild() {
    // In easy mode, dungeon progress is already saved during completeWave.
    // This is called when player chooses to exit after defeat.
    this.stop();
  }

  updateProjectiles(dt: number) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const pr = this.projectiles[i];
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      pr.life -= dt;

      if (pr.life <= 0 || pr.x < -50 || pr.x > this.width + 50 || pr.y < -50 || pr.y > this.height + 50) {
        this.projectiles.splice(i, 1);
        continue;
      }

      // Clamp projectiles to canvas bounds
      pr.x = Math.max(0, Math.min(this.width, pr.x));
      pr.y = Math.max(0, Math.min(this.height, pr.y));

      if (pr.fromPlayer && !pr.isChain) {
        for (const e of this.enemies) {
          if (e.isDying) continue;
          if (e.invuln > 0) continue;
          if (this.dist(pr.x, pr.y, e.x, e.y) < e.def.radius + pr.radius) {
            e.health -= pr.damage;
            e.hitFlash = 0.2;
            this.spawnHitParticles(e.x, e.y, pr.color);
            this.spawnFloatingText(e.x, e.y, Math.floor(pr.damage).toString(), '#ff6666');
            audio.playSfx('enemy-hit');
            if (this.hasSkill('s_lifesteal')) {
              this.player.health = Math.min(this.player.maxHealth, this.player.health + pr.damage * 0.15);
            }
            this.projectiles.splice(i, 1);
            break;
          }
        }
      } else if (pr.fromPlayer && pr.isChain) {
        // Chain projectile: check if it hit its specific target
        const target = this.enemies.find(e => e.id === pr.chainTargetId && !e.isDying);
        if (!target) {
          // Target died or gone - chain will return (handled in setTimeout)
          this.projectiles.splice(i, 1);
        }
      } else {
        if (this.dist(pr.x, pr.y, this.player.x, this.player.y) < 16 + pr.radius) {
          this.playerTakeDamage(pr.damage);
          this.projectiles.splice(i, 1);
        }
      }
    }
  }

  updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.92;
      p.vy *= 0.92;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  updateFloatingTexts(dt: number) {
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const t = this.floatingTexts[i];
      t.y += t.vy * dt;
      t.life -= dt;
      if (t.life <= 0) this.floatingTexts.splice(i, 1);
    }
  }

  dist(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  }

  // === RENDERING ===
  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    const dg = DUNGEONS.find(d => d.id === (this.profile.equippedDungeons[0] || 'whispering_grove')) || DUNGEONS[0];
    const grad = ctx.createRadialGradient(this.width / 2, this.height / 2, 0, this.width / 2, this.height / 2, Math.max(this.width, this.height) / 1.5);
    grad.addColorStop(0, dg.bgGradient[0]);
    grad.addColorStop(1, dg.bgGradient[1]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < this.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
      ctx.stroke();
    }
    for (let y = 0; y < this.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }

    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    for (const e of this.enemies) {
      this.renderEnemy(e);
    }

    for (const pr of this.projectiles) {
      ctx.fillStyle = pr.color;
      ctx.shadowColor = pr.color;
      ctx.shadowBlur = 8;
      if (pr.isChain) {
        // Draw chain as a line from player to projectile
        ctx.strokeStyle = pr.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(this.player.x, this.player.y);
        ctx.lineTo(pr.x, pr.y);
        ctx.stroke();
        ctx.fillStyle = '#c0c0c0';
        ctx.beginPath();
        ctx.arc(pr.x, pr.y, 4, 0, Math.PI * 2);
        ctx.fill();
      } else if (pr.isArrow) {
        const angle = Math.atan2(pr.vy, pr.vx);
        ctx.save();
        ctx.translate(pr.x, pr.y);
        ctx.rotate(angle);
        ctx.fillRect(-8, -1, 16, 2);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(pr.x, pr.y, pr.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    }

    this.renderPlayer();

    for (const t of this.floatingTexts) {
      ctx.globalAlpha = t.life;
      ctx.fillStyle = t.color;
      ctx.font = 'bold 14px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;

    if (this.waveTransitionTimer > 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.fillStyle = '#f0c050';
      ctx.font = 'bold 48px Cinzel, serif';
      ctx.textAlign = 'center';
      ctx.fillText(this.waveTransitionText, this.width / 2, this.height / 2);
      if (this.waveTransitionSubtext) {
        ctx.fillStyle = '#8888a0';
        ctx.font = '20px Cinzel, serif';
        ctx.fillText(this.waveTransitionSubtext, this.width / 2, this.height / 2 + 40);
      }
    }
  }

    // === Enemy rendering helpers ===
  getEnemyEmoji(e: Enemy, shape: EnemyShape): string {
    // Делегируем в новую систему (покрывает весь список монстров)
    return getMonsterEmoji(e.def.name, shape);
  }

  drawBossPixelArt(ctx: CanvasRenderingContext2D, e: Enemy, r: number, color: string, hit: boolean) {
    const N = 16;
    const cellSize = (r * 2) / N;
    const finalBoss = !!e.def.isFinalBoss;
    const pattern = buildBossPattern(e.def.id, e.def.shape || 'humanoid', finalBoss);
    const now = performance.now() / 1000;

    const cMain = hit ? '#ffffff' : color;
    const cDark = hit ? '#ffffff' : shadeColor(color, 0.45);
    const cLight = hit ? '#ffffff' : shadeColor(color, 1.45);
    const eyeGlow = 0.7 + Math.sin(now * 4 + e.x) * 0.3;

    const colors: Record<number, string> = {
      1: cMain,
      2: cDark,
      4: hit ? '#fff' : '#f0c050',
      5: cLight,
    };

    // Проход 1: тело и контур
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const v = pattern[y][x];
        if (v === 0 || v === 3) continue;
        ctx.fillStyle = colors[v] || cMain;
        ctx.fillRect(-N / 2 * cellSize + x * cellSize, -N / 2 * cellSize + y * cellSize, cellSize + 0.5, cellSize + 0.5);
      }
    }

    // Проход 2: светящиеся глаза
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        if (pattern[y][x] !== 3) continue;
        ctx.save();
        ctx.shadowColor = hit ? '#fff' : '#ffcc33';
        ctx.shadowBlur = 6 + eyeGlow * 6;
        ctx.fillStyle = hit ? '#fff' : `rgba(255,204,51,${0.6 + eyeGlow * 0.4})`;
        ctx.fillRect(-N / 2 * cellSize + x * cellSize, -N / 2 * cellSize + y * cellSize, cellSize + 0.5, cellSize + 0.5);
        ctx.restore();
      }
    }
  }

  getBossPixelPattern(name: string, phase: number): number[][] {
    // Совместимость: процедурный генератор по id/форме
    return buildBossPattern(name, 'humanoid', false);
  }

  renderEnemy(e: Enemy) {
    const ctx = this.ctx;
    let alpha = 1;
    let scale = 1;

    if (e.spawnAnim > 0) {
      alpha = 1 - e.spawnAnim / 0.5;
      scale = 0.5 + alpha * 0.5;
    }

    if (e.isDying) {
      alpha = 1 - e.deathAnim / 0.8;
      scale = 1 + e.deathAnim * 0.3;
    }

    // Bosses render 2.5x larger
    if (e.isBoss) scale *= 2.5;

    ctx.globalAlpha = alpha;

    const r = e.def.radius;
    const now = performance.now() / 1000;
    const shape: EnemyShape = e.def.shape || 'blob';
    const hueShift = e.def.hueShift || 0;

    // === Анимации ===
    // 1) Подскок при ходьбе / дыхание в покое
    const bob = e.isMoving ? Math.sin(e.walkAnim) * 3 : Math.sin(now * 2.5 + e.x) * 1.5;
    // 2) Squash & stretch
    const squashPhase = e.isMoving ? Math.sin(e.walkAnim * 2) : Math.sin(now * 2.5 + e.x);
    const sy = 1 + squashPhase * (e.isMoving ? 0.07 : 0.035);
    const sx = 1 - (sy - 1) * 0.7;
    // 3) Выпад при атаке (в сторону игрока)
    const lungeT = e.attackAnim > 0 ? Math.sin((1 - e.attackAnim / 0.35) * Math.PI) : 0;
    const lunge = lungeT * (e.isBoss ? 16 : 10);
    // 4) Дрожь при замахе (charger)
    const windup = e.def.attackType === 'charger' && e.attackCooldown > 1.0
      ? Math.sin(now * 45) * 2.5 : 0;
    // 5) Смерть: вращение и оседание
    const deathRot = e.isDying ? e.deathAnim * 0.9 : 0;
    const spawnRise = e.spawnAnim > 0 ? e.spawnAnim * 26 : 0;

    // Тень (дышит вместе с телом)
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(e.x, e.y + r * 0.85, r * 0.7 * sx, r * 0.28 * sy, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(e.x + windup, e.y + bob - spawnRise);
    if (deathRot) ctx.rotate(deathRot);
    ctx.scale(scale * sx, scale * sy);
    // Выпад в направлении цели (вправо-влево упрощённо по знаку)
    if (lunge !== 0) ctx.translate(lunge * Math.sign(this.player.x - e.x || 1), -lunge * 0.15);

    const baseColor = e.hitFlash > 0 ? '#ffffff' : e.def.color;
    const hit = e.hitFlash > 0;

    // Свечение босса
    if (e.isBoss) {
      ctx.shadowColor = e.def.color;
      ctx.shadowBlur = 22 + Math.sin(now * 3) * 8;
    }

    if (e.isBoss) {
      this.drawBossPixelArt(ctx, e, r, baseColor, hit);
    } else {
      // === Обычный монстр: подложка-аура + большой эмодзи монстра ===
      const aura = shadeColor(e.def.color, 0.55);
      ctx.globalAlpha = alpha * 0.5;
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.ellipse(0, r * 0.15, r * 1.05, r * 0.95, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = alpha;

      const emoji = getMonsterEmoji(e.def.name, shape);
      const emojiSize = r * 2.4;
      ctx.font = `normal normal ${emojiSize}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // Тень эмодзи для объёма
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.45)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 3;
      ctx.filter = hit ? 'brightness(2.2) saturate(0.4)'
        : hueShift > 0 ? `hue-rotate(${hueShift}deg)` : 'none';
      ctx.fillText(emoji, 0, 0);
      ctx.restore();
      ctx.filter = 'none';
    }

    ctx.shadowBlur = 0;
    ctx.restore();

    // === Статус-эффекты ===
    if (e.slowTimer > 0) {
      ctx.strokeStyle = 'rgba(143,200,255,0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(e.x, e.y + bob, r + 4, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (e.poisonTimer > 0) {
      ctx.fillStyle = 'rgba(122,191,63,0.3)';
      ctx.beginPath();
      ctx.arc(e.x, e.y + bob, r, 0, Math.PI * 2);
      ctx.fill();
    }
    if (e.invuln > 0) {
      ctx.strokeStyle = `rgba(255,255,255,${e.invuln / 4})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(e.x, e.y + bob, r + 6, 0, Math.PI * 2);
      ctx.stroke();
    }

    // === Эмодзи-бейдж над монстром/боссом ===
    if (!e.isDying) {
      const badgeEmoji = getMonsterEmoji(e.def.name, shape);
      const badgeR = e.isBoss ? 15 : 10;
      const badgeY = e.y - r * (e.isBoss ? 2.6 : 2.2) - badgeR - 6 + bob * 0.5;

      // Пузырь
      ctx.globalAlpha = alpha * 0.95;
      ctx.fillStyle = 'rgba(10,10,18,0.85)';
      ctx.beginPath();
      ctx.arc(e.x, badgeY, badgeR, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = e.isBoss ? '#f0c050' : 'rgba(200,155,60,0.7)';
      ctx.lineWidth = e.isBoss ? 2.5 : 1.5;
      ctx.stroke();

      // Эмодзи внутри пузыря
      ctx.font = `normal normal ${Math.round(badgeR * 1.25)}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(badgeEmoji, e.x, badgeY + 1);
      ctx.globalAlpha = 1;
    }

    // Health bar
    if (e.health < e.maxHealth && !e.isDying) {
      const barW = r * 2;
      const barH = e.isBoss ? 6 : 4;
      const barY = e.y - r - 12;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(e.x - barW / 2, barY, barW, barH);
      ctx.fillStyle = e.isBoss ? '#f0c050' : '#df3f3f';
      ctx.fillRect(e.x - barW / 2, barY, barW * (e.health / e.maxHealth), barH);
    }

    if (e.isBoss && !e.isDying) {
      ctx.fillStyle = '#f0c050';
      ctx.font = 'bold 14px Cinzel, serif';
      ctx.textAlign = 'center';
      const name = this.profile.language === 'ru' ? e.def.name.ru : e.def.name.en;
      ctx.fillText(name, e.x, e.y - r * 2.6 - 40);
    }

    ctx.globalAlpha = 1;
  }

  drawEnemyShape(ctx: CanvasRenderingContext2D, shape: EnemyShape, r: number, color: string, hit: boolean) {
    const c = hit ? '#fff' : color;
    ctx.fillStyle = c;
    ctx.strokeStyle = hit ? '#fff' : 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 2;

    switch (shape) {
      case 'blob':
        // Slime: rounded blob with drip effect
        ctx.beginPath();
        ctx.ellipse(0, r * 0.2, r, r * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Drips
        ctx.beginPath();
        ctx.arc(-r * 0.5, r * 0.6, r * 0.2, 0, Math.PI * 2);
        ctx.arc(r * 0.5, r * 0.6, r * 0.2, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'beetle':
        // Segmented beetle body
        ctx.beginPath();
        ctx.ellipse(0, 0, r, r * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Segments
        ctx.strokeStyle = hit ? '#fff' : 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.moveTo(-r * 0.6, 0); ctx.lineTo(r * 0.6, 0);
        ctx.moveTo(-r * 0.3, -r * 0.5); ctx.lineTo(r * 0.3, -r * 0.5);
        ctx.stroke();
        // Antennae
        ctx.beginPath();
        ctx.moveTo(-r * 0.3, -r * 0.5); ctx.lineTo(-r * 0.4, -r);
        ctx.moveTo(r * 0.3, -r * 0.5); ctx.lineTo(r * 0.4, -r);
        ctx.stroke();
        break;

      case 'spider':
        // Spider body
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2);
        ctx.fill();
        // Legs
        ctx.strokeStyle = c;
        ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI - Math.PI * 0.3;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
          ctx.moveTo(0, 0);
          ctx.lineTo(-Math.cos(a) * r, Math.sin(a) * r);
          ctx.stroke();
        }
        ctx.lineWidth = 2;
        break;

      case 'shadow':
      case 'spirit':
        // Ghostly semi-transparent figure
        ctx.globalAlpha *= 0.8;
        ctx.beginPath();
        ctx.arc(0, -r * 0.2, r * 0.6, Math.PI, 0);
        ctx.lineTo(r * 0.6, r * 0.5);
        ctx.quadraticCurveTo(r * 0.3, r * 0.3, 0, r * 0.5);
        ctx.quadraticCurveTo(-r * 0.3, r * 0.3, -r * 0.6, r * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha /= 0.8;
        break;

      case 'bat':
        // Bat body with wings
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.4, 0, Math.PI * 2);
        ctx.fill();
        // Wings
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(-r * 0.8, -r * 0.3, -r, r * 0.2);
        ctx.quadraticCurveTo(-r * 0.6, r * 0.1, 0, r * 0.1);
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(r * 0.8, -r * 0.3, r, r * 0.2);
        ctx.quadraticCurveTo(r * 0.6, r * 0.1, 0, r * 0.1);
        ctx.fill();
        break;

      case 'crystal':
        // Crystal shape
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.lineTo(r * 0.6, -r * 0.2);
        ctx.lineTo(r * 0.4, r * 0.8);
        ctx.lineTo(-r * 0.4, r * 0.8);
        ctx.lineTo(-r * 0.6, -r * 0.2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Facets
        ctx.strokeStyle = hit ? '#fff' : 'rgba(255,255,255,0.4)';
        ctx.beginPath();
        ctx.moveTo(0, -r); ctx.lineTo(0, r * 0.8);
        ctx.moveTo(-r * 0.6, -r * 0.2); ctx.lineTo(r * 0.6, -r * 0.2);
        ctx.stroke();
        break;

      case 'gargoyle':
        // Winged stone creature
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2);
        ctx.fill();
        // Wings
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.2);
        ctx.lineTo(-r, -r * 0.5); ctx.lineTo(-r * 0.8, r * 0.2); ctx.lineTo(0, r * 0.1);
        ctx.moveTo(0, -r * 0.2);
        ctx.lineTo(r, -r * 0.5); ctx.lineTo(r * 0.8, r * 0.2); ctx.lineTo(0, r * 0.1);
        ctx.fill();
        // Horns
        ctx.beginPath();
        ctx.moveTo(-r * 0.2, -r * 0.4); ctx.lineTo(-r * 0.3, -r * 0.7);
        ctx.moveTo(r * 0.2, -r * 0.4); ctx.lineTo(r * 0.3, -r * 0.7);
        ctx.stroke();
        break;

      case 'skeleton':
        // Skull body
        ctx.beginPath();
        ctx.arc(0, -r * 0.2, r * 0.5, 0, Math.PI * 2);
        ctx.fill();
        // Ribcage
        ctx.strokeStyle = c;
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(-r * 0.4, r * 0.1 + i * r * 0.2);
          ctx.lineTo(r * 0.4, r * 0.1 + i * r * 0.2);
          ctx.stroke();
        }
        ctx.lineWidth = 2;
        break;

      case 'golem':
        // Large bulky golem
        ctx.beginPath();
        ctx.rect(-r * 0.7, -r * 0.6, r * 1.4, r * 1.4);
        ctx.fill();
        ctx.stroke();
        // Cracks
        ctx.strokeStyle = hit ? '#fff' : 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.moveTo(-r * 0.3, -r * 0.3); ctx.lineTo(0, 0); ctx.lineTo(r * 0.2, r * 0.3);
        ctx.stroke();
        break;

      case 'imp':
        // Small imp with horns
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2);
        ctx.fill();
        // Horns
        ctx.beginPath();
        ctx.moveTo(-r * 0.3, -r * 0.4); ctx.lineTo(-r * 0.5, -r * 0.8);
        ctx.moveTo(r * 0.3, -r * 0.4); ctx.lineTo(r * 0.5, -r * 0.8);
        ctx.stroke();
        // Tail
        ctx.beginPath();
        ctx.moveTo(0, r * 0.5); ctx.quadraticCurveTo(r * 0.5, r * 0.8, r * 0.3, r);
        ctx.stroke();
        break;

      case 'wolf':
        // Wolf body
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 0.9, r * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        // Ears
        ctx.beginPath();
        ctx.moveTo(-r * 0.5, -r * 0.3); ctx.lineTo(-r * 0.6, -r * 0.7); ctx.lineTo(-r * 0.3, -r * 0.4);
        ctx.moveTo(r * 0.5, -r * 0.3); ctx.lineTo(r * 0.6, -r * 0.7); ctx.lineTo(r * 0.3, -r * 0.4);
        ctx.fill();
        break;

      case 'humanoid':
        // Humanoid figure (goblin, knight, etc.)
        // Head
        ctx.beginPath();
        ctx.arc(0, -r * 0.5, r * 0.35, 0, Math.PI * 2);
        ctx.fill();
        // Body
        ctx.beginPath();
        ctx.rect(-r * 0.3, -r * 0.15, r * 0.6, r * 0.6);
        ctx.fill();
        ctx.stroke();
        // Arms
        ctx.strokeStyle = c;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-r * 0.3, 0); ctx.lineTo(-r * 0.6, r * 0.2);
        ctx.moveTo(r * 0.3, 0); ctx.lineTo(r * 0.6, r * 0.2);
        ctx.stroke();
        ctx.lineWidth = 2;
        break;

      case 'eye':
        // Giant eye
        ctx.beginPath();
        ctx.ellipse(0, 0, r, r * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Iris
        ctx.fillStyle = hit ? '#fff' : '#df2f3f';
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = hit ? '#fff' : '#0a0a0a';
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.15, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'dragon':
        // Dragon silhouette with wings
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 0.6, r * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        // Wings
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.3);
        ctx.quadraticCurveTo(-r * 1.2, -r, -r * 1.1, r * 0.2);
        ctx.quadraticCurveTo(-r * 0.5, -r * 0.2, 0, 0);
        ctx.moveTo(0, -r * 0.3);
        ctx.quadraticCurveTo(r * 1.2, -r, r * 1.1, r * 0.2);
        ctx.quadraticCurveTo(r * 0.5, -r * 0.2, 0, 0);
        ctx.fill();
        // Head
        ctx.beginPath();
        ctx.arc(0, -r * 0.5, r * 0.3, 0, Math.PI * 2);
        ctx.fill();
        // Horns
        ctx.beginPath();
        ctx.moveTo(-r * 0.15, -r * 0.7); ctx.lineTo(-r * 0.3, -r);
        ctx.moveTo(r * 0.15, -r * 0.7); ctx.lineTo(r * 0.3, -r);
        ctx.stroke();
        break;

      default:
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        break;
    }
  }
  renderPlayer() {
    const ctx = this.ctx;
    const p = this.player;
    const char = CHARACTERS.find(c => c.id === this.characterClass)!;
    const r = 16;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + r * 0.9, r * 0.8, r * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();

    const bob = p.isMoving ? Math.sin(p.walkAnim) * 3 : 0;
    const attackOffset = p.attackAnim > 0 ? Math.sin((0.2 - p.attackAnim) * Math.PI * 5) * 5 : 0;
    const flash = p.hitFlash > 0;

    ctx.save();
    ctx.translate(p.x, p.y + bob);

    // Draw character body based on class
    if (char.id === 'warrior') {
      this.drawWarrior(ctx, r, flash, p.facing, attackOffset);
    } else if (char.id === 'archer') {
      this.drawArcher(ctx, r, flash, p.facing, attackOffset, this.isCharging ? this.chargeTime : 0);
    } else if (char.id === 'mage') {
      this.drawMage(ctx, r, flash, p.facing, attackOffset);
    } else {
      this.drawAssassin(ctx, r, flash, p.facing, attackOffset);
    }

    ctx.restore();

    if (p.invuln > 0) {
      ctx.strokeStyle = `rgba(143,200,255,${p.invuln / 2})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r + 6, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  drawWarrior(ctx: CanvasRenderingContext2D, r: number, flash: boolean, facing: Vec2, attackOffset: number) {
    // Knight in blue-steel armor
    const armorColor = flash ? '#fff' : '#4a6a9a';
    const armorDark = flash ? '#fff' : '#3a5a8a';
    const armorLight = flash ? '#fff' : '#5a7aba';

    // Body (armored torso)
    ctx.fillStyle = armorColor;
    ctx.beginPath();
    ctx.ellipse(0, r * 0.1, r * 0.6, r * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = armorDark;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Shoulder pauldrons
    ctx.fillStyle = armorLight;
    ctx.beginPath();
    ctx.arc(-r * 0.5, -r * 0.2, r * 0.3, 0, Math.PI * 2);
    ctx.arc(r * 0.5, -r * 0.2, r * 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Head with helmet
    ctx.fillStyle = armorDark;
    ctx.beginPath();
    ctx.arc(0, -r * 0.6, r * 0.35, 0, Math.PI * 2);
    ctx.fill();
    // Helmet visor slit
    ctx.fillStyle = '#1a1a2a';
    ctx.fillRect(-r * 0.2, -r * 0.65, r * 0.4, r * 0.1);

    // Legs
    ctx.fillStyle = armorDark;
    ctx.fillRect(-r * 0.3, r * 0.5, r * 0.25, r * 0.4);
    ctx.fillRect(r * 0.05, r * 0.5, r * 0.25, r * 0.4);

    // Sword in right hand (facing direction)
    const angle = Math.atan2(facing.y, facing.x);
    ctx.save();
    ctx.rotate(angle);
    ctx.translate(r * 0.6 + attackOffset, 0);
    // Blade
    ctx.fillStyle = '#d0d0e0';
    ctx.fillRect(0, -r * 0.12, r * 1.2, r * 0.08);
    // Blade tip
    ctx.beginPath();
    ctx.moveTo(r * 1.2, -r * 0.12);
    ctx.lineTo(r * 1.4, 0);
    ctx.lineTo(r * 1.2, r * 0.08);
    ctx.fill();
    // Crossguard
    ctx.fillStyle = '#c0a040';
    ctx.fillRect(-r * 0.05, -r * 0.25, r * 0.1, r * 0.5);
    // Handle
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(-r * 0.3, -r * 0.06, r * 0.25, r * 0.12);
    // Pommel
    ctx.fillStyle = '#c0a040';
    ctx.beginPath();
    ctx.arc(-r * 0.35, 0, r * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

      // Shield in left hand (if equipped)
      if (this.profile.shieldEquipped && this.profile.shieldLevel > 0) {
        ctx.save();
        ctx.rotate(angle - Math.PI / 2);
        ctx.translate(r * 0.5, 0);
        // Round golden shield
        ctx.fillStyle = '#c0a040';
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#8a7020';
        ctx.lineWidth = 2;
        ctx.stroke();
        // Shield boss (center)
        ctx.fillStyle = '#e0c060';
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

  drawArcher(ctx: CanvasRenderingContext2D, r: number, flash: boolean, facing: Vec2, attackOffset: number, chargeTime: number) {
    // Elf in green clothes
    const greenColor = flash ? '#fff' : '#3c9b6e';
    const greenDark = flash ? '#fff' : '#2c7b5e';

    // Body
    ctx.fillStyle = greenColor;
    ctx.beginPath();
    ctx.ellipse(0, r * 0.1, r * 0.5, r * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = greenDark;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Head with pointed ears
    ctx.fillStyle = flash ? '#fff' : '#d0c0a0';
    ctx.beginPath();
    ctx.arc(0, -r * 0.5, r * 0.3, 0, Math.PI * 2);
    ctx.fill();
    // Ears
    ctx.beginPath();
    ctx.moveTo(-r * 0.3, -r * 0.5); ctx.lineTo(-r * 0.45, -r * 0.7); ctx.lineTo(-r * 0.2, -r * 0.55);
    ctx.moveTo(r * 0.3, -r * 0.5); ctx.lineTo(r * 0.45, -r * 0.7); ctx.lineTo(r * 0.2, -r * 0.55);
    ctx.fill();

    // Hood
    ctx.fillStyle = greenDark;
    ctx.beginPath();
    ctx.arc(0, -r * 0.55, r * 0.35, Math.PI, 0);
    ctx.fill();

    // Legs
    ctx.fillStyle = greenDark;
    ctx.fillRect(-r * 0.25, r * 0.5, r * 0.2, r * 0.4);
    ctx.fillRect(r * 0.05, r * 0.5, r * 0.2, r * 0.4);

    // Bow in hands (facing direction)
    const angle = Math.atan2(facing.y, facing.x);
    ctx.save();
    ctx.rotate(angle);
    ctx.translate(r * 0.4 + attackOffset, 0);
    // Wooden bow
    ctx.strokeStyle = '#6b4f2f';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.6, -Math.PI / 2.5, Math.PI / 2.5);
    ctx.stroke();
    // Bowstring — pulls back with charge time
    const stringPull = Math.min(chargeTime * 8, r * 0.5);
    ctx.strokeStyle = '#d0d0d0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const bowR = r * 0.6;
    const topY = Math.sin(-Math.PI / 2.5) * bowR;
    const botY = Math.sin(Math.PI / 2.5) * bowR;
    const handX = -stringPull;
    ctx.moveTo(Math.cos(-Math.PI / 2.5) * bowR, topY);
    ctx.lineTo(handX, 0);
    ctx.lineTo(Math.cos(Math.PI / 2.5) * bowR, botY);
    ctx.stroke();
    // Nocked arrow when charging
    if (chargeTime > 0.1) {
      ctx.strokeStyle = '#8b6f3f';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(handX, 0);
      ctx.lineTo(handX + r * 0.6, 0);
      ctx.stroke();
      // Arrowhead
      ctx.fillStyle = '#c0c0c0';
      ctx.beginPath();
      ctx.moveTo(handX + r * 0.6, 0);
      ctx.lineTo(handX + r * 0.7, -r * 0.08);
      ctx.lineTo(handX + r * 0.7, r * 0.08);
      ctx.fill();
    }
    ctx.restore();
  }

  drawMage(ctx: CanvasRenderingContext2D, r: number, flash: boolean, facing: Vec2, attackOffset: number) {
    // Old mage in purple robe
    const robeColor = flash ? '#fff' : '#5a3a8a';
    const robeDark = flash ? '#fff' : '#3a2a6a';

    // Robe (wider at bottom)
    ctx.fillStyle = robeColor;
    ctx.beginPath();
    ctx.moveTo(-r * 0.3, -r * 0.2);
    ctx.lineTo(r * 0.3, -r * 0.2);
    ctx.lineTo(r * 0.55, r * 0.8);
    ctx.lineTo(-r * 0.55, r * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = robeDark;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Head (old man)
    ctx.fillStyle = flash ? '#fff' : '#d0c8b0';
    ctx.beginPath();
    ctx.arc(0, -r * 0.5, r * 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Beard
    ctx.fillStyle = flash ? '#fff' : '#c0c0c0';
    ctx.beginPath();
    ctx.moveTo(-r * 0.2, -r * 0.3);
    ctx.quadraticCurveTo(0, r * 0.1, r * 0.2, -r * 0.3);
    ctx.fill();

    // Hood
    ctx.fillStyle = robeDark;
    ctx.beginPath();
    ctx.arc(0, -r * 0.55, r * 0.35, Math.PI, 0);
    ctx.fill();

    // Staff in right hand (facing direction)
    const angle = Math.atan2(facing.y, facing.x);
    ctx.save();
    ctx.rotate(angle);
    ctx.translate(r * 0.4 + attackOffset, 0);
    // Staff shaft
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(0, -r * 0.05, r * 1.3, r * 0.1);
    // Staff orb with pulsing glow
    const pulse = 0.5 + Math.sin(performance.now() / 200) * 0.5;
    ctx.shadowColor = '#5fa0ff';
    ctx.shadowBlur = 8 + pulse * 6;
    ctx.fillStyle = '#3c6ec8';
    ctx.beginPath();
    ctx.arc(r * 1.3, 0, r * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8fcfff';
    ctx.beginPath();
    ctx.arc(r * 1.3, 0, r * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  drawAssassin(ctx: CanvasRenderingContext2D, r: number, flash: boolean, facing: Vec2, attackOffset: number) {
    // Dark hooded figure
    const darkColor = flash ? '#fff' : '#1a1a2a';
    const cloakColor = flash ? '#fff' : '#2a2a3a';

    // Cloak
    ctx.fillStyle = cloakColor;
    ctx.beginPath();
    ctx.moveTo(-r * 0.4, -r * 0.3);
    ctx.lineTo(r * 0.4, -r * 0.3);
    ctx.lineTo(r * 0.5, r * 0.7);
    ctx.lineTo(-r * 0.5, r * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = darkColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Head (dark, hidden in hood)
    ctx.fillStyle = darkColor;
    ctx.beginPath();
    ctx.arc(0, -r * 0.5, r * 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Glowing eyes under hood
    ctx.fillStyle = '#df3f3f';
    ctx.beginPath();
    ctx.arc(-r * 0.1, -r * 0.55, r * 0.06, 0, Math.PI * 2);
    ctx.arc(r * 0.1, -r * 0.55, r * 0.06, 0, Math.PI * 2);
    ctx.fill();

    // Hood
    ctx.fillStyle = darkColor;
    ctx.beginPath();
    ctx.arc(0, -r * 0.55, r * 0.4, Math.PI, 0);
    ctx.fill();

    // Chain in right hand, Sickle in left hand
    const angle = Math.atan2(facing.y, facing.x);
    ctx.save();
    ctx.rotate(angle);
    ctx.translate(r * 0.4 + attackOffset, 0);

    // Chain (right side, +y offset)
    ctx.strokeStyle = '#8a8a9a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, r * 0.2);
    ctx.quadraticCurveTo(r * 0.4, r * 0.5, r * 0.8, r * 0.2);
    ctx.stroke();
    // Chain tip
    ctx.fillStyle = '#c0c0c0';
    ctx.beginPath();
    ctx.arc(r * 0.8, r * 0.2, r * 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Sickle (left side, -y offset)
    ctx.strokeStyle = '#9b3c3c';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.2);
    ctx.quadraticCurveTo(r * 0.5, -r * 0.6, r * 0.7, -r * 0.2);
    ctx.stroke();
    // Sickle blade
    ctx.fillStyle = '#c0a0a0';
    ctx.beginPath();
    ctx.moveTo(r * 0.7, -r * 0.3);
    ctx.lineTo(r * 0.8, -r * 0.1);
    ctx.lineTo(r * 0.6, -r * 0.15);
    ctx.fill();

    ctx.restore();
  }

  setPaused(paused: boolean) {
    this.paused = paused;
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }
}

