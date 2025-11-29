/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Pipeline, RenderingContext } from "@chameleon/core";

type PipelineEntry = { pipeline: Pipeline; ctx?: RenderingContext };

const map = new WeakMap<HTMLElement, PipelineEntry>();

export function getPipelineForCanvas(canvas: HTMLElement): PipelineEntry | undefined {
  return map.get(canvas);
}

export function setPipelineForCanvas(canvas: HTMLElement, entry: PipelineEntry) {
  map.set(canvas, entry);
}

export function clearPipelineForCanvas(canvas: HTMLElement) {
  map.delete(canvas);
}

export function disposePipelineForCanvas(canvas: HTMLElement) {
  const entry = map.get(canvas);
  if (!entry) return false;
  try {
    const { pipeline, ctx } = entry;
    try {
      // call dispose hook if any
      if (pipeline.hooks.dispose && typeof (pipeline.hooks.dispose as any).call === "function") {
        (pipeline.hooks.dispose as any).call(ctx);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("Error while calling pipeline dispose hook:", err);
    }
    try {
      // try adapter dispose
      const adapter = (pipeline as any).adapter;
      if (adapter && typeof adapter.dispose === "function") {
        adapter.dispose();
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("Error while disposing pipeline adapter:", err);
    }
  } finally {
    map.delete(canvas);
  }
  return true;
}
