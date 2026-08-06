export const tipTheme = {
  colors: {
    // Surfaces
    surface_0: '#0d1117',
    surface_1: '#161b22',
    surface_2: '#1D222B',
    surface_3: '#262c36',
    surface_4: '#30363d',
    
    // Accents
    accent_primary: '#58a6ff',
    accent_secondary: '#79c0ff',
    accent_tertiary: '#a371f7',
    
    // Semantic
    allow: '#3fb950',
    warn: '#d29922',
    block: '#f85149',
    
    // Text
    text_primary: '#c9d1d9',
    text_secondary: '#8b949e',
    text_tertiary: '#6e7681',
    
    // Borders
    border_primary: '#30363d',
    border_secondary: '#21262d',
  },
  spacing: {
    xs: '8px',
    sm: '16px',
    md: '24px',
    lg: '32px',
    xl: '48px',
    2xl: '64px',
  },
  shadows: {
    sm: '0 1px 3px rgba(0,0,0,0.3)',
    md: '0 4px 6px rgba(0,0,0,0.4)',
    lg: '0 10px 15px rgba(0,0,0,0.5)',
  },
  radius: '8px',
  transitions: {
    fast: '120ms ease-out',
    normal: '200ms ease-out',
    slow: '300ms ease-out',
  },
} as const
