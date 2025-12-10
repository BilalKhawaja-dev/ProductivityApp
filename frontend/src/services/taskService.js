import apiClient, { apiRequest } from './api'
import { cache } from '../utils/errorHandler'

const taskService = {
  /**
   * Get all tasks for the current user
   * @param {object} params - Query parameters
   * @param {string} params.startDate - Start date for filtering (YYYY-MM-DD)
   * @param {string} params.endDate - End date for filtering (YYYY-MM-DD)
   * @returns {Promise<{tasks: Array}>}
   */
  async getTasks(params = {}) {
    const cacheKey = `tasks_${JSON.stringify(params)}`
    
    // Try to get from cache first
    const cached = cache.get(cacheKey)
    if (cached) {
      return cached
    }
    
    const response = await apiRequest(
      () => apiClient.get('/tasks', { params }),
      true
    )
    
    // Cache the result
    cache.set(cacheKey, response.data, 2 * 60 * 1000) // 2 minutes
    
    return response.data
  },

  /**
   * Create a new task
   * @param {object} task - Task data
   * @param {string} task.title - Task title
   * @param {string} task.description - Task description
   * @param {string} task.categoryId - Category ID
   * @param {string} task.priority - Priority (high, medium, low)
   * @param {string} task.dueDate - Due date (YYYY-MM-DD)
   * @param {string} task.dueTime - Due time (HH:MM)
   * @param {object} task.recurring - Recurring configuration
   * @param {object} task.reminders - Reminder configuration
   * @returns {Promise<{task: object}>}
   */
  async createTask(task) {
    const response = await apiRequest(
      () => apiClient.post('/tasks', task),
      true
    )
    
    // Clear task cache after creating
    this.clearCache()
    
    return response.data
  },

  /**
   * Update an existing task
   * @param {string} taskId - Task ID
   * @param {object} updates - Task updates
   * @returns {Promise<{task: object}>}
   */
  async updateTask(taskId, updates) {
    const response = await apiRequest(
      () => apiClient.put(`/tasks/${taskId}`, updates),
      true
    )
    
    // Clear task cache after updating
    this.clearCache()
    
    return response.data
  },

  /**
   * Delete a task
   * @param {string} taskId - Task ID
   * @returns {Promise<{success: boolean}>}
   */
  async deleteTask(taskId) {
    const response = await apiRequest(
      () => apiClient.delete(`/tasks/${taskId}`),
      true
    )
    
    // Clear task cache after deleting
    this.clearCache()
    
    return response.data
  },

  /**
   * Toggle task completion status
   * @param {string} taskId - Task ID
   * @returns {Promise<{task: object}>}
   */
  async toggleComplete(taskId) {
    const response = await apiRequest(
      () => apiClient.patch(`/tasks/${taskId}/toggle`),
      true
    )
    
    // Clear task cache after toggling
    this.clearCache()
    
    return response.data
  },

  /**
   * Clear task cache
   */
  clearCache() {
    // Clear all task-related cache entries
    const keys = Object.keys(localStorage)
    keys.forEach(key => {
      if (key.startsWith('cache_tasks_')) {
        localStorage.removeItem(key)
      }
    })
  },
}

export default taskService
