import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const cliPath = join(repoRoot, "dist/index.js");

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
  const fixtureDir = mkdtempSync(join(tmpdir(), "idoa-doctor-test-"));

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

test("doctor human-readable output shows PASS and WARN markers for a controlled workspace", (t) => {
  const fixtureDir = createWorkspaceFixture();
  t.after(() => rmSync(fixtureDir, { recursive: true, force: true }));

  const result = runDoctor({ cwd: fixtureDir });

  assert.equal(result.status, 0);
  assert.equal(result.stderr, "");
  assert.match(result.stdout, /^IDOA doctor/m);
  assert.match(result.stdout, /\[PASS\]/);
  assert.match(result.stdout, /\[WARN\]/);
  assert.match(result.stdout, /Summary: PASS=\d+ WARN=\d+ FAIL=0/);
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

  assert.equal(report.tool, "idoa");
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
