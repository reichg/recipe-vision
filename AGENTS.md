# Orchestrator-Only Copilot Agent Team

You should select only **Orchestrator** from the Copilot custom-agent dropdown.

All other roles are internal specialists. The Orchestrator must delegate work to them by creating structured work orders and then incorporating their output into the final plan, implementation, validation, and review.

`README.md` covers general usage and document ownership. `DELEGATION_PROTOCOL.md` contains the detailed routing and completion rules. `AGENTS.md` summarizes the current team structure and the standard work-order and specialist-report formats, while `.github/agents/*.agent.md` contains the exact agent definitions.

## Repository context

Recipe Vision Parser is a thin-API Next.js application that turns one or many recipe images into structured recipes. Users upload recipe images to S3, OCR extracts text, Gemini builds structured recipe data, Prisma stores it in PostgreSQL, and the UI renders saved recipes.

Core features:

- Upload one or many recipe images
- View structured recipes on the website
- Search recipes
- Filter recipes
- Get a random recipe

## Stack

- Package manager: pnpm
- Runtime: Thin Next.js App Router API routes, TypeScript, Prisma, PostgreSQL, AWS S3, React, CSS Modules
- AI/processing: OCR, Gemini
- Validation: Zod
- Testing: Vitest

## Universal engineering rules

1. Use pnpm.
2. Make the smallest safe change.
3. Keep changes modular, clean, and reviewable.
4. Do not add clutter.
5. Do not perform unrelated refactors.
6. Use TypeScript strictly.
7. Use Zod at trust boundaries, including uploads and external OCR/Gemini payloads.
8. Keep API routes thin.
9. Keep backend business logic, including S3 upload, OCR/Gemini orchestration, and recipe-query flows, in service modules.
10. Keep presentational UI separate from frontend API/data logic.
11. Add or update Vitest coverage when behavior changes.
12. Do not weaken validation, authorization, error handling, or tests.
13. Do not expose secrets, tokens, raw database errors, stack traces, or sensitive fields.
14. Add comments only for non-obvious behavior.
15. Always summarize changed files, validation performed, and remaining risks.
16. Keep workflow-contract files, agent rosters, routing rules, and template sections in sync when the agent system changes.

## Orchestrator delegation model

For every non-trivial task, the Orchestrator must follow `DELEGATION_PROTOCOL.md`. At a high level, that means:

1. Create a plan.
2. Create specialist work orders.
3. Delegate to the relevant hidden specialists when supported, or apply the matching skill files when programmatic delegation is unavailable.
4. Require each specialist to return a short specialist report and resolve conflicts between specialists.
5. Send behavior changes through Testing Agent.
6. Send final output through Review Agent.
7. Produce the final user-facing summary.

## Workflow-contract files

Treat these files as workflow-contract files rather than ordinary docs:

- `AGENTS.md`
- `DELEGATION_PROTOCOL.md`
- `.github/template.md`
- `.github/copilot-instructions.md`
- `.github/agents/*.agent.md`
- `.github/skills/*/SKILL.md`
- `.github/instructions/*.instructions.md`

Changes here should route through Architecture Agent, Testing Agent, and Review Agent.

## Internal specialists

- Architecture Agent
- Auth and Auth Agent (Authentication Authorization Agent)
- API Agent (Backend API Agent)
- Backend Services Agent
- Backend Security Agent
- Frontend UI Agent
- Frontend API and Logic Agent
- Frontend Security Agent
- Platform Tooling Agent
- Documentation Agent
- Quality Agent
- Telemetry Agent
- Testing Agent
- Review Agent

## Standard specialist work order

```md
## Specialist Work Order

Specialist:
Task:
Relevant files/areas:
Inputs:
Constraints:
Expected output:
Validation required:
Security considerations:
Handoff target after completion:
```

## Standard specialist report

```md
## Specialist Report

Specialist:
Status:
Files/areas inspected:
Files/areas changed:
Decisions:
Validation performed:
Risks:
Recommended next handoff:
```

## Final Orchestrator summary

```md
## Final Summary

### Goal

...

### Specialist work performed

| Specialist | Status | Contribution |
| ---------- | ------ | ------------ |

### Files changed

- ...

### Validation

- ...

### Review result

...

### Risks / follow-ups

- ...
```
