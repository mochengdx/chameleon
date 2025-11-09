import { GalaceanAdapter } from "@chameleon/adapters";
import type { IPlugin, RenderingContext } from "@chameleon/core";
import { attachLoggerToPipeline, Pipeline, type RenderRequest } from "@chameleon/core";
import { DefCameraControlPlugin, DefGalaceanInteractionPlugin, PipelineAdapterPlugin } from "@chameleon/plugins";
import React, { useCallback, useEffect, useRef } from "react";
import { EnvironmentSkyboxPlugin } from "../plugins/EnvironmentSkyboxPlugin";
import { LoadingPlugin } from "../plugins/LoadingPlugin";
import SceneCard from "./SceneCard";

import { ActionButton } from "./ActionButton";

// ...existing code...
const ReplacementGLTFs = [
  { id: "2CylinderEngine", url: "https://gw.alipayobjects.com/os/bmw-prod/48a1e8b3-06b4-4269-807d-79274e58283a.glb" },
  {
    id: "alphaBlendModeTest",
    url: "https://gw.alipayobjects.com/os/bmw-prod/d099b30b-59a3-42e4-99eb-b158afa8e65d.glb"
  },
  { id: "animatedCube", url: "https://gw.alipayobjects.com/os/bmw-prod/8cc524dd-2481-438d-8374-3c933adea3b6.gltf" },
  { id: "antiqueCamera", url: "https://gw.alipayobjects.com/os/bmw-prod/93196534-bab3-4559-ae9f-bcb3e36a6419.glb" },
  { id: "avocado", url: "https://gw.alipayobjects.com/os/bmw-prod/0f978c4d-1cd6-4cec-9a4c-b58c8186e063.glb" },
  { id: "avocado_draco", url: "https://gw.alipayobjects.com/os/bmw-prod/b3b73614-cf06-4f41-940d-c1bc04cf6410.gltf" },
  { id: "avocado_specular", url: "https://gw.alipayobjects.com/os/bmw-prod/3cf50452-0015-461e-a172-7ea1f8135e53.gltf" },
  {
    id: "avocado_quantized",
    url: "https://gw.alipayobjects.com/os/bmw-prod/6aff5409-8e82-4e77-a6ac-55b6adfd0cf5.gltf"
  },
  { id: "barramundiFish", url: "https://gw.alipayobjects.com/os/bmw-prod/79d7935c-404b-4d8d-9ad3-5f8c273f0e4a.glb" },
  { id: "boomBox", url: "https://gw.alipayobjects.com/os/bmw-prod/2e98b1c0-18e8-45d0-b54e-dcad6ef05e22.glb" },
  { id: "boomBoxWithAxes", url: "https://gw.alipayobjects.com/os/bmw-prod/96e1b8b2-9be6-4b64-98ea-8c008c6dc422.gltf" },
  { id: "boxVertexColors", url: "https://gw.alipayobjects.com/os/bmw-prod/6cff6fcb-5191-465e-9a38-dee42a07cc65.glb" },
  { id: "brianStem", url: "https://gw.alipayobjects.com/os/bmw-prod/e3b37dd9-9407-4b5c-91b3-c5880d081329.glb" },
  { id: "buggy", url: "https://gw.alipayobjects.com/os/bmw-prod/d6916a14-b004-42d5-86dd-d8520b719288.glb" },
  { id: "cesiumMan", url: "https://gw.alipayobjects.com/os/bmw-prod/3a7d9597-7354-4bef-b314-b84509bef9b6.glb" },
  { id: "cesiumMilkTruck", url: "https://gw.alipayobjects.com/os/bmw-prod/7701125a-7d0d-4281-a7d8-7f0df8d0792.glb" },
  { id: "corset", url: "https://gw.alipayobjects.com/os/bmw-prod/3deaa5a4-5b2a-4a0d-8512-a8c4377a08ff.glb" },
  { id: "DamagedHelmet", url: "https://gw.alipayobjects.com/os/bmw-prod/a1da72a4-023e-4bb1-9629-0f4b0f6b6fc4.glb" },
  { id: "Duck", url: "https://gw.alipayobjects.com/os/bmw-prod/6cb8f543-285c-491a-8cfd-57a1160dc9ab.glb" },
  { id: "environmentTest", url: "https://gw.alipayobjects.com/os/bmw-prod/7c7b887c-05d6-43dd-b354-216e738e81ed.gltf" },
  { id: "flightHelmet", url: "https://gw.alipayobjects.com/os/bmw-prod/d6dbf161-48e2-4e6d-bbca-c481ed9f1a2d.gltf" },
  { id: "fox", url: "https://gw.alipayobjects.com/os/bmw-prod/f40ef8dd-4c94-41d4-8fac-c1d2301b6e47.glb" },
  {
    id: "animationInterpolationTest",
    url: "https://gw.alipayobjects.com/os/bmw-prod/4f410ef2-20b4-494d-85f1-a806c5070bfb.glb"
  },
  { id: "lantern", url: "https://gw.alipayobjects.com/os/bmw-prod/9557420a-c622-4e9c-bb46-f7af8b19d7de.glb" },
  {
    id: "materialsVariantsShoe",
    url: "https://gw.alipayobjects.com/os/bmw-prod/b1a414bb-61ea-4667-94d2-ef6cf179ac0d.glb"
  },
  { id: "metalRoughSpheres", url: "https://gw.alipayobjects.com/os/bmw-prod/67b39ede-1c82-4321-8457-0ad83ca9413a.glb" },
  { id: "normalTangentTest", url: "https://gw.alipayobjects.com/os/bmw-prod/4bb1a66c-55e3-4898-97d7-a9cc0f239686.glb" },
  {
    id: "normalTangentMirrorTest",
    url: "https://gw.alipayobjects.com/os/bmw-prod/8335f555-2061-47f5-9252-366c6ebf882a.glb"
  },
  { id: "orientationTest", url: "https://gw.alipayobjects.com/os/bmw-prod/16cdf390-ac42-411c-9d2b-8e112dfd723b.glb" },
  { id: "sparseTest", url: "https://gw.alipayobjects.com/os/bmw-prod/f00de659-53ea-49d1-8f2c-d0a412542b80.gltf" },
  {
    id: "specGlossVsMetalRough",
    url: "https://gw.alipayobjects.com/os/bmw-prod/4643bd7b-f988-4144-8245-4a390023d92d.glb"
  },
  { id: "sponza", url: "https://gw.alipayobjects.com/os/bmw-prod/ca50859b-d736-4a3e-9fc3-241b0bd2afef.gltf" },
  { id: "suzanne", url: "https://gw.alipayobjects.com/os/bmw-prod/3869e495-2e04-4e80-9d22-13b37116379a.gltf" },
  { id: "sheenChair", url: "https://gw.alipayobjects.com/os/bmw-prod/34847225-bc1b-4bef-9cb9-6b9711ca2f8c.glb" },
  { id: "sheenCloth", url: "https://gw.alipayobjects.com/os/bmw-prod/4529d2e8-22a8-47af-9b38-8eaff835f6bf.gltf" },
  {
    id: "textureCoordinateTest",
    url: "https://gw.alipayobjects.com/os/bmw-prod/5fd23201-51dd-4eea-92d3-c4a72ecc1f2b.glb"
  },
  {
    id: "textureEncodingTest",
    url: "https://gw.alipayobjects.com/os/bmw-prod/b8795e57-3c2c-4412-b4f0-7ffa796e4917.glb"
  },
  {
    id: "textureSettingTest",
    url: "https://gw.alipayobjects.com/os/bmw-prod/a4b26d58-bd49-4051-8f05-0fe8b532e716.glb"
  },
  {
    id: "textureTransformMultiTest",
    url: "https://gw.alipayobjects.com/os/bmw-prod/8fa18786-5188-4c14-94d7-77bf6b8483f9.glb"
  },
  { id: "textureTransform", url: "https://gw.alipayobjects.com/os/bmw-prod/6c59d5d0-2e2e-4933-a737-006d431977fd.gltf" },
  { id: "toyCar", url: "https://gw.alipayobjects.com/os/bmw-prod/8138b7d7-45aa-494a-8aea-0c67598b96d2.glb" },
  { id: "transmissionTest", url: "https://gw.alipayobjects.com/os/bmw-prod/1dd51fe8-bdd3-42e4-99be-53de5dc106b8.glb" },
  { id: "unlitTest", url: "https://gw.alipayobjects.com/os/bmw-prod/06a855be-ac8c-4705-b5d7-659b8b391189.glb" },
  { id: "vc", url: "https://gw.alipayobjects.com/os/bmw-prod/b71c4212-25fb-41bb-af88-d79ce6d3cc58.glb" },
  { id: "vertexColorTest", url: "https://gw.alipayobjects.com/os/bmw-prod/8fc70cc6-66d8-43c8-b460-f7d2aaa9edcf.glb" },
  { id: "waterBottle", url: "https://gw.alipayobjects.com/os/bmw-prod/0f403530-96f5-455a-8a39-b31ac68b6ed5.glb" }
];

