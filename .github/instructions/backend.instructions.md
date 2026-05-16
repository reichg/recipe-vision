---
applyTo: "app/api/**/*.ts,app/api/**/*.tsx,lib/server/**/*.ts,server/**/*.ts,prisma/**/*.prisma"
---

# Backend instructions

- Keep API route handlers thin.
- Put business logic in backend service modules.
- Keep S3 upload, OCR/Gemini orchestration, and recipe-query logic in backend service modules rather than route handlers.
- Use Zod for request, upload, and external input validation.
- Use Prisma only from server-side modules.
- Select only needed fields from the database.
- Do not expose raw Prisma errors or sensitive fields to clients.
- Treat S3 object metadata, OCR results, Gemini output, and other external provider payloads as untrusted inputs that require validation or explicit mapping.
- Use transactions for multi-write operations that must succeed or fail together.
- Validate Prisma schema changes with `pnpm prisma validate`.
