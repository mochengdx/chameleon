// High-level: Strongly-typed adapter contract used by the Pipeline and plugins.
// The interface is intentionally generic so concrete engine implementations
// can provide precise types for engine handles, scenes, cameras, resources and entities.
import type { RenderingContext } from "./RenderingContext";

/**
 * EngineAdapter
 * Generic adapter contract that keeps all method signatures strongly typed.
 *
 * TEngine: concrete engine handle type (e.g. THREE.WebGLRenderer)
 * TScene: concrete scene/container type (e.g. THREE.Scene)
 * TCamera: concrete camera type (e.g. THREE.Camera)
 * TResource: normalized resource type returned by loader / parser (e.g. parsed glTF model)
 * TEngity: parsed/normalized resource or engine-entity that buildScene consumes
 * TOptions: adapter-specific options passed to initEngine / run-time
 *
 * NOTE: Do not change the method signatures below — comments only.
 */
export interface EngineAdapter<
    TEngine = any,
    TScene = any,
    TCamera = any,
    TResource = any,
    TEngity = any,
    TOptions = any,
> {
    // Adapter identity string used for logging and diagnostics.
    readonly name: string;

    // Optional runtime handles that implementations may set during initEngine.
    // engine: concrete renderer or runtime instance.
    engine?: TEngine;
    // scene: concrete scene graph root or scene object.
    scene?: TScene;
    // camera: concrete camera object used by the engine.
    camera?: TCamera;

    /**
     * initEngine
     * - Purpose: create and initialize engine runtime, scene and camera.
     * - Side-effects: implementations should populate adapter.engine/scene/camera and
     *   may set ctx.engineHandles for downstream plugins.
     * - Return: strongly-typed handles so callers can use concrete types immediately,
     *   or void if the adapter mutates context in-place.
     *
     * Parameters:
     * - container: DOM mount element (canvas or div) provided by the caller.
     * - ctx: strongly-typed RenderingContext that adapters can read/write.
     * - options: adapter-specific initialization options.
     */
    initEngine(
        container: HTMLElement,
        ctx: RenderingContext<TEngine, TScene, TCamera, TOptions, TResource, TEngity>,
        options?: TOptions
    ): Promise<{ engine: TEngine; scene: TScene; camera: TCamera }>;

    /**
     * loadResource
     * - Purpose: load a single source and return a typed raw resource representation.
     * - Note: This API accepts one source string. Implementations may expose batch loaders
     *   separately or the Pipeline/plugin can call loadResource repeatedly.
     *
     * Parameters:
     * - src: resource identifier (typically URL or inline id) to load.
     * - ctx: rendering context for logging, cancellation and metadata.
     *
     * Returns:
     * - Promise resolving to a typed raw resource (TResource).
     */
    loadResource(
        src: string,
        ctx: RenderingContext<TEngine, TScene, TCamera, TOptions, TResource, TEngity>,
    ): Promise<TResource>;

    /**
     * parseResource (optional)
     * - Purpose: convert raw loaded asset into engine-friendly parsed entity/entities.
     * - Use-case: when loadResource returns raw bytes or generic JSON, parseResource
     *   transforms that into TEngity instances (e.g. meshes, materials, metadata).
     *
     * Parameters:
     * - raw: the raw TResource produced by loadResource.
     * - ctx: rendering context.
     *
     * Returns:
     * - Promise resolving to a parsed entity or array of parsed entities.
     */
    parseResource(
        raw: TResource,
        ctx: RenderingContext<TEngine, TScene, TCamera, TOptions, TResource, TEngity>,
    ): Promise<TEngity>;

    /**
     * buildScene
     * - Purpose: construct the engine scene graph / instantiate runtime objects from parsed data.
     * - Expectations: implementations should attach created objects to adapter.scene or ctx.engineHandles.
     *
     * Parameters:
     * - parsed: parsed entity instance(s) produced by parseResource (or equivalent).
     * - ctx: rendering context, used for storing references and communicating with plugins.
     *
     * Returns:
     * - Promise that resolves once scene construction is complete. Implementations may
     *   optionally return the mutated RenderingContext for chaining convenience.
     */
    buildScene(
        parsed: TEngity,
        ctx: RenderingContext<TEngine, TScene, TCamera, TOptions, TResource, TEngity>,
    ): Promise<void | RenderingContext<TEngine, TScene, TCamera, TOptions, TResource>>;

    /**
     * startRenderLoop
     * - Purpose: start the engine's per-frame loop and invoke onFrame on each tick.
     * - Behavior: adapter owns the timing mechanism (requestAnimationFrame or engine ticker).
     *
     * Parameters:
     * - ctx: rendering context provided to per-frame callbacks and hooks.
     * - onFrame: a callback invoked each tick with elapsed time in milliseconds.
     *
     * Notes:
     * - Should not block; long-running per-frame work should be scheduled or deferred.
     * - Implementations should respect ctx.abortSignal for cooperative cancellation if applicable.
     */
    startRenderLoop(
        ctx: RenderingContext<TEngine, TScene, TCamera, TOptions, TResource, TEngity>,
        onFrame: (dtMs: number) => void
    ): void;

    /**
     * dispose (optional)
     * - Purpose: release engine and resource handles allocated by the adapter.
     * - Should be safe to call multiple times (idempotent) and not throw on repeated calls.
     */
    dispose?(): void;
}