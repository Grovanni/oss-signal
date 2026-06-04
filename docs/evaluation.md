# Evaluation Methodology

OSS Signal is evaluated as a product tool: the question is whether the brief helps maintainers and coding agents orient review attention before reading the full diff.

This is not a scientific proof of correctness. It is a reproducible validation process for a deterministic PR intake tool.

## Objective

The evaluation checks whether OSS Signal can generate useful, sober briefs for real public Pull Requests without crashing, over-routing to the wrong action, or overusing security/attention signals.

The evaluated product claim is:

> A deterministic PR intake brief can help route reviewer attention without acting as an AI reviewer or merge verdict.

## Corpus

The main validation run used 1,000 public GitHub Pull Requests.

The corpus was stratified across review surfaces that commonly affect maintainer attention:

- documentation-only and documentation-heavy changes;
- dependency and lockfile updates;
- CI, workflow and automation changes;
- Docker, build and release changes;
- auth, security and permissions changes;
- migrations, schemas and database-related changes;
- tests-heavy changes;
- normal code changes;
- large or mixed PRs.

Earlier calibration and holdout runs were kept separate from the main validation run. The cumulative validation count is 1,382 public PR evaluations.

## Evaluator

Evaluation used an external GPT-based evaluator as a consistency aid. The evaluator reviewed the generated brief against the public PR context and assigned structured outcomes such as pass, noisy, wrong action, missed signal or crash.

The evaluator did not change OSS Signal behavior at runtime. OSS Signal itself remains deterministic and does not call an LLM.

Human interpretation is still required when using the metrics. The evaluator is useful for repeatable product calibration, not as an absolute authority.

## Metrics

The main tracked metrics were:

- `crash_rate`: generation failures;
- `human_useful_rate`: whether the brief would be useful to a maintainer;
- `agent_useful_rate`: whether the brief would be useful as compact context for a coding agent;
- `wrong_action_rate`: cases where the recommended next action pointed review to the wrong first concern;
- `security_false_positive_rate`: cases where security framing was not supported by the PR context;
- `attention_too_high_rate`: cases where the attention level was materially too high;
- `attention_too_low_rate`: cases where the attention level was materially too low;
- `pass_rate`: overall clean pass rate under the evaluation rubric.

## GO Criteria

The automatic GO/NO-GO gates used during validation were:

| Metric | GO threshold |
| --- | ---: |
| Crash rate | 0.0% |
| Human useful rate | >= 90.0% |
| Agent useful rate | >= 90.0% |
| Wrong action rate | <= 7.0% |
| Security false positive rate | <= 3.0% |
| Attention too high rate | <= 7.0% |
| Attention too low rate | <= 7.0% |

These thresholds are product-readiness gates. They are not claims that every individual PR brief is correct.

## Main 1,000 PR Result

The main run was evaluated at OSS Signal commit `d9f586a`.

Decision: GO.

| Metric | Result |
| --- | ---: |
| Crash rate | 0.0% |
| Human useful rate | 98.8% |
| Agent useful rate | 97.8% |
| Wrong action rate | 2.4% |
| Security false positive rate | 0.4% |
| Attention too high rate | 2.1% |
| Attention too low rate | 4.8% |
| Pass rate | 85.4% |

## Cumulative Result

The cumulative validation total is 1,382 public PR evaluations across calibration, holdout and main validation phases.

Decision: GO.

The cumulative result is used as confidence that the current deterministic rules are broadly useful across varied public PRs. The main 1,000 PR run is the primary release-readiness result because it was run after the final targeted corrections.

## Validity Limits

The validation does not prove that OSS Signal understands code semantics. It evaluates brief usefulness and routing quality from metadata, changed-file paths, GitHub CI state and deterministic signals.

Known limits:

- project-specific naming can still hide or exaggerate auth/security intent;
- migration/schema and persistence/data-format changes can be subtle and domain-specific;
- dependency and fixture-heavy PRs can still be hard to route cleanly;
- generated files can dominate large PRs and obscure the important source change;
- the evaluator itself can drift, so aggregated results should be interpreted with representative examples and manual review.

OSS Signal should be treated as an intake aid. It helps decide where to start reviewing; it does not replace human review.
