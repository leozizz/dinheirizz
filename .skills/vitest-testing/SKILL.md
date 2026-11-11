---
name: vitest-testing
description: Vitest unit and integration testing patterns for React components, Hono routes, and services.
---
# Vitest Testing Patterns
- Write isolated unit tests using @testing-library/react.
- Mock external APIs (Telegram, Supabase) using vi.fn() and vi.mock().
- Guarantee regression coverage across web/, pi/, db/, scripts/.
- Ensure deterministic execution without timing race conditions.
