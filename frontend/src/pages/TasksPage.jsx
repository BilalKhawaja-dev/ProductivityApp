import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { taskService, categoryService } from '../services'
import TaskModal from '../components/TaskModal'

function TasksPage() {
  const [tasks, setTasks] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Filter states
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  
  // Modal state
  const [selectedTask, setSelectedTask] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Fetch tasks and categories on mount
  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const [tasksResponse, categoriesResponse] = await Promise.all([
        taskService.getTasks(),
        categoryService.getCategories()
      ])
      
      setTasks(tasksResponse.tasks || [])
      setCategories(categoriesResponse.categories || [])
    } catch (err) {
      console.error('Error fetching data:', err)
      setError(err.message || 'Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }

  // Filter tasks based on all active filters (AND logic)
  const filteredTasks = tasks.filter(task => {
    // Category filter
    if (categoryFilter && task.categoryId !== categoryFilter) {
      return false
    }
    
    // Status filter
    if (statusFilter === 'completed' && !task.completed) {
      return false
    }
    if (statusFilter === 'incomplete' && task.completed) {
      return false
    }
    
    // Priority filter
    if (priorityFilter && task.priority !== priorityFilter) {
      return false
    }
    
    // Search query (title or description)
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const titleMatch = task.title?.toLowerCase().includes(query)
      const descriptionMatch = task.description?.toLowerCase().includes(query)
      if (!titleMatch && !descriptionMatch) {
        return false
      }
    }
    
    return true
  })

  // Clear all filters
  const clearFilters = () => {
    setCategoryFilter('')
    setStatusFilter('')
    setPriorityFilter('')
    setSearchQuery('')
  }

  // Toggle task completion
  const handleToggleComplete = async (taskId, e) => {
    e.stopPropagation() // Prevent opening modal
    
    try {
      const response = await taskService.toggleComplete(taskId)
      
      // Update local state
      setTasks(tasks.map(task => 
        task.taskId === taskId ? response.task : task
      ))
    } catch (err) {
      console.error('Error toggling task:', err)
      setError(err.message || 'Failed to update task')
    }
  }

  // Open task modal
  const handleTaskClick = (task) => {
    setSelectedTask(task)
    setIsModalOpen(true)
  }

  // Create new task
  const handleCreateTask = () => {
    setSelectedTask(null)
    setIsModalOpen(true)
  }

  // Get category name and color
  const getCategoryInfo = (categoryId) => {
    const category = categories.find(c => c.categoryId === categoryId)
    return category || { name: 'No Category', color: '#9CA3AF' }
  }

  // Priority badge color
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'low':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-secondary text-primary'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-primary">Loading tasks...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-primary p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-primary mb-2">Tasks</h1>
            <p className="text-sm sm:text-base text-secondary">Manage and organize your tasks</p>
          </div>
          
          <div className="flex flex-wrap gap-2 sm:gap-4">
            <Link
              to="/dashboard"
              className="px-3 py-2 text-sm sm:text-base bg-secondary text-primary rounded-md hover:bg-tertiary border border-color"
            >
              Dashboard
            </Link>
            <Link
              to="/calendar"
              className="px-3 py-2 text-sm sm:text-base bg-accent text-white rounded-md hover:bg-accent-dark"
            >
              Calendar
            </Link>
            <Link
              to="/insights"
              className="px-3 py-2 text-sm sm:text-base bg-accent text-white rounded-md hover:bg-accent-dark"
            >
              Insights
            </Link>
            <Link
              to="/settings"
              className="px-3 py-2 text-sm sm:text-base bg-accent text-white rounded-md hover:bg-accent-dark"
            >
              Settings
            </Link>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Filters Section */}
        <div className="bg-card rounded-lg shadow-sm p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Category
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 border border-color rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent bg-secondary text-primary"
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category.categoryId} value={category.categoryId}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-color rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent bg-secondary text-primary"
              >
                <option value="">All Tasks</option>
                <option value="completed">Completed</option>
                <option value="incomplete">Incomplete</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Priority
              </label>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full px-3 py-2 border border-color rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent bg-secondary text-primary"
              >
                <option value="">All Priorities</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            {/* Search Input */}
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Search
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search title or description..."
                className="w-full px-3 py-2 border border-color rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent bg-secondary text-primary placeholder-text-secondary"
              />
            </div>
          </div>

          {/* Filter Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2">
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-sm text-secondary hover:text-primary hover:bg-tertiary rounded-lg transition-colors"
            >
              Clear Filters
            </button>
            <button
              onClick={handleCreateTask}
              className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-dark transition-colors"
            >
              Create Task
            </button>
          </div>
        </div>

        {/* Tasks List */}
        <div className="bg-card rounded-lg shadow-sm">
          {filteredTasks.length === 0 ? (
            <div className="p-12 text-center text-secondary">
              {tasks.length === 0 ? (
                <>
                  <p className="text-lg mb-2">No tasks yet</p>
                  <p className="text-sm">Create your first task to get started</p>
                </>
              ) : (
                <>
                  <p className="text-lg mb-2">No tasks match your filters</p>
                  <p className="text-sm">Try adjusting your filters</p>
                </>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-600">
              {filteredTasks.map(task => {
                const categoryInfo = getCategoryInfo(task.categoryId)
                
                return (
                  <div
                    key={task.taskId}
                    onClick={() => handleTaskClick(task)}
                    className="p-3 sm:p-4 hover:bg-tertiary cursor-pointer transition-colors"
                  >
                    <div className="flex items-start gap-3 sm:gap-4">
                      {/* Completion Checkbox */}
                      <button
                        onClick={(e) => handleToggleComplete(task.taskId, e)}
                        className="mt-1 flex-shrink-0"
                      >
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          task.completed
                            ? 'bg-accent border-accent'
                            : 'border-color hover:border-accent'
                        }`}>
                          {task.completed && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </button>

                      {/* Task Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row items-start justify-between gap-2 mb-2">
                          <h3 className={`text-base sm:text-lg font-medium ${
                            task.completed ? 'text-secondary line-through' : 'text-primary'
                          }`}>
                            {task.title}
                          </h3>
                          
                          {/* Priority Badge */}
                          <span className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${getPriorityColor(task.priority)}`}>
                            {task.priority || 'medium'}
                          </span>
                        </div>

                        {/* Description */}
                        {task.description && (
                          <p className={`text-sm mb-2 ${
                            task.completed ? 'text-secondary opacity-75' : 'text-secondary'
                          }`}>
                            {task.description}
                          </p>
                        )}

                        {/* Metadata */}
                        <div className="flex flex-wrap items-center gap-4 text-sm text-secondary">
                          {/* Category */}
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: categoryInfo.color }}
                            />
                            <span>{categoryInfo.name}</span>
                          </div>

                          {/* Due Date */}
                          {task.dueDate && (
                            <div className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span>{task.dueDate}</span>
                              {task.dueTime && <span className="ml-1">{task.dueTime}</span>}
                            </div>
                          )}

                          {/* Recurring Indicator */}
                          {task.recurring?.enabled && (
                            <div className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              <span>Recurring</span>
                            </div>
                          )}

                          {/* Reminder Indicator */}
                          {task.reminders?.enabled && (
                            <div className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                              </svg>
                              <span>Reminder</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Task Count */}
        <div className="mt-4 text-center text-sm text-secondary">
          Showing {filteredTasks.length} of {tasks.length} tasks
        </div>
      </div>

      {/* Task Modal */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        task={selectedTask}
        categories={categories}
        onSuccess={fetchData}
      />
    </div>
  )
}

export default TasksPage
