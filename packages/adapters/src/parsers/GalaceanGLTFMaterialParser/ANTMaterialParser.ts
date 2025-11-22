import type { ANTUniform, GLTF, Material } from "@chameleon/core";
import { GLTFParserContext, GLTFParserType } from "@galacean/engine";

/**
 * ANTMaterialParser
 *
 * A small utility class to parse the `ANT_materials_shader` extension data from
 * a glTF's JSON structure and expose a compact, reusable API for other
 * parsers/loaders in this adapter package.
 *
 * Goals:
 * - Provide a consistent way to read the extension shape across different
 *   glTFs (some files may store shader ids as numbers, others as strings).
 * - Merge shader-level `properties` with material-level overrides and expose
 *   the unified map.
 * - Expose helper methods to resolve shader sources and to resolve textures
 *   declared by property values via the provided `GLTFParserContext`.
 *
 * This keeps the parsing logic centralized and makes it easier to evolve the
 * heuristics used by `MyGLTFMaterialParser`, `myMaterialLoader` and other
 * consumers without duplicating code.
 */
export class ANTMaterialParser {
  private gltf: GLTF;
  private context?: GLTFParserContext;

  constructor(gltf: any, context?: GLTFParserContext) {
    this.gltf = gltf || {};
    this.context = context;
  }

  /**
   * Return the raw `ANT_materials_shader` extension object for a material.
   * If the material or extension is missing, returns null.
   */
  getMaterialExtension(materialIndex: number): { shader?: any; properties?: Record<string, ANTUniform> } | null {
    const mats = this.gltf.materials;
    if (!Array.isArray(mats) || typeof materialIndex !== "number") return null;
    const mat = mats[materialIndex];
    if (!mat || !mat.extensions) return null;
    return mat.extensions.ANT_materials_shader || null;
  }

  /**
   * Resolve the shader definition referenced by the material extension.
   * The `shader` field in the extension may be a numeric index into
   * `gltf.shaders` or a string identifier. This method attempts both.
   */
  getShaderDef(materialIndex: number): any | null {
    const ext = this.getMaterialExtension(materialIndex);
    if (!ext) return null;
    const shaderRef = ext.shader;
    const shaders = this.gltf?.extensions?.ANT_materials_shader?.shaders;
    if (!shaders) return null;
    if (typeof shaderRef === "number") return shaders[shaderRef] || null;
    if (typeof shaderRef === "string") {
      // Try to find by name or id
      return shaders.find((s: any) => s.name === shaderRef || s.id === shaderRef) || null;
    }
    return null;
  }

  /**
   * Merge shader-level properties and material-level overrides.
   * Material-level properties take precedence.
   */
  mergeProperties(materialIndex: number): Record<string, ANTUniform> {
    const ext = this.getMaterialExtension(materialIndex);
    if (!ext) return {};
    const shaderDef = this.getShaderDef(materialIndex);
    const shaderProps: Record<string, ANTUniform> = (shaderDef && shaderDef.properties) || {};
    const materialProps: Record<string, ANTUniform> = ext.properties || {};
    // Return a shallow merge where materialProps override shaderProps
    return Object.assign({}, shaderProps, materialProps);
  }

  /**
   * Return an object with candidate shader sources for the material's shader
   * definition. Sources may be inline (string) or a reference that needs to be
   * resolved by the consumer.
   */
  getShaderSources(materialIndex: number): { vertex?: string | null; fragment?: string | null } {
    const shaderDef = this.getShaderDef(materialIndex);
    if (!shaderDef) return { vertex: null, fragment: null };
    // Support a few common property names used across variations
    const vertex = shaderDef.vertex || shaderDef.vertexSource || shaderDef.vertexShader || null;
    const fragment = shaderDef.fragment || shaderDef.fragmentSource || shaderDef.fragmentShader || null;
    return { vertex, fragment };
  }

  /**
   * Attempt to resolve texture properties declared in the merged properties map
   * using the provided `GLTFParserContext`. Returns a map from property name
   * to the resolved texture resource (or `null` if resolution failed).
   *
   * If no `context` was provided when constructing the parser, this method
   * will reject.
   */
  async resolvePropertyTextures(materialIndex: number): Promise<Record<string, any>> {
    if (!this.context) throw new Error("GLTF parser context is required to resolve textures");
    const merged = this.mergeProperties(materialIndex);
    const result: Record<string, any> = {};
    for (const k of Object.keys(merged)) {
      const p = merged[k];
      const isTyped = typeof p === "object" && p !== null && "value" in p;
      const raw = isTyped ? (p as any).value : p;
      const texIdx = typeof raw === "number" ? raw : raw && (raw as any).index;
      if (typeof texIdx === "number") {
        try {
          // GLTFParserType.Texture is used by the engine to resolve textures
          const tex = await this.context.get(GLTFParserType.Texture, texIdx);
          result[k] = tex;
        } catch (e) {
          result[k] = null;
        }
      } else {
        result[k] = null;
      }
    }
    return result;
  }

  /**
   * Utility: list all material indices that carry `ANT_materials_shader`.
   */
  listMaterialsWithANT(): number[] {
    const mats = (this.gltf.materials || []) as Material[];
    const out: number[] = [];
    for (let i = 0; i < mats.length; i++) {
      if (mats?.[i]?.extensions?.ANT_materials_shader) out.push(i);
    }
    return out;
  }
}

export default ANTMaterialParser;
