import type { BaseMaterial } from "@galacean/engine";

/**
 * Small helpers to manage `material.extras.__ant` payloads.
 *
 * The goal is to centralize creation, resolution persistence and attachment
 * so callers can keep their logic concise.
 */
export function ensureAntExtras(host: any, ext: any, shaderRef?: any) {
  // ensure extras and __ant container exist on the host material
  if (!host) return;
  // use plain property access to avoid heavy engine typings here
  host.extras = host.extras || {};
  host.extras.__ant = host.extras.__ant || {};
  // set schema/shaderRef if not already present
  if (!host.extras.__ant.schema) host.extras.__ant.schema = ext;
  if (!host.extras.__ant.shaderRef && typeof shaderRef !== "undefined") host.extras.__ant.shaderRef = shaderRef;
  host.extras.__ant.resolved = host.extras.__ant.resolved || {};
  return host.extras.__ant;
}

export function getResolvedExtras(host: any) {
  if (!host) return null;
  return host.extras && host.extras.__ant ? host.extras.__ant.resolved || null : null;
}

export function persistResolvedSources(host: any, vertexSource?: string | null, fragmentSource?: string | null) {
  if (!host) return;
  host.extras = host.extras || {};
  host.extras.__ant = host.extras.__ant || {};
  host.extras.__ant.resolved = host.extras.__ant.resolved || {};
  if (vertexSource) host.extras.__ant.resolved.vertexSource = vertexSource;
  if (fragmentSource) host.extras.__ant.resolved.fragmentSource = fragmentSource;
}

export function attachExtrasToTarget(target: any, sourceHost: any, ext: any, resolved: any) {
  target.extras = target.extras || {};
  // prefer copying host __ant if present, otherwise synthesize from ext
  if (sourceHost && sourceHost.extras && sourceHost.extras.__ant) {
    target.extras.__ant = sourceHost.extras.__ant;
  } else {
    target.extras.__ant = { schema: ext, shaderRef: ext && ext.shader, resolved: resolved || {} };
  }
}

export default {
  ensureAntExtras,
  getResolvedExtras,
  persistResolvedSources,
  attachExtrasToTarget
};

/**
 * Apply pipeline flags (doubleSided / alphaMode) to a shader material.
 * This mirrors the small number of renderer flags handled inline previously.
 */
export function applyPipelineFlags(targetMaterial: any, pipelineDef: any, materialInfo?: any) {
  if (!targetMaterial || !pipelineDef) return;
  try {
    if (pipelineDef.doubleSided) {
      try {
        // @ts-ignore
        targetMaterial.renderFace = materialInfo && materialInfo.doubleSided ? 2 : 0;
      } catch {}
    }
    if (pipelineDef.alphaMode === "BLEND") {
      try {
        // @ts-ignore
        targetMaterial.setIsTransparent && targetMaterial.setIsTransparent(0, true);
      } catch {}
    }
  } catch {}
}

/**
 * Apply shader defines/macros to a shader material's shaderData.
 * Best-effort: enable macros when possible and ignore failures.
 */
export function applyShaderDefines(targetMaterial: BaseMaterial, defines: Record<string, any> | undefined) {
  if (!targetMaterial || !defines) return;
  const macros = targetMaterial.shaderData.getMacros();
  try {
    for (const defName of Object.keys(defines)) {
      if (macros.find((m) => m.name === defName)) continue;
      const defVal = defines[defName];
      try {
        if (defVal === true) {
          targetMaterial?.shaderData?.enableMacro(defName);
        } else if (defVal || defVal === 0) {
          targetMaterial?.shaderData?.enableMacro(defName, defVal);
        } else {
          // prefer not to call disable macro aggressively; keep conservative
        }
      } catch {}
    }
  } catch {}
}

// named exports already provided above; no extra re-exports needed
