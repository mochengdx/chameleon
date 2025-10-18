import { AsyncSeriesHook, AsyncSeriesWaterfallHook, AsyncSeriesBailHook, AsyncParallelHook, SyncHook } from "tapable";
import type { RenderingContext, RenderRequest } from "./RenderingContext";
import { Logger } from "./Logger";
import { EngineAdapter } from "./EngineAdapter";
import { IPlugin } from "@/Plugin";

/**
 *StageHooks - typed collection of pipeline hooks.
 * Each hook's generic parameter lists the tuple of arguments that hook callbacks receive.
| Hook                       | Execution Order                                | Stops Execution Condition             | Use Case                                                                                                                              |
| -------------------------- | ---------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `AsyncSeriesHook`          | Serial execution                               | No stop condition                     | When you need to execute a series of asynchronous tasks in order, one after another.                                                  |
| `AsyncSeriesWaterfallHook` | Serial execution, passes results between hooks | No stop condition                     | When each step in the process depends on the result of the previous one, like in a chain of asynchronous operations.                  |
| `AsyncSeriesBailHook`      | Serial execution                               | Stops on first non-`undefined` return | When you need to abort further execution if a task fails or returns a specific value. Useful for validation or early exit scenarios.  |
| `AsyncParallelHook`        | Parallel execution                             | No stop condition                     | When you want to execute multiple asynchronous tasks in parallel and wait for all of them to complete before moving to the next step. |
 */
export type StageHooks = {
  // Initialize the rendering engine
  initEngine: AsyncSeriesHook<[RenderingContext]>;
  // Load resources (e.g., models, textures)
  resourceLoad: AsyncSeriesWaterfallHook<[RenderingContext]>;
  // Parse and validate loaded resources
  resourceParse: AsyncSeriesBailHook<[RenderingContext], any>;
  // Build the scene (e.g., create objects, set up lights)
  buildScene: AsyncSeriesWaterfallHook<[RenderingContext]>;
  // Main render loop, called every frame
  renderLoop: AsyncParallelHook<[RenderingContext]>;
  // Post-processing after rendering
  postProcess: AsyncSeriesHook<[RenderingContext]>;
  // Cleanup and dispose resources
  dispose: SyncHook<[RenderingContext]>;
};
/**
 * Pipeline - orchestrates the rendering lifecycle using hooks and an EngineAdapter.
 * Generic parameters allow strong typing across different engines/adapters.
 * @export
 * @class Pipeline
 * @template TEngine
 * @template TScene
 * @template TCamera
 * @template TOptions
 */
export class Pipeline<TEngine = any, TScene = any, TCamera = any, TOptions = any> {
    // public, readonly hooks collection exposed for plugins to tap into
  public readonly hooks: StageHooks;

  // logger instance; default to PipelineLogger but can be swapped for testing or silencing
  public logger: Logger = console;

  /**
   * Construct a Pipeline with a concrete EngineAdapter.
   * @param adapter The engine adapter responsible for engine-specific operations.
   */
  constructor(public adapter: EngineAdapter<TEngine, TScene, TCamera, TOptions>) {
    // assign adapter (explicit for clarity)
    this.adapter = adapter;

    // instantiate hooks with argument names to improve debugging/stack traces
    this.hooks = {
      initEngine: new AsyncSeriesHook<[RenderingContext]>(["ctx"]),
      resourceLoad: new AsyncSeriesWaterfallHook<[RenderingContext]>(["ctx"]),
      resourceParse: new AsyncSeriesBailHook<[RenderingContext], any>(["ctx"]),
      buildScene: new AsyncSeriesWaterfallHook<[RenderingContext]>(["ctx"]),
      renderLoop: new AsyncParallelHook<[RenderingContext]>(["ctx"]),
      postProcess: new AsyncSeriesHook<[RenderingContext]>(["ctx"]),
      dispose: new SyncHook<[RenderingContext]>(["ctx"])
    };
  }

  /**
   * getHook - safely retrieve a typed hook by name.
   * Throws if the hook name is invalid to catch typos early.
   */
  public getHook<Name extends keyof StageHooks>(name: Name): StageHooks[Name] {
    if (!(name in this.hooks)) {
      throw new Error(`Hook "${String(name)}" does not exist in Pipeline`);
    }
    return this.hooks[name];
  }

  /**
   * use - register a plugin (plugin implements IPlugin.apply).
   * Keeps plugin installation simple and discoverable.
   */
  public use(plugin: IPlugin) {
    plugin.apply(this);
  }

