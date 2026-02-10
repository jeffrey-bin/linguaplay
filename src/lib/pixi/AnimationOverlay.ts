import { CANVAS } from "@/config/constants";

export class AnimationOverlay {
  private overlayContainer: HTMLDivElement;
  private canvasScale = 1;

  constructor(gameContainer: HTMLDivElement) {
    this.overlayContainer = document.createElement("div");
    this.overlayContainer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 10;
    `;
    gameContainer.style.position = "relative";
    gameContainer.appendChild(this.overlayContainer);
  }

  updateScale(container: HTMLDivElement): void {
    const containerW = container.clientWidth;
    const containerH = container.clientHeight;
    this.canvasScale = Math.min(
      containerW / CANVAS.WIDTH,
      containerH / CANVAS.HEIGHT
    );
  }

  async playAnimation(
    animationFile: string,
    canvasX: number,
    canvasY: number,
    durationMs: number = 2000
  ): Promise<void> {
    const displayX = canvasX * this.canvasScale;
    const displayY = canvasY * this.canvasScale;
    const size = 150 * this.canvasScale;

    const animDiv = document.createElement("div");
    animDiv.style.cssText = `
      position: absolute;
      left: ${displayX - size / 2}px;
      top: ${displayY - size / 2}px;
      width: ${size}px;
      height: ${size}px;
      pointer-events: none;
    `;
    this.overlayContainer.appendChild(animDiv);

    try {
      const { DotLottie } = await import("@lottiefiles/dotlottie-web");
      const canvas = document.createElement("canvas");
      canvas.width = 300;
      canvas.height = 300;
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      animDiv.appendChild(canvas);

      const dotLottie = new DotLottie({
        canvas,
        src: `/assets/kitchen/animations/${animationFile}`,
        autoplay: true,
        loop: false,
      });

      await new Promise<void>((resolve) => {
        setTimeout(() => {
          dotLottie.destroy();
          animDiv.remove();
          resolve();
        }, durationMs);
      });
    } catch (err) {
      console.error("Lottie animation error:", err);
      animDiv.remove();
    }
  }

  destroy(): void {
    this.overlayContainer.remove();
  }
}
