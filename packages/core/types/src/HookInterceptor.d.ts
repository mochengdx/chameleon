import type { PipelineLogger } from "./Logger";
/**
 * Attach to pipeline.hooks to intercept taps and log execution.
 */
export declare function attachInterceptorToPipeline(pipeline: any, logger: PipelineLogger): void;
