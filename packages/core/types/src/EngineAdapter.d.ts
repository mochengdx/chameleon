import type { RenderingContext } from "./RenderingContext";
export interface EngineAdapter {
  readonly name: string;
  initEngine(container: HTMLElement, ctx: RenderingContext): Promise<any>;
  loadResource(src: string, ctx: RenderingContext): Promise<any>;
  buildScene(parsed: any, ctx: RenderingContext): Promise<any>;
  startRenderLoop(ctx: RenderingContext, onFrame: (t: number) => void): void;
  createTextureFromElement(el: HTMLVideoElement | HTMLImageElement): any;
  updateVideoTexture?(el: HTMLVideoElement): void;
  dispose(): void;
}
