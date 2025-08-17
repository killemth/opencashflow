# Contributing to OpenCashflow

Thanks for your interest in contributing! This project is open to issues and pull requests.

## Ground rules

- Be respectful and follow the Code of Conduct.
- Discuss significant feature changes in an issue before opening a PR.
- Keep PRs small and focused; include tests and docs.

## Development setup

Prerequisites: Node.js 18+

```powershell
npm install
npm run dev
```

Run tests and coverage:

```powershell
npm test
npm run test -- --coverage
```

Generate screenshots (for docs):

```powershell
npm run snap
```

This builds, previews locally, seeds demo data, and saves images into `docs/images/`.

## Branching and PRs

- Create a topic branch from `main`: `feature/<short-name>` or `fix/<short-name>`.
- Open a Pull Request to `main`.
- CI will run tests with coverage and a production build.
- Add/adjust tests for any behavior change (simulation logic, Sankey, grids, etc.).
- Update README/screenshots if the UI/UX changes.

Recommended commit format: Conventional Commits (e.g., `feat:`, `fix:`), but not enforced.

## Project standards

- Testing: Vitest + Testing Library. Coverage thresholds are enforced in `vitest.config.ts`.
- UI tests: keep selectors resilient; prefer text-based queries.
- Charts: new Sankey or chart functionality should include a UI test and (when feasible) a data-shape unit test.
