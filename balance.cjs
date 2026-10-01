// ДИАГНОСТИКА ШАГА: реально ли лапы двигаются, и двигаются ли они ВРАЗНОБОЙ?
// Почему метрика именно такая. Раньше здесь мерился ВЕРХ лап ниже таза (какая
// сторона «поднята выше»). У гуманоида под тазом идёт юбка/корпус на всю ширину,
// поэтому метрика выдавала d=[0,0,0,...] и на живом шаге — диагностика врала
// («ВОРОЧАНИЕ» у всех форм), и по ней нельзя было понять, работает ли новый
// механизм. Теперь три независимых замера:
//   1) ЛАПЫ В КАДРЕ (lastLimbCount из monsterArt): гуманоид 2, волк 4, паук 8,
//      голем 1 → у монолитной фигуры пофазной артикуляции НЕТ (и это верно:
//      сдвиг широкого блока силуэт не меняет, его движение — присед корпуса);
//   2) ЛИНИЯ ОПОРЫ по сторонам: нижний пиксель слева и справа в каждом кадре —
//      у дву- и четвероногих видно, какая сторона стоит, а какая поднята;
//   3) ДВИЖЕНИЕ: сколько пикселей низа меняется между ПРОТИВОФАЗАМИ (0.25 и
//      0.75 цикла) — прямая проверка, что кадры не повторяют друг друга.
const ga = require('./out/monsterArt.js');
/** Линия опоры (нижний пиксель) слева/справа + сколько пикселей внизу таза. */
function sideStats(art, hipY) {
  const N = ga.ART_N, cx = N / 2, hipPx = Math.floor(hipY * N);
  let fL = -1, fR = -1, lower = 0;
  for (let y = hipPx; y < N; y++) for (let x = 0; x < N; x++) {
    if (!art[y][x]) continue;
    lower++;
    if (x < cx) { if (y > fL) fL = y; } else if (y > fR) fR = y;
  }
  return { fL, fR, lower };
}
const WALK = ['walkA', 'walkB', 'walkC', 'walkD', 'walkE', 'walkF', 'walkG', 'walkH'];
const RIGS = { humanoid: 0.64, wolf: 0.60, golem: 0.62, skeleton: 0.64, imp: 0.64, gargoyle: 0.62, spider: 0.52, beetle: 0.58 };
// Ожидаемое число лап выводится из силуэта (контрольная строка под тазом), а не
// из «сколько лап у зверя по идее»: в нейтральном спрайте дальняя лапа пары
// перекрыта ближней, поэтому волк и голем дают по 2 заливки, а у каменной
// гаргульи и жука лапы не разделены вовсе (0) — там артикуляции и не будет.
// Проверяем то, что код действительно должен находить (замер в комментарии
// findLimbs), а движение кадров — отдельным замером ниже.
const SHAPES = [
  ['humanoid', 'walk', 'warrior', 2], ['wolf', 'hop', 'wolf', 2], ['golem', 'stomp', 'golem', 2],
  ['skeleton', 'slink', 'skeleton', 2], ['imp', 'hop', 'imp', 3], ['gargoyle', 'glide', 'gargoyle', 0],
  ['spider', 'crawl', 'spider', 8], ['beetle', 'crawl', 'beetle', 0],
];
console.log('=== ДИАГНОСТИКА ШАГА: лапы по отдельности и реальное движение кадров ===\n');
for (const [shape, gait, name, wantLimbs] of SHAPES) {
  const hip = RIGS[shape];
  const arts = WALK.map(v => ga.buildMonsterArt('diag_' + shape, shape, false,
    { nameRu: name, nameEn: name, element: 'fire', traits: [], gait, attack: 'weaponSweep' }, v));
  const limbs = ga.lastLimbCount();
  const st = arts.map(a => sideStats(a, hip));
  const footL = st.map(s => s.fL), footR = st.map(s => s.fR);
  const lower = Math.max(...st.map(s => s.lower));
  const stanceVar = Math.max(Math.max(...footL) - Math.min(...footL), Math.max(...footR) - Math.min(...footR));
  // Противофазы цикла: 0.25 (walkC) и 0.75 (walkG).
  const A = arts[2], B = arts[6];
  let diff = 0;
  for (let y = Math.floor(hip * ga.ART_N); y < ga.ART_N; y++) for (let x = 0; x < ga.ART_N; x++) if (A[y][x] !== B[y][x]) diff++;
  const movePct = lower ? (diff / lower) * 100 : 0;
  console.log(
    `${name.padEnd(9)} лап=${String(limbs).padStart(2)} | опора L=[${footL.join(',')}] R=[${footR.join(',')}] ход=${stanceVar}px`,
    `| кадры 0.25↔0.75: ${diff}px = ${movePct.toFixed(1)}%`
  );
  console.log(`   ${limbs >= 2
    ? `ПОЛАПНО: ${limbs} лап(ы) двигаются по отдельности`
    : 'МОНОЛИТ: лап в силуэте нет — движение даёт присед корпуса (так и задумано)'}${movePct < 3 ? '   ⚠ КАДРЫ ПОЧТИ СОВПАДАЮТ — поза умерла!' : ''}`);
  if (limbs !== wantLimbs) console.log(`   ⚠ лап найдено ${limbs}, а ожидалось ${wantLimbs} — сверь с комментарием findLimbs`);
}

