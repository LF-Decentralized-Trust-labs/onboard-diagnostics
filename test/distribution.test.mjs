import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    ...options
  });

  if (result.error) {
    throw result.error;
  }

  return result;
}

test("npm package contains only the release surface and works after a clean install", (t) => {
  const fixtureDir = mkdtempSync(join(tmpdir(), "onboarding-diagnostics-package-test-"));
  const packDir = join(fixtureDir, "pack");
  mkdirSync(packDir);
  const npmEnv = {
    ...process.env,
    npm_config_cache: join(fixtureDir, ".npm-cache")
  };
  t.after(() => rmSync(fixtureDir, { recursive: true, force: true }));

  const packResult = run(npmCommand, ["pack", "--json", "--pack-destination", packDir], {
    cwd: repoRoot,
    env: npmEnv
  });
  assert.equal(packResult.status, 0, packResult.stderr || packResult.stdout);

  const [pack] = JSON.parse(packResult.stdout);
  assert.equal(pack.name, "@onboarding-diagnostics-lab/onboarding-diagnostics");
  const packagedFiles = new Set(pack.files.map((file) => file.path));

  for (const requiredFile of [
    "dist/index.js",
    "package.json",
    "README.md",
    "LICENSE",
    "scripts/preflight.sh",
    "scripts/preflight.ps1"
  ]) {
    assert.ok(packagedFiles.has(requiredFile), `expected ${requiredFile} in package`);
  }
  assert.ok([...packagedFiles].every((path) => !path.startsWith("src/")));
  assert.ok([...packagedFiles].every((path) => !path.startsWith("test/")));

  writeFileSync(
    join(fixtureDir, "package.json"),
    JSON.stringify({ name: "onboarding-diagnostics-clean-install-test", private: true }, null, 2)
  );
  const tarballPath = join(packDir, pack.filename);
  const installResult = run(
    npmCommand,
    ["install", "--ignore-scripts", "--no-audit", "--no-fund", tarballPath],
    { cwd: fixtureDir, env: npmEnv }
  );
  assert.equal(installResult.status, 0, installResult.stderr || installResult.stdout);

  const installedPackageRoot = join(
    fixtureDir,
    "node_modules",
    "@onboarding-diagnostics-lab",
    "onboarding-diagnostics"
  );
  const installedManifest = JSON.parse(
    readFileSync(join(installedPackageRoot, "package.json"), "utf8")
  );
  assert.equal(installedManifest.name, "@onboarding-diagnostics-lab/onboarding-diagnostics");
  assert.equal(installedManifest.bin["onboarding-diagnostics"], "dist/index.js");

  const cliResult = run(process.execPath, [join(installedPackageRoot, "dist/index.js"), "--help"], {
    cwd: fixtureDir
  });
  assert.equal(cliResult.status, 0, cliResult.stderr || cliResult.stdout);
  assert.match(cliResult.stdout, /^Usage:/m);
});
