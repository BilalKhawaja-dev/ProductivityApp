import apiClient, { apiRequest } from './api'
import { cache } from '../utils/errorHandler'

const insightService = {
  /**
   * Generate new AI insights based on user's task history
   * @returns {Promise<{insight: object}>}
   */
  async generateInsights() {
    const response = await apiRequest(
      () => apiClient.post('/insights/generate'),
      true
    )
    
    // Clear insights cache after generating new insight
    cache.remove('insights')
    
    return response.data
  },

  /**
   * Get all past insights for the current user
   * @returns {Promise<{insights: Array}>}
   */
  async getInsights() {
    const cacheKey = 'insights'
    
    // Try to get from cache first
    const cached = cache.get(cacheKey)
    if (cached) {
      return cached
    }
    
    const response = await apiRequest(
      () => apiClient.get('/insights'),
      true
    )
    
    // Cache the result
    cache.set(cacheKey, response.data, 5 * 60 * 1000) // 5 minutes
    
    return response.data
  },
}

export default insightService
