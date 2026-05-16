---
name: backend-security-specialist
description: Use when Orchestrator delegates backend trust-boundary hardening, upload/provider security, validation, secret handling, safe errors, or sensitive-data review.
---

# Backend Security Specialist Skill

## Use this skill when

- Protected backend data is read or mutated.
- Auth or authorization is involved.
- Sensitive fields may be exposed.
- S3 uploads, OCR/Gemini providers, or other external-service payloads are involved.
- Raw SQL, webhooks, redirects, uploads, callbacks, or external input are involved.
- Error handling changes.

## Rules

- Never trust client-provided user IDs, roles, ownership flags, or prices.
- Authorize on the server before protected reads/writes.
- Validate untrusted input with Zod or existing validation pattern.
- Treat S3 object metadata, OCR results, Gemini output, and provider callbacks as untrusted input until validated or explicitly mapped.
- Exclude sensitive fields by default.
- Do not expose raw Prisma/SQL errors or stack traces.
- Avoid raw SQL; if required, parameterize.

## Boundary with Authentication Authorization Agent

- Backend Security Specialist does not own identity, session, role, permission, or authorization-policy semantics.
- Authentication Authorization Agent owns those auth semantics and access-control rules.
- Backend Security Specialist owns backend enforcement hardening, validation, secret handling, safe errors, and sensitive output review for auth and non-auth backend flows.

## Specialist report focus

Report authn/authz checks, validation checks, data exposure review, secret handling, and error safety.
