# Veyrnox TIP Intelligence Dashboard Web

Frontend application for the Veyrnox TIP (Threat Intelligence Platform) dashboard.

## Stack

- **Framework:** Next.js 14
- **Styling:** Styled Components (with App Router SSR registry)
- **Deployment:** Cloudflare Pages via `@cloudflare/next-on-pages`

## Design System

Built with the **TIP-SENTINEL design system** for Microsoft Sentinel-themed aesthetics:
- Dark navy surfaces (#0d1117)
- Azure blue accents (#58a6ff)
- Severity-based colors (Allow/Warn/Block)
- WCAG AA accessibility compliance

## Quick Start

```bash
npm ci      # reproducible install from package-lock.json
npm run dev
```

Open http://localhost:3000 to view the dashboard.

## Environment Setup

Local dev — create `.env.local`:

```
TIP_API_ENDPOINT=https://api.tip.veyrnox.com
TIP_API_KEY=vtip_xxx
TIP_SIGNING_SECRET=xxx
```

These are **server-side only** — never prefix with `NEXT_PUBLIC_`. The browser
talks to `/api/tip-proxy/*`, which signs upstream requests using the secret.

## Cloudflare configuration

`account_id` is not committed. Set it in your shell:

```
export CLOUDFLARE_ACCOUNT_ID=...
```

Production secrets:

```
wrangler pages secret put TIP_API_KEY --project-name veyrnox-tip-web-prod
wrangler pages secret put TIP_SIGNING_SECRET --project-name veyrnox-tip-web-prod
wrangler pages secret put TIP_API_ENDPOINT --project-name veyrnox-tip-web-prod
```

## Building

```bash
npm run build
npm start
```

## Deployment

Deploy to Cloudflare Pages:

```bash
npm run deploy
```

## Project Structure

```
src/
  app/              # Next.js app directory (pages)
  components/
    design-system/  # TIP-SENTINEL design tokens & components
  hooks/            # React hooks for API calls
  lib/              # Utilities (registry, auth, etc)
```

## API Integration

Dashboard connects to the veyrnox-tip backend:
- Screening telemetry
- Verdict timeline
- IOC data
- Agent fleet status (agent dashboard)

See veyrnox-tip repository for backend APIs.
