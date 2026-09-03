import test from "node:test";
import assert from "node:assert/strict";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const cliPath = join(repoRoot, "dist/index.js");
const preflightPath = join(repoRoot, "scripts/preflight.sh");
const posixShellPath = "/bin/sh";
const skipPreflightTests =
  process.platform === "win32" ? "scripts/preflight.sh requires a POSIX shell" : false;

function resolveCommandDirectory(commandName) {
  const result = spawnSync(posixShellPath, ["-c", `command -v ${commandName}`], {
    env: process.env,
    encoding: "utf8"
  });

  if (result.status !== 0 || !result.stdout.trim()) {
    throw new Error(`Could not resolve ${commandName} while preparing preflight tests`);
  }

  return dirname(result.stdout.trim());
}

const controlledPreflightPath = [
  dirname(process.execPath),
  resolveCommandDirectory("npm"),
  "/usr/bin",
  "/bin"
].filter((entry, index, entries) => entries.indexOf(entry) === index).join(":");

function createPreflightEnv(overrides = {}) {
  return {
    ...process.env,
    PATH: controlledPreflightPath,
    ...overrides
  };
}

function runDoctor({
  args = [],
  cwd = repoRoot,
  env = process.env
} = {}) {
  const result = spawnSync(process.execPath, [cliPath, "doctor", ...args], {
    cwd,
    env,
    encoding: "utf8"
  });

  if (result.error) {
    throw result.error;
  }

  return result;
}

function createWorkspaceFixture() {
  const fixtureDir = mkdtempSync(join(tmpdir(), "onboarding-diagnostics-doctor-test-"));

  writeFileSync(
    join(fixtureDir, "package.json"),
    JSON.stringify(
      {
        name: "fixture-workspace",
        version: "1.0.0"
      },
      null,
      2
    )
  );

  return fixtureDir;
}

function runPreflight({
  cwd = repoRoot,
  env = process.env
} = {}) {
  const result = spawnSync(posixShellPath, [preflightPath], {
    cwd,
    env,
    encoding: "utf8"
  });

  if (result.error) {
    throw result.error;
  }

  return result;
}

test("doctor human-readable output shows PASS and WARN markers for a controlled workspace", (t) => {
  const fixtureDir = createWorkspaceFixture();
  t.after(() => rmSync(fixtureDir, { recursive: true, force: true }));

  const result = runDoctor({ cwd: fixtureDir });

  assert.equal(result.status, 0);
  assert.equal(result.stderr, "");
  assert.match(result.stdout, /^Onboarding Diagnostics doctor/m);
  assert.match(result.stdout, /^Track: Onboarding Diagnostics Lab$/m);
  assert.match(result.stdout, /\[PASS\]/);
  assert.match(result.stdout, /\[WARN\]/);
  assert.match(result.stdout, /Summary: PASS=\d+ WARN=\d+ FAIL=0/);
});

test("doctor recognizes the repository root after the scoped package rename", () => {
  const result = runDoctor();

  assert.equal(result.status, 0);
  assert.match(result.stdout, /^\[PASS\] Working directory sanity$/m);
  assert.match(
    result.stdout,
    /package\.json with name "@onboarding-diagnostics-lab\/onboarding-diagnostics"/
  );
});

test("doctor human-readable output shows FAIL markers when PATH is intentionally empty", () => {
  const result = runDoctor({
    env: {
      ...process.env,
      PATH: ""
    }
  });

  assert.equal(result.status, 1);
  assert.equal(result.stderr, "");
  assert.match(result.stdout, /\[FAIL\]/);
  assert.match(result.stdout, /Summary: PASS=\d+ WARN=\d+ FAIL=\d+/);
});