const g = require('./out/gameData.js');
const CHAR = g.CHARACTERS.find(c => c.id === 'warrior');

function playerStats(wave, talentLvl, level) {
  const dmg = CHAR.baseDamage * (1 + (level - 1) * g.PLAYER_DAMAGE_PER_LEVEL) * (1 + talentLvl * g.TALENT_BONUS_PER_LEVEL);
  const hp = CHAR.baseHealth * (1 + (level - 1) * g.PLAYER_HEALTH_PER_LEVEL) * (1 + talentLvl * g.TALENT_BONUS_PER_LEVEL);
  return { dmg: Math.floor(dmg), hp: Math.floor(hp) };
}
const enemyHpMult = w => 1 + (w - 1) * g.WAVE_HEALTH_MULTIPLIER;
const enemyDmgMult = w => 1 + (w - 1) * g.WAVE_DAMAGE_MULTIPLIER;
const bossHpMult = w => 1 + (w - 1) * g.BOSS_WAVE_HEALTH_MULTIPLIER;
const bossDmgMult = w => 1 + (w - 1) * g.BOSS_WAVE_DAMAGE_MULTIPLIER;
const goldMult = w => 1 + (w - 1) * g.GOLD_WAVE_MULTIPLIER;

console.log('wave | bossHP  bossDMG  hitsToKill  hitsToDie | heroDmg heroHP | heroLevels(talents)');
for (const wave of [5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]) {
  const bosses = g.generateDungeonBosses('whispering_grove');
  const i = wave / 5 - 1;
  const b = bosses[i];
  const bHp = Math.floor(b.health * bossHpMult(wave));
  const bDmg = Math.floor(b.damage * bossDmgMult(wave));
  // оценка «героя к этой волне»: уровень ~ линейно от волн, таланты — по золоту
  const level = Math.min(60, 1 + Math.floor(wave * 0.55));
  const talentLvl = Math.min(25, Math.floor(wave * 0.22));
  const { dmg, hp } = playerStats(wave, talentLvl, level);
  // удар героя: базовый свинг каждые ~0.9с + крит-подобные усиления навыков; берём 1.6x DPS
  const heroDps = dmg * 1.6;
  const bossDps = bDmg * 0.5; // атакует примерно раз в 2с
  const ttk = (bHp / heroDps).toFixed(1);
  const ttd = (hp / bossDps).toFixed(1);
  console.log(
    String(wave).padStart(4), '|',
    String(bHp).padStart(7), String(bDmg).padStart(8),
    String(ttk).padStart(11), String(ttd).padStart(10), '|',
    String(dmg).padStart(8), String(hp).padStart(7), '|',
    `lvl${level} tal${talentLvl}`
  );
}

console.log('\n=== обычные враги (волна 40) ===');
const e = g.ENEMIES.goblin || g.ENEMIES.slime;
console.log('goblin HP', Math.floor(e.health * enemyHpMult(40)), 'DMG', Math.floor(e.damage * enemyDmgMult(40)));
const lvl = Math.min(60, 1 + Math.floor(40 * 0.55));
const st = playerStats(40, 8, lvl);
console.log('герой волны 40:', st, '| уворот от 10 ударов:', ((st.hp / (e.damage * enemyDmgMult(40))) ).toFixed(1), 'хитов');

console.log('\n=== таланты: цена и доход ===');
for (const w of [0, 10, 20, 30, 40, 50]) {
  const c0 = g.talentCost(0, w);
  const c5 = g.talentCost(5, w);
  // доход за волну: ~ (5 + wave/3 + 1) врагов * 8 золота * goldMult
  const income = Math.round((5 + Math.floor(w / 3) + 1) * 8 * goldMult(Math.max(1, w)));
  console.log(`волн ${String(w).padStart(3)}: цена ур.1=${String(c0).padStart(5)} ур.6=${String(c5).padStart(5)} | доход/волну~${String(income).padStart(5)} | покупок за доход: ${(income / c0).toFixed(1)}`);
}

console.log('\n=== скорость (гарантия «от погони можно уйти») ===');
// Самый быстрый обычный враг в игре = 2.2 (летучая мышь / адский пёс).
// Герой и враг получают ОДИНАКОВый множитель волны, поэтому сравниваем итог.
const FASTEST_ENEMY = 2.2;
console.log('класс        | базовая | множитель волны 100 | итог');
for (const c of g.CHARACTERS) {
  const hero = c.baseSpeed * 1.25;              // пассивка скорости в конструкторе
  const heroFinal = hero * 1.55;                // потолок множителя
  const enemyFinal = FASTEST_ENEMY * 1.55;
  console.log(
    c.id.padEnd(12), '|', hero.toFixed(2).padStart(6), '|',
    'x1.55'.padStart(17), '|', heroFinal.toFixed(2),
    enemyFinal <= heroFinal ? '  => герой быстрее (ок)' : '  => ВРАГ БЫСТРЕЕ (плохо)'
  );
}
console.log('быстрейший враг на волне 100:', (FASTEST_ENEMY * 1.55).toFixed(2), '| самый медленный герой (mage):', (2.0 * 1.25 * 1.55).toFixed(2));

