import type { GLTF } from "@chameleon/core";
import type { GLTFParserContext, Material } from "@galacean/engine";
import {
  GLTFExtensionMode,
  GLTFExtensionParser,
  GLTFParserType,
  PBRMaterial,
  registerGLTFExtension
} from "@galacean/engine";

// Galacean GLTF extension parser for the `ANT_materials_shader` extension.
//
// It records extension data on the GLTFResource so later pipeline stages
// (plugins or adapters) can perform engine-specific compilation/binding.
class ANT_materials_shader extends GLTFExtensionParser {
  // Create and parse - create the runtime material instead of deferring to
  // the default material creation path. We still keep an additiveParse
  // implementation for backwards compatibility, but CreateAndParse is the
  // preferred flow for ANT_materials_shader.
  override createAndParse(
    context: GLTFParserContext,
    extensionSchema: {
      shader: number;
      fragmentUniforms?: Record<string, any>;
      vertexUniforms?: Record<string, any>;
    },
    extensionOwnerSchema?: any
  ): Material {
    const { glTFResource, glTF } = context;
    const { extensions } = glTF as GLTF;
    const shaders = extensions?.ANT_materials_shader?.shaders;
    if (!shaders || shaders.length <= 0) return undefined as any;

    // resolve referenced shader def (if present)
    const shaderDef = extensions?.ANT_materials_shader?.shaders?.[extensionSchema.shader];

    const engine = glTFResource?.engine;
    if (!engine) return undefined as any;

    // create conservative host material
    const material = new PBRMaterial(engine);
    material.name = extensionOwnerSchema?.name || "ant-material";

    // basic property mapping
    try {
      if (extensionOwnerSchema?.doubleSided) {
        // @ts-ignore
        material.renderFace = (engine as any).RenderFace?.Double ?? material.renderFace;
      }
      const alphaMode = extensionOwnerSchema?.alphaMode;
      if (alphaMode === "BLEND") {
        material.isTransparent = true;
      } else if (alphaMode === "MASK") {
        material.alphaCutoff = extensionOwnerSchema?.alphaCutoff ?? 0.5;
      }
    } catch {
      // non-fatal
    }

    // stash extension metadata on extras for adapter/plugin later use
    // @ts-ignore
    material.extras = material.extras || {};
    // @ts-ignore
    material.extras.__ant = {
      schema: extensionSchema,
      shaderRef: extensionSchema.shader,
      shaderDef: shaderDef,
      resolved: {}
    };

    const fragmentUniforms = extensionSchema?.fragmentUniforms ?? {};
    const vertexUniforms = extensionSchema?.vertexUniforms ?? {};

    // helper to bind texture and register async task with loader
    const bindTexture = (val: any, key: string, isVertex = false) => {
      if (val == null) return;
      const texIndex = typeof val === "number" ? val : val.index;
      if (typeof texIndex !== "number") return;
      const p = context
        .get(GLTFParserType.Texture, texIndex)
        .then((tex) => {
          const texAny: any = tex;
          try {
            if (!isVertex) {
              if (key.toLowerCase().includes("albedo") || key.toLowerCase().includes("base")) {
                // @ts-ignore
                material.baseTexture = texAny;
              } else if (key.toLowerCase().includes("normal")) {
                // @ts-ignore
                material.normalTexture = texAny;
              } else if (key.toLowerCase().includes("emissive")) {
                // @ts-ignore
                material.emissiveTexture = texAny;
              } else if (key.toLowerCase().includes("occlusion") || key.toLowerCase().includes("ao")) {
                // @ts-ignore
                material.occlusionTexture = texAny;
              } else {
                // unknown mapping: stash on extras
                // @ts-ignore
                material.extras.__ant.resolved[key] = texAny;
              }
            } else {
              // vertex textures: stash for adapter
              // @ts-ignore
              material.extras.__ant.resolved[`vertex_${key}`] = texAny;
            }
          } catch {
            // ignore mapping errors
          }
        })
        .catch(() => {});

      // register with loader so it waits for texture loads
      // some contexts expose _addTaskCompletePromise
      try {
        // @ts-ignore
        if (typeof context._addTaskCompletePromise === "function") context._addTaskCompletePromise(p);
      } catch {}
    };

    for (const k of Object.keys(fragmentUniforms)) {
      bindTexture(fragmentUniforms[k], k, false);
    }
    for (const k of Object.keys(vertexUniforms)) {
      bindTexture(vertexUniforms[k], k, true);
    }

    // return created material; additiveParse will still be invoked later
    // by the loader to allow other extensions to add to this material.
    return material;
  }

  // Keep additiveParse to record mapping for tools that rely on it.
  override additiveParse(
    context: GLTFParserContext,
    material: Material,
    extensionSchema: {
      shader: number;
      fragmentUniforms?: Record<string, string>;
      vertexUniforms?: Record<string, string>;
    },
    extensionOwnerSchema?: any
  ): void {
    const { glTFResource, glTF } = context;
    // Ensure extension data container exists.
    // @ts-ignore
    glTFResource._extensionsData || (glTFResource._extensionsData = {});
    // @ts-ignore
    glTFResource.extensionsData || (glTFResource.extensionsData = {});

    try {
      const shaders = (glTF as GLTF)?.extensions?.ANT_materials_shader?.shaders;
      const shader = shaders?.[extensionSchema.shader];
      // @ts-ignore
      const ext =
        glTFResource.extensionsData.ANT_materials_shader || (glTFResource.extensionsData.ANT_materials_shader = {});
      ext.materials || (ext.materials = []);
      ext.materials.push({
        material: material,
        schema: extensionSchema,
        ownerSchema: extensionOwnerSchema,
        shaderDef: shader
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("ANT_materials_shader: extension parse error", e);
    }
  }
}

registerGLTFExtension("ANT_materials_shader", GLTFExtensionMode.CreateAndParse)(ANT_materials_shader);
