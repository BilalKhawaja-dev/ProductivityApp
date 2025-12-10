import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate, Link } from 'react-router-dom'
import { useToast } from '../components/ToastContainer'
import taskService from '../services/taskService'
import categoryService from '../services/categoryService'
import { getErrorMessage } from '../utils/errorHandler'

function DashboardPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { showError, showSuccess } = useToast()
  
  const [tasks, setTasks] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Quick-add task form state
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [addingTask, setAddingTask] = useState(false)

  // Fetch today's tasks and categories
  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0]
      
      // Fetch today's tasks and categories in parallel
      const [tasksResponse, categoriesResponse] = await Promise.all([
        taskService.getTasks({ startDate: today, endDate: today }),
        categoryService.getCategories()
      ])
      
      setTasks(tasksResponse.tasks || [])
      setCategories(categoriesResponse.categories || [])
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
      const errorMessage = err.userMessage || getErrorMessage(err)
      setError(errorMessage)
      showError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleToggleComplete = async (taskId) => {
    try {
      const response = await taskService.toggleComplete(taskId)
      // Update the task in the local state
      setTasks(tasks.map(task => 
        task.taskId === taskId ? response.task : task
      ))
      showSuccess('Task updated successfully!')
    } catch (err) {
      console.error('Error toggling task completion:', err)
      const errorMessage = err.userMessage || getErrorMessage(err)
      setError(errorMessage)
      showError(errorMessage)
    }
  }

  const handleQuickAddTask = async (e) => {
    e.preventDefault()
    
    if (!newTaskTitle.trim()) {
      return
    }
    
    try {
      setAddingTask(true)
      setError(null)
      
      // Get today's date and current time
      const today = new Date()
      const dueDate = today.toISOString().split('T')[0]
      const dueTime = today.toTimeString().slice(0, 5) // HH:MM format
      
      const newTask = {
        title: newTaskTitle.trim(),
        priority: 'medium',
        dueDate,
        dueTime,
        completed: false
      }
      
      const response = await taskService.createTask(newTask)
      
      // Add the new task to the list
      setTasks([...tasks, response.task])
      setNewTaskTitle('')
      showSuccess('Task created successfully!')
    } catch (err) {
      console.error('Error creating task:', err)
      const errorMessage = err.userMessage || getErrorMessage(err)
      setError(errorMessage)
      showError(errorMessage)
    } finally {
      setAddingTask(false)
    }
  }

  // Calculate statistics
  const calculateStats = () => {
    const total = tasks.length
    const completed = tasks.filter(task => task.completed).length
    
    // Group by category
    const byCategory = {}
    tasks.forEach(task => {
      const categoryId = task.categoryId || 'uncategorized'
      if (!byCategory[categoryId]) {
        byCategory[categoryId] = { total: 0, completed: 0 }
      }
      byCategory[categoryId].total++
      if (task.completed) {
        byCategory[categoryId].completed++
      }
    })
    
    return { total, completed, byCategory }
  }

  const stats = calculateStats()

  // Get category name and color
  const getCategoryInfo = (categoryId) => {
    const category = categories.find(c => c.categoryId === categoryId)
    return category || { name: 'Uncategorized', color: '#9CA3AF' }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-primary text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-primary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-primary">Dashboard</h1>
          <div className="flex flex-wrap gap-2 sm:gap-4">
            <Link
              to="/tasks"
              className="px-3 py-2 text-sm sm:text-base bg-accent text-white rounded-md hover:bg-accent-dark"
            >
              All Tasks
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
            <button
              onClick={handleLogout}
              className="px-3 py-2 text-sm sm:text-base bg-secondary text-primary rounded-md hover:bg-tertiary border border-color"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Welcome Section */}
        <div className="bg-card rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-2 text-primary">
            Welcome, {user?.email || 'User'}!
          </h2>
          <p className="text-secondary">
            Here's your overview for today
          </p>
        </div>

        {/* Quick Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Total Tasks */}
          <div className="bg-card rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-primary mb-2">Today's Tasks</h3>
            <p className="text-3xl font-bold text-accent">
              {stats.completed} / {stats.total}
            </p>
            <p className="text-sm text-secondary mt-1">
              {stats.total > 0 
                ? `${Math.round((stats.completed / stats.total) * 100)}% complete`
                : 'No tasks today'}
            </p>
          </div>

          {/* By Category */}
          <div className="bg-card rounded-lg shadow p-6 md:col-span-2">
            <h3 className="text-lg font-semibold text-primary mb-3">By Category</h3>
            {Object.keys(stats.byCategory).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(stats.byCategory).map(([categoryId, data]) => {
                  const categoryInfo = getCategoryInfo(categoryId)
                  return (
                    <div key={categoryId} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: categoryInfo.color }}
                        />
                        <span className="text-primary">{categoryInfo.name}</span>
                      </div>
                      <span className="text-secondary">
                        {data.completed} / {data.total}
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-secondary">No tasks with categories</p>
            )}
          </div>
        </div>

        {/* Quick Add Task Form */}
        <div className="bg-card rounded-lg shadow p-4 sm:p-6 mb-6">
          <h3 className="text-lg font-semibold text-primary mb-4">Quick Add Task</h3>
          <form onSubmit={handleQuickAddTask} className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Enter task title..."
              className="flex-1 px-4 py-2 border border-color rounded-md focus:outline-none focus:ring-2 focus:ring-accent bg-secondary text-primary placeholder-text-secondary"
              disabled={addingTask}
            />
            <button
              type="submit"
              disabled={addingTask || !newTaskTitle.trim()}
              className="px-6 py-2 bg-accent text-white rounded-md hover:bg-accent-dark disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {addingTask ? 'Adding...' : 'Add Task'}
            </button>
          </form>
        </div>

        {/* Today's Tasks List */}
        <div className="bg-card rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-primary mb-4">Today's Tasks</h3>
          {tasks.length > 0 ? (
            <div className="space-y-3">
              {tasks.map(task => {
                const categoryInfo = getCategoryInfo(task.categoryId)
                return (
                  <div
                    key={task.taskId}
                    className="flex items-center gap-3 p-3 border border-gray-200 rounded-md hover:bg-gray-50"
                  >
                    {/* Completion Checkbox */}
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => handleToggleComplete(task.taskId)}
                      className="w-5 h-5 text-accent rounded focus:ring-accent cursor-pointer"
                    />
                    
                    {/* Task Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-primary ${
                            task.completed ? 'line-through text-gray-500' : ''
                          }`}
                        >
                          {task.title}
                        </span>
                        {task.categoryId && (
                          <span
                            className="px-2 py-1 text-xs rounded-full text-white"
                            style={{ backgroundColor: categoryInfo.color }}
                          >
                            {categoryInfo.name}
                          </span>
                        )}
                        {task.priority && (
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              task.priority === 'high'
                                ? 'bg-red-100 text-red-800'
                                : task.priority === 'medium'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {task.priority}
                          </span>
                        )}
                      </div>
                      {task.description && (
                        <p className="text-sm text-secondary mt-1">{task.description}</p>
                      )}
                      {task.dueTime && (
                        <p className="text-xs text-secondary mt-1">Due: {task.dueTime}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-secondary text-center py-8">
              No tasks for today. Add one using the quick-add form above!
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default DashboardPage
