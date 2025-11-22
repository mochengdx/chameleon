import { GLTFParserType } from "@galacean/engine";
import { describe, expect, it } from "vitest";
import ANTMaterialParser from "../GalaceanGLTFMaterialParser/ANTMaterialParser";

describe("ANTMaterialParser", () => {
  it("merges shader-level and material-level properties with material overrides", () => {
    const gltf: any = {
      shaders: [
        {
          id: "s0",
          properties: {
            a: 1,
            b: { type: "float", value: 2 }
          }
        }
      ],
      materials: [
        {
          name: "mat0",
          extensions: {
            ANT_materials_shader: {
              shader: 0,
              properties: {
                b: { type: "float", value: 3 },
                c: [1, 2, 3]
              }
            }
          }
        }
      ]
    };

    const parser = new ANTMaterialParser(gltf);
    const merged = parser.mergeProperties(0);
    expect(merged.a).toBe(1);
    expect(merged.b && (merged.b as any).value).toBe(3);
    expect(Array.isArray(merged.c)).toBe(true);
  });

  it("resolves texture properties via GLTFParserContext.get", async () => {
    const gltf: any = {
      shaders: [
        {
          id: "s0",
          properties: {}
        }
      ],
      materials: [
        {
          name: "mat0",
          extensions: {
            ANT_materials_shader: {
              shader: 0,
              properties: {
                baseMap: { type: "texture", value: { index: 5 } }
              }
            }
          }
        }
      ]
    };

    const mockContext: any = {
      glTF: gltf,
      get: async (type: any, idx: number) => {
        if (type === GLTFParserType.Texture) return `tex-${idx}`;
        return null;
      }
    };

    const parser = new ANTMaterialParser(gltf, mockContext);
    const resolved = await parser.resolvePropertyTextures(0);
    expect(resolved.baseMap).toBe("tex-5");
  });
});
