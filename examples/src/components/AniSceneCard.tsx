import { GalaceanAdapter } from "@chameleon/adapters";
import type { RenderingContext } from "@chameleon/core";
import { attachLoggerToPipeline, Pipeline, type RenderRequest } from "@chameleon/core";
import {
  DefCameraControlPlugin,
  DefGalaceanInteractionPlugin,
  GalceanAnimationPlugin,
  PipelineAdapterPlugin
} from "@chameleon/plugins";
import React, { useEffect, useRef } from "react";

import { EnvironmentSkyboxPlugin } from "../plugins/EnvironmentSkyboxPlugin";
import { LoadingPlugin } from "../plugins/LoadingPlugin";

import SceneCard from "./SceneCard";

/**
 * Sider
 * - One-row list item with left (title + description) and right (canvas demo).
 * - Uses Tailwind CSS utility classes. Each item occupies one row with vertical spacing.
 */
export default function AniSceneCard({}) {
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
      new EnvironmentSkyboxPlugin(),
      new GalceanAnimationPlugin({
        idle: "ani_bipedIdleV01_idle001",
        enter: "ani_bipedPreV01_entrance001",
        click: "ani_bipedPreV01_dance001"
      })
    ];
    plugins.forEach((p) => pipeline.use(p));

    const data: RenderRequest = {
      id: "demo",
      // source: "https://gw.alipayobjects.com/os/bmw-prod/5e3c1e4e-496e-45f8-8e05-f89f2bd5e4a4.glb"

      source: "https://mdn.alipayobjects.com/chain_myent/afts/file/L0FlSKqLR88AAAAAAAAAAAAADvN2AQBr"
    };
    let ctx: RenderingContext = {} as RenderingContext;
    try {
      ctx = await pipeline.run(canvas as HTMLCanvasElement, data);
    } catch (e: any) {}
    pipieRef.current = { pipeline, ctx };
    return [pipeline, ctx];
  };

  useEffect(() => {}, []);

  return (
    <SceneCard
      externalNode={
        <>
          {/* <ActionButton onClick={handleReplace}>Dynamic model replacement </ActionButton>
          <ActionButton onClick={handleSkyBox}>Use Skybox </ActionButton>
           <ActionButton onClick={handleUninstall}>Uninstall </ActionButton> */}
        </>
      }
      title="Galacean Animation Plugin — Single-model enter / idle / click animations"
      loading={loading}
      description="This demo shows the built-in GalaceanAnimationPlugin which manages three 
      common animations for a single model: an 'enter' entrance sequence, a looping 'idle' 
      state, and a user-triggered 'click' animation. The plugin integrates with the Chameleon pipeline, 
      discovers the parsed glTF entity, configures simple state transitions, tries model-aware picking (camera + physics) 
      for clicks, and falls back gracefully to container clicks when engine features are unavailable.
       Clip names are configurable per model so you can adapt behavior without code changes."
      onCanvasReady={loadBasicGltfAndFreeControlDemo}
    />
  );
}
