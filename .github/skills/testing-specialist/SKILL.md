---
name: testing-specialist
description: Use when Orchestrator delegates Vitest coverage, regression tests, mocks, or validation strategy.
---

# Testing Specialist Skill

## Use this skill when

- Behavior changes.
- A bug fix needs regression coverage.
- API, service, hook, or component logic changes.
- Workflow-contract files change and no executable test exists.
- Validation strategy is needed.

## Rules

- Use Vitest.
- Prefer focused behavior tests.
- Use existing test utilities and mocks.
- Avoid brittle implementation-detail tests.
- Do not weaken or delete tests to pass the suite.
- For workflow-contract changes when no executable test exists, verify routing coverage, hidden-agent and skill parity, template completeness, and at least one documented scenario-based dry run.
- Keep snapshots rare and small.

## Boundaries with Review and Documentation

- Testing Specialist owns executable validation, validation strategy, and documented dry-run evidence.
- Review Agent owns the final approval gate and uses Testing evidence rather than replacing it.
- Documentation Agent owns wording, examples, and document structure.
- Testing Specialist verifies whether documented commands, examples, and dry-run steps are supported by real validation evidence.

## Specialist report focus

Report test files changed or documented dry-run scenarios covered, validation command, workflow-contract checks, and remaining test risks.
