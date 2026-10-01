// АУДИТОР ОРУЖИЯ И БОССОВ (числовой, без картинок). Проверяет то, что трудно
// разглядеть на превью:
//   1) НЕ ОБРЕЗАЕТСЯ ЛИ оружие краем холста — в спрайте удара
//      (buildWeaponSprite) и в теле монстра (buildMonsterArt). Если чернила
//      цепляют внешнюю рамку холста — клинок упирается в границу = «обрубок».
//   2) Кисть (pivot) лежит внутри габарита оружия; длина в авторских единицах
//      (чтобы копьё не оказалось короче кинжала).
//   3) РЕАЛЬНО ли боссы различимы: уникальность наборов форма/оружие/регалии/
//      аура/стихия/походка и число разных комбинаций внутри подземелья.
//   4) ДВИЖЕТСЯ ли цикл ходьбы босса (сколько пикселей меняется между кадрами).
// Сборка спрайтов дорогая, поэтому секции запускаются отдельно:
//   node weaponaudit.cjs 1     · node weaponaudit.cjs 2     · 3     · 4
const ga = require('./out/monsterArt.js');
const gd = require('./out/gameData.js');
const { ART_N, SS, buildWeaponSprite, buildMonsterArt, monsterKit } = ga;
const RUN = process.argv[2] ? process.argv.slice(2) : ['1', '2', '3', '4'];
const on = (s) => RUN.indexOf(s) >= 0;

const KITS = ['sword', 'dagger', 'axe', 'spear', 'halberd', 'club', 'mace', 'hammer',
  'bow', 'crossbow', 'scythe', 'sickle', 'staff', 'orb', 'torch', 'horn', 'claw',
  'trident', 'whip', 'shield', 'book', 'banner'];
const SEEDS = ['id_a', 'id_b', 'id_c'];

