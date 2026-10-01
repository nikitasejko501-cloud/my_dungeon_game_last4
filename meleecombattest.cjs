const { MeleeCombat, ART_UNIT, SS, ART_N, WEAPON_UNIT, WEAPON_N, STAMP_N } = require('./out/meleeCombat.js');
let fail = 0;
const check = (name, ok, extra) => {
  console.log(`${ok ? 'OK  ' : 'ФЕЙЛ'} ${name}${extra ? ' — ' + extra : ''}`);
  if (!ok) fail++;
};
check('импорт констант из модуля', ART_UNIT === 32 && SS === 8 && ART_N === 256 && WEAPON_UNIT === 48 && WEAPON_N === 384 && STAMP_N === 512,
  `ART_UNIT=${ART_UNIT} SS=${SS} ART_N=${ART_N} WEAPON_UNIT=${WEAPON_UNIT} WEAPON_N=${WEAPON_N} STAMP_N=${STAMP_N}`);
const mc = new MeleeCombat();
const mk = (shape, gait, isBoss = false, radius = 20) => ({
  id: shape, shape, gait, radius, isBoss, weaponReach: 0.5,
  x: 0, y: 0, vx: 0, vy: 0, alive: true,
});
check('moveKind: ноги -> walk', MeleeCombat.moveKind(MeleeCombat.anatomy('humanoid'), 'walk') === 'walk');
check('moveKind: крылья -> flight', MeleeCombat.moveKind(MeleeCombat.anatomy('bat'), 'glide') === 'flight');
check('moveKind: прыгун -> leap', MeleeCombat.moveKind(MeleeCombat.anatomy('wolf'), 'hop') === 'leap');
check('moveKind: бесформенный -> ooze', MeleeCombat.moveKind(MeleeCombat.anatomy('blob'), 'slither') === 'ooze');
check('moveKind: парящий дух -> flight', MeleeCombat.moveKind(MeleeCombat.anatomy('spirit'), 'float') === 'flight');
const w = mk('humanoid', 'walk');
mc.move(w, 0.016, 1, 0, 0);
check('ходьба: тело сместилось вправо', w.x > 0 && Math.abs(w.vy) < 1e-9, `x=${w.x.toFixed(3)}`);
const f = mk('bat', 'glide');
const fs = mc.move(f, 0.016, 1, 0, 0.25);
check('полёт: есть подъём (airborne>0) и покачивание', fs.airborne > 0 && f.x > 0, `air=${fs.airborne.toFixed(2)}`);
const l = mk('wolf', 'hop');
let maxAir = 0;
for (let i = 0; i < 32; i++) { const s = mc.move(l, 0.016, 1, 0, i / 32); maxAir = Math.max(maxAir, s.airborne); }
check('прыжки: тело отрывается от земли', maxAir > 0, `maxAir=${maxAir.toFixed(2)}`);
const o = mk('blob', 'slither');
let minSquash = 9, maxSquash = 0;
for (let i = 0; i < 32; i++) { const s = mc.move(o, 0.016, 1, 0, i / 32); minSquash = Math.min(minSquash, s.squash); maxSquash = Math.max(maxSquash, s.squash); }
check('слизень: сжатие и растяжение', minSquash < 1 && maxSquash > 1, `squash ${minSquash.toFixed(2)}..${maxSquash.toFixed(2)}`);
const mob = mc.abilities(mk('humanoid', 'walk'));
const boss = mc.abilities(mk('golem', 'stomp', true));
check('монстр: 1-2 способности', mob.length >= 1 && mob.length <= 2, `n=${mob.length}`);
check('монстр: один класс', new Set(mob.map(a => a.cls)).size === 1, mob.map(a => a.cls).join(','));
check('босс: до 3 способностей', boss.length === 3, `n=${boss.length}`);
check('босс: может смешивать классы', new Set(boss.map(a => a.cls)).size >= 2, boss.map(a => `${a.id}/${a.cls}`).join(' '));
const near = mc.bestAbility(mk('humanoid', 'walk'), 20, () => 0);
check('выбор способности в дистанции', near !== null && near.id === 'sweep', near ? near.id : 'нет');
const _ab = { id: 'sweep', cls: 'melee', reach: 1.35, damageMul: 1, windup: 0.1, contact: 0.55, recover: 0.12, cooldown: 1.4, weight: 4.2 };
const _tContact = _ab.contact * Math.max(1e-6, _ab.windup + _ab.recover + 0.14);
const _he = { id: 'h', shape: 'humanoid', gait: 'walk', radius: 20, isBoss: false, weaponReach: 0.5, x: 0, y: 0, vx: 0, vy: 0, alive: true };
const hitRes = mc.strike(_he, _ab, _tContact, _he.weaponReach * _he.radius + WEAPON_UNIT * SS + _he.radius * 1.35 * 0.6, 0, 100);
check('удар: кадр контакта — attackC', hitRes.frame.variant === 'attackC', hitRes.frame.variant);
check('удар: рука уходит вправо на WEAPON_UNIT*SS', Math.abs(hitRes.frame.handX - (_he.weaponReach * _he.radius + WEAPON_UNIT * SS)) < 0.5, `handX=${hitRes.frame.handX.toFixed(1)}`);
check('удар: штамп-холст STAMP_N', hitRes.frame.stampSize === STAMP_N, `stamp=${hitRes.frame.stampSize}`);
check('удар: зона поражения в пикселях', hitRes.frame.zone.w > 0 && hitRes.frame.zone.reach === mc.reachPixels({ reach: 1.35 }, 20, false), `reach=${hitRes.frame.zone.reach}`);
check('удар: цель в зоне -> урон нанесён', hitRes.hit && hitRes.damage === 100, `hit=${hitRes.hit} dmg=${hitRes.damage}`);
const miss = mc.strike(_he, _ab, 0, 1000, 0, 100);
check('удар: не в кадре контакта -> нет урона', !miss.hit, `hit=${miss.hit}`);
console.log(fail === 0 ? '\nИТОГ: все проверки пройдены' : `\nИТОГ: провалено ${fail}`);
process.exit(fail === 0 ? 0 : 1);
