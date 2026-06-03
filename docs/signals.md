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