function getRandomReplacement() {
  const idx = Math.floor(Math.random() * ReplacementGLTFs.length);
  return ReplacementGLTFs[idx];
}
/**
 * Sider
 * - One-row list item with left (title + description) and right (canvas demo).
 * - Uses Tailwind CSS utility classes. Each item occupies one row with vertical spacing.
 */
export default function ReplaceSceneCard({}) {
  const pipieRef = useRef<{ pipeline: Pipeline | null; ctx: RenderingContext }>(null);
  const [loading, setLoading] = React.useState<boolean>(false);
  console.log("Render ReplaceSceneCard", loading);
  const loadBasicGltfAndFreeControlDemo = async (canvas: HTMLCanvasElement) => {
    const adapter = new GalaceanAdapter();
    const pipeline = new Pipeline(adapter);
    attachLoggerToPipeline(pipeline, console);
    // attach plugins
    const plugins = [
      new LoadingPlugin(setLoading),
      new PipelineAdapterPlugin(),
      new DefCameraControlPlugin(),
      new DefGalaceanInteractionPlugin(),
      new EnvironmentSkyboxPlugin()
    ];
    plugins.forEach((p) => pipeline.use(p));

    const data: RenderRequest = {
      id: "demo",
      source: "https://gw.alipayobjects.com/os/bmw-prod/93196534-bab3-4559-ae9f-bcb3e36a6419.glb"
    };
    let ctx: RenderingContext = {} as RenderingContext;
    try {
      ctx = await pipeline.run(canvas as HTMLCanvasElement, data);
    } catch (e: any) {}
    pipieRef.current = { pipeline, ctx };
    return [pipeline, ctx];
  };

  const handleReplace = async () => {
    if (!pipieRef.current) {
      return;
    }
    const { pipeline, ctx } = pipieRef.current;

    // attach plugins
    const plugins: IPlugin[] = [
      // new PipelineAdapterPlugin(),
      // new DefCameraControlPlugin(),
      // new DefGalaceanInteractionPlugin(),
      new EnvironmentSkyboxPlugin()
    ];
    plugins.forEach((p) => pipeline!.use(p));
    const data: RenderRequest = {
      id: "demo",
      source: getRandomReplacement().url
    };
    ctx.request = data;
    try {
      ctx.abortController.abort();
      await pipeline!.runFrom("resourceLoad", ctx);
    } catch (e: any) {
      console.error("Error during model replacement:", e);
      setLoading(false);
    }
    pipieRef.current = { pipeline, ctx };
    return [pipeline, ctx];
  };

  const handleSkyBox = useCallback(async () => {
    if (!pipieRef?.current?.pipeline) {
      return;
    }
    const { pipeline } = pipieRef.current;
    pipeline.use(new EnvironmentSkyboxPlugin());
  }, []);

  const handleUninstall = useCallback(async () => {
    if (!pipieRef?.current?.pipeline) {
      return;
    }
    const { pipeline } = pipieRef.current;
    pipeline.uninstall("EnvironmentSkyboxPlugin");
  }, []);

  useEffect(() => {}, []);

  return (
    <SceneCard
      externalNode={
        <>
          <ActionButton onClick={handleReplace}>Dynamic model replacement </ActionButton>
          <ActionButton onClick={handleSkyBox}>Use Skybox </ActionButton>
          <ActionButton onClick={handleUninstall}>Uninstall </ActionButton>
        </>
      }
      title="Dynamic Model Replacement via Chameleon Plugin System"
      loading={loading}
      description="Implemented a dynamic model replacement feature using the Chameleon plugin system.
        This enhancement allows individual 3D models to be seamlessly swapped at runtime without restarting or reinitializing the engine.
        By leveraging the plugin architecture, model-specific logic—such as material customization, shader injection, or scene-dependent behaviors—can now be registered and applied dynamically.
        This approach provides a flexible and engine-agnostic workflow, enabling developers to extend or modify model behavior through pluggable components rather than hardcoded logic."
      onCanvasReady={loadBasicGltfAndFreeControlDemo}
    />
  );
}
