# Concepts

## PR intake brief

An intake brief is a short, factual document created before a full review.

It does not replace the review. It helps decide where reviewer attention should go first.

## Attention level

PR Signal uses `low`, `medium` and `high` attention levels.

This is not a quality score and not a security risk score.

It means:

- `low`: review can probably start normally;
- `medium`: some context or checks deserve attention;
- `high`: review should start with specific areas before reading everything.

## Evidence

Every signal should point to evidence:

- file path;
- metadata;
- description length;
- changed file category;
- diff availability.

## Agent context

`agent-context.md` is a compact briefing for coding agents.

It should help an agent start from known facts instead of reading a raw diff with no orientation.

