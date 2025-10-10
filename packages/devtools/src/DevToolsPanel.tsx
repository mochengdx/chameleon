import React from "react";
import { useDevtoolsStore } from "./usePipelineDevTools";
import { PipelineTimeline } from "./PipelineTimeline";
import { ContextInspector } from "./ContextInspector";
import { PluginList } from "./PluginList";

export function DevToolsPanel() {
  const { logger, records } = useDevtoolsStore();

  return (
    <div className="p-4 w-screen h-screen bg-slate-900 text-slate-100 flex flex-col">
      <div className="flex gap-4">
        <button className="px-3 py-1 bg-slate-700 rounded" onClick={() => logger?.clear?.()}>
          Clear
        </button>
      </div>
      <div className="mt-4 flex gap-4 flex-1">
        <div className="flex-1 bg-slate-800 rounded p-3 overflow-auto">
          <h3 className="text-sm font-semibold mb-2">Hook Timeline</h3>
          <PipelineTimeline records={records} />
        </div>
        <div className="w-1/3 flex flex-col gap-2">
          <div className="bg-slate-800 p-3 rounded flex-1 overflow-auto">
            <h3 className="text-sm mb-2">Context</h3>
            <ContextInspector />
          </div>
          <div className="bg-slate-800 p-3 rounded h-60 overflow-auto">
            <h3 className="text-sm mb-2">Plugins</h3>
            <PluginList />
          </div>
        </div>
      </div>
    </div>
  );
}
