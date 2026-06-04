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
- `release_version_update`
- `persistence_data_format_change`
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

Documentation pages about migration guides remain documentation. Database/schema migration attention is reserved for code or repository paths that indicate runtime migrations, schemas or database migration tooling.

Repository-specific path patterns can add category matches through `docs/configuration.md`. Built-in rules still apply, and configured `ignore_paths` only remove matching files from classification and signal analysis.

## Current signal set

The Phase 3 implementation can emit these deterministic signals:

- `small_pr`
- `medium_pr`
- `large_pr`
- `many_files_changed`
- `tests_changed`
- `code_without_tests`
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
- `migration_changed`
- `configuration_changed`
- `empty_description`
- `release_version_update`
- `persistence_data_format_change`
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

Workflow, GitHub Action and Dockerfile changes use `automation_sensitive_file_changed`, not `security_sensitive_file_changed`. `security_sensitive_file_changed` is reserved for paths that directly reference authentication, sessions, tokens, secrets, credentials, crypto, permissions, policy or security.

Coherent release/version bumps can emit `release_version_update`. That signal is informational and can suppress generic missing-test or mixed-concern noise when the title and file mix indicate a version update rather than feature code.

`persistence_data_format_change` is a cautious medium signal for paths or PR text that mention persisted data, serialization or file formats. It is intended to focus review attention on compatibility questions, not to imply a bug or security issue.

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
