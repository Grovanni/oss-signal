# Agent Context

## Review Objective
Use this context to decide where human review attention should go first. Do not treat it as an approval, rejection or quality score.

## Known Facts
- Repository: example/oss-signal-demo
- PR: #103 - Adjust CI workflow cache
- Author: ci-contributor
- Branches: ci/cache -> main
- Size: 1 files, +12 / -3 lines
- Attention: high
- Recommended action: security_review

## Priority Files
- .github/workflows/ci.yml: security-sensitive path

## Signals
- small_pr (info): Small pull request
- ci_changed (medium): CI changed
- security_sensitive_file_changed (high): Security-sensitive path changed
- configuration_changed (info): Configuration changed

## Suggested Questions
- Pourquoi le workflow CI doit-il changer dans cette PR ?

## Constraints
- Do not execute code from the PR.
- Do not install dependencies from the analyzed repository.
- Do not infer intent beyond the evidence listed in the brief.
- Read the diff before making review conclusions.

## Data Limits
- This brief is based on GitHub metadata, changed files and diff data. It does not replace code review.
- OSS Signal does not execute code, install dependencies, approve, reject or score the PR.
