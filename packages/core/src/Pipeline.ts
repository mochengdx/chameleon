import {
  AnyHook,
  AsyncParallelHook,
  AsyncSeriesBailHook,
  AsyncSeriesHook,
  AsyncSeriesWaterfallHook,
  SyncHook
} from "tapable";
import { EngineAdapter } from "./EngineAdapter";
import { Logger } from "./Logger";
import { IPlugin } from "./Plugin";
import type { RenderingContext, RenderRequest } from "./RenderingContext";

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
  initEngine: AsyncSeriesWaterfallHook<[RenderingContext], RenderingContext | undefined>;
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
    // // assign adapter (explicit for clarity)
    // this.adapter = adapter;

    // instantiate hooks with argument names to improve debugging/stack traces
    this.hooks = {
      initEngine: new AsyncSeriesWaterfallHook<[RenderingContext], RenderingContext | undefined>(["ctx"]),
      resourceLoad: new AsyncSeriesWaterfallHook<[RenderingContext]>(["ctx"]),
      resourceParse: new AsyncSeriesBailHook<[RenderingContext], any>(["ctx"]),
      buildScene: new AsyncSeriesWaterfallHook<[RenderingContext]>(["ctx"]),
      renderLoop: new AsyncParallelHook<[RenderingContext]>(["ctx"]),
      postProcess: new AsyncSeriesHook<[RenderingContext]>(["ctx"]),
      dispose: new SyncHook<[RenderingContext]>(["ctx"])
    };
  }

  /**
   * callHookPromise
   * - Typed convenience helper to invoke a stage hook and normalize different Tapable shapes (promise, callAsync, call).
   * - Returns whatever the underlying hooks return (often void or a possibly replaced RenderingContext for waterfall hooks).
   */
  public async callHookPromise<Name extends keyof StageHooks>(
    name: Name,
    ctx: RenderingContext<TEngine, TScene, TCamera>
  ): Promise<any> {
    const hook = this.hooks[name] as any;
    if (!hook) throw new Error(`Unknown hook "${String(name)}"`);

    if (typeof hook.promise === "function") {
      return await hook.promise(ctx);
    }

    if (typeof hook.callAsync === "function") {
      return await new Promise((resolve, reject) =>
        hook.callAsync(ctx, (err?: any, res?: any) => (err ? reject(err) : resolve(res)))
      );
    }

    if (typeof hook.call === "function") {
      return hook.call(ctx);
    }

    throw new Error(`Hook "${String(name)}" unsupported shape`);
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

  // helper: remove taps with the given pluginName from a single hook, return whether removed any
  private _removeTapsFromHook(hook: AnyHook, pluginName: string): boolean {
    if (!hook || !Array.isArray(hook.taps)) return false;
    const before = hook.taps.length;
    // keep taps except those from pluginName
    hook.taps = hook.taps.filter((t: any) => t && t.name !== pluginName);
    // clear compiled/cache fields so hook will recompile next time it's called
    // different hook types may cache different keys; remove commonly used cache names
    try {
      // delete hook._call;
      // delete hook._promise;
      // delete hook._x;
      // delete hook._tap;
    } catch {}
    return hook.taps.length !== before;
  }

  /**
   * Uninstall by plugin name (or plugin instance name)
   * - Removes all taps registered with the given plugin name across all stages.
   * - Returns true if any tap was removed.
   */
  public uninstall(pluginName: string): boolean {
    if (!pluginName) return false;
    let removedAny = false;
    const hookKeys = Object.keys(this.hooks) as (keyof StageHooks)[];
    for (const k of hookKeys) {
      const hook = (this.hooks as any)[k];
      try {
        const removed = this._removeTapsFromHook(hook, pluginName);
        if (removed) removedAny = true;
      } catch (e) {
        try {
          this.logger?.error?.(`Pipeline.uninstall: failed to remove taps for ${String(k)} - ${pluginName}`, e);
        } catch {}
      }
    }
    return removedAny;
  }

  /**
   * uninstallPlugin - convenience overload: accept plugin instance or name
   */
  public uninstallPlugin(plugin: { name?: string } | string): boolean {
    const name = typeof plugin === "string" ? plugin : plugin?.name;
    if (!name) return false;
    return this.uninstall(name);
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
   * runStages
   * - Public, reusable routine to execute an ordered list of stage hooks.
   * - Marks stagesCompleted in ctx.metadata and preserves waterfall/bail semantics.
   * - Throws on abort or unknown hook names.
   */
  public async runStages(
    names: (keyof StageHooks)[],
    ctx: RenderingContext<TEngine, TScene, TCamera>
  ): Promise<RenderingContext<TEngine, TScene, TCamera>> {
    const ensureNotAborted = () => {
      if (ctx.abortSignal?.aborted) throw new Error("Pipeline aborted");
    };

    for (const name of names) {
      ensureNotAborted();
      const hook = this.hooks[name] as any; // will cast to concrete types below
      // console.log("run stage:", name);
      if (!hook) throw new Error(`Unknown hook "${String(name)}"`);

      // try {
      // dispatch based on stage name -> use correct tapable API and keep types explicit
      switch (name) {
        case "initEngine":
        case "resourceLoad":
        case "resourceParse":
        case "buildScene":
        case "postProcess":
          // these hooks expose a promise() method (AsyncSeries* variants)
          if (typeof hook.promise === "function") {
            const result = await hook.promise(ctx);
            if (result && typeof result === "object" && (name === "resourceLoad" || name === "buildScene")) {
              ctx = result as RenderingContext<TEngine, TScene, TCamera>;
            }
            if (name === "resourceParse" && result === false) {
              throw new Error("Pipeline: resourceParse validation failed (bail returned false)");
            }
          } else {
            // fallback for unexpected shapes: try callAsync/call
            if (typeof hook.callAsync === "function") {
              await new Promise<void>((resolve, reject) =>
                hook.callAsync(ctx, (err?: any) => (err ? reject(err) : resolve()))
              );
            } else if (typeof hook.call === "function") {
              hook.call(ctx);
            } else {
              throw new Error(`Hook "${String(name)}" unsupported shape`);
            }
          }
          break;

        case "renderLoop":
          // renderLoop is AsyncParallelHook: support promise() or callAsync()
          if (typeof hook.callAsync === "function") {
            // callAsync is used elsewhere for per-frame non-await invocation;
            // here we await the promise() for one-time execution if available.
            if (typeof hook.promise === "function") {
              await hook.promise(ctx);
            } else {
              await new Promise<void>((resolve, reject) =>
                hook.callAsync(ctx, (err?: any) => (err ? reject(err) : resolve()))
              );
            }
          } else if (typeof hook.promise === "function") {
            await hook.promise(ctx);
          } else {
            throw new Error(`Hook "${String(name)}" unsupported shape`);
          }
          break;

        case "dispose":
          // dispose is SyncHook -> call synchronously
          if (typeof hook.call === "function") {
            hook.call(ctx);
          } else {
            // fallback to other shapes if necessary
            if (typeof hook.callAsync === "function") {
              await new Promise<void>((resolve, reject) =>
                hook.callAsync(ctx, (err?: any) => (err ? reject(err) : resolve()))
              );
            } else if (typeof hook.promise === "function") {
              await hook.promise(ctx);
            } else {
              throw new Error(`Hook "${String(name)}" unsupported shape`);
            }
          }
          break;

        default:
          throw new Error(`Unknown hook "${String(name)}"`);
      }

      // mark stage done on ctx.metadata for idempotence checks
      // try {
      //   ctx.metadata = ctx.metadata || { stagesCompleted: {}, stageLocks: {}, stageCleanups: {} };
      //   ctx.metadata.stagesCompleted = ctx.metadata.stagesCompleted || {};
      //   ctx.metadata.stagesCompleted[String(name)] = true;
      // } catch {}
      // } catch (stageErr) {
      // record the failed stage for callers (so they can decide adapter disposal behavior)
      // try {
      //   ctx.metadata = ctx.metadata || { stagesCompleted: {}, stageLocks: {}, stageCleanups: {} };
      //   ctx.metadata.failedStage = String(name);
      // } catch {}
      // throw stageErr;
      // }
    }

    return ctx;
  }

  /**
   * run - execute the full pipeline (initEngine .. postProcess).
   * Delegates stage execution to runStages for consistency.
   */
  public async run(container: HTMLElement, request: RenderRequest): Promise<RenderingContext> {
    const abortController = new AbortController();
    const ctx: RenderingContext<TEngine, TScene, TCamera> = {
      request,
      container,
      adapter: this.adapter,
      metadata: { stagesCompleted: {}, stageLocks: {}, stageCleanups: {} },
      abortController,
      abortSignal: abortController.signal,
      renderState: { running: false, frameCount: 0 },
      pipeline: this,
      engineHandles: { engine: null as any, scene: null as any, camera: null as any }
    };

    const order: (keyof StageHooks)[] = [
      "initEngine",
      "resourceLoad",
      "resourceParse",
      "buildScene",
      "renderLoop",
      "postProcess"
    ];

    try {
      await this.runStages(order, ctx);

      // after stages, handle renderLoop behavior (adapter-managed or single run)
      ctx.renderState = ctx.renderState ?? { running: true, frameCount: 0 };
      ctx.renderState.running = true;

      if (typeof this.adapter.startRenderLoop === "function") {
        this.adapter.startRenderLoop(ctx, (deltaMs: number) => {
          ctx.renderState!.frameCount = (ctx.renderState!.frameCount || 0) + 1;
          try {
            this.hooks.renderLoop.callAsync(ctx, (err?: any) => {
              if (err) {
                ctx.renderState!.lastError = err;
                try {
                  this.logger.error?.("renderLoop hook error:", err);
                } catch (_) {}
              }
            });
          } catch (e) {
            try {
              this.logger.error?.("Error invoking renderLoop hooks:", e);
            } catch (_) {}
          }
        });
      } else {
        // ensure at least one call to renderLoop for setup
        await this.hooks.renderLoop.promise(ctx);
      }

      // run postProcess which was already executed in runStages order above,
      // but keep this here if you want to guarantee postProcess happens after loop setup.
      await this.hooks.postProcess.promise(ctx);

      return ctx;
    } catch (err) {
      try {
        this.logger.error?.("Pipeline run error:", err);
      } catch (_) {}
      try {
        abortController.abort();
      } catch (_) {}
      try {
        this.hooks.dispose.call(ctx);
      } catch (_) {}
      try {
        // Dispose the adapter only if the error occurred during initEngine stage.
        if (ctx.metadata?.failedStage === "initEngine") {
          this.adapter.dispose?.();
        }
      } catch (_) {}
      throw err;
    }
  }

  /**
   * runFrom
   * - Prepare ctx for partial re-run and then delegate execution to runStages.
   * - Responsibilities before re-running:
   *   1) abort previous run (cooperative),
   *   2) replace abortController/signal,
   *   3) invoke registered stageCleanups for stages that will be re-run,
   *   4) clear stagesCompleted flags for those stages,
   *   5) ensure engine is present when starting after initEngine.
   */
  public async runFrom(
    start: keyof StageHooks,
    ctx: RenderingContext<TEngine, TScene, TCamera>
  ): Promise<RenderingContext<TEngine, TScene, TCamera>> {
    const order: (keyof StageHooks)[] = [
      "initEngine",
      "resourceLoad",
      "resourceParse",
      "buildScene",
      "renderLoop",
      "postProcess"
    ];
    const startIndex = order.indexOf(start);
    if (startIndex === -1) throw new Error(`Unknown start stage "${String(start)}"`);
    const remaining = order.slice(startIndex);

    // 1) abort previous run
    try {
      ctx.abortController?.abort();
    } catch {}

    // 2) new abort controller for this run
    const newAbortController = new AbortController();
    ctx.abortController = newAbortController;
    ctx.abortSignal = newAbortController.signal;

    // helper to check abort
    const ensureNotAborted = () => {
      if (ctx.abortSignal.aborted) throw new Error("Pipeline aborted");
    };

    // 3) run registered cleanup callbacks for stages that will be run
    try {
      const sc = (ctx.metadata && ctx.metadata.stageCleanups) || {};
      for (const stage of remaining) {
        const fns = sc[String(stage)] || [];
        for (const fn of fns) {
          try {
            await fn(ctx);
          } catch (e) {
            try {
              this.logger.error?.(`Error during cleanup for stage ${String(stage)}:`, e);
            } catch (_) {}
          }
        }
      }
    } catch (e) {
      try {
        this.logger.error?.("Error while executing stageCleanups:", e);
      } catch (_) {}
    }

    // 4) clear stagesCompleted flags for the stages we're about to run
    try {
      ctx.metadata = ctx.metadata || { stagesCompleted: {}, stageLocks: {}, stageCleanups: {} };
      ctx.metadata.stagesCompleted = ctx.metadata.stagesCompleted || {};
      for (const s of remaining) {
        ctx.metadata.stagesCompleted[String(s)] = false;
      }
    } catch {}

    // 5) if starting after initEngine but engine not present, try to initEngine first
    if (startIndex > 0) {
      const enginePresent = Boolean(
        (ctx.engineHandles && ctx.engineHandles.engine) || (this.adapter && this.adapter.engine)
      );
      if (!enginePresent) {
        ensureNotAborted();
        await this.hooks.initEngine.promise(ctx);
      }
    }

    // Delegate execution to runStages (which marks stagesCompleted)
    try {
      ctx = await this.runStages(remaining, ctx);

      // handle renderLoop setup when it is included in remaining
      if (remaining.includes("renderLoop")) {
        ctx.renderState = ctx.renderState ?? { running: true, frameCount: 0 };
        ctx.renderState.running = true;

        if (typeof this.adapter.startRenderLoop === "function") {
          this.adapter.startRenderLoop(ctx, (deltaMs: number) => {
            ctx.renderState!.frameCount = (ctx.renderState!.frameCount || 0) + 1;
            try {
              this.hooks.renderLoop.callAsync(ctx, (err?: any) => {
                if (err) {
                  ctx.renderState!.lastError = err;
                  try {
                    this.logger.error?.("renderLoop hook error:", err);
                  } catch (_) {}
                }
              });
            } catch (e) {
              try {
                this.logger.error?.("Error invoking renderLoop hooks:", e);
              } catch (_) {}
            }
          });
        } else {
          // fallback: at least call renderLoop once
          await this.hooks.renderLoop.promise(ctx);
        }
      }

      return ctx;
    } catch (err) {
      try {
        this.logger.error?.("Pipeline runFrom error:", err);
      } catch (_) {}
      try {
        ctx.abortController?.abort();
      } catch (_) {}
      try {
        this.hooks.dispose.call(ctx);
      } catch (_) {}
      try {
        // Dispose the adapter only if the error occurred during initEngine stage.
        if (ctx.metadata?.failedStage === "initEngine") {
          this.adapter.dispose?.();
        }
      } catch (_) {}
      throw err;
    }
  }
}
