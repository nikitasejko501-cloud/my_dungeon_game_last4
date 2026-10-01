// Проверка ТЗ по способностям тварей: оружие определяет атаку, у обычных
// монстров набор небольшой, у паука укус частый, у волка нет магии.
// Запуск: npm run ability:audit
const { monsterAbilitiesFor } = require('./out/monsterAbilities.js');
const { BOSS_ATTACKS, kitForBoss } = require('./out/bossAttacks.js');

const CASES = [
  // [форма, тип атаки, оружие, стихия, id]
  ['humanoid', 'melee', 'sword', null, 'knight_1'],
  ['humanoid', 'melee', 'axe', null, 'berserker_1'],
  ['humanoid', 'ranged', 'bow', null, 'archer_1'],
  ['skeleton', 'melee', 'sword', null, 'sk_1'],
  ['wolf', 'charger', 'claw', null, 'wolf_1'],
  ['wolf', 'melee', 'none', null, 'wolf_2'],
  ['spider', 'melee', 'none', 'poison', 'spider_1'],
  ['blob', 'melee', 'none', 'poison', 'slime_1'],
  ['golem', 'melee', 'hammer', 'fire', 'golem_1'],
];

console.log('=== НАБОРЫ СПОСОБНОСТЕЙ ===');
for (const [shape, at, weapon, element, id] of CASES) {
  const list = monsterAbilitiesFor(shape, at, { element: element || undefined, weapon: weapon || undefined, id });
  const desc = list.map(a => `${a.hintRu}[${a.kind}/${a.body}]x${a.weight}`).join('  ');
  console.log(`${(shape + '/' + at + '/' + (weapon || 'none')).padEnd(28)} n=${list.length}  ${desc}`);
}

console.log('\n=== ПРОВЕРКИ ТЗ ===');
let fail = 0;
const check = (name, ok, extra) => {
  console.log(`${ok ? 'OK  ' : 'ФЕЙЛ'} ${name}${extra ? ' — ' + extra : ''}`);
  if (!ok) fail++;
};

// 1. Мечник бьёт мечом (телесный приём = weaponSweep), а не плевком.
const sword = monsterAbilitiesFor('humanoid', 'melee', { weapon: 'sword', id: 'knight_1' });
check('мечник: основной приём — удар мечом',
  sword[0].body === 'weaponSweep' && sword[0].kind === 'thrust',
  `${sword[0].kind}/${sword[0].body}`);
check('мечник: НЕТ ни одного магического приёма в телесном слоте',
  !sword.some(a => a.kind === 'spit' || a.kind === 'castHand' && a.weight > 3.5));

// 2. Лучник стреляет.
const bow = monsterAbilitiesFor('humanoid', 'ranged', { weapon: 'bow', id: 'archer_1' });
check('лучник: есть приём «выстрел»', bow.some(a => a.hintRu === 'ВЫСТРЕЛ'),
  bow.map(a => a.hintRu).join(','));

// 3. Волк — зверь: только телесные приёмы, ни одной магии/плевка.
const wolf = monsterAbilitiesFor('wolf', 'charger', { weapon: 'claw', id: 'wolf_1' });
check('волк: ни плевка, ни магии, ни рёва',
  !wolf.some(a => ['spit', 'castHand', 'web', 'roar'].includes(a.kind)),
  wolf.map(a => a.kind).join(','));
check('волк: укус/прыжок — основной приём', wolf[0].kind === 'bite' && wolf[0].weight >= 4,
  `${wolf[0].kind} w=${wolf[0].weight}`);

// 4. Паук: укус частый, паутина — редкий ВТОРОЙ слот (не вытесняет укус).
const spider = monsterAbilitiesFor('spider', 'melee', { element: 'poison', id: 'spider_1' });
const bite = spider.find(a => a.kind === 'bite');
const web = spider.find(a => a.kind === 'web');
check('паук: укус — первый приём и он весомее', !!bite && bite === spider[0] && bite.weight > 4,
  bite ? `w=${bite.weight}` : 'нет');
check('паук: паутина есть, но редкая', !!web && web.weight < bite.weight * 0.35,
  web ? `w=${web.weight} (укус ${bite.weight})` : 'нет');
check('паук: третьего приёма нет (2 слота)', spider.length === 2, `n=${spider.length}`);

// 5. Наборы небольшие: у обычных тварей 2–3 приёма (не «роскошь» из 6).
for (const [shape, at, weapon, element, id] of CASES) {
  const n = monsterAbilitiesFor(shape, at, { element: element || undefined, weapon: weapon || undefined, id }).length;
  check(`набор небольшой: ${shape}/${weapon || 'none'}`, n >= 2 && n <= 3, `n=${n}`);
}

// 6. Боссы: у каждого свой набор из 3 атак, и формы разные.
console.log('\n=== НАБОРЫ БОССОВ ===');
const BOSS = [
  ['necropolis_boss_1', 'skeleton', 'dark', 'sword', 'melee'],
  ['whispering_grove_boss_1', 'wolf', 'poison', 'claw', 'melee'],
  ['gnomish_ruins_boss_1', 'golem', 'fire', 'hammer', 'melee'],
  ['sky_citadel_boss_1', 'gargoyle', 'storm', 'sword', 'melee'],
  ['idol_jungle_boss_1', 'spider', 'poison', 'none', 'melee'],
];
const usedForms = {};
for (const [id, shape, element, weapon, at] of BOSS) {
  const kit = kitForBoss(id, shape, element, weapon, at);
  const all = kit.all || [];
  const forms = all.map(a => a.form);
  usedForms[id] = forms;
  console.log(`${id.padEnd(30)} ${shape}/${weapon}  ${all.map(a => `${a.id}(${a.form})`).join(' ')}`);
  check(`босс ${id}: 3 атаки`, all.length === 3, `n=${all.length}`);
  check(`босс ${id}: формы не повторяются`, new Set(forms).size === forms.length, forms.join(','));
}

console.log(fail === 0 ? '\nИТОГ: все проверки пройдены' : `\nИТОГ: провалено ${fail}`);
process.exit(fail === 0 ? 0 : 1);

