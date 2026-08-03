import { fabricAdapter } from "./fabric/index.js";
import type { DiagnosticAdapter } from "./types.js";

const adapters = [fabricAdapter] satisfies readonly DiagnosticAdapter[];

export function getAdapter(name: string): DiagnosticAdapter | undefined {
  return adapters.find((adapter) => adapter.name === name);
}

export function listAdapters(): readonly string[] {
  return adapters.map((adapter) => adapter.name);
}