  /**
   * usePreset - install multiple plugins in order.
   */
  public usePreset(plugins: IPlugin[]) {
    plugins.forEach((p) => this.use(p));
  }

  /**
   * setLogger - replace logger implementation (useful for tests or different environments).
   */
  public setLogger(logger: Logger) {
    this.logger = logger;
  }

  /**
   * run - execute the full pipeline: init -> load -> parse -> build -> render loop -> postProcess.
   * Returns the RenderingContext for caller consumption and later disposal.
   */
  public async run(container: HTMLElement, request: RenderRequest): Promise<RenderingContext> {
    // create per-run abort-controller and context object
    const abortController = new AbortController();
    const ctx: RenderingContext<TEngine,TScene,TCamera> = {
      request,
      container,
      adapter: this.adapter,
      metadata: {},                      // place for plugins to store misc data
      abortController,
      abortSignal: abortController.signal,
      renderState: { running: false, frameCount: 0 },
      pipeline: this,
      engineHandles: { engine: null as any, scene: null as any, camera: null as any}
    };

    // helper: throw if pipeline was aborted
    const ensureNotAborted = () => {
      if (ctx.abortSignal.aborted) {
        throw new Error("Pipeline aborted");
      }
    };

    try {
      // 1) Engine initialization stage - adapter and plugins may hook here
      ensureNotAborted();
      await this.hooks.initEngine.promise(ctx);

      // 2) Resource loading (waterfall) - allows progressive enrichment of ctx
      ensureNotAborted();
      await this.hooks.resourceLoad.promise(ctx);

      // 3) Resource parsing / validation (bail) - bail if a hook returns a non-undefined sentinel
      ensureNotAborted();
      const bailResult = await this.hooks.resourceParse.promise(ctx);
      if (bailResult === false) {
        // a hook explicitly signaled validation failure
        throw new Error("Pipeline: resourceParse validation failed (bail returned false)");
      }

      // 4) Scene construction - build objects in the engine-specific scene
      ensureNotAborted();
      await this.hooks.buildScene.promise(ctx);

      // 5) Start render loop - prefer adapter-managed loop when available
      ctx.renderState = ctx.renderState ?? { running: true, frameCount: 0 };
      ctx.renderState.running = true;
      
      if ( typeof this.adapter.startRenderLoop === "function") {
        // adapter takes responsibility for calling frame callback at desired cadence
        this.adapter.startRenderLoop(ctx, (deltaMs: number) => {
          // update frame counter (non-blocking)
          ctx.renderState!.frameCount = (ctx.renderState!.frameCount || 0) + 1;

          // call all renderLoop taps in parallel; don't throw to keep loop alive
          this.hooks.renderLoop.callAsync(ctx, (err?: any) => {
            if (err) {
              // record last error on context and log it
              ctx.renderState!.lastError = err;
              try { this.logger.error?.("renderLoop hook error:", err); } catch (_) {}
            }
          });
        });
      } else {
        // if adapter doesn't supply a loop, run renderLoop once to allow setup
        await this.hooks.renderLoop.promise(ctx);
      }

      // 6) Post-process stage (runs once after setup; continuous work belongs in renderLoop)
      await this.hooks.postProcess.promise(ctx);

      // return context so caller may interact (e.g., call dispose later)
      return ctx;
    } catch (err) {
      // log error and attempt best-effort cleanup, then rethrow
      try { this.logger.error?.("Pipeline run error:", err); } catch (_) {}

      // abort running operations and call dispose hooks to free resources
      try { abortController.abort(); } catch (_) {}
      try { this.hooks.dispose.call(ctx); } catch (_) {}
      try { this.adapter.dispose?.(); } catch (_) {}

      throw err;
    }
  }

  /**
   * dispose - explicit cleanup for an active RenderingContext.
   * Safe to call multiple times.
   */
  public async dispose(ctx: RenderingContext) {
    // abort the run to stop any ongoing async work
    try { ctx.abortController.abort(); } catch (_) {}

    // synchronous dispose hooks for plugins to release resources
    try { this.hooks.dispose.call(ctx); } catch (e) {
      try { this.logger.error?.("Error in dispose hooks:", e); } catch (_) {}
    }

    // adapter-level cleanup (if implemented)
    try { this.adapter.dispose?.(); } catch (e) {
      try { this.logger.error?.("Adapter dispose error:", e); } catch (_) {}
    }
  }
}
