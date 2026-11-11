---
name: cloudflare
description: Cloudflare Pages deployment, cache headers, routing, and PWA distribution.
---
# Cloudflare Pages Guidelines
- Build command: pnpm --filter @studyzz/web build, output: web/dist.
- Set headers: X-Robots-Tag: noindex, nofollow to keep platform stealth.
- Ensure sw.js has Cache-Control: no-cache, no-store, must-revalidate.
