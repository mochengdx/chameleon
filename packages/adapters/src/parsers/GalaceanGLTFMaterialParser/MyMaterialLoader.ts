import { GLTF } from "@chameleon/core";
import { BaseMaterial, GLTFParserContext, GLTFParserType, PBRMaterial, Shader, Texture2D } from "@galacean/engine";
import ANTMaterialParser from "./ANTMaterialParser";

/**
 * myMaterialLoader
 *
 * A small, conservative material loader inspired by Galacean's MaterialLoader
 * behavior and tuned to the project's ANT_materials_shader schema.
 *
 * Contract:
 * - Input: GLTFParserContext, material index
 * - Output: Promise<BaseMaterial> (either a PBRMaterial host or a shader-backed BaseMaterial)
 * - Error modes: Failures result in returning a conservative PBRMaterial rather than throwing.
 *
 * Steps performed:
 * 1) Read material-level ANT extension and top-level ANT shader definitions
 * 2) Create a conservative PBRMaterial host and stash extras.__ant metadata
 * 3) Resolve vertex/fragment sources (prefer plugin-resolved cache in extras)
 * 4) If both stages available, create or reuse a Shader, instantiate a BaseMaterial
 * 5) Apply pipeline flags (doubleSided/alpha)
 * 6) Bind properties via applyANTPropertiesToShader
 */
