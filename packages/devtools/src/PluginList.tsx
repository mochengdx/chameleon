import React, { useEffect, useState } from "react";

export const PluginList: React.FC = () => {
  const [list, setList] = useState<any[]>([]);
  useEffect(() => {
    const p = (window as any).__GLPIPE_PLUGINS__ || [];
    setList(p.map((x: any) => ({ name: x.name })));
  }, []);
  return (
    <div className="text-xs">
      {list.map((p, i) => (
        <div key={i} className="p-1 bg-slate-700/30 mb-1 rounded">
          {p.name}
        </div>
      ))}
      {list.length === 0 && <div className="text-slate-400">no plugin registered</div>}
    </div>
  );
};
