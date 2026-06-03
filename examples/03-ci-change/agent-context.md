# Agent Context

## Review Objective
Use this context to decide where human review attention should go first. Do not treat it as an approval, rejection or quality score.

## Known Facts
- Repository: cli/cli
- PR: #13491 - SHA pin first-party GitHub Actions
- Author: williammartin
- Branches: wm-sha-pin -> trunk
- Size: 7 files, +31 / -31 lines
- CI: success (9 checks/statuses: 9 successful, 0 failed, 0 pending)
- Attention: medium
- Recommended action: normal_review

## Priority Files
- .github/workflows/deployment.yml: CI workflow or pipeline
- .github/workflows/codeql.yml: CI workflow or pipeline
- .github/workflows/go.yml: CI workflow or pipeline
- .github/workflows/lint.yml: CI workflow or pipeline
- .github/workflows/govulncheck.yml: CI workflow or pipeline

## Signals
- medium_pr (info): Medium pull request
- ci_changed (medium): CI changed
- security_sensitive_file_changed (medium): Security-sensitive path changed
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
