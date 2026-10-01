// ARMAUDIT: Р С—РЎР‚Р С•Р Р†Р ВµРЎР‚РЎРЏР ВµР С Р СћР вЂ” Р С‘Р С–РЎР‚Р С•Р С”Р В° РІР‚вЂќ Р’В«РЎР‚РЎС“Р С”Р В° РЎР‚Р С‘РЎРѓРЎС“Р ВµРЎвЂљРЎРѓРЎРЏ РЎвЂљР С•Р В»РЎРЉР С”Р С• РЎС“ РЎвЂљР ВµРЎвЂ¦, Р С”РЎвЂљР С• РЎРѓРЎвЂљРЎР‚Р ВµР В»РЎРЏР ВµРЎвЂљ
// Р СР В°Р С–Р С‘Р ВµР в„– Р С‘ РЎС“ Р С”Р С•Р С–Р С• Р Р…Р ВµРЎвЂљ Р Р…Р С‘Р С”Р В°Р С”Р С•Р С–Р С• Р С•РЎР‚РЎС“Р В¶Р С‘РЎРЏР’В».
const g = require('./out/gameData.js');
const ma = require('./out/monsterAbilities.js');
const cc = require('./out/castCore.js');
const art = require('./out/monsterArt.js');

let rows = [], bad = [];
for (const e of Object.values(g.ALL_ENEMIES)) {
  const kit = art.monsterKit(e.id, e.name.ru, e.name.en, e.shape || 'blob', !!e.isBoss);
  const weapon = e.weapon || kit.weapon;
  const abs = ma.monsterAbilitiesFor(e.shape || 'blob', e.attackType || 'melee', { element: e.element, weapon: weapon, id: e.id });
  if (!abs || !abs.length) { bad.push(e.id + ': Р СњР вЂўР Сћ Р Р…Р В°Р В±Р С•РЎР‚Р В°'); continue; }
  for (const a of abs) {
    const armed = weapon && weapon !== 'none';
    const magic = a.kind === 'spit' || a.kind === 'castHand' || a.kind === 'web' || a.kind === 'roar';
    const allowed = cc.shouldDrawCastArm(a.kind, weapon, true);
    const expect = magic && !armed;
    if (allowed !== expect) bad.push(e.id + ' w=' + weapon + ' kind=' + a.kind + ': allowed=' + allowed + ' expect=' + expect);
    rows.push({ id: e.id, shape: e.shape, weapon, kind: a.kind, armed, magic, allowed });
  }
}

console.log('=== Р РЋР вЂ™Р С›Р вЂќР С™Р С’ ===');
console.log('РЎвЂљР Р†Р В°РЎР‚Р ВµР в„–           :', new Set(rows.map(r => r.id)).size);
console.log('РЎРѓР С—Р С•РЎРѓР С•Р В±Р Р…Р С•РЎРѓРЎвЂљР ВµР в„–     :', rows.length);
console.log('РЎР‚РЎС“Р С”Р В° РЎР‚Р В°Р В·РЎР‚Р ВµРЎв‚¬Р ВµР Р…Р В°   :', rows.filter(r => r.allowed).length);
console.log('Р В±Р ВµР В· Р С•РЎР‚РЎС“Р В¶Р С‘РЎРЏ (Р Р…Р ВµРЎвЂљ) :', rows.filter(r => r.armed && r.allowed).length, '(Р Т‘Р С•Р В»Р В¶Р Р…Р С• Р В±РЎвЂ№РЎвЂљРЎРЉ 0)');

console.log('\n=== Р С™Р СћР С› Р вЂ™Р ВР вЂќР ВР Сћ Р В Р Р€Р С™Р Р€ ===');
const seen = new Map();
for (const r of rows) if (r.allowed) {
  const k = r.shape + '/' + r.weapon + '/' + r.kind;
  seen.set(k, (seen.get(k) || 0) + 1);
}
for (const [k, n] of [...seen].sort((a, b) => b[1] - a[1])) console.log('  ' + k + '  x' + n);

console.log('\n=== Р СџР В Р С›Р вЂ™Р вЂўР В Р С™Р В Р СћР вЂ” ===');
const chk = (ok, txt) => console.log((ok ? 'OK   ' : 'Р СџР В Р С›Р вЂ™Р С’Р вЂє ') + txt);
chk(bad.length === 0, 'Р Р…Р ВµРЎвЂљ Р Р…Р В°РЎР‚РЎС“РЎв‚¬Р ВµР Р…Р С‘Р в„– Р С—РЎР‚Р В°Р Р†Р С‘Р В»Р В° (Р Р…Р В°РЎР‚РЎС“РЎв‚¬Р ВµР Р…Р С‘Р в„–: ' + bad.length + ')');
for (const b of bad.slice(0, 10)) console.log('    !', b);

