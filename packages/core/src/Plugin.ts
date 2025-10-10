import { Pipeline } from "./Pipeline";

export interface Plugin {
  name: string;
  apply: (pipeline: Pipeline) => void;
}
