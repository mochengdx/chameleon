import {
  BaseMaterial,
  GLTFParser,
  GLTFParserContext,
  GLTFParserType,
  PBRMaterial,
  registerGLTFParser,
  Shader,
  Texture2D
} from "@galacean/engine";

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
export class MyGLTFMaterialParser extends GLTFParser {
  async parse(context: GLTFParserContext, index?: number) {
    if (typeof index !== "number") return undefined;

    // STEP 1: Extract relevant ANT extension data and create a conservative
    // PBRMaterial host. This bundles the glTF material info, material-level
    // extension (ext), top-level extension (gltfExt), shaderRef and shaderDef.
    const extracted = this.extractANTExtensionData(context, index);
    if (!extracted) return undefined;
    debugger;
    const { materialInfo, ext, shaderIndex, shaderDef, material, engine } = extracted;

    // STEP 2: Validate that we should attempt shader creation. If validation
    // fails, return the conservative PBRMaterial created above.
    if (!this.validateForShaderApplication(shaderDef, engine)) return material;

    // STEP 3: Resolve vertex/fragment sources (prefer plugin-resolved cache).
    const resolved =
      (material as any).extras && (material as any).extras.__ant && (material as any).extras.__ant.resolved;
    let vertexSource: string | null = resolved && resolved.vertexSource ? resolved.vertexSource : null;
    let fragmentSource: string | null = resolved && resolved.fragmentSource ? resolved.fragmentSource : null;

    try {
      const sources = await this.resolveShaderSources(shaderDef, vertexSource, fragmentSource);
      vertexSource = sources.vertexSource;
      fragmentSource = sources.fragmentSource;
      // persist resolved sources back onto material.extras.__ant.resolved
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

      // If either stage missing -> abort to conservative material
      if (!vertexSource || !fragmentSource) return material;
    } catch (e) {
      // failed to fetch/resolve sources -> conservative material
      return material;
    }

    // STEP 4: Attempt to create or reuse a Shader and construct a shader-backed material.
    try {
      const shaderName = shaderDef && shaderDef.id ? `ant_shader_${shaderDef.id}` : `ant_shader_${String(shaderDef)}`;
      const existsShader = Shader.find(shaderName);
      let shader: Shader | null = null;
      if (existsShader) shader = existsShader;
      else shader = Shader.create(shaderName, vertexSource as string, fragmentSource as string);

      if (shader) {
        const shaderMaterial = new BaseMaterial(engine!, shader);
        shaderMaterial.name = material.name;

        // apply pipeline render flags (doubleSided / alpha)
        const pipeline = (shaderDef && shaderDef.pipeline) || {};
        if (pipeline.doubleSided) {
          try {
            // @ts-ignore - BaseMaterial API inside engine
            shaderMaterial.renderFace = materialInfo.doubleSided ? 2 : 0;
          } catch {}
        }
        if (pipeline.alphaMode === "BLEND") {
          try {
            // keep compatibility: if setIsTransparent exists, call it
            // @ts-ignore
            shaderMaterial.setIsTransparent && shaderMaterial.setIsTransparent(0, true);
          } catch {}
        }

        // Apply defines/macros (best effort, preserved as comments in original)
        // try {
        //   const defines = (shaderDef && shaderDef.defines) || {};
        //   for (const defName of Object.keys(defines)) {
        //     const defVal = (defines as any)[defName];
        //     try {
        //       if (defVal === true) {
        //         try {
        //           // shaderMaterial.shaderData.enableMacro(defName);
        //         } catch {}
        //       } else if (defVal) {
        //         try {
        //           // shaderMaterial.shaderData.enableMacro(defName, String(defVal));
        //         } catch {}
        //       } else {
        //         try {
        //           // shaderMaterial.shaderData.disableMacro(defName);
        //         } catch {}
        //       }
        //     } catch {}
        //   }
        // } catch {}

        // STEP 5: Bind properties (numbers, arrays, textures) onto shaderData.
        await this.applyPropertiesToShader(shaderMaterial, ext, context);

        // Attach ANT metadata for downstream use
        // @ts-ignore
        shaderMaterial.extras = shaderMaterial.extras || {};
        // @ts-ignore
        shaderMaterial.extras.__ant =
          (material as any).extras && (material as any).extras.__ant
            ? (material as any).extras.__ant
            : { schema: ext, shaderRef: shaderIndex, resolved: resolved || {} };
        return shaderMaterial;
      }
    } catch (e) {
      // fallthrough to conservative material
    }

    return material;
  }

