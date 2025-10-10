import { AsyncSeriesHook, AsyncSeriesWaterfallHook, AsyncSeriesBailHook, AsyncParallelHook, SyncHook } from "tapable";
import type { RenderingContext, RenderRequest } from "./RenderingContext";
import { PipelineLogger } from "./Logger";
import { EngineAdapter } from "./EngineAdapter";
import { Plugin } from "./Plugin";

export type StageHooks = {
  engineInit: AsyncSeriesHook<[RenderingContext]>;
  resourceLoad: AsyncSeriesWaterfallHook<[RenderingContext]>;
  resourceParse: AsyncSeriesBailHook<[RenderingContext], any>;
  buildScene: AsyncSeriesWaterfallHook<[RenderingContext]>;
  renderLoop: AsyncParallelHook<[RenderingContext]>;
  postProcess: AsyncSeriesHook<[RenderingContext]>;
  dispose: SyncHook<[RenderingContext]>;
};

export class Pipeline {
  public hooks: StageHooks;
  public logger?: PipelineLogger;
  // export interface EngineAdapter {
  //   readonly name: string;
  //   init(container: HTMLElement, ctx: RenderingContext): Promise<void>;
  //   loadResource?(src: string, ctx: RenderingContext): Promise<any>;
  //   parseResource?(resource: any, ctx: RenderingContext): Promise<any>;
  //   buildScene?(parsed: any, ctx: RenderingContext): Promise<any>;
  //   startRenderLoop?(ctx: RenderingContext, onFrame: (dt: number) => void): void;
  //   stopRenderLoop?(ctx: RenderingContext): void;
  //   createTextureFromElement?(el: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement): any;
  //   updateVideoTexture?(el: HTMLVideoElement): void;
  //   dispose?(): void;
  // }
  constructor(public adapter: EngineAdapter) {
    this.adapter = adapter;
    this.hooks = {
      engineInit: new AsyncSeriesHook(["ctx"]),
      resourceLoad: new AsyncSeriesWaterfallHook(["ctx"]),
      resourceParse: new AsyncSeriesBailHook(["ctx"]),
      buildScene: new AsyncSeriesWaterfallHook(["ctx"]),
      renderLoop: new AsyncParallelHook(["ctx"]),
      postProcess: new AsyncSeriesHook(["ctx"]),
      dispose: new SyncHook(["ctx"])
    };
  }

  use(plugin: Plugin) {
    plugin.apply(this);
  }

  setLogger(logger: PipelineLogger) {
    this.logger = logger;
  }

  async run(container: HTMLElement, request: RenderRequest): Promise<RenderingContext> {
    const abortController = new AbortController();
    const ctx: RenderingContext = {
      request,
      container,
      adapter: this.adapter,
      metadata: {},
      abortController,
      abortSignal: abortController.signal,
      renderState: { running: false, frameCount: 0 },
      pipeline: this
    };

    const checkAbort = () => {
      if (ctx.abortSignal.aborted) throw new Error("Pipeline aborted");
    };

    // engineInit
    checkAbort();
    await this.hooks.engineInit.promise(ctx);

    // resourceLoad (waterfall)
    checkAbort();
    const afterLoad = await this.hooks.resourceLoad.promise(ctx);
    ctx.rawAssets = afterLoad.rawAssets ?? afterLoad;

    // parse (bail)
    checkAbort();
    const bailResult = await this.hooks.resourceParse.promise(ctx);
    if (bailResult === false) {
      throw new Error("Pipeline resourceParse bail: validation failed");
    }

    // buildScene
    checkAbort();
    const afterBuild = await this.hooks.buildScene.promise(ctx);
    ctx.scene = afterBuild.scene ?? ctx.scene;

    // start render loop (adapter-managed)
    ctx.renderState = ctx.renderState ?? { running: true, frameCount: 0 };
    ctx.renderState.running = true;
    if (this.adapter.startRenderLoop) {
      this.adapter.startRenderLoop(ctx, (dt: number) => {
        ctx.renderState!.frameCount = (ctx.renderState!.frameCount || 0) + 1;
        this.hooks.renderLoop.callAsync(ctx, (err?: any) => {
          if (err) {
            ctx.renderState!.lastError = err;
            this.logger?.push({
              type: "error",
              hook: "renderLoop",
              plugin: "renderLoop",
              start: Date.now(),
              error: String(err)
            });
          }
        });
      });
    } else {
      // call renderLoop once to allow plugins to set up
      await this.hooks.renderLoop.promise(ctx);
    }

    // postProcess
    await this.hooks.postProcess.promise(ctx);

    return ctx;
  }

  async dispose(ctx: RenderingContext) {
    try {
      ctx.abortController.abort();
    } catch (e) {}
    try {
      this.hooks.dispose.call(ctx);
    } catch (e) {}
    // this.adapter.stopRenderLoop?.(ctx);
    this.adapter.dispose?.();
  }
}
