# GitHub Action

PR Signal ships a non-intrusive GitHub Action in this repository.

It generates:

- a GitHub Actions step summary by default;
- an artifact containing generated brief files by default;
- `review-brief.md` when `format` is `md` or `all`;
- `review-brief.json` when `format` is `json` or `all`;
- `agent-context.md` by default.

It does not comment on pull requests by default. Commenting is not supported in this action yet.

It does not support `fail-on` review policies. This is intentional: PR Signal is an intake brief, not a blocking policy engine.

The `fail-on-error` input only controls runtime failures such as invalid inputs or GitHub API failures. It does not fail a workflow because of a PR signal, attention level or recommended action.

## Usage

```yaml
name: PR Signal

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
      - uses: Grovanni/pr-signal@<tag-or-commit>
        id: pr-signal
        with:
          github-token: ${{ github.token }}
```

Replace `<tag-or-commit>` with the release tag, commit SHA or branch you intentionally want to run.

## Inputs

| Input           | Default                | Description                                                          |
| --------------- | ---------------------- | -------------------------------------------------------------------- |
| `pr-url`        | pull request event URL | Explicit GitHub PR URL.                                              |
| `github-token`  | empty                  | Token used for GitHub API rate limits and private repository access. |
| `out`           | `pr-signal-output`    | Output directory under the workflow workspace.                       |
| `format`        | `all`                  | `md`, `json` or `all`.                                               |
| `agent-context` | `true`                 | Set to `false` to skip `agent-context.md`.                           |
| `config`        | empty                  | Optional config path, relative to the workflow workspace.            |
| `artifact-name` | `pr-signal-brief`     | Artifact name.                                                       |
| `upload-artifact` | `true`               | Set to `false` to skip artifact upload.                              |
| `step-summary`  | `true`                 | Set to `false` to skip the GitHub Actions step summary.              |
| `fail-on-error` | `true`                 | Set to `false` to keep the workflow green when brief generation fails. |

## Outputs

| Output | Description |
| ------ | ----------- |
| `output-directory` | Directory containing generated PR Signal files. |
| `review-brief-path` | Path to `review-brief.md` when generated. |
| `review-json-path` | Path to `review-brief.json` when generated. |
| `agent-context-path` | Path to `agent-context.md` when generated. |
| `attention` | Attention level from `review-brief.json` when available. |
| `recommended-action` | Recommended action from `review-brief.json` when available. |
| `generated` | `true` when PR Signal generated the requested brief files. |
| `error-message` | Runtime error message when generation failed and `fail-on-error` is `false`. |

`attention` and `recommended-action` are populated when `review-brief.json` is generated, which means `format` must be `json` or `all`.

## Integration Examples

JSON-only output without artifact upload:

```yaml
- uses: Grovanni/pr-signal@<tag-or-commit>
  id: pr-signal
  with:
    github-token: ${{ github.token }}
    format: json
    agent-context: "false"
    upload-artifact: "false"
```

Use PR Signal outputs in a later step:

```yaml
- uses: Grovanni/pr-signal@<tag-or-commit>
  id: pr-signal
  with:
    github-token: ${{ github.token }}

- name: Route follow-up automation
  if: ${{ steps.pr-signal.outputs.generated == 'true' }}
  run: |
    echo "Attention: ${{ steps.pr-signal.outputs.attention }}"
    echo "Action: ${{ steps.pr-signal.outputs.recommended-action }}"
    echo "JSON: ${{ steps.pr-signal.outputs.review-json-path }}"
```

Keep the workflow green if GitHub data is temporarily unavailable:

```yaml
- uses: Grovanni/pr-signal@<tag-or-commit>
  id: pr-signal
  with:
    github-token: ${{ github.token }}
    fail-on-error: "false"
```

## Notes

Use `pull_request` events for the default `pr-url` behavior. For other events, pass `pr-url` explicitly.

The checkout step is only needed when you want repository config discovery or a `config` input path. PR Signal does not run code from the checked-out repository or install its dependencies.

If the checked-out repository contains `pr-signal.yml`, `pr-signal.yaml`, `.pr-signal.yml`, `.pr-signal.yaml`, `pr-signal.json` or `.pr-signal.json`, the action uses it automatically because the CLI runs from the workflow workspace.
