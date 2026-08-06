'use client'

import styled from 'styled-components'
import { tipTheme } from './theme'

interface StatCardProps {
  label: string
  value: string | number
  meta?: string
  severity?: 'allow' | 'warn' | 'block'
}

const CardContainer = styled.div<{ $severity?: string }>`
  background: ${tipTheme.colors.surface_2};
  border: 1px solid ${tipTheme.colors.border_primary};
  border-left: 3px solid ${props => {
    if (props.$severity === 'allow') return tipTheme.colors.allow
    if (props.$severity === 'warn') return tipTheme.colors.warn
    if (props.$severity === 'block') return tipTheme.colors.block
    return tipTheme.colors.accent_primary
  }};
  border-radius: ${tipTheme.radius};
  padding: ${tipTheme.spacing.md};
  transition: all ${tipTheme.transitions.normal};
  cursor: pointer;

  &:hover {
    background: ${tipTheme.colors.surface_3};
    border-left-color: ${props => {
      if (props.$severity === 'allow') return tipTheme.colors.allow
      if (props.$severity === 'warn') return tipTheme.colors.warn
      if (props.$severity === 'block') return tipTheme.colors.block
      return tipTheme.colors.accent_secondary
    }};
  }
`

const Label = styled.div`
  font-size: 12px;
  color: ${tipTheme.colors.text_secondary};
  font-weight: 500;
  margin-bottom: ${tipTheme.spacing.xs};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`

const Value = styled.div`
  font-size: 32px;
  font-weight: 600;
  color: ${tipTheme.colors.text_primary};
  font-family: 'IBM Plex Mono', monospace;
  line-height: 1;
  margin-bottom: ${tipTheme.spacing.sm};
`

const Meta = styled.div`
  font-size: 12px;
  color: ${tipTheme.colors.text_tertiary};
  font-family: 'IBM Plex Mono', monospace;
`

export function StatCard({ label, value, meta, severity }: StatCardProps) {
  return (
    <CardContainer $severity={severity}>
      <Label>{label}</Label>
      <Value>{value}</Value>
      {meta && <Meta>{meta}</Meta>}
    </CardContainer>
  )
}
