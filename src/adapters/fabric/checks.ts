import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";
import { checkRequiredEnv } from "../../core/checks.js";
import { createResult } from "../../core/result.js";
import { remediationForMissingFile } from "../../core/remediation.js";
import type { CheckContext, DiagnosticCheckResult } from "../../core/types.js";
import { FABRIC_ENV_HINTS, FABRIC_EXPECTED_MARKERS } from "./fixtures.js";

export async function runFabricChecks(context: CheckContext): Promise<DiagnosticCheckResult[]> {
  const results: DiagnosticCheckResult[] = [];

  for (const hint of FABRIC_ENV_HINTS) {
    results.push(
      checkRequiredEnv(
        context,
        hint.name,
        `fabric:env:${hint.name.toLowerCase()}`,
        `${hint.name} presence`,
        hint.exampleValue
      )
    );
  }

  for (const marker of FABRIC_EXPECTED_MARKERS) {
    results.push(await checkFabricMarker(context.cwd, marker));
  }

  results.push(checkFabricPlaceholderReadiness(context));

  return results;
}

async function checkFabricMarker(cwd: string, marker: string): Promise<DiagnosticCheckResult> {
  const targetPath = join(cwd, marker);

  try {
    await access(targetPath, constants.F_OK);
    return createResult({
      id: `fabric:marker:${marker}`,
      title: `Fabric marker: ${marker}`,
      status: "PASS",
      category: "CONFIGURATION",
      summary: `${marker} is present.`,
      details: `Found ${targetPath} while checking local Fabric onboarding markers.`
    });
  } catch {
    return createResult({
      id: `fabric:marker:${marker}`,
      title: `Fabric marker: ${marker}`,
      status: "WARN",
      category: "CONFIGURATION",
      summary: `${marker} is not present in the current workspace.`,
      details: `Onboarding Diagnostics looked for ${targetPath} as a lightweight indicator of Hyperledger Fabric setup readiness.`,
      suggested_fix: remediationForMissingFile(marker)
    });
  }
}

function checkFabricPlaceholderReadiness(context: CheckContext): DiagnosticCheckResult {
  const hasConfigPath = Boolean(context.env.FABRIC_CFG_PATH);
  const hasSamplesDir = Boolean(context.env.FABRIC_SAMPLES_DIR);

  if (hasConfigPath || hasSamplesDir) {
    return createResult({
      id: "fabric:placeholder-readiness",
      title: "Fabric placeholder readiness",
      status: "PASS",
      category: "CONFIGURATION",
      summary: "At least one Fabric-specific configuration hint is present.",
      details:
        "This is a lightweight placeholder readiness signal for v0. TODO: extend with peer, orderer, and channel artifact validation."
    });
  }

  return createResult({
    id: "fabric:placeholder-readiness",
    title: "Fabric placeholder readiness",
    status: "WARN",
    category: "CONFIGURATION",
    summary: "Fabric-specific readiness signals are incomplete.",
    details:
      "No adapter-specific environment hints were found. TODO: extend this adapter with deterministic checks for peer/orderer startup artifacts and local network topology.",
    suggested_fix:
      "Set FABRIC_CFG_PATH or FABRIC_SAMPLES_DIR and add expected local Fabric configuration files before deeper adapter checks."
  });
}
