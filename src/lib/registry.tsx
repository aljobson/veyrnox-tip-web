'use client'

import { ReactNode } from 'react'
import { ServerStyleSheet, StyleSheetManager } from 'styled-components'

export function StyledComponentsRegistry({ children }: { children: ReactNode }) {
  return <StyleSheetManager>{children}</StyleSheetManager>
}
