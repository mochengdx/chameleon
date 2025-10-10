import type { PipelineLogger } from "./Logger";

/**
 * Attach to pipeline.hooks to intercept taps and log execution.
 */
export function attachInterceptorToPipeline(pipeline: any, logger: PipelineLogger) {
  for (const key of Object.keys(pipeline.hooks)) {
    const hook = pipeline.hooks[key];
    if (!hook || typeof hook.intercept !== "function") continue;
    hook.intercept({
      register(tapInfo: any) {
        const original = tapInfo.fn;
        tapInfo.fn = async (ctx: any) => {
          const start = performance.now();
          try {
            const r = await original(ctx);
            const end = performance.now();
            logger.push({ type: "hook", hook: String(key), plugin: tapInfo.name, start, end, duration: end - start });
            return r;
          } catch (err) {
            const end = performance.now();
            logger.push({
              type: "error",
              hook: String(key),
              plugin: tapInfo.name,
              start,
              end,
              duration: end - start,
              error: String(err)
            });
            throw err;
          }
        };
        return tapInfo;
      }
    });
  }
}
