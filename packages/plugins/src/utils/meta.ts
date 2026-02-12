/**
 * Common helpers for RenderingContext.metadata:
 * - initialize the metadata structure
 * - provide utilities for stage locks, cleanup registration, and completion flags
 */
import type { RenderingContext } from "@chameleon/core";

type RC = RenderingContext;
type MetadataType = NonNullable<RenderingContext["metadata"]>;

export type StageName = string;
export type StageCleanupFn = (ctx: RC) => Promise<void> | void;

/**
 * ensureMetadata
 * - Ensure ctx.metadata exists and has the common sub-objects:
 *   - stageLocks: record boolean lock state per stage
 *   - stageCleanups: array of cleanup functions per stage
 *   - stagesCompleted: record boolean completed state per stage
 * - Returns the metadata object for convenience.
 */
export function ensureMetadata(ctx: RC): MetadataType {
  if (!ctx.metadata) {
    ctx.metadata = {
      stagesCompleted: {},
      stageLocks: {},
      stageCleanups: {}
    };
  }
  const md = ctx.metadata as MetadataType;
  md.stageLocks = md.stageLocks || {};
  md.stageCleanups = md.stageCleanups || {};
  md.stagesCompleted = md.stagesCompleted || {};
  return md;
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
