import React, { useEffect, useState } from "react";

export const ContextInspector: React.FC = () => {
  const [snap, setSnap] = useState<any>(null);
  useEffect(() => {
    const id = setInterval(() => {
      const ctx = (window as any).__GLPIPE_CTX__;
      if (!ctx) {
        setSnap(null);
        return;
      }
      setSnap({
        id: ctx.request?.id,
        raw: !!ctx.rawAssets,
        parsed: !!ctx.parsedGLTF,
        scene: !!ctx.scene,
        frame: ctx.renderState?.frameCount ?? 0
      });
    }, 500);
    return () => clearInterval(id);
  }, []);
  return <pre className="text-xs">{JSON.stringify(snap, null, 2)}</pre>;
};
