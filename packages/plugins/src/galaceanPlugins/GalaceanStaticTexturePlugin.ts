// ...existing code...
import type { IPlugin, Pipeline, RenderingContext } from "@chameleon/core";
import type { WebGLEngine, Scene, Entity } from "@galacean/engine";

export class GalaceanStaticTexturePlugin implements IPlugin {
  public name = "GalaceanStaticTexturePlugin";

  constructor(public textureName: string) {}

  apply(pipeline: Pipeline) {
    pipeline.hooks.buildScene.tapPromise(this.name, async (ctx: RenderingContext<WebGLEngine, Scene, Entity>) => {
      const { scene, engine } = ctx.engineHandles ?? {};
      if (!scene || !engine) {
        return ctx;
      }
      return ctx;
    });
  }

  unapply(pipeline: Pipeline): void {
    pipeline?.uninstall(this.name);
  }
}
