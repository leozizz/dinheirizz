---
name: github-actions
description: GitHub Actions CI/CD pipeline automation for testing, typechecking, and SSH VPS deployment.
---
# GitHub Actions CI/CD Guidelines
- Workflow trigger: push to main.
- Jobs: Lint, Typecheck (pnpm -r typecheck), Test (pnpm test), SSH Deploy.
- Use GitHub Secrets for SSH private key, Oracle VPS IP, and Supabase keys.
