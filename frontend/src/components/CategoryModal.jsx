import { useState, useEffect } from 'react'
import categoryService from '../services/categoryService'
import { validateCategoryForm } from '../utils/validation'
import { getErrorMessage } from '../utils/errorHandler'

function CategoryModal({ isOpen, onClose, onSave, category }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState('#4CAF50')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [validationError, setValidationError] = useState(null)

  // Predefined color options
  const colorOptions = [
    '#4CAF50', // Green
    '#2196F3', // Blue
    '#F44336', // Red
    '#FF9800', // Orange
    '#9C27B0', // Purple
    '#00BCD4', // Cyan
    '#FFEB3B', // Yellow
    '#795548', // Brown
    '#607D8B', // Blue Grey
    '#E91E63', // Pink
  ]

  // Initialize form with category data if editing
  useEffect(() => {
    if (category) {
      setName(category.name || '')
      setColor(category.color || '#4CAF50')
    } else {
      setName('')
      setColor('#4CAF50')
    }
    setError(null)
    setValidationError(null)
  }, [category, isOpen])

  const validateForm = () => {
    // Use validation utility
    const errors = validateCategoryForm({ name: name.trim(), color })
    
    if (Object.keys(errors).length > 0) {
      // Show first error
      const firstError = Object.values(errors)[0]
      setValidationError(firstError)
      return false
    }
    
    // Additional length validation
    if (name.trim().length < 2) {
      setValidationError('Category name must be at least 2 characters')
      return false
    }
    if (name.trim().length > 50) {
      setValidationError('Category name must be less than 50 characters')
      return false
    }
    
    setValidationError(null)
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    try {
      setLoading(true)
      setError(null)

      const categoryData = {
        name: name.trim(),
        color: color
      }

      if (category) {
        // Update existing category
        await categoryService.updateCategory(category.categoryId, categoryData)
      } else {
        // Create new category
        await categoryService.createCategory(categoryData)
      }

      // Reset form and close modal
      setName('')
      setColor('#4CAF50')
      onSave()
    } catch (err) {
      console.error('Error saving category:', err)
      // Use error handler utility for user-friendly message
      const errorMessage = err.userMessage || getErrorMessage(err)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setName('')
      setColor('#4CAF50')
      setError(null)
      setValidationError(null)
      onClose()
    }
  }

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg p-4 sm:p-6 max-w-md w-full">
        <h3 className="text-lg sm:text-xl font-semibold mb-4 text-primary">
          {category ? 'Edit Category' : 'Create Category'}
        </h3>

        {/* Error Message */}
        {error && (
          <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Validation Error */}
        {validationError && (
          <div className="mb-4 bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
            {validationError}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Category Name */}
          <div className="mb-4">
            <label htmlFor="categoryName" className="block text-sm font-medium text-primary mb-2">
              Category Name *
            </label>
            <input
              type="text"
              id="categoryName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Work, Personal, Health"
              className="w-full px-4 py-2 border border-color rounded-md focus:outline-none focus:ring-2 focus:ring-accent bg-secondary text-primary placeholder-text-secondary"
              disabled={loading}
              maxLength={50}
            />
          </div>

          {/* Color Picker */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-primary mb-2">
              Category Color *
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {colorOptions.map((colorOption) => (
                <button
                  key={colorOption}
                  type="button"
                  onClick={() => setColor(colorOption)}
                  className={`w-10 h-10 rounded-full border-2 ${
                    color === colorOption ? 'border-primary' : 'border-color'
                  } hover:border-accent transition-colors`}
                  style={{ backgroundColor: colorOption }}
                  disabled={loading}
                  title={colorOption}
                />
              ))}
            </div>
            
            {/* Custom Color Input */}
            <div className="flex items-center gap-2">
              <label htmlFor="customColor" className="text-sm text-secondary">
                Custom:
              </label>
              <input
                type="color"
                id="customColor"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-12 h-8 border border-color rounded cursor-pointer"
                disabled={loading}
              />
              <span className="text-sm text-secondary">{color}</span>
            </div>
          </div>

          {/* Preview */}
          <div className="mb-6 p-4 bg-tertiary rounded-md">
            <p className="text-sm text-secondary mb-2">Preview:</p>
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-primary font-medium">
                {name.trim() || 'Category Name'}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-end">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2 bg-secondary text-primary border border-color rounded-md hover:bg-tertiary disabled:opacity-50 disabled:cursor-not-allowed order-2 sm:order-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-4 py-2 bg-accent text-white rounded-md hover:bg-accent-dark disabled:opacity-50 disabled:cursor-not-allowed order-1 sm:order-2"
            >
              {loading ? 'Saving...' : category ? 'Update Category' : 'Create Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CategoryModal
