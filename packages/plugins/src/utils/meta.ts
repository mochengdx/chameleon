/**
 *
 * Common helpers for RenderingContext.metadata:
 * - initialize the metadata structure
 * - provide utilities for stage locks, cleanup registration, and completion flags
 */

import type { RenderingContext, StageHooks } from "@chameleon/core";

export type StageName = keyof StageHooks;
export type StageCleanupFn = (ctx: RenderingContext<any, any, any, any, any, any>) => Promise<void> | void;

// Use the RenderingContext type's metadata shape rather than attempting to access a runtime prototype.
type RC = RenderingContext<any, any, any, any, any, any>;
type MetadataType = {
  stagesCompleted: Record<string, boolean>;
  stageLocks: Record<string, boolean>;
  stageCleanups: Record<string, Array<StageCleanupFn>>;
  failedStage?: string;
  [key: string]: any;
};

/**
 * ensureMetadata
 * - Ensure ctx.metadata exists and has the common sub-objects:
 *   - stageLocks: record boolean lock state per stage
 *   - stageCleanups: array of cleanup functions per stage
 *   - stagesCompleted: record boolean completed state per stage
 * - Returns the metadata object for convenience.
 */
export function ensureMetadata(ctx: RC): MetadataType {
  ctx.metadata = ctx.metadata || ({ stagesCompleted: {}, stageLocks: {}, stageCleanups: {} } as MetadataType);
  ctx.metadata.stageLocks = ctx.metadata.stageLocks || {};
  ctx.metadata.stageCleanups = ctx.metadata.stageCleanups || {};
  ctx.metadata.stagesCompleted = ctx.metadata.stagesCompleted || {};
  return ctx.metadata as MetadataType;
}

/**
 * isStageLocked
 * - Return true if the named stage is currently locked on the given context.
 */
export function isStageLocked(ctx: RC, stage: StageName): boolean {
  const md = ensureMetadata(ctx);
  return !!md.stageLocks[stage];
}

/**
 * lockStage
 * - Mark the named stage as locked on the context (prevents concurrent execution).
 */
export function lockStage(ctx: RC, stage: StageName) {
  const md = ensureMetadata(ctx);
  md.stageLocks[stage] = true;
}

/**
 * unlockStage
 * - Release the named stage lock on the context.
 */
export function unlockStage(ctx: RC, stage: StageName) {
  const md = ensureMetadata(ctx);
  md.stageLocks[stage] = false;
}

/**
 * addStageCleanup
 * - Register a cleanup function to run when the given stage is cleaned up/disposed.
 * - Cleanup functions are executed with the same ctx parameter.
 */
export function addStageCleanup(ctx: RC, stage: StageName, fn: StageCleanupFn) {
  const md = ensureMetadata(ctx);
  md.stageCleanups[stage] = md.stageCleanups[stage] || [];
  md.stageCleanups[stage].push(fn);
}

/**
 * runStageCleanups
 * - Execute all cleanup functions registered for the named stage.
 * - Each cleanup is awaited; errors in individual cleanups are caught and logged.
 */
export async function runStageCleanups(ctx: RC, stage: StageName) {
  const md = ensureMetadata(ctx);
  const list: StageCleanupFn[] = md.stageCleanups?.[stage] || [];
  for (const fn of list) {
    try {
      await fn(ctx);
    } catch (e) {
      try {
        console.error(`[metadata] cleanup failed for stage ${stage}`, e);
      } catch {}
    }
  }
}

/**
 * markStageCompleted
 * - Set a boolean marker indicating whether the stage has completed.
 */
export function markStageCompleted(ctx: RC, stage: StageName, completed = true) {
  const md = ensureMetadata(ctx);
  md.stagesCompleted[stage] = completed;
}

/**
 * clearStageCleanups
 * - Clear registered cleanup functions for the named stage.
 */
export function clearStageCleanups(ctx: RC, stage: StageName) {
  const md = ensureMetadata(ctx);
  md.stageCleanups[stage] = [];
}
