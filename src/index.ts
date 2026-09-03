#!/usr/bin/env node

import { parseCli, printUsage } from "./cli.js";
import { runDoctor } from "./commands/doctor.js";

async function main() {
  const parsed = parseCli(process.argv.slice(2));

  if (!parsed.command || parsed.command === "--help" || parsed.command === "-h") {
    printUsage();
    process.exitCode = 0;
    return;
  }

  switch (parsed.command) {
    case "doctor": {
      process.exitCode = await runDoctor(parsed.options);
      return;
    }
    default: {
      process.stderr.write(`Unknown command "${parsed.command}".\n\n`);
      printUsage();
      process.exitCode = 1;
    }
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`Onboarding Diagnostics CLI error: ${message}\n`);
  process.exitCode = 1;
});
