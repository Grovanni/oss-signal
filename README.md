# OSS Signal

A deterministic PR intake brief for maintainers and coding agents.

Not an AI reviewer.  
Not a bot that comments on your PRs.  
Not a quality score.

OSS Signal turns a GitHub Pull Request into a short, factual, auditable review brief.

> Before reading the diff, read the brief.

## Status

Early project. Phase 3 currently fetches GitHub Pull Request data, classifies changed files, detects deterministic signals, computes attention level and recommends a next review action. Final report file rendering is still planned.

## Goal

OSS Signal helps answer one question:

> Where should reviewer attention go first?

It does not decide whether a PR is good or bad. It highlights observable facts:

- PR size;
- changed file categories;
- tests present or absent;
- dependency changes;
- CI changes;
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

## Current local usage

```bash
npm install
npm run build
node dist/cli/index.js pr https://github.com/org/repo/pull/123
```

Set `GITHUB_TOKEN` or `GH_TOKEN` for private repositories or a higher GitHub rate limit. The token is only sent as an Authorization header and is never included in output.

Use `--dry-run` to validate URL parsing without network access:

```bash
node dist/cli/index.js pr https://github.com/org/repo/pull/123 --dry-run
```

Use `--fixture` to run against local fixture files instead of the network:

```bash
node dist/cli/index.js pr https://github.com/org/repo/pull/123 --fixture tests/fixtures/github-basic
```

Current output is an intermediate normalized JSON summary. It includes diff byte and line counts, but it does not print the full diff or full PR description.

```json
{
  "mode": "github",
  "pull_request": {
    "number": 123,
    "title": "Example pull request",
    "changed_files": 2
  },
  "files": {
    "count": 2
  },
  "diff": {
    "format": "unified",
    "bytes": 1200,
    "lines": 80,
    "available": true
  },
  "analysis": {
    "attention": "low",
    "recommended_action": "normal_review",
    "signals": [
      {
        "id": "small_pr",
        "level": "info",
        "evidence": []
      }
    ],
    "questions": []
  }
}
```

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