// ============================================================
// СПРАВЕДЛИВОСТЬ АТАК: телеграф должен хватать на реакцию,
// а «расстояние реакции» — помещаться в экран.
// ============================================================
console.log('\n=== справедливость атак боссов (телеграф и реакция) ===');
const ba = require('./out/bossAttacks.js');
const ar = require('./out/arrows.js');
const bosses = Object.values(g.ALL_ENEMIES).filter(d => d.isBoss);
const kits = bosses.map(b => ({ b, kit: ba.kitForBoss(b.id, b.shape, b.element, b.weapon, b.attackType) }));

// Герой на волне 20: скорость в пикселях на кадр. Берём МЕДЛЕННЫЙ класс
// (mage, 2.0) с пассивкой 1.25 и небольшим множителем — это консервативная
// оценка: если даже mage успевает выйти из зоны, то уклонение честное.
const HERO_PX = 2.0 * 1.25 * 1.1;   // ~2.75 px/кадр при 60 fps
const reactPerSec = HERO_PX * 60;

let minTel = Infinity, maxTel = 0, tooFast = 0, unreactable = 0;
const telList = [];
for (const { kit } of kits) {
  for (const a of kit.all) {
    telList.push(a.telegraph);
    minTel = Math.min(minTel, a.telegraph);
    maxTel = Math.max(maxTel, a.telegraph);
    // Сколько расстояния герой закрывает за телеграф — должно хватать,
    // чтобы выйти из зоны поражения (≈ 1.5 радиуса босса = ~45 px).
    const canMove = a.telegraph * reactPerSec;
    if (canMove < 45) unreactable++;
    // Скорость снаряда: за секунду он не должен пролетать больше 2 экранов,
    // иначе уклонение невозможно физически.
    const prof = ar.arrowProfile(a.kind);
    if (prof.speed > 780) tooFast++;
  }
}
telList.sort((x, y) => x - y);
console.log('боссов:', bosses.length, '| уникальных наборов атак:', new Set(kits.map(k => k.kit.all.map(a => a.id).join('|'))).size);
console.log('телеграф: мин', minTel.toFixed(2), 'с | медиана', telList[Math.floor(telList.length / 2)].toFixed(2), 'с | макс', maxTel.toFixed(2), 'с');
console.log('герой за телеграф 0.5 с закрывает ~' + (0.5 * reactPerSec).toFixed(0) + ' px (зона поражения босса ~45 px) => уклонение реально');
if (unreactable) console.log('  ВНИМАНИЕ: атак с нехваткой времени на реакцию:', unreactable);
if (tooFast) console.log('  ВНИМАНИЕ: снарядов быстрее 780 px/с:', tooFast);

console.log('\nформы атак по боссам (сколько боссов их используют):');
const formCount = {};
for (const { kit } of kits) for (const a of kit.all) formCount[a.form] = (formCount[a.form] || 0) + 1;
for (const [f, c] of Object.entries(formCount).sort((a, b) => b[1] - a[1])) {
  console.log('  ' + f.padEnd(12), c);
}
const dmgSum = kits.reduce((s, { b, kit }) => s + kit.all.reduce((t, a) => t + b.damage * a.damageMul, 0), 0);
console.log('средний суммарный урон набора атак одного босса: ' + (dmgSum / kits.length).toFixed(1));

console.log('\n=== ПРОВЕРКА: урон босса vs HP героя ===');
for (const wave of [5, 20, 50, 100]) {
  const i = wave / 5 - 1;
  const b = g.generateDungeonBosses('whispering_grove')[i];
  const bDmg = Math.floor(b.damage * (1 + (wave - 1) * g.BOSS_WAVE_DAMAGE_MULTIPLIER));
  const lvl = Math.min(60, 1 + Math.floor(wave * 0.55));
  const tal = Math.min(25, Math.floor(wave * 0.22));
  const hp = Math.floor(g.CHARACTERS[0].baseHealth * (1 + (lvl - 1) * g.PLAYER_HEALTH_PER_LEVEL) * (1 + tal * g.TALENT_BONUS_PER_LEVEL));
  const hits = (hp / bDmg).toFixed(1);
  const verdict = hits >= 12 ? 'комфортно' : hits >= 6 ? 'напряжённо (ок)' : 'ОПАСНО';
  console.log(`волна ${String(wave).padStart(3)}: удар босса ${String(bDmg).padStart(4)} | HP героя ${String(hp).padStart(5)} | ударов до смерти ${String(hits).padStart(5)} => ${verdict}`);
}
