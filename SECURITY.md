# Security Policy

PR Signal analyzes public Pull Request metadata and diffs to produce a deterministic review intake brief.

## Security principles

- PR Signal must not execute code from analyzed Pull Requests.
- PR Signal must not install dependencies from analyzed Pull Requests.
- PR Signal must not write tokens into generated output.
- `GITHUB_TOKEN`, when used, is optional and must stay local.
- Generated reports should avoid copying secret-looking values from diffs.

## Reporting a vulnerability

Please open a private security advisory on GitHub when available, or contact the maintainer through the repository contact channel.

Do not disclose vulnerabilities publicly before maintainers have had time to respond.

