# Review brief JSON schema

`review-brief.json` is versioned.

Required top-level fields:

```json
{
  "schema_version": "review-brief.v1",
  "repository": {},
  "pull_request": {},
  "size": {},
  "categories": {},
  "signals": [],
  "attention": {},
  "recommended_action": {},
  "priority_files": [],
  "questions": [],
  "data_confidence": {
    "source": "github",
    "diff_available": true,
    "file_count_matches_metadata": true
  },
  "limitations": []
}
```

## Signal shape

```json
{
  "id": "code_without_tests",
  "level": "medium",
  "title": "Code changed without detected tests",
  "message": "Code files changed but no test files were detected.",
  "evidence": [
    {
      "kind": "file",
      "value": "src/auth/session.ts",
      "reason": "classified as code"
    }
  ]
}
```

## Compatibility rule

Do not remove or rename fields inside the same `schema_version`.

If a breaking change is needed, increment `schema_version`.

## Analysis fields

The JSON contains the same core analysis fields used by the Markdown and agent context renderers:

```json
{
  "categories": {},
  "signals": [],
  "attention": "medium",
  "recommended_action": "ask_for_tests",
  "priority_files": [],
  "questions": []
}
```
