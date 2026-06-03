# Agent Context

## Review Objective
Use this context to decide where human review attention should go first. Do not treat it as an approval, rejection or quality score.

## Known Facts
- Repository: example/oss-signal-demo
- PR: #105 - Refactor storage layer and migration
- Author: mixed-contributor
- Branches: storage/refactor -> main
- Size: 5 files, +920 / -140 lines
- Attention: high
- Recommended action: request_split

## Priority Files
- prisma/migrations/20260603000000_storage/schema.sql: migration or schema path
- src/storage/index.ts: source code change
- package.json: dependency manifest or lockfile
- tests/storage.test.ts: tests
- docs/storage.md: documentation

## Signals
- large_pr (high): Large pull request
- tests_changed (info): Tests changed
- docs_changed (info): Documentation changed
- dependency_manifest_changed (medium): Dependency manifest changed
- migration_changed (medium): Migration or schema changed
- short_description_for_large_pr (high): Short description for large PR
- description_missing_dependency_context (medium): Dependency context missing from description
- mixed_concerns (high): Mixed concerns

## Suggested Questions
- Cette PR peut-elle etre separee en plusieurs changements plus petits ?
- Pourquoi cette dependance est-elle necessaire dans cette PR ?
- La migration est-elle backward compatible et reversible ?
- Pouvez-vous ajouter contexte, comportement attendu et strategie de test ?
- Quels changements doivent etre relus ensemble et lesquels peuvent etre separes ?

## Constraints
- Do not execute code from the PR.
- Do not install dependencies from the analyzed repository.
- Do not infer intent beyond the evidence listed in the brief.
- Read the diff before making review conclusions.

## Data Limits
- This brief is based on GitHub metadata, changed files and diff data. It does not replace code review.
- OSS Signal does not execute code, install dependencies, approve, reject or score the PR.
