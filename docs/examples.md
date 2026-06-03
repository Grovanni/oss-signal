# Examples

The repository includes five stable public fixtures with generated outputs:

```text
examples/
  01-docs-only/
  02-dependency-change/
  03-ci-change/
  04-auth-security/
  05-large-mixed/
```

Each example should include:

- `source.md`;
- fixture metadata, changed files and diff;
- `terminal.txt`;
- `review-brief.md`;
- `review-brief.json`;
- `agent-context.md`;

The examples use synthetic public fixtures rather than live PRs. This keeps documentation stable and avoids depending on mutable third-party PRs. Live PR checks are still supported by the CLI.