const armedCasters = rows.filter(r => r.armed && r.allowed);
chk(armedCasters.length === 0, 'Р Р…Р С‘Р С”РЎвЂљР С• РЎРѓ Р С•РЎР‚РЎС“Р В¶Р С‘Р ВµР С Р Р…Р Вµ Р С”Р С•Р В»Р Т‘РЎС“Р ВµРЎвЂљ РЎР‚РЎС“Р С”Р С•Р в„– (Р Р…Р В°РЎР‚РЎС“РЎв‚¬Р С‘РЎвЂљР ВµР В»Р ВµР в„–: ' + armedCasters.length + ')');
const meleeArm = rows.filter(r => r.allowed && (r.kind === 'bite' || r.kind === 'thrust'));
chk(meleeArm.length === 0, 'РЎС“Р С”РЎС“РЎРѓ/Р Р†РЎвЂ№Р С—Р В°Р Т‘ Р С•РЎР‚РЎС“Р В¶Р С‘Р ВµР С Р Р…Р Вµ РЎР‚Р С‘РЎРѓРЎС“РЎР‹РЎвЂљ РЎР‚РЎС“Р С”РЎС“ (Р Р…Р В°РЎР‚РЎС“РЎв‚¬Р С‘РЎвЂљР ВµР В»Р ВµР в„–: ' + meleeArm.length + ')');

const wolf = rows.filter(r => r.shape === 'wolf');
chk(wolf.every(r => r.kind === 'bite'), 'Р Р†Р С•Р В»Р С”: РЎвЂљР С•Р В»РЎРЉР С”Р С• РЎС“Р С”РЎС“РЎРѓ (Р Р†Р С‘Р Т‘Р С•Р Р†: ' + new Set(wolf.map(r => r.kind)).size + ')');

const spider = new Map();
for (const r of rows.filter(r => r.shape === 'spider')) spider.set(r.id, (spider.get(r.id) || []).concat(r.kind));
const spiderOk = [...spider.values()].every(k => k[0] === 'bite' && k.length <= 2);
chk(spiderOk, 'Р С—Р В°РЎС“Р С”: Р С—Р ВµРЎР‚Р Р†РЎвЂ№Р в„– Р С—РЎР‚Р С‘РЎвЂР С РІР‚вЂќ РЎС“Р С”РЎС“РЎРѓ, Р С—Р В°РЎС“РЎвЂљР С‘Р Р…Р В° Р СР В°Р С”РЎРѓР С‘Р СРЎС“Р С Р С•Р Т‘Р Р…Р В° Р С‘ Р Р†РЎвЂљР С•РЎР‚Р В°РЎРЏ');

const idle = cc.shouldDrawCastArm('spit', 'none', false);
chk(idle === false, 'Р Р† Р С—Р С•Р С”Р С•Р Вµ РЎР‚РЎС“Р С”Р В° Р СњР вЂў РЎР‚Р С‘РЎРѓРЎС“Р ВµРЎвЂљРЎРѓРЎРЏ (casting=false)');

let blocked = true;
for (const w of ['sword', 'bow', 'staff', 'orb', 'hammer', 'club']) {
  if (cc.shouldDrawCastArm('spit', w, true)) { blocked = false; console.log('    ! Р С•РЎР‚РЎС“Р В¶Р С‘Р Вµ Р Р…Р Вµ Р В·Р В°Р В±Р В»Р С•Р С”Р С‘РЎР‚Р С•Р Р†Р В°Р В»Р С•:', w); }
}
chk(blocked, 'Р В»РЎР‹Р В±Р С•Р Вµ Р С•РЎР‚РЎС“Р В¶Р С‘Р Вµ Р В±Р В»Р С•Р С”Р С‘РЎР‚РЎС“Р ВµРЎвЂљ РЎР‚РЎС“Р С”РЎС“ (Р С—РЎР‚Р С•Р Р†Р ВµРЎР‚Р ВµР Р…Р С• 6 Р Р†Р С‘Р Т‘Р С•Р Р†)');

console.log('\nР ВР СћР С›Р вЂњ:', bad.length === 0 && armedCasters.length === 0 ? 'Р Р†РЎРѓР Вµ Р С—РЎР‚Р С•Р Р†Р ВµРЎР‚Р С”Р С‘ Р С—РЎР‚Р С•Р в„–Р Т‘Р ВµР Р…РЎвЂ№' : 'Р С›Р РЃР ВР вЂР С›Р С™: ' + bad.length);
process.exit(bad.length === 0 && armedCasters.length === 0 ? 0 : 1);
