import { Graphics, Ticker } from "pixi.js";
import type { KitchenScene } from "./KitchenScene";
import type { GameInstruction } from "@/types/game";
import { CANVAS } from "@/config/constants";

export class HintRenderer {
  private scene: KitchenScene;
  private activeEffects: Array<{ cleanup: () => void }> = [];

  constructor(scene: KitchenScene) {
    this.scene = scene;
  }

  showHint(
    level: 1 | 2 | 3,
    strategy: GameInstruction["hint_strategy"]
  ): void {
    switch (level) {
      case 1:
        this.showGlow(strategy.level_1.target);
        break;
      case 2:
        this.showArrow(strategy.level_2.target);
        break;
      case 3:
        this.showHighlightAll();
        break;
    }
  }

  private showGlow(targetItemKey: string): void {
    const sprite = this.scene.getSprite(targetItemKey);
    if (!sprite) return;

    const glow = new Graphics();
    glow.circle(0, 0, 80);
    glow.fill({ color: 0xffd700, alpha: 0.4 });
    glow.x = sprite.x;
    glow.y = sprite.y;

    const parent = sprite.parent;
    if (!parent) return;
    const idx = parent.getChildIndex(sprite);
    parent.addChildAt(glow, idx);

    let time = 0;
    const tickerFn = (ticker: Ticker) => {
      time += ticker.deltaTime * 0.05;
      const scale = 1 + Math.sin(time) * 0.15;
      glow.scale.set(scale);
      glow.alpha = 0.3 + Math.sin(time) * 0.2;
    };
    Ticker.shared.add(tickerFn);

    this.activeEffects.push({
      cleanup: () => {
        Ticker.shared.remove(tickerFn);
        glow.destroy();
      },
    });
  }

  private showArrow(targetItemKey: string): void {
    const sprite = this.scene.getSprite(targetItemKey);
    if (!sprite) return;

    const arrow = new Graphics();
    const baseY = -100;

    // Arrow line
    arrow.moveTo(0, baseY);
    arrow.lineTo(0, baseY + 50);
    arrow.stroke({ width: 6, color: 0xff6b35 });

    // Arrowhead
    arrow.moveTo(-15, baseY + 35);
    arrow.lineTo(0, baseY + 55);
    arrow.lineTo(15, baseY + 35);
    arrow.fill({ color: 0xff6b35 });

    arrow.x = sprite.x;
    arrow.y = sprite.y;
    if (!sprite.parent) return;
    sprite.parent.addChild(arrow);

    let time = 0;
    const tickerFn = (ticker: Ticker) => {
      time += ticker.deltaTime * 0.08;
      arrow.y = sprite.y + Math.sin(time) * 10;
    };
    Ticker.shared.add(tickerFn);

    this.activeEffects.push({
      cleanup: () => {
        Ticker.shared.remove(tickerFn);
        arrow.destroy();
      },
    });
  }

  private showHighlightAll(): void {
    const dimOverlay = new Graphics();
    dimOverlay.rect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);
    dimOverlay.fill({ color: 0x000000, alpha: 0.3 });
    dimOverlay.eventMode = "none";
    this.scene.app.stage.addChild(dimOverlay);

    // Bring all item sprites to front
    const sprites = this.scene.getAllSprites();
    for (const sprite of sprites.values()) {
      sprite.zIndex = 200;
    }

    this.activeEffects.push({
      cleanup: () => {
        dimOverlay.destroy();
        for (const sprite of sprites.values()) {
          sprite.zIndex = 0;
        }
      },
    });
  }

  clearAll(): void {
    for (const effect of this.activeEffects) {
      effect.cleanup();
    }
    this.activeEffects = [];
  }
}
