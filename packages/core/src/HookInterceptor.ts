// ...existing code...
import type { FullTap } from "tapable";
import type { Logger } from "./Logger";
import type { RenderingContext } from "./RenderingContext";
import type { Pipeline } from "./Pipeline";

/**
 * attachLoggerToPipeline
 * Attach an interceptor to each pipeline hook to measure execution time and log results.
 *
 * Best practices implemented:
 * - Use pipeline.getHook with properly typed keys to avoid unsafe indexing.
 * - Protect against double-wrapping taps by marking wrapped functions.
 * - Work with both sync and async tap functions by normalizing to Promise.resolve().
 * - Use a resilient high-resolution timer fallback for Node/browser portability.
 * - Fail-safe: interceptor registration errors are caught so they don't break pipeline startup.
 *
 * @param pipeline - Pipeline instance whose hooks will be intercepted
 * @param logger - Logger implementation (must provide info and error)
 */
export function attachLoggerToPipeline(pipeline: Pipeline, logger: Logger): void {
  // high-resolution timer with fallback to Date.now()
  const now = () =>
    typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();

  // iterate over the known hook keys using the pipeline.hooks type to keep typing accurate
  const hookKeys = Object.keys(pipeline.hooks) as Array<keyof typeof pipeline.hooks>;

  for (const key of hookKeys) {
    // getHook enforces the correct key type at compile time
    let hook;
    try {
      hook = pipeline.getHook(key);
    } catch {
      // If getHook throws (shouldn't in normal circumstances), skip this hook
      continue;
    }

    // ensure the hook supports intercept API
    if (!hook || typeof (hook as any).intercept !== "function") continue;

    try {
      // install an interceptor that wraps registered tap functions
      (hook as any).intercept({
        register(tapInfo: FullTap) {
          try {
            // if there's no function to wrap, return as-is
            if (!tapInfo || typeof tapInfo.fn !== "function") return tapInfo;

            const original = tapInfo.fn as (...args: any[]) => any;

            // avoid double-wrapping the same tap function
            if ((original as any).__hookInterceptorWrapped) return tapInfo;

            // replace the tap function with a wrapped version that logs timing and errors
            tapInfo.fn = function wrappedTap(ctx: RenderingContext, ...rest: any[]) {
              const start = now();
              try {
                // support both sync and async original functions
                const result = original.apply(this, [ctx, ...rest]);
                return Promise.resolve(result)
                  .then((res) => {
                    const end = now();
                    try {
                      logger.info?.({
                        type: "hook",
                        status: "ok",
                        hook: String(key),
                        plugin: tapInfo.name,
                        start,
                        end,
                        duration: end - start
                      });
                    } catch (_) {
                      /* swallow logging errors */
                    }
                    return res;
                  })
                  .catch((err) => {
                    const end = now();
                    try {
                      logger.error?.({
                        type: "hook",
                        status: "error",
                        hook: String(key),
                        plugin: tapInfo.name,
                        start,
                        end,
                        duration: end - start,
                        error: String(err)
                      });
                    } catch (_) {
                      /* swallow logging errors */
                    }
                    throw err;
                  });
              } catch (err) {
                // synchronous throw from original tap
                const end = now();
                try {
                  logger.error?.({
                    type: "hook",
                    status: "error",
                    hook: String(key),
                    plugin: tapInfo.name,
                    start,
                    end,
                    duration: end - start,
                    error: String(err)
                  });
                } catch (_) {
                  /* swallow logging errors */
                }
                throw err;
              }
            };

            // mark wrapper so subsequent interceptors won't re-wrap
            (tapInfo.fn as any).__hookInterceptorWrapped = true;
          } catch {
            // if wrapping fails, return tapInfo unmodified to avoid breaking registration
            return tapInfo;
          }

          return tapInfo;
        }
      });
    } catch {
      // if intercept installation fails for this hook, continue to the next hook
      continue;
    }
  }
}
