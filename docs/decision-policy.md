# Decision policy

OSS Signal recommends the first review action from deterministic signals. The action is not a verdict and does not approve, reject, block, close or comment on a PR.

The current priority order is:

1. `security_review` for direct auth, session, token, secret, credential, crypto, permission or security paths.
2. `wait_for_ci` when GitHub reports failed/pending checks, or when CI files changed but CI status is unavailable.
3. `request_split` for large PRs or mixed concerns.
4. `ask_for_tests` when code changed and no tests were detected.
5. `dependency_review` when dependency manifests, lockfiles or dependency-only files changed.
6. `migration_review` for migration, schema or database paths.
7. `ask_for_clarification` for missing or very short descriptions in relevant cases.
8. `normal_review` when no stronger action applies.

## CI before dependency review

A dependency PR with a manifest, lockfile or dependency-only file normally recommends `dependency_review`.

If GitHub reports failed or pending CI for the PR head commit, OSS Signal recommends `wait_for_ci` first. This keeps the brief actionable: the maintainer can inspect CI before spending review attention on dependency details that may already be invalidated by failed checks.

## Security and automation wording

`security_sensitive_file_changed` is reserved for direct security-sensitive paths such as auth, session, token, secret, credential, crypto, permission and security paths.

Workflow and GitHub Action files use `automation_sensitive_file_changed`. They can affect CI, releases, permissions and supply chain behavior, but OSS Signal avoids presenting workflow-only PRs as generic security-sensitive changes.

Dockerfile changes also use automation/build attention rather than app security-sensitive wording by default. They can affect runtime image and supply chain behavior, but should not trigger `security_review` unless the path also directly references auth, sessions, tokens, secrets, credentials, crypto, permissions, policy or security.

CI-green workflow-only PRs can still proceed to `normal_review`.
