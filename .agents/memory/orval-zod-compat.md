---
name: Orval + Zod v3 UUID/email format compatibility
description: Using format:uuid or format:email on OpenAPI property schemas causes orval to emit zod.uuid()/zod.email() which are Zod v4 only — breaks typecheck on Zod v3 workspaces.
---

**Rule:** Never use `format: uuid` or `format: email` on **property** schemas in openapi.yaml when the workspace uses Zod v3 (pnpm-workspace.yaml catalog pins `zod: ~3.x`).

**Why:** Orval generates `zod.uuid()` / `zod.email()` standalone calls for those formats. In Zod v3, these don't exist (they're `z.string().uuid()` / `z.string().email()`). The build fails at `pnpm run typecheck:libs` with TS2339 errors after codegen.

**How to apply:** Strip `format: uuid` and `format: email` from all property schemas. Path parameter schemas (in `parameters`) are safe. Use `sed -i '/^\s*format: uuid$/d'` as a quick bulk fix.
