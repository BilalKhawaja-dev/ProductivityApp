import { useState, useEffect } from 'react'
import { taskService } from '../services'
import CategorySelector from './CategorySelector'
import { validateTaskForm } from '../utils/validation'
import { getErrorMessage } from '../utils/errorHandler'

function TaskModal({ isOpen, onClose, task, onSuccess, categories }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    categoryId: '',
    priority: 'medium',
    dueDate: '',
    dueTime: '',
    recurring: {
      enabled: false,
      days: []
    },
    reminders: {
      enabled: false,
      email: false,
      sms: false,
      minutesBefore: 30
    }
  })
  
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  const daysOfWeek = [
    { value: 'monday', label: 'Mon' },
    { value: 'tuesday', label: 'Tue' },
    { value: 'wednesday', label: 'Wed' },
    { value: 'thursday', label: 'Thu' },
    { value: 'friday', label: 'Fri' },
    { value: 'saturday', label: 'Sat' },
    { value: 'sunday', label: 'Sun' }
  ]

  // Initialize form data when task changes
  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        categoryId: task.categoryId || '',
        priority: task.priority || 'medium',
        dueDate: task.dueDate || '',
        dueTime: task.dueTime || '',
        recurring: task.recurring || {
          enabled: false,
          days: []
        },
        reminders: task.reminders || {
          enabled: false,
          email: false,
          sms: false,
          minutesBefore: 30
        }
      })
    } else {
      // Reset form for new task
      setFormData({
        title: '',
        description: '',
        categoryId: '',
        priority: 'medium',
        dueDate: '',
        dueTime: '',
        recurring: {
          enabled: false,
          days: []
        },
        reminders: {
          enabled: false,
          email: false,
          sms: false,
          minutesBefore: 30
        }
      })
    }
    setErrors({})
    setSubmitError(null)
  }, [task, isOpen])

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }))
    }
  }

  // Handle recurring checkbox
  const handleRecurringToggle = (e) => {
    setFormData(prev => ({
      ...prev,
      recurring: {
        ...prev.recurring,
        enabled: e.target.checked
      }
    }))
  }

  // Handle recurring day selection
  const handleDayToggle = (day) => {
    setFormData(prev => {
      const days = prev.recurring.days.includes(day)
        ? prev.recurring.days.filter(d => d !== day)
        : [...prev.recurring.days, day]
      
      return {
        ...prev,
        recurring: {
          ...prev.recurring,
          days
        }
      }
    })
  }

  // Handle reminder checkbox
  const handleReminderToggle = (e) => {
    setFormData(prev => ({
      ...prev,
      reminders: {
        ...prev.reminders,
        enabled: e.target.checked
      }
    }))
  }

  // Handle reminder type checkboxes
  const handleReminderTypeChange = (type, checked) => {
    setFormData(prev => ({
      ...prev,
      reminders: {
        ...prev.reminders,
        [type]: checked
      }
    }))
  }

  // Handle reminder minutes change
  const handleReminderMinutesChange = (e) => {
    setFormData(prev => ({
      ...prev,
      reminders: {
        ...prev.reminders,
        minutesBefore: parseInt(e.target.value) || 0
      }
    }))
  }

  // Validate form
  const validate = () => {
    // Use validation utility
    const newErrors = validateTaskForm(formData)

    // Additional validation for recurring tasks
    if (formData.recurring.enabled && formData.recurring.days.length === 0) {
      newErrors.recurringDays = 'Select at least one day for recurring tasks'
    }

    // Additional validation for reminders
    if (formData.reminders.enabled) {
      if (!formData.reminders.email && !formData.reminders.sms) {
        newErrors.reminderType = 'Select at least one reminder type (email or SMS)'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validate()) {
      return
    }

    setLoading(true)
    setSubmitError(null)

    try {
      // Prepare task data
      const taskData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        categoryId: formData.categoryId || undefined,
        priority: formData.priority,
        dueDate: formData.dueDate,
        dueTime: formData.dueTime || undefined
      }

      // Add recurring config if enabled
      if (formData.recurring.enabled) {
        taskData.recurring = {
          enabled: true,
          days: formData.recurring.days,
          baseTaskId: task?.taskId || undefined
        }
      }

      // Add reminder config if enabled
      if (formData.reminders.enabled) {
        taskData.reminders = {
          enabled: true,
          email: formData.reminders.email,
          sms: formData.reminders.sms,
          minutesBefore: formData.reminders.minutesBefore
        }
      }

      // Create or update task
      if (task) {
        await taskService.updateTask(task.taskId, taskData)
      } else {
        await taskService.createTask(taskData)
      }

      // Success - call callback and close modal
      if (onSuccess) {
        onSuccess()
      }
      onClose()
    } catch (err) {
      console.error('Error saving task:', err)
      // Use error handler utility for user-friendly message
      const errorMessage = err.userMessage || getErrorMessage(err)
      setSubmitError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-card rounded-lg p-4 sm:p-6 max-w-2xl w-full my-4 sm:my-8">
        <div className="flex justify-between items-center mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-primary">
            {task ? 'Edit Task' : 'Create Task'}
          </h2>
          <button
            onClick={onClose}
            className="text-secondary hover:text-primary transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Submit Error */}
        {submitError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent bg-secondary text-primary ${
                errors.title ? 'border-red-500' : 'border-color'
              }`}
              placeholder="Enter task title"
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600">{errors.title}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-color rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent bg-secondary text-primary"
              placeholder="Enter task description"
            />
          </div>

          {/* Category and Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Category
              </label>
              <CategorySelector
                value={formData.categoryId}
                onChange={(categoryId) => setFormData(prev => ({ ...prev, categoryId }))}
              />
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Priority
              </label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-color rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent bg-secondary text-primary"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          {/* Due Date and Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Due Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="dueDate"
                value={formData.dueDate}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent bg-secondary text-primary ${
                  errors.dueDate ? 'border-red-500' : 'border-color'
                }`}
              />
              {errors.dueDate && (
                <p className="mt-1 text-sm text-red-600">{errors.dueDate}</p>
              )}
            </div>

            {/* Due Time */}
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Due Time
              </label>
              <input
                type="time"
                name="dueTime"
                value={formData.dueTime}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-color rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent bg-secondary text-primary"
              />
            </div>
          </div>

          {/* Recurring Task Configuration */}
          <div className="border border-color rounded-lg p-4">
            <div className="flex items-center mb-3">
              <input
                type="checkbox"
                id="recurring"
                checked={formData.recurring.enabled}
                onChange={handleRecurringToggle}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="recurring" className="ml-2 text-sm font-medium text-primary">
                Recurring Task
              </label>
            </div>

            {formData.recurring.enabled && (
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Repeat on
                </label>
                <div className="flex flex-wrap gap-2">
                  {daysOfWeek.map(day => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => handleDayToggle(day.value)}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                        formData.recurring.days.includes(day.value)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
                {errors.recurringDays && (
                  <p className="mt-2 text-sm text-red-600">{errors.recurringDays}</p>
                )}
              </div>
            )}
          </div>

          {/* Reminder Settings */}
          <div className="border border-color rounded-lg p-4">
            <div className="flex items-center mb-3">
              <input
                type="checkbox"
                id="reminders"
                checked={formData.reminders.enabled}
                onChange={handleReminderToggle}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="reminders" className="ml-2 text-sm font-medium text-primary">
                Enable Reminders
              </label>
            </div>

            {formData.reminders.enabled && (
              <div className="space-y-3">
                {/* Reminder Types */}
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">
                    Reminder Type
                  </label>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="email"
                        checked={formData.reminders.email}
                        onChange={(e) => handleReminderTypeChange('email', e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="email" className="ml-2 text-sm text-primary">
                        Email
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="sms"
                        checked={formData.reminders.sms}
                        onChange={(e) => handleReminderTypeChange('sms', e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="sms" className="ml-2 text-sm text-primary">
                        SMS
                      </label>
                    </div>
                  </div>
                  {errors.reminderType && (
                    <p className="mt-2 text-sm text-red-600">{errors.reminderType}</p>
                  )}
                </div>

                {/* Minutes Before */}
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">
                    Remind me (minutes before)
                  </label>
                  <input
                    type="number"
                    value={formData.reminders.minutesBefore}
                    onChange={handleReminderMinutesChange}
                    min="0"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.reminderMinutes ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.reminderMinutes && (
                    <p className="mt-1 text-sm text-red-600">{errors.reminderMinutes}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t border-color">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-primary bg-secondary rounded-lg hover:bg-tertiary transition-colors order-2 sm:order-1"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed order-1 sm:order-2"
              disabled={loading}
            >
              {loading ? 'Saving...' : task ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default TaskModal
