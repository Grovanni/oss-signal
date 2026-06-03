# Output formats

OSS Signal produces three output files.

## `review-brief.md`

Human-readable brief for maintainers.

It should be short enough to read before opening the full diff.

## `review-brief.json`

Machine-readable output for scripts, dashboards and coding agents.

The schema is versioned with `schema_version`.

## `agent-context.md`

Compact briefing for coding agents.

It contains known facts, priority files, suggested review questions and constraints.

It must not contain long diff dumps or speculative conclusions.

