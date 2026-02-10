import { Texture, Rectangle, Sprite } from "pixi.js";
import { SPRITE } from "@/config/constants";
import type { VocabularyItem } from "@/types/game";

const textureCache = new Map<string, Texture>();

export function getItemTexture(
  baseTexture: Texture,
  item: VocabularyItem,
  itemKey: string
): Texture {
  if (textureCache.has(itemKey)) {
    return textureCache.get(itemKey)!;
  }

  const [row, col] = item.sprite_position;
  const frame = new Rectangle(
    col * SPRITE.CELL_WIDTH,
    row * SPRITE.CELL_HEIGHT,
    SPRITE.CELL_WIDTH,
    SPRITE.CELL_HEIGHT
  );
  const texture = new Texture({
    source: baseTexture.source,
    frame,
  });
  textureCache.set(itemKey, texture);
  return texture;
}

export function createItemSprite(
  baseTexture: Texture,
  item: VocabularyItem,
  itemKey: string
): Sprite {
  const texture = getItemTexture(baseTexture, item, itemKey);
  const sprite = new Sprite(texture);
  sprite.anchor.set(0.5);
  sprite.eventMode = "static";
  sprite.cursor = "pointer";
  sprite.label = itemKey;
  sprite.scale.set(SPRITE.DISPLAY_SCALE);
  return sprite;
}
