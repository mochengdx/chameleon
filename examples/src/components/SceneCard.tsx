import React, { useRef, useEffect, useCallback } from "react";

export type SceneCardProps = {
    id?: string;
    title?: string;
    description?: string;
    canvasHeight?: number; // px
    className?: string;
    externalNode?: React.ReactNode;
    onCanvasReady?: (canvas: HTMLCanvasElement) => void;
};

/**
 * Sider
 * - One-row list item with left (title + description) and right (canvas demo).
 * - Uses Tailwind CSS utility classes. Each item occupies one row with vertical spacing.
 */
export default function SceneCard({
    id,
    title = "Title",
    description = "",
    canvasHeight = 160,
    className = "",
    externalNode,
    onCanvasReady,
}: SceneCardProps) {
    const rootId = useRef(id ?? `sider-${Math.random().toString(36).slice(2, 9)}`).current;
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    // simple demo render for canvas when no external renderer is attached
    //   const draw = useCallback((ctx: CanvasRenderingContext2D, t: number) => {
    //     const w = ctx.canvas.width;
    //     const h = ctx.canvas.height;
    //     ctx.clearRect(0, 0, w, h);

    //     const g = ctx.createLinearGradient(0, 0, w, h);
    //     const hue = ((t / 2000) % 1) * 360;
    //     g.addColorStop(0, `hsl(${hue} 70% 55%)`);
    //     g.addColorStop(1, `hsl(${(hue + 90) % 360} 60% 45%)`);
    //     ctx.fillStyle = g;
    //     ctx.fillRect(0, 0, w, h);

    //     ctx.fillStyle = "rgba(255,255,255,0.9)";
    //     ctx.font = `${Math.max(12, Math.min(18, h * 0.08))}px sans-serif`;
    //     ctx.textAlign = "center";
    //     ctx.textBaseline = "middle";
    //     ctx.fillText("Canvas", w / 2, h / 2);
    //   }, []);

    //   // keep canvas backing store crisp and responsive
    //   const resizeCanvas = useCallback((canvas: HTMLCanvasElement, heightPx: number) => {
    //     const rect = canvas.getBoundingClientRect();
    //     const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    //     const cssW = Math.max(1, Math.floor(rect.width));
    //     const cssH = Math.max(1, Math.floor(heightPx));
    //     canvas.style.width = `${cssW}px`;
    //     canvas.style.height = `${cssH}px`;
    //     canvas.width = Math.max(1, Math.floor(cssW * dpr));
    //     canvas.height = Math.max(1, Math.floor(cssH * dpr));
    //     const ctx = canvas.getContext("2d");
    //     if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    //   }, []);


    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // allow external init
        try { onCanvasReady?.(canvas); } catch { /* swallow */ }

        // // initial resize & animation loop
        // resizeCanvas(canvas, canvasHeight);
        // const ctx = canvas.getContext("2d");
        // const start = performance.now();
        // const loop = (t: number) => {
        //   if (!canvas.isConnected) return;
        //   if (ctx) draw(ctx, t - start);
        //   rafRef.current = requestAnimationFrame(loop);
        // };
        // rafRef.current = requestAnimationFrame(loop);

        // // observe parent to follow layout changes (keeps canvas centered and sized)
        // roRef.current = new ResizeObserver(() => resizeCanvas(canvas, canvasHeight));
        // roRef.current.observe(canvas.parentElement ?? canvas);

        // return () => {
        //   if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
        //   if (roRef.current) { roRef.current.disconnect(); roRef.current = null; }
        // };
    }, [canvasHeight, onCanvasReady]);

    return (
        <div
            id={rootId}
            className={`mx-auto max-w-7xl px-6 lg:px-8 ${className}`}
        >
            <div className="flex items-stretch mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">
                {/* Left: title + description */}
                <div className="flex-1 min-w-0">
                    <div className="flex flex-col justify-center h-full">
                        <div
                            className="text-lg font-semibold text-slate-900 dark:text-slate-100 truncate"
                            title={title}
                        >
                            {title}
                        </div>
                        {description ? (
                            <p
                                className="mt-1 text-sm text-slate-600 dark:text-slate-300"
                                title={description}
                                style={{
                                    display: "-webkit-box",
                                    WebkitLineClamp: 3,
                                    WebkitBoxOrient: "vertical",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                }}
                            >
                                {description}
                            </p>
                        ) : null}
                        {externalNode}
                    </div>
                </div>

                {/* Right: centered canvas demo */}
                <div className="w-96 h-96 flex items-center justify-center" >
                    <div className="w-full h-full flex items-center justify-center  overflow-hidden  dark:bg-slate-900 p-1">
                        <canvas
                            ref={canvasRef}
                            className="block w-full h-full bg-white dark:bg-black rounded-xl"
                            style={{ display: "block", width: "100%", height: "100%",touchAction: "none" }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}