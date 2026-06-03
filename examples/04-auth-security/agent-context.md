# Agent Context

## Review Objective
Use this context to decide where human review attention should go first. Do not treat it as an approval, rejection or quality score.

## Known Facts
- Repository: example/oss-signal-demo
- PR: #104 - Adjust session token handling
- Author: security-contributor
- Branches: auth/session-token -> main
- Size: 1 files, +42 / -12 lines
- Attention: high
- Recommended action: security_review

## Priority Files
- src/auth/session.ts: security-sensitive path

## Signals
- small_pr (info): Small pull request
- code_without_tests (medium): Code changed without tests
- security_sensitive_file_changed (high): Security-sensitive path changed
- auth_related_change (high): Authentication-related path changed

## Suggested Questions
- Quels tests couvrent les fichiers de code modifies ?
- Le changement d'authentification ou de session est-il couvert par des tests ?

## Constraints
- Do not execute code from the PR.
- Do not install dependencies from the analyzed repository.
- Do not infer intent beyond the evidence listed in the brief.
- Read the diff before making review conclusions.

## Data Limits
- This brief is based on GitHub metadata, changed files and diff data. It does not replace code review.
- OSS Signal does not execute code, install dependencies, approve, reject or score the PR.
