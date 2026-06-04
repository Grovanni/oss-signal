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

It can:

- classify changed files;
- identify attention signals;
- summarize GitHub CI status/check results when available;
- show missing context;
- produce a compact review brief;
- help humans and agents start from cleaner context.

Reports do not include full diff dumps. They include file paths, metadata, category counts, signals and evidence references.
