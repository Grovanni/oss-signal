# Contributing to PR Signal

Thanks for considering a contribution.

PR Signal is intentionally narrow: it creates deterministic PR intake briefs. It does not review code, use AI, or post automatic comments by default.

## Good contributions

- Better file classification.
- New deterministic signals with clear evidence.
- Less noisy output.
- More realistic fixtures.
- Documentation improvements.
- Examples from public PRs.

## Signal proposals

When proposing a new signal, include:

- signal name;
- why it helps a reviewer;
- evidence available from PR metadata or diff;
- false positive risk;
- example PR or fixture.

## Development

Expected commands after project bootstrap:

```bash
npm install
npm test
npm run build
npm run lint
```

## Product guardrails

Please do not add:

- LLM runtime dependency;
- automatic PR comments by default;
- approve/reject verdicts;
- numeric quality scores;
- code execution from analyzed PRs;
- network calls outside GitHub data retrieval unless discussed first.

