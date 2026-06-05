# Signals

OSS Signal uses deterministic signals to route reviewer attention.

Signals do not mean a PR is bad. They mean the reviewer may want to look at something first.

Examples:

- `code_without_tests`
- `dependency_lockfile_changed`
- `ci_changed`
- `ci_checks_failed`
- `ci_checks_pending`
- `ci_checks_noncritical`
- `ci_status_unavailable`
- `automation_sensitive_file_changed`
- `security_sensitive_file_changed`
- `strong_security_context_changed`
- `explicit_security_advisory`
- `localization_catalog_change`
- `dominant_database_change`
- `release_version_update`
- `persistence_data_format_change`
- `source_wording_change`
- `container_image_update`
- `cohesive_mechanical_batch`
- `mixed_concerns`
- `short_description_for_large_pr`

Every signal should include evidence.

## Current categories

Changed files can be classified into these categories:

- `code`
- `tests`
- `documentation`
- `ci`
- `automation`
- `dependencies`
- `configuration`
- `security`
- `migrations`
- `release`
- `build`
- `generated`
- `unknown`

Files can have more than one category. For example, `.github/workflows/ci.yml` is `ci`, `automation` and `configuration` because workflow changes can affect CI, release automation, permissions and supply chain behavior. Workflow-only changes are treated as CI/automation attention first; they do not automatically become a `security_review` action.

`Dockerfile` is classified as `automation` and `build`, not `security`. Container image changes can affect build/runtime and supply-chain review attention, but they are not treated as direct application security paths unless the path also matches auth, session, token, secret, credential, crypto, permission, policy or security terms.

Localization catalogs such as `.po`, `.pot` and `.mo` files are treated as documentation or generated artifacts, even when they live below an `auth` or `session` path. This avoids routing translation-only PRs to application security review.

Large localization/catalog refreshes can emit `localization_catalog_change` without escalating to `large_pr`, `short_description_for_large_pr` or `request_split` when the changed files are predominantly catalogs.

Documentation pages about migration guides remain documentation. Database/schema migration attention is reserved for code or repository paths that indicate runtime migrations, schemas or database migration tooling.

Database/schema paths include common migration directories, `db/schema.rb`, `structure.sql`, Rails database rake tasks, database fixtures, Prisma schema files, and foreign-key fixtures. Tests-only migration folders, generated fixtures and JSON/data-format schemas are not treated as database migrations by default. When database migration paths dominate the file evidence, OSS Signal emits `dominant_database_change` and prefers migration review unless there is direct auth-sensitive evidence.

Security-sensitive matching is token-based, not substring-based. For example, `AUTHORS` is documentation, not auth. `key` only contributes to secret-sensitive routing with strong surrounding context such as secret, credential, token, env, API, private/public key, crypto or security.

Security-sensitive routing is also context-aware. Test, fixture, documentation, example, data, compiler, protocol, QUIC, HTTP/2, query-language, UI/CSS, parser, snapshot, slide, asset, path, context or memory paths that only mention generic auth/session/token/policy/security words do not automatically route to security review. Product code or sensitive configuration paths for auth, sessions, tokens, real env files, secrets, credentials, signing, crypto, TLS/SSL, permissions or access-control remain security-sensitive.

Example env files such as `.env.example`, `.env.sample`, test fixture env files, third-party license files and dependency manifests under packages named `security` are not treated as direct security-review evidence by default.

Common test conventions include `tests/`, `testing/`, `test_project/`, `testsuite/`, `qa/`, `src/test/`, `internalClusterTest`, `muted-tests`, `testfixtures`, `test-fixtures`, `fixtures`, `__tests__`, `.test.*`, `.spec.*`, `.e2e.*`, Go `_test.go`, and common Java/Kotlin/C#/F# `*Test` or `*Tests` filenames. Java integration forms such as `*IT.java`, `*ITCase.java` and `*TestCase.java` are also treated as tests. CI workflow names such as `.github/workflows/test.yml` remain CI/automation files, not test files.

Container and deployment image updates can emit `container_image_update` when paths or PR text reference Docker/container image tags, HelmRelease, Helm charts, Kustomize or similar deployment image version changes. This orients review toward dependency/build/deployment context without treating the PR as an app security change.

Repository-specific path patterns can add category matches through `docs/configuration.md`. Built-in rules still apply, and configured `ignore_paths` only remove matching files from classification and signal analysis.

## Current signal set