export async function createMaterialFromGLTF(
  context: GLTFParserContext,
  index?: number
): Promise<BaseMaterial | undefined> {
  if (typeof index !== "number") return undefined;

  const gltf = context.glTF as GLTF & any;
  const materialInfo = gltf?.materials?.[index];
  if (!materialInfo) return materialInfo;

  const antParser = new ANTMaterialParser(gltf, context);
  const ext = antParser.getMaterialExtension(index!);
  if (!ext) return materialInfo;
  const shaderDef = antParser.getShaderDef(index!);

  const gltfResource = context.glTFResource;
  const engine = gltfResource?.engine;
  if (!engine) return materialInfo;

  // conservative host
  const material = new PBRMaterial(engine);
  material.name = materialInfo.name || `ant-material-${index}`;
  // stash extras
  // @ts-ignore
  material.extras = material.extras || {};
  // @ts-ignore - keep original schema reference
  material.extras.__ant = { schema: ext, shaderRef: shaderIndex, resolved: {} };

  // helper to fetch text
  const fetchText = async (uri: string | undefined | null) => {
    if (!uri) return null;
    try {
      const res = await fetch(uri);
      if (!res.ok) return null;
      return await res.text();
    } catch {
      return null;
    }
  };

  // prefer plugin-resolved cached sources
  const resolved =
    (material as any).extras && (material as any).extras.__ant && (material as any).extras.__ant.resolved;
  let vertexSource: string | null = resolved && resolved.vertexSource ? resolved.vertexSource : null;
  let fragmentSource: string | null = resolved && resolved.fragmentSource ? resolved.fragmentSource : null;

  // resolve shader stage descriptor
  const resolveStage = async (stageDef: any) => {
    if (!stageDef) return null;
    if (typeof stageDef === "string") return stageDef;
    if (typeof stageDef === "object") {
      if (typeof stageDef.type !== "undefined") {
        if (stageDef.type === 0) {
          const v = stageDef.value;
          if (typeof v === "string") return v;
          if (v && typeof v === "object") {
            if (typeof v.uri === "string") return await fetchText(v.uri);
          }
        }
      }
      if (typeof stageDef.value === "string") return await fetchText(stageDef.value);
      if (typeof stageDef.value === "string") return stageDef.value;
      if (stageDef.value && typeof stageDef.value === "object" && typeof stageDef.value.uri === "string") {
        return await fetchText(stageDef.value.uri);
      }
    }
    return null;
  };

  try {
    // Use shaderDef provided by ANTMaterialParser; reuse the same resolveStage helper
    const [v, f] = await Promise.all([
      resolveStage(shaderDef && shaderDef.vertex),
      resolveStage(shaderDef && shaderDef.fragment)
    ]);
    vertexSource = v;
    fragmentSource = f;
    // persist resolved sources back to extras
    try {
      // @ts-ignore
      material.extras = material.extras || {};
      // @ts-ignore
      material.extras.__ant = material.extras.__ant || {};
      // @ts-ignore
      material.extras.__ant.resolved = material.extras.__ant.resolved || {};
      // @ts-ignore
      if (vertexSource) material.extras.__ant.resolved.vertexSource = vertexSource;
      // @ts-ignore
      if (fragmentSource) material.extras.__ant.resolved.fragmentSource = fragmentSource;
    } catch {}
  } catch (e) {
    return material;
  }

  if (!vertexSource || !fragmentSource) return material;

  // create or reuse shader
  const shaderName = shaderDef && shaderDef.id ? `ant_shader_${shaderDef.id}` : `ant_shader_${String(shaderDef)}`;
  const existsShader = Shader.find(shaderName);
  let shader = existsShader ? existsShader : Shader.create(shaderName, vertexSource, fragmentSource);

  if (!shader) return material;

  const shaderMaterial = new BaseMaterial(engine, shader);
  shaderMaterial.name = material.name;

  const pipeline = (shaderDef && shaderDef.pipeline) || {};
  if (pipeline.doubleSided) {
    try {
      // @ts-ignore
      shaderMaterial.renderFace = materialInfo.doubleSided ? 2 : 0;
    } catch {}
  }
  if (pipeline.alphaMode === "BLEND") {
    try {
      // @ts-ignore
      shaderMaterial.setIsTransparent && shaderMaterial.setIsTransparent(0, true);
    } catch {}
  }

  // Apply shader-level defines/macros from shaderDef.defines (best-effort).
  try {
    const defines = (shaderDef && shaderDef.defines) || {};
    for (const defName of Object.keys(defines)) {
      const defVal = (defines as any)[defName];
      try {
        // prefer engine shaderData macros if available
        if (defVal === true) {
          try {
            shaderMaterial.shaderData.enableMacro && shaderMaterial.shaderData.enableMacro(defName);
          } catch {}
        } else if (defVal || defVal === 0) {
          try {
            shaderMaterial.shaderData.enableMacro && shaderMaterial.shaderData.enableMacro(defName, String(defVal));
          } catch {}
        } else {
          try {
            shaderMaterial.shaderData.disableMacro && shaderMaterial.shaderData.disableMacro(defName);
          } catch {}
        }
      } catch {}
    }
  } catch {}

  // Merge shaderDef.properties (top-level) with material-level ext.properties using ANTMaterialParser
  const mergedProps: Record<string, any> = antParser.mergeProperties(index!);

  // Bind merged properties onto shaderData. Use engine-specific setters when available.
  try {
    for (const k of Object.keys(mergedProps)) {
      const p = mergedProps[k];
      const value = p && typeof p === "object" && "value" in p ? p.value : p;
      const typeHint =
        p && typeof p === "object" && typeof (p as any).type === "string"
          ? ((p as any).type as string).toLowerCase()
          : null;

      // Texture handling
      if (
        typeHint === "texture" ||
        (value && typeof value === "object" && typeof (value as any).index === "number") ||
        (typeof value === "number" && p && (p as any).type === "Texture")
      ) {
        try {
          const texIndex = typeof value === "number" ? value : value && (value as any).index;
          if (typeof texIndex === "number") {
            const tex = await context.get<Texture2D>(GLTFParserType.Texture, texIndex);
            shaderMaterial.shaderData.setTexture && shaderMaterial.shaderData.setTexture(k, tex);
            continue;
          }
        } catch {}
      }

      // Booleans -> float
      if (typeof value === "boolean") {
        try {
          shaderMaterial.shaderData.setFloat && shaderMaterial.shaderData.setFloat(k, value ? 1 : 0);
          continue;
        } catch {}
      }

      // Numbers -> float
      if (typeof value === "number") {
        try {
          shaderMaterial.shaderData.setFloat && shaderMaterial.shaderData.setFloat(k, value);
          continue;
        } catch {}
      }

      // Arrays -> vectors or float arrays
      if (Array.isArray(value)) {
        try {
          const arr = new Float32Array(value as number[]);
          if (arr.length === 4 && shaderMaterial.shaderData.setVector4) {
            shaderMaterial.shaderData.setVector4(k, arr as any);
          } else if (arr.length === 3 && shaderMaterial.shaderData.setVector3) {
            shaderMaterial.shaderData.setVector3(k, arr as any);
          } else if (arr.length === 2 && shaderMaterial.shaderData.setVector2) {
            shaderMaterial.shaderData.setVector2(k, arr as any);
          } else {
            shaderMaterial.shaderData.setFloatArray && shaderMaterial.shaderData.setFloatArray(k, arr);
          }
          continue;
        } catch {}
      }

      // Objects with numeric fields -> convert to float array
      if (value && typeof value === "object") {
        try {
          const numeric = Object.keys(value)
            .map((kk) => (typeof (value as any)[kk] === "number" ? (value as any)[kk] : null))
            .filter((v) => v !== null) as number[];
          if (numeric.length > 0) {
            const arr = new Float32Array(numeric);
            if (arr.length === 4 && shaderMaterial.shaderData.setVector4) {
              shaderMaterial.shaderData.setVector4(k, arr as any);
            } else if (arr.length === 3 && shaderMaterial.shaderData.setVector3) {
              shaderMaterial.shaderData.setVector3(k, arr as any);
            } else if (arr.length === 2 && shaderMaterial.shaderData.setVector2) {
              shaderMaterial.shaderData.setVector2(k, arr as any);
            } else {
              shaderMaterial.shaderData.setFloatArray && shaderMaterial.shaderData.setFloatArray(k, arr);
            }
            continue;
          }
        } catch {}
      }
    }
  } catch {}

  // attach extras
  // @ts-ignore
  shaderMaterial.extras = shaderMaterial.extras || {};
  // @ts-ignore
  shaderMaterial.extras.__ant =
    (material as any).extras && (material as any).extras.__ant
      ? (material as any).extras.__ant
      : { schema: ext, shaderRef: ext.shader, resolved: resolved || {} };

  return shaderMaterial;
}

export default createMaterialFromGLTF;
