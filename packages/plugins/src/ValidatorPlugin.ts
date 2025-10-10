export class ValidatorPlugin {
  name = "ValidatorPlugin";
  apply(pipeline: any) {
    pipeline.hooks.resourceParse.tapPromise(this.name, async (ctx: any) => {
      const raw = ctx.rawAssets;
      if (raw && raw.asset && !raw.asset.version) {
        console.warn("[ValidatorPlugin] glTF missing asset.version");
        return false; // bail -> pipeline should treat false as validation fail
      }
      return ctx;
    });
  }
}
