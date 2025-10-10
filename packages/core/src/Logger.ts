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

export class PipelineLogger {
  private records: LogEntry[] = [];
  onRecord?: (rec: LogEntry) => void;

  push(rec: LogEntry) {
    this.records.push(rec);
    this.onRecord && this.onRecord(rec);
  }
  getAll() {
    return this.records.slice();
  }
  clear() {
    this.records.length = 0;
  }
}
