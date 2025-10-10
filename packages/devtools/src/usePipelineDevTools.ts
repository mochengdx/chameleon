import create from "zustand";
import type { PipelineLogger, LogEntry } from "@chameleon/core";

type State = {
  logger?: PipelineLogger;
  records: LogEntry[];
  setLogger: (l: PipelineLogger) => void;
  push: (r: LogEntry) => void;
  clear: () => void;
};

export const useDevtoolsStore = create<State>((set) => ({
  logger: undefined,
  records: [],
  setLogger: (l) => {
    l.onRecord = (rec) => set((s) => ({ records: [rec, ...s.records] }));
    set(() => ({ logger: l }));
  },
  push: (r) => set((s) => ({ records: [r, ...s.records] })),
  clear: () => set({ records: [] })
}));
