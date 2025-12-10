import apiClient, { apiRequest } from './api'

const authService = {
  /**
   * Register a new user
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<{token: string, user: object}>}
   */
  async register(email, password) {
    // Don't retry registration requests
    const response = await apiRequest(
      () => apiClient.post('/auth/register', { email, password }),
      false
    )
    
    // Store token in localStorage
    if (response.data.token) {
      localStorage.setItem('token', response.data.token)
    }
    
    return response.data
  },

  /**
   * Login an existing user
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<{token: string, user: object}>}
   */
  async login(email, password) {
    // Don't retry login requests
    const response = await apiRequest(
      () => apiClient.post('/auth/login', { email, password }),
      false
    )
    
    // Store token in localStorage
    if (response.data.token) {
      localStorage.setItem('token', response.data.token)
    }
    
    return response.data
  },

  /**
   * Verify the current JWT token (client-side check)
   * @returns {Promise<{valid: boolean, user: object}>}
   */
  async verifyToken() {
    const token = this.getToken()
    if (!token) {
      return { valid: false, user: null }
    }
    
    try {
      // Decode JWT payload (without verification - just check expiry)
      const payload = JSON.parse(atob(token.split('.')[1]))
      const now = Math.floor(Date.now() / 1000)
      
      if (payload.exp && payload.exp > now) {
        // Token is not expired
        return { 
          valid: true, 
          user: { 
            email: payload.email, 
            username: payload.username 
          } 
        }
      } else {
        // Token is expired
        return { valid: false, user: null }
      }
    } catch (error) {
      // Invalid token format
      return { valid: false, user: null }
    }
  },

  /**
   * Logout the current user
   */
  logout() {
    localStorage.removeItem('token')
  },

  /**
   * Get the current JWT token
   * @returns {string|null}
   */
  getToken() {
    return localStorage.getItem('token')
  },

  /**
   * Check if user is authenticated
   * @returns {boolean}
   */
  isAuthenticated() {
    return !!localStorage.getItem('token')
  },

  /**
   * Update user preferences
   * @param {object} preferences - User preferences object
   * @returns {Promise<{message: string, user: object}>}
   */
  async updatePreferences(preferences) {
    const response = await apiRequest(
      () => apiClient.put('/auth/preferences', { preferences }),
      true
    )
    return response.data
  },
}

export default authService
