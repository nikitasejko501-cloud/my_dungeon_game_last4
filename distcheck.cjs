// ПРОВЕРКА production-бандла: реально ли новые системы попали в dist/.
// Запуск: node distcheck.cjs
// Зачем отдельно: минификатор ПЕРЕИМЕНОВЫВАЕТ функции модулей
// (drawArrowTrail/ringAngles исчезают из текста), поэтому по именам
// проверять нельзя. Зато строковые подписи атак и методы класса
// (свойства объекта) выживают — по ним и сверяем.
'use strict';
const http = require('http');

function get(path) {
  return new Promise((res, rej) => {
    http.get({ host: 'localhost', port: 8080, path }, r => {
      let b = '';
      r.setEncoding('utf8');
      r.on('data', d => (b += d));
      r.on('end', () => res({ status: r.statusCode, body: b }));
    }).on('error', rej);
  });
}

(async () => {
  const idx = await get('/');
  console.log('index.html HTTP', idx.status);
  const m = idx.body.match(/assets\/index-([A-Za-z0-9_-]+)\.js/);
  if (!m) { console.log('БАНДЛ НЕ НАЙДЕН в index.html'); process.exit(1); }
  const js = await get('/assets/index-' + m[1] + '.js');
  console.log('бандл index-' + m[1] + '.js HTTP', js.status, '| байт:', js.body.length);

  const hints = [
    'МЕТЕОРИТНЫЙ ДОЖДЬ', 'ЯДОВИТЫЙ КУСТ', 'КОСТЯНЫЕ КОПЬЯ', 'ЛЕДЯНАЯ НОВА',
    'ПАУТИННЫЕ ЛОВУШКИ', 'ОГНЕННОЕ ДЫХАНИЕ', 'БОЕВОЙ КРИК', 'ПРОБИВАЮЩИЙ УДАР',
  ];
  let bad = 0;
  for (const h of hints) {
    const ok = js.body.includes(h);
    if (!ok) bad++;
    console.log((ok ? '  ok      ' : '  MISSING ') + h);
  }
  const methods = ['startBossCast', 'updateCasts', 'resolveBossCast', 'drawCastTelegraphs', 'attackFramePair', 'fireEnemyArrow', 'PLAYER_HIT_R'];
  for (const s of methods) {
    const ok = js.body.includes(s);
    if (!ok) bad++;
    console.log((ok ? '  ok      ' : '  MISSING ') + s + ' (метод/поле класса)');
  }
  const hmr = /@vite\/client|vite-hmr|createHotContext|__vite__/.test(js.body);
  console.log(hmr ? '  ВНИМАНИЕ: в бандле остался HMR-клиент' : '  ok       HMR-клиента нет — автоперезагрузка невозможна');
  console.log(hmr ? '' : '\nИТОГ: ' + (bad === 0 ? 'все новые системы в сборке' : bad + ' ПРОБЛЕМ'));
  process.exit(bad === 0 && !hmr ? 0 : 1);
})();
