export class CustomShaderPlugin {
  name = "CustomShaderPlugin";
  apply(pipeline: any) {
    pipeline.hooks.resourceParse.tapPromise(this.name, async (ctx: any) => {
      const parsed = ctx.parsedGLTF;
      if (!parsed) return ctx;
      const ext = (parsed?.extensions && parsed.extensions.EXT_customShader) || null;
      if (ext && ext.shader) {
        try {
          const shaderText = await fetch(ext.shader).then((r) => r.text());
          ctx.customShader = { code: shaderText, vertex: ext.vertex, uniforms: ext.uniforms ?? {} };
        } catch (e) {
          console.warn("[CustomShaderPlugin] fetch shader failed", e);
        }
      }
      return ctx;
    });

    pipeline.hooks.buildScene.tapPromise(this.name, async (ctx: any) => {
      if (ctx.customShader && ctx.adapter.applyCustomShader) {
        await ctx.adapter.applyCustomShader(ctx.customShader, ctx);
      }
      return ctx;
    });
  }
}
