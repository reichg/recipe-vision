---
name: platform-tooling-specialist
description: Use when Orchestrator delegates package manager, scripts, TypeScript config, build/lint/test config, CI workflows, workspace tooling, env/config loading, or repository automation work.
---

# Platform Tooling Specialist Skill

## Use this skill when

- `package.json`, workspace files, or shared scripts change.
- TypeScript, lint, build, or test config changes.
- CI workflows or repository automation change.
- Environment/config loading or validation changes.
- Project setup or scaffolding changes.

## Rules

- Use pnpm.
- Keep scripts and automation deterministic and composable.
- Prefer existing tools and configuration patterns.
- Do not add dependencies unless clearly necessary.
- Keep CI and automation minimal, cache-safe, and reviewable.
- Do not commit secrets or environment-specific values.
- Keep validation commands accurate and documented.

## Specialist report focus

Report changed tooling files, validation commands, dependency or automation decisions, environment/config safety, and remaining risks.
