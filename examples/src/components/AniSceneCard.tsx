/* eslint-disable @typescript-eslint/no-explicit-any */
import { GalaceanAdapter } from "@chameleon/adapters";
import type { IPlugin, RenderingContext } from "@chameleon/core";
import { attachLoggerToPipeline, Pipeline, type RenderRequest } from "@chameleon/core";
import {
  DefCameraControlPlugin,
  DefGalaceanInteractionPlugin,
  GalaceanModelClickPlugin,
  GalceanAnimationPlugin,
  PipelineAdapterPlugin
} from "@chameleon/plugins";
import React, { useEffect, useRef } from "react";

import { EnvironmentSkyboxPlugin } from "../plugins/EnvironmentSkyboxPlugin";
import { LoadingPlugin } from "../plugins/LoadingPlugin";
import { disposePipelineForCanvas, getPipelineForCanvas, setPipelineForCanvas } from "../utils/pipelineManager";

import { ActionButton } from "./ActionButton";
import SceneCard from "./SceneCard";

/**
 * Sider
 * - One-row list item with left (title + description) and right (canvas demo).
 * - Uses Tailwind CSS utility classes. Each item occupies one row with vertical spacing.
 */
export default function AniSceneCard() {
  const pipieRef = useRef<{ pipeline: Pipeline | null; ctx: RenderingContext }>(null);
  const [loading, setLoading] = React.useState<boolean>(false);
  const loadBasicGltfAndFreeControlDemo = async (canvas: HTMLCanvasElement) => {
    const existing = getPipelineForCanvas(canvas);
    let pipeline: Pipeline | undefined;
    if (existing) {
      pipeline = existing.pipeline;
    } else {
      const adapter = new GalaceanAdapter();
      pipeline = new Pipeline(adapter);
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
        }),
        new GalaceanModelClickPlugin()
      ];
      plugins.forEach((p) => pipeline!.use(p));
    }

    const data: RenderRequest = {
      id: "demo",
      // source: "https://gw.alipayobjects.com/os/bmw-prod/5e3c1e4e-496e-45f8-8e05-f89f2bd5e4a4.glb"

      source: "https://mdn.alipayobjects.com/chain_myent/afts/file/L0FlSKqLR88AAAAAAAAAAAAADvN2AQBr"
    };
    let ctx: RenderingContext = {} as RenderingContext;
    try {
      ctx = await pipeline.run(canvas as HTMLCanvasElement, data);
    } catch (e: any) {
      // surface a warning so lint/staged won't reject the commit and
      // we have a visible signal during local development.
      // eslint-disable-next-line no-console
      console.warn("Pipeline run failed:", e);
      setLoading(false);
    }
    pipieRef.current = { pipeline, ctx };
    try {
      setPipelineForCanvas(canvas, { pipeline: pipeline!, ctx });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("setPipelineForCanvas failed:", err);
    }
    return [pipeline, ctx];
  };

  const handleReload = async () => {
    if (!pipieRef.current) {
      return;
    }
    const { pipeline, ctx } = pipieRef.current;

    // attach plugins
    const plugins: IPlugin[] = [];
    plugins.forEach((p) => pipeline!.use(p));
    const data: RenderRequest = {
      id: "demo",
      source: "https://mdn.alipayobjects.com/chain_myent/afts/file/L0FlSKqLR88AAAAAAAAAAAAADvN2AQBr"
    };
    ctx.request = data;
    try {
      ctx.abortController.abort();
      await pipeline!.runFrom("resourceLoad", ctx);
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error("Error during model replacement:", e);
      setLoading(false);
    }
    pipieRef.current = { pipeline, ctx };
    return [pipeline, ctx];
  };

  // cleanup on unmount: dispose pipeline if exists
  useEffect(() => {
    return () => {
      try {
        const entry = pipieRef.current;
        if (entry && entry.ctx && entry.ctx.container) {
          disposePipelineForCanvas(entry.ctx.container as HTMLElement);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("Error during cleanup:", err);
      }
    };
  }, []);

  return (
    <SceneCard
      externalNode={
        <>
          <ActionButton onClick={handleReload}>Reload </ActionButton>
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
