---
name: code-review
description: Comprehensive code review standards for Studyzz monorepo focusing on Clean Code, TypeScript Strictness, Edge runtime safety, and security.
---
# Code Review Standards (Studyzz)
- Enforce TypeScript Strict Mode (no ny, no loose casts).
- Guarantee zero Node-only packages (s, path, legacy crypto) in @studyzz/web.
- Enforce WebCrypto API (crypto.subtle) for PBKDF2 cryptography.
- Forbid !important in CSS; rely on design tokens (	okens.css).
- Ensure all automated tests (pnpm test) pass 100%.
