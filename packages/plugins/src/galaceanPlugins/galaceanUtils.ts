import type { RenderingContext } from "@chameleon/core";
import { BoundingBox, Entity, MeshRenderer, Scene, Vector3, WebGLEngine } from "@galacean/engine";

/**
 * computeModelBoundingSphere
 * - Gather MeshRenderer bounds across the model subtree, merge into a single BoundingBox,
 *   compute center and an approximate radius (half-diagonal of the extent).
 * - Returns a conservative fallback (center at entity world position or origin, radius = 1)
 *   when no renderers are present or bounding calculations fail.
 *
 * Rationale:
 * - Many engines provide per-mesh bounds; merging provides a simple approximate framing metric.
 * - Using half-diagonal of extent yields a stable radius useful for framing calculations.
 */
export function computeModelBoundingSphere(modelEntity: Entity): { center: Vector3; radius: number } {
  const meshRenderers: MeshRenderer[] = [];
  modelEntity.getComponentsIncludeChildren(MeshRenderer, meshRenderers);

  // Start with inverted extremes so bounding merges expand the box correctly.
  const bbox = new BoundingBox();
  bbox.min.set(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
  bbox.max.set(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);

  // If there are no mesh renderers, try to use entity world position as center.
  if (meshRenderers.length === 0) {
    const fallbackCenter = new Vector3();
    try {
      const p = modelEntity.transform.worldPosition;
      fallbackCenter.copyFrom(p);
    } catch {
      // Fall back to zero-vector if worldPosition is unavailable.
    }
    return { center: fallbackCenter, radius: 1.0 };
  }

  // Merge bounds from each renderer; ignore problematic ones to stay robust.
  for (const r of meshRenderers) {
    try {
      BoundingBox.merge(r.bounds, bbox, bbox);
    } catch {
      // Skip renderer if bounds merge fails.
    }
  }

  // Compute center and extent; on failure return a safe fallback.
  const center = new Vector3();
  const extent = new Vector3();
  try {
    bbox.getCenter(center);
    bbox.getExtent(extent);
  } catch {
    return { center, radius: 1.0 };
  }

  // Radius := half the diagonal length of extent (guard against degenerate extent).
  const radius = Math.max(0.0001, extent.length() * 0.5);
  return { center, radius };
}

/**
 * getParsedEntity
 *
 * Extract the parsed model root entity from ctx.parsedGLTF.targetEngineEntity.
 * Throws if the parsed entity is missing to preserve existing pipeline expectations.
 */
export function getParsedEntity(ctx: RenderingContext<WebGLEngine, Scene, Entity>): Entity {
  const parsed = ctx.parsedGLTF?.targetEngineEntity as Entity | undefined;
  if (!parsed) {
    throw new Error("DefGalaceanInteractionPlugin: parsed model entity not found on ctx.parsedGLTF");
  }
  return parsed;
}
