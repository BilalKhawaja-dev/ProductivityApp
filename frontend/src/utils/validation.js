/**
 * Form validation utilities
 */

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {string|null} - Error message or null if valid
 */
export function validateEmail(email) {
  if (!email) {
    return 'Email is required'
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return 'Invalid email format'
  }
  
  return null
}

/**
 * Validate password
 * @param {string} password - Password to validate
 * @param {number} minLength - Minimum password length (default: 8)
 * @returns {string|null} - Error message or null if valid
 */
export function validatePassword(password, minLength = 8) {
  if (!password) {
    return 'Password is required'
  }
  
  if (password.length < minLength) {
    return `Password must be at least ${minLength} characters`
  }
  
  return null
}

/**
 * Validate required field
 * @param {any} value - Value to validate
 * @param {string} fieldName - Name of the field for error message
 * @returns {string|null} - Error message or null if valid
 */
export function validateRequired(value, fieldName = 'This field') {
  if (value === null || value === undefined || value === '') {
    return `${fieldName} is required`
  }
  
  // Check for whitespace-only strings
  if (typeof value === 'string' && value.trim() === '') {
    return `${fieldName} is required`
  }
  
  return null
}

/**
 * Validate date format (YYYY-MM-DD)
 * @param {string} date - Date to validate
 * @returns {string|null} - Error message or null if valid
 */
export function validateDate(date) {
  if (!date) {
    return 'Date is required'
  }
  
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(date)) {
    return 'Invalid date format (YYYY-MM-DD)'
  }
  
  // Check if it's a valid date
  const dateObj = new Date(date)
  if (isNaN(dateObj.getTime())) {
    return 'Invalid date'
  }
  
  return null
}

/**
 * Validate time format (HH:MM)
 * @param {string} time - Time to validate
 * @param {boolean} required - Whether the field is required
 * @returns {string|null} - Error message or null if valid
 */
export function validateTime(time, required = false) {
  if (!time) {
    return required ? 'Time is required' : null
  }
  
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  if (!timeRegex.test(time)) {
    return 'Invalid time format (HH:MM)'
  }
  
  return null
}

/**
 * Validate hex color code
 * @param {string} color - Color to validate
 * @returns {string|null} - Error message or null if valid
 */
export function validateColor(color) {
  if (!color) {
    return 'Color is required'
  }
  
  const colorRegex = /^#[0-9A-Fa-f]{6}$/
  if (!colorRegex.test(color)) {
    return 'Invalid color format (must be hex code like #FF5733)'
  }
  
  return null
}

/**
 * Validate priority value
 * @param {string} priority - Priority to validate
 * @returns {string|null} - Error message or null if valid
 */
export function validatePriority(priority) {
  const validPriorities = ['high', 'medium', 'low']
  
  if (!priority) {
    return null // Priority is optional, defaults to medium
  }
  
  if (!validPriorities.includes(priority.toLowerCase())) {
    return 'Priority must be high, medium, or low'
  }
  
  return null
}

/**
 * Validate phone number (international format)
 * @param {string} phone - Phone number to validate
 * @param {boolean} required - Whether the field is required
 * @returns {string|null} - Error message or null if valid
 */
export function validatePhone(phone, required = false) {
  if (!phone) {
    return required ? 'Phone number is required' : null
  }
  
  // Basic international phone number validation
  // Should start with + and have 7-15 digits
  const phoneRegex = /^\+[1-9]\d{6,14}$/
  
  if (!phoneRegex.test(phone)) {
    return 'Phone number must be in international format (e.g., +447123456789)'
  }
  
  return null
}

/**
 * Validate number range
 * @param {number} value - Value to validate
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @param {string} fieldName - Name of the field for error message
 * @returns {string|null} - Error message or null if valid
 */
export function validateRange(value, min, max, fieldName = 'Value') {
  if (value === null || value === undefined || value === '') {
    return `${fieldName} is required`
  }
  
  const numValue = Number(value)
  
  if (isNaN(numValue)) {
    return `${fieldName} must be a number`
  }
  
  if (numValue < min || numValue > max) {
    return `${fieldName} must be between ${min} and ${max}`
  }
  
  return null
}

/**
 * Validate task form data
 * @param {object} taskData - Task data to validate
 * @returns {object} - Object with field names as keys and error messages as values
 */
export function validateTaskForm(taskData) {
  const errors = {}
  
  // Validate title
  const titleError = validateRequired(taskData.title, 'Title')
  if (titleError) {
    errors.title = titleError
  }
  
  // Validate due date
  const dateError = validateDate(taskData.dueDate)
  if (dateError) {
    errors.dueDate = dateError
  }
  
  // Validate due time (optional)
  if (taskData.dueTime) {
    const timeError = validateTime(taskData.dueTime, false)
    if (timeError) {
      errors.dueTime = timeError
    }
  }
  
  // Validate priority (optional)
  if (taskData.priority) {
    const priorityError = validatePriority(taskData.priority)
    if (priorityError) {
      errors.priority = priorityError
    }
  }
  
  // Validate reminder minutes (if reminders enabled)
  if (taskData.reminders?.enabled && taskData.reminders.minutesBefore) {
    const minutesError = validateRange(
      taskData.reminders.minutesBefore,
      1,
      1440,
      'Reminder time'
    )
    if (minutesError) {
      errors.reminderMinutes = minutesError
    }
  }
  
  return errors
}

/**
 * Validate category form data
 * @param {object} categoryData - Category data to validate
 * @returns {object} - Object with field names as keys and error messages as values
 */
export function validateCategoryForm(categoryData) {
  const errors = {}
  
  // Validate name
  const nameError = validateRequired(categoryData.name, 'Category name')
  if (nameError) {
    errors.name = nameError
  }
  
  // Validate color
  const colorError = validateColor(categoryData.color)
  if (colorError) {
    errors.color = colorError
  }
  
  return errors
}
