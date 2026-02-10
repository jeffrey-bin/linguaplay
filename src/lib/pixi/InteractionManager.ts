import { Sprite, FederatedPointerEvent, Point } from "pixi.js";
import type { KitchenScene } from "./KitchenScene";
import { INTERACTION } from "@/config/constants";

export type InteractionResult = {
  type: "tap" | "drag";
  target: string;
  source: string | null;
  correct: boolean;
  responseTimeMs: number;
};

type InteractionCallback = (result: InteractionResult) => void;

export class InteractionManager {
  private scene: KitchenScene;
  private mode: "tap" | "drag" = "tap";
  private expectedTarget = "";
  private expectedSource: string | null = null;
  private callback: InteractionCallback | null = null;
  private interactionStartTime = 0;
  private dragData: {
    sprite: Sprite;
    startPos: Point;
    offset: Point;
  } | null = null;
  private enabled = false;
  private activeItems: string[] = [];

  constructor(scene: KitchenScene) {
    this.scene = scene;
  }

  activate(
    mode: "tap" | "drag",
    expectedTarget: string,
    expectedSource: string | null,
    targetItems: string[],
    callback: InteractionCallback
  ): void {
    this.mode = mode;
    this.expectedTarget = expectedTarget;
    this.expectedSource = expectedSource;
    this.callback = callback;
    this.interactionStartTime = Date.now();
    this.enabled = true;
    this.activeItems = [...targetItems];

    for (const itemKey of targetItems) {
      const sprite = this.scene.getSprite(itemKey);
      if (!sprite) continue;

      if (mode === "tap") {
        sprite.on("pointertap", this.onTap, this);
      } else {
        sprite.on("pointerdown", this.onDragStart, this);
      }
    }

    // For drag mode, also set up the destination as a drop target
    if (mode === "drag") {
      const destSprite = this.scene.getSprite(expectedTarget);
      if (destSprite && !targetItems.includes(expectedTarget)) {
        destSprite.eventMode = "static";
      }
    }
  }

  deactivate(): void {
    this.enabled = false;
    for (const itemKey of this.activeItems) {
      const sprite = this.scene.getSprite(itemKey);
      if (!sprite) continue;
      sprite.removeAllListeners();
    }
    // Also clean up destination sprite if needed
    if (this.expectedTarget) {
      const destSprite = this.scene.getSprite(this.expectedTarget);
      if (destSprite) destSprite.removeAllListeners();
    }
    this.dragData = null;
    this.activeItems = [];
  }

  private onTap = (event: FederatedPointerEvent): void => {
    if (!this.enabled || !this.callback) return;
    const sprite = event.currentTarget as Sprite;
    const tappedItem = sprite.label;
    const correct = tappedItem === this.expectedTarget;
    const responseTimeMs = Date.now() - this.interactionStartTime;

    this.callback({
      type: "tap",
      target: tappedItem,
      source: null,
      correct,
      responseTimeMs,
    });
  };

  private onDragStart = (event: FederatedPointerEvent): void => {
    if (!this.enabled) return;
    const sprite = event.currentTarget as Sprite;

    if (this.expectedSource && sprite.label !== this.expectedSource) return;
    if (!sprite.parent) return;

    const position = event.getLocalPosition(sprite.parent);
    this.dragData = {
      sprite,
      startPos: new Point(sprite.x, sprite.y),
      offset: new Point(position.x - sprite.x, position.y - sprite.y),
    };
    sprite.alpha = 0.7;
    sprite.zIndex = 100;

    // Bind move/up on the stage for global tracking
    this.scene.app.stage.on("pointermove", this.onDragMove, this);
    this.scene.app.stage.on("pointerup", this.onDragEnd, this);
    this.scene.app.stage.on("pointerupoutside", this.onDragEnd, this);
    this.scene.app.stage.eventMode = "static";
  };

  private onDragMove = (event: FederatedPointerEvent): void => {
    if (!this.dragData || !this.dragData.sprite.parent) return;
    const newPosition = event.getLocalPosition(this.dragData.sprite.parent);
    this.dragData.sprite.x = newPosition.x - this.dragData.offset.x;
    this.dragData.sprite.y = newPosition.y - this.dragData.offset.y;
  };

  private onDragEnd = (): void => {
    if (!this.dragData || !this.callback) return;

    const draggedSprite = this.dragData.sprite;
    draggedSprite.alpha = 1;
    draggedSprite.zIndex = 0;

    // Remove stage listeners
    this.scene.app.stage.off("pointermove", this.onDragMove, this);
    this.scene.app.stage.off("pointerup", this.onDragEnd, this);
    this.scene.app.stage.off("pointerupoutside", this.onDragEnd, this);

    const targetSprite = this.scene.getSprite(this.expectedTarget);
    const correct = targetSprite
      ? this.hitTest(draggedSprite, targetSprite)
      : false;

    if (!correct) {
      draggedSprite.x = this.dragData.startPos.x;
      draggedSprite.y = this.dragData.startPos.y;
    }

    const responseTimeMs = Date.now() - this.interactionStartTime;
    this.callback({
      type: "drag",
      target: this.expectedTarget,
      source: draggedSprite.label,
      correct,
      responseTimeMs,
    });

    this.dragData = null;
  };

  private hitTest(a: Sprite, b: Sprite): boolean {
    const boundsA = a.getBounds();
    const boundsB = b.getBounds();
    const overlapX = Math.max(
      0,
      Math.min(boundsA.x + boundsA.width, boundsB.x + boundsB.width) -
        Math.max(boundsA.x, boundsB.x)
    );
    const overlapY = Math.max(
      0,
      Math.min(boundsA.y + boundsA.height, boundsB.y + boundsB.height) -
        Math.max(boundsA.y, boundsB.y)
    );
    const overlapArea = overlapX * overlapY;
    const smallerArea = Math.min(
      boundsA.width * boundsA.height,
      boundsB.width * boundsB.height
    );
    return overlapArea > smallerArea * INTERACTION.DRAG_OVERLAP_THRESHOLD;
  }
}
