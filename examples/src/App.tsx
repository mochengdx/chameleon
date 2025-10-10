import React, { useRef, useState } from "react";
import { GLPipeline } from "@chameleon/core";
import { ThreeAdapter } from "@chameleon/adapters";
import {
  GLTFLoaderPlugin,
  ValidatorPlugin,
  CustomShaderPlugin,
  VideoTexturePlugin,
  DeviceStatePlugin
} from "@chameleon/plugins";
import { PipelineLogger } from "@chameleon/core";
import { attachInterceptorToPipeline } from "@chameleon/core";

// expose for devtools
declare global {
  interface Window {
    __GLPIPE_CTX__: any;
    __GLPIPE_PLUGINS__: any[];
  }
}

export default function App() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState("idle");
  const [ctxRef, setCtxRef] = useState<any>(null);

  const loadDemo = async () => {
    setStatus("initializing");
    const adapter = new ThreeAdapter();
    const pipeline = new GLPipeline(adapter);
    // attach plugins
    const plugins = [
      new GLTFLoaderPlugin(),
      new ValidatorPlugin(),
      new CustomShaderPlugin(),
      new VideoTexturePlugin(),
      new DeviceStatePlugin()
    ];
    plugins.forEach((p) => pipeline.use(p));
    // expose plugin list to devtools
    (window as any).__GLPIPE_PLUGINS__ = plugins.map((p) => ({ name: p.name }));

    const logger = new PipelineLogger();
    pipeline.setLogger(logger);
    attachInterceptorToPipeline(pipeline, logger);
    // expose logger to devtools (devtools app can set this into its store by window global)
    (window as any).__GLPIPE_LOGGER__ = logger;

    // create request with simple inline glTF-like structure
    const DEMO_MODEL = {
      asset: { version: "2.0" },
      materials: [
        { name: "baseMat", extras: {} },
        {
          name: "screenMat",
          extras: {
            "biz:decorate": {
              type: "video",
              source: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4"
            }
          }
        }
      ],
      // For demo we rely on buildScene falling back to programmatic geometry if parsed scene absent.
      nodes: [
        {
          name: "base",
          extras: { materialName: "baseMat", size: { x: 2, y: 0.1, z: 2 }, pos: { x: 0, y: 0.05, z: 0 } }
        },
        {
          name: "screen",
          extras: { materialName: "screenMat", size: { x: 1.2, y: 0.7, z: 0.05 }, pos: { x: 0, y: 0.8, z: 0 } }
        }
      ]
    };

    try {
      const ctx = await pipeline.run(containerRef.current!, { id: "demo", source: DEMO_MODEL });
      // attach pipeline ref for dispose
      (ctx as any).pipelineInstance = pipeline;
      (window as any).__GLPIPE_CTX__ = ctx;
      setCtxRef(ctx);
      setStatus("running");
    } catch (e: any) {
      setStatus("error: " + e.message);
    }
  };

  const abort = () => {
    const ctx = (window as any).__GLPIPE_CTX__;
    if (ctx && ctx.abortController) {
      ctx.abortController.abort();
      setStatus("aborted");
    }
  };

  const dispose = async () => {
    const ctx = (window as any).__GLPIPE_CTX__;
    if (ctx && ctx.pipeline) {
      await ctx.pipeline.dispose(ctx);
      (window as any).__GLPIPE_CTX__ = null;
      setStatus("disposed");
    }
  };

  return (
    <div className="w-screen h-screen flex">
      <div ref={containerRef} style={{ flex: 1, background: "#111" }} />
      <div style={{ width: 360, background: "#0b0b0b", color: "#ddd", padding: 12 }}>
        <div className="flex gap-2">
          <button className="bg-slate-700 px-3 py-1 rounded" onClick={loadDemo}>
            Load Demo
          </button>
          <button className="bg-slate-700 px-3 py-1 rounded" onClick={abort}>
            Abort
          </button>
          <button className="bg-slate-700 px-3 py-1 rounded" onClick={dispose}>
            Dispose
          </button>
        </div>
        <div className="mt-2">Status: {status}</div>
        <div className="mt-4">
          <h4 className="text-sm mb-2">Instructions</h4>
          <div className="text-xs text-slate-300">
            Click "Load Demo" to run pipeline. Open DevTools app separately (port 5174) and it will pick up pipeline
            logger & context exposed on window.
          </div>
        </div>
      </div>
    </div>
  );
}
