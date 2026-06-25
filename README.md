# IDOA - Infrastructure for Deterministic Onboarding & Analysis

IDOA is the implementation repository for the Onboarding Diagnostics Lab workstream. Its purpose is to make onboarding failures deterministic, interpretable, and actionable before developers lose time chasing ambiguous local setup issues.

## Part of LF Decentralized Trust Labs – Onboarding Diagnostics Lab

This repository tracks the implementation side of the lab effort that was merged into LF Decentralized Trust Labs. It is intentionally focused on practical diagnostics and onboarding readiness rather than network services, dashboards, or broader platform orchestration.

The lab is listed in the LF Decentralized Trust Labs catalog: [Onboarding Diagnostics Lab](https://lf-decentralized-trust-labs.github.io/labs/lfdt/onboarding-diagnostics-lab.html).

## Problem Statement

Developer onboarding for decentralized systems often fails before application logic even starts. Missing runtimes, PATH issues, inconsistent shells, incomplete local configuration, and toolchain drift can all produce noisy errors that are difficult to interpret.

Those failures are costly because they are often:

- nondeterministic across machines
- hard to classify from raw tool output
- difficult to remediate consistently

## Project Goal

IDOA provides a small diagnostics-oriented implementation track for onboarding readiness:

- a zero-dependency preflight layer for first-run environment validation
- a Node.js CLI diagnostics layer via `idoa doctor`
- a minimal adapter model for system-specific checks

The current target direction is Hyperledger Fabric, but Fabric support is not presented here as complete.

## Layered Architecture

IDOA is organized as three layers:

1. `scripts/preflight.sh`
   A zero-dependency shell layer for baseline readiness checks before relying on Node.js tooling.
2. `idoa doctor`
   A TypeScript CLI diagnostics layer for deterministic human-readable and JSON reports.
3. `src/adapters/*`
   A small adapter layer for target-specific checks that reuse the shared result model.

This separation keeps baseline environment validation lightweight while leaving room for deeper diagnostics once prerequisites are available.

See [architecture.md](docs/architecture.md) for the detailed design notes.

## Current Status

The repository currently includes:

- a zero-dependency preflight script for baseline environment readiness
- a minimal `idoa doctor` command with deterministic `PASS`/`WARN`/`FAIL` output
- JSON output support via `idoa doctor --json`
- a shared result model for future adapter checks
- a lightweight Fabric-oriented adapter path as an initial direction, not a finished integration

Current `doctor` checks stay intentionally small and implementation-aligned:

- Node.js version compatibility
- npm availability
- OS and architecture detection
- PATH visibility
- working-directory sanity

## Near-Term Roadmap

- stabilize the repository foundation and CLI entrypoint
- expand zero-dependency preflight coverage for common onboarding failures
- formalize the adapter contract and add first Fabric-oriented checks
- improve remediation guidance and report shaping without widening scope

A compact project roadmap is in [ROADMAP.md](ROADMAP.md).

## Usage

Run the zero-dependency preflight first:

```sh
sh scripts/preflight.sh
```

Build the CLI:

```sh
npm install
npm run build
```

Run diagnostics locally:

```sh
node dist/index.js doctor
node dist/index.js doctor --json
node dist/index.js doctor --adapter fabric
```

Optional local linking after build:

```sh
npm link
idoa doctor
```

## Output Model

Each diagnostic finding uses a deterministic status:

- `PASS` for a satisfied prerequisite or expected condition
- `WARN` for a non-blocking issue that reduces confidence or completeness
- `FAIL` for a blocking prerequisite that should be fixed before deeper onboarding steps

Human-readable output is intended for direct operator use. JSON output is intended for later automation, CI shaping, or lab analysis workflows.

## Exit Code Behavior

Both diagnostics layers use the same process exit behavior so they can be used safely in CI and scripted onboarding flows:

- exit `0` when all checks are `PASS`, or when the run contains only `PASS` and `WARN`
- exit non-zero when at least one check is `FAIL`

This applies to:

- `sh scripts/preflight.sh`
- `node dist/index.js doctor`
- `node dist/index.js doctor --json`
- `node dist/index.js doctor --adapter fabric`

In practice, `WARN` keeps the run actionable without failing automation, while `FAIL` is reserved for blocking prerequisites that should stop deeper onboarding steps.

Examples are available in [examples.md](docs/examples.md) and [sample-output.json](examples/sample-output.json).
