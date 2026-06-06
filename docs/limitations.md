# Limitations

PR Signal is a PR intake tool, not a code reviewer.

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

GitHub changed-file data or diff data may also be unavailable for large PRs, transient GitHub errors or unexpected API response shapes. PR Signal still uses the PR metadata and any partial file/diff data it has, records the limitation, and does not fail the whole run solely because changed files or diff body are missing.

Persistence and data-format detection is intentionally conservative. It looks for known path or text indicators such as HDF5, PyTables, serialization and file-format terms, but it cannot prove backward compatibility or find every storage-related change.

Security-sensitive path matching is token-based and intentionally avoids bare storage/test words such as `key` without stronger surrounding context. It also suppresses generic auth/session/token/policy/security/env/path/context/memory words in tests, docs, fixtures, examples, data files, compiler internals, protocol paths, UI/CSS paths, parser paths, snapshots, slides, assets and third-party license files. This reduces false positives but can miss project-specific secret or access-control naming conventions unless configured paths are added.

Database migration detection is intentionally narrower than a generic `schema` keyword match. JSON schemas, generated fixtures and tests-only migration folders may be reported through persistence/data-format or normal review instead of `migration_review` unless the path contains clearer runtime database or migration-tooling evidence.

Small source wording and metadata detection uses PR title/body, file metadata and CI state, not diff semantics. It can suppress generic test requests for obvious docstring/comment/typo/help/type metadata changes, but it cannot prove that a source edit is behavior-free.

Container image/deployment detection is orientation only. PR Signal can flag image tag, HelmRelease, Helm chart or similar deployment image updates, but it does not verify the image provenance, changelog or runtime compatibility.

PR Signal does not currently emit dedicated backport, public API or workflow-hardening signals. Those may be added later when they can be detected precisely without increasing generic noise.

## Known Residual Limits From Validation

The public validation runs showed strong aggregate usefulness, but a few families remain imperfect:

- auth/security changes can be under-prioritized when the sensitive behavior is visible only from project-specific semantics rather than paths or titles;
- migration, schema and persistence changes can be under-prioritized or over-prioritized when repository naming does not distinguish database schema from data-format schema;
- token, policy, session or credential terms can still be noisy or too quiet in unusual project-specific contexts;
- dependency, vendor and fixture-heavy PRs can sometimes be routed to dependency or normal review when a human would prefer a more specific first pass;
- generated files and large test fixtures can make priority-file ordering less precise.

These are limitations of deterministic intake signals. They should be handled by human review, project configuration, or future narrowly scoped signals rather than broad overfitting.

It can:

- classify changed files;
- identify attention signals;
- summarize GitHub CI status/check results when available;
- show missing context;
- produce a compact review brief;
- help humans and agents start from cleaner context.

Reports do not include full diff dumps. They include file paths, metadata, category counts, signals and evidence references.
