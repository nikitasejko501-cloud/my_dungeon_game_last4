// === OPTIONAL PNG SPRITE PIPELINE — «положи PNG в public/monsters, и игра возьмёт его» ===
// Ничего не ломается, пока PNG нет: движок рисует процедурный пиксель-арт из monsterArt.ts.
// Имена файлов = id монстра/босса из gameData.ts (например /monsters/slime.png).
export const MONSTER_SPRITE_DIR = '/monsters';
export const BOSS_SPRITE_DIR = '/monsters/bosses';
type SpriteStatus = 'idle' | 'loading' | 'ready' | 'broken';
interface SpriteSlot {
  img: HTMLImageElement;
  status: SpriteStatus;
}
/**
 * Загрузчик одного спрайта на id: файл ищется как <dir>/<id>.png.
 * Если включить usePerFrameFrames, сначала пробуется <id>_<variant>.png (walkA, attackC…).
 */
export class MonsterSpriteSheet {
  usePerFrameFrames = false;
  private base = new Map<string, SpriteSlot>();
  private frames = new Map<string, SpriteSlot>();
  private whiteCache = new Map<string, HTMLCanvasElement>();
  dirFor(boss: boolean): string {
    return boss ? BOSS_SPRITE_DIR : MONSTER_SPRITE_DIR;
  }
  baseUrl(id: string, boss: boolean): string {
    return `${this.dirFor(boss)}/${id}.png`;
  }
  frameUrl(id: string, boss: boolean, variant: string): string {
    return `${this.dirFor(boss)}/${id}_${variant}.png`;
  }
  private request(map: Map<string, SpriteSlot>, key: string, url: string): HTMLImageElement {
    let slot = map.get(key);
    if (!slot) {
      const img = new Image();
      slot = { img, status: 'loading' };
      map.set(key, slot);
      img.onload = () => { slot!.status = 'ready'; };
      img.onerror = () => { slot!.status = 'broken'; };
      img.src = url;
    }
    return slot.img;
  }
  private ready(map: Map<string, SpriteSlot>, key: string): HTMLImageElement | null {
    const slot = map.get(key);
    return slot && slot.status === 'ready' ? slot.img : null;
  }
  /** Готовый кадр или null (тогда рисуется процедурный арт). */
  get(id: string, boss: boolean, variant: string): HTMLImageElement | null {
    const baseKey = (boss ? 'B|' : 'M|') + id;
    if (this.usePerFrameFrames) {
      const frameKey = baseKey + '|' + variant;
      const frame = this.ready(this.frames, frameKey);
      if (frame) return frame;
      if (this.frames.get(frameKey)?.status !== 'broken') {
        this.request(this.frames, frameKey, this.frameUrl(id, boss, variant));
      }
    }
    const base = this.ready(this.base, baseKey);
    if (base) return base;
    if (this.base.get(baseKey)?.status !== 'broken') {
      this.request(this.base, baseKey, this.baseUrl(id, boss));
    }
    return null;
  }
  /** Белая версия PNG для вспышки при уроне (собирается один раз). */
  white(id: string, boss: boolean, variant: string): HTMLCanvasElement | null {
    const img = this.get(id, boss, variant);
    if (!img) return null;
    const key = (boss ? 'B|' : 'M|') + id + '|' + variant;
    const cached = this.whiteCache.get(key);
    if (cached) return cached;
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const c = canvas.getContext('2d');
    if (!c) return null;
    c.drawImage(img, 0, 0);
    c.globalCompositeOperation = 'source-atop';
    c.fillStyle = 'rgba(255,255,255,0.92)';
    c.fillRect(0, 0, canvas.width, canvas.height);
    this.whiteCache.set(key, canvas);
    return canvas;
  }
  /** Сколько спрайтов реально подключено (для консоли/дебага). */
  readyCount(): number {
    let n = 0;
    this.base.forEach(s => { if (s.status === 'ready') n++; });
    this.frames.forEach(s => { if (s.status === 'ready') n++; });
    return n;
  }
}
export const monsterSprites = new MonsterSpriteSheet();
