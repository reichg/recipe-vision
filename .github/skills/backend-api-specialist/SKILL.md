---
name: backend-api-specialist
description: Use when Orchestrator delegates API route, upload/query contract, Zod validation, HTTP status, or response-contract work.
---

# Backend API Specialist Skill

## Use this skill when

- Creating or changing `app/api/**/route.ts`
- Changing upload, search/filter, or random-recipe endpoints
- Defining request or response contracts
- Adding Zod validation
- Mapping service results to HTTP responses
- Changing frontend-facing API shapes

## Rules

- Keep route handlers thin.
- Validate all untrusted input with Zod.
- Delegate business logic to backend services.
- Keep S3 upload, OCR/Gemini orchestration, and recipe-query logic out of route handlers.
- Return intentional response shapes.
- Use correct HTTP status codes.
- Do not return raw Prisma models when they contain internal or sensitive fields.
- Do not expose stack traces or raw internal errors.

## Specialist report focus

Report input validation, response contract, status codes, service handoffs, and changed API shapes.
