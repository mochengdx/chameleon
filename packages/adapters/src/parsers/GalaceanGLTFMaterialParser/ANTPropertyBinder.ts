import type { ANTUniform } from "@chameleon/core";
import type { BaseMaterial, GLTFParserContext } from "@galacean/engine";
import {
  setColor,
  setFloat,
  setFloatArray,
  setInt,
  setIntArray,
  setMat3,
  setMat4,
  setTexture,
  setVec2,
  setVec3,
  setVector4
} from "./ANTPropertySetters";

// Allowed ANT uniform type strings (used at runtime for robust comparisons).
const ALLOWED_ANT_UNIFORM_TYPES: string[] = [
  "float",
  "vec2",
  "vec3",
  "vec4",
  "mat3",
  "mat4",
  "int",
  "texture",
  "color"
];

function normalizeUniformType(p: any): string | null {
  if (!p || typeof p !== "object") return null;
  const t = p.type;
  if (typeof t === "string") {
    const lc = t.toLowerCase();
    return ALLOWED_ANT_UNIFORM_TYPES.includes(lc) ? lc : null;
  }
  if (typeof t === "number") {
    try {
      const s = String(t);
      return ALLOWED_ANT_UNIFORM_TYPES.includes(s) ? s : null;
    } catch {}
  }
  return null;
}

function applyArrayAsUniform(shaderMaterial: BaseMaterial, key: string, arr: any): boolean {
  if (!arr) return false;
  const a = arr instanceof Float32Array ? arr : new Float32Array(arr);
  const len = a.length;
  if (len === 4) return setVector4(shaderMaterial, key, Array.from(a));
  if (len === 3) return setVec3(shaderMaterial, key, Array.from(a));
  if (len === 2) return setVec2(shaderMaterial, key, Array.from(a));
  return setFloatArray(shaderMaterial, key, a);
}

export async function applyANTPropertiesToShader(
  shaderMaterial: BaseMaterial,
  ext: { properties?: Record<string, ANTUniform> } | null | undefined,
  context: GLTFParserContext
) {
  if (!ext || !ext.properties) return;

  const props: Record<string, ANTUniform> = ext.properties || {};
  for (const key of Object.keys(props)) {
    const p = props[key];
    const isTyped = typeof p === "object" && p !== null && "value" in p;
    const raw = isTyped ? (p as any).value : (p as ANTUniform);
    const uniformType = isTyped ? normalizeUniformType(p) : null;

    try {
      // booleans -> float
      if (typeof raw === "boolean") {
        setFloat(shaderMaterial, key, raw ? 1 : 0);
        continue;
      }

      // explicit texture hint
      if (uniformType === "texture") {
        await setTexture(shaderMaterial, context, key, raw as any);
        continue;
      }

      // number -> float (first choice)
      if (typeof raw === "number") {
        if (setFloat(shaderMaterial, key, raw)) continue;
        // fallback: treat numeric as texture index
        await setTexture(shaderMaterial, context, key, raw as any);
        continue;
      }

      // arrays
      if (Array.isArray(raw)) {
        if (applyArrayAsUniform(shaderMaterial, key, raw)) continue;
      }

      // objects
      if (raw && typeof raw === "object") {
        // typed handling
        if (uniformType) {
          switch (uniformType) {
            case "color":
              setColor(shaderMaterial, key, raw);
              continue;
            case "texture":
              await setTexture(shaderMaterial, context, key, raw as any);
              continue;
            case "float":
              if (typeof raw === "number") {
                setFloat(shaderMaterial, key, raw as number);
                continue;
              }
              if (Array.isArray(raw) && setFloatArray(shaderMaterial, key, new Float32Array(raw as any))) continue;
              break;
            case "int":
              if (typeof raw === "number") {
                setInt(shaderMaterial, key, raw as number);
                continue;
              }
              if (Array.isArray(raw) && setIntArray(shaderMaterial, key, raw as any)) continue;
              break;
            case "vec2":
            case "vec3":
            case "vec4":
              if (Array.isArray(raw) && applyArrayAsUniform(shaderMaterial, key, raw)) continue;
              break;
            case "mat3":
              if (Array.isArray(raw) && setMat3(shaderMaterial, key, raw as any)) continue;
              break;
            case "mat4":
              if (Array.isArray(raw) && setMat4(shaderMaterial, key, raw as any)) continue;
              break;
            default:
              break;
          }
        }

        // heuristics
        if (typeof (raw as any).index === "number") {
          await setTexture(shaderMaterial, context, key, raw as any);
          continue;
        }

        if (Array.isArray((raw as any).value)) {
          if (applyArrayAsUniform(shaderMaterial, key, (raw as any).value)) continue;
        }

        // fallback: extract numeric fields
        const numeric = Object.keys(raw)
          .map((kk) => (typeof (raw as any)[kk] === "number" ? (raw as any)[kk] : null))
          .filter((v) => v !== null) as number[];
        if (numeric.length > 0) {
          setFloatArray(shaderMaterial, key, new Float32Array(numeric));
          continue;
        }
      }
    } catch {
      // swallow per-property failures to remain conservative
    }
  }
}

export default applyANTPropertiesToShader;
