---
name: architecture-specialist
description: Use when Orchestrator delegates module boundaries, file placement, dependency direction, shared type/schema strategy, thin-API/service boundaries, or cross-layer design.
---

# Architecture Specialist Skill

## Use this skill when

- New files/modules are needed.
- Shared types or schemas are proposed.
- Client/server boundaries may be affected.
- Cross-layer contracts change.
- Workflow-contract files change.
- A change risks creating circular dependencies or mega-files.

## Rules

- API routes depend on services/schemas, not the reverse.
- Backend services may depend on Prisma and server-only utilities.
- Client code must not import server-only modules.
- UI components should not know Prisma models directly.
- Thin API route handlers delegate S3 upload, OCR/Gemini processing, recipe persistence, and recipe-query behavior to services.
- S3 object metadata, OCR responses, Gemini output, and database-to-client DTOs need explicit ownership and boundary-safe contracts.
- Shared schemas/types must be intentional and safe to expose.
- Workflow-contract files should have clear ownership and minimal overlap.
- Avoid premature abstraction.

## Boundary with Quality Agent

- Architecture Specialist owns file placement, dependency direction, and ownership of exported or shared contracts.
- Quality Agent owns hygiene, duplication, extraction quality, and maintainability inside that chosen structure.

## Specialist report focus

Report recommended structure, dependency direction, workflow-contract ownership, files to create/change, rationale, and risks.
