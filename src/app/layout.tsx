import type { Metadata } from 'next'
import { StyledComponentsRegistry } from '@/lib/registry'

export const metadata: Metadata = {
  title: 'TIP Intelligence Dashboard',
  description: 'SIEM Threat Monitoring',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
          body { background: #0d1117; color: #c9d1d9; }
        `}</style>
      </head>
      <body>
        <StyledComponentsRegistry>{children}</StyledComponentsRegistry>
      </body>
    </html>
  )
}
