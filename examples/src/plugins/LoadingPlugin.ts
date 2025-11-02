import type { IPlugin, Pipeline, RenderingContext } from "@chameleon/core";

export class LoadingPlugin implements IPlugin {
  name = "LoadingPlugin";
  
  updateLoading: (loading: boolean) => void;

  constructor(updateLoading: (loading: boolean) => void) {
    this.updateLoading = updateLoading;
  }

  apply(pipeline: Pipeline) {
    pipeline.hooks.resourceLoad.tapPromise(this.name, async (ctx) => {
      this.updateLoading(true);
      return ctx;
    });
    pipeline.hooks.postProcess.tapPromise(this.name, async (ctx) => {
      this.updateLoading(false);
      return ctx;
    });
  }
}
