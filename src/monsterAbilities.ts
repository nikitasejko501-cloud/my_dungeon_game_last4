// ============================================================
// MONSTER CASTS — ЛИЧНЫЕ СПОСОБНОСТИ ОБЫЧНЫХ ТВАРЕЙ
// ============================================================
// ПРОБЛЕМА, которую это чинит. У обычного монстра была РОВНО ОДНА атака
// (SIGNATURE_BY_SHAPE: «blob → slimeSlam», «spider → legStab»), а
// updateMonsterAbilities() с вероятностью 2% в кадр делал вообще НЕВИДИМОЕ
// действие (doMonsterAbility). В итоге паук и слизень всю игру били одним
// и тем же приёмом, а «способности» из описания монстра не показывались.
//
// Теперь каждая тварь получает НАБОР из 2–3 способностей, которые
// собираются детерминированно по (форма, тип атаки, стихия, id) — так у
// двух пауков из разных подземелий разные наборы, а у одного и того же
// монстра набор ВСЕГДА одинаковый (не «прыгает» между боями).
//
// Тело (анатомия) остаётся на ближнем ударе: летающая тварь бьёт крылом,
// зверь — укусом. А вот ДАЛЬНЯЯ способность (плевок/снаряд) вынесена в
// отдельный слот — и именно её теперь видно: слизень РАСКРЫВАЕТ рот и
// плюёт сгустком, паук выпускает паутину из брюшка, культист бьёт магией
// из поднятой руки с зажатым мечом в другой.
//
// Модуль чистый: только данные + чистые функции (без канвы и движка).
// ============================================================
import type { Element, EnemyAttackType, EnemyShape } from './types';
import type { ArrowKind } from './arrows';
import type { CastStyle } from './castCore';
import { signatureFor, type SignatureKind } from './signatureAttacks';

/**
 * ВИД СПОСОБНОСТИ. Основных три, как просил игрок:
 *   bite     — укус/удар телом на ближней дистанции (у паука — «очень
 *              анимированный» вскид передней пары лап и укус хелицерами);
 *   spit     — плевок/снаряд: слизень раскрывает рот и выпускает массу;
 *   castHand — магия из поднятой в локте руки (вторая рука держит оружие);
 *   roar     — поддержка/рёв: тварь вскидывает голову и усиливает себя.
 */
export type MonsterAbilityKind =
  /** Ближний телесный/оружейный удар (меч, когти, укус, таран). */
  | 'bite'
  /** Плевок/снаряд из пасти или ладони (дальний урон). */
  | 'spit'
  /** Магия из поднятой руки (сфера стихии в ладони). */
  | 'castHand'
  /** Рёв/клич — поддержка, не урон. */
  | 'roar'
  /** Замедляющая паутина (паук; снаряд-сеть). */
  | 'web'
  /** «Человеческий» выпад мечом/топором — дальний урон на ближней дистанции. */
  | 'thrust';

export interface MonsterAbility {
  kind: MonsterAbilityKind;
  /** Тело, которое проигрывает движок (поза + кадры атаки). */
  body: SignatureKind;
  /** Стиль каста для позы руки (виден и рисуется каст-оверлеем). */
  cast: CastStyle;
  /** Вид снаряда — только у дальних способностей (bite → undefined). */
  arrow?: ArrowKind;
  /** Дальность применения, px. 0 = только ближний бой (укус). */
  range: number;
  /** Множитель урона относительно EnemyDef.damage. */
  damageMul: number;
  /** Телеграф, сек: сколько игрок видит замах до удара. */
  telegraph: number;
  /** Не может повториться раньше, чем через столько секунд. */
  cooldown: number;
  /** Вес выбора: чем больше, тем чаще тварь предпочитает эту способность. */
  weight: number;
  /** Подсказка игроку (ru) — что именно сейчас произойдёт. */
  hintRu: string;
  /** Подсказка игроку (en). */
  hintEn: string;
}

const AB = (o: MonsterAbility): MonsterAbility => o;

// ============================================================
// КАТАЛОГ СПОСОБНОСТЕЙ
// ============================================================
// Дальность намеренно короткая (180–320 px): обычный монстр не «снайпер»,
// у него должно быть время подойти. Телеграф 0.35–0.6 с — окно на уход,
// но не такого размера, чтобы атака перестала угрожать.

