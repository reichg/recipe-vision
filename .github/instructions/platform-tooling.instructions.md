---
applyTo: "package.json,pnpm-lock.yaml,pnpm-workspace.yaml,tsconfig*.json,eslint.config.*,next.config.*,vitest.config.*,postcss.config.*,.github/workflows/**/*.yml,.github/workflows/**/*.yaml"
---

# Platform tooling instructions

- Use pnpm.
- Keep scripts deterministic, composable, and minimal.
- Prefer existing tooling and config patterns before adding new dependencies.
- Keep CI and automation reviewable, cache-safe, and aligned with local validation commands.
- Do not commit secrets, tokens, or machine-specific paths in config or workflows.
- Update setup or workflow documentation when user-facing tooling changes.
