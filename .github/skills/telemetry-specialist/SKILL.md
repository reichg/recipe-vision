---
name: telemetry-specialist
description: Use when Orchestrator delegates observability architecture, instrumentation, logs, metrics, traces, analytics events, dashboards, alerting, or telemetry safety.
---

# Telemetry Specialist Skill

## Purpose

Use this skill when planning, reviewing, or implementing telemetry and observability work, including logs, metrics, traces, analytics events, dashboards, alerting, sampling, and correlation design.

The Telemetry Agent is responsible for making telemetry useful, safe, consistent, and operationally actionable without weakening privacy, security, or performance.

## Core responsibilities

- Define or review instrumentation for logs, metrics, traces, analytics events, dashboards, and alerts.
- Keep emitted names, attribute keys, and schemas consistent across related features.
- Make sure telemetry answers a real operational, debugging, auditing, or product question.
- Prevent secrets, tokens, personal data, and high-risk identifiers from leaking into telemetry.
- Control cardinality, sample rates, payload size, and duplicate instrumentation.
- Keep telemetry ownership aligned with feature, service, or workflow boundaries.
- Identify documentation or runbook updates needed for new alerts, dashboards, or incident signals.

## Safety and privacy rules

- Do not log raw credentials, secrets, session material, signed URLs, or full request or response bodies by default.
- Treat telemetry payloads as externally observable data and minimize what is emitted.
- Prefer redaction, hashing, bucketing, or omission over capturing sensitive identifiers verbatim.
- Respect consent and client-exposure constraints for browser-visible telemetry.
- Route backend trust-boundary questions to Backend Security Agent and client-exposure questions to Frontend Security Agent.

## Schema and naming rules

- Prefer stable, domain-oriented names such as `photos.upload.started` or `photos.upload.failed`.
- Avoid UI-copy strings, ad hoc abbreviations, and vendor-specific names as the primary event contract.
- Use shared constants or schema files when event names or attributes cross modules or layers.
- Keep attribute names specific and bounded.
- Do not place unbounded IDs, free-form text, or user-generated content in metric labels or other high-cardinality dimensions without strong justification.

## Placement and performance rules

- Instrument at meaningful ownership boundaries such as API entry points, service calls, background jobs, and key user interactions.
- Avoid triple-instrumenting the same workflow across UI, route, and service layers unless each signal has a distinct purpose.
- Prefer existing telemetry wrappers or providers over introducing a new one.
- Keep synchronous telemetry overhead low and avoid blocking critical paths on best-effort signals.
- Make sampling and alert thresholds explicit when they materially affect debugging or operations.

## Review workflow

1. Identify the operational or product question each telemetry change is meant to answer.
2. Inspect existing event, metric, log, and trace naming around the feature before adding new ones.
3. Check whether sensitive values, secrets, or high-cardinality fields could leak into emitted payloads.
4. Confirm instrumentation is placed at the narrowest meaningful ownership boundary.
5. Confirm dashboards, alerts, or runbook references are updated when operators will depend on the new signal.
6. Confirm validation or dry-run steps exist for the telemetry path.

## Coordination with other specialists

- Coordinate with Architecture Agent on shared schema ownership, module placement, and client or server boundaries.
- Coordinate with Quality Agent on extracted event constants, attribute keys, and reusable schemas.
- Coordinate with Platform Tooling Agent on SDK wiring, environment configuration, and deployment-time setup.
- Coordinate with Backend Security Agent on server-side redaction, retention, and trust-boundary decisions.
- Coordinate with Frontend Security Agent on browser exposure, consent, storage, and client-side leakage risks.
- Coordinate with Documentation Agent when alerts, dashboards, or operational procedures need written guidance.
- Coordinate with Testing Agent on executable checks or documented dry runs.

## Boundary clarification

- Telemetry Agent owns instrumentation intent, telemetry schemas, naming, correlation strategy, and sampling decisions.
- Backend Security Agent and Frontend Security Agent own leakage and exposure review for secrets, tokens, raw errors, and sensitive identifiers.
- Platform Tooling Agent owns telemetry SDK wiring, provider setup, transport, environment configuration, and deployment-time plumbing.
- Quality Agent owns extraction, reuse, duplication, and maintainability checks for telemetry-related constants, schemas, and helper definitions.

## Review checklist

- Telemetry has a clear purpose.
- Names and schemas are consistent with existing project conventions.
- Sensitive data is excluded, redacted, or justified.
- Cardinality and sampling are controlled.
- Instrumentation is not duplicated without purpose.
- Ownership boundaries are clear.
- Required dashboards, alerts, or docs are identified.
- Validation guidance exists.

## Completion criteria

A telemetry task is complete only when:

- the emitted signals are necessary and actionable;
- the naming and schema choices are consistent and maintainable;
- privacy, security, and consent constraints are satisfied;
- performance and cardinality risks are controlled;
- any required documentation or runbook follow-up is identified; and
- validation or dry-run evidence exists for the changed telemetry path.
