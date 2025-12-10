import { createContext, useContext, useState, useEffect } from 'react'
import authService from '../services/authService'

const AuthContext = createContext(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Load and verify token on app start
  useEffect(() => {
    const initAuth = async () => {
      console.log('AuthContext: Initializing authentication...')
      const token = authService.getToken()
      console.log('AuthContext: Token found:', !!token)
      
      if (token) {
        try {
          console.log('AuthContext: Verifying token...')
          // Verify token with API
          const response = await authService.verifyToken()
          console.log('AuthContext: Token verification response:', response)
          if (response.valid && response.user) {
            setUser(response.user)
            setIsAuthenticated(true)
            console.log('AuthContext: User authenticated:', response.user.email)
          } else {
            // Token is invalid, clear it
            console.log('AuthContext: Token invalid, clearing...')
            authService.logout()
            setUser(null)
            setIsAuthenticated(false)
          }
        } catch (error) {
          // Token verification failed, clear it
          console.log('AuthContext: Token verification failed:', error)
          authService.logout()
          setUser(null)
          setIsAuthenticated(false)
        }
      } else {
        console.log('AuthContext: No token found')
      }
      
      console.log('AuthContext: Initialization complete')
      setIsLoading(false)
    }

    initAuth()
  }, [])

  // Login function
  const login = async (email, password) => {
    try {
      console.log('AuthContext: Login attempt for:', email)
      const response = await authService.login(email, password)
      console.log('AuthContext: Login successful:', response)
      setUser(response.user)
      setIsAuthenticated(true)
      return response
    } catch (error) {
      console.error('AuthContext: Login failed:', error)
      throw error
    }
  }

  // Register function
  const register = async (email, password) => {
    try {
      const response = await authService.register(email, password)
      setUser(response.user)
      setIsAuthenticated(true)
      return response
    } catch (error) {
      throw error
    }
  }

  // Logout function
  const logout = () => {
    authService.logout()
    setUser(null)
    setIsAuthenticated(false)
  }

  const value = {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
