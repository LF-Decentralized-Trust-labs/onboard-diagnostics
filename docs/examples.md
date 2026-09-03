# Examples

## Terminal Output

```text
$ onboarding-diagnostics doctor
Onboarding Diagnostics doctor
Track: Onboarding Diagnostics Lab
Version: 0.1.0
Generated: 2026-04-14T10:00:00.000Z
Adapter: core

[PASS] Node.js version compatibility
  id: core:node-version
  category: ENVIRONMENT
  summary: Node.js 22.14.0 satisfies the minimum supported major version.
  details: Detected Node.js 22.14.0; the CLI diagnostics layer requires Node.js 20+.

[PASS] npm availability
  id: core:npm-available
  category: DEPENDENCY
  summary: npm is available on PATH.
  details: Resolved npm at /usr/local/bin/npm.

[PASS] Platform detection
  id: core:platform
  category: ENVIRONMENT
  summary: Platform detection succeeded.
  details: Detected darwin x64 for the current process.

[PASS] PATH readiness
  id: core:path-visible
  category: ENVIRONMENT
  summary: PATH is set for the current shell session.
  details: PATH contains 12 entries.

[PASS] Working directory sanity
  id: core:working-directory
  category: CONFIGURATION
  summary: Current working directory looks like the Onboarding Diagnostics repository root.
  details: Found package.json with name "@onboarding-diagnostics-lab/onboarding-diagnostics" in /workspace/onboard-diagnostics.

Summary: PASS=5 WARN=0 FAIL=0
```

## JSON Output

```json
{
  "tool": "onboarding-diagnostics",
  "version": "0.1.0",
  "generated_at": "2026-04-14T10:00:00.000Z",
  "summary": {
    "pass": 5,
    "warn": 0,
    "fail": 0
  },
  "results": [
    {
      "id": "core:node-version",
      "title": "Node.js version compatibility",
      "status": "PASS",
      "category": "ENVIRONMENT",
      "summary": "Node.js 22.14.0 satisfies the minimum supported major version.",
      "details": "Detected Node.js 22.14.0; the CLI diagnostics layer requires Node.js 20+."
    },
    {
      "id": "core:npm-available",
      "title": "npm availability",
      "status": "PASS",
      "category": "DEPENDENCY",
      "summary": "npm is available on PATH.",
      "details": "Resolved npm at /usr/local/bin/npm."
    },
    {
      "id": "core:platform",
      "title": "Platform detection",
      "status": "PASS",
      "category": "ENVIRONMENT",
      "summary": "Platform detection succeeded.",
      "details": "Detected darwin x64 for the current process."
    },
    {
      "id": "core:path-visible",
      "title": "PATH readiness",
      "status": "PASS",
      "category": "ENVIRONMENT",
      "summary": "PATH is set for the current shell session.",
      "details": "PATH contains 12 entries."
    },
    {
      "id": "core:working-directory",
      "title": "Working directory sanity",
      "status": "PASS",
      "category": "CONFIGURATION",
      "summary": "Current working directory looks like the Onboarding Diagnostics repository root.",
      "details": "Found package.json with name \"@onboarding-diagnostics-lab/onboarding-diagnostics\" in /workspace/onboard-diagnostics."
    }
  ]
}
```
