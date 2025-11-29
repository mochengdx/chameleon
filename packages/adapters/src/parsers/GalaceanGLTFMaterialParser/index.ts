import {
  BaseMaterial,
  Engine,
  GLTFMaterialParser,
  GLTFParser,
  GLTFParserContext,
  GLTFParserType,
  PBRMaterial,
  registerGLTFParser,
  Shader
} from "@galacean/engine";
import type { ANTShader } from "@chameleon/core";
import ANTMaterialParser from "./ANTMaterialParser";
import { applyANTPropertiesToShader } from "./ANTPropertyBinder";
import {
  applyPipelineFlags,
  applyShaderDefines,
  attachExtrasToTarget,
  ensureAntExtras,
  getResolvedExtras,
  persistResolvedSources
} from "./extras";

// Material parser that looks for the ANT_materials_shader material-level
// extension and, if present, synthesizes a runtime material to replace the
// default material created by the loader. This implementation is intentionally
// conservative: it creates a PBRMaterial as a host, binds any texture uniforms
// it can find via the GLTF parser context, and stores the ANT metadata on
// material.extras.__ant for further adapter/plugin processing (for example,
// to compile/replace with a real custom shader later).
/**
 * Material parser that looks for the `ANT_materials_shader` material-level
 * extension and, if present, synthesizes a runtime material to replace the
 * default material created by the loader.
 *
 * The parse process is split into distinct, reusable steps to improve
 * readability, extensibility and safety while preserving existing behavior:
 *
 * 1) extractANTExtensionData: Read the glTF material, material-level
 *    ANT_materials_shader extension and the top-level ANT_materials_shader
 *    asset-level definition. Collect the fields needed for the rest of the
 *    pipeline (shaderRef, shaderDef, resolved cache, materialInfo, engine,
 *    and a conservative host material).
 *
 * 2) validateForShaderApplication: Perform safety checks to decide whether
 *    attempting to create a shader-backed material is appropriate. This is
 *    intentionally conservative: missing engine, missing shaderDef or missing
 *    shader sources should result in returning the conservative PBRMaterial.
 *
 * 3) resolveShaderSources: Resolve vertex and fragment shader sources.
 *    This prefers previously-resolved sources stored in material.extras.__ant
 *    (plugin-provided), and otherwise attempts to fetch URIs or treat inline
 *    source strings. The routine persists resolved sources back onto
 *    material.extras.__ant.resolved for later use.
 *
 * 4) createShaderMaterial: Given resolved sources and the shaderDef, create
 *    or reuse a Shader and construct a shader-backed BaseMaterial. Propagate
 *    render flags (alpha/doubleSided), apply defines (macros), and attach
 *    ANT metadata onto the final material.
 *
 * 5) applyPropertiesToShader: Bind simple uniform types and textures from
 *    the material-level `properties` map onto shaderData. Numbers -> floats,
 *    arrays -> float arrays, and texture descriptors are fetched via the
 *    GLTF parser context.
 *
 * Each step is implemented as a small helper method to make future
 * adjustments easier and to centralize error-handling. The overall parse
 * returns a conservative PBRMaterial when anything fails, preserving the
 * original loader resiliency.
 */
