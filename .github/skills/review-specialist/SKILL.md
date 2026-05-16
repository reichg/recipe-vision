---
name: review-specialist
description: Use when Orchestrator needs final quality review for modularity, minimality, clean code, comments, clutter, tests, and security.
---

# Review Specialist Skill

## Use this skill when

- Any code has changed.
- Workflow-contract files changed.
- Final quality gate is needed.

## Rules

- Code changes must be modular.
- Code changes must be clean.
- Minimal changes must be made.
- No clutter.
- No unrelated refactors.
- No broad formatting churn.
- Comments must clarify non-obvious behavior only.
- Tests must cover behavior changes.
- Workflow-contract changes must keep agents, skills, routing rules, and template sections in sync.
- Security must not be weakened.

## Boundary with Testing Agent

- Review Specialist is the final quality gate.
- Testing Agent owns executable validation, dry runs, and validation evidence.
- Review Specialist may require stronger validation, but it does not replace Testing ownership of evidence.

## Specialist report focus

Report approval status, required fixes, scope concerns, modularity concerns, workflow-contract drift, testing gaps, and security concerns.
