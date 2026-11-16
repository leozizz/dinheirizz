import React, { useContext } from 'react'
import { Toaster as Sonner, type ToasterProps } from 'sonner'
import { ThemeContext } from '../../contexts/ThemeContext'

export const Toaster = ({ theme, ...props }: ToasterProps) => {
  const themeContext = useContext(ThemeContext)
  const activeTheme = theme ?? themeContext?.resolvedTheme ?? 'dark'

  return (
    <Sonner
      theme={activeTheme as ToasterProps['theme']}
      className="toaster group"
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)'
        } as React.CSSProperties
      }
      {...props}
    />
  )
}
