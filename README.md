# Recipe Vision Parser

Recipe Vision Parser turns recipe photos into structured recipes you can search, review, and keep. The current product flow is grouped upload to S3, batch extraction with OCR and an env-driven LLM roster, PostgreSQL persistence through Prisma, and a web UI for browsing saved recipes.

This README is the root guide for local setup, day-to-day development, and the current application surface. It focuses on what exists in this repository today.

## What The App Does

- Queue one or more images per recipe on `/upload`
- Store grouped source images in AWS S3
- Run OCR and structured extraction from `/batch-process`
- Save parsed recipes in PostgreSQL through Prisma
- Browse, search, inspect, and delete saved recipes from `/recipes`

## Current Workflow

1. Upload grouped recipe photos from the Upload page.
2. Start a batch extraction run from the Batch Process page.
3. The app reads source images from S3, runs OCR, sends the text through the configured LLM candidates, and persists structured recipes.
4. Review results from the Recipes list and recipe detail pages.

```mermaid
flowchart LR
  A[Upload page or POST /api/upload] --> B[S3 grouped image storage]
  B --> C[Batch Process page or POST /api/batch-process]
  C --> D[OCR.Space]
  D --> E[LLM candidate rotation]
  E --> F[Prisma and PostgreSQL]
  F --> G[Recipes UI]
```

## Architecture

- `src/app/(pages)` contains the user-facing pages: home, upload, batch process, recipes list, and recipe detail.
- `src/app/components` contains shared UI pieces such as the navigation shell and database health indicator.
- `src/app/api` contains thin route handlers that parse requests and map responses.
- `src/server/service` contains upload orchestration, batch processing, recipe persistence, and validation helpers.
- `src/server/ai` contains OCR and LLM integrations.
- `src/server/config` contains environment parsing.
- `src/server/db` contains Prisma and database readiness helpers.
- `src/schemas` contains shared Zod schemas and request limits.
- `prisma/schema.prisma` defines the persisted `Recipe` model.

The main UI flow is upload first, then batch extraction. `POST /api/recipes` still exists as a direct programmatic parse route, but it is not the primary user-facing workflow.

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Prisma 7 and PostgreSQL
- AWS S3
- OCR.Space
- Gemini, Mistral, Groq, OpenRouter, and Cerebras
- Zod
- Vitest
- CSS Modules

## Quick Start

### Prerequisites

- Node.js and pnpm installed locally
- PostgreSQL, either local or via Docker Compose
- An AWS S3 bucket for source images
- One OCR.Space API key
- At least one LLM provider API key: Gemini, Mistral, Groq, OpenRouter, or Cerebras

### 1. Install dependencies

```bash
pnpm install
```

### 2. Create a local `.env`

Create a root `.env` file. `prisma.config.ts` loads it for Prisma commands, and Next.js will also use it during local development. Keep this file uncommitted.

```env
# Docker Compose only
POSTGRES_USER="postgres"
POSTGRES_PASSWORD="postgres"

# Required application settings
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/recipes"
OCRSPACE_API_KEY="your-ocr-space-api-key"
GEMINI_API_KEY="your-provider-api-key"
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="your-aws-access-key-id"
AWS_SECRET_ACCESS_KEY="your-aws-secret-access-key"
AWS_S3_BUCKET="your-s3-bucket"

# Common optional overrides
MAX_UPLOAD_IMAGE_SIZE_BYTES="5242880"
GEMINI_MODEL="gemini-2.5-pro"
GEMINI_FALLBACK_MODELS="gemini-2.5-flash-lite,gemini-2.5-flash"
GEMINI_TIMEOUT_MS="30000"
OCR_MAX_FILE_SIZE_BYTES="1048576"
OCRSPACE_DAILY_LIMIT="500"
OCRSPACE_HOURLY_LIMIT="180"
OCR_TIMEOUT_MS="30000"
S3_UNPROCESSED_PREFIX="images/un-processed/"
S3_PROCESSED_PREFIX="images/processed/"
S3_SIGNED_URL_TTL_SECONDS="3600"
```

If you prefer a provider other than Gemini, replace `GEMINI_API_KEY` with the matching provider key from the environment reference below. The app requires OCR plus at least one configured LLM provider.

### 3. Start PostgreSQL

Use an existing local database, or start the repo's Compose service:

```bash
docker compose up -d recipe-db
```

