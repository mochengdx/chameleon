import type { IPlugin, Pipeline, RenderingContext } from "@chameleon/core";
import {
  AmbientLight,
  AssetType,
  BackgroundMode,
  PrimitiveMesh,
  WebGLEngine,
  Scene,
  SkyBoxMaterial
} from "@galacean/engine";

export class EnvironmentSkyboxPlugin implements IPlugin {
  name = "EnvironmentSkyboxPlugin";
  origin = {};
  apply(pipeline: Pipeline) {
    pipeline.hooks.buildScene.tapPromise(this.name, async (ctx: RenderingContext<WebGLEngine, Scene>) => {
      console.log("EnvironmentSkyboxPlugin apply");
      const { scene, engine } = ctx.engineHandles ?? {};
      if (!scene || !engine) {
        return ctx;
      }
      const typeScene = scene;
      this.origin = { ...typeScene.background };
      typeScene.background.mode = BackgroundMode.Sky;
      typeScene.background.sky.mesh = PrimitiveMesh.createCuboid(engine, 1, 1, 1);
      const environment = await engine?.resourceManager.load<AmbientLight>({
        type: AssetType.Env,
        url: "https://gw.alipayobjects.com/os/bmw-prod/89c54544-1184-45a1-b0f5-c0b17e5c3e68.bin"
      });
      const skyMaterial = new SkyBoxMaterial(engine);
      typeScene.ambientLight = environment;
      skyMaterial.textureDecodeRGBM = true;
      skyMaterial.texture = environment.specularTexture;
      typeScene.background.sky.material = skyMaterial;
      typeScene.ambientLight.specularIntensity = 1;
      return ctx;
    });
  }
  unapply(pipeline: Pipeline): void {
    // const {} = pipeline;
    // const { scene, engine } = ctx.engineHandles ?? {};
    // if (!scene || !engine) {
    //   return ctx;
    // }
    // typeScene.background = this.origin;
    pipeline.uninstall(this.name);
  }
}
