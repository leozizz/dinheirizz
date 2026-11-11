---
name: security-audit
description: Security verification for Studyzz, auditing authentication cookies, RBAC, stealth headers, and secret management.
---
# Security Audit Guidelines
- Audit RBAC endpoints for admin vs student permissions.
- Validate studyzz_session cookies: HttpOnly, SameSite=Lax, Secure.
- Ensure zero secrets or .env files are tracked in git.
- Audit Telegram MTProto and Supabase credentials safety in repouso.
