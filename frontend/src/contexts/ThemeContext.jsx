import React, { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

export const THEMES = {
  DARK_GREEN: 'dark-green',
  PINK_WHITE: 'pink-white',
  BLUE_WHITE: 'blue-white'
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    // Load theme from localStorage or default to dark-green
    const savedTheme = localStorage.getItem('theme')
    return savedTheme || THEMES.DARK_GREEN
  })

  useEffect(() => {
    // Save theme to localStorage whenever it changes
    localStorage.setItem('theme', theme)
    
    // Apply theme class to document root
    document.documentElement.className = theme
  }, [theme])

  const value = {
    theme,
    setTheme,
    themes: THEMES
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}
