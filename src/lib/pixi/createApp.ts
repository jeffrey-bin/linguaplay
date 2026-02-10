import { Application } from "pixi.js";
import { CANVAS } from "@/config/constants";

export type PixiAppHandle = {
  app: Application;
  destroy: () => void;
};

export async function createPixiApp(
  container: HTMLDivElement
): Promise<PixiAppHandle> {
  const app = new Application();
  await app.init({
    width: CANVAS.WIDTH,
    height: CANVAS.HEIGHT,
    background: CANVAS.BACKGROUND_COLOR,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
    antialias: true,
  });

  container.appendChild(app.canvas as HTMLCanvasElement);
  resizeToFit(app, container);

  const observer = new ResizeObserver(() => resizeToFit(app, container));
  observer.observe(container);

  return {
    app,
    destroy() {
      observer.disconnect();
      app.destroy(true);
    },
  };
}

function resizeToFit(app: Application, container: HTMLDivElement) {
  if (!app.canvas) return;
  const containerW = container.clientWidth;
  const containerH = container.clientHeight;
  const scale = Math.min(containerW / CANVAS.WIDTH, containerH / CANVAS.HEIGHT);
  const canvas = app.canvas as HTMLCanvasElement;
  canvas.style.width = `${CANVAS.WIDTH * scale}px`;
  canvas.style.height = `${CANVAS.HEIGHT * scale}px`;
}
