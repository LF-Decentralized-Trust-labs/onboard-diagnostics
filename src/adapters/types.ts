import type { CheckContext, DiagnosticCheckResult } from "../core/types.js";

export type AdapterContext = Readonly<Pick<CheckContext, "cwd" | "env">>;

export interface DiagnosticAdapter {
  readonly name: string;
  readonly description: string;
  run(context: AdapterContext): Promise<readonly DiagnosticCheckResult[]>;
}
