/**
 * Lightweight EventBus for intra-pipeline plugin communication.
 * - Keep implementation minimal and dependency-free so it can be serialized in ctx.metadata.
 * - Provides on/off/once/emit with unsubscribe handles.
 */
export type EventHandler<T = any> = (payload: T) => void | Promise<void>;

export class EventBus {
  private handlers = new Map<string, Set<EventHandler<any>>>();

  on<T = any>(event: string, handler: EventHandler<T>): () => void {
    const set = this.handlers.get(event) ?? new Set<EventHandler<any>>();
    set.add(handler as EventHandler<any>);
    this.handlers.set(event, set);
    return () => this.off(event, handler);
  }

  off<T = any>(event: string, handler: EventHandler<T>): void {
    const set = this.handlers.get(event);
    if (!set) return;
    set.delete(handler as EventHandler<any>);
    if (set.size === 0) this.handlers.delete(event);
  }

  once<T = any>(event: string, handler: EventHandler<T>): () => void {
    const wrapped = (payload: T) => {
      try {
        handler(payload);
      } finally {
        this.off(event, wrapped as EventHandler<T>);
      }
    };
    return this.on(event, wrapped as EventHandler<T>);
  }

  async emit<T = any>(event: string, payload?: T): Promise<void> {
    const set = this.handlers.get(event);
    if (!set) return;
    // copy handlers to avoid mutation during iteration
    const handlers = Array.from(set);
    for (const h of handlers) {
      try {
        await h(payload as T);
      } catch (e) {
        // swallow handler errors; logger should be used by consumers if needed
        // consumers can also subscribe with try/catch inside their handler
      }
    }
  }
}

export default EventBus;
