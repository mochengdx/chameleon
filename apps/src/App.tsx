/* eslint-disable react/react-in-jsx-scope, max-len, @typescript-eslint/no-explicit-any */
import { GalaceanAdapter } from "@chameleon/adapters/src";
import { attachLoggerToPipeline, Pipeline, type RenderRequest } from "@chameleon/core";
import { DefCameraControlPlugin, PipelineAdapterPlugin } from "@chameleon/plugins";
import { EnvironmentSkyboxPlugin } from "./plugins/EnvironmentSkyboxPlugin";
// import { CameraControlPlugin } from "./plugins/CameraControlPlugin";

import AniSceneCard from "./components/AniSceneCard";
import ReplaceSceneCard from "./components/ReplaceSceneCard";
import ShaderSceneCard from "./components/ShaderSceneCard";
import Layout from "./layout";

// import { attachInterceptorToPipeline } from "@chameleon/core";

// expose for devtools
declare global {
  interface Window {
    __GLPIPE_CTX__: any;
    __GLPIPE_PLUGINS__: any[];
    __GLPIPE_EXAMPLES__?: Record<string, any>;
  }
}

export default function App() {
  // const [ctxRef, setCtxRef] = useState<any>(null);

  // keep helper functions for local dev but they are unused in production
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const loadBasicDemo = async (canvas: HTMLCanvasElement) => {
    const adapter = new GalaceanAdapter();
    const pipeline = new Pipeline(adapter);
    attachLoggerToPipeline(pipeline, console);
    // attach plugins
    const plugins = [
      new PipelineAdapterPlugin(),
      new DefCameraControlPlugin()
      // new EnvironmentSkyboxPlugin(),
    ];
    plugins.forEach((p) => pipeline.use(p));

    const data: RenderRequest = {
      id: "demo",
      source: "https://gw.alipayobjects.com/os/bmw-prod/d6dbf161-48e2-4e6d-bbca-c481ed9f1a2d.gltf"
    };
    let ctx = {} as any;
    try {
      ctx = await pipeline.run(canvas as HTMLCanvasElement, data);
    } catch (err: any) {
      // surface a local warning to aid debugging without failing builds
      // eslint-disable-next-line no-console
      console.warn("Pipeline run failed:", err);
    }
    return [pipeline, ctx];
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const loadGltfandSetEnvDemo = async (canvas: HTMLCanvasElement) => {
    const adapter = new GalaceanAdapter();
    const pipeline = new Pipeline(adapter);
    attachLoggerToPipeline(pipeline, console);
    // attach plugins
    const plugins = [new PipelineAdapterPlugin(), new DefCameraControlPlugin(), new EnvironmentSkyboxPlugin()];
    plugins.forEach((p) => pipeline.use(p));

    const data: RenderRequest = {
      id: "demo",
      source: "https://gw.alipayobjects.com/os/bmw-prod/d6dbf161-48e2-4e6d-bbca-c481ed9f1a2d.gltf"
    };
    let ctx = {} as any;
    try {
      ctx = await pipeline.run(canvas as HTMLCanvasElement, data);
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.warn("Pipeline run failed:", err);
    }
    return [pipeline, ctx];
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const loadBasicGltfAndFreeControlDemo = async (canvas: HTMLCanvasElement) => {
    const adapter = new GalaceanAdapter();
    const pipeline = new Pipeline(adapter);
    attachLoggerToPipeline(pipeline, console);
    // attach plugins
    const plugins = [
      new PipelineAdapterPlugin()
      // new DefCameraControlPlugin(),
      // new DefGalaceanInteractionPlugin()
    ];
    plugins.forEach((p) => pipeline.use(p));

    const data: RenderRequest = {
      id: "demo",
      source: "https://mdn.alipayobjects.com/chain_myent/afts/file/G4BCQYX6t4gAAAAAAAAAAAAADvN2AQBr"
    };
    let ctx = {} as any;
    try {
      ctx = await pipeline.run(canvas as HTMLCanvasElement, data);
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.warn("Pipeline run failed:", err);
    }
    return [pipeline, ctx];
  };

  // Expose helpers for interactive debugging in the browser/devtools so they
  // are not flagged as unused by the TypeScript compiler. This keeps the
  // functions available for manual testing without affecting production.
  // eslint-disable-next-line no-undef
  window.__GLPIPE_EXAMPLES__ = {
    loadBasicDemo,
    loadGltfandSetEnvDemo,
    loadBasicGltfAndFreeControlDemo
  };

  return (
    <Layout>
      {/* <SceneCard title="only load gltf modeal" description="use GLTFLoaderPlugin load gltf" onCanvasReady={(loadBasicDemo)} />
      <SceneCard title="Load GLTF and set evn" description="use GLTFLoaderPlugin load gltf" onCanvasReady={(loadGltfandSetEnvDemo)} />
      <SceneCard title="Load GLTF and and interaction with model" description="try to load" onCanvasReady={(loadBasicGltfAndFreeControlDemo)} />
      <ReplaceSceneCard/> */}
      <ReplaceSceneCard />
      <AniSceneCard />
      <ShaderSceneCard />
    </Layout>
  );
}
