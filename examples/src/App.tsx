import React, { useRef, useState } from "react";
import { Pipeline, type RenderRequest, type IPlugin as PipelinePlugin } from "@chameleon/core";
import { GalaceanAdapter } from "@chameleon/adapters/src";


import { attachLoggerToPipeline } from "@chameleon/core";
import type { RenderingContext } from "@chameleon/core";
import { GLTFLoaderPlugin } from "@chameleon/plugins";
import { EnvironmentPlugin } from "./plugins/EnvironmentPlugin";
import Block from "./components/CanvasBlock";
import Layout from "./layout";
import Sider from "./components/Sider";

// import { attachInterceptorToPipeline } from "@chameleon/core";

// expose for devtools
declare global {
  interface Window {
    __GLPIPE_CTX__: any;
    __GLPIPE_PLUGINS__: any[];
  }
}

// export class GLTFLoaderPlugin implements PipelinePlugin {
//   name = "GLTFLoaderPlugin";
//   apply(pipeline: Pipeline): void {
//     pipeline.hooks.initEngine.tapPromise(this.name, async (ctx: RenderingContext): Promise<void> => {
//       const { container, adapter } = ctx;
//       // const container = document.getElementById('app') as HTMLElement;
//       await adapter.initEngine(container, ctx);
//     });
//   }
// }

export default function App() {
  // const [ctxRef, setCtxRef] = useState<any>(null);

  const loadBasicDemo = async (canvas: HTMLCanvasElement) => {
    const adapter = new GalaceanAdapter();
    const pipeline = new Pipeline(adapter);
    attachLoggerToPipeline(pipeline, console);
    // attach plugins
    const plugins = [
      new GLTFLoaderPlugin(),
      new EnvironmentPlugin(),
    ];
    plugins.forEach((p) => pipeline.use(p));

    const data: RenderRequest = { id: "demo", source: 'https://mdn.alipayobjects.com/chain_myent/uri/file/as/mynftmerchant/202503101107170115.gltf' };
    let ctx = {}
    try {
      ctx = await pipeline.run(canvas as HTMLCanvasElement, data);
    } catch (e: any) {
    }
    return [pipeline, ctx];
  };



  return (
    <Layout >
      <Sider title="Laod GLTF" onCanvasReady={(loadBasicDemo)} />
      <Sider title=" Load GLTF and set evn" description="try to load" onCanvasReady={(loadBasicDemo)} />
    </Layout>
  );

}
