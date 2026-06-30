import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext(null)

const THEME_VERSION = '3'

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    // Version migration: clear old dark preference when theme system changed
    const storedVersion = localStorage.getItem('mediant_theme_v')
    if (storedVersion !== THEME_VERSION) {
      localStorage.removeItem('mediant_theme')
      localStorage.setItem('mediant_theme_v', THEME_VERSION)
    }
    return localStorage.getItem('mediant_theme') || 'dark'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('mediant_theme', theme)
  }, [theme])

  function toggleTheme() {
    setTheme(t => t === 'dark' ? 'light' : 'dark')
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
