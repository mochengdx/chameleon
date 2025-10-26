import { EngineAdapter, RenderingContext } from "@chameleon/core";
import {
  Scene,
  Camera,
  WebGLEngine as GLEngine,
  WebGLGraphicDeviceOptions,
  AssetType,
  GLTFResource,
  Entity,
} from "@galacean/engine";
import { SUPPORTED_ADAPTERS } from "./constants";

/**
 * SpecRenderingContext - strongly-typed alias for this adapter's RenderingContext.
 * Keeps method signatures precise and helps type inference at use sites.
 */
type SpecRenderingContext = RenderingContext<
  GLEngine,
  Scene,
  Entity,
  WebGLGraphicDeviceOptions,
  GLTFResource,
  Entity
>;

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
  implements EngineAdapter<GLEngine, Scene, Entity, GLTFResource, Entity, WebGLGraphicDeviceOptions> {
  // adapter id for logging/diagnostics
  name = SUPPORTED_ADAPTERS.galacean;

  // optional runtime handles populated during initEngine
  engine!: GLEngine;
  scene!: Scene;
  camera!: Entity;

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
    this.engine = await GLEngine.create({ canvas, graphicDeviceOptions });

    // obtain the active scene and create a root + camera entity
    this.scene = this.engine.sceneManager.activeScene;
    const rootEntity = this.scene.createRootEntity("root");

    // create camera child and add Camera component
    this.camera = rootEntity.createChild("camera");
    this.camera.addComponent(Camera);

    // start engine loop and ensure canvas size matches client
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

    // use engine's resource manager to load a GLTF asset
    const asset = await this.engine.resourceManager.load<GLTFResource>({
      type: AssetType.GLTF,
      url: src,
    });

    return asset;
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
    const gltfSceneRoot = assets.instantiateSceneRoot();

    // keep backwards-compatible parsedGLTF shape on context for other plugins
    try {
      (ctx as any).parsedGLTF = { targetEngineEntity: gltfSceneRoot };
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
    const parsedEntity: Entity | undefined =
      (ctx as any).parsedGLTF?.targetEngineEntity ?? (parsed as Entity | undefined);

    if (!parsedEntity) {
      throw new Error("GalaceanAdapter.buildScene: no parsed GLTF entity available to attach");
    }

    // attach parsed entity to the scene root
    const rootEntity = scene.getRootEntity();
    rootEntity!.addChild(parsedEntity);
    return ctx;
  }

  /**
   * startRenderLoop
   * - Start a requestAnimationFrame loop that updates the engine and invokes onFrame with delta ms.
   * - Respects ctx.abortSignal for cooperative cancellation.
   */
  startRenderLoop(ctx: SpecRenderingContext, onFrame: (dt: number) => void) {
    let last = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();

    const tick = () => {
      // stop loop if run has been aborted
      if (ctx.abortSignal && ctx.abortSignal.aborted) return;

      // compute delta time accurately
      const now = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
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
      requestAnimationFrame(tick);
    };

    // kick off the loop
    requestAnimationFrame(tick);
  }

  /**
   * dispose
   * - Cleanly destroy the engine instance if present.
   */
  dispose() {
    try {
      this?.engine?.destroy();
    } catch {
      // ignore destroy errors to avoid throwing during cleanup
    }
  }
}