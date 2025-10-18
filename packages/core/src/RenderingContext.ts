import type { EngineAdapter } from "./EngineAdapter";
import type { Pipeline } from "./Pipeline";

export type RenderRequest = {
  id: string;
  source: string;
  options?: Record<string, any>;
  userData?: Object;
};

/**
 * RenderingContext - parametrized so every field can carry concrete engine/resource types.
 * TResources is the adapter-specific resource/parsed shape (e.g. glTF AST, binary buffer, typed model).
 */
export interface RenderingContext<
  TEngine = any,
  TScene = any,
  TCamera = any,
  TOptions = any,
  TResources = any,
  TEntity = any
> {
  request: RenderRequest;
  container: HTMLCanvasElement | HTMLElement;
  adapter: EngineAdapter<TEngine, TScene, TCamera, TOptions>;

  // rawAssets: the adapter's loadResources result (one or many)
  rawAssets?: TResources | TResources[];

  // parsedGLTF kept for backwards-compat / convenience; can map to TResources if appropriate
  parsedGLTF?: {targetEngineEntity:TEntity, animations?: any[]; meshes?: any[] };

  // strongly typed engine handles
  engineHandles: { engine: TEngine; scene: TScene; camera: TCamera };

  metadata: Record<string, any>;
  abortController: AbortController;
  abortSignal: AbortSignal;

  renderState?: { running?: boolean; frameCount?: number; lastError?: any };

  // pipeline typed with the same generics so plugins can access strongly-typed pipeline
  pipeline?: Pipeline<TEngine, TScene, TCamera, TOptions>;
}