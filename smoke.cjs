// ХЕДЛЕС-СМОУК: гоняет НАСТОЯЩИЙ CombatEngine в Node с подставной канвой.
// Зачем. Картинку из Node не увидеть, но «чёрный экран» и большинство рантайм-
// поломок видно по цифрам. Проверок пять:
//   1) ни одного исключения в update()/render() за тысячи кадров;
//   2) канва реально рисуется КАЖДЫЙ кадр (пустой кадр = чёрный экран);
//   3) save/restore сбалансированы в конце кадра (разбаланс = трансформации
//      копятся, и спрайты улетают за экран);
//   4) в канву не попадает NaN/Infinity (типичная причина «спрайта не видно»);
//   5) проходят боссы, сигнатурные атаки, лужи, зелья, смерть и возрождение.
// Запуск: npm run smoke   (TypeScript компилируется в .smoke автоматически)

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROOT = __dirname;
const OUT = path.join(ROOT, '.smoke');
const ENTRY = path.join(OUT, 'combatEngine.js');

/** Самый свежий .ts в src (с подкаталогами) — по нему решаем, надо ли компилировать. */
function newestSource(dir) {
  let max = 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) max = Math.max(max, newestSource(p));
    else if (e.name.endsWith('.ts') || e.name.endsWith('.tsx')) max = Math.max(max, fs.statSync(p).mtimeMs);
  }
  return max;
}

