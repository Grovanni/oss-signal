# Review brief JSON schema

The JSON output is versioned.

Required top-level fields:

```json
{
  "schema_version": "0.1",
  "repository": {},
  "pull_request": {},
  "size": {},
  "categories": {},
  "signals": [],
  "attention": {},
  "recommended_action": {},
  "priority_files": [],
  "questions": [],
  "data_confidence": {},
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

