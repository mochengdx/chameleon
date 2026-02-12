import type { IPlugin, Pipeline, RenderingContext } from "@chameleon/core";

/**
 * VideoTexturePlugin
 * Replaces materials decorated with `biz:decorate` (type: "video") with a video texture.
 * Manages video element lifecycle and per-frame texture updates.
 */
export class VideoTexturePlugin implements IPlugin {
  name = "VideoTexturePlugin";

  apply(pipeline: Pipeline) {
    pipeline.hooks.buildScene.tapPromise(this.name, async (ctx: RenderingContext) => {
      const parsed = ctx.parsedGLTF as any;
      if (!parsed) return ctx;
      if (Array.isArray(parsed.materials)) {
        for (const m of parsed.materials) {
          const deco = m.extras?.["biz:decorate"];
          if (deco && deco.type === "video" && deco.source) {
            const video = document.createElement("video");
            video.src = deco.source;
            video.loop = true;
            video.muted = true;
            video.playsInline = true;
            try {
              await video.play();
            } catch {
              // autoplay may be blocked by browser policy
            }
            const tex = (ctx.adapter as any).createTextureFromElement?.(video);
            try {
              const scene = (ctx as any).scene;
              if (scene?.traverse) {
                scene.traverse((child: any) => {
                  if (
                    child.isMesh &&
                    child.material &&
                    (child.material.name === m.name || child.material.userData?.gltfMaterialName === m.name)
                  ) {
                    child.material.map = tex;
                    child.material.needsUpdate = true;
                  }
                });
              }
            } catch {
              // scene traversal may fail if scene is not ready
            }
            if (!ctx.metadata) {
              ctx.metadata = {
                stagesCompleted: {},
                stageLocks: {},
                stageCleanups: {}
              };
            }
            const md = ctx.metadata as any;
            md.videoElements = md.videoElements || [];
            md.videoElements.push(video);
          }
        }
      }
      return ctx;
    });

    pipeline.hooks.renderLoop.tapPromise(this.name, async (ctx: RenderingContext) => {
      const videos = ctx.metadata?.videoElements || [];
      if (videos.length && (ctx.adapter as any).updateVideoTexture) {
        for (const v of videos) (ctx.adapter as any).updateVideoTexture(v);
      }
    });
  }
}
