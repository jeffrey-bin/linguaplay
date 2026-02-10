import { Application, Container, Sprite, Texture, Assets } from "pixi.js";
import { createItemSprite } from "./SpriteSheet";
import { assignPositions, getItemPosition } from "./ItemPositionMap";
import { CANVAS } from "@/config/constants";
import vocabularyMap from "@/config/vocabulary-map.json";

export class KitchenScene {
  app: Application;
  private backgroundSprite: Sprite | null = null;
  private itemContainer: Container;
  private spriteSheetTexture: Texture | null = null;
  private itemSprites: Map<string, Sprite> = new Map();

  constructor(app: Application) {
    this.app = app;
    this.itemContainer = new Container();
    this.itemContainer.label = "items";
    this.itemContainer.sortableChildren = true;
    this.app.stage.addChild(this.itemContainer);
  }

  async loadAssets(): Promise<void> {
    const bgTexture = await Assets.load(
      "/assets/kitchen/kitchen-background.png"
    );
    this.backgroundSprite = new Sprite(bgTexture);
    this.backgroundSprite.width = CANVAS.WIDTH;
    this.backgroundSprite.height = CANVAS.HEIGHT;
    this.app.stage.addChildAt(this.backgroundSprite, 0);

    this.spriteSheetTexture = await Assets.load(
      "/assets/kitchen/food-and-utensil.png"
    );
  }

  setupForInstruction(
    targetItems: string[],
    distractors: string[],
    expectedAction: {
      type: string;
      target: string;
      source: string | null;
    }
  ): void {
    this.clearItems();
    assignPositions(targetItems, distractors, expectedAction);

    const allItems = [...targetItems, ...distractors];
    const vocab = vocabularyMap.vocabulary as Record<string, any>;

    for (const itemKey of allItems) {
      const vocabItem = vocab[itemKey];
      if (!vocabItem || !this.spriteSheetTexture) continue;

      const sprite = createItemSprite(
        this.spriteSheetTexture,
        vocabItem,
        itemKey
      );
      const pos = getItemPosition(itemKey);
      sprite.x = pos.x;
      sprite.y = pos.y;

      this.itemContainer.addChild(sprite);
      this.itemSprites.set(itemKey, sprite);
    }
  }

  getSprite(itemKey: string): Sprite | undefined {
    return this.itemSprites.get(itemKey);
  }

  getAllSprites(): Map<string, Sprite> {
    return this.itemSprites;
  }

  clearItems(): void {
    this.itemContainer.removeChildren();
    this.itemSprites.clear();
  }
}
