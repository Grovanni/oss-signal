# Agent Context

## Review Objective
Use this context to decide where human review attention should go first. Do not treat it as an approval, rejection or quality score.

## Known Facts
- Repository: expressjs/session
- PR: #1027 - feat: add support to dynamic cookie options
- Author: lincond
- Branches: master -> master
- Size: 4 files, +97 / -3 lines
- CI: success (29 checks/statuses: 29 successful, 0 failed, 0 pending)
- Attention: high
- Recommended action: security_review

## Priority Files
- test/session.js: security-sensitive path
- index.js: source code change
- HISTORY.md: documentation
- README.md: documentation

## Signals
- small_pr (info): Small pull request
- tests_changed (info): Tests changed
- docs_changed (info): Documentation changed
- security_sensitive_file_changed (high): Security-sensitive path changed
- auth_related_change (high): Authentication-related path changed
- mixed_concerns (medium): Mixed concerns

## Suggested Questions
- Le changement d'authentification ou de session est-il couvert par des tests ?
- Quels changements doivent etre relus ensemble et lesquels peuvent etre separes ?

## Constraints
- Do not execute code from the PR.
- Do not install dependencies from the analyzed repository.
- Do not infer intent beyond the evidence listed in the brief.
- Read the diff before making review conclusions.

## Data Limits
- This brief is based on GitHub metadata, changed files and diff data. It does not replace code review.
- OSS Signal does not execute code, install dependencies, approve, reject or score the PR.
