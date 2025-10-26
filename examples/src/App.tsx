import React from "react";
import { Pipeline, type RenderRequest } from "@chameleon/core";
import { GalaceanAdapter } from "@chameleon/adapters/src";


import { attachLoggerToPipeline } from "@chameleon/core";
import { PipelineAdapterPlugin, DefCameraControlPlugin, DefGalaceanInteractionPlugin } from "@chameleon/plugins";
import { EnvironmentSkyboxPlugin } from "./plugins/EnvironmentSkyboxPlugin";
// import { CameraControlPlugin } from "./plugins/CameraControlPlugin";

import Layout from "./layout";
import SceneCard from "./components/SceneCard";
import ReplaceSceneCard from "./components/ReplaceSceneCard";

// import { attachInterceptorToPipeline } from "@chameleon/core";

// expose for devtools
declare global {
  interface Window {
    __GLPIPE_CTX__: any;
    __GLPIPE_PLUGINS__: any[];
  }
}


export default function App() {
  // const [ctxRef, setCtxRef] = useState<any>(null);

  const loadBasicDemo = async (canvas: HTMLCanvasElement) => {
    const adapter = new GalaceanAdapter();
    const pipeline = new Pipeline(adapter);
    attachLoggerToPipeline(pipeline, console);
    // attach plugins
    const plugins = [
      new PipelineAdapterPlugin(),
      new DefCameraControlPlugin(),
      // new EnvironmentSkyboxPlugin(),
    ];
    plugins.forEach((p) => pipeline.use(p));

    const data: RenderRequest = { id: "demo", source: 'https://gw.alipayobjects.com/os/bmw-prod/d6dbf161-48e2-4e6d-bbca-c481ed9f1a2d.gltf' };
    let ctx = {}
    try {
      ctx = await pipeline.run(canvas as HTMLCanvasElement, data);
    } catch (e: any) {
    }
    return [pipeline, ctx];
  };

  const loadGltfandSetEnvDemo = async (canvas: HTMLCanvasElement) => {
    const adapter = new GalaceanAdapter();
    const pipeline = new Pipeline(adapter);
    attachLoggerToPipeline(pipeline, console);
    // attach plugins
    const plugins = [
      new PipelineAdapterPlugin(),
      new DefCameraControlPlugin(),
      new EnvironmentSkyboxPlugin(),
    ];
    plugins.forEach((p) => pipeline.use(p));

    const data: RenderRequest = { id: "demo", source: 'https://gw.alipayobjects.com/os/bmw-prod/d6dbf161-48e2-4e6d-bbca-c481ed9f1a2d.gltf' };
    let ctx = {}
    try {
      ctx = await pipeline.run(canvas as HTMLCanvasElement, data);
    } catch (e: any) {
    }
    return [pipeline, ctx];
  };



  const loadBasicGltfAndFreeControlDemo = async (canvas: HTMLCanvasElement) => {
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
    let ctx = {}
    try {
      ctx = await pipeline.run(canvas as HTMLCanvasElement, data);
    } catch (e: any) {
    }
    return [pipeline, ctx];
  };



  return (
    <Layout >
      {/* <SceneCard title="only load gltf modeal" description="use GLTFLoaderPlugin load gltf" onCanvasReady={(loadBasicDemo)} />
      <SceneCard title="Load GLTF and set evn" description="use GLTFLoaderPlugin load gltf" onCanvasReady={(loadGltfandSetEnvDemo)} />
      <SceneCard title="Load GLTF and and interaction with model" description="try to load" onCanvasReady={(loadBasicGltfAndFreeControlDemo)} />
      <ReplaceSceneCard/> */}
      <ReplaceSceneCard/> 

    </Layout>
  );

}