export class GalaceanGLTFMaterialParser extends GLTFParser {
  private galaceanEngineMaterialParser;
  constructor() {
    super();
    this.galaceanEngineMaterialParser = new GLTFMaterialParser();
  }
  async parse(context: GLTFParserContext, index?: number) {
    if (typeof index !== "number") return undefined;
    // const orginMaterial = await context.get<Material>(GLTFParserType.Material, index);
    // STEP 1: Use ANTMaterialParser to read the material extension and
    // shader definition. Keep creating a conservative PBRMaterial host as
    // before (so we can return it if anything fails).
    const antParser = new ANTMaterialParser(context.glTF, context);
    const ext = antParser.getMaterialExtension(index!);
    const shaderDef = antParser.getShaderDef(index!);
    if (!ext || !shaderDef) return this.galaceanEngineMaterialParser.parse(context, index);
    const gltf = context.glTF;
    const materialInfo = gltf?.materials?.[index!];
    const gltfResource = context.glTFResource;
    const engine = gltfResource?.engine;
    // removed runtime debugger
    const material = new PBRMaterial(engine);
    material.name = materialInfo?.name || `ant-material-${index}`;
    // stash extension metadata on extras.__ant for plugin/adapter later use
    // ensure extras container exists and seed schema/shaderRef
    // prefer existing values when present
    // @ts-ignore
    ensureAntExtras(material, ext, ext && ext.shader);
    const shaderName = (shaderDef && shaderDef.id) || `ant_shader_${String(ext.shader)}`;

    // STEP 2: Validate that we should attempt shader creation. If validation
    // fails, return the conservative PBRMaterial created above.
    if (!this.validateForShaderApplication(shaderDef, engine))
      return this.galaceanEngineMaterialParser.parse(context, index);
    // STEP 3: Resolve vertex/fragment sources (prefer plugin-resolved cache).
    const resolved = getResolvedExtras(material);
    let vertexSource: string | null = resolved ? resolved.vertexSource : null;
    let fragmentSource: string | null = resolved ? resolved.fragmentSource : null;

    try {
      const sources = await this.resolveShaderSources(shaderDef, vertexSource, fragmentSource);
      vertexSource = sources.vertexSource;
      fragmentSource = sources.fragmentSource;
      // persist resolved sources back onto material.extras.__ant.resolved
      try {
        // persist resolved sources back onto extras
        // use helper to keep code concise
        persistResolvedSources(material, vertexSource, fragmentSource);
      } catch {}

      // If either stage missing -> abort to conservative material
      if (!vertexSource || !fragmentSource) return this.galaceanEngineMaterialParser.parse(context, index);
    } catch (e) {
      // failed to fetch/resolve sources -> conservative material
      return this.galaceanEngineMaterialParser.parse(context, index);
    }

    // STEP 4: Attempt to create or reuse a Shader and construct a shader-backed material.
    try {
      // const shaderName = shaderDef && shaderDef.id ? `ant_shader_${shaderDef.id}` : `ant_shader_${String(shaderDef)}`;
      const existsShader = Shader.find(shaderName);
      let shader: Shader | null = null;
      if (existsShader) shader = existsShader;
      else shader = Shader.create(shaderName, vertexSource as string, fragmentSource as string);
      if (shader) {
        const shaderMaterial = new BaseMaterial(engine!, shader);
        shaderMaterial.name = material.name;
        // apply pipeline flags and defines via helpers
        // Merge pipeline flags: start from the top-level shader definition
        // and override with any material-level (`ANT_materials_shader`) hints.
        // This preserves unspecified top-level defaults while allowing per-
        // material overrides.
        const mergedPipeline = Object.assign({}, shaderDef?.shader?.pipeline || {}, ext?.pipeline || {});
        const pipeline = mergedPipeline;
        applyPipelineFlags(shaderMaterial, pipeline, materialInfo);
        applyShaderDefines(shaderMaterial, shaderDef?.shader?.defines || {});

        // STEP 5: Bind properties (numbers, arrays, textures) onto shaderData.
        await applyANTPropertiesToShader(shaderMaterial, ext, context);
        // Attach ANT metadata for downstream use
        attachExtrasToTarget(shaderMaterial, material, ext, resolved);
        return shaderMaterial;
      }
    } catch (e) {
      // fallthrough to conservative material
    }

    return this.galaceanEngineMaterialParser.parse(context, index);
  }

  // NOTE: extraction and shader resolution logic is now handled by
  // `ANTMaterialParser`. The previous helper has been replaced by calls to
  // that utility for clarity and reuse.

  // Helper: Basic validations to determine whether to try shader application.
  // Keep checks conservative: missing shaderDef or engine should bail out.
  private validateForShaderApplication(shaderDef?: ANTShader | null, engine?: Engine) {
    if (!engine) return false;
    if (!shaderDef) return false;
    return true;
  }

  // Helper: Resolve vertex/fragment sources. Supports inline strings, typed
  // descriptors, and legacy {uri} shapes. Returns {vertexSource, fragmentSource}
  // or throws on fatal fetch errors.
  private async resolveShaderSources(
    shaderDef: ANTShader,
    cachedVertex?: string | null,
    cachedFragment?: string | null
  ) {
    const fetchText = async (uri: string) => {
      if (!uri) return null;
      try {
        const res = await fetch(uri);
        if (!res.ok) return null;
        return await res.text();
      } catch {
        return null;
      }
    };

    let vertexSource: string | null = cachedVertex || null;
    let fragmentSource: string | null = cachedFragment || null;

    const resolveStage = async (
      glsl?: { type: 0; value: string | { uri: string } }
      // cacheKey: "vertexSource" | "fragmentSource"
    ) => {
      // if (cacheKey === "vertexSource" && vertexSource) return vertexSource;
      // if (cacheKey === "fragmentSource" && fragmentSource) return fragmentSource;
      if (!glsl) return null;

      if (typeof glsl === "string") return glsl;

      if (typeof glsl === "object") {
        if (glsl.type === 0) {
          const v = glsl.value;
          if (typeof v === "string") return v;
          if (v && typeof v === "object") {
            if (typeof v.uri === "string") return await fetchText(v.uri);
          }
        }
      }

      return null;
    };

    const resolveVertex = resolveStage(shaderDef.shader.vertex[0]);
    const resolveFragment = resolveStage(shaderDef.shader.fragment[0]);

    const [v, f] = await Promise.all([resolveVertex, resolveFragment]);
    vertexSource = v;
    fragmentSource = f;
    return { vertexSource, fragmentSource } as const;
  }
}

registerGLTFParser(GLTFParserType.Material)(GalaceanGLTFMaterialParser);
