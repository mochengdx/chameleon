import type { RenderingContext } from "../RenderingContext";
import type EventBus from "./bus";

/** Safe accessor helpers for the per-run EventBus stored on ctx.eventBus. */
export function getEventBus(ctx?: RenderingContext<any, any, any, any, any, any>): EventBus | undefined {
  try {
    return ctx?.eventBus as EventBus | undefined;
  } catch {
    return undefined;
  }
}

export function onEvent<T = any>(
  ctx: RenderingContext<any, any, any, any, any, any> | undefined,
  event: string,
  handler: (payload: T) => void | Promise<void>
): (() => void) | undefined {
  const bus = getEventBus(ctx);
  if (!bus) return undefined;
  return bus.on(event, handler as any);
}

export function offEvent<T = any>(
  ctx: RenderingContext<any, any, any, any, any, any> | undefined,
  event: string,
  handler: (payload: T) => void | Promise<void>
): void {
  const bus = getEventBus(ctx);
  if (!bus) return;
  bus.off(event, handler as any);
}

export async function emitEvent<T = any>(
  ctx: RenderingContext<any, any, any, any, any, any> | undefined,
  event: string,
  payload?: T
): Promise<void> {
  const bus = getEventBus(ctx);
  if (!bus) return;
  await bus.emit(event, payload);
}

export default { getEventBus, onEvent, offEvent, emitEvent };
