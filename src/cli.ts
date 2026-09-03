import type { DoctorOptions } from "./core/types.js";

export interface ParsedCli {
  command?: string;
  options: DoctorOptions;
}

export function parseCli(argv: string[]): ParsedCli {
  const [command, ...rest] = argv;
  const options: DoctorOptions = {};

  for (let index = 0; index < rest.length; index += 1) {
    const argument = rest[index];

    if (argument === "--json") {
      options.json = true;
      continue;
    }

    if (argument === "--adapter") {
      options.adapter = rest[index + 1];
      index += 1;
      continue;
    }
  }

  return {
    command,
    options
  };
}

export function printUsage() {
  process.stdout.write("Usage:\n");
  process.stdout.write("  node dist/index.js doctor\n");
  process.stdout.write("  node dist/index.js doctor --json\n");
  process.stdout.write("  node dist/index.js doctor --adapter fabric\n");
  process.stdout.write("\n");
  process.stdout.write(
    "The CLI also works via `npm link` as `onboarding-diagnostics doctor` once built.\n"
  );
}
