import { useState, useEffect } from 'react'
import { categoryService } from '../services'

function CategorySelector({ value, onChange, onCategoryCreated }) {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newCategory, setNewCategory] = useState({ name: '', color: '#4CAF50' })
  const [createError, setCreateError] = useState(null)
  const [creating, setCreating] = useState(false)

  const predefinedColors = [
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

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      setLoading(false)
      const response = await categoryService.getCategories()
      setCategories(response.categories || [])
    } catch (err) {
      console.error('Error fetching categories:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectChange = (e) => {
    const selectedValue = e.target.value
    
    if (selectedValue === '__create_new__') {
      setShowCreateModal(true)
    } else {
      onChange(selectedValue)
    }
  }

  const handleCreateCategory = async (e) => {
    e.preventDefault()
    
    if (!newCategory.name.trim()) {
      setCreateError('Category name is required')
      return
    }

    setCreating(true)
    setCreateError(null)

    try {
      const response = await categoryService.createCategory(
        newCategory.name.trim(),
        newCategory.color
      )
      
      // Add new category to list
      const createdCategory = response.category
      setCategories(prev => [...prev, createdCategory])
      
      // Select the new category
      onChange(createdCategory.categoryId)
      
      // Notify parent if callback provided
      if (onCategoryCreated) {
        onCategoryCreated(createdCategory)
      }
      
      // Close modal and reset form
      setShowCreateModal(false)
      setNewCategory({ name: '', color: '#4CAF50' })
    } catch (err) {
      console.error('Error creating category:', err)
      setCreateError(err.message || 'Failed to create category')
    } finally {
      setCreating(false)
    }
  }

  const handleCloseModal = () => {
    setShowCreateModal(false)
    setNewCategory({ name: '', color: '#4CAF50' })
    setCreateError(null)
  }

  return (
    <>
      <div className="relative">
        <select
          value={value}
          onChange={handleSelectChange}
          disabled={loading}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
        >
          <option value="">No Category</option>
          {categories.map(category => (
            <option key={category.categoryId} value={category.categoryId}>
              {category.name}
            </option>
          ))}
          <option value="__create_new__" className="font-medium text-blue-600">
            + Create New Category
          </option>
        </select>
        
        {/* Color indicator */}
        {value && (
          <div
            className="absolute right-10 top-1/2 transform -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white shadow-sm"
            style={{ 
              backgroundColor: categories.find(c => c.categoryId === value)?.color || '#9CA3AF' 
            }}
          />
        )}
      </div>

      {/* Create Category Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-card rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-primary">Create Category</h3>
              <button
                onClick={handleCloseModal}
                className="text-secondary hover:text-primary transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {createError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateCategory} className="space-y-4">
              {/* Category Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category Name
                </label>
                <input
                  type="text"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Work, Personal, Health"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>

              {/* Color Picker */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {predefinedColors.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewCategory(prev => ({ ...prev, color }))}
                      className={`w-full aspect-square rounded-lg border-2 transition-all ${
                        newCategory.color === color
                          ? 'border-gray-900 scale-110'
                          : 'border-gray-200 hover:border-gray-400'
                      }`}
                      style={{ backgroundColor: color }}
                    >
                      {newCategory.color === color && (
                        <svg className="w-full h-full p-2 text-white drop-shadow-lg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
                
                {/* Custom Color Input */}
                <div className="mt-3 flex items-center gap-2">
                  <label className="text-sm text-gray-600">Custom:</label>
                  <input
                    type="color"
                    value={newCategory.color}
                    onChange={(e) => setNewCategory(prev => ({ ...prev, color: e.target.value }))}
                    className="w-12 h-8 border border-gray-300 rounded cursor-pointer"
                  />
                  <span className="text-sm text-gray-600 font-mono">{newCategory.color}</span>
                </div>
              </div>

              {/* Preview */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-2">Preview:</p>
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: newCategory.color }}
                  />
                  <span className="text-sm font-medium text-gray-900">
                    {newCategory.name || 'Category Name'}
                  </span>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={creating}
                >
                  {creating ? 'Creating...' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

export default CategorySelector
