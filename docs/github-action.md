# GitHub Action

OSS Signal ships a non-intrusive GitHub Action in this repository.

It generates:

- a GitHub Actions step summary;
- an artifact containing `review-brief.md`;
- an artifact containing `review-brief.json`;
- an artifact containing `agent-context.md` by default.

It does not comment on pull requests by default. Commenting is not supported in this action yet.

It does not support `fail-on`. This is intentional: OSS Signal is an intake brief, not a blocking policy engine.

## Usage

```yaml
name: OSS Signal

on:
  pull_request:

permissions:
  contents: read
  pull-requests: read
  checks: read

jobs:
  brief:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          persist-credentials: false
      - uses: Grovanni/oss-signal@v0.2.0
        with:
          github-token: ${{ github.token }}
```

## Inputs

| Input           | Default                | Description                                                          |
| --------------- | ---------------------- | -------------------------------------------------------------------- |
| `pr-url`        | pull request event URL | Explicit GitHub PR URL.                                              |
| `github-token`  | empty                  | Token used for GitHub API rate limits and private repository access. |
| `out`           | `oss-signal-output`    | Output directory under the workflow workspace.                       |
| `format`        | `all`                  | `md`, `json` or `all`.                                               |
| `agent-context` | `true`                 | Set to `false` to skip `agent-context.md`.                           |
| `config`        | empty                  | Optional config path, relative to the workflow workspace.            |
| `artifact-name` | `oss-signal-brief`     | Artifact name.                                                       |

## Notes

Use `pull_request` events for the default `pr-url` behavior. For other events, pass `pr-url` explicitly.

The checkout step is only needed when you want repository config discovery or a `config` input path. OSS Signal does not run code from the checked-out repository or install its dependencies.

If the checked-out repository contains `oss-signal.yml`, `oss-signal.yaml`, `.oss-signal.yml`, `.oss-signal.yaml`, `oss-signal.json` or `.oss-signal.json`, the action uses it automatically because the CLI runs from the workflow workspace.
