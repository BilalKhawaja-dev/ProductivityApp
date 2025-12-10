/**
 * Error handling utilities for the application
 */

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - The async function to retry
 * @param {number} maxRetries - Maximum number of retry attempts (default: 3)
 * @param {number} baseDelay - Base delay in milliseconds (default: 1000)
 * @returns {Promise} - Result of the function or throws error after max retries
 */
export async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  let lastError
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      
      // Don't retry on client errors (4xx) except 408 (timeout) and 429 (rate limit)
      if (error.response?.status >= 400 && error.response?.status < 500) {
        if (error.response.status !== 408 && error.response.status !== 429) {
          throw error
        }
      }
      
      // If this was the last attempt, throw the error
      if (attempt === maxRetries) {
        throw lastError
      }
      
      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt)
      
      // Add jitter to prevent thundering herd
      const jitter = Math.random() * 0.3 * delay
      const totalDelay = delay + jitter
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, totalDelay))
    }
  }
  
  throw lastError
}

/**
 * Get user-friendly error message from error object
 * @param {Error|object} error - Error object
 * @returns {string} - User-friendly error message
 */
export function getErrorMessage(error) {
  // Network error
  if (!error.response && error.message === 'Network Error') {
    return 'Unable to connect to the server. Please check your internet connection.'
  }
  
  // Timeout error
  if (error.code === 'ECONNABORTED') {
    return 'Request timed out. Please try again.'
  }
  
  // API error with response
  if (error.response) {
    const status = error.response.status
    const data = error.response.data
    
    // Use error message from API if available
    if (data?.message) {
      return data.message
    }
    
    if (data?.error) {
      return data.error
    }
    
    // Default messages based on status code
    switch (status) {
      case 400:
        return 'Invalid request. Please check your input.'
      case 401:
        return 'Your session has expired. Please log in again.'
      case 403:
        return 'You do not have permission to perform this action.'
      case 404:
        return 'The requested resource was not found.'
      case 408:
        return 'Request timed out. Please try again.'
      case 429:
        return 'Too many requests. Please wait a moment and try again.'
      case 500:
        return 'Server error. Please try again later.'
      case 502:
      case 503:
      case 504:
        return 'Service temporarily unavailable. Please try again later.'
      default:
        return `An error occurred (${status}). Please try again.`
    }
  }
  
  // Generic error
  return error.message || 'An unexpected error occurred. Please try again.'
}

/**
 * Check if the user is online
 * @returns {boolean}
 */
export function isOnline() {
  return navigator.onLine
}

/**
 * LocalStorage cache utilities
 */
export const cache = {
  /**
   * Set item in cache with expiration
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in milliseconds (default: 5 minutes)
   */
  set(key, value, ttl = 5 * 60 * 1000) {
    const item = {
      value,
      expiry: Date.now() + ttl,
    }
    try {
      localStorage.setItem(`cache_${key}`, JSON.stringify(item))
    } catch (error) {
      console.warn('Failed to cache data:', error)
    }
  },
  
  /**
   * Get item from cache
   * @param {string} key - Cache key
   * @returns {any|null} - Cached value or null if expired/not found
   */
  get(key) {
    try {
      const itemStr = localStorage.getItem(`cache_${key}`)
      if (!itemStr) {
        return null
      }
      
      const item = JSON.parse(itemStr)
      
      // Check if expired
      if (Date.now() > item.expiry) {
        localStorage.removeItem(`cache_${key}`)
        return null
      }
      
      return item.value
    } catch (error) {
      console.warn('Failed to retrieve cached data:', error)
      return null
    }
  },
  
  /**
   * Remove item from cache
   * @param {string} key - Cache key
   */
  remove(key) {
    try {
      localStorage.removeItem(`cache_${key}`)
    } catch (error) {
      console.warn('Failed to remove cached data:', error)
    }
  },
  
  /**
   * Clear all cached items
   */
  clear() {
    try {
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith('cache_')) {
          localStorage.removeItem(key)
        }
      })
    } catch (error) {
      console.warn('Failed to clear cache:', error)
    }
  },
}