test("doctor JSON output is valid and includes automation-friendly fields with PASS and WARN statuses", (t) => {
  const fixtureDir = createWorkspaceFixture();
  t.after(() => rmSync(fixtureDir, { recursive: true, force: true }));

  const result = runDoctor({
    args: ["--json"],
    cwd: fixtureDir
  });

  assert.equal(result.status, 0);
  assert.equal(result.stderr, "");

  const report = JSON.parse(result.stdout);

  assert.equal(report.tool, "onboarding-diagnostics");
  assert.equal(typeof report.version, "string");
  assert.equal(typeof report.generated_at, "string");
  assert.equal(report.adapter, undefined);
  assert.equal(typeof report.summary.pass, "number");
  assert.equal(typeof report.summary.warn, "number");
  assert.equal(typeof report.summary.fail, "number");
  assert.ok(Array.isArray(report.results));
  assert.ok(report.results.length > 0);
  assert.ok(report.results.some((result) => result.status === "PASS"));
  assert.ok(report.results.some((result) => result.status === "WARN"));
  assert.ok(
    report.results.every((result) =>
      typeof result.id === "string" &&
      typeof result.title === "string" &&
      typeof result.status === "string" &&
      typeof result.summary === "string" &&
      typeof result.details === "string"
    )
  );
});

test("doctor JSON output includes FAIL results when PATH is intentionally empty", () => {
  const result = runDoctor({
    args: ["--json"],
    env: {
      ...process.env,
      PATH: ""
    }
  });

  assert.equal(result.status, 1);
  assert.equal(result.stderr, "");

  const report = JSON.parse(result.stdout);

  assert.ok(Array.isArray(report.results));
  assert.ok(report.summary.fail > 0);
  assert.ok(report.results.some((result) => result.status === "FAIL"));
});

test("preflight human-readable output follows doctor-style result blocks", { skip: skipPreflightTests }, () => {
  const result = runPreflight({ env: createPreflightEnv() });

  assert.equal(result.status, 0);
  assert.equal(result.stderr, "");
  assert.match(result.stdout, /^Onboarding Diagnostics preflight/m);
  assert.match(result.stdout, /^Track: Onboarding Diagnostics Lab$/m);
  assert.match(result.stdout, /^\[PASS\] Node\.js availability$/m);
  assert.match(result.stdout, /^\[PASS\] npx availability$/m);
  assert.match(result.stdout, /^\[PASS\] Node\.js version compatibility$/m);
  assert.match(result.stdout, /^  id: preflight:node-available$/m);
  assert.match(result.stdout, /^  category: DEPENDENCY$/m);
  assert.match(result.stdout, /^  summary: Node\.js is available on PATH\.$/m);
  assert.match(result.stdout, /^  details: Resolved node at .+$/m);
  assert.match(result.stdout, /^\[PASS\] PATH sanity$/m);
  assert.match(result.stdout, /^\[PASS\] Shell availability$/m);
  assert.match(result.stdout, /^\[PASS\] Working directory writability$/m);
  assert.match(result.stdout, /^Summary: PASS=\d+ WARN=\d+ FAIL=0$/m);
  assert.match(
    result.stdout,
    /^NEXT STEP: .+@onboarding-diagnostics-lab\/onboarding-diagnostics doctor.+$/m
  );
  assert.doesNotMatch(result.stdout, /^PASS\s{2,}/m);
  assert.doesNotMatch(result.stdout, /zero-dependency baseline checks|intentionally runs/);
});

test("preflight human-readable output shows FAIL blocks and summary when PATH is empty", {
  skip: skipPreflightTests
}, () => {
  const result = runPreflight({
    env: createPreflightEnv({
      PATH: "",
      SHELL: ""
    })
  });

  assert.equal(result.status, 1);
  assert.equal(result.stderr, "");
  assert.match(result.stdout, /^\[FAIL\] Node\.js availability$/m);
  assert.match(
    result.stdout,
    /^  suggested_fix: Install Node\.js and ensure it is visible in PATH before rerunning diagnostics\.$/m
  );
  assert.match(result.stdout, /^\[FAIL\] PATH sanity$/m);
  assert.match(result.stdout, /^\[FAIL\] Shell availability$/m);
  assert.match(result.stdout, /^\[FAIL\] npx availability$/m);
  assert.match(result.stdout, /^Summary: PASS=\d+ WARN=\d+ FAIL=5$/m);
  assert.match(result.stdout, /^NEXT STEP: Fix the FAIL results above, then rerun this preflight script\.$/m);
  assert.doesNotMatch(result.stdout, /^FAIL\s{2,}/m);
});