if (!fs.existsSync(ENTRY) || newestSource(path.join(ROOT, 'src')) > fs.statSync(ENTRY).mtimeMs) {
  process.stdout.write('· компиляция src → .smoke … ');
  cp.execSync(
    'npx tsc --module commonjs --target es2020 --moduleResolution node --esModuleInterop ' +
    '--skipLibCheck --outDir .smoke src/combatEngine.ts',
    { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'] }
  );
  console.log('готово');
}
// package.json в проекте объявлен как ESM, а компилят TS в CommonJS — объясняем
// это Node прямо в папке сборки (иначе require падает на первом же файле).
fs.writeFileSync(path.join(OUT, 'package.json'), '{ "type": "commonjs" }\n');

// === МЕТРИКИ ================================================================
const M = {
  frames: 0, draws: 0, images: 0, texts: 0,
  emptyFrames: 0, maxDepth: 0, unbalancedFrames: 0,
  nan: 0, nanSamples: [], unknownMethods: new Set(), unknownWhere: new Map(),
  guardErrors: 0, guardSamples: [], thrown: [],
  waves: 0, bossWaves: 0, spawns: 0, kills: 0, deaths: 0,
  bossesSeen: new Set(), signatures: new Set(), monstersSeen: new Set(),
  hazards: 0, captures: 0,
  // НОВОЕ: покрытие систем «снаряды» и «атаки босса».
  casts: 0, castAttacks: new Set(), castForms: new Set(), arrowKinds: new Set(),
  arrowSpawns: 0, telegraphFrames: 0, maxCasts: 0,
};


// === ЗАГЛУШКА 2D-КОНТЕКСТА =================================================
// Методов у канвы десятки, поэтому список закрытый: всё неизвестное попадает в
// unknownMethods (сигнал, что движок зовёт то, чего в браузере нет) и игнорируется.
// Числовые аргументы проверяются на NaN/Infinity.
const DRAW = new Set(['fillRect', 'strokeRect', 'fill', 'stroke', 'drawImage', 'fillText', 'strokeText', 'putImageData']);

function makeCtx(isMain, label) {
  const props = {
    fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, lineCap: 'butt', lineJoin: 'miter',
    miterLimit: 10, lineDashOffset: 0, globalAlpha: 1, globalCompositeOperation: 'source-over',
    font: '10px sans-serif', textAlign: 'start', textBaseline: 'alphabetic', direction: 'inherit',
    shadowBlur: 0, shadowColor: 'rgba(0,0,0,0)', shadowOffsetX: 0, shadowOffsetY: 0,
    filter: 'none', imageSmoothingEnabled: true, imageSmoothingQuality: 'low',
  };
  let depth = 0;
  let frameDraws = 0;

  /** Учёт аргументов: NaN/Infinity в координатах = объект не рисуется (белое пятно/пропавший спрайт). */
  const note = (key, args) => {
    for (let i = 0; i < args.length; i++) {
      const a = args[i];
      if (typeof a === 'number' && !Number.isFinite(a)) {
        M.nan++;
        if (M.nanSamples.length < 6) {
          const where = (new Error().stack || '').split('\n').slice(3, 6).join(' <- ').trim();
          M.nanSamples.push(`${key}(arg#${i}=${a}) ${where}`);
        }
      }
    }
    if (DRAW.has(key)) { M.draws++; if (isMain) frameDraws++; }
    if (key === 'drawImage' && isMain) M.images++;
    if (key === 'fillText' || key === 'strokeText') M.texts++;
  };
  const drawFn = key => function () { note(key, Array.prototype.slice.call(arguments)); };

  const target = Object.assign({}, props, {
    save() { depth++; if (depth > M.maxDepth) M.maxDepth = depth; },
    restore() { depth--; if (depth < 0) depth = 0; },
    canvas: null,
    getContext() { return ctxProxy; },
    // Рисующие методы объявлены явно: они «доказательство кадра» (кадр без них =
    // чёрный экран), и их отсутствие в этом списке — сигнал об опечатке в движке.
    fillRect: drawFn('fillRect'),
    strokeRect: drawFn('strokeRect'),
    fill: drawFn('fill'),
    stroke: drawFn('stroke'),
    drawImage: drawFn('drawImage'),
    fillText: drawFn('fillText'),
    strokeText: drawFn('strokeText'),
    putImageData: drawFn('putImageData'),
    beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, arc() {}, arcTo() {}, ellipse() {},
    rect() {}, roundRect() {}, quadraticCurveTo() {}, bezierCurveTo() {}, clip() {},
    translate() {}, rotate() {}, scale() {}, transform() {}, setTransform() {}, resetTransform() {},
    clearRect() {},
    setLineDash() {}, getLineDash() { return []; },
    createLinearGradient() { return { addColorStop() {} }; },
    createRadialGradient() { return { addColorStop() {} }; },
    createConicGradient() { return { addColorStop() {} }; },
    createPattern() { return null; },
    measureText(t) { return { width: 6 * String(t == null ? '' : t).length }; },
    createImageData(w, h) {
      const ww = Math.max(1, Math.floor(w) || 1), hh = Math.max(1, Math.floor(h) || 1);
      return { width: ww, height: hh, data: new Uint8ClampedArray(ww * hh * 4) };
    },
    getImageData(x, y, w, h) {
      const ww = Math.max(1, Math.floor(w) || 1), hh = Math.max(1, Math.floor(h) || 1);
      return { width: ww, height: hh, data: new Uint8ClampedArray(ww * hh * 4) };
    },
    isPointInPath() { return false; },
    isPointInStroke() { return false; },
    /** Вызывается драйвером кадров в конце каждого кадра. */
    __endFrame() {
      M.frames++;
      if (frameDraws === 0) M.emptyFrames++;
      if (depth !== 0) M.unbalancedFrames++;
      frameDraws = 0;
      depth = 0;
    },
  });

  // Ловушка строга по замыслу: всё, что движок зовёт на канве и чего нет в
  // списке выше, попадает сюда и записывается в unknownMethods. Настоящие методы
  // Canvas2D объявлены выше, поэтому сюда ведут только опечатки (ctx.fillRct)
  // и обращения к тому, чего в браузере тоже не было бы.
  const cache = {};
  const ctxProxy = new Proxy(target, {
    get(t, key) {
      if (key in t) return t[key];
      if (typeof key !== 'string') return undefined;
      if (/^(webkit|moz|ms|o)[A-Z]/.test(key)) return undefined; // префиксные свойства: их может не быть
      const w = (label || '?') + '·' + key;
      M.unknownMethods.add(key);
      M.unknownWhere.set(w, (M.unknownWhere.get(w) || 0) + 1);
      if (!cache[key]) cache[key] = drawFn(key);
      return cache[key];
    },
    set(t, key, value) { t[key] = value; return true; },
  });
  return ctxProxy;
}

function makeCanvas(w, h, label) {
  const ctx = makeCtx(true, label || 'main');
  const c = {
    width: w, height: h, style: {}, nodeName: 'CANVAS',
    getContext: () => ctx,
    getBoundingClientRect: () => ({ width: w, height: h, left: 0, top: 0, right: w, bottom: h, x: 0, y: 0 }),
    addEventListener() {}, removeEventListener() {}, setAttribute() {}, removeAttribute() {},
    appendChild() {}, toDataURL: () => 'data:,', focus() {},
  };
  ctx.canvas = c;
  return { canvas: c, ctx };
}

// === ЗАГЛУШКА BROWSER-ОКРУЖЕНИЯ ============================================
let clock = 0;
const el = () => ({
  style: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
  appendChild() {}, removeChild() {}, insertBefore() {}, addEventListener() {}, removeEventListener() {},
  setAttribute() {}, dataset: {}, innerHTML: '', textContent: '', children: [],
});
global.window = {
  devicePixelRatio: 1, innerWidth: 1280, innerHeight: 720,
  addEventListener() {}, removeEventListener() {}, location: { href: 'http://localhost/', search: '' },
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
};
global.document = {
  createElement: (tag) => (tag === 'canvas'
    ? makeCanvas(256, 256, 'dom').canvas
    : Object.assign(el(), { tagName: String(tag).toUpperCase() })),
  body: Object.assign(el(), { appendChild() {} }),
  documentElement: el(), head: el(),
  getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
  addEventListener() {}, removeEventListener() {},
  fonts: { ready: Promise.resolve(), load: () => Promise.resolve(), check: () => true },
  visibilityState: 'visible',
};
// OffscreenCanvas: движок пекёт в нём спрайты (createImageData + putImageData) и
// забирает результат через transferToImageBitmap. В Node этого нет — имитируем,
// считая вызовы, но не смешивая их с рисованием на главный холст.
global.OffscreenCanvas = class FakeOffscreenCanvas {
  constructor(w, h) {
    this.width = Math.max(1, Math.floor(w) || 1);
    this.height = Math.max(1, Math.floor(h) || 1);
    this._ctx = makeCtx(false, 'off');
    this._ctx.canvas = this;
  }
  getContext() { return this._ctx; }
  transferToImageBitmap() { return { width: this.width, height: this.height, close() {} }; }
  convertToBlob() { return Promise.resolve(null); }
};
global.ImageBitmap = class FakeImageBitmap {};
global.Image = class FakeImage {
  constructor() { this.width = 1; this.height = 1; this.complete = false; }
  set src(v) {
    this._src = v;
    // PNG из public/monsters опциональны и их нет — честно отвечаем 404, чтобы
    // движок шёл процедурной веткой рисования (а не завис в «loading» навечно).
    setTimeout(() => { if (this.onerror) this.onerror(new Error('404 ' + v)); }, 0);
  }
  get src() { return this._src; }
};
global.localStorage = {
  _m: new Map(),
  getItem(k) { return this._m.has(k) ? this._m.get(k) : null; },
  setItem(k, v) { this._m.set(k, String(v)); },
  removeItem(k) { this._m.delete(k); },
  clear() { this._m.clear(); },
};
global.performance = { now: () => clock };
global.requestAnimationFrame = () => 1;   // кадры гоняем руками, через engine.loop()
global.cancelAnimationFrame = () => {};
global.self = global;
global.navigator = { userAgent: 'node-smoke', maxTouchPoints: 0 };
global.AudioContext = undefined;
global.webkitAudioContext = undefined;

// Звук в Node не нужен: глушим методы AudioEngine, чтобы тест ловил только
// настоящие игровые ошибки, а не отсутствие Web Audio API.
const { audio } = require(path.join(OUT, 'audio.js'));
for (const k of Object.getOwnPropertyNames(Object.getPrototypeOf(audio))) {
  if (k !== 'constructor' && typeof audio[k] === 'function') audio[k] = () => {};
}

const realError = console.error;
console.error = (...a) => {
  M.guardErrors++;
  if (M.guardSamples.length < 4) M.guardSamples.push(a.map(x => (x && x.stack) || String(x)).join(' '));
};


// === САМОПРОВЕРКА ХАРНЕСА (`node smoke.cjs --selftest`) ======================
// «OK» над пустой проверкой ничего не значит. Здесь на канву наводятся четыре
// заведомо сломанных случая — ровно те, что дают белый/чёрный экран в игре, —
// и проверяется, что детекторы их заметили.
if (process.argv.includes('--selftest')) {
  const t = makeCtx(true, 'test');
  t.fillRect(0, 0, 10, 10); t.__endFrame();      // кадр 1: нормальный
  t.__endFrame();                                 // кадр 2: ни одного вызова = чёрный экран
  t.save(); t.save(); t.fillRect(0, 0, 5, 5); t.__endFrame(); // кадр 3: save() без restore()
  t.fillRect(0, 0, NaN, 10); t.__endFrame();      // кадр 4: NaN в координате
  t.fillRect(0, 0, 4, 4); t.fillRct(0, 0, 10, 10); t.__endFrame(); // кадр 5: метода Canvas2D с таким именем нет

  const checks = [
    ['пустой кадр замечен', M.emptyFrames === 1],
    ['утечка save()/restore() замечена', M.unbalancedFrames === 1],
    ['NaN в аргументе замечен', M.nan === 1],
    ['опечатка в методе канвы замечена', M.unknownMethods.has('fillRct')],
    ['нормальный кадр не помечен как битый', M.frames === 5 && M.draws >= 3],
  ];
  console.log('=== САМОПРОВЕРКА ДЕТЕКТОРОВ ===');
  for (const [name, pass] of checks) console.log((pass ? '  ok   ' : '  FAIL ') + name);
  const ok = checks.every(c => c[1]);
  console.log(ok ? 'детекторы работают' : 'ДЕТЕКТОРЫ НЕ РАБОТАЮТ — тесту нельзя верить');
  process.exit(ok ? 0 : 3);
}

// === ДРАЙВЕР БОЯ ===========================================================
const g = require(path.join(OUT, 'gameData.js'));
const { CombatEngine } = require(path.join(OUT, 'combatEngine.js'));

function makeProfile(cls, dungeonIds, mode, platform, weak) {
  const p = g.createDefaultProfile();
  const char = g.CHARACTERS.find(c => c.id === cls);
  p.equippedCharacter = cls;
  p.equippedDungeons = dungeonIds;
  p.unlockedDungeons = g.DUNGEONS.map(d => d.id);
  p.ownedCharacters = g.CHARACTERS.map(c => c.id);
  p.gameMode = mode;
  p.platform = platform;
  p.language = 'ru';
  p.level = weak ? 1 : 20;
  p.gold = 99999;
  p.totalWavesCleared = 30;
  p.unlockedSkills[cls] = weak ? [] : (char.skills || []).map(s => s.id);
  p.ownedPotions = weak ? { health: 0, stamina: 0, revival: 0 } : { health: 5, stamina: 5, revival: 2 };
  // Таланты = сила героя. Максимальные, чтобы забег дожил до дальних волн;
  // в сценарии смерти наоборот нулевые — иначе волна его не убьёт и ветка
  // onPlayerDeath/retryWave не проверится.
  for (const id of p.ownedCharacters) p.talentLevels[id] = weak ? { damage: 0, health: 0 } : { damage: 10, health: 10 };
  return p;
}

/**
 * Прогон одного забега. Боссов держим живыми ~8 секунд (нужны их способности,
 * сигнатурные атаки и лужи), остальное зачищаем, чтобы быстро пройти все волны.
 */
function runFight(o) {
  const tag = `${o.cls}/${o.mode}/${o.platform}`;
  const { canvas, ctx } = makeCanvas(1280, 720, 'MAIN');
  const st = { deaths: 0, retries: 0, waves: 0, maxPuddles: 0, maxEnemies: 0, frames: 0, endWave: 0 };
  const eng = new CombatEngine(canvas, makeProfile(o.cls, o.dungeons, o.mode, o.platform, o.weak), {
    onWaveCleared() {}, onPlayerDeath() { st.deaths++; M.deaths++; }, onBossCaptured() { M.captures++; },
    onProfileUpdate() {}, onPotionUsed() {}, onPotionCooldownUpdate() {}, onPotionBlocked() {},
    onWaveResult() {}, onBossHpChange() {},
  });

  // Счётчики спавнов/волн/сигнатур — обёртки над методами движка (внутри ничего не меняем).
  const origSpawn = eng.spawnEnemy;
  eng.spawnEnemy = function (def, ...rest) {
    M.spawns++;
    (def.isBoss ? M.bossesSeen : M.monstersSeen).add(def.id);
    return origSpawn.call(this, def, ...rest);
  };
  const origWave = eng.startNextWave;
  eng.startNextWave = function () {
    const r = origWave.call(this);
    st.waves++; M.waves++;
    if (this.currentWave % 5 === 0) M.bossWaves++;
    return r;
  };
  const origSig = eng.startSignature;
  eng.startSignature = function (e) { M.signatures.add(this.enemySignature(e)); return origSig.call(this, e); };
  // НОВОЕ: считаем замахи босса (startBossCast) и виды снарядов, чтобы
  // «телеграф → удар» и «стрела, а не шар» реально покрывались смоуком.
  const origCast = eng.startBossCast;
  eng.startBossCast = function (e) {
    M.casts++;
    const c = this.casts[this.casts.length - 1];
    if (c) { M.castAttacks.add(c.attack.id); M.castForms.add(c.attack.form); }
    return origCast.call(this, e);
  };
  const origProj = eng.spawnProjectile;
  eng.spawnProjectile = function (x, y, dir, dmg, color, fromPlayer, isArrow, isMagic, isChain, element, kind) {
    const r = origProj.call(this, x, y, dir, dmg, color, fromPlayer, isArrow, isMagic, isChain, element, kind);
    const pr = this.projectiles[this.projectiles.length - 1];
    if (pr) { M.arrowKinds.add(pr.kind); M.arrowSpawns++; }
    return r;
  };

  eng.startWave = o.startWave || 1;
  try { eng.start(); } catch (e) {
    M.thrown.push(tag + ' @старт\n' + ((e && e.stack) || e));
    return { tag, st, o };
  }

  let frame = 0, waveSeen = eng.currentWave, waveFrame = 0, bossFrame = -1, retries = 0;
  const maxFrames = o.maxFrames || 9000;
  while (frame < maxFrames && eng.currentWave <= o.targetWave) {
    const t = frame / 60;
    if (o.passive) {
      // Сценарий смерти: герой стоит и не бьёт — его должны убить (ветка
      // onPlayerDeath → retryWave/зелье возрождения тоже обязана работать).
      eng.mobileMove = { x: 0, y: 0 };
      eng.mouseDown = false;
      eng.rightMouseDown = false;
    } else if (o.platform === 'mobile') {
      eng.mobileMove = { x: Math.cos(t), y: Math.sin(t * 1.7) };
      eng.mobileMainAttack = true;
      eng.mobileUniqueAttack = frame % 130 === 0;
    } else {
      eng.keys['KeyD'] = Math.cos(t) > 0; eng.keys['KeyA'] = Math.cos(t) <= 0;
      eng.keys['KeyS'] = Math.sin(t) > 0; eng.keys['KeyW'] = Math.sin(t) <= 0;
      const near = eng.enemies.filter(e => !e.isDying)[0];
      eng.mousePos = near ? { x: near.x, y: near.y } : { x: eng.width / 2, y: 40 };
      eng.mouseDown = true;
      eng.rightMouseDown = frame % 130 === 0;
    }
    try {
      if (frame % 400 === 0) eng.useHealthPotion();
      if (frame % 400 === 20) eng.useStaminaPotion();
      if (frame % 900 === 40) eng.useRevivalPotion();
    } catch (e) { M.thrown.push(tag + ' @зелья\n' + ((e && e.stack) || e)); break; }

    clock += 16.7;
    try { eng.loop(); } catch (e) { M.thrown.push(tag + ' @кадр ' + frame + '\n' + ((e && e.stack) || e)); break; }
    ctx.__endFrame();
    frame++;

    if (eng.puddles.length > st.maxPuddles) st.maxPuddles = eng.puddles.length;
    if (eng.enemies.length > st.maxEnemies) st.maxEnemies = eng.enemies.length;
    // НОВОЕ: сколько кадров босс ПРОВОДИЛ в замахе (телеграф виден игроку)
    // и сколько замахов висело одновременно (не должно накапливаться).
    if (eng.casts.length) M.telegraphFrames++;
    if (eng.casts.length > M.maxCasts) M.maxCasts = eng.casts.length;
    if (eng.waveTransitionTimer > 0.05) eng.waveTransitionTimer = 0.05;   // заставку волны режем

    if (eng.currentWave !== waveSeen) { waveSeen = eng.currentWave; waveFrame = frame; bossFrame = -1; }
    const boss = eng.enemies.find(e => e.isBoss && !e.isDying);
    if (boss && bossFrame < 0) bossFrame = frame;
    if (boss) { if (frame - bossFrame > 480 && !o.passive) for (const e of eng.enemies) if (e.isBoss) e.health = 0; }
    else if (frame - waveFrame > 260 && !o.passive) for (const e of eng.enemies) e.health = 0;

    if (eng.gameOver) {
      if (retries >= (o.maxRetries === undefined ? 3 : o.maxRetries)) break;
      retries++; st.retries++;
      try { eng.retryWave(); } catch (e) { M.thrown.push(tag + ' @retryWave\n' + ((e && e.stack) || e)); break; }
    } else if (eng.waveResult) {
      if (eng.currentWave >= o.targetWave) break;
      try { eng.continueToNextWave(); } catch (e) { M.thrown.push(tag + ' @continueToNextWave\n' + ((e && e.stack) || e)); break; }
    }
  }
  eng.stop();
  st.frames = frame;
  st.endWave = eng.currentWave;
  return { tag, st, o };
}

// === СЦЕНАРИИ ==============================================================
const ALL_DUNGEONS = g.DUNGEONS.map(d => d.id);
const SCENARIOS = [
  { cls: 'warrior', dungeons: ['whispering_grove'], mode: 'easy', platform: 'pc', targetWave: 11 },
  { cls: 'archer', dungeons: ['necropolis', 'sunken_fleet'], mode: 'easy', platform: 'pc', targetWave: 6 },
  { cls: 'mage', dungeons: ['idol_jungle', 'sky_citadel'], mode: 'hard', platform: 'pc', targetWave: 6 },
  { cls: 'assassin', dungeons: ['gnomish_ruins', 'idol_jungle'], mode: 'easy', platform: 'mobile', targetWave: 6 },
  { cls: 'warrior', dungeons: ALL_DUNGEONS, mode: 'hard', platform: 'pc', targetWave: 5 },
  // Отдельный прогон «герой стоит и не бьётся»: проверяет ветку смерти, отката
  // волны (retryWave) и зелья возрождения — на обычном забеге она не достигается.
  { cls: 'mage', dungeons: ['necropolis'], mode: 'hard', platform: 'pc', targetWave: 20, startWave: 20, passive: true, weak: true, maxRetries: 1, maxFrames: 2500 },
];

// Проверка самих сценариев: подземелья, которых нет в DUNGEONS, движок молча
// превращает в пустую волну (без врагов и боссов) — тест «прошёл», ничего не
// проверив. Поэтому неизвестный id = падение харнесса, а не тихий прогон.
const KNOWN_DUNGEONS = new Set(g.DUNGEONS.map(d => d.id));
const badDungeons = [...new Set(SCENARIOS.flatMap(s => s.dungeons))].filter(id => !KNOWN_DUNGEONS.has(id));
if (badDungeons.length) {
  console.log('!! в сценариях неизвестные подземелья:', badDungeons.join(', '), '— правь SCENARIOS');
  process.exit(2);
}

console.log('=== ХЕДЛЕС-СМОУК БОЯ: настоящий CombatEngine + подставная канва ===\n');
console.log('класс/режим/устройство      кадры  волны  финал  смерт. повт. врагов лужи  пуст.кадров');
const emptyRuns = [];
for (const s of SCENARIOS) {
  const before = M.emptyFrames;
  const r = runFight(s);
  const empty = M.emptyFrames - before;
  if (r.st.maxEnemies === 0) emptyRuns.push(r.tag);
  console.log(
    r.tag.padEnd(26), String(r.st.frames).padStart(5), String(r.st.waves).padStart(6),
    String(r.st.endWave).padStart(6), String(r.st.deaths).padStart(6), String(r.st.retries).padStart(5),
    String(r.st.maxEnemies).padStart(6), String(r.st.maxPuddles).padStart(5), String(empty).padStart(12)
  );
}

// === ВЕРДИКТ ==============================================================
// Всё, что движок зовёт на канве, объявлено в makeCtx настоящими методами
// Canvas2D. Любое имя, пойманное ловушкой прокси, — значит в браузере такой
// вызов упал бы или молча ничего не нарисовал (например опечатка ctx.fillRct).
const suspicious = [...M.unknownMethods];

const fatal = [];
if (M.thrown.length) fatal.push(`исключений из loop(): ${M.thrown.length}`);
if (M.guardErrors) fatal.push(`ошибок внутри safeguards движка (в игре = красный экран): ${M.guardErrors}`);
if (M.emptyFrames) fatal.push(`кадров вообще без рисования (чёрный экран): ${M.emptyFrames}`);
if (M.unbalancedFrames) fatal.push(`кадров с незакрытым save()/restore(): ${M.unbalancedFrames}`);
if (M.nan) fatal.push(`NaN/Infinity в вызовах канвы: ${M.nan}`);
if (suspicious.length) fatal.push(`подозрительных вызовов канвы: ${suspicious.join(', ')}`);
if (emptyRuns.length) fatal.push(`прогонов без единого врага (сценарий ничего не проверил): ${emptyRuns.join(', ')}`);
if (M.bossWaves === 0) fatal.push('ни одной боссовой волны');
if (M.deaths === 0) fatal.push('смерть героя не наступила ни в одном прогоне — ветка onPlayerDeath/retryWave не проверена');
if (M.signatures.size === 0) fatal.push('ни одной сигнатурной атаки босса');
// НОВОЕ: атаки босса с телеграфом и виды снарядов — обязательное покрытие.
if (M.casts === 0) fatal.push('ни одного замаха босса (startBossCast не вызывался)');
if (M.telegraphFrames === 0) fatal.push('телеграф атаки ни разу не был виден в кадре');
if (M.castAttacks.size < 3) fatal.push('боссами использовано меньше 3 разных атак: ' + [...M.castAttacks].join(','));
if (M.arrowKinds.size < 3) fatal.push('снаряды менее 3 видов — «стрелы вместо шаров» не работают: ' + [...M.arrowKinds].join(','));
if (M.maxCasts > 8) fatal.push('замахи накапливаются (' + M.maxCasts + ' одновременно) — босс не успевает их отыгрывать');

console.log('\n=== ПОКРЫТИЕ ===');
console.log('кадров прогнано :', M.frames, '| вызовов канвы :', M.draws, '| ср. рисующих вызовов на кадр:',
  M.frames ? (M.draws / M.frames).toFixed(0) : '—');
console.log('спрайтов (drawImage):', M.images, '| текста (fillText):', M.texts);
console.log('волн запущено   :', M.waves, '| из них боссовых:', M.bossWaves);
console.log('тварей заспавнено:', M.spawns, '| видов монстров:', M.monstersSeen.size, '| боссов:', M.bossesSeen.size);
console.log('сигнатурных атак:', M.signatures.size, M.signatures.size ? '(' + [...M.signatures].join(', ') + ')' : '');
console.log('замахов босса    :', M.casts, '| атак:', M.castAttacks.size, M.castAttacks.size ? '(' + [...M.castAttacks].join(', ') + ')' : '');
console.log('формы атак       :', [...M.castForms].join(', '), '| кадров с телеграфом:', M.telegraphFrames, '| макс. замахов сразу:', M.maxCasts);
console.log('снарядов выпущено:', M.arrowSpawns, '| видов:', M.arrowKinds.size, '(' + [...M.arrowKinds].join(', ') + ')');
console.log('смертей героя   :', M.deaths, '| возрождений/захватов босса:', M.captures);
console.log('глубина стека save():', M.maxDepth, '(в конце кадра всегда 0 — см. пустые кадры выше)');

if (M.thrown.length) {
  console.log('\n!! ИСКЛЮЧЕНИЯ:');
  M.thrown.slice(0, 4).forEach(s => console.log(s));
}
if (M.guardSamples.length) {
  console.log('\n!! ОШИБКИ, ПОЙМАНЫЕ ДВИЖКОМ (в игре это красный экран вместо боя):');
  M.guardSamples.forEach(s => console.log(s.split('\n').slice(0, 6).join('\n')));
}
if (M.nanSamples.length) {
  console.log('\n!! NaN/Infinity УХОДЯТ В КАНВУ (спрайт/линия с таким координатой не рисуется):');
  M.nanSamples.forEach(s => console.log('   ' + s));
}

if (suspicious.length) {
  console.log('\n!! ВЫЗВАННЫЕ, НО НЕ ОБЪЯВЛЕННЫЕ В Canvas2D (кто и сколько раз):');
  [...M.unknownWhere.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)
    .forEach(([k, v]) => console.log('   ' + k.padEnd(30) + '×' + v));
}

console.error = realError;
console.log('\nитог:', fatal.length ? 'ПРОВАЛ — ' + fatal.join(' | ') : 'OK — ни падений, ни пустых кадров, ни NaN');
process.exit(fatal.length ? 1 : 0);


