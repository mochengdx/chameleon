// ...existing code...
/* eslint-disable react/react-in-jsx-scope */
import { useEffect, useRef } from "react";

export type BlockProps = {
  id?: string;
  title?: string;
  description?: string;
  className?: string;
  canvasHeight?: number;
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
};

/**
 * Block
 * - top: fixed-height header with title + clamped description
 * - bottom: centered canvas area for rendering
 */
export default function Block({
  id,
  title = "Untitled",
  description = "",
  className = "",
  canvasHeight = 240,
  onCanvasReady
}: BlockProps) {
  const instanceIdRef = useRef(id ?? `block-${Math.random().toString(36).slice(2, 9)}`);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // const roRef = useRef<ResizeObserver | null>(null);
  // const rafRef = useRef<number | null>(null);

  // const drawFrame = useCallback((ctx: CanvasRenderingContext2D, t: number) => {
  //   const w = ctx.canvas.width;
  //   const h = ctx.canvas.height;
  //   ctx.clearRect(0, 0, w, h);
  //   const g = ctx.createLinearGradient(0, 0, w, h);
  //   const a = (t / 2000) % 1;
  //   g.addColorStop(0, `hsl(${(a * 360) | 0} 70% 60%)`);
  //   g.addColorStop(1, `hsl(${((a + 0.3) * 360) | 0} 60% 50%)`);
  //   ctx.fillStyle = g;
  //   ctx.fillRect(0, 0, w, h);
  //   ctx.fillStyle = "rgba(255,255,255,0.9)";
  //   ctx.font = `${Math.max(12, Math.min(24, h * 0.06))}px sans-serif`;
  //   ctx.textAlign = "center";
  //   ctx.textBaseline = "middle";
  //   ctx.fillText("Canvas Preview", w / 2, h / 2);
  // }, []);

  // const resizeCanvas = useCallback((canvas: HTMLCanvasElement, heightPx: number) => {
  //   const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  //   const rect = canvas.getBoundingClientRect();
  //   const cssW = Math.max(0, Math.floor(rect.width));
  //   const cssH = Math.max(0, Math.floor(heightPx));
  //   canvas.style.width = `${cssW}px`;
  //   canvas.style.height = `${cssH}px`;
  //   canvas.width = Math.max(1, Math.floor(cssW * dpr));
  //   canvas.height = Math.max(1, Math.floor(cssH * dpr));
  //   const ctx = canvas.getContext("2d");
  //   if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (onCanvasReady) {
      try {
        onCanvasReady(canvas);
      } catch (err) {
        // surface a local warning to aid debugging without failing builds
        // eslint-disable-next-line no-console
        console.warn("onCanvasReady threw:", err);
      }
    }

    // resizeCanvas(canvas, canvasHeight);

    // const ctx = canvas.getContext("2d");
    // const start = performance.now();
    // const loop = (t: number) => {
    //   if (!canvas.isConnected) return;
    //   if (ctx) drawFrame(ctx, t - start);
    //   rafRef.current = requestAnimationFrame(loop);
    // };
    // rafRef.current = requestAnimationFrame(loop);

    // roRef.current = new ResizeObserver(() => {
    //   resizeCanvas(canvas, canvasHeight);
    // });
    // // observe the visual wrapper so canvas size follows available centered area
    // roRef.current.observe(canvas.parentElement ?? canvas);

    // return () => {
    //   if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    //   if (roRef.current) { roRef.current.disconnect(); roRef.current = null; }
    // };
  }, [canvasHeight, onCanvasReady]);

  return (
    <article
      id={instanceIdRef.current}
      className={`border border-gray-200 dark:border-slate-700 rounded-lg shadow-sm overflow-hidden divide-y divide-gray-100 dark:divide-slate-700 bg-white dark:bg-slate-800 ${className}`}
    >
      {/* Header: fixed height, title and clamped description */}
      <header className="px-4 py-3 h-30 flex flex-col justify-center" aria-hidden={false}>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 truncate" title={title}>
          {title}
        </h3>
        {description ? (
          <p
            className="mt-1 text-sm text-slate-600 dark:text-slate-300"
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              textOverflow: "ellipsis"
            }}
            title={description}
          >
            {description}
          </p>
        ) : null}
      </header>

      {/* Canvas area: center the canvas horizontally and vertically within the allocated height */}
      <div className="p-3">
        {/* use flex container to center canvas; keep full width but center child if it becomes narrower */}
        <div className="w-full flex items-center justify-center" style={{ height: canvasHeight }} aria-hidden="false">
          <canvas
            ref={canvasRef}
            // ensure canvas stays centered; mx-auto is redundant with flex but harmless
            className="mx-auto block rounded-md bg-slate-50 dark:bg-slate-900"
            // allow the canvas to shrink if needed while resizeCanvas will set its rendered size
            style={{ maxWidth: "100%", height: "100%" }}
          />
        </div>
      </div>
    </article>
  );
}
