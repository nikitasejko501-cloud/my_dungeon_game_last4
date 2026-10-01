# Промпт для генератора изображений (монстры и боссы)

Файл-подсказка: как просить нейросеть (Midjourney / Stable Diffusion / Flux / DALL·E)
за арт под эту игру. Кладите результат в `public/monsters/<id>.png` (см.
`public/monsters/README.md`) — движок подхватит PNG вместо процедурного пиксель-арта.

## Главный промпт (EN, для Midjourney/SD)

```
pixel art game sprite, dark fantasy monster, 1 monster, centered, facing right,
crisp hard dark outline, 3-tone shading with strong top-left rim light and deep
ambient occlusion at the bottom, glowing eyes, transparent background, 128x128,
pixel-perfect, limited palette, high contrast, readable silhouette,
16-bit console era masters, sharp pixels, no anti-aliasing, no background, no text
```

Для босса добавьте: `boss monster, majestic and terrifying, ornate gold regalia,
crown, shoulder spikes, gem, larger scale, cinematic rim light`.

## Что убрать (negative prompt)

```
photorealistic, 3d render, blurry, smooth gradients, anti-aliased edges,
watermark, text, ui, multiple characters, cropped limbs, extra limbs,
glowing bloom haze, background scenery, weapons made of sticks or clubs
```

> Важно: в этой игре у бесформенных и звериных тварей (слизень, жук, паук, кристалл,
> глаз, тень) **нет предметов в руках** — их атака строится на анатомии. В промпте
> прямо запрещайте «held club / wooden stick / generic sword» для этих форм.

## Стихия в промпт

| Стихия | Ключевые слова |
|---|---|
| poison | `toxic slime, glowing acid core, dripping goo, bubbling` |
| fire | `molten cracks, ember particles, smoky heat haze from body` |
| ice | `frost shards, frozen scales, cold blue rim light` |
| storm | `electric arcs between limbs, sparks, static` |
| dark | `shadow tendrils, void smoke, purple glow inside silhouette` |

## Signature-атаки: что должно быть в кадре

Каждая тварь атакует так, как устроена (это уже работает в коде, `src/signatureAttacks.ts`):

| Форма | Атака | Что рисовать на кадре удара |
|---|---|---|
| blob (слизень) | сжатие → прыжок → слэм массой | сплющенное тело, брызги кислоты, расширяющееся кольцо, лужа |
| beetle (жук) | таран панцирем/рогом | наклон корпуса вперёд, пыль позади, рог в цель |
| spider (паук) | вскидывание → удар лапами | поднятые передние лапы, четыре линии удара |
| wolf (волк) | прыжок-укус | корпус в воздухе, полосы разгона, след когтей |
| golem (голем) | кулаки вверх → обрушение по земле | поднятые руки, пыль, обломки, осевший корпус |
| gargoyle/bat/dragon | порыв крыльями | крылья в размахе, воздушные дуги, перья/капли |
| crystal (кристалл) | разлёт осколков | радиальные шипы, вспышка в ядре |
| shadow (тень) | хлёст щупальцем | тёмный жгут от тела к цели, клубы тьмы |
| eye (глаз) | луч | расширенный зрачок, узкий яркий луч |
| spirit (дух) | выброс энергии | сжимающиеся кольца, вихрь искр |

## Стиль-референс (важно)

Пиксель-арт в духе орочьего референса: **жёсткая чёрная обводка**, три тона на материал
(тень/база/блик), единый источник света сверху-слева, крупные читаемые формы,
глаза-«точки» с ярким свечением. Никакого мягкого градиента и размытия.
