# OSS Signal

A deterministic PR intake brief for maintainers and coding agents.

Not an AI reviewer.  
Not a bot that comments on your PRs.  
Not a quality score.

OSS Signal turns a GitHub Pull Request into a short, factual, auditable review brief.

> Before reading the diff, read the brief.

## Status

V0.1 local test version. The CLI fetches GitHub Pull Request data, GitHub CI statuses/checks, changed files and diff metadata, classifies changed files, detects deterministic signals, computes attention level, recommends a next review action and writes three output files.

## Goal

OSS Signal helps answer one question:

> Where should reviewer attention go first?

It does not decide whether a PR is good or bad. It highlights observable facts:

- PR size;
- changed file categories;
- tests present or absent;
- dependency changes;
- CI changes;
- GitHub CI status/check results;
- sensitive paths;
- migrations;
- mixed concerns;
- suggested next review action.

## Planned usage

```bash
npx oss-signal pr https://github.com/org/repo/pull/123
```

Generated files:

```text
oss-signal-output/
  review-brief.md
  review-brief.json
  agent-context.md
```

## Local usage

```bash
npm install
npm run build
node dist/cli/index.js pr https://github.com/org/repo/pull/123
```

Set `GITHUB_TOKEN` or `GH_TOKEN` for private repositories or a higher GitHub rate limit. The token is only sent as an Authorization header and is never included in output.

Terminal output is intentionally short:

```text
OSS Signal: org/repo#123
Attention: high
Action: request_split
Size: 5 files, +920 / -140
CI: pending (0 failed, 2 pending)
Signals: large_pr, tests_changed, docs_changed
Outputs: oss-signal-output/review-brief.md, oss-signal-output/review-brief.json, oss-signal-output/agent-context.md
```

Generated files:

```text
oss-signal-output/
  review-brief.md
  review-brief.json
  agent-context.md
```

Use `--dry-run` to validate URL parsing without network access:

```bash
node dist/cli/index.js pr https://github.com/org/repo/pull/123 --dry-run
```

Use `--fixture` to run against local fixture files instead of the network:

```bash
node dist/cli/index.js pr https://github.com/org/repo/pull/123 --fixture tests/fixtures/github-basic
```

Useful options:

```bash
node dist/cli/index.js pr <url> --out ./brief
node dist/cli/index.js pr <url> --format md
node dist/cli/index.js pr <url> --format json --no-agent
node dist/cli/index.js pr <url> --quiet
```

OSS Signal does not print or write the full diff. Reports contain facts, signals and evidence references.

## Examples

The `examples/` directory contains five real public PR examples with generated outputs:

- `01-docs-only`
- `02-dependency-change`
- `03-ci-change`
- `04-auth-security`
- `05-large-mixed`

Each example includes `source.md`, terminal output, `review-brief.md`, `review-brief.json` and `agent-context.md`.

## Non-goals

OSS Signal does not:

- review code for you;
- use AI in the MVP runtime;
- send code to external APIs;
- approve or reject PRs;
- auto-comment on PRs by default;
- assign a numeric quality score;
- claim to understand all business logic.

## Why

Maintainers and coding agents both need clean context before reviewing a PR. Raw diffs are noisy. OSS Signal provides a small intake brief so attention goes to the right places first.

## License

Apache-2.0.
