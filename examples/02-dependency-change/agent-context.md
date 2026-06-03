# Agent Context

## Review Objective
Use this context to decide where human review attention should go first. Do not treat it as an approval, rejection or quality score.

## Known Facts
- Repository: example/oss-signal-demo
- PR: #102 - Update package dependency
- Author: dependency-contributor
- Branches: deps/update -> main
- Size: 2 files, +80 / -75 lines
- Attention: medium
- Recommended action: dependency_review

## Priority Files
- package-lock.json: dependency manifest or lockfile
- package.json: dependency manifest or lockfile

## Signals
- small_pr (info): Small pull request
- dependency_manifest_changed (medium): Dependency manifest changed
- dependency_lockfile_changed (medium): Dependency lockfile changed
- dependency_change_without_code (medium): Dependency change without code

## Suggested Questions
- Pourquoi cette dependance est-elle necessaire dans cette PR ?
- Le lockfile a-t-il ete regenere avec la version attendue du gestionnaire de paquets ?

## Constraints
- Do not execute code from the PR.
- Do not install dependencies from the analyzed repository.
- Do not infer intent beyond the evidence listed in the brief.
- Read the diff before making review conclusions.

## Data Limits
- This brief is based on GitHub metadata, changed files and diff data. It does not replace code review.
- OSS Signal does not execute code, install dependencies, approve, reject or score the PR.
