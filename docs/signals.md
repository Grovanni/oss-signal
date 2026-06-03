# Signals

OSS Signal uses deterministic signals to route reviewer attention.

Signals do not mean a PR is bad. They mean the reviewer may want to look at something first.

Examples:

- `code_without_tests`
- `dependency_lockfile_changed`
- `ci_changed`
- `security_sensitive_file_changed`
- `mixed_concerns`
- `short_description_for_large_pr`

Every signal should include evidence.

## Current categories

Changed files can be classified into these categories:

- `code`
- `tests`
- `documentation`
- `ci`
- `dependencies`
- `configuration`
- `security`
- `migrations`
- `release`
- `build`
- `generated`
- `unknown`

Files can have more than one category. For example, `.github/workflows/ci.yml` is `ci`, `configuration` and `security` because workflow changes can affect execution permissions and secrets.

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
- `security_sensitive_file_changed`
- `auth_related_change`
- `secret_related_change`
- `migration_changed`
- `configuration_changed`
- `empty_description`
- `short_description_for_large_pr`
- `description_missing_ci_context`
- `description_missing_dependency_context`
- `mixed_concerns`

## Attention and action

Attention is `low`, `medium` or `high`. It is not a risk score and it is not a verdict.

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
