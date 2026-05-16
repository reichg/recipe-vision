# Repository instructions for GitHub Copilot

This repository uses an **Orchestrator-only** agent workflow.

The user should manually select only the **Orchestrator** custom agent. All other roles are internal specialists represented by hidden/programmatic agent profiles and project skills.

## Stack

- Package manager: pnpm
- Runtime: Thin Next.js App Router API routes, TypeScript, Prisma, PostgreSQL, AWS S3, React, CSS Modules
- AI/processing: OCR, Gemini
- Validation: Zod
- Testing: Vitest

## Application context

Recipe Vision Parser turns one or many recipe images into structured recipes. Users upload recipe images to S3, OCR extracts text, Gemini builds structured recipe data, Prisma stores it in PostgreSQL, and the UI renders saved recipes.

Core features:

- Upload one or many recipe images
- View structured recipes on the website
- Search recipes
- Filter recipes
- Get a random recipe

## Mandatory workflow

For any non-trivial request:

1. Orchestrator creates a plan.
2. Orchestrator creates specialist work orders.
3. Orchestrator delegates to hidden/programmatic specialists when supported.
4. If programmatic custom-agent invocation is unavailable, Orchestrator must apply the corresponding `.github/skills/**/SKILL.md` instructions as internal specialist roles.
5. Specialists return structured reports.
6. Testing Agent validates behavior changes and workflow-contract changes when no executable check exists.
7. Review Agent performs final gate.
8. Orchestrator summarizes final result.

## Engineering standards

- Use pnpm.
- Make minimal, focused changes.
- Preserve existing project patterns.
- Keep API routes thin.
- Keep backend business logic, including S3 upload, OCR/Gemini orchestration, and recipe-query flows, in service modules.
- Keep UI presentation separate from data fetching and transformation logic.
- Use Zod at API, form, env/config, upload, and external-data boundaries.
- Treat S3 object metadata, OCR results, Gemini output, and database-to-client payloads as explicit boundaries with validation or safe mapping.
- Use Prisma only from server-side modules.
- Use CSS Modules for styling.
- Add or update Vitest tests when behavior changes.
- Avoid broad refactors and unrelated formatting.
- Do not add dependencies unless clearly necessary.
- Never expose secrets, tokens, sensitive fields, raw database errors, or stack traces to clients.
- Use comments only where they clarify non-obvious behavior.
- Keep workflow-contract files, agent rosters, routing rules, and template sections in sync when the agent system changes.

## Preferred validation

Use existing package scripts first:

```bash
pnpm typecheck
pnpm lint
pnpm test
```

For Vitest directly:

```bash
pnpm vitest run
```

For Prisma changes:

```bash
pnpm prisma validate
pnpm prisma generate
```

For workflow-contract changes when no executable test exists:

- verify routing coverage in `DELEGATION_PROTOCOL.md`;
- verify hidden-agent and skill parity;
- verify `.github/template.md` still requires plan, routing, work orders, specialist reports, and final summary;
- document at least one scenario-based dry run.

Do not run destructive database commands or production-affecting commands unless explicitly requested.

## Strict Orchestrator delegation protocol

The Orchestrator must not start implementation on non-trivial tasks until it completes the Delegation Routing table.

Required routing rules:

- Architecture impact requires Architecture Agent, especially for thin-API/service boundaries and S3/OCR/Gemini/Prisma pipeline ownership.
- Authentication, authorization, identity, session handling, permissions, or roles impact requires Auth and Auth Agent.
- API impact requires API Agent, including upload, search, filtering, and random-recipe contracts.
- Backend service or Prisma impact requires Backend Services Agent and Quality Agent, including OCR/Gemini orchestration and recipe-query logic.
- Backend validation, safe-error behavior, uploads, external storage/AI-provider boundaries, secrets, sensitive data, or backend auth/authorization enforcement impact requires Backend Security Agent and Auth and Auth Agent.
- React markup, component, accessibility, CSS Module, or recipe-browsing UI impact requires Frontend UI Agent.
- Frontend API client, hook, form, search/filter/random state, or data transformation impact requires Frontend API and Logic Agent and Quality Agent.
- XSS, token, browser storage, signed upload URL, redirect, unsafe rendering, external link, or public env-var impact requires Frontend Security Agent.
- Package manager, scripts, tsconfig, build/lint/test config, CI workflows, workspace tooling, env/config loading, or repo scaffolding impact requires Platform Tooling Agent.
- Telemetry, observability, logs, metrics, traces, analytics events, dashboards, alerting, sampling, correlation IDs, or telemetry schema impact requires Telemetry Agent.
- Documentation, onboarding, README, reference docs, runbooks, templates, examples, or migration note impact requires Documentation Agent.
- Workflow-contract files require Architecture Agent, Testing Agent, and Review Agent.
- Any behavior change requires Testing Agent.
- Any code change requires Review Agent.

If a required specialist cannot be invoked programmatically, the Orchestrator must apply that specialist's skill file internally and produce a labeled Specialist Report.
