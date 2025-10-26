import { GalaceanAdapter } from "@chameleon/adapters";
import { attachLoggerToPipeline, Pipeline, type RenderRequest } from "@chameleon/core";
import { DefCameraControlPlugin, DefGalaceanInteractionPlugin, PipelineAdapterPlugin } from "@chameleon/plugins";
import React, { useRef, useEffect, useCallback } from "react";
import SceneCard from "./SceneCard";
import type { RenderingContext } from "@chameleon/core";
import { EnvironmentSkyboxPlugin } from "../plugins/EnvironmentSkyboxPlugin";


/**
 * Sider
 * - One-row list item with left (title + description) and right (canvas demo).
 * - Uses Tailwind CSS utility classes. Each item occupies one row with vertical spacing.
 */
export default function ReplaceSceneCard({
}) {

    const pipieRef = useRef<{ pipeline: Pipeline | null, ctx: RenderingContext }>(null);
    const loadBasicGltfAndFreeControlDemo = async (canvas: HTMLCanvasElement) => {
        console.log('loadBasicGltfAndFreeControlDemo');
        const adapter = new GalaceanAdapter();
        const pipeline = new Pipeline(adapter);
        attachLoggerToPipeline(pipeline, console);
        // attach plugins
        const plugins = [
            new PipelineAdapterPlugin(),
            new DefCameraControlPlugin(),
            new DefGalaceanInteractionPlugin()
        ];
        plugins.forEach((p) => pipeline.use(p));

        const data: RenderRequest = { id: "demo", source: 'https://mdn.alipayobjects.com/chain_myent/afts/file/G4BCQYX6t4gAAAAAAAAAAAAADvN2AQBr' };
        let ctx: RenderingContext = {} as RenderingContext
        try {
            ctx = await pipeline.run(canvas as HTMLCanvasElement, data);
        } catch (e: any) {
        }
        pipieRef.current = { pipeline, ctx };
        return [pipeline, ctx];
    };

    const handleReplace = async () => {
        if (!pipieRef.current) {
            return;
        }
        const { pipeline, ctx } = pipieRef.current;

        // attach plugins
        const plugins = [
            // new PipelineAdapterPlugin(),
            // new DefCameraControlPlugin(),
            // new DefGalaceanInteractionPlugin(),
            new EnvironmentSkyboxPlugin(),
        ];
        plugins.forEach((p) => pipeline!.use(p));
        const data: RenderRequest = { id: "demo", source: 'https://gw.alipayobjects.com/os/bmw-prod/8cc524dd-2481-438d-8374-3c933adea3b6.gltf' };
        ctx.request = data;
        try {
            await pipeline!.runFrom("resourceLoad", ctx);
        } catch (e: any) {
        }
        pipieRef.current = { pipeline, ctx };
        return [pipeline, ctx];
    }

    useEffect(() => {

    }, []);

    return (
        <SceneCard externalNode={<button onClick={handleReplace}>Replace</button>} title="Replace GLTF" description="try to load22" onCanvasReady={(loadBasicGltfAndFreeControlDemo)} />
    );
}