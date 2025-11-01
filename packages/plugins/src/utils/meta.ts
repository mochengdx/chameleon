/**
 * 通用 RenderingContext.metadata 帮助函数
 * - 负责初始化 metadata 结构
 * - 提供锁、cleanup、completed 的常用操作
 */

export type StageName = string;
export type StageCleanupFn = (ctx: any) => Promise<void> | void;

type MetadataType = typeof RenderingContext.prototype.metadata;

export function ensureMetadata(ctx: RenderingContext): MetadataType {
  ctx.metadata = ctx.metadata || {};
  ctx.metadata.stageLocks = ctx.metadata.stageLocks || {};
  ctx.metadata.stageCleanups = ctx.metadata.stageCleanups || {};
  ctx.metadata.stagesCompleted = ctx.metadata.stagesCompleted || {};
  return ctx.metadata;
}

export function isStageLocked(ctx: any, stage: StageName): boolean {
  ensureMetadata(ctx);
  return !!ctx.metadata.stageLocks[stage];
}

export function lockStage(ctx: any, stage: StageName) {
  ensureMetadata(ctx);
  ctx.metadata.stageLocks[stage] = true;
}

export function unlockStage(ctx: any, stage: StageName) {
  ensureMetadata(ctx);
  ctx.metadata.stageLocks[stage] = false;
}

export function addStageCleanup(ctx: any, stage: StageName, fn: StageCleanupFn) {
  ensureMetadata(ctx);
  ctx.metadata.stageCleanups[stage] = ctx.metadata.stageCleanups[stage] || [];
  ctx.metadata.stageCleanups[stage].push(fn);
}

export async function runStageCleanups(ctx: any, stage: StageName) {
  const list: StageCleanupFn[] = (ctx.metadata?.stageCleanups?.[stage]) || [];
  for (const fn of list) {
    try {
      await fn(ctx);
    } catch (e) {
      try { console.error(`[metadata] cleanup failed for stage ${stage}`, e); } catch {}
    }
  }
}

export function markStageCompleted(ctx: any, stage: StageName, completed = true) {
  ensureMetadata(ctx);
  ctx.metadata.stagesCompleted[stage] = completed;
}

export function clearStageCleanups(ctx: any, stage: StageName) {
  ensureMetadata(ctx);
  ctx.metadata.stageCleanups[stage] = [];
}

/**
 * import { addStageCleanup, isStageLocked, lockStage, unlockStage, markStageCompleted } from "@chameleon/core/src/utils/metadata";
// ...existing code...

    // 4) Build scene using adapter.buildScene if provided. Otherwise no-op.
    pipeline.hooks.buildScene.tapPromise(this.name, async (ctx: RenderingContext) => {
-      if (ctx.abortSignal?.aborted) throw new Error("buildScene aborted");
-      ctx.metadata = ctx.metadata || {};
-      ctx.metadata.stageLocks = ctx.metadata.stageLocks || {};
-      if (ctx.metadata.stageLocks["buildScene"]) return ctx;
-      ctx.metadata.stageLocks["buildScene"] = true;
-      try {
-        if (typeof ctx.adapter.buildScene === "function") {
-          await ctx.adapter.buildScene(ctx.parsedGLTF, ctx);
-        }
-      } catch (err) {
-        try { pipeline.logger?.error?.("PipelineAdapterPlugin:buildScene error", err); } catch { }
-        throw err;
-      }
-      // register cleanup: let adapter tear down built scene if it provides a hook,
-      // else provide a conservative default cleanup that clears parsedGLTF.
-      ctx.metadata.stageCleanups = ctx.metadata.stageCleanups || {};
-      ctx.metadata.stageCleanups["buildScene"] = ctx.metadata.stageCleanups["buildScene"] || [];
-      ctx.metadata.stageCleanups["buildScene"].push(async (c: RenderingContext) => {
-        try {
-          // if (typeof c.adapter.dispose === "function") {
-          //   // await c.adapter.dispose();
-          // } else {
-            // fallback: if parsedGLTF contains a targetEngineEntity, try to dispose it if possible
-            const target = (c?.parsedGLTF?.targetEngineEntity) || null;
-            //dx - todo: improve generic disposal strategy based on engine/entity types
-            try {
-              if (target && typeof (target as any).destroy === "function"){
-                target.destroy();
-                ctx.pipeline?.logger?.info?.("PipelineAdapterPlugin: disposed targetEngineEntity during buildScene cleanup");
-              }
-            } catch { }
-          // }
-        } catch { }
-      });
-
-      ctx.metadata.stagesCompleted = ctx.metadata.stagesCompleted || {};
-      ctx.metadata.stagesCompleted["buildScene"] = false;
-      ctx.metadata.stageLocks["buildScene"] = false;
-
-      return ctx;
+      if (ctx.abortSignal?.aborted) throw new Error("buildScene aborted");
+
+      // 如果已经被锁定，直接跳过
+      if (isStageLocked(ctx, "buildScene")) return ctx;
+      lockStage(ctx, "buildScene");
+
+      try {
+        if (typeof ctx.adapter.buildScene === "function") {
+          await ctx.adapter.buildScene(ctx.parsedGLTF, ctx);
+        }
+      } catch (err) {
+        try { pipeline.logger?.error?.("PipelineAdapterPlugin:buildScene error", err); } catch { }
+        throw err;
+      }
+
+      // 注册清理逻辑（可被通用 runner 调用）
+      addStageCleanup(ctx, "buildScene", async (c: RenderingContext) => {
+        try {
+          const target = (c?.parsedGLTF?.targetEngineEntity) || null;
+          try {
+            if (target && typeof (target as any).destroy === "function") {
+              target.destroy();
+              ctx.pipeline?.logger?.info?.("PipelineAdapterPlugin: disposed targetEngineEntity during buildScene cleanup");
+            }
+          } catch {}
+        } catch {}
+      });
+
+      markStageCompleted(ctx, "buildScene", false);
+      unlockStage(ctx, "buildScene");
+      return ctx;
     });
 */