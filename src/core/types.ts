export type CheckStatus = "PASS" | "WARN" | "FAIL";

export type CheckCategory =
  | "ENVIRONMENT"
  | "CONFIGURATION"
  | "CONNECTIVITY"
  | "DEPENDENCY"
  | "PERMISSIONS"
  | "UNKNOWN";

export interface DiagnosticCheckResult {
  id: string;
  title: string;
  status: CheckStatus;
  category: CheckCategory;
  summary: string;
  details: string;
  suggested_fix?: string;
}

export interface CheckContext {
  readonly cwd: string;
  readonly env: Readonly<NodeJS.ProcessEnv>;
}

export interface DoctorOptions {
  adapter?: string;
  json?: boolean;
}

export interface StatusCountSummary {
  pass: number;
  warn: number;
  fail: number;
}

export interface DoctorReport {
  tool: string;
  version: string;
  generated_at: string;
  adapter?: string;
  summary: StatusCountSummary;
  results: DiagnosticCheckResult[];
}
