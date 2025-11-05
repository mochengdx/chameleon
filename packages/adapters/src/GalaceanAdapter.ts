import { EngineAdapter, RenderingContext } from "@chameleon/core";
import {
  Scene,
  Camera,
  WebGLEngine as GLEngine,
  WebGLGraphicDeviceOptions,
  AssetType,
  GLTFResource,
  Entity
} from "@galacean/engine";
import { SUPPORTED_ADAPTERS } from "./constants";

/**
 * SpecRenderingContext - strongly-typed alias for this adapter's RenderingContext.
 * Keeps method signatures precise and helps type inference at use sites.
 */
type SpecRenderingContext = RenderingContext<GLEngine, Scene, Entity, WebGLGraphicDeviceOptions, GLTFResource, Entity>;

/**
 * GalaceanAdapter
 * - Adapter for Galacean engine.
 * - Responsibilities:
 *   1) initialize engine + create scene/camera,
 *   2) load a GLTF resource from URL,
 *   3) parse a loaded GLTF into an Entity root,
 *   4) attach parsed entity to the engine scene,
 *   5) start a render loop and support disposal.
 *
 * Notes:
 * - Implementation preserves original behavior while tightening runtime checks,
 *   improving error messages, and making per-frame timing accurate.
 */
export class GalaceanAdapter
  implements EngineAdapter<GLEngine, Scene, Entity, GLTFResource, Entity, WebGLGraphicDeviceOptions>
{
  // adapter id for logging/diagnostics
  name = SUPPORTED_ADAPTERS.galacean;

  // optional runtime handles populated during initEngine
  engine?: GLEngine;
  scene?: Scene;
  camera?: Entity;

  // internal render-loop handle
  private _rafId?: number;
  private _renderLoopRunning = false;

  /**
   * initEngine
   * - Create WebGLEngine, root entity and camera entity.
   * - Start the engine run loop and resize canvas to client size.
   * - Return the created engine handles for pipeline convenience.
   */
  async initEngine(container: HTMLElement, ctx: SpecRenderingContext, options?: WebGLGraphicDeviceOptions) {
    // ensure container is a canvas-compatible element for the engine
    const canvas = container as HTMLCanvasElement;
    // create engine with optional graphicDeviceOptions
    const graphicDeviceOptions = (options as WebGLGraphicDeviceOptions) || undefined;
    try {
      this.engine = await GLEngine.create({ canvas, graphicDeviceOptions });
    } catch (err) {
      // bubble a clear error
      throw new Error(`GalaceanAdapter.initEngine: failed to create engine - ${(err as Error)?.message || err}`);
    }
    this.scene = this.engine.sceneManager.activeScene;
    const rootEntity = this.scene.createRootEntity("root");
    // create camera child and add Camera component
    this.camera = rootEntity.createChild("camera");
    this.camera.addComponent(Camera);
    this.engine.run();
    try {
      this.engine.canvas.resizeByClientSize();
    } catch {
      // non-fatal: some environments may not expose resize helper
    }
    // prepare and return typed engine handles
    const engineHandles = { engine: this.engine, scene: this.scene, camera: this.camera };
    return engineHandles;
  }

  /**
   * loadResource
   * - Load a GLTFResource using the engine's resource manager.
   * - Throws if engine isn't initialized.
   */
  async loadResource(src: string, ctx: SpecRenderingContext): Promise<GLTFResource> {
    const engine = ctx?.engineHandles?.engine ?? this.engine;
    if (!engine) {
      throw new Error("GalaceanAdapter.loadResource: engine not initialized");
    }
    console.log(`GalaceanAdapter.loadResource: loading resource from '${src}'`);

    // // attempt GC if available (best-effort)
    // try {
    //   engine.resourceManager?.gc?.();
    // } catch (error) {
    //   // best-effort; do not prevent loading
    // }

    // prefer engine resource manager if present
    if (engine.resourceManager && typeof engine.resourceManager.load === "function") {
      try {
        // this is not best proactice, but we clear the URL cache to force reloads
        // @ts-ignore
        // if (engine.resourceManager?._assetUrlPool?.[src]) {
        //   // @ts-ignore
        //   engine.resourceManager._assetUrlPool[src] = undefined; // clear cache for src to force reload
        // }
        const asset = await engine.resourceManager.load<GLTFResource>({
          type: AssetType.GLTF,
          url: src
        });
        if (!asset) throw new Error("engine.resourceManager.load returned falsy asset");
        return asset;
      } catch (err) {
        // attempt GC if available (best-effort)
        try {
          engine.resourceManager?.gc?.();
        } catch (error) {
          // best-effort; do not prevent loading
        }

        throw new Error(
          `GalaceanAdapter.loadResource: failed to load GLTF from '${src}' - ${(err as Error)?.message || err}`
        );
      }
    }
    // fallback -> try fetch + treat as ArrayBuffer
    try {
      const res = await fetch(src);
      if (!res.ok) throw new Error(`http ${res.status}`);
      const buf = await res.arrayBuffer();
      // Note: without engine resourceManager, we cannot create GLTFResource;
      // return as unknown and let upstream adaptors handle it.
      return buf as unknown as GLTFResource;
    } catch (err) {
      throw new Error(
        `GalaceanAdapter.loadResource: network fallback failed for '${src}' - ${(err as Error)?.message || err}`
      );
    }
  }

  /**
   * parseResource
   * - Instantiate the scene root from a loaded GLTFResource.
   * - Also store the parsed entity on ctx.parsedGLTF for downstream plugins
   *   that expect the conventional { targetEngineEntity } shape.
   */
  async parseResource(assets: GLTFResource, ctx: SpecRenderingContext): Promise<Entity> {
    if (!assets) {
      throw new Error("GalaceanAdapter.parseResource: no assets provided");
    }

    // instantiate the scene root from the GLTF resource
    let gltfSceneRoot: Entity;
    try {
      if (typeof assets?.instantiateSceneRoot === "function") {
        gltfSceneRoot = assets?.instantiateSceneRoot();
      } else {
        throw new Error("GLTFResource missing instantiateSceneRoot");
      }
    } catch (err) {
      throw new Error(
        `GalaceanAdapter.parseResource: failed to instantiate scene root - ${(err as Error)?.message || err, assets, gltfSceneRoot}`
      );
    }

    // keep backwards-compatible parsedGLTF shape on context for other plugins
    try {
      ctx.parsedGLTF = { targetEngineEntity: gltfSceneRoot };
    } catch {
      // non-fatal: ctx may be frozen in some tests; parsed entity is still returned
    }

    return gltfSceneRoot;
  }

  /**
   * buildScene
   * - Attach the parsed entity (from ctx.parsedGLTF) to the engine's root scene.
   * - Strictly checks preconditions and throws informative errors on failure.
   */
  async buildScene(parsed: any, ctx: SpecRenderingContext): Promise<SpecRenderingContext> {
    const engineHandles = ctx?.engineHandles ?? { engine: this.engine, scene: this.scene, camera: this.camera };
    const scene = engineHandles?.scene;
    if (!scene) {
      throw new Error("GalaceanAdapter.buildScene: engine scene not initialized");
    }

    // prefer parsed from context (backwards-compatible) but accept parsed parameter if provided
    const parsedEntity: Entity | undefined = ctx.parsedGLTF?.targetEngineEntity ?? (parsed as Entity | undefined);

    if (!parsedEntity) {
      throw new Error("GalaceanAdapter.buildScene: no parsed GLTF entity available to attach");
    }

    // attach parsed entity to the scene root
    const rootEntity = scene.getRootEntity();
    if (!rootEntity || typeof rootEntity.addChild !== "function") {
      throw new Error("GalaceanAdapter.buildScene: scene root entity not available or invalid");
    }
    try {
      rootEntity.addChild(parsedEntity);
    } catch (err) {
      throw new Error(
        `GalaceanAdapter.buildScene: failed to add parsed entity to scene - ${(err as Error)?.message || err}`
      );
    }
    return ctx;
  }

  /**
   * startRenderLoop
   * - Start a requestAnimationFrame loop that updates the engine and invokes onFrame with delta ms.
   * - Respects ctx.abortSignal for cooperative cancellation.
   */
  startRenderLoop(ctx: SpecRenderingContext, onFrame: (dt: number) => void) {
    if (this._renderLoopRunning) return;
    this._renderLoopRunning = true;
    let last = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();

    const tick = () => {
      // stop loop if run has been aborted or adapter disposed
      if ((ctx.abortSignal && ctx.abortSignal.aborted) || !this._renderLoopRunning) {
        this._renderLoopRunning = false;
        return;
      }

      // compute delta time accurately
      const now = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
      const dt = now - last;
      last = now;

      // update engine if available (non-blocking)
      try {
        if (this.engine && typeof (this.engine as any).update === "function") {
          (this.engine as any).update();
        }
      } catch {
        // swallow engine update errors here; plugin hooks handle errors
      }

      // invoke callback (do not await)
      try {
        onFrame(dt);
      } catch {
        // swallow per-frame callback errors to keep loop alive
      }

      // schedule next frame
      this._rafId = requestAnimationFrame(tick);
    };

    this._rafId = requestAnimationFrame(tick);
  }

  /**
   * dispose
   * - Cleanly destroy the engine instance if present.
   */
  dispose() {
    // stop render loop first
    try {
      this._renderLoopRunning = false;
      if (typeof this._rafId !== "undefined") {
        cancelAnimationFrame(this._rafId);
        this._rafId = undefined;
      }
    } catch {
      // swallow
    }

    try {
      this?.engine?.destroy();
    } catch {
      // ignore destroy errors to avoid throwing during cleanup
    } finally {
      // clear references to help GC
      this.engine = undefined;
      this.scene = undefined;
      this.camera = undefined;
    }
  }
}