/** Плевок «массой»: слизень раскрывает рот и выдавливает сгусток. */
const SPIT_BLOB = AB({
  kind: 'spit', body: 'spitBolt', cast: 'groundPress', arrow: 'venom',
  range: 240, damageMul: 0.85, telegraph: 0.45, cooldown: 2.6, weight: 1.0,
  hintRu: 'ПЛЕВОК', hintEn: 'SPIT',
});
/** Кислотный плевок по дуге — оставляет лужу (её ставит signature-модуль). */
const SPIT_ACID = AB({
  kind: 'spit', body: 'spitBolt', cast: 'pointForward', arrow: 'poison',
  range: 280, damageMul: 1.0, telegraph: 0.5, cooldown: 3.2, weight: 0.9,
  hintRu: 'КИСЛОТА', hintEn: 'ACID',
});
/** Паутина: паук вскидывает брюшко и стреляет сетью (ЗАМЕДЛЯЕТ игрока). */
const SPIT_WEB = AB({
  kind: 'web', body: 'webSpit', cast: 'pointForward', arrow: 'web',
  range: 300, damageMul: 0.4, telegraph: 0.55, cooldown: 6.5, weight: 0.75,
  hintRu: 'ПАУТИНА', hintEn: 'WEB',
});
/** Осколки: кристалл/голем швыряет гранёный снаряд из ладони. */
const SPIT_SHARD = AB({
  kind: 'spit', body: 'shardVolley', cast: 'freeHandOrb', arrow: 'crystal',
  range: 320, damageMul: 1.0, telegraph: 0.5, cooldown: 3.0, weight: 1.0,
  hintRu: 'ОСКОЛКИ', hintEn: 'SHARDS',
});
/** Тьма: жгут из раскрытой ладони. */
const SPIT_DARK = AB({
  kind: 'spit', body: 'darkBolt', cast: 'circleWard', arrow: 'void',
  range: 300, damageMul: 0.95, telegraph: 0.5, cooldown: 3.0, weight: 1.0,
  hintRu: 'СГУСТОК ТЬМЫ', hintEn: 'DARK BOLT',
});
/** Гроза: разряд из вскинутой руки. */
const SPIT_STORM = AB({
  kind: 'castHand', body: 'stormBolt', cast: 'roarRaise', arrow: 'storm',
  range: 340, damageMul: 1.05, telegraph: 0.45, cooldown: 3.0, weight: 1.0,
  hintRu: 'РАЗРЯД', hintEn: 'DISCHARGE',
});
/** Огонь: язык пламени из ладони. */
const SPIT_FIRE = AB({
  kind: 'castHand', body: 'darkBolt', cast: 'freeHandOrb', arrow: 'fire',
  range: 300, damageMul: 1.0, telegraph: 0.45, cooldown: 2.8, weight: 1.0,
  hintRu: 'ПЛАМЯ', hintEn: 'FLAME',
});
/** Лёд: шип из собранного в ладони холода. */
const SPIT_ICE = AB({
  kind: 'castHand', body: 'shardVolley', cast: 'freeHandOrb', arrow: 'frost',
  range: 320, damageMul: 0.95, telegraph: 0.45, cooldown: 2.8, weight: 1.0,
  hintRu: 'ЛЕДЯНОЙ ШИП', hintEn: 'ICE SPIKE',
});

