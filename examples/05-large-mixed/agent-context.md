# Agent Context

## Review Objective
Use this context to decide where human review attention should go first. Do not treat it as an approval, rejection or quality score.

## Known Facts
- Repository: vitejs/vite
- PR: #22471 - fix(deps): update all non-major dependencies
- Author: renovate[bot]
- Branches: renovate/all-minor-patch -> main
- Size: 32 files, +594 / -888 lines
- Attention: high
- Recommended action: request_split

## Priority Files
- pnpm-lock.yaml: dependency manifest or lockfile
- docs/package.json: dependency manifest or lockfile
- package.json: dependency manifest or lockfile
- packages/create-vite/template-react-ts/package.json: dependency manifest or lockfile
- packages/vite/package.json: dependency manifest or lockfile

## Signals
- large_pr (high): Large pull request
- many_files_changed (high): Many files changed
- docs_changed (info): Documentation changed
- dependency_manifest_changed (medium): Dependency manifest changed
- dependency_lockfile_changed (medium): Dependency lockfile changed
- dependency_change_without_code (medium): Dependency change without code
- ci_changed (medium): CI changed
- ci_changed_with_dependency_change (high): CI and dependencies changed together

## Suggested Questions
- Cette PR peut-elle etre separee en plusieurs changements plus petits ?
- Pourquoi cette dependance est-elle necessaire dans cette PR ?
- Le lockfile a-t-il ete regenere avec la version attendue du gestionnaire de paquets ?
- Pourquoi le workflow CI doit-il changer dans cette PR ?
- Quels changements doivent etre relus ensemble et lesquels peuvent etre separes ?

## Constraints
- Do not execute code from the PR.
- Do not install dependencies from the analyzed repository.
- Do not infer intent beyond the evidence listed in the brief.
- Read the diff before making review conclusions.

## Data Limits
- This brief is based on GitHub metadata, changed files and diff data. It does not replace code review.
- OSS Signal does not execute code, install dependencies, approve, reject or score the PR.
