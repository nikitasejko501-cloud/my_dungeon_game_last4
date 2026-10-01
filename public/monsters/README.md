# PNG-спрайты монстров и боссов (опционально)

Игра работает **без** этих файлов: если PNG нет, рисуется процедурный пиксель-арт
(`src/monsterArt.ts`). Как только PNG появляется — движок сразу берёт его вместо
процедурного (`src/spriteLoader.ts`).

## Куда класть

| Кто | Путь | Пример |
|---|---|---|
| Монстр | `public/monsters/<id>.png` | `public/monsters/slime.png` |
| Босс | `public/monsters/bosses/<id>.png` | `public/monsters/bosses/field_boss.png` |

`<id>` — это поле `id` из `src/gameData.ts` / `src/dungeonMonsters.ts`
(например `slime`, `spider`, `ruins_boss`).

## Требования к картинке

- PNG с прозрачным фоном, квадрат (например 128×128 или 256×256).
- Персонаж по центру, смотрит **вправо**.
- Пиксель-арт или живопись — рендер идёт без сглаживания (`imageSmoothingEnabled = false`),
  поэтому лучше рисовать в пиксель-стиле, как на референсе.

## Кадры анимации (по желанию)

По умолчанию один PNG используется для всех кадров (покой, шаг, замах, удар).
Если нужны отдельные кадры, включите флаг в `src/spriteLoader.ts`:

```ts
monsterSprites.usePerFrameFrames = true;
```

и кладите файлы `<id>_<variant>.png`, где `variant`: `idle`, `breath`, `walkA`,
`walkB`, `walkC`, `walkD`, `attackA` (замах), `attackB`, `attackC` (контакт),
`attackD`, `reach`. Пример: `public/monsters/slime_walkA.png`.
