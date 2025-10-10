export class VideoTexturePlugin {
  name = "VideoTexturePlugin";
  apply(pipeline: any) {
    pipeline.hooks.buildScene.tapPromise(this.name, async (ctx: any) => {
      const parsed = ctx.parsedGLTF;
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
            } catch (e) {}
            const tex = ctx.adapter.createTextureFromElement?.(video);
            try {
              ctx.scene &&
                ctx.scene.traverse &&
                ctx.scene.traverse((child: any) => {
                  if (
                    child.isMesh &&
                    child.material &&
                    (child.material.name === m.name || child.material.userData?.gltfMaterialName === m.name)
                  ) {
                    child.material.map = tex;
                    child.material.needsUpdate = true;
                  }
                });
            } catch (e) {}
            ctx.metadata.videoElements = ctx.metadata.videoElements || [];
            ctx.metadata.videoElements.push(video);
          }
        }
      }
      return ctx;
    });

    pipeline.hooks.renderLoop.tapPromise(this.name, async (ctx: any) => {
      const videos = ctx.metadata?.videoElements || [];
      if (videos.length && ctx.adapter.updateVideoTexture) {
        for (const v of videos) ctx.adapter.updateVideoTexture(v);
      }
      return ctx;
    });
  }
}
