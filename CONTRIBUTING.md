# Contributing

Contributions are welcome. This project focuses on onboarding diagnostics and CLI tooling, with `onboarding-diagnostics doctor` as the main command surface.

Please also follow [GOVERNANCE.md](GOVERNANCE.md), [SECURITY.md](SECURITY.md), and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Development setup

```sh
git clone https://github.com/LF-Decentralized-Trust-labs/onboard-diagnostics
cd onboard-diagnostics
npm install
npm run build
npm run doctor
```

## Workflow

Do not commit directly to `main`.

Create a new branch from `main`:

```sh
git checkout -b feat/your-feature-name
```

Make your changes and commit them locally.

Always use `git commit -s` so each commit includes a `Signed-off-by` trailer.

Push your branch:

```sh
git push origin your-branch
```

Open a Pull Request and wait for approval before merge.

## Contribution guidelines

- Keep changes small and focused.
- Follow the existing project structure.
- Avoid adding unnecessary dependencies.
- Keep output deterministic: `PASS`, `WARN`, and `FAIL`.
- Add tests or examples when behavior changes.
- Keep documentation short, practical, and linked to real project workflows.

## Issues

For larger changes, open an issue first so the scope and direction can be discussed before implementation.

Use an RFC from `docs/rfcs/0000-template.md` when a proposal changes public behavior, governance, release process, or project scope.

Use a decision record in `docs/decisions/` when a long-lived technical or governance choice should be easy to rediscover later.

## Security

Do not open public GitHub issues for vulnerabilities. Follow [SECURITY.md](SECURITY.md).
