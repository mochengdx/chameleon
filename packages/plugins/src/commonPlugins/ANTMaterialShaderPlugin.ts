import type { GLTF, Pipeline, RenderingContext } from "@chameleon/core";
import { IPlugin } from "@chameleon/core";

// Lightweight fetch helper that returns text and caches requests per URL
const fetchText = async (url: string, cache: Map<string, string>) => {
  if (cache.has(url)) return cache.get(url)!;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch shader ${url}: ${res.status}`);
  const text = await res.text();
  cache.set(url, text);
  return text;
};

/**
 * ANTMaterialShaderPlugin
 * - Reads top-level `extensions.ANT_materials_shader` from the parsed glTF
 * - Fetches shader sources referenced by named shader definitions
 * - Merges per-material overrides and attaches a resolved shader record onto material.extras.__ant
 *
 * Notes:
 * - This is intentionally conservative: it fetches/merges and attaches resolved data to materials
 *   so engine adapters or subsequent plugins can compile/bind engine-specific shader programs.
 * - For engines with stable shader APIs (Galacean, Three.js) you may extend this plugin to
 *   compile and replace engine materials directly. Example placeholders are provided below.
 */

export class ANTMaterialShaderPlugin implements IPlugin {
  public name = "ANTMaterialShaderPlugin";
  public apply(pipeline: Pipeline) {
    pipeline.hooks.postProcess.tapPromise(this.name, async (ctx: RenderingContext) => {
      try {
        const parsed = ctx.parsedGLTF;
        if (!parsed || !parsed.gltf) return;
        const gltf = parsed.gltf as GLTF;
        const top = gltf.extensions?.ANT_materials_shader as any | undefined;
        if (!top) return;

        // build lookup by id and index
        const mapById = new Map<string, (typeof top.shaders)[0]>();
        const shadersArray = top.shaders || [];
        for (let i = 0; i < shadersArray.length; i++) {
          const s = shadersArray[i];
          if (s && typeof s.id === "string") mapById.set(s.id, s);
        }

        const cache = new Map<string, string>();

        // resolve each material that references a shader id
        for (let mi = 0; mi < (gltf.materials || []).length; mi++) {
          const mat = gltf.materials[mi] as any;
          const ext = mat?.extensions?.ANT_materials_shader;
          if (!ext || !ext.shader) continue;
          // shader can be either an index (number) or an id (string)
          let def: any | undefined;
          if (typeof ext.shader === "number") {
            def = shadersArray[ext.shader];
          } else if (typeof ext.shader === "string") {
            def = mapById.get(ext.shader);
          }
          if (!def) {
            console.warn(`ANTMaterialShaderPlugin: shader '${ext.shader}' not found in top-level ANT_materials_shader`);
            continue;
          }

          // fetch sources (vertex/fragment) with caching
          let vert = "";
          let frag = "";
          try {
            vert = await fetchText(def.shader.vertex, cache);
            frag = await fetchText(def.shader.fragment, cache);
          } catch (e) {
            console.warn("ANTMaterialShaderPlugin: shader fetch failed", e);
            continue;
          }

          // Resolve uniforms into per-stage maps (vertex vs fragment).
          // Rules:
          // - If top-level uniform entry is an object and contains a `stage` field
          //   with value 'vertex' or 'fragment', respect it.
          // - Material-level overrides may supply `vertexUniforms` and/or `fragmentUniforms`
          //   (preferred). If only generic `params` exist, they will override fragment uniforms by default.
          // - If stage cannot be determined, default to fragment (safer for most shading uses).

          const topUniforms = def?.shader?.uniforms ?? {};
          const matVertexOverrides = ext.vertexUniforms ?? {};
          const matFragmentOverrides = ext.fragmentUniforms ?? {};
          const genericParams = ext.params ?? {};

          const vertexUniforms: Record<string, any> = {};
          const fragmentUniforms: Record<string, any> = {};

          // helper to assign by stage
          const assign = (name: string, val: any, stage: "vertex" | "fragment") => {
            if (stage === "vertex") vertexUniforms[name] = val;
            else fragmentUniforms[name] = val;
          };

          // process top-level uniforms
          for (const k of Object.keys(topUniforms)) {
            const v = topUniforms[k];
            if (v && typeof v === "object" && (v as any).stage) {
              const stage = (v as any).stage === "vertex" ? "vertex" : "fragment";
              assign(k, (v as any).value ?? v, stage);
            } else {
              // default to fragment if unspecified
              assign(k, v, "fragment");
            }
          }

          // apply material-specific per-stage overrides
          Object.keys(matVertexOverrides || {}).forEach((k) => (vertexUniforms[k] = matVertexOverrides[k]));
          Object.keys(matFragmentOverrides || {}).forEach((k) => (fragmentUniforms[k] = matFragmentOverrides[k]));

          // apply generic params to fragment uniforms (backward-compat)
          Object.keys(genericParams || {}).forEach((k) => (fragmentUniforms[k] = genericParams[k]));

          // attach resolved shader info to material.extras.__ant so adapters can use it
          mat.extras = mat.extras || {};
          mat.extras.__ant = {
            shaderRef: ext.shader,
            vertexSource: vert,
            fragmentSource: frag,
            defines: def.shader?.defines ?? {},
            vertexUniforms,
            fragmentUniforms,
            pipeline: def.shader?.pipeline ?? {}
          };

          // If adapter exposes an optional applyANTMaterial method, call it to allow
          // engine-specific compilation/binding. Signature (adapter-specific):
          // adapter.applyANTMaterial(ctx, materialIndex, materialExtras)
          try {
            const adapterAny = ctx.adapter as any;
            if (adapterAny && typeof adapterAny.applyANTMaterial === "function") {
              // allow adapter to compile shader and return a runtime material handle
              // attach returned runtime handle to mat.extras.__ant.runtimeMaterial
              const runtime = await adapterAny.applyANTMaterial(ctx, mi, mat.extras.__ant);
              if (runtime) mat.extras.__ant.runtimeMaterial = runtime;
            }
          } catch (e) {
            console.warn("ANTMaterialShaderPlugin: adapter.applyANTMaterial failed", e);
          }

          // Example: try to compile/bind for Galacean if available (best-effort)
          try {
            const engine = ctx.engineHandles?.engine as any;
            if (engine && typeof engine.createProgram === "function") {
              // This is pseudocode — adapt to actual Galacean shader/material API
              // const program = engine.createProgram(vert, frag, { defines: def.shader.defines });
              // const customMat = engine.createPBRMaterialFromProgram(program);
              // bind uniforms from mergedUniforms to customMat
              // apply pipeline hints (doubleSided/alphaMode/etc.)
              // then attach runtime material handle to parsed entity so buildScene can use it
            }
          } catch (e) {
            // swallow engine-specific compile errors and leave resolved sources on material for later
            console.warn("ANTMaterialShaderPlugin: engine-specific compile attempt failed", e);
          }
        }

        // return cx;
      } catch (err) {
        // do not break pipeline on plugin error; log and continue
        try {
          console.error("ANTMaterialShaderPlugin error:", err);
        } catch {}
        // return ctx;
      }
    });
  }
}
