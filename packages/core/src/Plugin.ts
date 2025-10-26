import { Pipeline } from "./Pipeline";

/**
 * IPlugin
 * Minimal plugin contract for the Pipeline.
 *
 * - name: unique plugin identifier used for logging and hook registration.
 * - apply(pipeline): required installation hook where the plugin should register
 *   its hook callbacks and any initialization logic against the provided Pipeline.
 * - unapply?(pipeline): optional teardown/uninstall hook. Implement when the plugin
 *   must support runtime removal; should undo registrations and free resources.
 *
 * Best practices:
 * - Keep apply idempotent (safe to call multiple times) when possible.
 * - If supporting unapply, make it idempotent and ensure it cleans up any side-effects
 *   created in apply (tap registrations, timers, external listeners, etc.).
 * - Prefer registering per-context cleanup on pipeline.hooks.dispose inside apply
 *   if plugin lifecycle should follow pipeline lifecycle instead of dynamic unapply.
 */
export interface IPlugin {
  // Human-readable, unique plugin name.
  name: string;

  // Called once to register the plugin with the Pipeline.
  apply: (pipeline: Pipeline) => void;

  // Optional: called to uninstall / undo apply side-effects at runtime.
  // Implement when you need explicit plugin removal. Should be safe to call repeatedly.
  unapply?(pipeline: Pipeline): void;
}