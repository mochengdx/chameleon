export class DeviceStatePlugin {
  name = "DeviceStatePlugin";
  apply(pipeline: any) {
    pipeline.hooks.resourceLoad.tapPromise(this.name, async (ctx: any) => {
      try {
        const resp = await fetch("/api/demo/business.json")
          .then((r) => r.json())
          .catch(() => ({ demo: true }));
        ctx.metadata.businessData = resp;
      } catch (e) {
        ctx.metadata.businessData = { demo: true };
      }
      return ctx;
    });

    pipeline.hooks.buildScene.tap(this.name, (ctx: any) => {
      if (!ctx.scene) return ctx;
      ctx.scene.traverse &&
        ctx.scene.traverse((child: any) => {
          if (child.isMesh && ctx.metadata.businessData?.[child.name]) {
            child.userData = child.userData || {};
            child.userData.business = ctx.metadata.businessData[child.name];
          }
        });
      return ctx;
    });

    pipeline.hooks.renderLoop.tap(this.name, (ctx: any) => {
      ctx.scene &&
        ctx.scene.traverse &&
        ctx.scene.traverse((child: any) => {
          if (child.isMesh && child.userData?.business?.pulse) {
            child.material.emissiveIntensity = (Math.sin(performance.now() * 0.005) + 1) * 0.5;
          }
        });
    });
  }
}
