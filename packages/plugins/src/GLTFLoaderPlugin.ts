export class GLTFLoaderPlugin {
  name = "GLTFLoaderPlugin";
  apply(pipeline: any) {
    pipeline.hooks.engineInit.tapPromise(this.name, async (ctx: any) => {
      // adapter init
      await ctx.adapter.init(ctx.container, ctx);
    });

    pipeline.hooks.resourceLoad.tapPromise(this.name, async (ctx: any) => {
      if (typeof ctx.request.source === "string") {
        if (ctx.adapter.loadResource) {
          ctx.rawAssets = await ctx.adapter.loadResource(ctx.request.source, ctx);
        } else {
          const r = await fetch(ctx.request.source);
          const t = await r.json().catch(() => r.text());
          ctx.rawAssets = t;
        }
      } else {
        ctx.rawAssets = ctx.request.source;
      }
      return ctx;
    });

    pipeline.hooks.resourceParse.tapPromise(this.name, async (ctx: any) => {
      if (ctx.adapter.parseResource) ctx.parsedGLTF = await ctx.adapter.parseResource(ctx.rawAssets, ctx);
      else ctx.parsedGLTF = ctx.rawAssets;
      return ctx;
    });

    pipeline.hooks.buildScene.tapPromise(this.name, async (ctx: any) => {
      if (ctx.adapter.buildScene) await ctx.adapter.buildScene(ctx.parsedGLTF, ctx);
      return ctx;
    });
  }
}
