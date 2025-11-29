import type { IPlugin, Pipeline, RenderingContext } from "@chameleon/core";
export class EnvironmentPlugin implements IPlugin {
  name = "EnvironmentPlugin";

  apply(pipeline: Pipeline) {
    pipeline.hooks.buildScene.tapPromise(this.name, async (ctx: RenderingContext) => {
      return ctx;
    });
  }
}
