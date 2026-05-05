# Contributing

Thanks for taking the time to contribute! This document covers the basic
workflow for proposing changes.

## Reporting Issues

Before opening a new issue:

1. Search existing issues to avoid duplicates.
2. Include the project version, your platform, and steps to reproduce.
3. For bugs, include the actual vs expected behaviour.

## Proposing Changes

1. Fork the repository and create a feature branch:
   ```
   git checkout -b feat/short-description
   ```
2. Keep changes focused — one logical change per pull request.
3. Add or update tests when changing behaviour.
4. Run the project's test suite locally before pushing.
5. Push your branch and open a pull request against `main`.

## Pull Request Guidelines

- **Title:** short, present-tense (e.g. `add foo helper`, `fix race in bar`).
- **Description:** explain *why*, not just *what*. Link related issues.
- **Commits:** small, well-described commits are easier to review than a single
  large one.
- **Style:** match the surrounding code; the project's linter is the source of truth.

## Code of Conduct

By participating, you agree to abide by the project's Code of Conduct. Be
respectful, assume good intent, and keep discussion focused on the work.

## Questions

If you're unsure whether a change makes sense, open an issue describing the
problem before writing code — it's faster than rewriting a rejected PR.
