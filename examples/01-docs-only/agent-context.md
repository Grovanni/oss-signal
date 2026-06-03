# Agent Context

## Review Objective
Use this context to decide where human review attention should go first. Do not treat it as an approval, rejection or quality score.

## Known Facts
- Repository: example/oss-signal-demo
- PR: #101 - Clarify installation docs
- Author: docs-contributor
- Branches: docs/install -> main
- Size: 2 files, +16 / -4 lines
- Attention: low
- Recommended action: normal_review

## Priority Files
- README.md: documentation
- docs/usage.md: documentation

## Signals
- small_pr (info): Small pull request
- docs_only (info): Documentation-only change

## Suggested Questions
- No specific question generated.

## Constraints
- Do not execute code from the PR.
- Do not install dependencies from the analyzed repository.
- Do not infer intent beyond the evidence listed in the brief.
- Read the diff before making review conclusions.

## Data Limits
- This brief is based on GitHub metadata, changed files and diff data. It does not replace code review.
- OSS Signal does not execute code, install dependencies, approve, reject or score the PR.
