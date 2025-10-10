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
export declare class Pipeline {
  adapter: EngineAdapter;
  hooks: StageHooks;
  logger?: PipelineLogger;
  constructor(adapter: EngineAdapter);
  use(plugin: Plugin): void;
  setLogger(logger: PipelineLogger): void;
  run(container: HTMLElement, request: RenderRequest): Promise<RenderingContext>;
  dispose(ctx: RenderingContext): Promise<void>;
}
