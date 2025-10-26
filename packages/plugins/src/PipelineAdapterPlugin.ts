import { IPlugin, Pipeline, RenderingContext } from "@chameleon/core";
import { isElementOfType } from "./utils";


/**
 * GLTFLoaderPlugin
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
      // allow HTMLElement (adapter may support canvas or other mount points)
      if (!ctx.container || !isElementOfType(ctx.container, HTMLElement)) {
        throw new Error("PipelineAdapterPlugin: container must be an HTMLElement");
      }

      // prefer adapter.initEngine when implemented; allow adapter to mutate ctx
      try {
        if (typeof ctx.adapter.initEngine === "function") {
          ctx.engineHandles = await ctx.adapter.initEngine(ctx.container, ctx, (ctx.request as any).options);
        }
      } catch (err) {
        // attach error and rethrow so pipeline can clean up
        try { pipeline.logger?.error?.("PipelineAdapterPlugin:initEngine error", err); } catch { }
        throw err;
      }

      // return ctx;
    });

    // 2) Load resources (support string(s) and in-memory sources)
    pipeline.hooks.resourceLoad.tapPromise(this.name, async (ctx: RenderingContext) => {
      const src = ctx.request?.source;

      // normalize sources to an array for uniform handling
      const sources: Array<any> = Array.isArray(src) ? src : src == null ? [] : [src];

      // fast path: nothing to load
      if (sources.length === 0) {
        ctx.rawAssets = [];
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
      } catch (err) {
        try { pipeline.logger?.error?.("PipelineAdapterPlugin:resourceLoad error", err); } catch { }
        throw err;
      }

      return ctx;
    });

    // 3) Parse loaded resources. Use adapter.parseResource if available, otherwise attempt best-effort parsing.
    pipeline.hooks.resourceParse.tapPromise(this.name, async (ctx: RenderingContext) => {
      const raw = ctx.rawAssets ?? [];

      try {
        if (typeof ctx.adapter.parseResource === "function") {
          const targetEngineEntity = await ctx.adapter.parseResource(raw, ctx);
          ctx.parsedGLTF = { targetEngineEntity };
          // adapter parses raw assets and returns parsed result(s)
        } else {
          // generic parsing strategy:
          // - ArrayBuffer/Uint8Array => treat as binary GLB (keep as-is)
          // - objects => assume already parsed JSON glTF
          // - strings => try JSON.parse, fallback to string
          const parsed = await Promise.all(
            raw.map(async (r: object) => {
              if (r == null) return r;
              // ArrayBuffer or view => binary GLB
              if (r instanceof ArrayBuffer || ArrayBuffer.isView(r)) return r;
              // plain object (already parsed)
              if (typeof r === "object") return r;
              if (typeof r === "string") {
                try {
                  return JSON.parse(r);
                } catch {
                  // return original string if not JSON
                  return r;
                }
              }
              return r;
            })
          );
          // if single source, expose single parsed value for convenience
          ctx.parsedGLTF = parsed.length === 1 ? parsed[0] : parsed;
        }
      } catch (err) {
        try { pipeline.logger?.error?.("PipelineAdapterPlugin:resourceParse error", err); } catch { }
        // return false to signal validation failure if desired by pipeline consumers
        throw err;
      }

      return undefined;
    });

    // 4) Build scene using adapter.buildScene if provided. Otherwise no-op.
    pipeline.hooks.buildScene.tapPromise(this.name, async (ctx: RenderingContext) => {
      try {
        if (typeof ctx.adapter.buildScene === "function") {
          await ctx.adapter.buildScene(ctx.parsedGLTF, ctx);
        }
      } catch (err) {
        try { pipeline.logger?.error?.("PipelineAdapterPlugin:buildScene error", err); } catch { }
        throw err;
      }

      return ctx;
    });
  }
}
