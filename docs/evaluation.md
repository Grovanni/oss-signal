# Evaluation Methodology

PR Signal is evaluated as a product tool: the question is whether the brief helps maintainers and coding agents orient review attention before reading the full diff.

These evaluations measure review guidance quality, not merge correctness. PR Signal does not decide whether a PR should be merged, and these results do not mean PR Signal found bugs or proved PR correctness.

The documented deterministic core was evaluated at commit `f79678e`.

## Objective

The evaluation checks whether PR Signal can generate useful, sober briefs for real public Pull Requests without crashing, over-routing to the wrong action, or overusing security/attention signals.

The evaluated product claim is:

> A deterministic PR intake brief can help route reviewer attention without acting as an AI reviewer or merge verdict.

## Two Separate 10,000-PR Evaluations

PR Signal was evaluated on two separate 10,000-PR public GitHub datasets.

The first dataset is a broad usage-realistic public GitHub PR sample intended to approximate realistic PR Signal usage. It answers: "What should users expect when running PR Signal on a broad public PR stream?"

The second dataset is a stratified stress test. It intentionally overrepresents difficult review surfaces such as dependencies, CI automation, Docker/build/release changes, auth/security/permissions, migrations/schema/database changes, large mixed PRs, tests-heavy changes, docs-only changes, and normal code changes. It answers: "Does PR Signal stay useful and sober on harder PR surfaces?"

The metrics from these two datasets should not be merged. They answer different product questions.

## Evaluator

Evaluation used an external ChatGPT 5.5 evaluator with xhigh reasoning effort as a consistency aid. The evaluator reviewed the generated brief against public PR context and assigned structured outcomes such as pass, noisy, wrong action, missed signal or crash.

The evaluator did not change PR Signal behavior at runtime. PR Signal itself remains deterministic and does not call an LLM.

Human interpretation is still required when using the metrics. The evaluator is useful for repeatable product validation, not as an absolute authority.

## Metrics

The main tracked metrics were:

- `crash_rate`: generation failures;
- `strict_pass_rate`: clean-pass rate under the evaluation rubric;
- `human_useful_rate`: whether the brief would be useful to a maintainer;
- `agent_useful_rate`: whether the brief would be useful as compact context for a coding agent;
- `wrong_action_rate`: cases where the recommended next action pointed review to the wrong first concern;
- `security_false_positive_rate`: cases where security framing was not supported by the PR context;
- `attention_too_high_rate`: cases where the attention level was materially too high;
- `attention_too_low_rate`: cases where the attention level was materially too low;
- `non_trivial_orientation_rate`: share of PRs where the recommended action was not `normal_review`.

The strict pass rate is the clean-pass rate. Briefs outside strict pass can still be useful, which is reflected by the human-useful and agent-useful rates.

## Usage-Realistic 10k Result

This run uses a broad public PR sample intended to approximate realistic PR Signal usage.

| Metric | Result |
|---|---:|
| PRs sampled | 10,000 |
| Unique PRs | 10,000 |
| Crash rate | 0.02% |
| Strict pass rate | 94.49% |
| Human-useful briefs | 99.23% |
| Agent-useful briefs | 97.13% |
| Wrong-action rate | 2.69% |
| Security false-positive rate | 0.00% |
| Attention too high | 0.49% |
| Attention too low | 2.21% |
| Non-trivial orientation rate | 71.60% |
| Useful/action-correct among non-trivial orientations | 95.99% |

The strict pass rate is the clean-pass rate. Briefs outside strict pass can still be useful, which is reflected by the human-useful and agent-useful rates.

### Usage-Realistic Action Distribution

| Recommended action | Count | Share |
|---|---:|---:|
| normal_review | 2,838 | 28.38% |
| ask_for_tests | 1,925 | 19.25% |
| security_review | 1,775 | 17.75% |
| wait_for_ci | 1,578 | 15.78% |
| request_split | 1,244 | 12.44% |
| dependency_review | 426 | 4.26% |
| ask_for_clarification | 162 | 1.62% |
| migration_review | 50 | 0.50% |

PR Signal did not simply default to normal review. In the usage-realistic run, it produced a non-trivial review orientation on 71.60% of PRs.

### Usage-Realistic Top Signals

| Signal | Count | Share |
|---|---:|---:|
| code_without_tests | 3,281 | 32.81% |
| configuration_changed | 2,470 | 24.70% |
| tests_changed | 2,120 | 21.20% |
| dependency_manifest_changed | 2,104 | 21.04% |
| large_pr | 2,043 | 20.43% |
| docs_changed | 1,957 | 19.57% |
| empty_description | 1,790 | 17.90% |
| ci_checks_failed | 1,770 | 17.70% |
| dependency_lockfile_changed | 1,600 | 16.00% |
| explicit_security_advisory | 1,087 | 10.87% |

In this public GitHub sample, non-trivial orientation was common because many PRs had missing tests, failed CI, dependency changes, empty descriptions, large diffs, configuration changes, or explicit security-advisory metadata.

Security-oriented signals were common in this public sample. The `security_review` action appeared on 17.75% of PRs and `explicit_security_advisory` appeared on 10.87%. These figures should not be read as the average rate of real security problems on GitHub; they reflect the sampled public PR stream, including dependency/security-advisory metadata, bot updates, CI/config changes, and security-looking maintenance work.

## Stratified Stress Test 10k Result

This run intentionally increased the share of difficult PR surfaces:

- normal code;
- docs only;
- dependencies / lockfiles;
- CI / automation;
- Docker / build / release;
- auth / security / permissions;
- migrations / schema / database;
- large mixed PRs;
- tests-heavy changes.

| Metric | Result |
|---|---:|
| PRs evaluated | 10,000 |
| Crash rate | 0.00% |
| Strict pass rate | 87.32% |
| Human-useful briefs | 97.37% |
| Agent-useful briefs | 96.88% |
| Wrong-action rate | 3.62% |
| Security false-positive rate | 1.17% |
| Attention too high | 3.16% |
| Attention too low | 3.91% |
| Non-trivial orientation rate | 56.17% |

### Stratified Stress Categories

| Category | Count |
|---|---:|
| normal_code | 2,850 |
| auth_security_permissions | 1,100 |
| docker_build_release | 1,100 |
| dependencies_lockfiles | 900 |
| ci_automation | 850 |
| large_mixed | 850 |
| tests_heavy | 850 |
| docs_only | 800 |
| migrations_schema_database | 700 |

The stress test is not intended to represent overall GitHub traffic. It intentionally increases the share of difficult PR surfaces to test whether PR Signal becomes brittle, noisy, or alarmist under pressure.

## Validity Limits

The validation does not prove that PR Signal understands code semantics. It evaluates brief usefulness and routing quality from metadata, changed-file paths, GitHub CI state and deterministic signals.

Known limits:

- evaluation uses an external ChatGPT 5.5 evaluator with xhigh reasoning effort outside the product;
- PR Signal runtime remains deterministic and does not use AI;
- results measure brief usefulness, not code correctness;
- public GitHub PRs do not perfectly represent all private repositories or team workflows;
- project-specific naming can still hide or exaggerate auth/security intent;
- migration/schema and persistence/data-format changes can be subtle and domain-specific;
- dependency and fixture-heavy PRs can still be hard to route cleanly;
- generated files can dominate large PRs and obscure the important source change;
- the evaluator itself can drift, so aggregate metrics should be interpreted with the methodology and representative examples;
- raw evaluation artifacts are not published in this repository to avoid noise, volume and unnecessary data exposure.

PR Signal should be treated as an intake aid. It helps decide where to start reviewing; it does not replace human review.
