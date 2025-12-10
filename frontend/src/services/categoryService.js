import apiClient, { apiRequest } from './api'
import { cache } from '../utils/errorHandler'

const categoryService = {
  /**
   * Get all categories for the current user
   * @returns {Promise<{categories: Array}>}
   */
  async getCategories() {
    const cacheKey = 'categories'
    
    // Try to get from cache first
    const cached = cache.get(cacheKey)
    if (cached) {
      return cached
    }
    
    const response = await apiRequest(
      () => apiClient.get('/categories'),
      true
    )
    
    // Cache the result
    cache.set(cacheKey, response.data, 5 * 60 * 1000) // 5 minutes
    
    return response.data
  },

  /**
   * Create a new category
   * @param {string} name - Category name
   * @param {string} color - Category color (hex code)
   * @returns {Promise<{category: object}>}
   */
  async createCategory(name, color) {
    const response = await apiRequest(
      () => apiClient.post('/categories', { name, color }),
      true
    )
    
    // Clear category cache after creating
    cache.remove('categories')
    
    return response.data
  },

  /**
   * Update an existing category
   * @param {string} categoryId - Category ID
   * @param {object} updates - Category updates
   * @param {string} updates.name - New category name
   * @param {string} updates.color - New category color
   * @returns {Promise<{category: object}>}
   */
  async updateCategory(categoryId, updates) {
    const response = await apiRequest(
      () => apiClient.put(`/categories/${categoryId}`, updates),
      true
    )
    
    // Clear category cache after updating
    cache.remove('categories')
    
    return response.data
  },

  /**
   * Delete a category
   * @param {string} categoryId - Category ID
   * @returns {Promise<{success: boolean}>}
   */
  async deleteCategory(categoryId) {
    const response = await apiRequest(
      () => apiClient.delete(`/categories/${categoryId}`),
      true
    )
    
    // Clear category cache after deleting
    cache.remove('categories')
    
    return response.data
  },
}

export default categoryService