The Compose file uses `POSTGRES_USER` and `POSTGRES_PASSWORD` from your local environment file and creates a database named `recipes`.

### 4. Run Prisma migrations

```bash
pnpm prisma migrate dev
```

If you ever need to regenerate the client manually:

```bash
pnpm prisma generate
```

### 5. Start the development server

```bash
pnpm dev
```

### 6. Open the app

Visit `http://localhost:3000`.

## Environment Reference

Security notes:

- Keep `DATABASE_URL`, AWS credentials, OCR keys, and LLM provider keys in local server-only env files.
- Never commit secrets, paste them into issues, or expose them through `NEXT_PUBLIC_` variables.
- Use AWS credentials scoped only to the configured bucket and required object operations.
- Providers without API keys are skipped. At least one LLM provider key must be configured.

### Database And Local Compose

| Variable            | Required            | Default | Notes                                                             |
| ------------------- | ------------------- | ------- | ----------------------------------------------------------------- |
| `DATABASE_URL`      | Yes                 | None    | PostgreSQL connection string used by both the app and Prisma CLI. |
| `POSTGRES_USER`     | Docker Compose only | None    | Used by `docker compose` for the local database container.        |
| `POSTGRES_PASSWORD` | Docker Compose only | None    | Used by `docker compose` for the local database container.        |

### Upload And OCR

| Variable                      | Required | Default   | Notes                                                                                  |
| ----------------------------- | -------- | --------- | -------------------------------------------------------------------------------------- |
| `MAX_UPLOAD_IMAGE_SIZE_BYTES` | No       | `5242880` | Raw upload size limit in bytes. Default is 5 MiB.                                      |
| `OCR_MAX_FILE_SIZE_BYTES`     | No       | `1048576` | OCR preprocessing size limit in bytes after conversion and resizing. Default is 1 MiB. |
| `OCRSPACE_API_KEY`            | Yes      | None      | OCR.Space API key.                                                                     |
| `OCRSPACE_DAILY_LIMIT`        | No       | `500`     | Daily OCR quota used by the app's validation and telemetry.                            |
| `OCRSPACE_HOURLY_LIMIT`       | No       | `180`     | Hourly OCR quota used by the app's validation and telemetry.                           |
| `OCR_TIMEOUT_MS`              | No       | `30000`   | OCR request timeout in milliseconds.                                                   |

### LLM Providers

| Variable                 | Required                  | Default                                                                                                           | Notes                                                                                             |
| ------------------------ | ------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `GEMINI_API_KEY`         | One provider key required | None                                                                                                              | Enables Gemini candidates.                                                                        |
| `GEMINI_MODEL`           | No                        | `gemini-2.5-pro`                                                                                                  | Primary Gemini model.                                                                             |
| `GEMINI_FALLBACK_MODELS` | No                        | Empty string                                                                                                      | Additional comma-separated Gemini models appended after `GEMINI_MODEL`.                           |
| `GEMINI_TIMEOUT_MS`      | No                        | `30000`                                                                                                           | Timeout per provider attempt. The current implementation applies this to every LLM provider call. |
| `MISTRAL_API_KEY`        | One provider key required | None                                                                                                              | Enables Mistral candidates when present.                                                          |
| `MISTRAL_MODELS`         | No                        | `mistral-small-latest,ministral-8b-latest,open-mistral-nemo`                                                      | Comma-separated Mistral models.                                                                   |
| `GROQ_API_KEY`           | One provider key required | None                                                                                                              | Enables Groq candidates when present.                                                             |
| `GROQ_MODELS`            | No                        | `llama-3.3-70b-versatile,qwen/qwen3-32b,llama-3.1-8b-instant`                                                     | Comma-separated Groq models.                                                                      |
| `OPENROUTER_API_KEY`     | One provider key required | None                                                                                                              | Enables OpenRouter candidates when present.                                                       |
| `OPENROUTER_MODELS`      | No                        | `google/gemma-3-27b-it:free,meta-llama/llama-3.3-70b-instruct:free,mistralai/mistral-small-3.1-24b-instruct:free` | Comma-separated OpenRouter models.                                                                |
| `CEREBRAS_API_KEY`       | One provider key required | None                                                                                                              | Enables Cerebras candidates when present.                                                         |
| `CEREBRAS_MODELS`        | No                        | `qwen-3-32b,llama-3.3-70b`                                                                                        | Comma-separated Cerebras models.                                                                  |

