import { access, readFile } from "node:fs/promises";
import { accessSync, constants } from "node:fs";
import { delimiter, join } from "node:path";
import { createResult } from "./result.js";
import { classifyMissingEnv } from "./classification.js";
import {
  remediationForMissingEnv,
  remediationForUnexpectedWorkspace,
  remediationForNodeVersion
} from "./remediation.js";
import type { CheckContext, DiagnosticCheckResult } from "./types.js";

const MIN_NODE_MAJOR = 20;
const PACKAGE_NAME = "@onboarding-diagnostics-lab/onboarding-diagnostics";

export async function runCoreChecks(context: CheckContext): Promise<DiagnosticCheckResult[]> {
  const results: DiagnosticCheckResult[] = [];

  results.push(checkNodeVersion());
  results.push(checkCommandAvailable("npm", "core:npm-available", "npm availability"));
  results.push(checkPlatform());
  results.push(await checkPathVisible(context));
  results.push(await checkWorkingDirectory(context));

  return results;
}

function checkNodeVersion(): DiagnosticCheckResult {
  const actualVersion = process.versions.node;
  const major = Number.parseInt(actualVersion.split(".")[0] ?? "0", 10);

  if (major >= MIN_NODE_MAJOR) {
    return createResult({
      id: "core:node-version",
      title: "Node.js version compatibility",
      status: "PASS",
      category: "ENVIRONMENT",
      summary: `Node.js ${actualVersion} satisfies the minimum supported major version.`,
      details: `Detected Node.js ${actualVersion}; Onboarding Diagnostics requires Node.js ${MIN_NODE_MAJOR}+ for the TypeScript CLI runtime.`
    });
  }

  return createResult({
    id: "core:node-version",
    title: "Node.js version compatibility",
    status: "FAIL",
    category: "ENVIRONMENT",
    summary: `Node.js ${actualVersion} is below the supported major version.`,
    details: `Detected Node.js ${actualVersion}; Onboarding Diagnostics requires Node.js ${MIN_NODE_MAJOR}+ for the diagnostics layer.`,
    suggested_fix: remediationForNodeVersion(MIN_NODE_MAJOR)
  });
}

function checkCommandAvailable(commandName: string, id: string, title: string): DiagnosticCheckResult {
  const commandPath = findCommandPath(commandName);

  if (commandPath) {
    return createResult({
      id,
      title,
      status: "PASS",
      category: "DEPENDENCY",
      summary: `${commandName} is available on PATH.`,
      details: `Resolved ${commandName} at ${commandPath}.`
    });
  }

  return createResult({
    id,
    title,
    status: "FAIL",
    category: "DEPENDENCY",
    summary: `${commandName} is not available on PATH.`,
    details: `The diagnostics layer expected to find ${commandName} in PATH but could not resolve it.`,
    suggested_fix: `Install ${commandName} and ensure it is visible in PATH before rerunning diagnostics.`
  });
}

async function checkPathVisible(context: CheckContext): Promise<DiagnosticCheckResult> {
  const pathValue = context.env.PATH;

  if (pathValue && pathValue.trim().length > 0) {
    return createResult({
      id: "core:path-visible",
      title: "PATH readiness",
      status: "PASS",
      category: "ENVIRONMENT",
      summary: "PATH is set for the current shell session.",
      details: `PATH contains ${pathValue.split(delimiter).length} entries.`
    });
  }

  return createResult({
    id: "core:path-visible",
    title: "PATH readiness",
    status: "FAIL",
    category: "ENVIRONMENT",
    summary: "PATH is empty or unset.",
    details: "A missing PATH prevents command resolution and makes onboarding failures hard to interpret.",
    suggested_fix: "Set PATH in the active shell session and rerun scripts/preflight.sh first."
  });
}

function checkPlatform(): DiagnosticCheckResult {
  return createResult({
    id: "core:platform",
    title: "Platform detection",
    status: "PASS",
    category: "ENVIRONMENT",
    summary: "Platform detection succeeded.",
    details: `Detected ${process.platform} ${process.arch} for the current process.`
  });
}

async function checkWorkingDirectory(context: CheckContext): Promise<DiagnosticCheckResult> {
  const packageJsonPath = join(context.cwd, "package.json");

  try {
    await access(packageJsonPath, constants.F_OK);
    const raw = await readFile(packageJsonPath, "utf8");
    const parsed = JSON.parse(raw) as { name?: string };

    if (parsed.name === PACKAGE_NAME) {
      return createResult({
        id: "core:working-directory",
        title: "Working directory sanity",
        status: "PASS",
        category: "CONFIGURATION",
        summary: "Current working directory looks like the Onboarding Diagnostics repository root.",
        details: `Found package.json with name "${PACKAGE_NAME}" in ${context.cwd}.`
      });
    }

    return createResult({
      id: "core:working-directory",
      title: "Working directory sanity",
      status: "WARN",
      category: "CONFIGURATION",
      summary: "Current working directory is a project workspace, but not the Onboarding Diagnostics repository root.",
      details: `Found package.json${parsed.name ? ` with name "${parsed.name}"` : ""} in ${context.cwd}.`,
      suggested_fix: remediationForUnexpectedWorkspace()
    });
  } catch {
    return createResult({
      id: "core:working-directory",
      title: "Working directory sanity",
      status: "WARN",
      category: "CONFIGURATION",
      summary: "Current working directory does not look like a project root.",
      details: `The CLI did not find a readable package.json in ${context.cwd}.`,
      suggested_fix: remediationForUnexpectedWorkspace()
    });
  }
}

export function checkRequiredEnv(
  context: CheckContext,
  variableName: string,
  id: string,
  title: string,
  exampleValue: string
): DiagnosticCheckResult {
  const value = context.env[variableName];

  if (value && value.trim().length > 0) {
    return createResult({
      id,
      title,
      status: "PASS",
      category: classifyMissingEnv(variableName),
      summary: `${variableName} is set.`,
      details: `Detected ${variableName} in the current environment.`
    });
  }

  return createResult({
    id,
    title,
    status: "WARN",
    category: classifyMissingEnv(variableName),
    summary: `${variableName} is not set.`,
    details: `This environment variable is commonly needed for adapter-specific onboarding checks.`,
    suggested_fix: remediationForMissingEnv(variableName, exampleValue)
  });
}

function findCommandPath(commandName: string): string | undefined {
  const pathValue = process.env.PATH;
  if (!pathValue) {
    return undefined;
  }

  const executableNames =
    process.platform === "win32"
      ? [".exe", ".cmd", ".bat", ""].map((extension) => `${commandName}${extension}`)
      : [commandName];

  for (const entry of pathValue.split(delimiter)) {
    if (!entry) {
      continue;
    }

    for (const executableName of executableNames) {
      const candidate = join(entry, executableName);
      try {
        accessSync(candidate, constants.X_OK);
        return candidate;
      } catch {
        continue;
      }
    }
  }

  return undefined;
}
