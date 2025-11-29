/* eslint-disable react/react-in-jsx-scope */
import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import LoadingSpinner from "./Loading";

type SceneCardProps = {
  id?: string;
  title?: string;
  description?: string;
  className?: string;
  loading?: boolean;
  externalNode?: ReactNode;
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
};

export default function SceneCard({
  id,
  title = "Title",
  description = "",
  className = "",
  loading = false,
  externalNode,
  onCanvasReady
}: SceneCardProps) {
  const rootId = useRef(id ?? `sider-${Math.random().toString(36).slice(2, 9)}`).current;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    console.log("canvas ready");
    try {
      onCanvasReady?.(canvas);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("onCanvasReady threw:", err);
    }
  }, []);

  return (
    <div id={rootId} className={`mx-auto max-w-7xl px-6 lg:px-8 ${className}`}>
      <div className="flex items-stretch mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">
        {/* Left: title + description */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col  h-full">
            <div className="text-lg font-semibold text-slate-900 dark:text-slate-100 truncate" title={title}>
              {title}
            </div>
            <br />
            {description ? (
              <p
                className="mt-1 text-sm text-slate-600 dark:text-slate-300"
                title={description}
                style={{
                  display: "-webkit-box",
                  WebkitLineClamp: 5,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  textOverflow: "ellipsis"
                }}
              >
                {description}
              </p>
            ) : null}
            {externalNode ? <div className="mt-4 flex items-center space-x-3">{externalNode}</div> : null}
          </div>
        </div>

        {/* Right: centered canvas demo */}
        <div className="w-96 h-96 flex items-center justify-center">
          <div className="w-full h-full flex items-center justify-center overflow-hidden dark:bg-slate-900 p-1 relative">
            <canvas
              ref={canvasRef}
              className="block w-full h-full bg-white dark:bg-black rounded-xl"
              style={{ display: "block", width: "100%", height: "100%", touchAction: "none" }}
            />
            {/* loading overlay on top of canvas */}
            {loading ? (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/70 dark:bg-black/60 backdrop-blur-sm">
                <LoadingSpinner text="Loading..." sizeClass="w-8 h-8" />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
