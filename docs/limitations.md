# Limitations

OSS Signal is a PR intake tool, not a code reviewer.

It cannot:

- prove correctness;
- find all bugs;
- inspect runtime behavior;
- run tests in the analyzed repository;
- install dependencies from the analyzed repository;
- understand all project-specific architecture;
- replace human review;
- know whether a change is intended;
- judge business logic.

GitHub CI status/check data may be unavailable when GitHub does not expose checks for the PR head commit, permissions are insufficient or the API rate limit is reached. In that case the brief remains usable and records the limitation.

GitHub diff data may also be unavailable for large PRs or transient GitHub errors. OSS Signal still uses PR metadata and changed-file metadata, records the limitation, and does not fail the whole run solely because the diff body is missing.

Persistence and data-format detection is intentionally conservative. It looks for known path or text indicators such as HDF5, PyTables, serialization and file-format terms, but it cannot prove backward compatibility or find every storage-related change.

Security-sensitive path matching is token-based and intentionally avoids bare storage/test words such as `key` without stronger surrounding context. It also suppresses generic auth/session/token/security words in tests, docs, fixtures, examples, compiler internals and protocol paths unless stronger sensitive terms are present. This reduces false positives but can miss project-specific secret naming conventions unless configured paths are added.

Database migration detection is intentionally narrower than a generic `schema` keyword match. JSON schemas, generated fixtures and tests-only migration folders may be reported through persistence/data-format or normal review instead of `migration_review` unless the path contains clearer runtime database or migration-tooling evidence.

Small source wording detection uses PR title/body and file metadata, not diff semantics. It can suppress generic test requests for obvious docstring/comment/typo wording changes, but it cannot prove that a source edit is behavior-free.

Container image/deployment detection is orientation only. OSS Signal can flag image tag, HelmRelease, Helm chart or similar deployment image updates, but it does not verify the image provenance, changelog or runtime compatibility.

OSS Signal does not currently emit dedicated backport, public API or workflow-hardening signals. Those may be added later when they can be detected precisely without increasing generic noise.

It can:

- classify changed files;
- identify attention signals;
- summarize GitHub CI status/check results when available;
- show missing context;
- produce a compact review brief;
- help humans and agents start from cleaner context.

Reports do not include full diff dumps. They include file paths, metadata, category counts, signals and evidence references.