The app builds an ordered candidate roster from the configured provider and model env vars. Providers without keys are skipped. Rate-limited providers are placed on cooldown and later candidates are attempted when available. Recoverable provider failures can also fall through to later candidates.

### S3

| Variable                    | Required | Default                | Notes                                                                                                              |
| --------------------------- | -------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `AWS_REGION`                | Yes      | None                   | AWS region for S3 operations.                                                                                      |
| `AWS_ACCESS_KEY_ID`         | Yes      | None                   | AWS access key for server-side S3 access.                                                                          |
| `AWS_SECRET_ACCESS_KEY`     | Yes      | None                   | AWS secret key for server-side S3 access.                                                                          |
| `AWS_S3_BUCKET`             | Yes      | None                   | Bucket used for grouped recipe image uploads.                                                                      |
| `S3_UNPROCESSED_PREFIX`     | No       | `images/un-processed/` | Default prefix for queued source image groups. The current Batch Process page is wired to this default queue path. |
| `S3_PROCESSED_PREFIX`       | No       | `images/processed/`    | Reserved env setting. The current batch flow does not move completed images here.                                  |
| `S3_SIGNED_URL_TTL_SECONDS` | No       | `3600`                 | Signed URL lifetime in seconds. Maximum allowed value is 3600.                                                     |

## Validation Limits

- Grouped uploads allow up to `10` recipe groups per request.
- Batch extraction allows up to `10` recipe groups per run.
- Supported upload types are GIF, JPEG, JPG, PNG, and WEBP.
- Empty uploads are rejected.
- Every uploaded image must belong to exactly one recipe group when using the grouped upload manifest.
- Search queries are normalized and capped at `120` characters.
- S3 object keys and prefixes must be relative bucket paths with no leading slash, backslashes, or `..` segments.

## Daily Development Commands

| Command                   | Purpose                                                                      |
| ------------------------- | ---------------------------------------------------------------------------- |
| `pnpm dev`                | Start the development server on port 3000.                                   |
| `pnpm build`              | Create a production build. Runs `pnpm prisma generate` first via `prebuild`. |
| `pnpm start`              | Start the production server.                                                 |
| `pnpm lint`               | Run ESLint across the repo.                                                  |
| `pnpm lint:fix`           | Run ESLint with autofixes.                                                   |
| `pnpm typecheck`          | Run the TypeScript compiler with `--noEmit`.                                 |
| `pnpm test`               | Run the Vitest suite.                                                        |
| `pnpm prisma migrate dev` | Apply local migrations and update the database schema.                       |
| `pnpm prisma generate`    | Regenerate the Prisma client manually when needed.                           |

## Using The App

### Upload grouped recipe photos

- Open `/upload`.
- Build one card per recipe group.
- Each group can contain one or more images.
- Uploading stores grouped images in S3 but does not run extraction yet.

### Run batch extraction

- Open `/batch-process`.
- The page loads a summary of pending recipe groups before starting a run.
- Start extraction for some or all queued groups, up to the current batch limit.
- The batch API streams newline-delimited JSON progress events while the run is active.
- Successful runs save recipes and then attempt to remove completed source images from the active queue. If cleanup fails, the run can still complete with a warning.

### Browse and manage recipes

- Open `/recipes` to load the saved archive.
- Search across titles, ingredients, tags, and instructions.
- Delete one recipe or many selected recipes.
- Open `/recipes/[id]` to review ingredients, instructions, tags, allergens, and timing data.

### Monitor database readiness

- The shared app shell includes a database health indicator.
- `GET /api/health` returns JSON readiness information that backs the indicator.

## API Surface Summary

