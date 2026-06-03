# Changelog

All notable changes to OSS Signal will be documented in this file.

The format should follow clear release notes. The project uses semantic versioning after the first public release.

## Unreleased

- Initial project planning.
- Added TypeScript CLI skeleton with `oss-signal pr <url> --dry-run`.
- Added deterministic GitHub Pull Request URL parser with unit tests.
- Added GitHub PR metadata, changed files and diff fetching with optional token support.
- Added local GitHub PR fixtures for network-free tests.
- Added file classification, deterministic signals, attention level, recommended action, priority files and review questions.
- Added `review-brief.md`, `review-brief.json`, `agent-context.md` generation and short terminal summaries.
- Added five public examples with generated outputs.
- Replaced synthetic examples with five real public PR examples.
- Reduced noisy security routing for workflow-only changes and environment-like paths.
- Added GitHub CI status/check fetching, CI summary output and `ci_checks_failed` / `ci_checks_pending` / `ci_status_unavailable` signals.
- Refined `wait_for_ci` so CI-green workflow-only PRs can proceed to normal review.
- Added npm scripts for build, test, lint, format, and check.
