# Roadmap

This roadmap is intentionally short. Onboard Diagnostics is still small, so roadmap items should map to active issues and near-term LF Decentralized Trust Labs needs.

## Current Focus

- Establish lightweight governance and community documentation.
- Keep first-run diagnostics deterministic and easy to understand.
- Formalize the adapter contract before adding deeper target-specific checks.
- Prepare distribution basics for a first npm package flow.

## Near-Term Work

### Governance Foundation

- Add governance, security, code owner, issue template, RFC, and decision-record documentation.
- Keep contributor guidance small enough for first-time contributors to read quickly.

### Preflight Reliability

- Expand zero-dependency checks in `scripts/preflight.sh`.
- Keep `PASS`, `WARN`, and `FAIL` behavior stable.

### Adapter Contract

- Clarify the target adapter interface.
- Add the next Fabric-oriented checks only where the project can explain the result and remediation.

### Distribution Readiness

- Prepare package metadata, bootstrap flow, and release notes expectations for first external users.

## Not Yet

- Full Fabric certification claims
- Hosted dashboards or services
- Broad platform orchestration
- Heavy governance process before the community needs it

## Updating This Roadmap

Use GitHub issues for normal roadmap changes. Use an RFC when a roadmap change affects public interfaces, release process, governance, or project scope.
