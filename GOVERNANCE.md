# Governance

Onboard Diagnostics is a small LF Decentralized Trust Labs project. Its governance should stay lightweight while making ownership, review, security, and decisions visible.

## Principles

- Keep the project neutral, open, and useful to the wider decentralized technology community.
- Prefer small, reviewable changes over large rewrites.
- Make important decisions in public issues, pull requests, RFCs, or decision records.
- Keep contributor onboarding practical and respectful.
- Treat security and supply chain concerns as first-class project work.

## Roles

### Maintainers

Maintainers review changes, merge pull requests, triage issues, and keep the project aligned with its scope. Maintainers should explain decisions when a change is declined or deferred.

### Contributors

Contributors may open issues, propose designs, submit pull requests, review work, improve documentation, or report security concerns. All contributors are expected to follow the LF Decentralized Trust Code of Conduct.

### Code Owners

Code ownership is defined in `.github/CODEOWNERS`. Code owners are responsible for review attention, not exclusive control. Ownership can change as sustained contributors take responsibility for parts of the project.

## Decision Making

Most decisions happen in issues and pull requests. Use the lightest process that gives future contributors enough context.

- Routine implementation changes: issue or pull request discussion is enough.
- Reversible technical choices: document the reasoning in the pull request.
- Significant or long-lived choices: add a decision record in `docs/decisions/`.
- Broad API, governance, or release process changes: start from the RFC template in `docs/rfcs/`.

Maintainers aim for rough consensus. When consensus is not clear, maintainers may make a documented decision to keep the project moving.

## Review and Merge

- Do not commit directly to `main`.
- Keep pull requests focused and easy to review.
- At least one maintainer review is expected before merge.
- Governance, security, release, and ownership changes should receive explicit maintainer review.
- Commits should include a `Signed-off-by` trailer.

## Conduct and Security

Community behavior follows [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

Security reporting follows `SECURITY.md`. Do not open public issues for vulnerabilities.

## Scope

This project focuses on deterministic onboarding diagnostics and CLI tooling. Governance should help that mission without adding process that the project does not yet need.
