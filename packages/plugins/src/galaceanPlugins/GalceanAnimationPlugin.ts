import type { IPlugin, Pipeline, RenderingContext } from "@chameleon/core";
import {
  Animator,
  AnimatorLayerBlendingMode,
  AnimatorState,
  AnimatorStateTransition,
  Camera,
  Entity,
  GLTFResource,
  Scene,
  WebGLEngine,
  WrapMode
} from "@galacean/engine";
import { addStageCleanup } from "../utils";

type SpecCtx = RenderingContext<WebGLEngine, Scene, Camera, any, GLTFResource, Entity>;

// type AnimationKey = "idle" | "enter" | "click";
// type AnimationMap = Record<AnimationKey, string>;
type PartialAnimationMap = Partial<Record<"idle" | "enter" | "click", string>>;

/**
 * GalceanAnimationPlugin
 *
 * Responsibility:
 * - discover Animator on the parsed model
 * - configure a simple state machine (enter -> idle, click -> idle)
 * - play entrance on load, keep idle otherwise
 * - on container click, play click animation (model-aware when possible)
 * - ensure deterministic cleanup of DOM listeners
 */
export class GalceanAnimationPlugin implements IPlugin {
  public name = "GalceanAnimationPlugin";

  constructor(public animationMap: PartialAnimationMap) {}

  // track removal functions for registered listeners keyed by request id
  private removers = new Map<string, () => void>();

  // Find the first Animator on the root or its descendants.
  private findAnimator(root: Entity): Animator | undefined {
    // try direct component first
    const direct = root.getComponent(Animator) as Animator | undefined;
    if (direct) return direct;

    // fallback: search children (some engine versions expose getComponentsIncludeChildren)
    try {
      const found: Animator[] = [];
      root.getComponentsIncludeChildren(Animator, found);
      return found.length > 0 ? found[0] : undefined;
    } catch {
      return undefined;
    }
  }

  // Configure base layer and common transitions. Returns resolved states.
  private configureStateMachine(
    animator: Animator,
    names: PartialAnimationMap,
    pipeline?: Pipeline
  ): { idle: AnimatorState; enter?: AnimatorState; click?: AnimatorState } | undefined {
    const layers = animator.animatorController?.layers;
    if (!layers || layers.length === 0) {
      pipeline?.logger?.warn?.("configureStateMachine: animator has no layers");
      return undefined;
    }

    const baseLayer = layers[0];
    baseLayer.blendingMode = AnimatorLayerBlendingMode?.Override ?? (baseLayer as any).blendingMode;
    const sm = baseLayer.stateMachine;
    const states = sm.states;
    if (!states || states.length === 0) return undefined;

    const idle = states.find((s: any) => s.name === names.idle) || states[0];
    sm.defaultState = idle;

    const enter = names.enter ? states.find((s: any) => s.name === names.enter) : undefined;
    if (enter) {
      enter.wrapMode = WrapMode.Once;
      const t = new AnimatorStateTransition();
      t.duration = 1;
      t.offset = 0;
      t.exitTime = 1;
      t.destinationState = idle;
      enter.addTransition(t);
      try {
        sm.addEntryStateTransition(enter);
      } catch {}
    }

    const click = names.click ? states.find((s: any) => s.name === names.click) : undefined;
    if (click) {
      try {
        click.wrapMode = WrapMode.Once;
      } catch {}
      const back = new AnimatorStateTransition();
      back.duration = 0.5;
      back.offset = 0;
      back.exitTime = 1;
      back.destinationState = idle;
      click.addTransition(back);
    }

    return {
      idle: idle as AnimatorState,
      enter: enter as AnimatorState | undefined,
      click: click as AnimatorState | undefined
    };
  }

  // Register click handler that attempts model-only picking using engine camera/physics.
  private registerClickHandler(
    ctx: SpecCtx,
    pipeline: Pipeline,
    animator: Animator,
    clickState: AnimatorState
  ): () => void {
    const bus = ctx?.eventBus;
    if (!bus) {
      pipeline.logger?.info?.("GalceanAnimationPlugin: no eventBus available on ctx; skipping click handler");
    }
    const handler = () => {
      try {
        // Prefer to broadcast the click event so other plugins can react.
        try {
          animator.play(clickState.name);
        } catch (err) {
          pipeline.logger?.warn?.("GalceanAnimationPlugin: click handler play error", err);
        }
      } catch (err) {
        pipeline.logger?.warn?.("GalceanAnimationPlugin: click handler error", err);
      }
    };
    bus.off("model:clicked", handler);
    bus.on("model:clicked", handler);
    const remove = () => bus?.off("model:clicked", handler);
    return remove;
  }

  apply(pipeline: Pipeline) {
    // register buildScene stage logic
    pipeline.hooks.postProcess.tapPromise(this.name, async (ctx: SpecCtx) => {
      const { targetEngineEntity, animations = [] } = ctx.parsedGLTF ?? {};

      // nothing to do if the parsed model or animations are missing
      if (!targetEngineEntity || (animations?.length ?? 0) <= 0) return;

      // find animator on the model (root or children)
      const animator = this.findAnimator(targetEngineEntity);
      if (!animator) {
        pipeline.logger?.warn?.("GalceanAnimationPlugin: no Animator component found on parsed entity");
        return;
      }

      // configure the small FSM; names can be adjusted per-model
      //   const names = {
      //     idle: "ani_bipedIdleV01_idle001",
      //     enter: "ani_bipedPreV01_entrance001",
      //     click: "ani_bipedPreV01_dance001"
      //   };
      const resolved = this.configureStateMachine(animator, this.animationMap, pipeline);
      if (!resolved) return;

      // register click handler that triggers click animation; keep remover for cleanup
      if (resolved.click) {
        const remover = this.registerClickHandler(ctx, pipeline, animator, resolved.click);
        // todo: not sure if Date.now() is good enough here
        const key = ctx.request?.id ?? String(Date.now());
        this.removers.set(key, remover);
      }
      addStageCleanup(ctx, "postProcess", async (cleanupCtx: SpecCtx) => {
        // todo: not sure if Date.now() is good enough here
        const key = cleanupCtx.request?.id ?? String(Date.now());
        const remove = this.removers.get(key);
        if (remove) {
          try {
            remove();
          } catch {
            /* ignore cleanup errors */
          }
          this.removers.delete(key);
        }
      });
    });
  }

  unapply(pipeline: Pipeline): void {
    // run any leftover removers and clear map
    for (const [, remove] of this.removers) {
      try {
        remove();
      } catch {
        /* ignore cleanup errors */
      }
    }
    this.removers.clear();
    pipeline.uninstall(this.name);
  }
}
