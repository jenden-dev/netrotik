'use client'

import { useEffect } from 'react'

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (localStorage.getItem('mkTheme') === 'dark') {
      document.documentElement.classList.add('dark')
    }
  }, [])
  return <>{children}</>
}
