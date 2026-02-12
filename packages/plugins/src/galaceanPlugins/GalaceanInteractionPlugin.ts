import type { IPlugin, Pipeline, RenderingContext } from "@chameleon/core";
import type { Entity, Scene, WebGLEngine } from "@galacean/engine";
import { Camera } from "@galacean/engine";
import { OrbitControl } from "@galacean/engine-toolkit";
import { computeModelBoundingSphere } from "./galaceanUtils";

/**
 * DefGalaceanInteractionPlugin
 *
 * Purpose
 * - Run after a scene is constructed to provide a conservative, safe interaction setup
 *   for Galacean-based scenes: configure camera parameters, attach or reuse an orbit
 *   control, compute a simple framing metric and position the camera so the model is visible.
 *
 * Key principles
 * - Defensive: explicit runtime checks with clear error messages for missing handles.
 * - Non-destructive: does not modify model geometry or scene topology, only camera/controls.
 * - Extensible: allows per-request override of the framing margin via ctx.request.userData.fitOffset.
 *
 * Usage
 * - Intended to be registered with the pipeline (pipeline.use or plugin list) so it runs on buildScene.
 */
export class DefGalaceanInteractionPlugin implements IPlugin {
  public name = "DefGalaceanInteractionPlugin";

  // Default multiplier used when computing camera distance so the model comfortably fits.
  private _fitOffset = 1.2;

  /**
   * getCameraEntity
   *
   * Resolve the camera entity from the rendering context:
   *  - preferred: ctx.engineHandles.camera (pipeline/adapter provided)
   *  - fallback: adapter/plugin-stored camera on this instance (backwards compatibility)
   *
   * Throws a clear Error if no camera entity is available.
   */
  private getCameraEntity(ctx: RenderingContext<WebGLEngine, Scene, Entity>): Entity {
    const engineHandles = ctx.engineHandles ?? {};
    const cameraEntity = engineHandles.camera ?? ((this as any).camera as Entity | undefined);
    if (!cameraEntity) {
      throw new Error("DefGalaceanInteractionPlugin: camera entity not available in context.engineHandles");
    }
    return cameraEntity;
  }

  /**
   * getParsedEntity
   *
   * Extract the parsed model root entity from ctx.parsedGLTF.targetEngineEntity.
   * Throws if the parsed entity is missing to preserve existing pipeline expectations.
   */
  private getParsedEntity(ctx: RenderingContext<WebGLEngine, Scene, Entity>): Entity {
    const parsed = ctx.parsedGLTF?.targetEngineEntity as Entity | undefined;
    if (!parsed) {
      throw new Error("DefGalaceanInteractionPlugin: parsed model entity not found on ctx.parsedGLTF");
    }
    return parsed;
  }

  /**
   * getOrCreateOrbitControl
   *
   * Reuse an existing OrbitControl component on the camera entity if present,
   * otherwise add a new OrbitControl. Centralizes control retrieval for easy replacement.
   */
  private getOrCreateOrbitControl(cameraEntity: Entity): OrbitControl {
    if (cameraEntity.getComponent && cameraEntity.getComponent(OrbitControl)) {
      return cameraEntity.getComponent(OrbitControl) as OrbitControl;
    }
    return cameraEntity.addComponent(OrbitControl);
  }

  /**
   * configureCameraForModel
   *
   * Main routine:
   * 1) resolve camera and parsed entity,
   * 2) compute bounding sphere (center + radius),
   * 3) configure orbit target and distance bounds,
   * 4) position the camera at a conservative distance along +Z.
   *
   * Notes:
   * - Uses ctx.request.userData.fitOffset when present; otherwise uses plugin default.
   * - Guards against extremely small FOVs to avoid extreme distances.
   * - Positions the camera conservatively; more advanced framing can be added elsewhere.
   */
  private configureCameraForModel(ctx: RenderingContext<WebGLEngine, Scene, Entity>) {
    // Resolve required handles
    const cameraEntity = this.getCameraEntity(ctx);
    const parsedEntity = this.getParsedEntity(ctx);

    // Compute center + radius for framing
    const { center, radius } = computeModelBoundingSphere(parsedEntity);

    // Ensure camera component exists
    const camera = cameraEntity.getComponent(Camera);
    if (!camera) {
      throw new Error("DefGalaceanInteractionPlugin: Camera component not found on camera entity");
    }

    // Ensure an OrbitControl exists
    const orbitControl = this.getOrCreateOrbitControl(cameraEntity);

    // Determine fit offset (allow request override via ctx.request.userData.fitOffset)
    const fitOffset = ctx.request?.userData?.fitOffset ?? this._fitOffset;

    // Compute distance to fit model in vertical FOV and apply margin
    const fovRad = (camera.fieldOfView * Math.PI) / 180;
    const clampedFov = Math.max(0.01, fovRad); // avoid division by very small values
    const distance = (radius / Math.sin(clampedFov / 2)) * fitOffset;

    // Configure orbit control target and safe min/max distances
    orbitControl.target.set(center.x, center.y, center.z);
    orbitControl.minDistance = Math.max(0.1, distance - radius);
    orbitControl.maxDistance = Math.max(orbitControl.minDistance + 0.1, distance * 4);

    // Position camera along +Z at a conservative scaled distance
    cameraEntity.transform.setPosition(center.x, center.y, center.z + distance * 3 + camera.nearClipPlane);
  }

  /**
   * apply
   *
   * Plugin entrypoint: attach to pipeline.buildScene so camera framing runs after the scene is built.
   * Exceptions from configureCameraForModel are allowed to bubble up to the pipeline so they can be logged.
   */
  apply(pipeline: Pipeline) {
    pipeline.hooks.buildScene.tapPromise(this.name, async (ctx: RenderingContext<WebGLEngine, Scene, Entity>) => {
      this.configureCameraForModel(ctx);
      return ctx;
    });
  }
}
