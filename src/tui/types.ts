export type { DecisionFieldLike, SessionLike } from "../ui/types.ts";

export interface TuiOptions {
  stdin?: NodeJS.ReadStream;
  stdout?: NodeJS.WriteStream;
  autoSetup?: boolean;
  firstMessage?: string;
  env?: Record<string, string | undefined>;
  onQuit?: () => void;
}

