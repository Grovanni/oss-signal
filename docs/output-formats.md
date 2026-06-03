# Output formats

OSS Signal produces three output files.

## `review-brief.md`

Human-readable brief for maintainers.

It should be short enough to read before opening the full diff.

Main sections:

- summary;
- recommended action;
- top reasons with evidence;
- areas touched;
- priority files;
- questions;
- limitations.

## `review-brief.json`

Machine-readable output for scripts, dashboards and coding agents.

The schema is versioned with `schema_version`.

Current schema version:

```text
review-brief.v1
```

The JSON includes repository and PR metadata, size, categories, signals with evidence, attention, recommended action, priority files, questions, data confidence and limitations.

## `agent-context.md`

Compact briefing for coding agents.

It contains known facts, priority files, suggested review questions and constraints.

It must not contain long diff dumps or speculative conclusions.

It is intended as a compact starting context for coding agents, not as a review verdict.
