import type { BaseMaterial, GLTFParserContext, Texture2D } from "@galacean/engine";
import { Color, GLTFParserType, Vector2, Vector3, Vector4 } from "@galacean/engine";

/**
 * Helper setters for applying values to a material's shaderData.
 *
 * These functions intentionally mirror the previous inline helpers in
 * `ANTPropertyBinder.ts`. They are conservative (wrap engine calls in
 * try/catch) and return boolean success for synchronous setters and a
 * Promise<boolean> for async texture resolution.
 *
 * Keeping these in a small dedicated module makes the binder logic easier
 * to read and re-use across parsers/loaders while preserving the original
 * behavior.
 */

/**
 * Set a single float uniform on the material. Returns true on success.
 */
export function setFloat(shaderMaterial: BaseMaterial, name: string, v: number): boolean {
  try {
    shaderMaterial.shaderData.setFloat(name, v);
    return true;
  } catch {
    return false;
  }
}

/**
 * Set a color uniform on the material. Accepts array-like values (number[]
 * or Float32Array) and constructs a `Color` instance for the engine API.
 * Returns true on success.
 */
export function setColor(shaderMaterial: BaseMaterial, name: string, arr: any): boolean {
  try {
    const a = arr instanceof Float32Array ? arr : new Float32Array(arr || []);
    shaderMaterial.shaderData.setColor(name, new Color(a[0] || 0, a[1] || 0, a[2] || 0, a.length >= 4 ? a[3] : 1.0));
    return true;
  } catch {
    return false;
  }
}

/**
 * Set a float array (vectors/matrices) on the material. Accepts array-like
 * values and forwards them as Float32Array to engine's `setFloatArray`.
 * Returns true on success.
 */
export function setFloatArray(shaderMaterial: BaseMaterial, name: string, arr: any): boolean {
  try {
    const a = arr instanceof Float32Array ? arr : new Float32Array(arr || []);
    shaderMaterial.shaderData.setFloatArray(name, a);
    return true;
  } catch {
    return false;
  }
}

/**
 * Set a float array (vectors/matrices) on the material. Accepts array-like
 * values and forwards them as Float32Array to engine's `setFloatArray`.
 * Returns true on success.
 */
export function setVector4(shaderMaterial: BaseMaterial, name: string, arr: number[]): boolean {
  try {
    const a = arr instanceof Float32Array ? arr : new Float32Array(arr || []);
    const vect4 = new Vector4(a[0], a[1], a[2], a[3]);
    shaderMaterial.shaderData.setVector4(name, vect4);
    return true;
  } catch {
    return false;
  }
}

/**
 * Set a vec2 uniform.
 */
export function setVec2(shaderMaterial: BaseMaterial, name: string, arr: number[] | Float32Array): boolean {
  try {
    const a = arr instanceof Float32Array ? arr : new Float32Array(arr || []);
    const v = new Vector2(a[0] || 0, a[1] || 0);
    shaderMaterial.shaderData.setVector2(name, v);
    return true;
  } catch {
    return false;
  }
}

/**
 * Set a vec3 uniform.
 */
export function setVec3(shaderMaterial: BaseMaterial, name: string, arr: number[] | Float32Array): boolean {
  try {
    const a = arr instanceof Float32Array ? arr : new Float32Array(arr || []);
    const v = new Vector3(a[0] || 0, a[1] || 0, a[2] || 0);
    shaderMaterial.shaderData.setVector3(name, v);
    return true;
  } catch {
    return false;
  }
}

/**
 * Set an integer uniform.
 */
export function setInt(shaderMaterial: BaseMaterial, name: string, v: number): boolean {
  try {
    // Use setInt if available on shaderData otherwise fallback to setFloat
    // (some engines use float to represent ints in shader uniforms)
    // @ts-ignore
    if (typeof shaderMaterial.shaderData.setInt === "function") {
      // @ts-ignore
      shaderMaterial.shaderData.setInt(name, Math.trunc(v));
    } else {
      shaderMaterial.shaderData.setFloat(name, v);
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Set an integer vector (ivec2/3/4) using setIntArray if available.
 */
export function setIntArray(shaderMaterial: BaseMaterial, name: string, arr: number[] | Int32Array): boolean {
  try {
    const a = arr instanceof Int32Array ? arr : Int32Array.from(arr || []);
    // @ts-ignore
    if (typeof shaderMaterial.shaderData.setIntArray === "function") {
      // @ts-ignore
      shaderMaterial.shaderData.setIntArray(name, a);
      return true;
    }
    // fallback: convert to float array
    const fa = new Float32Array(Array.from(a));
    shaderMaterial.shaderData.setFloatArray(name, fa);
    return true;
  } catch {
    return false;
  }
}

/**
 * Set a mat3 or mat4 uniform by forwarding a Float32Array to setFloatArray.
 */
export function setMat3(shaderMaterial: BaseMaterial, name: string, arr: number[] | Float32Array): boolean {
  try {
    const a = arr instanceof Float32Array ? arr : new Float32Array(arr || []);
    shaderMaterial.shaderData.setFloatArray(name, a);
    return true;
  } catch {
    return false;
  }
}

export function setMat4(shaderMaterial: BaseMaterial, name: string, arr: number[] | Float32Array): boolean {
  try {
    const a = arr instanceof Float32Array ? arr : new Float32Array(arr || []);
    shaderMaterial.shaderData.setFloatArray(name, a);
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolve a texture from the GLTF parser context and set it on the material.
 * The descriptor may be a numeric index or an object with an `index` field.
 * Returns a Promise that resolves to true on success.
 */
export async function setTexture(
  shaderMaterial: BaseMaterial,
  context: GLTFParserContext,
  name: string,
  descriptor: number | { index?: number } | null | undefined
): Promise<boolean> {
  try {
    const texIndex = typeof descriptor === "number" ? descriptor : descriptor && descriptor.index;
    if (typeof texIndex !== "number") return false;
    const texture = await context.get<Texture2D>(GLTFParserType.Texture, texIndex);
    shaderMaterial.shaderData.setTexture(name, texture);
    return true;
  } catch {
    return false;
  }
}

export default {
  setFloat,
  setColor,
  setFloatArray,
  setVector4,
  setVec2,
  setVec3,
  setInt,
  setIntArray,
  setMat3,
  setMat4,
  setTexture
};