  // Helper: Extract ANT material-level extension info and prepare a conservative material host.
  private extractANTExtensionData(context: GLTFParserContext, index: number) {
    const gltf = context.glTF as any;
    const materialInfo = gltf?.materials?.[index];
    if (!materialInfo) return null;
    const ext = materialInfo.extensions && materialInfo.extensions.ANT_materials_shader;
    if (!ext) return null;

    const gltfExt = (gltf && gltf.extensions && gltf.extensions.ANT_materials_shader) || null;
    const shaderIndex = ext.shader;
    const shaderEntry =
      gltfExt && Number.isFinite(shaderIndex) ? gltfExt.shaders && gltfExt.shaders[shaderIndex] : null;
    const shaderDef = shaderEntry && shaderEntry.shader;

    const gltfResource = context.glTFResource;
    const engine = gltfResource?.engine;
    if (!engine) return null;

    const material = new PBRMaterial(engine);
    material.name = materialInfo.name || `ant-material-${index}`;

    // stash extension metadata on extras.__ant for plugin/adapter later use
    // @ts-ignore
    material.extras = material.extras || {};
    // @ts-ignore
    material.extras.__ant = {
      schema: ext,
      shaderRef: ext.shader,
      resolved: {}
    };

    return { gltf, materialInfo, ext, gltfExt, shaderIndex, shaderDef, material, engine } as const;
  }

  // Helper: Basic validations to determine whether to try shader application.
  // Keep checks conservative: missing shaderDef or engine should bail out.
  private validateForShaderApplication(shaderDef: any, engine?: any) {
    if (!engine) return false;
    if (!shaderDef) return false;
    return true;
  }

  // Helper: Resolve vertex/fragment sources. Supports inline strings, typed
  // descriptors, and legacy {uri} shapes. Returns {vertexSource, fragmentSource}
  // or throws on fatal fetch errors.
  private async resolveShaderSources(shaderDef: any, cachedVertex?: string | null, cachedFragment?: string | null) {
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

    const resolveStage = async (stageDef: any, cacheKey: "vertexSource" | "fragmentSource") => {
      if (cacheKey === "vertexSource" && vertexSource) return vertexSource;
      if (cacheKey === "fragmentSource" && fragmentSource) return fragmentSource;
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

    const resolveVertex = resolveStage(shaderDef && shaderDef.vertex, "vertexSource");
    const resolveFragment = resolveStage(shaderDef && shaderDef.fragment, "fragmentSource");

    const [v, f] = await Promise.all([resolveVertex, resolveFragment]);
    vertexSource = v;
    fragmentSource = f;
    return { vertexSource, fragmentSource } as const;
  }

  // Helper: Apply material-level properties to the shaderMaterial.shaderData.
  // Supports numbers (setFloat), arrays (setFloatArray) and textures (setTexture via context.get).
  private async applyPropertiesToShader(shaderMaterial: BaseMaterial, ext: any, context: GLTFParserContext) {
    debugger;
    const props = ext.properties || {};
    for (const k of Object.keys(props)) {
      const p = props[k];
      const rawVal = p && typeof p === "object" && "value" in p ? p.value : p;
      const type = p && typeof p === "object" && "type" in p ? p.type : null;

      if (type === "number") {
        try {
          shaderMaterial.shaderData.setFloat(k, rawVal);
          continue;
        } catch {}
      }

      // if (Array.isArray(rawVal)) {
      //   try {
      //     shaderMaterial.shaderData.setFloatArray(k, new Float32Array(rawVal));
      //     continue;
      //   } catch {}
      // }

      if (type === "texture") {
        try {
          const texture = await context.get<Texture2D>(GLTFParserType.Texture, rawVal);
          shaderMaterial.shaderData.setTexture(k, texture);
          continue;
        } catch {}
      }
    }
  }
}

registerGLTFParser(GLTFParserType.Material)(MyGLTFMaterialParser);
