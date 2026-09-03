import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getAdapter, listAdapters } from "../dist/adapters/index.js";

const VALID_STATUSES = new Set(["PASS", "WARN", "FAIL"]);
const VALID_CATEGORIES = new Set([
  "ENVIRONMENT",
  "CONFIGURATION",
  "CONNECTIVITY",
  "DEPENDENCY",
  "PERMISSIONS",
  "UNKNOWN"
]);

test("built-in adapters expose stable names", () => {
  assert.deepEqual(listAdapters(), ["fabric"]);
  assert.equal(getAdapter("unknown"), undefined);
});

test("Fabric adapter returns results that follow the core diagnostic format", async (t) => {
  const fixtureDir = mkdtempSync(join(tmpdir(), "onboarding-diagnostics-adapter-test-"));
  t.after(() => rmSync(fixtureDir, { recursive: true, force: true }));

  const adapter = getAdapter("fabric");
  assert.ok(adapter);
  assert.equal(adapter.name, "fabric");
  assert.ok(adapter.description.length > 0);

  const results = await adapter.run({
    cwd: fixtureDir,
    env: {
      FABRIC_CFG_PATH: "./config"
    }
  });

  assert.ok(results.length > 0);
  assert.equal(new Set(results.map((result) => result.id)).size, results.length);
  assert.ok(
    results.every((result) =>
      result.id.startsWith("fabric:") &&
      typeof result.title === "string" &&
      VALID_STATUSES.has(result.status) &&
      VALID_CATEGORIES.has(result.category) &&
      typeof result.summary === "string" &&
      typeof result.details === "string"
    )
  );
});
