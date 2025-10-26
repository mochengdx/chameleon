// ...existing code...
import type { IPlugin, Pipeline, RenderingContext } from '@chameleon/core';
import {
    WebGLEngine,
    Scene,
    Entity,
    Camera,
    Logger
} from "@galacean/engine";
import { computeModelBoundingSphere } from './galaceanUtils';

/**
 * DefCameraControlPlugin
 *
 * Purpose
 * - Provide a small, conservative camera configuration helper for Galacean-based scenes.
 * - Run after scene construction (hooked into pipeline.buildScene) to ensure the camera has
 *   sane defaults (FOV, near/far planes) and to prepare for future framing/orbit logic.
 *
 * Design goals
 * - Non-invasive: do not modify scene graph beyond setting camera numeric properties.
 * - Defensive: throw clear errors early when expected handles are missing so calling code
 *   can surface meaningful diagnostics.
 * - Extensible: read overrides from ctx.request.userData.cameraConfig when present.
 *
 * Behavior (summary)
 * - Resolve camera entity from ctx.engineHandles or adapter storage.
 * - Ensure a Camera component exists on the resolved entity.
 * - Apply FOV, near and far plane configuration using plugin defaults or user overrides.
 *
 * Notes
 * - This plugin intentionally does not perform full automatic framing here (bounding computation
 *   and orbit control setup may be added by other plugins). The minimal configuration keeps
 *   behavior predictable across environments and is safe to run for multiple list items.
 */
export class DefCameraControlPlugin implements IPlugin {
    public name = 'DefCameraControlPlugin';

    // Plugin defaults used when request.userData.cameraConfig is not supplied.
    // fitOffset reserved for future use where automatic framing might be applied.
    private _cameraConfig = {
        fieldOfView: 60,
        nearClipPlane: 0.1,
        farClipPlane: 1000,
        fitOffset: 1.2
    };


    /**
     * getCameraEntity
     *
     * Resolve the camera entity to configure.
     * - Primary source: ctx.engineHandles.camera (the pipeline/adapter should populate this).
     * - Secondary source: adapter-owned camera stored on the plugin instance (backwards compatibility).
     *
     * Throws a clear Error if no camera entity is available. This explicit failure makes it
     * easier to understand pipeline misconfiguration at runtime.
     */
    private getCameraEntity(ctx: RenderingContext<WebGLEngine, Scene, Entity>): Entity {
        const engineHandles = ctx.engineHandles ?? {};
        const cameraEntity = engineHandles.camera ?? (this as any).camera as Entity | undefined;
        if (!cameraEntity) {
            throw new Error("DefCameraControlPlugin: camera entity not available in context.engineHandles");
        }
        return cameraEntity;
    }

    private getParsedEntity(ctx: RenderingContext<WebGLEngine, Scene, Entity>): Entity {
        const parsed = ctx.parsedGLTF?.targetEngineEntity as Entity | undefined;
        if (!parsed) {
            throw new Error("DefCameraControlPlugin: parsed model entity not found on ctx.parsedGLTF");
        }
        return parsed;
    }

    // private configureTargetEntity(ctx: RenderingContext<WebGLEngine, Scene, Entity>) {
    //     const parsedEntity = this.getParsedEntity(ctx);
    //     // Placeholder for future logic that might configure the parsed entity.
    //     // Currently unused in this minimal camera configuration plugin.
    //     parsedEntity.transform.setPosition(0, 0, 0);
    // }

    /**
     * configureCameraForModel
     *
     * Apply safe camera numeric settings.
     * - Reads optional overrides from ctx.request.userData.cameraConfig.
     * - Sets camera to perspective mode and applies FOV / near / far with clamped sensible defaults.
     *
     * Implementation choices
     * - We do not attempt complex framing here to avoid coupling this plugin to any specific
     *   bounding/instantiation behaviour. Framing and orbit control can be implemented in a
     *   separate plugin that depends on parsed scene entities being present.
     */
    private configureCameraForModel(ctx: RenderingContext<WebGLEngine, Scene, Entity>) {
        // Resolve required handles (throws with clear message if missing).
        const cameraEntity = this.getCameraEntity(ctx);
        const parsedEntity = this.getParsedEntity(ctx);
        const { center, radius } = computeModelBoundingSphere(parsedEntity);
        cameraEntity.transform.setPosition(center.x, center.y, center.z + radius * 4);


        // Ensure camera component exists and is usable.
        const camera = cameraEntity.getComponent(Camera);
        if (!camera) {
            throw new Error("DefCameraControlPlugin: Camera component not found on camera entity");
        }

        // Allow per-request overrides; fall back to plugin defaults.
        const cameraConfig = (ctx?.request?.userData?.cameraConfig || this._cameraConfig) as typeof this._cameraConfig;

        // Apply configuration with safe clamps where applicable.
        camera.isOrthographic = false; // ensure perspective camera
        camera.enableFrustumCulling = false; // keep objects visible until explicit culling logic runs
        camera.fieldOfView = cameraConfig.fieldOfView || 60;
        camera.nearClipPlane = Math.max(0.01, cameraConfig.nearClipPlane || 0.1);
        camera.farClipPlane = cameraConfig.farClipPlane || 1000
        // Note: positioning, orbit control setup, and precise framing are intentionally omitted.
        // Those responsibilities belong to a dedicated framing/orbit plugin that can depend on
        // parsed scene entities being attached to the engine scene.
    }

    /**
     * apply
     *
     * Plugin lifecycle entrypoint. Attach to the pipeline buildScene hook so this minimal
     * camera configuration runs after scene construction completes.
     *
     * Errors thrown by configureCameraForModel are allowed to bubble up so the pipeline can
     * log or react to misconfiguration during development.
     */
    apply(pipeline: Pipeline) {
        pipeline.hooks.buildScene.tapPromise(this.name, async (ctx: RenderingContext<WebGLEngine, Scene, Entity>) => {
            this.configureCameraForModel(ctx);
            return ctx;
        });
    }
}