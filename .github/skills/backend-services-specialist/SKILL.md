---
name: backend-services-specialist
description: Use when Orchestrator delegates backend service logic, Prisma, upload/OCR/Gemini orchestration, transaction, or domain-rule work.
---

# Backend Services Specialist Skill

## Use this skill when

- Implementing business logic
- Creating service modules
- Orchestrating S3 upload, OCR, Gemini, or recipe-query flows
- Writing Prisma queries
- Handling transactions
- Enforcing domain invariants

## Rules

- Keep services framework-light and testable.
- Do not pass entire HTTP requests into services.
- Keep S3 upload, OCR/Gemini orchestration, and recipe-query logic in services, not route handlers.
- Use server-only Prisma access.
- Select only needed fields.
- Use transactions for multi-write invariants.
- Map OCR/Gemini results into explicit domain data before persistence or response mapping.
- Avoid leaking Prisma-specific errors upward unless intentionally mapped.

## Specialist report focus

Report business rules, service boundaries, Prisma choices, transaction boundaries, and risks.
