import { GalaceanAdapter } from "@chameleon/adapters";
import type { IPlugin, RenderingContext } from "@chameleon/core";
import { attachLoggerToPipeline, Pipeline, type RenderRequest } from "@chameleon/core";
import {
  ANTMaterialShaderPlugin,
  DefCameraControlPlugin,
  DefGalaceanInteractionPlugin,
  PipelineAdapterPlugin
} from "@chameleon/plugins";
import React, { useEffect, useRef } from "react";

import { EnvironmentSkyboxPlugin } from "../plugins/EnvironmentSkyboxPlugin";
import { LoadingPlugin } from "../plugins/LoadingPlugin";

import { ActionButton } from "./ActionButton";
import SceneCard from "./SceneCard";

/**
 * Sider
 * - One-row list item with left (title + description) and right (canvas demo).
 * - Uses Tailwind CSS utility classes. Each item occupies one row with vertical spacing.
 */
export default function ShaderSceneCard({}) {
  const pipieRef = useRef<{ pipeline: Pipeline | null; ctx: RenderingContext }>(null);
  const [loading, setLoading] = React.useState<boolean>(false);
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
      // new GalaceanModelClickPlugin()
    ];
    plugins.forEach((p) => pipeline.use(p));

    const data: RenderRequest = {
      id: "demo",
      // source: "https://gw.alipayobjects.com/os/bmw-prod/5e3c1e4e-496e-45f8-8e05-f89f2bd5e4a4.glb"

      source: "./assets/shaders/card/model.gltf"
    };
    let ctx: RenderingContext = {} as RenderingContext;
    try {
      ctx = await pipeline.run(canvas as HTMLCanvasElement, data);
    } catch (e: any) {}
    pipieRef.current = { pipeline, ctx };
    return [pipeline, ctx];
  };

  const handleReload = async () => {
    if (!pipieRef.current) {
      return;
    }
    const { pipeline, ctx } = pipieRef.current;

    // attach plugins
    const plugins: IPlugin[] = [new ANTMaterialShaderPlugin()];
    plugins.forEach((p) => pipeline!.use(p));
    const data: RenderRequest = {
      id: "demo",
      source: "./assets/shaders/card/model.gltf"
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

  useEffect(() => {}, []);

  return (
    <SceneCard
      externalNode={
        <>
          <ActionButton onClick={handleReload}>Use Edge Shader </ActionButton>
        </>
      }
      title="Custom Shader Rendering Driven by glTF Extensions"
      loading={loading}
      description="This example demonstrates how to drive custom shader-based materials in Chameleon by 
      embedding extension metadata directly inside glTF files. During resource parsing, a plugin recognizes 
      the extension payload and maps its parameters to engine-specific material uniforms, shader defines, 
      and texture bindings. At render time, the model is rendered with the declared special effects 
      (for example: energy flows, rim glows, per-face emissive waves), 
      enabling visually distinctive results without modifying raw geometry."
      onCanvasReady={loadBasicGltfAndFreeControlDemo}
    />
  );
}