/** Габарит чернил + факт касания внешней рамки холста (= признак обрезки). */
function inkBox(grid) {
  const n = grid.length;
  let minX = n, minY = n, maxX = -1, maxY = -1, count = 0;
  for (let y = 0; y < n; y++) {
    const row = grid[y];
    for (let x = 0; x < n; x++) {
      if (row[x] === 0) continue;
      count++;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return { n, minX, minY, maxX, maxY, count, touch: minX <= 0 || minY <= 0 || maxX >= n - 1 || maxY >= n - 1 };
}

let clipped = 0, missing = 0, pivotOff = 0, bodyClip = 0, wideSprites = 0, frozen = 0;
const clipList = [], pivotList = [];

if (on('1')) {
  console.log('=== 1. СПРАЙТ УДАРА (buildWeaponSprite): длина, кисть, обрезка ===');
  for (const kit of KITS) {
    const row = [];
    for (const boss of [true, false]) {
      const parts = [];
      for (const seed of SEEDS) {
        const ws = buildWeaponSprite(kit, boss, seed);
        if (!ws) { missing++; parts.push('нет арта'); continue; }
        const b = inkBox(ws.grid);
        if (b.touch) { clipped++; clipList.push(kit + (boss ? '/boss' : '/mon')); }
        const okPivot = ws.pivotX >= b.minX && ws.pivotX <= b.maxX && ws.pivotY >= b.minY && ws.pivotY <= b.maxY;
        if (!okPivot) {
          pivotOff++;
          // Насколько кисть (27,22 авторских единиц) стоит в стороне от оружия:
          // большой зазор = оружие «висит в воздухе» и крутится не вокруг руки.
          const dx = Math.max(b.minX - ws.pivotX, ws.pivotX - b.maxX, 0) / SS;
          const dy = Math.max(b.minY - ws.pivotY, ws.pivotY - b.maxY, 0) / SS;
          const gap = Math.hypot(dx, dy);
          if (gap > 1.5) pivotList.push(`${kit}${boss ? '/boss' : '/mon'} зазор кисти ${gap.toFixed(1)}u`);
        }
        parts.push(`${b.touch ? 'ОБР.' : 'ок'} len=${(ws.length / SS).toFixed(1)}u box=${Math.round((b.maxX - b.minX + 1) / SS)}x${Math.round((b.maxY - b.minY + 1) / SS)}`);
      }
      row.push((boss ? 'босс: ' : 'тварь: ') + parts[0]);
    }
    console.log(kit.padEnd(9), row.join(' | '));
  }
  console.log('обрезано:', clipList.join(', ') || 'нет');
  console.log('кисть далеко от оружия (>1.5u):', [...new Set(pivotList)].join(' | ') || 'нет');
}


if (on('2')) {
  console.log('\n=== 2. ОРУЖИЕ В ТЕЛЕ (stampWeapon): не выпало ли за край кадра ===');
  // Тело намеренно касается края своего холста (ноги на земле), поэтому
  // «касание рамки» тела — НЕ ошибка. Настоящая обрезка — пиксели оружия,
  // которые штамп НЕ смог записать в кадр (lastStampDrops): они исчезают
  // бесследно и по границе сетки не видны. Считаем по всем кадрам и наборам.
  const SHAPES = ['humanoid', 'dragon']; // 2 семени арта (вместе с boss-флагом = 4 экземпляра набора)
  const VAR = ga.ART_VARIANTS;           // все 15 кадров: idle/walkA-H/attackA-D/reach/breath
  const tiers = { 256: 0, 384: 0, 512: 0 };
  const bad = [];
  let frames = 0, minY0 = Infinity;
  for (const v of VAR) for (const kit of KITS) for (const boss of [false, true]) for (const shape of SHAPES) {
    const g = buildMonsterArt('audit_' + shape + '_' + kit, shape, boss,
      { nameRu: shape, nameEn: shape, element: 'fire', traits: [], gait: 'stomp', attack: 'weaponSweep', weapon: kit, regalia: 3 }, v);
    frames++;
    if (tiers[g.length] !== undefined) tiers[g.length]++;
    const drops = ga.lastStampDrops();
    if (drops > 0) bad.push(`${kit}${boss ? '/B' : ''}/${shape}/${v} −${drops}px`);
    const b = ga.lastStampBounds();
    if (b.x1 > 0 && b.y0 < minY0) minY0 = b.y0;
  }
  bodyClip = bad.length;
  wideSprites = tiers[384] + tiers[512];
  console.log('кадров:', frames, '| холст тела 256:', tiers[256], '| расширенный 384:', tiers[384], '| удар-в-упор 512:', tiers[512]);
  console.log('минимальный запас сверху:', minY0 === Infinity ? '—' : (minY0 / SS).toFixed(2) + 'u (нужно ≥ 0)');
  console.log('выпад оружия за край кадра:', bad.length
    ? 'ОБРЕЗАНО: ' + bad.slice(0, 10).join(', ') + (bad.length > 10 ? ` …+${bad.length - 10}` : '')
    : 'нет');
}

if (on('3')) {
  console.log('\n=== 3. БОССЫ: различимость обликов ===');
  const bosses = Object.values(gd.ALL_ENEMIES).filter((d) => d.isBoss);
  const bySig = new Map();
  const byDungeon = new Map();
  let noWeapon = 0, noName = 0, noAura = 0, noRate = 0;
  for (const d of bosses) {
    if (!d.weapon) noWeapon++;
    if (!d.weaponName || !d.weaponName.ru) noName++;
    if (typeof d.aura !== 'number') noAura++;
    if (!d.abilityRate || !d.animationRate) noRate++;
    const sig = [d.shape, d.weapon, d.regalia, d.aura, d.element, d.gait].join('/');
    bySig.set(sig, (bySig.get(sig) || 0) + 1);
    const dg = d.dungeonId || '?';
    if (!byDungeon.has(dg)) byDungeon.set(dg, new Set());
    byDungeon.get(dg).add([d.shape, d.weapon, d.regalia, d.aura, d.element].join('/'));
  }
  const dup = [...bySig.entries()].filter(([, n]) => n > 1);
  console.log('боссов:', bosses.length, '| уникальных обликов:', bySig.size,
    '| наборов оружия:', new Set(bosses.map((d) => d.weapon)).size, '| полных повторов:', dup.length);
  if (dup.length) console.log('  повтор:', dup.slice(0, 10).map(([s, n]) => s + '×' + n).join(', '));
  console.log('  без оружия:', noWeapon, '| без имени:', noName, '| без ауры:', noAura, '| без ритма:', noRate);
  const plain = bosses.filter((d) => !d.weapon || !d.weaponName || typeof d.aura !== 'number');
  if (plain.length) console.log('  ⚠ БЕЗ ЛИЧНОГО ОБЛИКА:', plain.map((d) => d.id).join(', '));
  for (const [dg, set] of byDungeon) console.log('  ' + String(dg).padEnd(18), 'разных обликов боссов:', set.size);
}

if (on('4')) {
  console.log('\n=== 4. ЦИКЛ ХОДЬБЫ БОССОВ (сколько пикселей меняется между кадрами) ===');
  const V = ['walkA', 'walkB', 'walkC', 'walkD', 'walkE', 'walkF', 'walkG', 'walkH'];
  const bosses = Object.values(gd.ALL_ENEMIES).filter((d) => d.isBoss).slice(0, 6);
  for (const d of bosses) {
    const meta = (v) => ({ nameRu: d.name.ru, nameEn: d.name.en, element: d.element, traits: d.traits, gait: d.gait, attack: 'weaponSweep', weapon: d.weapon, regalia: d.regalia });
    const ds = [];
    for (let i = 0; i < 8; i++) {
      const a = buildMonsterArt(d.id, d.shape, true, meta(V[i]), V[i]).flat();
      const b = buildMonsterArt(d.id, d.shape, true, meta(V[(i + 1) % 8]), V[(i + 1) % 8]).flat();
      let diff = 0;
      for (let k = 0; k < a.length; k++) if (a[k] !== b[k]) diff++;
      ds.push(diff);
    }
    const still = ds.filter((v) => v < 300).length;
    if (still) frozen++;
    console.log(String(d.id).slice(0, 26).padEnd(27), String(d.gait).padEnd(8),
      still ? 'ЗАМИРАЕТ в ' + still + ' переходах' : 'анимация есть', '| d=' + ds.join(','));
  }
}

console.log('\nитог: обрезано спрайтов удара =', clipped, '| без арта =', missing,
  '| кисть вне габарита =', pivotOff, '| обрезано в теле =', bodyClip,
  '| спрайтов на расширенном холсте =', wideSprites, '| боссов с застывшим шагом =', frozen);