/** УКУС: «очень анимированное» смыкание — у паука вскид лап и хелицеры. */
const BITE = AB({
  kind: 'bite', body: 'legStab', cast: 'pointForward',
  range: 0, damageMul: 1.05, telegraph: 0.28, cooldown: 1.5, weight: 1.4,
  hintRu: 'УКУС', hintEn: 'BITE',
});
/** Укус-прыжок: зверь отскакивает назад и бросается. */
const BITE_POUNCE = AB({
  kind: 'bite', body: 'pounce', cast: 'pointForward',
  range: 0, damageMul: 1.2, telegraph: 0.3, cooldown: 1.9, weight: 1.3,
  hintRu: 'ПРЫЖОК', hintEn: 'POUNCE',
});
/** Таран телом — не кусает, а сносит массой. */
const BITE_RAM = AB({
  kind: 'bite', body: 'beetleRam', cast: 'pointForward',
  range: 0, damageMul: 1.15, telegraph: 0.3, cooldown: 1.8, weight: 1.2,
  hintRu: 'ТАРАН', hintEn: 'RAM',
});
/** Плоский шлепок слизня всей массой. */
const BITE_SLAM = AB({
  kind: 'bite', body: 'slimeSlam', cast: 'groundPress',
  range: 0, damageMul: 1.1, telegraph: 0.34, cooldown: 2.0, weight: 1.2,
  hintRu: 'НАВАЛ', hintEn: 'SLAM',
});
/** Оружие в руке: обычный мах клинком. */
const BITE_SWEEP = AB({
  kind: 'bite', body: 'weaponSweep', cast: 'weaponBack',
  range: 0, damageMul: 1.0, telegraph: 0.26, cooldown: 1.4, weight: 1.4,
  hintRu: 'УДАР', hintEn: 'STRIKE',
});
/** Когти: росчерк трёх когтей (у зверей вместо оружия). */
const BITE_CLAW = AB({
  kind: 'bite', body: 'pounce', cast: 'pointForward',
  range: 0, damageMul: 1.1, telegraph: 0.28, cooldown: 1.6, weight: 1.3,
  hintRu: 'КОГТИ', hintEn: 'CLAWS',
});
/** Хлыст тьмы на средней дистанции — «ни ближний, ни дальний» удар. */
const BITE_LASH = AB({
  kind: 'bite', body: 'shadowLash', cast: 'circleWard',
  range: 120, damageMul: 1.05, telegraph: 0.34, cooldown: 2.1, weight: 1.1,
  hintRu: 'ХЛЫСТ', hintEn: 'LASH',
});

/**
 * ВЫПАД ОРУЖИЕМ («человеческий» удар). Меч/топор/копьё в руке бьёт НА
 * ДИСТАНЦИИ (не «в упор»): замах оружием за плечо, выпад вперёд. Это то,
 * что просил игрок: «если у персонажа меч — он должен атаковать мечом»,
 * и меч видно на спрайте (свинг-оружие в кисти).
 */
const THRUST_WEAPON = AB({
  kind: 'thrust', body: 'weaponSweep', cast: 'weaponBack',
  range: 70, damageMul: 1.0, telegraph: 0.3, cooldown: 1.6, weight: 3.0,
  hintRu: 'ВЫПАД', hintEn: 'STRIKE',
});

/** РЁВ: тварь вскидывает голову и усиливается (поддержка, не урон по герою). */
const ROAR_BUFF = AB({
  kind: 'roar', body: 'wingBuffet', cast: 'roarRaise',
  range: 0, damageMul: 0, telegraph: 0.5, cooldown: 9, weight: 0.35,
  hintRu: '«РЁВ!»', hintEn: 'ROAR',
});

// ============================================================
// СБОРКА НАБОРА ПО ТВАРИ
// ============================================================
// Первая способность — ТЕЛЕСНАЯ (её диктует анатомия: паук вскидывает лапы,
// слизень наваливается массой, зверь прыгает). Вторая — ДАЛЬНЯЯ, по стихии
// подземелья или оружию: именно она показывает «магию» из руки. Третья —
// редкая поддержка (рёв) и только у крупных тварей: у слизня рёва нет.

/** Телесная способность по анатомии (всегда первая и самая частая). */
const BODY_ABILITY: Record<EnemyShape, MonsterAbility> = {
  blob: AB({ ...BITE_SLAM, weight: 4.4 }),
  beetle: AB({ ...BITE_RAM, weight: 4.4 }),
  spider: AB({ ...BITE, weight: 4.6 }),          // «очень анимированный» укус — ГЛАВНЫЙ приём
  shadow: AB({ ...BITE_LASH, weight: 3.8 }),
  bat: AB({ ...BITE_CLAW, weight: 4.0 }),
  crystal: AB({ ...BITE_RAM, weight: 4.0 }),
  gargoyle: AB({ ...BITE_CLAW, weight: 4.0 }),
  skeleton: AB({ ...BITE_SWEEP, weight: 4.2 }),
  golem: AB({ ...BITE_RAM, weight: 4.4 }),
  imp: AB({ ...BITE_SWEEP, weight: 4.0 }),
  // ВОЛК — зверь: прыжок-укус/когти. Вес 4.6 против 1.0 у редкой магии,
  // чтобы волк атаковал ТЕМ, ЧЕМ ОН И ВЫГЛЯДИТ, а не колдовал.
  wolf: AB({ ...BITE_POUNCE, weight: 4.6 }),
  // ДВУНОГИЕ С ОРУЖИЕМ: у них есть руки, поэтому их «телесная» — это ВЫПАД
  // ИМЕННО СВОИМ ОРУЖИЕМ (меч → удар мечом, топор → топором). Оружие берётся
  // из набора твари в monsterAbilitiesFor(); здесь — запасной вариант.
  humanoid: AB({ ...THRUST_WEAPON, weight: 4.2 }),
  eye: AB({ ...BITE_LASH, weight: 4.0 }),
  spirit: AB({ ...BITE_LASH, weight: 3.6 }),
  dragon: AB({ ...BITE_CLAW, weight: 4.2 }),
};

