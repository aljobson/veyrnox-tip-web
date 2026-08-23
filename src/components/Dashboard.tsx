'use client'

import { useState } from 'react'
import styled from 'styled-components'
import { tipTheme } from '@/components/design-system/theme'
import { StatCard } from '@/components/design-system/StatCard'

const Container = styled.div`
  min-height: 100vh;
  background: ${tipTheme.colors.surface_0};
  color: ${tipTheme.colors.text_primary};
`

const Header = styled.header`
  background: ${tipTheme.colors.surface_1};
  border-bottom: 1px solid ${tipTheme.colors.border_primary};
  padding: ${tipTheme.spacing.lg};
  position: sticky;
  top: 0;
  z-index: 100;
`

const Nav = styled.nav`
  display: flex;
  gap: ${tipTheme.spacing.md};
  margin-bottom: ${tipTheme.spacing.md};
  border-bottom: 1px solid ${tipTheme.colors.border_secondary};
  padding-bottom: ${tipTheme.spacing.md};
`

const NavLink = styled.a<{ $active?: boolean }>`
  color: ${props => props.$active ? tipTheme.colors.accent_primary : tipTheme.colors.text_secondary};
  text-decoration: none;
  font-weight: 500;
  padding-bottom: ${tipTheme.spacing.xs};
  border-bottom: 2px solid ${props => props.$active ? tipTheme.colors.accent_primary : 'transparent'};
  transition: all ${tipTheme.transitions.fast};
  cursor: pointer;

  &:hover {
    color: ${tipTheme.colors.accent_secondary};
  }
`

const Title = styled.h1`
  font-size: 28px;
  font-weight: 600;
  margin-bottom: ${tipTheme.spacing.xs};
`

const Subtitle = styled.p`
  font-size: 14px;
  color: ${tipTheme.colors.text_secondary};
`

const AuthSection = styled.div`
  display: flex;
  gap: ${tipTheme.spacing.sm};
  margin-top: ${tipTheme.spacing.md};
  flex-wrap: wrap;
  align-items: center;
`

const Button = styled.button`
  background: ${tipTheme.colors.accent_primary};
  color: ${tipTheme.colors.surface_0};
  border: none;
  padding: ${tipTheme.spacing.xs} ${tipTheme.spacing.md};
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  transition: all ${tipTheme.transitions.fast};

  &:hover { background: ${tipTheme.colors.accent_secondary}; }
  &:active { transform: scale(0.98); }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`

const ValidationMsg = styled.span`
  color: ${tipTheme.colors.block};
  font-size: 12px;
`

const Content = styled.main`
  padding: ${tipTheme.spacing.lg};
  max-width: 1400px;
  margin: 0 auto;
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: ${tipTheme.spacing.lg};
  margin-bottom: ${tipTheme.spacing.xl};
`

const Section = styled.section`
  margin-bottom: ${tipTheme.spacing.xl};
`

const SectionTitle = styled.h2`
  font-size: 18px;
  font-weight: 600;
  margin-bottom: ${tipTheme.spacing.md};
  color: ${tipTheme.colors.text_primary};
`

const StatusBadge = styled.span<{ $status: 'connected' | 'disconnected' }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  background: ${props => props.$status === 'connected'
    ? 'rgba(63, 185, 80, 0.15)'
    : 'rgba(139, 148, 158, 0.15)'};
  color: ${props => props.$status === 'connected'
    ? tipTheme.colors.allow
    : tipTheme.colors.text_secondary};
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;

  &::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
  }
`

const PLACEHOLDER = '—'

export function Dashboard() {
  // R7 low: dashboard used to show an "API Key" input that was discarded on
  // Connect — proxy signs with the server-held TIP_API_KEY regardless. That
  // misled operators into believing they were entering credentials and left
  // typed secrets sitting in React state. Removed until the /api/connect
  // HttpOnly-cookie exchange route (tracked in issue #9) ships.
  const [isConnected, setIsConnected] = useState(false)
  const [validationError] = useState('')

  const handleConnect = () => {
    setIsConnected(true)
  }

  return (
    <Container>
      <Header>
        <Nav>
          <NavLink $active href="/">SIEM</NavLink>
          <NavLink href="/agents">Agents</NavLink>
          <NavLink href="/sim">Simulator</NavLink>
        </Nav>

        <Title>TIP Intelligence Dashboard</Title>
        <Subtitle>SIEM Threat Monitoring · Veyrnox</Subtitle>

        <AuthSection>
          <Button onClick={handleConnect} disabled={isConnected}>
            {isConnected ? 'Connected' : 'Connect'}
          </Button>
          <StatusBadge $status={isConnected ? 'connected' : 'disconnected'}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </StatusBadge>
          {validationError && <ValidationMsg role="alert">{validationError}</ValidationMsg>}
        </AuthSection>
      </Header>

      <Content>
        {isConnected ? (
          <>
            <Section>
              <SectionTitle>Verdict Summary (24h)</SectionTitle>
              <Grid>
                <StatCard label="Allow (24h)" value={PLACEHOLDER} meta={`7d: ${PLACEHOLDER} · 30d: ${PLACEHOLDER}`} severity="allow" />
                <StatCard label="Warn (24h)" value={PLACEHOLDER} meta={`7d: ${PLACEHOLDER} · 30d: ${PLACEHOLDER}`} severity="warn" />
                <StatCard label="Block (24h)" value={PLACEHOLDER} meta={`7d: ${PLACEHOLDER} · 30d: ${PLACEHOLDER}`} severity="block" />
                <StatCard label="Total Verdicts" value={PLACEHOLDER} meta="24h screening activity" />
              </Grid>
            </Section>

            <Section>
              <SectionTitle>Verdict Timeline (24h)</SectionTitle>
              <div style={{
                background: tipTheme.colors.surface_2,
                border: `1px solid ${tipTheme.colors.border_primary}`,
                borderRadius: tipTheme.radius,
                padding: tipTheme.spacing.lg,
                height: '300px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: tipTheme.colors.text_secondary,
              }}>
                Chart coming soon
              </div>
            </Section>

            <Section>
              <SectionTitle>Recent Screening Activity</SectionTitle>
              <div style={{
                background: tipTheme.colors.surface_2,
                border: `1px solid ${tipTheme.colors.border_primary}`,
                borderRadius: tipTheme.radius,
                padding: tipTheme.spacing.lg,
              }}>
                No recent activity
              </div>
            </Section>
          </>
        ) : (
          <div style={{
            textAlign: 'center',
            padding: tipTheme.spacing.xl,
            color: tipTheme.colors.text_secondary,
          }}>
            <p>Authenticate to view screening telemetry</p>
          </div>
        )}
      </Content>
    </Container>
  )
}
