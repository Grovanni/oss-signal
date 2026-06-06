# Configuration

PR Signal works without configuration. A config file only adjusts deterministic thresholds and path classification for repositories whose layout does not match the defaults.

Default lookup order from the current working directory:

1. `pr-signal.yml`
2. `pr-signal.yaml`
3. `.pr-signal.yml`
4. `.pr-signal.yaml`
5. `pr-signal.json`
6. `.pr-signal.json`

Use `--config <path>` to choose a specific file.

## Example

```yaml
attention_thresholds:
  medium_files_changed: 6
  medium_lines_changed: 201
  large_files_changed: 20
  large_lines_changed: 800

paths:
  security:
    - "src/auth/**"
    - "packages/session/**"
  automation:
    - ".github/actions/**"
  migrations:
    - "db/migrations/**"
  tests:
    - "spec/**"

ignore_paths:
  - "docs/generated/**"
```

## Supported Keys

`attention_thresholds` controls PR size signals:

- `medium_files_changed`
- `medium_lines_changed`
- `large_files_changed`
- `large_lines_changed`

`paths` adds category matches. Supported categories:

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

`ignore_paths` removes matching files from classification and signal analysis. The files are still listed in raw GitHub file metadata; they are just not used to decide attention, questions or recommended action.

## Short Aliases

These top-level list aliases are supported for small configs:

- `security_paths` or `sensitive_paths`
- `automation_paths`
- `ci_paths`
- `test_paths`
- `documentation_paths` or `docs_paths`
- `migration_paths`
- `generated_paths`
- `configuration_paths`
- `dependency_paths`
- `release_paths`
- `build_paths`
- `code_paths`

## Pattern Rules

Patterns are case-insensitive and use `/` separators. Supported glob syntax is intentionally small:

- `*` matches within one path segment.
- `**` matches across path segments.
- `?` matches one character within one segment.

Examples:

```yaml
test_paths:
  - "**/*.test.ts"
  - "spec/**"
```

## Contract

Configuration must improve repository fit; it must not change PR Signal into a policy engine.

The config cannot:

- comment on PRs;
- fail a check;
- approve or reject changes;
- assign scores;
- run AI or external code analysis.