/** Дальняя способность по стихии подземелья — «магия» из поднятой руки. */
const ELEMENT_ABILITY: Record<Element, MonsterAbility> = {
  fire: SPIT_FIRE,
  ice: SPIT_ICE,
  poison: SPIT_ACID,
  dark: SPIT_DARK,
  storm: SPIT_STORM,
};

/** Дальняя способность по ОРУЖИЮ в руке — если стихии у твари нет. */
const WEAPON_ABILITY: Partial<Record<string, MonsterAbility>> = {
  bow: AB({ ...SPIT_BLOB, arrow: 'plain', body: 'spitBolt', hintRu: 'ВЫСТРЕЛ', hintEn: 'SHOT' }),
  crossbow: AB({ ...SPIT_SHARD, arrow: 'steel', hintRu: 'БОЛТ', hintEn: 'BOLT' }),
  staff: AB({ ...SPIT_DARK, hintRu: 'ЗАКЛИНАНИЕ', hintEn: 'SPELL' }),
  orb: AB({ ...SPIT_SHARD, hintRu: 'СФЕРА', hintEn: 'ORB' }),
  book: AB({ ...SPIT_DARK, hintRu: 'ПЕЧАТЬ', hintEn: 'SIGIL' }),
  torch: AB({ ...SPIT_FIRE, hintRu: 'ОГОНЬ', hintEn: 'FIRE' }),
  horn: AB({ ...SPIT_STORM, hintRu: 'ЗОВ', hintEn: 'CALL' }),
  banner: AB({ ...SPIT_STORM, hintRu: 'КЛИЧ', hintEn: 'CRY' }),
  claw: AB({ ...SPIT_DARK, arrow: 'jag', hintRu: 'ШИПЫ', hintEn: 'SPIKES' }),
  none: SPIT_BLOB,
};

/** Детерминированный хэш строки — набор не «прыгает» между боями. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/**
 * ЛИЧНЫЙ НАБОР ТВАРИ.
 *
 * Порядок важен: [0] — телесная (её вес выше, тварь бьёт ею чаще), [1] —
 * дальняя (стихия подземелья → оружие → «плевок по умолчанию»), [2] — рёв
 * для крупных и летающих.
 *
 * @param shape      анатомия (как тварь выглядит и двигается)
 * @param attackType 'melee' | 'ranged' | 'charger' — влияет на выбор тела
 * @param opts       стихия, оружие и id
 */
