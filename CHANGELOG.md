# Changelog

All notable changes to OSS Signal will be documented in this file.

The format should follow clear release notes. The project uses semantic versioning after the first public release.

## Unreleased

- Reduced `ask_for_tests` routing for small source wording, comment, docstring, typo, changelog and release-note changes.
- Expanded test path detection for `.e2e.*`, Go `_test.go`, common Java/Kotlin/C#/F# `*Test`/`*Tests` names, `test_project/` and `testsuite/`.
- Made empty descriptions less dominant for small docs/tests/changelog/release-note/source-wording PRs while keeping clarification for automation/build/config cases.
- Narrowed security routing for generic auth/session/token/security terms in tests, docs, fixtures, examples, compiler internals and protocol paths.
- Narrowed migration routing so tests-only migration folders, generated fixtures and JSON/data-format schemas do not become database migration review by default.
- Added container/deployment image update orientation for Docker image, HelmRelease, Helm chart and related image version changes.
- Recognized pre-commit, Renovate and dependency-policy config files as dependency/configuration context.
- Classified `Dockerfile` as automation/build attention instead of app security-sensitive.
- Reduced noisy security routing for localization catalogs under auth/session paths and narrowed `acl` matching.
- Treated documentation migration guides as documentation instead of database migration changes.
- Reported cancelled/skipped/neutral-only CI items as informational instead of routing to `wait_for_ci`.
- Added informational release/version bump detection and a cautious persistence/data-format signal.
- Recognized additional test path conventions such as `testing/` and `__tests_dts__`.
- Tightened token-based security path matching so `AUTHORS`, foreign keys and storage/test keys do not route to security review without stronger context.
- Added localization catalog and dominant database/schema signals for more precise review orientation.
- Reduced `request_split` on small cohesive code/test/docs/package updates and large translation catalog refreshes.
- Rendered cancelled/skipped/neutral-only CI summaries as non-critical instead of failed in human-facing output.
- Recognized Rails database rake tasks, DB fixtures, test requirements files and `uv.lock`.

## 0.2.0 - 2026-06-04

- Added `schemas/review-brief.v1.schema.json` and tests that validate generated examples against it.
- Documented the recommended action priority policy.
- Added a non-intrusive GitHub Action that writes a step summary and uploads brief artifacts.
- Added optional `oss-signal.yml` / JSON configuration for size thresholds, path categories and ignored paths.
- Kept PR brief generation usable when GitHub diff retrieval is unavailable.
- Routed dependency-only manifest or lockfile PRs to `dependency_review` when no stronger action applies.
- Clarified workflow sensitivity wording: GitHub workflow files are now automation-sensitive instead of generic security-sensitive.
- Documented `review-brief.v1` compatibility rules for additive fields and future breaking schema changes.

## 0.1.1 - 2026-06-04

- Added GitHub CI status/check fetching and compact CI summaries in terminal, Markdown, JSON and agent context outputs.
- Added `ci_checks_failed`, `ci_checks_pending` and `ci_status_unavailable` signals.
- Refined `wait_for_ci` so CI-green workflow-only PRs can proceed to normal review.
- Regenerated the real public examples with GitHub CI state.

## 0.1.0 - 2026-06-04

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
- Added npm scripts for build, test, lint, format, and check.
