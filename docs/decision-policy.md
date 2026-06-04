# Decision policy

OSS Signal recommends the first review action from deterministic signals. The action is not a verdict and does not approve, reject, block, close or comment on a PR.

The current priority order is:

1. `migration_review` for dominant database/schema/migration changes when there is no direct auth-sensitive evidence.
2. `security_review` for direct auth, session, token, secret, credential, signing, crypto, permission or security paths, except tiny wording-only edits.
3. `wait_for_ci` when GitHub reports actionable failed/pending checks, or when CI files changed but CI status is unavailable.
4. `request_split` for large PRs or genuinely mixed independent concerns.
5. `ask_for_clarification` when the description is empty and the change touches automation-sensitive files without dependency manifest or lockfile evidence.
6. `ask_for_tests` when code changed and no tests were detected, except for small source wording/comment/docstring/release-note/help/type metadata changes.
7. `dependency_review` when dependency manifests, lockfiles, dependency-only files or container/deployment image updates changed.
8. `migration_review` for other migration, schema or database paths.
9. `ask_for_clarification` for missing or very short descriptions in other relevant cases.
10. `normal_review` when no stronger action applies.

## CI before dependency review

A dependency PR with a manifest, lockfile or dependency-only file normally recommends `dependency_review`.

If GitHub reports failed or pending CI for the PR head commit, OSS Signal recommends `wait_for_ci` first. This keeps the brief actionable: the maintainer can inspect CI before spending review attention on dependency details that may already be invalidated by failed checks.

Cancelled, skipped or neutral CI items are reported as `ci_checks_noncritical` when they are the only non-successful items. That signal is informational and does not trigger `wait_for_ci` by itself.

Human-facing summaries render those cancelled/skipped/neutral-only cases as non-critical rather than failed.

## Database/schema before security noise

When migration, schema or database paths dominate the changed-file evidence, OSS Signal emits `dominant_database_change` and recommends `migration_review` before generic security or split routing, unless a direct auth-sensitive path is present.

This protects cases such as foreign-key fixtures, Rails database rake tasks and runtime schema files from being misrouted through secret/key wording. Tests-only migration folders, generated fixtures, JSON schemas and data-format schemas are not treated as database migration evidence by default.

## Release/version updates

When the PR title/body and file mix look like a coherent release or version bump, OSS Signal can emit `release_version_update`. This suppresses generic `code_without_tests` and `mixed_concerns` noise for small release/version touch points while still preserving dependency signals such as `dependency_manifest_changed`.

Small source edits whose title clearly points to docs, comments, docstrings, typo fixes, wording, help text, type/extension metadata, changelog or release-note text can emit `source_wording_change`. That signal suppresses generic `ask_for_tests` routing for the small low-risk case while keeping the review action normal unless another stronger signal applies.

## Empty descriptions

`empty_description` remains visible, but it does not recommend `ask_for_clarification` by itself when a small docs-only, tests-only, changelog-only, release-note-only or source-wording PR has enough context from the title and files.

It can still recommend clarification when the missing context affects orientation, such as automation/build changes, CI status unavailable, large or mixed PRs, migration/security/configuration changes, or dependency/container updates whose intent is not obvious.

## Security and automation wording

`security_sensitive_file_changed` is reserved for direct security-sensitive paths such as auth, session, token, secret, credential, crypto, permission and security paths.

Workflow and GitHub Action files use `automation_sensitive_file_changed`. They can affect CI, releases, permissions and supply chain behavior, but OSS Signal avoids presenting workflow-only PRs as generic security-sensitive changes.

Dockerfile changes also use automation/build attention rather than app security-sensitive wording by default. They can affect runtime image and supply chain behavior, but should not trigger `security_review` unless the path also directly references auth, sessions, tokens, secrets, credentials, crypto, permissions, policy or security.

Generic `env` path terms, env sample files, fixture/example data, third-party license files, protocol/compiler/session test paths, and dependency manifests under a package named `security` are not enough by themselves to recommend `security_review`.

CI-green workflow-only PRs can still proceed to `normal_review`.

Container image, HelmRelease, Helm chart and related deployment image version changes can emit `container_image_update`. When no stronger action applies, OSS Signal routes them to `dependency_review` because the useful review question is usually about the image/version provenance and deployment impact.

## Split guidance

`request_split` is reserved for large PRs or genuinely independent review surfaces. Small cohesive changes that combine code, tests, docs, package metadata or release notes should not be split solely because several support categories appear together.

Predominantly localization/catalog refreshes are treated as cohesive catalog updates, even when they touch many lines.
