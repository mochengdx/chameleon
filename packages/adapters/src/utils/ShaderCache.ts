import { Shader } from "@galacean/engine";

/**
 * ShaderCache
 * Global cache for Shader instances to avoid recompilation of identical sources.
 * Keys are generated from vertex source, fragment source, and defines.
 */
export class ShaderCache {
  private static _cache = new Map<string, Shader>();

  /**
   * Generate a stable cache key.
   */
  private static _fnv1a(str: string) {
    // 32-bit FNV-1a hash
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
      h = h >>> 0;
    }
    return ("00000000" + h.toString(16)).slice(-8);
  }

  private static _generateKey(vertexSource: string, fragmentSource: string, defines?: Record<string, unknown>): string {
    const definesKey = defines
      ? Object.keys(defines)
          .sort()
          .map((k) => `${k}:${String((defines as Record<string, unknown>)[k] ?? "")}`)
          .join("|")
      : "";
    const combined = `v:${vertexSource.length}:${vertexSource}|f:${fragmentSource.length}:${fragmentSource}|d:${definesKey}`;
    return this._fnv1a(combined);
  }

  /**
   * getOrCreate
   * Find an existing shader or create a new one.
   * @param name Suggested name for the shader (used if creating new)
   * @param vertexSource Vertex shader GLSL
   * @param fragmentSource Fragment shader GLSL
   * @param defines Optional macros/defines (used for key generation)
   */
  public static getOrCreate(
    name: string,
    vertexSource: string,
    fragmentSource: string,
    defines?: Record<string, any>
  ): Shader {
    const key = this._generateKey(vertexSource, fragmentSource, defines);
    if (this._cache.has(key)) {
      return this._cache.get(key)!;
    }

    // Check if Galacean already has it by name (fallback)
    let shader = Shader.find(name);
    if (!shader) {
      shader = Shader.create(name, vertexSource, fragmentSource);
    }

    this._cache.set(key, shader);
    return shader;
  }

  /**
   * Clear the cache (useful for testing or memory pressure)
   */
  public static clear() {
    this._cache.clear();
  }
}
