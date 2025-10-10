// dynamic import style; to use Galacean, install @galacean/engine
import type { RenderingContext } from "@chameleon/core";
import { Engine } from "@galacean/engine";

export class GalaceanAdapter {
  name = "galacean";
  private engine: any;
  private scene: any;
  private camera: any;

  async init(container: HTMLElement, ctx?: RenderingContext) {
    // const galacean = await import('@galacean/engine').catch((e) => {
    //   console.warn('Galacean not available. Install @galacean/engine to enable.');
    //   throw e;
    // });
    // const { Engine } = galacean;
    this.engine = new Engine(container);
    this.engine.run();
    this.scene = this.engine.sceneManager.activeScene;
    this.camera = this.scene.createRootEntity("Camera");
    ctx && (ctx.engineHandles = { engine: this.engine, scene: this.scene, camera: this.camera });
  }

  async loadResource(src: string) {
    if (!this.engine) throw new Error("Galacean engine not initialized");
    return this.engine.resourceManager.load(src);
  }

  async parseResource(resource: any) {
    return resource;
  }

  async buildScene(parsed: any, ctx?: RenderingContext) {
    if (parsed?.defaultSceneRoot) {
      this.scene.addRootEntity(parsed.defaultSceneRoot);
      ctx && (ctx.scene = this.scene);
    }
    return ctx;
  }

  startRenderLoop(ctx: RenderingContext, onFrame: (dt: number) => void) {
    const loop = () => {
      if (ctx.abortSignal && ctx.abortSignal.aborted) return;
      if (this.engine && this.engine.update) this.engine.update();
      onFrame(0);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  stopRenderLoop() {}
  async applyCustomShader(_shader: any, _ctx: RenderingContext) {
    console.warn("Galacean custom shader application needs implementation specific to engine API.");
  }
  dispose() {
    this.engine?.destroy && this.engine.destroy();
  }
}
