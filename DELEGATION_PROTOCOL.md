# Strict Delegation Protocol

This repository uses Orchestrator-only Copilot agent selection.

The user manually selects only **Orchestrator**. The Orchestrator is responsible for deciding which internal specialists are required and invoking them or applying their skill instructions.

## Repository context

Recipe Vision Parser uses thin Next.js API routes with TypeScript, Prisma, PostgreSQL, AWS S3, React, CSS Modules, OCR, and Gemini.

Users upload one or many recipe images to S3, the app extracts text with OCR, uses Gemini to create structured recipes, stores them via Prisma/PostgreSQL, and renders them in the website.

Core browse flows include search, filtering, and random recipe discovery.

## Workflow-contract files

Treat these files as workflow-contract files because they change how the agent system behaves:

- `AGENTS.md`
- `DELEGATION_PROTOCOL.md`
- `.github/template.md`
- `.github/copilot-instructions.md`
- `.github/agents/*.agent.md`
- `.github/skills/*/SKILL.md`
- `.github/instructions/*.instructions.md`

## How invocation is enforced

The Orchestrator profile contains:

1. Explicit `agent` tool access.
2. A mandatory routing matrix.
3. Fail-closed rules.
4. Required specialist work orders.
5. Required specialist reports.
6. A final Review Agent gate.

## Required routing

| Work type                                                                                                                                                     | Specialist                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Structure, modules, shared contracts, thin-API/service boundaries, or S3/OCR/Gemini/Prisma pipeline ownership                                                 | Architecture Agent                                       |
| Authentication, authorization, identity, session handling, permissions, or roles                                                                              | Auth and Auth Agent (Authentication Authorization Agent) |
| API routes, upload/search/filter/random recipe contracts, Zod API validation, or HTTP semantics                                                               | API Agent (Backend API Agent)                            |
| Business logic, Prisma, transactions, S3 upload orchestration, OCR/Gemini processing, or recipe query behavior                                                | Backend Services Agent & Quality Agent                   |
| Backend validation, safe-error behavior, uploads, external storage/AI-provider boundaries, secrets, sensitive data, or backend auth/authorization enforcement | Backend Security Agent & Auth and Auth Agent             |
| React UI, CSS Modules, accessibility, or recipe-browsing surfaces                                                                                             | Frontend UI Agent                                        |
| Frontend fetch, hooks, forms, upload/search/filter/random state, or data handling                                                                             | Frontend API and Logic Agent & Quality Agent             |
| XSS, browser storage, signed upload URLs, redirects, or client exposure                                                                                       | Frontend Security Agent                                  |
| Package manager, scripts, tsconfig, build/lint/test config, CI workflows, workspace tooling, env/config loading, repo scaffolding                             | Platform Tooling Agent                                   |
| Telemetry, observability providers, logs, metrics, traces, analytics events, dashboards, alerting, sampling, correlation IDs, or telemetry schemas            | Telemetry Agent                                          |
| Documentation, onboarding, README, reference docs, runbooks, templates, examples, or migration notes                                                          | Documentation Agent                                      |
| Workflow-contract files                                                                                                                                       | Architecture Agent, Testing Agent, and Review Agent      |
| Behavior changes and regressions                                                                                                                              | Testing Agent                                            |
| All code changes                                                                                                                                              | Review Agent                                             |

## Boundary clarification rules

- Architecture Agent owns file placement, module boundaries, dependency direction, and ownership of exported or shared contracts. Quality Agent reviews correctness, maintainability, duplication, and extraction quality inside that chosen structure, but does not own structural placement decisions.
- API Agent owns upload and recipe-query route contracts plus Zod validation and HTTP semantics. Backend Services Agent owns S3 upload orchestration, OCR/Gemini processing, recipe persistence, and search/filter/random query behavior behind those routes.
- Auth and Auth Agent owns identity, session, role, permission, and authorization-policy semantics. Backend Security Agent owns backend trust-boundary hardening, untrusted-input validation, upload/storage/provider safety, secret handling, safe errors, sensitive-data exposure review, and secure enforcement of those auth decisions.
- Testing Agent owns executable validation, dry runs, and scenario evidence. Review Agent owns the final quality gate and consumes Testing evidence rather than replacing it.
- Documentation Agent owns authoritative wording, examples, prerequisites, and document placement. Testing Agent verifies whether documented commands, examples, and dry-run steps have credible validation behind them.
- Telemetry Agent owns instrumentation intent, event, log, metric, and trace schemas, naming, correlation strategy, and sampling decisions. Backend Security Agent and Frontend Security Agent own leakage and exposure review, Platform Tooling Agent owns telemetry transport and configuration wiring, and Quality Agent owns extraction and reuse quality for telemetry-related constants and schemas rather than telemetry design itself.
- Thin API routes remain an invariant: route handlers validate inputs, delegate to services, and map results without absorbing S3/OCR/Gemini/query orchestration.

## Required artifacts

Every non-trivial task must include:

- an `Orchestrator Plan`;
- a `Delegation Routing` table;
- one `Specialist Work Order` for each invoked specialist;
- one `Specialist Report` for each invoked specialist;
- a validation record;
- a `Final Summary`.

## Completion requirements

A task is incomplete if:

- code changed without Review Agent;
- behavior changed without Testing Agent;
- backend service or Prisma changed without Quality Agent;
- frontend API or data-handling changes happened without Quality Agent;
- protected backend data changed without Backend Security Agent;
- user-controlled frontend rendering changed without Frontend Security Agent;
- API contract changed without API Agent;
- platform or tooling changed without Platform Tooling Agent;
- telemetry, observability, or instrumentation changed without Telemetry Agent;
- documentation, onboarding, or operational guidance changed without Documentation Agent;
- workflow-contract files changed without Architecture Agent, Testing Agent, and Review Agent;
- structural boundaries changed without Architecture Agent;
- a required routing, work-order, report, validation, or final-summary artifact is missing.

## Workflow-contract validation

When workflow-contract files change and no executable test exists, validation must still include:

1. routing coverage verification;
2. hidden-agent and skill parity verification;
3. template contract verification;
4. at least one documented scenario-based dry run, such as recipe-image upload to S3 -> OCR -> Gemini -> PostgreSQL persistence -> search/filter/random retrieval.

## Recommended user prompt

```md
Use Orchestrator. Before implementation, complete the Orchestrator Plan and Delegation Routing table. Invoke every required specialist or apply its skill file internally. Use the fixed output contract from `.github/template.md`, and do not finalize until Testing Agent and Review Agent have completed their gates.
```
