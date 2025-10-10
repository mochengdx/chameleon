export type LogEntry = {
  id?: string;
  type: "hook" | "resource" | "frame" | "error" | "info" | "ctx";
  hook?: string;
  plugin?: string;
  start?: number;
  end?: number;
  duration?: number;
  payload?: any;
  error?: any;
};
export declare class PipelineLogger {
  private records;
  onRecord?: (rec: LogEntry) => void;
  push(rec: LogEntry): void;
  getAll(): LogEntry[];
  clear(): void;
}
