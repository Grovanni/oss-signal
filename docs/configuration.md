# Configuration

OSS Signal should work without configuration.

Future versions may support an optional `oss-signal.yml`.

Example:

```yaml
attention_thresholds:
  large_files_changed: 20
  large_lines_changed: 800

sensitive_paths:
  - "src/auth/**"
  - "src/security/**"

test_paths:
  - "tests/**"
  - "**/*.test.ts"
  - "**/*.spec.ts"

ignore_paths:
  - "docs/generated/**"
```

Configuration should improve accuracy, not be required for first use.

