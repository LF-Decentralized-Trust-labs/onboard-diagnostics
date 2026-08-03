# Architecture

IDOA is structured as a small layered diagnostics implementation for onboarding readiness. The goal is to keep early checks deterministic and low-friction while leaving a clean path for deeper system-specific diagnostics later.

## Layer 1: Preflight Layer

The preflight layer is the zero-dependency shell entrypoint in `scripts/preflight.sh`.

Its job is to answer basic readiness questions before the TypeScript CLI is involved:

- is `node` present
- is `npm` present
- is `PATH` usable
- is the current shell and workspace in a sane baseline state

This layer exists so onboarding can fail early in a way that is understandable even when the Node.js runtime or local toolchain is incomplete.

## Layer 2: CLI Diagnostics Layer

The CLI diagnostics layer is exposed as `idoa doctor`.

This layer runs once baseline prerequisites are available and produces structured findings for:

- environment checks
- working-directory checks
- adapter-specific checks when requested

The CLI is responsible for consistent report formatting, deterministic exit behavior, and a stable JSON shape for downstream use.

## Layer 3: Adapter Layer

The adapter layer provides a minimal contract for target-specific diagnostics without building a full plugin framework.

Each adapter should:

- declare a stable adapter name
- reuse the shared check result model
- add scoped checks for a specific onboarding target

The TypeScript contract is intentionally small:

```ts
interface DiagnosticAdapter {
  readonly name: string;
  readonly description: string;
  run(context: AdapterContext): Promise<readonly DiagnosticCheckResult[]>;
}
```

`AdapterContext` exposes only the current working directory and environment. Adapter results use the same `DiagnosticCheckResult` shape and `PASS`, `WARN`, or `FAIL` statuses as core diagnostics. Adding an adapter means implementing this interface and including it in the small built-in adapter list; it does not introduce runtime plugin loading or a multi-chain abstraction.

The current initial direction is a Fabric-oriented adapter. It should be understood as a reference path for future work, not as complete Hyperledger Fabric support.

## Deterministic Findings

Every finding should produce one of three statuses:

- `PASS`
- `WARN`
- `FAIL`

Those statuses are intended to mean the same thing across layers:

- `PASS` means the check succeeded and no action is required for that item
- `WARN` means the condition is incomplete, missing, or ambiguous but not necessarily blocking
- `FAIL` means the prerequisite is blocking and deeper onboarding steps should not be trusted until it is fixed

This model keeps diagnostics interpretable for both humans and automation. It also keeps the CLI exit code behavior predictable: failures should lead to a non-zero exit code, while warnings should remain visible without being treated as hard blockers.

## JSON Output as a Design Goal

Human-readable output is important for first-run operator experience, but machine-readable JSON is a core design goal.

`idoa doctor --json` should make it possible to:

- feed findings into CI or scripted setup flows
- compare onboarding results across environments
- preserve stable identifiers for later report shaping and analysis
- separate presentation concerns from the underlying diagnostic model

The current implementation keeps the JSON format intentionally small. That is a feature, not a gap: it provides a stable base that can evolve without inventing a larger platform before it is needed.