The Phase 3 implementation can emit these deterministic signals:

- `small_pr`
- `medium_pr`
- `large_pr`
- `many_files_changed`
- `tests_changed`
- `code_without_tests`
- `source_wording_change`
- `tests_only`
- `docs_only`
- `docs_changed`
- `dependency_manifest_changed`
- `dependency_lockfile_changed`
- `dependency_change_without_code`
- `ci_changed`
- `ci_changed_with_dependency_change`
- `ci_checks_failed`
- `ci_checks_pending`
- `ci_checks_noncritical`
- `ci_status_unavailable`
- `automation_sensitive_file_changed`
- `security_sensitive_file_changed`
- `auth_related_change`
- `secret_related_change`
- `strong_security_context_changed`
- `explicit_security_advisory`
- `localization_catalog_change`
- `migration_changed`
- `dominant_database_change`
- `configuration_changed`
- `empty_description`
- `release_version_update`
- `persistence_data_format_change`
- `container_image_update`
- `cohesive_mechanical_batch`
- `short_description_for_large_pr`
- `description_missing_ci_context`
- `description_missing_dependency_context`
- `mixed_concerns`

## Attention and action

Attention is `low`, `medium` or `high`. It is not a risk score and it is not a verdict.

See `docs/decision-policy.md` for the current recommended action priority order.

Recommended actions are non-authoritative:

- `normal_review`
- `ask_for_tests`
- `ask_for_reproduction`
- `ask_for_clarification`
- `request_split`
- `security_review`
- `wait_for_ci`
- `dependency_review`
- `migration_review`

Questions are limited to five and are only generated from detected signals.

GitHub CI status/check signals are emitted when GitHub reports failed, errored, pending or in-progress items for the PR head commit, or when CI files changed but GitHub exposes no status/check data. Cancelled, skipped or neutral CI items are reported as `ci_checks_noncritical` when they are the only non-successful items; they do not trigger `wait_for_ci` by themselves. Passing CI is shown in the output summary but does not emit a signal by itself.

Workflow, GitHub Action and Dockerfile changes use `automation_sensitive_file_changed`, not `security_sensitive_file_changed`. `security_sensitive_file_changed` is reserved for paths that directly reference authentication, product session/token handling, real env files, secrets, credentials, crypto, TLS/SSL, permissions, access-control or security implementation.

`strong_security_context_changed` is the stronger path-based security signal used for crypto, TLS/SSL, permissions, access-control or security implementation context. Generic `session`, `token`, `policy`, `path`, `context`, `memory`, UI/CSS, docs, snapshots, generated files and asset names should not become `security_review` by themselves.

`explicit_security_advisory` can be emitted from the PR title or description when it explicitly mentions strong advisory/vulnerability terms such as CVE, GHSA, Snyk security upgrade, vulnerability, Zip Slip, auth bypass, privilege escalation, XSS, CSRF, SSRF or RCE. The wording orients review attention without claiming exploitability.

Coherent release/version bumps can emit `release_version_update`. That signal is informational and can suppress generic missing-test or mixed-concern noise when the title and file mix indicate a version update rather than feature code.

Small source changes whose title clearly points to docs, comments, docstrings, typos, wording, help text, type/extension metadata, changelog or release-note text can emit `source_wording_change`. This suppresses generic `code_without_tests` routing for small low-risk source touch points, especially when CI is green, but it does not try to infer behavior from the diff.

`persistence_data_format_change` is a cautious medium signal for paths or PR text that mention persisted data, serialization, storage metadata, JSON schemas or file formats. It is intended to focus review attention on compatibility questions, not to imply a bug or security issue.

`container_image_update` is a medium orientation signal for container image, HelmRelease, Helm chart or deployment image version updates. When no stronger action applies, it routes to `dependency_review`.

`cohesive_mechanical_batch` is a medium signal for large-by-volume PRs that still look like one mechanical update: dependency manifest plus lockfile, generated output, docs-heavy updates, asset/image optimization batches, release/version bumps, or archive/data refreshes. These should not trigger `request_split` solely because they are large.

`mixed_concerns` is intentionally conservative. Small cohesive changes that combine implementation, tests, documentation, package metadata or release notes should not trigger split guidance unless additional independent surfaces such as CI/automation, database/schema or strong security evidence are also present.

Bad:

```text
Security risk detected.
```

Good:

```text
Authentication-related file changed:
- src/auth/session.ts
Reason: path contains "auth" and "session".
```
