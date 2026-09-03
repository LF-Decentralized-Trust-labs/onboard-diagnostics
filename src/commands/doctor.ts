import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { getAdapter, listAdapters } from "../adapters/index.js";
import { runCoreChecks } from "../core/checks.js";
import { countStatuses, exitCodeForSummary } from "../core/result.js";
import type { CheckContext, DoctorOptions, DoctorReport } from "../core/types.js";

const PACKAGE_JSON_PATH = fileURLToPath(new URL("../../package.json", import.meta.url));

export async function runDoctor(options: DoctorOptions): Promise<number> {
  const context: CheckContext = {
    cwd: process.cwd(),
    env: process.env
  };

  const results = await runCoreChecks(context);

  if (options.adapter) {
    const adapter = getAdapter(options.adapter);
    if (!adapter) {
      const supported = listAdapters().join(", ");
      process.stderr.write(`Unknown adapter "${options.adapter}". Supported adapters: ${supported}\n`);
      return 1;
    }

    results.push(...(await adapter.run(context)));
  }

  const report = await createReport(results, options.adapter);

  if (options.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    printHumanReport(report);
  }

  return exitCodeForSummary(report.summary);
}

async function createReport(results: DoctorReport["results"], adapter?: string): Promise<DoctorReport> {
  return {
    tool: "onboarding-diagnostics",
    version: await readVersion(),
    generated_at: new Date().toISOString(),
    adapter,
    summary: countStatuses(results),
    results
  };
}

async function readVersion(): Promise<string> {
  try {
    const raw = await readFile(PACKAGE_JSON_PATH, "utf8");
    const parsed = JSON.parse(raw) as { version?: string };
    return parsed.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

function printHumanReport(report: DoctorReport) {
  process.stdout.write("Onboarding Diagnostics doctor\n");
  process.stdout.write("Track: Onboarding Diagnostics Lab\n");
  process.stdout.write(`Version: ${report.version}\n`);
  process.stdout.write(`Generated: ${report.generated_at}\n`);
  process.stdout.write(`Adapter: ${report.adapter ?? "core"}\n\n`);

  for (const result of report.results) {
    process.stdout.write(`[${result.status}] ${result.title}\n`);
    process.stdout.write(`  id: ${result.id}\n`);
    process.stdout.write(`  category: ${result.category}\n`);
    process.stdout.write(`  summary: ${result.summary}\n`);
    process.stdout.write(`  details: ${result.details}\n`);
    if (result.suggested_fix) {
      process.stdout.write(`  suggested_fix: ${result.suggested_fix}\n`);
    }
    process.stdout.write("\n");
  }

  process.stdout.write(
    `Summary: PASS=${report.summary.pass} WARN=${report.summary.warn} FAIL=${report.summary.fail}\n`
  );
}