| Method   | Path                 | Purpose                                               | Notes                                                                                                                                                                 |
| -------- | -------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST`   | `/api/upload`        | Upload one or more image files to S3.                 | Accepts `image` or `images` form fields. Grouped uploads use an `uploadGroups` JSON manifest.                                                                         |
| `GET`    | `/api/batch-process` | Return a summary of queued recipe groups.             | Response shape is `{ prefix, pendingRecipeCount, maxProcessLimit }`.                                                                                                  |
| `POST`   | `/api/batch-process` | Start batch OCR and extraction.                       | Request body is `{ prefix?, limit? }`. Response is `application/x-ndjson` with `total`, `progress`, and `result` lines, plus stream-level `error` objects on failure. |
| `GET`    | `/api/recipes`       | List saved recipes.                                   | Supports `page`, `limit`, and `query`. API default `limit` is `12`; the current UI requests `25`.                                                                     |
| `POST`   | `/api/recipes`       | Parse uploaded images directly into one saved recipe. | Secondary programmatic shortcut. Accepts multipart image uploads.                                                                                                     |
| `DELETE` | `/api/recipes`       | Delete multiple recipes.                              | Accepts JSON `{ ids: string[] }` with up to 100 unique IDs.                                                                                                           |
| `GET`    | `/api/recipes/[id]`  | Fetch one recipe.                                     | Returns `{ recipe }`.                                                                                                                                                 |
| `DELETE` | `/api/recipes/[id]`  | Delete one recipe.                                    | Returns a JSON delete result.                                                                                                                                         |
| `GET`    | `/api/view-image`    | Return a signed URL for an S3 object.                 | Query param is `key`. Response is `{ success, url }`. This is an API helper, not a dedicated page.                                                                    |
| `GET`    | `/api/health`        | Return database readiness.                            | Success is `{ status: "ok", db: "ready" }`. Unready state returns HTTP 503 with `{ status: "error", db: "starting" }`.                                                |

## Data Model And Validation Boundaries

### Recipe table

The Prisma model stored in `prisma/schema.prisma` is:

```prisma
model Recipe {
  id                  String   @id @default(cuid())
  title               String
  sourceImageGroupKey String?  @unique
  json                Json
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
}
```

`sourceImageGroupKey` lets the batch flow detect and reuse an existing recipe for an already-processed image group.

### Zod boundaries

- `src/schemas/recipeSchema.ts` defines the structured recipe payload shape.
- `src/schemas/uploadGroupSchema.ts` defines grouped upload manifests and the 10-group limit.
- `src/schemas/recipeBatchSchema.ts` defines the batch LLM response envelope and the 10-recipe cap.
- `src/server/service/recipes-validation.ts` defines recipe list and delete request validation.
- `src/server/service/batch-processing-validation.ts` defines batch summary and run validation.
- `src/server/service/s3-validation.ts` defines upload file validation and safe S3 key rules.

## Repository Layout

- `src/app/(pages)` contains the user-facing pages.
- `src/app/components` contains shared presentational components.
- `src/app/api` contains route handlers.
- `src/server/ai` contains OCR and LLM integrations.
- `src/server/service` contains backend orchestration and validation helpers.
- `src/server/config` contains env parsing.
- `src/server/db` contains Prisma and health helpers.
- `src/schemas` contains shared Zod schemas.
- `src/lib` contains shared utilities such as logging.
- `prisma` contains the schema and migrations.
- `generated/prisma` contains the generated Prisma client.
- `public` contains static assets.

## Troubleshooting

### The app says the service is not configured

- Check `DATABASE_URL`, `OCRSPACE_API_KEY`, AWS credentials, and at least one LLM provider key.
- Confirm the variables are in a local `.env` file that Prisma and Next.js can read.
- Check server logs first. Do not paste full secrets, connection strings, or signed URLs into logs, tickets, or screenshots.

### Docker Compose database startup fails

- Make sure `POSTGRES_USER` and `POSTGRES_PASSWORD` are defined before running `docker compose up`.
- Confirm `DATABASE_URL` points to `localhost:5432/recipes` if you use the provided Compose service.

### Uploads are rejected

- Confirm the file type is GIF, JPEG, JPG, PNG, or WEBP.
- Confirm the file is not empty.
- Confirm the file is within `MAX_UPLOAD_IMAGE_SIZE_BYTES`. The default is 5 MiB.

### The batch page shows no queued recipe groups

- Confirm the upload step completed successfully.
- Confirm the images were written under `S3_UNPROCESSED_PREFIX`.
- The current Batch Process page is wired to `images/un-processed/`. If you changed the queue prefix in server config, the page will not automatically follow that custom value.

### OCR or extraction fails intermittently

- Check provider quotas, rate limits, and timeout settings.
- OCR and LLM providers can fail independently.
- Rate-limited LLM providers enter cooldown and later candidates may be attempted automatically.

### Prisma and the generated client are out of sync

```bash
pnpm prisma migrate dev
pnpm prisma generate
```

test change 2

## Contributing

This is an internal project. Keep documentation, API claims, and environment guidance aligned with the current repository state.

## License

This project is private and proprietary.
