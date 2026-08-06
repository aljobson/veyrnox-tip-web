# Veyrnox TIP Intelligence Dashboard Web

Frontend application for the Veyrnox TIP (Threat Intelligence Platform) dashboard.

## Stack

- **Framework:** Next.js 14
- **Styling:** Styled Components
- **Charts:** Recharts
- **Animation:** Motion
- **Deployment:** Cloudflare Pages

## Design System

Built with the **TIP-SENTINEL design system** for Microsoft Sentinel-themed aesthetics:
- Dark navy surfaces (#0d1117)
- Azure blue accents (#58a6ff)
- Severity-based colors (Allow/Warn/Block)
- WCAG AA accessibility compliance

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:3000 to view the dashboard.

## Environment Setup

Create `.env.local`:

```
NEXT_PUBLIC_TIP_API_ENDPOINT=https://api.tip.veyrnox.com
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
