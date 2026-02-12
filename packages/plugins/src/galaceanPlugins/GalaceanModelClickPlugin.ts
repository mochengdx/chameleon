import { emitEvent, MODEL_CLICKED, type IPlugin, type Pipeline, type RenderingContext } from "@chameleon/core";
import { PointerButton, PointerPhase, Script, type Entity, type Scene, type WebGLEngine } from "@galacean/engine";
import { FramebufferPicker } from "@galacean/engine-toolkit";
import { addStageCleanup } from "../utils";

type SpecCtx = RenderingContext<WebGLEngine, Scene, any>;

/**
 * ModelClickListenerPlugin
 * - Uses a FramebufferPicker (when available) to detect model hits from DOM clicks.
 * - Emits a `model:clicked` event on `ctx.eventBus` with a small payload.
 * - Registers deterministic cleanup via `ctx.metadata.stageCleanups.buildScene`.
 */
export class GalaceanModelClickPlugin implements IPlugin {
  public name = "GalaceanModelClickPlugin";

  picker: FramebufferPicker | null = null;

  /**
   * Try to create and attach a FramebufferPicker on the given root entity.
   * Returns the picker instance or null when unavailable.
   */
  private createFramebufferPicker(entity: Entity, pipeline: Pipeline): FramebufferPicker | null {
    if (!entity) return null;
    try {
      this.picker = entity.getComponent(FramebufferPicker);
      if (this.picker) return this.picker;
      this.picker = entity.addComponent?.(FramebufferPicker);
      return this.picker;
    } catch (err) {
      pipeline?.logger?.warn?.("GalaceanModelClickPlugin: FramebufferPicker handler error", err);
      return null;
    }
  }

  /**
   * Destroy a previously created FramebufferPicker if it exposes a destroy method.
   */
  private destroyFramebufferPicker(): void {
    if (!this.picker) return;
    try {
      if (typeof this.picker.destroy === "function") this.picker.destroy();
    } catch {
      // ignore destroy errors
    }
  }

  apply(pipeline: Pipeline) {
    pipeline.hooks.postProcess.tapPromise(this.name, async (ctx: SpecCtx) => {
      // resolve engine handles and DOM container
      const engineScene = ctx.engineHandles?.scene as Scene | undefined;
      const cameraEntity = ctx.engineHandles?.camera as Entity | undefined;
      if (!engineScene || !cameraEntity) {
        pipeline.logger?.warn?.("GalaceanModelClickPlugin: missing container or scene");
        return;
      }

      const root = engineScene.getRootEntity?.();
      if (!root) {
        pipeline.logger?.warn?.("GalaceanModelClickPlugin: scene has no root entity");
        return;
      }

      // try to create a FramebufferPicker using the shared helper
      const picker = this.createFramebufferPicker(cameraEntity, pipeline);
      if (!picker) return;

      const bus = ctx?.eventBus;
      if (!bus) {
        pipeline.logger?.info?.("GalaceanModelClickPlugin: no eventBus available on ctx.metadata; skipping");
        // cleanup picker if we created one
        if (picker) this.destroyFramebufferPicker();
        return;
      }
      cameraEntity.addComponent(
        class extends Script {
          private isSingleClick = true;
          name = "GalaceanModelClickScript";
          onUpdate() {
            const inputManager = this.engine.inputManager;
            if (inputManager.isPointerHeldDown(PointerButton.Primary)) {
              const { pointers } = inputManager;
              const pointerPosition = inputManager.pointers[0];
              if (
                pointers.length === 1 &&
                pointerPosition?.deltaPosition.length() <= 0.1 &&
                pointerPosition.phase === PointerPhase.Move
              ) {
                this.isSingleClick = true;
              } else {
                this.isSingleClick = false;
              }
            }
            if (inputManager.isPointerUp(PointerButton.Primary)) {
              if (!this.isSingleClick) return;
              const { pointers } = inputManager;
              if (pointers.length !== 1) {
                this.isSingleClick = false;
                return;
              }
              const pointerPosition = inputManager.pointers[0];
              if (!pointerPosition) return;
              picker!.pick(pointerPosition.position.x, pointerPosition.position.y).then((pickedEntity) => {
                pipeline.logger?.info?.("GalaceanModelClickPlugin: pickedEntity", pickedEntity);
                if (pickedEntity) {
                  // const pickedEntity = pickResult.entity;
                  // Emit the model:clicked event with relevant payload
                  const payload = {
                    requestId: ctx.request?.id,
                    timestamp: Date.now(),
                    targetEntity: pickedEntity
                  };
                  emitEvent(ctx, MODEL_CLICKED, payload);
                }
              });
              // this.isSingleClick = false;
            } else {
              this.isSingleClick = true;
            }
          }
        }
      );

      addStageCleanup(ctx, "postProcess", async () => {
        // cleanup picker if we created one
        const scripts: Script[] = [];
        cameraEntity.getComponents(Script, scripts);
        scripts.forEach((script) => {
          // @ts-ignore
          if (script.name === "GalaceanModelClickScript") {
            script.enabled = false;
            script.destroy();
          }
        });
        if (picker) this.destroyFramebufferPicker();
      });
    });
  }

  unapply(pipeline: Pipeline): void {
    this.destroyFramebufferPicker();
    pipeline.uninstall(this.name);
  }
}

export default GalaceanModelClickPlugin;
