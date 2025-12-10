import axios from 'axios'
import { retryWithBackoff, getErrorMessage } from '../utils/errorHandler'

// API base URL - will be configured from environment variable or default to localhost
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
})

// Request interceptor to add JWT token to requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle common errors
apiClient.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    // Handle 401 Unauthorized - redirect to login and clear token
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      // Only redirect if not already on login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    
    // Handle 403 Forbidden - add user-friendly message
    if (error.response?.status === 403) {
      error.userMessage = 'You do not have permission to perform this action.'
    }
    
    // Handle 404 Not Found - add user-friendly message
    if (error.response?.status === 404) {
      error.userMessage = 'The requested resource was not found.'
    }
    
    // Handle 500 Internal Server Error - add user-friendly message and retry flag
    if (error.response?.status === 500) {
      error.userMessage = 'Server error. Please try again later.'
      error.canRetry = true
    }
    
    // Handle network errors
    if (!error.response && error.message === 'Network Error') {
      error.userMessage = 'Unable to connect to the server. Please check your internet connection.'
      error.isNetworkError = true
    }
    
    // Add user-friendly message to error
    if (!error.userMessage) {
      error.userMessage = getErrorMessage(error)
    }
    
    return Promise.reject(error)
  }
)

/**
 * Make an API request with retry logic
 * @param {Function} requestFn - Function that returns an axios promise
 * @param {boolean} enableRetry - Whether to enable retry with backoff (default: true)
 * @returns {Promise} - API response
 */
export async function apiRequest(requestFn, enableRetry = true) {
  if (enableRetry) {
    return retryWithBackoff(requestFn)
  }
  return requestFn()
}

export default apiClient