export function monsterAbilitiesFor(
  shape: EnemyShape,
  attackType: EnemyAttackType,
  opts: { element?: Element; weapon?: string; id: string } = { id: '' },
): MonsterAbility[] {
  const h = hash(opts.id + shape + attackType);
  // 1) Тело. У двуногих с ОРУЖИЕМ (меч/топор/копьё…) «телесная» — это выпад
  //    ИМЕННО этим оружием: у персонажа с мечом — удар мечом (ТЗ).
  //    Дальние стрелки (лук/арбалет) бьют в упор всё равно оружием/жестом.
  let body = BODY_ABILITY[shape] || BITE_SLAM;
  const handWeapons = ['sword', 'axe', 'hammer', 'mace', 'club', 'halberd', 'spear', 'trident', 'scythe', 'sickle', 'dagger', 'shield'];
  const rangedShapes = shape === 'skeleton' || shape === 'humanoid' || shape === 'imp';
  if (rangedShapes && attackType === 'ranged' && WEAPON_ABILITY[opts.weapon || 'none']) {
    body = BITE_SWEEP;                       // лук/арбалет/посох — «телесная» = жест оружием
  } else if ((shape === 'humanoid' || shape === 'skeleton') && handWeapons.includes(opts.weapon || '')) {
    body = AB({ ...THRUST_WEAPON, weight: 4.4, hintRu: 'ВЫПАД', hintEn: 'STRIKE' });
  } else if (attackType === 'ranged' && rangedShapes) {
    body = BITE_SWEEP;
  }
  // Волк-таран: прыжок-укус остаётся ГЛАВНЫМ приёмом (вес 4.6, как у всех
  // зверных форм). Раньше здесь брался голый BITE_POUNCE с весом 1.3, из-за
  // чего «волк-таран» получал и когти, и прыжок примерно поровну и в бою
  // вёл себя как обычный зверь, а не как нападающий из засады.
  if (attackType === 'charger' && shape === 'wolf') {
    body = AB({ ...BITE_POUNCE, weight: 4.6, hintRu: 'ПРЫЖОК', hintEn: 'POUNCE' });
  }

  // 2) Дальняя: стихия → оружие → плевок. Для ближних тварей без оружия
  //    (слизень, зверь) плевок всё равно есть — это их «вторая способность».
  //    ИСКЛЮЧЕНИЯ (ТЗ):
  //    - ВОЛК — зверь, у него ТОЛЬКО телесные атаки (pounce/claws), никакой магии;
  //    - ПАУК — основа укус, паутина идёт РЕДКИМ третьим слотом (weight 0.75
  //      против 4.6 у укуса), а не вторым, чтобы сеть не вытесняла укус;
  //    - ОРУЖИЕ ОПРЕДЕЛЯЕТ АТАКУ: меч → удар мечом, лук → выстрел, посох →
  //      заклинание (слоты уже подобраны в WEAPON_ABILITY/BODY_ABILITY).
  const weapon = opts.weapon || 'none';
  const biped = shape === 'humanoid' || shape === 'skeleton';
  // Дальняя способность по стихии подземелья, иначе — по оружию в руке,
  // иначе — «плевок по умолчанию».
  const ranged =
    (opts.element && ELEMENT_ABILITY[opts.element]) ||
    WEAPON_ABILITY[weapon] ||
    (shape === 'spider' ? SPIT_WEB : SPIT_BLOB);
  // МЕЧНИК НЕ ПЛЮЁТ (ТЗ): двуногий с БЛИЖНИМ оружием в руке не получает
  // дальнюю стихийную способность; он бьёт СВОИМ оружием.
  const elementRanged = biped && handWeapons.includes(weapon) ? null : ranged;
  // КЛАСС ТВАРИ. ТЗ: «у монстров способности под ОДИН класс — либо
  // дальнобойный, либо ближнебойный; 1–2 способности, редко 3; и только у
  // боссов бывает смесь двух классов». Поэтому дальний слот добавляем ТОЛЬКО
  // тем, кого подземелье пометило `ranged` (или у кого в руке дальнее оружие —
  // лук/арбалет/посох). Мелешная тварь (melee/charger) НЕ получает плевок —
  // иначе голем-кувалда вдруг стрелял бы магией из-за цвета подземелья.
  const weaponIsRanged = !!opts.weapon && opts.weapon !== 'none'
    && !!WEAPON_ABILITY[opts.weapon] && !handWeapons.includes(opts.weapon);
  const isRangedClass = attackType === 'ranged' || weaponIsRanged;
  const out: MonsterAbility[] = [];
  if (shape === 'wolf') {
    // ВОЛК — зверь: только телесные приёмы (прыжок-укус и редкие когти),
    // ни магии, ни плевков. Это уже проверяет abilityaudit.
    out.push(body, AB({ ...BITE_CLAW, weight: 1.1, cooldown: 2.6, hintRu: 'КОГТИ', hintEn: 'CLAWS' }));
  } else if (shape === 'spider') {
    // ПАУК: [0] укус хелицерами (часто), [1] редкая паутина (замедляет). Паук —
    // многоножка-охотник, поэтому его «вторая» — это ловчая сеть, а не магия.
    out.push(body, AB({ ...SPIT_WEB, weight: 0.75, cooldown: 5.0 }));
  } else if (isRangedClass) {
    // ДАЛЬНИЙ КЛАСС: главный приём — дальнобойный (выстрел/заклинание/плевок).
    // Двуногий дополнительно получает РЕДКИЙ ближний выпад, чтобы в упор не
    // оставаться беспомощным (лучник бьёт прикладом/кинжалом). Звероформа —
    // только дальний.
    const primary = (opts.weapon && WEAPON_ABILITY[opts.weapon]) || elementRanged || ranged;
    out.push(AB({ ...primary, weight: 4.2 }));
    if (biped) {
      out.push(AB({ ...THRUST_WEAPON, weight: 1.0, cooldown: 3.0, hintRu: 'УДАР В УПОР', hintEn: 'CLOSE HIT' }));
    }
  } else {
    // БЛИЖНИЙ КЛАСС (melee/charger): только телесные удары — 1–2 приёма того
    // же «языка». Никакой магии: слизень, голем и жук остаются собой в любом
    // подземелье.
    out.push(body);
    // Второй приём ВСЕГДА отличается от первого и по телу, и по подсказке.
    const bodyBody = body.body;
    const pick2 = (): MonsterAbility | null => {
      if (biped && handWeapons.includes(weapon)) {
        // Двуногий-мечник: первый приём — выпад, второй — широкий мах (или
        // наоборот): два разных удара мечом, а не два одинаковых.
        return bodyBody === 'weaponSweep'
          ? AB({ ...BITE_SWEEP, weight: 1.1, cooldown: 2.6, hintRu: 'РАЗМАХ', hintEn: 'CLEAVE' })
          : AB({ ...THRUST_WEAPON, weight: 1.1, cooldown: 2.6, hintRu: 'ВЫПАД', hintEn: 'STRIKE' });
      }
      switch (shape) {
        case 'golem': case 'gargoyle':
          return bodyBody === 'slimeSlam' ? AB({ ...BITE_RAM, weight: 1.0, cooldown: 2.8, hintRu: 'ТАРАН', hintEn: 'RAM' })
            : AB({ ...BITE_SLAM, weight: 1.0, cooldown: 2.8, hintRu: 'ОБРУШЕНИЕ', hintEn: 'CRUSH' });
        case 'beetle': case 'crystal':
          return bodyBody === 'beetleRam' ? AB({ ...BITE_SLAM, weight: 1.0, cooldown: 2.6, hintRu: 'НАВАЛ', hintEn: 'SLAM' })
            : AB({ ...BITE_RAM, weight: 1.0, cooldown: 2.6, hintRu: 'ТАРАН', hintEn: 'RAM' });
        case 'blob':
          return AB({ ...BITE_RAM, weight: 1.0, cooldown: 2.6, hintRu: 'ТОЛЧОК', hintEn: 'SHOVE' });
        case 'bat': case 'spirit': case 'shadow': case 'eye':
          return AB({ ...BITE, weight: 1.0, cooldown: 2.6, hintRu: 'ХВАТКА', hintEn: 'GRAB' });
        case 'dragon':
          return AB({ ...BITE_RAM, weight: 1.0, cooldown: 2.8, hintRu: 'ТАРАН', hintEn: 'RAM' });
        default:
          return AB({ ...BITE_RAM, weight: 1.0, cooldown: 2.6, hintRu: 'ТАРАН', hintEn: 'RAM' });
      }
    };
    const second = pick2();
    if (second && !(second.body === bodyBody && second.hintRu === out[0].hintRu)) out.push(second);
  }

  // 3) Рёв — РЕДКАЯ третья у крупных силуэтов (только у ~половины по id): это
  //    поддержка-самобафф, не урон. У слизня/жука/волка/паука рёва нет.
  const big = shape === 'golem' || shape === 'gargoyle' || shape === 'dragon'
    || shape === 'humanoid' || shape === 'skeleton' || shape === 'imp';
  if (out.length <= 2 && big && (h & 3) === 0) out.push(ROAR_BUFF);
  return out.slice(0, 3);
}

/**
 * ТЕЛЕСНАЯ АТАКА ПО УМОЛЧАНИЮ (совместимость со старой логикой движка):
 * если у твари почему-то пустой набор, ближний удар берётся из анатомии —
 * ровно как раньше (signatureFor).
 */
export function defaultBodySignature(shape: EnemyShape, attackType: EnemyAttackType): SignatureKind {
  return signatureFor(shape, attackType);
}
