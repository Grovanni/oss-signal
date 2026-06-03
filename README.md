# OSS Signal

A deterministic PR intake brief for maintainers and coding agents.

Not an AI reviewer.  
Not a bot that comments on your PRs.  
Not a quality score.

OSS Signal turns a GitHub Pull Request into a short, factual, auditable review brief.

> Before reading the diff, read the brief.

## Status

Early project. Phase 1 currently provides a TypeScript CLI skeleton and GitHub Pull Request URL parsing in dry-run mode.

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
node dist/cli/index.js pr https://github.com/org/repo/pull/123 --dry-run
```

Current dry-run output confirms URL parsing and does not fetch GitHub data yet.

```json
{
  "mode": "dry-run",
  "pull_request": {
    "owner": "org",
    "repo": "repo",
    "pullNumber": 123,
    "htmlUrl": "https://github.com/org/repo/pull/123"
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
