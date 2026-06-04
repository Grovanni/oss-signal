# Review brief JSON schema

`review-brief.json` is versioned. The JSON Schema is committed at:

```text
schemas/review-brief.v1.schema.json
```

Required top-level fields:

```json
{
  "schema_version": "review-brief.v1",
  "repository": {},
  "pull_request": {},
  "size": {},
  "ci": {},
  "categories": {},
  "signals": [],
  "attention": {},
  "recommended_action": {},
  "priority_files": [],
  "questions": [],
  "data_confidence": {
    "source": "github",
    "diff_available": true,
    "file_count_matches_metadata": true,
    "ci_available": true
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

## CI shape

```json
{
  "ci": {
    "head_sha": "1111111111111111111111111111111111111111",
    "state": "success",
    "total": 3,
    "successful": 3,
    "failed": 0,
    "pending": 0,
    "skipped": 0,
    "items": []
  }
}
```

`state` is `success`, `failure`, `pending` or `unknown`. Items are GitHub check runs and commit statuses normalized into a compact shape.

## Compatibility rule

`review-brief.v1` allows additive, non-breaking fields. Consumers should ignore unknown fields they do not understand.

New signal IDs, optional fields and additional object members are additive in `review-brief.v1` when existing field names and types stay valid. Consumers should route on the signal IDs they understand and ignore the rest.

For example, adding `localization_catalog_change` or `dominant_database_change` does not require a new schema version because signal IDs are data values, not a closed enum in the JSON Schema.

Do not remove fields, rename fields or change field types inside the same `schema_version`.

If a breaking change is needed, use a new major schema version such as `review-brief.v2`.

## Guaranteed fields

The top-level fields listed above are guaranteed in `review-brief.v1`.

These nested fields are also part of the stable v1 contract:

- repository identity and URL fields;
- pull request metadata shown in the schema example;
- size counters;
- CI summary counters and normalized CI item shape;
- category counts;
- signals with evidence;
- attention, recommended action, priority files and questions;
- data confidence and limitations.

## Optional and nullable values

Some guaranteed fields can be `null` when GitHub does not provide a value, for example PR author, merge time, fork repository names or CI item URLs.

OSS Signal may add new fields inside existing objects without changing `schema_version` as long as existing field names and types stay valid.

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