test("preflight fails when Node.js is older than version 20", {
  skip: skipPreflightTests
}, (t) => {
  const fixtureBin = mkdtempSync(join(tmpdir(), "onboarding-diagnostics-preflight-bin-"));
  const fakeNodePath = join(fixtureBin, "node");
  writeFileSync(fakeNodePath, "#!/bin/sh\nprintf 'v18.20.0\\n'\n");
  chmodSync(fakeNodePath, 0o755);
  t.after(() => rmSync(fixtureBin, { recursive: true, force: true }));

  const result = runPreflight({
    env: createPreflightEnv({
      PATH: `${fixtureBin}:${controlledPreflightPath}`
    })
  });

  assert.equal(result.status, 1);
  assert.match(result.stdout, /^\[FAIL\] Node\.js version compatibility$/m);
  assert.match(
    result.stdout,
    /Detected v18\.20\.0; Onboarding Diagnostics requires Node\.js 20 or newer\./
  );
  assert.match(result.stdout, /suggested_fix: Upgrade to Node\.js 20 or newer, then rerun preflight\./);
});

test("preflight warns when PATH contains missing or empty entries", {
  skip: skipPreflightTests
}, () => {
  const result = runPreflight({
    env: createPreflightEnv({
      PATH: `${controlledPreflightPath}::/onboarding-diagnostics/missing-path-entry`
    })
  });

  assert.equal(result.status, 0);
  assert.equal(result.stderr, "");
  assert.match(result.stdout, /^\[WARN\] PATH sanity$/m);
  assert.match(
    result.stdout,
    /^  summary: PATH contains entries that may make command resolution unreliable\.$/m
  );
  assert.match(result.stdout, /Found \d+ existing, 1 missing, and 1 empty PATH entries\./);
  assert.match(result.stdout, /^Summary: PASS=\d+ WARN=\d+ FAIL=0$/m);
});

test("preflight warns when the configured shell cannot be resolved", {
  skip: skipPreflightTests
}, () => {
  const result = runPreflight({
    env: createPreflightEnv({
      SHELL: "/onboarding-diagnostics/missing-shell"
    })
  });

  assert.equal(result.status, 0);
  assert.equal(result.stderr, "");
  assert.match(result.stdout, /^\[WARN\] Shell availability$/m);
  assert.match(
    result.stdout,
    /^  suggested_fix: Set SHELL to the executable for the shell used by the current session\.$/m
  );
  assert.match(result.stdout, /^Summary: PASS=\d+ WARN=\d+ FAIL=0$/m);
});

test("preflight warns when the working directory is not writable", {
  skip: skipPreflightTests
}, (t) => {
  const fixtureDir = mkdtempSync(join(tmpdir(), "onboarding-diagnostics-preflight-test-"));
  chmodSync(fixtureDir, 0o555);
  t.after(() => {
    chmodSync(fixtureDir, 0o755);
    rmSync(fixtureDir, { recursive: true, force: true });
  });

  const result = runPreflight({ cwd: fixtureDir, env: createPreflightEnv() });

  assert.equal(result.status, 0);
  assert.equal(result.stderr, "");
  assert.match(result.stdout, /^\[WARN\] Working directory writability$/m);
  assert.match(
    result.stdout,
    /^  suggested_fix: Move to a writable working directory or update its permissions before installing project dependencies\.$/m
  );
  assert.match(result.stdout, /^Summary: PASS=\d+ WARN=\d+ FAIL=0$/m);
});
