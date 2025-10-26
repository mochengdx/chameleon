import type { EngineAdapter } from "./EngineAdapter";
import type { Pipeline } from "./Pipeline";

export type RenderRequest = {
  id: string;
  source: string;
  options?: Record<string, any>;
  userData?: any;
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
  // parsedGLTF kept for backwards-compat / convenience; can map to TResources if appropriate
  parsedGLTF?: {targetEngineEntity:TEntity, animations?: any[]; meshes?: any[] };
  abortController: AbortController;
  abortSignal: AbortSignal;
  pipeline?: Pipeline;
  renderState?: {
    running?: boolean;
    frameCount?: number;
    lastError?: any;
  };
  engineHandles?: {
    engine?: TEngine;
    scene?: TScene;
    camera?: TCamera;
    [key: string]: any;
  };
  /**
   * metadata
   * - place for plugins to store runtime data without polluting the root of ctx
   * - standard keys used by pipeline/plugins:
   *   - stagesCompleted: record of completed stage -> boolean
   *   - stageLocks: record of running stage -> boolean (concurrent guard)
   *   - stageCleanups: optional per-stage array of cleanup callbacks to run before re-running a stage
   */
  metadata?: {
    stagesCompleted?: Record<string, boolean>;
    stageLocks?: Record<string, boolean>;
    // stageCleanups[stageName] = array of async/sync cleanup functions invoked before re-running that stage
    stageCleanups?: Record<
      string,
      Array<(ctx: RenderingContext<TEngine, TScene, TCamera>) => void | Promise<void>>
    >;
    [key: string]: any;
  };
  [key: string]: any;
}
