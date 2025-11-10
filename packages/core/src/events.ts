/**
 * Centralized event names and payload types used across pipeline plugins.
 * Keep small, serializable payloads to avoid engine object retention across runs.
 */
export const MODEL_CLICKED = "model:clicked" as const;

export interface ModelClickedPayload {
  requestId?: string;
  timestamp: number;
  // Mouse event is included for convenience; consumers should not retain the DOM event.
  mouseEvent?: any;
  // engine-specific entity reference; typed as any here to avoid coupling core to engine types
  targetEntity?: any;
}

export type PipelineEvent = typeof MODEL_CLICKED;

export default MODEL_CLICKED;
