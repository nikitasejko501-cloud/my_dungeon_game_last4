// АУДИТ НАБОРОВ АТАК БОССОВ: сколько наборов, насколько они разные,
// какие телеграфы/урон у них. Запуск: node bosskitaudit.cjs
'use strict';
const path = require('path');
const g = require(path.join(__dirname, '.smoke', 'gameData.js'));
const ba = require(path.join(__dirname, '.smoke', 'bossAttacks.js'));

const bosses = Object.values(g.ALL_ENEMIES).filter(d => d.isBoss);
const sets = new Map();
for (const d of bosses) {
  const k = ba.kitForBoss(d.id, d.shape, d.element, d.weapon, d.attackType);
  const s = k.all.map(a => a.id).join(' | ');
  sets.set(s, (sets.get(s) || 0) + 1);
}
console.log('боссов всего:', bosses.length, '| уникальных наборов:', sets.size);
const rep = [...sets.entries()].sort((a, b) => b[1] - a[1]);
console.log('\nчаще всего повторяются:');
for (const [s, c] of rep.slice(0, 6)) console.log('  ' + String(c).padStart(3) + 'x  ' + s);
console.log('\nпервые 10 боссов:');
for (const b of bosses.slice(0, 10)) {
  const k = ba.kitForBoss(b.id, b.shape, b.element, b.weapon, b.attackType);
  const desc = k.all.map(a => a.id + '[' + a.form + '×' + a.count + ' tel=' + a.telegraph + 's]').join('  ');
  console.log('  ' + b.id.padEnd(24) + (b.shape || '').padEnd(9) + (b.weapon || '-').padEnd(9) + '=> ' + desc);
}
// телеграфы: минимум должен быть достаточен для ухода
const tels = [];
for (const d of bosses) {
  const k = ba.kitForBoss(d.id, d.shape, d.element, d.weapon, d.attackType);
  for (const a of k.all) tels.push(a.telegraph);
}
tels.sort((a, b) => a - b);
console.log('\nтелеграфы: мин', tels[0], 'медиана', tels[Math.floor(tels.length / 2)], 'макс', tels[tels.length - 1], 'сек');
console.log('всего атак-кастов на босса:', tels.length, '(3 на каждого)');
