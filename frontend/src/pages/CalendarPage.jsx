import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { taskService, categoryService } from '../services'
import TaskModal from '../components/TaskModal'

function CalendarPage() {
  const [tasks, setTasks] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // View state
  const [view, setView] = useState('week') // 'week' or 'month'
  const [currentDate, setCurrentDate] = useState(new Date())
  
  // Modal state
  const [selectedTask, setSelectedTask] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  // Track the last fetched date range to avoid unnecessary API calls
  const [lastFetchedRange, setLastFetchedRange] = useState(null)

  // Fetch tasks and categories when date range changes
  useEffect(() => {
    const { startDate, endDate } = getDateRange()
    const currentRange = `${startDate}-${endDate}`
    
    // Only fetch if the date range has actually changed
    if (currentRange !== lastFetchedRange) {
      fetchData()
      setLastFetchedRange(currentRange)
    }
  }, [currentDate, view, lastFetchedRange])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Calculate date range based on current view
      const { startDate, endDate } = getDateRange()
      
      const [tasksResponse, categoriesResponse] = await Promise.all([
        taskService.getTasks({ startDate, endDate }),
        categoryService.getCategories()
      ])
      
      setTasks(tasksResponse.tasks || [])
      setCategories(categoriesResponse.categories || [])
    } catch (err) {
      console.error('Error fetching data:', err)
      setError(err.message || 'Failed to load calendar data')
    } finally {
      setLoading(false)
    }
  }

  // Get date range for current view
  const getDateRange = () => {
    const start = new Date(currentDate)
    const end = new Date(currentDate)
    
    if (view === 'week') {
      // Get start of week (Sunday)
      const day = start.getDay()
      start.setDate(start.getDate() - day)
      
      // Get end of week (Saturday)
      end.setDate(start.getDate() + 6)
    } else {
      // Get start of month
      start.setDate(1)
      
      // Get end of month
      end.setMonth(end.getMonth() + 1)
      end.setDate(0)
    }
    
    return {
      startDate: formatDate(start),
      endDate: formatDate(end)
    }
  }

  // Format date as YYYY-MM-DD
  const formatDate = (date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Group tasks by due date
  const groupTasksByDate = () => {
    const grouped = {}
    
    tasks.forEach(task => {
      if (task.dueDate) {
        if (!grouped[task.dueDate]) {
          grouped[task.dueDate] = []
        }
        grouped[task.dueDate].push(task)
      }
    })
    
    return grouped
  }

  // Get category info
  const getCategoryInfo = (categoryId) => {
    const category = categories.find(c => c.categoryId === categoryId)
    return category || { name: 'No Category', color: '#9CA3AF' }
  }

  // Navigate to previous period
  const handlePrevious = () => {
    const newDate = new Date(currentDate)
    if (view === 'week') {
      newDate.setDate(newDate.getDate() - 7)
    } else {
      newDate.setMonth(newDate.getMonth() - 1)
    }
    setCurrentDate(newDate)
  }

  // Navigate to next period
  const handleNext = () => {
    const newDate = new Date(currentDate)
    if (view === 'week') {
      newDate.setDate(newDate.getDate() + 7)
    } else {
      newDate.setMonth(newDate.getMonth() + 1)
    }
    setCurrentDate(newDate)
  }

  // Navigate to today
  const handleToday = () => {
    setCurrentDate(new Date())
  }

  // Toggle view
  const handleToggleView = () => {
    setView(view === 'week' ? 'month' : 'week')
  }

  // Open task modal
  const handleTaskClick = (task) => {
    setSelectedTask(task)
    setIsModalOpen(true)
  }

  // Render weekly view
  const renderWeekView = () => {
    const groupedTasks = groupTasksByDate()
    const weekDays = []
    const startOfWeek = new Date(currentDate)
    const day = startOfWeek.getDay()
    startOfWeek.setDate(startOfWeek.getDate() - day)
    
    // Generate 7 days
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek)
      date.setDate(date.getDate() + i)
      weekDays.push(date)
    }
    
    return (
      <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
        {weekDays.map((date, index) => {
          const dateStr = formatDate(date)
          const dayTasks = groupedTasks[dateStr] || []
          const isToday = formatDate(new Date()) === dateStr
          
          return (
            <div
              key={index}
              className={`bg-card rounded-lg border-2 p-2 sm:p-3 min-h-[150px] sm:min-h-[200px] ${
                isToday ? 'border-accent' : 'border-color'
              }`}
            >
              {/* Day Header */}
              <div className="mb-2 sm:mb-3 pb-2 border-b border-color">
                <div className="text-xs font-medium text-secondary uppercase">
                  {date.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div className={`text-base sm:text-lg font-bold ${
                  isToday ? 'text-blue-600' : 'text-gray-900'
                }`}>
                  {date.getDate()}
                </div>
              </div>
              
              {/* Tasks */}
              <div className="space-y-2">
                {dayTasks.map(task => {
                  const categoryInfo = getCategoryInfo(task.categoryId)
                  
                  return (
                    <div
                      key={task.taskId}
                      onClick={() => handleTaskClick(task)}
                      className="p-1.5 sm:p-2 rounded cursor-pointer hover:bg-tertiary transition-colors border-l-4"
                      style={{ borderLeftColor: categoryInfo.color }}
                    >
                      <div className="text-xs sm:text-sm font-medium text-primary truncate">
                        {task.title}
                      </div>
                      {task.dueTime && (
                        <div className="text-xs text-secondary mt-1">
                          {task.dueTime}
                        </div>
                      )}
                      {task.completed && (
                        <div className="text-xs text-green-600 mt-1">
                          ✓ Completed
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // Render monthly view
  const renderMonthView = () => {
    const groupedTasks = groupTasksByDate()
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    
    // Get first day of month
    const firstDay = new Date(year, month, 1)
    const startDay = firstDay.getDay()
    
    // Get last day of month
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    
    // Calculate total cells needed (including padding)
    const totalCells = Math.ceil((startDay + daysInMonth) / 7) * 7
    
    const days = []
    
    // Generate calendar cells
    for (let i = 0; i < totalCells; i++) {
      const dayNumber = i - startDay + 1
      
      if (dayNumber > 0 && dayNumber <= daysInMonth) {
        const date = new Date(year, month, dayNumber)
        const dateStr = formatDate(date)
        const dayTasks = groupedTasks[dateStr] || []
        const isToday = formatDate(new Date()) === dateStr
        
        days.push(
          <div
            key={i}
            className={`bg-white rounded-lg border-2 p-1 sm:p-2 min-h-[80px] sm:min-h-[120px] ${
              isToday ? 'border-blue-500' : 'border-gray-200'
            }`}
          >
            {/* Day Number */}
            <div className={`text-xs sm:text-sm font-bold mb-1 sm:mb-2 ${
              isToday ? 'text-blue-600' : 'text-gray-900'
            }`}>
              {dayNumber}
            </div>
            
            {/* Tasks */}
            <div className="space-y-0.5 sm:space-y-1">
              {dayTasks.slice(0, 2).map(task => {
                const categoryInfo = getCategoryInfo(task.categoryId)
                
                return (
                  <div
                    key={task.taskId}
                    onClick={() => handleTaskClick(task)}
                    className="px-1 sm:px-2 py-0.5 sm:py-1 rounded cursor-pointer hover:bg-gray-50 transition-colors text-xs truncate border-l-2"
                    style={{ borderLeftColor: categoryInfo.color }}
                  >
                    {task.title}
                  </div>
                )
              })}
              {dayTasks.length > 2 && (
                <div className="text-xs text-gray-500 px-1 sm:px-2">
                  +{dayTasks.length - 2}
                </div>
              )}
            </div>
          </div>
        )
      } else {
        // Empty cell for padding
        days.push(
          <div key={i} className="bg-gray-50 rounded-lg border border-gray-100 min-h-[120px]" />
        )
      }
    }
    
    return (
      <div>
        {/* Day Headers */}
        <div className="hidden sm:grid grid-cols-7 gap-2 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-sm font-medium text-gray-600 py-2">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {days}
        </div>
      </div>
    )
  }

  // Get current period label
  const getPeriodLabel = () => {
    if (view === 'week') {
      const { startDate, endDate } = getDateRange()
      const start = new Date(startDate)
      const end = new Date(endDate)
      
      if (start.getMonth() === end.getMonth()) {
        return `${start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
      } else {
        return `${start.toLocaleDateString('en-US', { month: 'short' })} - ${end.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
      }
    } else {
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-primary">Loading calendar...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-primary p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-primary mb-2">Calendar</h1>
            <p className="text-sm sm:text-base text-secondary">View your tasks in calendar format</p>
          </div>
          
          <div className="flex flex-wrap gap-2 sm:gap-4">
            <Link
              to="/dashboard"
              className="px-3 py-2 text-sm sm:text-base bg-secondary text-primary rounded-md hover:bg-tertiary border border-color"
            >
              Dashboard
            </Link>
            <Link
              to="/tasks"
              className="px-3 py-2 text-sm sm:text-base bg-accent text-white rounded-md hover:bg-accent-dark"
            >
              Tasks
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

        {/* Controls */}
        <div className="bg-card rounded-lg shadow-sm p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevious}
                className="px-2 sm:px-3 py-2 text-secondary hover:bg-tertiary rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <button
                onClick={handleToday}
                className="px-3 sm:px-4 py-2 text-sm font-medium text-primary hover:bg-tertiary rounded-lg transition-colors"
              >
                Today
              </button>
              
              <button
                onClick={handleNext}
                className="px-2 sm:px-3 py-2 text-secondary hover:bg-tertiary rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              
              <div className="ml-2 sm:ml-4 text-base sm:text-lg font-semibold text-primary">
                {getPeriodLabel()}
              </div>
            </div>

            {/* View Toggle */}
            <button
              onClick={handleToggleView}
              className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-dark transition-colors text-sm sm:text-base"
            >
              {view === 'week' ? 'Month View' : 'Week View'}
            </button>
          </div>
        </div>

        {/* Calendar */}
        <div>
          {view === 'week' ? renderWeekView() : renderMonthView()}
        </div>

        {/* Task Count */}
        <div className="mt-4 text-center text-sm text-gray-500">
          {tasks.length} task{tasks.length !== 1 ? 's' : ''} in this {view}
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

export default CalendarPage
