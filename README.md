# PR Signal

PR Signal turns a GitHub Pull Request into a deterministic intake brief that tells maintainers and coding agents where to look first.

It is not an AI reviewer. It does not use AI at runtime, does not send code to external APIs, does not decide whether a PR should be merged, and does not comment on PRs by default.

> Before reading the diff, read the brief.

## What It Does

PR Signal fetches GitHub Pull Request metadata, changed files, diff metadata and GitHub CI status/checks when available. It then classifies the PR with deterministic rules and writes a compact brief.

The brief highlights observable review context:

- PR size and changed-file categories;
- tests present or absent;
- dependency, CI, automation, Dockerfile and release changes;
- auth/security, migration/schema and persistence/data-format signals;
- GitHub CI status/check results when available;
- priority files and a suggested next review action.

The recommended action is review orientation, not a verdict.

## Validation

The current deterministic core was evaluated on two separate 10,000-PR public GitHub datasets at commit `f79678e`.

The usage-realistic run approximates ordinary public OSS PR traffic. It produced 99.23% human-useful briefs, 97.13% agent-useful briefs, a 2.69% wrong-action rate, a 0.00% security false-positive rate and a 71.60% non-trivial orientation rate.

The stratified stress test intentionally overrepresents difficult review surfaces such as dependencies, CI automation, Docker/build/release changes, auth/security/permissions, migrations/schema/database changes, large mixed PRs, tests-heavy changes, docs-only changes and normal code changes. It produced 97.37% human-useful briefs, 96.88% agent-useful briefs, a 3.62% wrong-action rate, a 1.17% security false-positive rate and a 56.17% non-trivial orientation rate.

These metrics measure review guidance quality, not merge correctness. PR Signal does not decide whether a PR should be merged, and these results do not mean PR Signal found bugs or proved PR correctness.

The two evaluations answer different questions and should not be merged. Full methodology, action distribution, top signals and limitations are documented in [docs/evaluation.md](docs/evaluation.md).

## Current Usage

The CLI is available from this repository. Node.js 20 or newer is required.

```bash
npm install
npm run build
node dist/cli/index.js pr https://github.com/org/repo/pull/123
```

Set `GITHUB_TOKEN` or `GH_TOKEN` for private repositories or a higher GitHub rate limit. The token is only sent as an Authorization header and is never included in output.

Useful options:

```bash
node dist/cli/index.js pr <url> --out ./brief
node dist/cli/index.js pr <url> --format md
node dist/cli/index.js pr <url> --format json --no-agent
node dist/cli/index.js pr <url> --config pr-signal.yml
node dist/cli/index.js pr <url> --quiet
```

Use `--dry-run` to validate URL parsing without network access:

```bash
node dist/cli/index.js pr https://github.com/org/repo/pull/123 --dry-run
```

Use `--fixture` to run against local fixture files instead of the network:

```bash
node dist/cli/index.js pr https://github.com/org/repo/pull/123 --fixture tests/fixtures/github-basic
```

The package metadata is ready for npm-style CLI usage, but npm publication is a separate release step. Do not assume an npm package is available unless a published release says so.

## Outputs

PR Signal writes:

```text
pr-signal-output/
  review-brief.md
  review-brief.json
  agent-context.md
```

Terminal output is intentionally short:

```text
PR Signal: org/repo#123
Attention: high
Action: request_split
Size: 5 files, +920 / -140
CI: pending (0 failed, 2 pending)
Signals: large_pr, tests_changed, docs_changed
Outputs: pr-signal-output/review-brief.md, pr-signal-output/review-brief.json, pr-signal-output/agent-context.md
```

PR Signal does not print or write the full diff. Reports contain facts, signals, GitHub CI state when available and evidence references.

## GitHub Action

This repository includes a non-intrusive GitHub Action. It writes a step summary and uploads brief artifacts. It does not comment on PRs and does not support `fail-on`.

See [docs/github-action.md](docs/github-action.md).

## More Docs

- [Concepts](docs/concepts.md)
- [Signals](docs/signals.md)
- [Decision policy](docs/decision-policy.md)
- [Output formats](docs/output-formats.md)
- [Configuration](docs/configuration.md)
- [Limitations](docs/limitations.md)
- [Examples](docs/examples.md)

## Examples

The `examples/` directory contains five real public PR examples with generated outputs:

- `01-docs-only`
- `02-dependency-change`
- `03-ci-change`
- `04-auth-security`
- `05-large-mixed`

Each example includes `source.md`, terminal output, `review-brief.md`, `review-brief.json` and `agent-context.md`.

## Non-Goals

PR Signal does not:

- review code for you;
- prove correctness;
- use AI in the runtime;
- send code to external APIs;
- approve or reject PRs;
- auto-comment on PRs by default;
- assign a numeric quality score;
- replace human review.

## License

Apache-2.0.
