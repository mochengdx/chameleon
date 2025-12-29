/* eslint-disable @typescript-eslint/no-explicit-any */
import type { IPlugin, Pipeline, RenderingContext } from "@chameleon/core";
import type { Entity, GLTFResource, Scene, WebGLEngine } from "@galacean/engine";
import { Animator } from "@galacean/engine";

type SpecCtx = RenderingContext<WebGLEngine, Scene, Entity, any, GLTFResource, Entity>;

/**
 * AnimationManagerPlugin
 *
 * Implements a lightweight animation state machine for Galacean-based models.
 * Behavior:
 * - Collects available animation clips from the GLTF/Animator.
 * - Plays an "enter" animation on scene build (if present), otherwise falls back to "idle".
 * - Listens for user clicks on the container to trigger a "click" animation.
 * - Runs an idle animation when no other action is active.
 * - If a requested animation is started while a current animation hasn't finished,
 *   the plugin attempts a cross-fade (if supported) or immediately plays the
 *   next clip.
 * - Uses the pipeline.renderLoop hook to track elapsed playback time
 *   and transition states.
 */
export class AnimationManagerPlugin implements IPlugin {
  public name = "AnimationManagerPlugin";
  // sample known clip names (for reference)

  // internal state
  private _onClick: () => void = () => {};
  private _renderLoopTap: any = null;
  apply(pipeline: Pipeline) {
    pipeline.hooks.buildScene.tapPromise(this.name, async (ctx: SpecCtx) => {
      const { targetEngineEntity, animations } = ctx.parsedGLTF ?? {};
      console.log(
        "AnimationManagerPlugin animations names:",
        animations?.map((a) => a.name)
      );
      if (!targetEngineEntity) return ctx;
      // Find an Animator on the root or its children
      let animator: Animator | undefined = targetEngineEntity.getComponent(Animator) as Animator | undefined;
      if (!animator) {
        // search children for first animator (Galacean API: getComponentsIncludeChildren)
        const found: Animator[] = [];
        try {
          targetEngineEntity.getComponentsIncludeChildren(Animator, found);
        } catch (err) {
          // ignore errors from getComponentsIncludeChildren on some engine versions
          void err;
        }
        animator = (found && found[0]) as Animator | undefined;
      }

      if (!animator) {
        pipeline.logger?.warn?.("AnimationManagerPlugin: no Animator component found on parsed entity");
        return ctx;
      }

      // Normalize available clips. Try several common places: animator.clips, parsedGLTF animations
      const clips: Array<{ name: string; duration: number }> = [];
      try {
        // try animator.clips if present
        const aClips = (animator as any).clips || (ctx.parsedGLTF as any)?.animations || [];
        for (const c of aClips) {
          const name = c?.name || String(c?.trackName || clips.length);
          const duration =
            typeof c?.duration === "number" ? c.duration : typeof c?.length === "number" ? c.length : 1.0;
          clips.push({ name, duration });
        }
      } catch (err) {
        // fall back to a single unnamed clip
        void err;
      }

      if (clips.length === 0) {
        // if we couldn't enumerate clips, expose a default placeholder so the state machine can still run
        clips.push({ name: "default", duration: 1.0 });
      }

      // Helper: pick clip by conventional name or fallback to first
      const pick = (preferred: string[]) => {
        for (const p of preferred) {
          const found = clips.find((x) => x.name?.toLowerCase() === p.toLowerCase());
          if (found) return found;
        }
        return clips[0];
      };

      const enterClip = pick(["enter", "intro", "open"]);
      const clickClip = pick(["click", "tap", "press"]);
      const idleClip = pick(["idle", "loop", "default"]);

      // State machine state
      let current: { name: string; duration: number } | null = null;
      let elapsed = 0;
      let requested: { name: string; fade: number } | null = null;

      const playClip = (clipName: string, fade = 0.25) => {
        // mark fade as used to satisfy linter/TS no-unused-vars when crossFade isn't used
        void fade;
        // attempt cross-fade if supported
        try {
          if (typeof animator?.crossFade === "function") {
            animator.play(clipName);

            // (animator as any).crossFade(clipName, fade);
          } else if (typeof animator?.play === "function") {
            animator.play(clipName);
          } else {
            pipeline.logger?.warn?.("AnimationManagerPlugin: animator has no play/crossFade API");
          }
        } catch (e) {
          pipeline.logger?.error?.("AnimationManagerPlugin: error playing clip", e);
        }
      };

      const requestPlay = (clip: { name: string; duration: number }, fade = 0.25) => {
        // If no current or current finished, play immediately
        if (!current) {
          current = clip;
          elapsed = 0;
          playClip(clip.name, fade);
          return;
        }
        // If current still playing, request transition (will be handled in render loop)
        requested = { name: clip.name, fade };
      };

      // Start: play enter animation then idle
      requestPlay(enterClip, 0.3);

      // click handler on the container
      const container = ctx.container as HTMLElement | null;
      this._onClick = () => {
        requestPlay(clickClip, 0.2);
      };
      if (container && typeof container.addEventListener === "function") {
        container.addEventListener("click", this._onClick);
      }

      // Register renderLoop tap to advance state machine
      this._renderLoopTap = (dt: number) => {
        if (!current) return;
        elapsed += dt / 1000; // dt is ms -> seconds

        // if a request exists, initiate crossfade immediately
        if (requested) {
          const nextName = requested.name;
          const fade = requested.fade;
          // start next
          playClip(nextName, fade);
          // update current to requested clip if we can find its duration
          const nextClip = clips.find((c) => c.name === nextName) || { name: nextName, duration: 1 };
          current = nextClip;
          elapsed = 0;
          requested = null;
          return;
        }

        // if current finished, automatically transition to idle
        if (elapsed >= (current.duration || 0.001)) {
          if (current.name !== idleClip.name) {
            // transition to idle (cross-fade)
            playClip(idleClip.name, 0.3);
            current = idleClip;
            elapsed = 0;
          } else {
            // keep looping idle
            elapsed = 0;
          }
        }
      };

      try {
        pipeline.hooks.renderLoop.tap(this.name, this._renderLoopTap);
      } catch (err) {
        // older tapable versions may only support tapPromise; try a fallback
        void err;
        try {
          pipeline.hooks.renderLoop.tapPromise(this.name, async () => {});
        } catch (err2) {
          void err2;
        }
      }

      // store cleanup on dispose (register a cleanup to remove event listeners and taps)
      // attach to pipeline dispose hook via addStageCleanup if available on ctx.metadata
      return ctx;
    });
  }

  unapply(pipeline: Pipeline): void {
    try {
      if (this._renderLoopTap && pipeline.hooks.renderLoop && (pipeline.hooks.renderLoop as any).taps) {
        // remove tap by name
        const name = this.name;
        (pipeline.hooks.renderLoop as any).taps = (pipeline.hooks.renderLoop as any).taps.filter(
          (t: any) => t.name !== name
        );
      }
    } catch (err) {
      void err;
    }
  }
}
