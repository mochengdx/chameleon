import type { IPlugin, Pipeline, RenderingContext } from "@chameleon/core";
import type { AmbientLight, Entity, Renderer, Scene, WebGLEngine } from "@galacean/engine";
import {
  AssetType,
  BackgroundMode,
  BoundingBox,
  Camera,
  MeshRenderer,
  PrimitiveMesh,
  SkyBoxMaterial,
  Vector3
} from "@galacean/engine";
import { OrbitControl } from "@galacean/engine-toolkit";

export class EnvironmentPlugin implements IPlugin {
  name = "EnvironmentPlugin";

  private async setCamamra(ctx: RenderingContext<WebGLEngine, Scene, Entity>) {
    const { camera } = ctx.engineHandles ?? {};
    const { targetEngineEntity } = ctx.parsedGLTF ?? {};

    if (!camera) throw new Error("can not find camera");

    const meshRenderers: Renderer[] = [];
    camera.addComponent(OrbitControl);
    targetEngineEntity.getComponentsIncludeChildren(MeshRenderer, meshRenderers);
    const boundingBox = new BoundingBox();
    boundingBox.min.set(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
    boundingBox.max.set(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);
    meshRenderers.forEach((renderer) => {
      BoundingBox.merge(renderer.bounds, boundingBox, boundingBox);
    });
    const center = new Vector3();
    const extent = new Vector3();

    boundingBox.getExtent(extent);
    const size = extent.length();

    camera.transform.setPosition(0, 0, size);

    boundingBox.getCenter(center);

    const cameraComponent = camera.getComponent(Camera) || ({} as Camera);

    cameraComponent.isOrthographic = false;
    cameraComponent.enableFrustumCulling = false;
    cameraComponent.fieldOfView = 60;
    cameraComponent.nearClipPlane = 0.1;
    cameraComponent.farClipPlane = 1000;
  }

  apply(pipeline: Pipeline) {
    pipeline.hooks.buildScene.tapPromise(this.name, async (ctx: RenderingContext<WebGLEngine, Scene>) => {
      const { scene, engine } = ctx.engineHandles ?? {};
      const typeScene = scene;
      if (!typeScene || !engine) throw new Error("can not find engine and scene");

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
      // Add your logic here
      console.log("Environment loaded:", environment);
      return ctx;
    });

    pipeline.hooks.buildScene.tapPromise(this.name, async (ctx: RenderingContext<WebGLEngine, Scene, Entity>) => {
      await this.setCamamra(ctx);
      // Add your logic here
      return ctx;
    });
  }
}
