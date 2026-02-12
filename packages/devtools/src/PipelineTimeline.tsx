import React from "react";
import { useDevtoolsStore } from "./usePipelineDevTools";

export const PipelineTimeline: React.FC<{ records?: any[] }> = ({ records: propRecords }) => {
  const storeRecords = useDevtoolsStore((s) => s.records);
  const recs = propRecords ?? storeRecords;
  return (
    <div className="flex flex-col gap-1">
      {recs.map((r, i) => (
        <div key={i} className="text-xs bg-slate-700/40 p-2 rounded">
          <div>
            <strong>{r.hook}</strong> {r.plugin ? `@${r.plugin}` : ""}
          </div>
          <div className="text-amber-200">{r.duration ? `${r.duration.toFixed(2)}ms` : ""}</div>
        </div>
      ))}
      {recs.length === 0 && <div className="text-sm text-slate-400">no records yet</div>}
    </div>
  );
};
