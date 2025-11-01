import { IPlugin, Pipeline, RenderingContext } from "@chameleon/core";
import { isElementOfType } from "./utils";
import { isStageLocked, lockStage, unlockStage, addStageCleanup, runStageCleanups, markStageCompleted } from "./utils";
/**
 * PipelineAdapterPlugin
 * - Robust loader that:
 *   1) ensures engine is initialized
 *   2) loads one or more sources (adapter preferred, fallback to fetch)
 *   3) parses loaded assets (adapter.parseResource preferred)
 *   4) delegates scene construction to adapter.buildScene
 *
 * Best practices:
 * - Defensive checks and structured error logging.
 * - Support string, array, and in-memory sources.
 * - Preserve raw and parsed assets on ctx for downstream plugins.
 */
export class PipelineAdapterPlugin implements IPlugin {
  public readonly name = "PipelineAdapterPlugin";

  public apply(pipeline: Pipeline): void {
    // 1) Ensure engine is initialized before doing resource work.
    pipeline.hooks.initEngine.tapPromise(this.name, async (ctx: RenderingContext) => {
      if (ctx.abortSignal?.aborted) throw new Error("initEngine aborted");
      if (isStageLocked(ctx, "initEngine")) return ctx;
      lockStage(ctx, "initEngine");
      try {
        // allow HTMLElement (adapter may support canvas or other mount points)
        if (!ctx.container || !isElementOfType(ctx.container, HTMLElement)) {
          throw new Error("PipelineAdapterPlugin: container must be an HTMLElement");
        }

        // prefer adapter.initEngine when implemented; allow adapter to mutate ctx
        if (typeof ctx.adapter.initEngine === "function") {
          ctx.engineHandles = await ctx.adapter.initEngine(ctx.container, ctx, ctx.request?.options);
        }

        // register cleanup for initEngine: try adapter.dispose or fallback to destroy engineHandles
        addStageCleanup(ctx, "initEngine", async (c: RenderingContext) => {
          try {
            if (typeof c.adapter.dispose === "function") {
              await c.adapter.dispose();
            }
          } catch (e) {
            try {
              pipeline.logger?.error?.("PipelineAdapterPlugin:initEngine cleanup error", e);
            } catch {}
          }
        });

        markStageCompleted(ctx, "initEngine", true);
      } catch (err) {
        try {
          pipeline.logger?.error?.("PipelineAdapterPlugin:initEngine error", err);
        } catch {}
        throw err;
      } finally {
        unlockStage(ctx, "initEngine");
      }

      return ctx;
    });

    // 2) Load resources (support string(s) and in-memory sources)
    pipeline.hooks.resourceLoad.tapPromise(this.name, async (ctx: RenderingContext) => {
      if (ctx.abortSignal?.aborted) throw new Error("resourceLoad aborted");

      if (isStageLocked(ctx, "resourceLoad")) return ctx;
      lockStage(ctx, "resourceLoad");

      const src = ctx.request?.source;
      const sources: Array<any> = Array.isArray(src) ? src : src == null ? [] : [src];

      // fast path: nothing to load
      if (sources.length === 0) {
        ctx.rawAssets = [];
        // register trivial cleanup to clear rawAssets
        addStageCleanup(ctx, "resourceLoad", async (c: RenderingContext) => {
          try {
            c?.parsedGLTF?.targetEngineEntity?.destroy?.();
            c.parsedGLTF = undefined;
            c.rawAssets = [];
          } catch {}
        });
        markStageCompleted(ctx, "resourceLoad", true);
        unlockStage(ctx, "resourceLoad");
        return ctx;
      }

      try {
        // If adapter provides loadResources, prefer it (adapter may support engine-specific loading)
        if (typeof ctx.adapter.loadResource === "function") {
          ctx.rawAssets = await ctx.adapter.loadResource(src, ctx);
        } else {
          // fallback: for each source, fetch or pass-through depending on type
          const loaded = await Promise.all(
            sources.map(async (s) => {
              if (typeof s === "string") {
                // fetch remote URL
                const res = await fetch(s);
                // try JSON first, then binary/text depending on content-type and response parsing success
                const ct = res.headers.get("content-type") || "";
                if (ct.includes("application/json")) {
                  return res.json().catch(() => res.text());
                }
                // attempt ArrayBuffer for glb/binary, otherwise text

                const buf = await res.arrayBuffer().catch(() => null);
                if (buf && buf.byteLength > 0) return buf;
                return res.text().catch(() => null);
              }
              // already an in-memory object/ArrayBuffer — pass through

              return s;
            })
          );
          ctx.rawAssets = loaded;
        }

        // register cleanup: clear rawAssets on cleanup
        addStageCleanup(ctx, "resourceLoad", async (c: RenderingContext) => {
          try {
            c?.parsedGLTF?.targetEngineEntity?.destroy?.();
            c.parsedGLTF = undefined;
            c.rawAssets = [];
          } catch {}
        });

        markStageCompleted(ctx, "resourceLoad", true);
      } catch (err) {
        try {
          pipeline.logger?.error?.("PipelineAdapterPlugin:resourceLoad error", err);
        } catch {}
        throw err;
      } finally {
        unlockStage(ctx, "resourceLoad");
      }

      return ctx;
    });

    // 3) Parse loaded resources. Use adapter.parseResource if available, otherwise attempt best-effort parsing.
    pipeline.hooks.resourceParse.tapPromise(this.name, async (ctx: RenderingContext) => {
      if (ctx.abortSignal?.aborted) throw new Error("resourceParse aborted");

      if (isStageLocked(ctx, "resourceParse")) return undefined;
      lockStage(ctx, "resourceParse");

      const raw = ctx.rawAssets ?? [];

      try {
        if (typeof ctx.adapter.parseResource === "function") {
          const result = await ctx.adapter.parseResource(raw, ctx);
          // adapter may return a parsed representation or an engine-specific entity
          ctx.parsedGLTF = { targetEngineEntity: result } as any;
        } else {
          const parsed = await Promise.all(
            raw.map(async (r: any) => {
              if (r == null) return r;
              if (r instanceof ArrayBuffer || ArrayBuffer.isView(r)) return r;
              if (typeof r === "object") return r;
              if (typeof r === "string") {
                try {
                  return JSON.parse(r);
                } catch {
                  return r;
                }
              }
              return r;
            })
          );
          ctx.parsedGLTF = parsed.length === 1 ? parsed[0] : parsed;
        }

        // register cleanup: clear parsedGLTF
        addStageCleanup(ctx, "resourceParse", async (c: RenderingContext) => {
          try {
            c.parsedGLTF?.targetEngineEntity?.destroy?.();
            c.parsedGLTF = undefined;
          } catch {}
        });

        markStageCompleted(ctx, "resourceParse", true);
      } catch (err) {
        try {
          pipeline.logger?.error?.("PipelineAdapterPlugin:resourceParse error", err);
        } catch {}
        throw err;
      } finally {
        unlockStage(ctx, "resourceParse");
      }

      // resourceParse previously returned undefined to indicate bail semantics for some pipelines;
      // keep same behavior to avoid changing pipeline consumers.
      return undefined;
    });

    // 4) Build scene using adapter.buildScene if provided. Otherwise no-op.
    pipeline.hooks.buildScene.tapPromise(this.name, async (ctx: RenderingContext) => {
      if (ctx.abortSignal?.aborted) throw new Error("buildScene aborted");
      if (isStageLocked(ctx, "buildScene")) return ctx;
      lockStage(ctx, "buildScene");

      try {
        if (typeof ctx.adapter.buildScene === "function") {
          await ctx.adapter.buildScene(ctx.parsedGLTF, ctx);
        }
      } catch (err) {
        try {
          pipeline.logger?.error?.("PipelineAdapterPlugin:buildScene error", err);
        } catch {}
        throw err;
      } finally {
        // register cleanup: let adapter tear down built scene if it provides a hook,
        // else provide a conservative default cleanup that clears parsedGLTF.targetEngineEntity
        addStageCleanup(ctx, "buildScene", async (c: RenderingContext) => {
          try {
            if (typeof c.adapter.dispose === "function") {
              // adapter-level dispose will be invoked by initEngine cleanup if appropriate;
              // avoid double-dispose here, but still try adapter.dispose if provided and safe
              try {
                // await c.adapter.dispose(c);
              } catch {}
            } else {
              const target = c?.parsedGLTF?.targetEngineEntity || null;
              try {
                if (target && typeof (target as any).destroy === "function") {
                  target.destroy();
                  c.pipeline?.logger?.info?.(
                    "PipelineAdapterPlugin: disposed targetEngineEntity during buildScene cleanup"
                  );
                }
              } catch {}
            }
          } catch {}
        });

        markStageCompleted(ctx, "buildScene", true);
        unlockStage(ctx, "buildScene");
      }

      return ctx;
    });

    // Optional: ensure dispose hook triggers all registered cleanups (plugin registers nothing for dispose,
    // but Pipeline or consumers should call runStageCleanups at appropriate times). For safety, register
    // a small post-process cleanup runner to demonstrate usage.
    pipeline.hooks.postProcess.tapPromise(this.name, async (ctx: RenderingContext) => {
      // Post-process shouldn't clear permanent resources, but we can run transient cleanups if needed.
      // Here we do nothing by default; but keep hook present to show metadata usage.
      return ctx;
    });

    // Dispose: run all stage cleanups in a safe order if pipeline triggers dispose.
    pipeline.hooks.dispose?.tap(this.name, (ctx: RenderingContext) => {
      try {
        // Best-effort: run cleanups for known stages. runStageCleanups is async, but dispose is sync;
        // if Pipeline expects sync dispose, it should call runStageCleanups separately. We'll call it
        // without awaiting to avoid breaking sync contract, but log if available.
        runStageCleanups(ctx, "buildScene").catch(() => {});
        runStageCleanups(ctx, "resourceParse").catch(() => {});
        runStageCleanups(ctx, "resourceLoad").catch(() => {});
        runStageCleanups(ctx, "initEngine").catch(() => {});
      } catch {
        /* swallow */
      }
    });
  }
}
