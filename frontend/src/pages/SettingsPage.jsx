import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useNavigate, Link } from 'react-router-dom'
import categoryService from '../services/categoryService'
import authService from '../services/authService'
import CategoryModal from '../components/CategoryModal'
import { validatePhone, validateEmail } from '../utils/validation'

function SettingsPage() {
  const { user, logout } = useAuth()
  const { theme, setTheme, themes } = useTheme()
  const navigate = useNavigate()
  
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  
  // Notification preferences state
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [smsNotifications, setSmsNotifications] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [defaultReminderMinutes, setDefaultReminderMinutes] = useState(30)
  const [savingPreferences, setSavingPreferences] = useState(false)
  const [preferencesSuccess, setPreferencesSuccess] = useState(false)

  // Fetch categories and load user preferences
  useEffect(() => {
    fetchCategories()
    loadUserPreferences()
  }, [])

  const loadUserPreferences = () => {
    // Load preferences from user object if available
    if (user?.preferences) {
      setEmailNotifications(user.preferences.emailReminders ?? true)
      setSmsNotifications(user.preferences.smsReminders ?? false)
      setPhoneNumber(user.phone || '')
      setDefaultReminderMinutes(user.preferences.defaultReminderMinutes ?? 30)
    }
  }

  const fetchCategories = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await categoryService.getCategories()
      setCategories(response.categories || [])
    } catch (err) {
      console.error('Error fetching categories:', err)
      setError('Failed to load categories. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleCreateCategory = () => {
    setEditingCategory(null)
    setShowCategoryModal(true)
  }

  const handleEditCategory = (category) => {
    setEditingCategory(category)
    setShowCategoryModal(true)
  }

  const handleDeleteCategory = (category) => {
    setCategoryToDelete(category)
    setShowDeleteConfirm(true)
  }

  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return

    try {
      setDeleting(true)
      setError(null)
      await categoryService.deleteCategory(categoryToDelete.categoryId)
      
      // Refresh categories list
      await fetchCategories()
      
      // Close confirmation dialog
      setShowDeleteConfirm(false)
      setCategoryToDelete(null)
    } catch (err) {
      console.error('Error deleting category:', err)
      setError(err.response?.data?.message || 'Failed to delete category. Please try again.')
      setShowDeleteConfirm(false)
      setCategoryToDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false)
    setCategoryToDelete(null)
  }

  const handleModalClose = () => {
    setShowCategoryModal(false)
    setEditingCategory(null)
  }

  const handleCategorySaved = () => {
    setShowCategoryModal(false)
    setEditingCategory(null)
    fetchCategories()
  }

  const handleThemeChange = async (newTheme) => {
    try {
      // Apply theme immediately
      setTheme(newTheme)
      
      // Persist to API
      await authService.updatePreferences({
        theme: newTheme
      })
    } catch (err) {
      console.error('Error updating theme:', err)
      setError('Failed to save theme preference. Please try again.')
    }
  }

  const handleSavePreferences = async () => {
    try {
      setSavingPreferences(true)
      setError(null)
      setPreferencesSuccess(false)

      // Validate phone number if SMS is enabled
      if (smsNotifications) {
        const phoneError = validatePhone(phoneNumber, true)
        if (phoneError) {
          setError(phoneError)
          setSavingPreferences(false)
          return
        }
      }

      // Validate email notifications (user should have valid email)
      if (emailNotifications && user?.email) {
        const emailError = validateEmail(user.email)
        if (emailError) {
          setError('Your account email is invalid. Please contact support.')
          setSavingPreferences(false)
          return
        }
      }

      // Validate default reminder minutes
      const minutes = parseInt(defaultReminderMinutes)
      if (isNaN(minutes) || minutes < 0 || minutes > 1440) {
        setError('Default reminder time must be between 0 and 1440 minutes')
        setSavingPreferences(false)
        return
      }

      // Update preferences
      await authService.updatePreferences({
        emailReminders: emailNotifications,
        smsReminders: smsNotifications,
        defaultReminderMinutes: minutes,
        notificationsEnabled: emailNotifications || smsNotifications
      })

      setPreferencesSuccess(true)
      setTimeout(() => setPreferencesSuccess(false), 3000)
    } catch (err) {
      console.error('Error saving preferences:', err)
      setError(err.message || 'Failed to save preferences. Please try again.')
    } finally {
      setSavingPreferences(false)
    }
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
          <h1 className="text-2xl sm:text-3xl font-bold text-primary">Settings</h1>
          <div className="flex flex-wrap gap-2 sm:gap-4">
            <Link
              to="/dashboard"
              className="px-3 py-2 text-sm sm:text-base bg-accent text-white rounded-md hover:bg-accent-dark"
            >
              Dashboard
            </Link>
            <Link
              to="/tasks"
              className="px-3 py-2 text-sm sm:text-base bg-accent text-white rounded-md hover:bg-accent-dark"
            >
              All Tasks
            </Link>
            <button
              onClick={handleLogout}
              className="px-3 py-2 text-sm sm:text-base bg-secondary text-primary border border-color rounded-md hover:bg-tertiary"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Category Management Section */}
        <div className="bg-card rounded-lg shadow p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
            <h2 className="text-lg sm:text-xl font-semibold text-primary">Manage Categories</h2>
            <button
              onClick={handleCreateCategory}
              className="w-full sm:w-auto px-4 py-2 bg-accent text-white rounded-md hover:bg-accent-dark text-sm sm:text-base"
            >
              Create Category
            </button>
          </div>

          {/* Categories List */}
          {categories.length > 0 ? (
            <div className="space-y-3">
              {categories.map(category => (
                <div
                  key={category.categoryId}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 border border-color rounded-md hover:bg-tertiary gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-6 h-6 rounded-full flex-shrink-0"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="text-primary font-medium">{category.name}</span>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => handleEditCategory(category)}
                      className="flex-1 sm:flex-none px-3 py-1 bg-accent text-white rounded-md hover:bg-accent-dark text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(category)}
                      className="flex-1 sm:flex-none px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-secondary text-center py-8">
              No categories yet. Create one to organize your tasks!
            </p>
          )}
        </div>

        {/* Theme Settings Section */}
        <div className="bg-card rounded-lg shadow p-4 sm:p-6 mb-6">
          <h2 className="text-lg sm:text-xl font-semibold text-primary mb-6">Theme Settings</h2>
          <div className="space-y-4">
            <p className="text-sm sm:text-base text-secondary mb-4">Choose your preferred color theme</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {/* Dark/Green Theme */}
              <button
                onClick={() => handleThemeChange(themes.DARK_GREEN)}
                className={`p-4 border-2 rounded-lg transition-all ${
                  theme === themes.DARK_GREEN
                    ? 'border-accent bg-accent bg-opacity-10'
                    : 'border-color hover:border-accent'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded bg-black"></div>
                  <div className="w-8 h-8 rounded bg-green-500"></div>
                </div>
                <div className="text-left">
                  <div className="font-semibold text-primary">Dark/Green</div>
                  <div className="text-sm text-secondary">Black background with green accents</div>
                </div>
                {theme === themes.DARK_GREEN && (
                  <div className="mt-2 text-accent text-sm font-medium">✓ Active</div>
                )}
              </button>

              {/* Pink/White Theme */}
              <button
                onClick={() => handleThemeChange(themes.PINK_WHITE)}
                className={`p-4 border-2 rounded-lg transition-all ${
                  theme === themes.PINK_WHITE
                    ? 'border-accent bg-accent bg-opacity-10'
                    : 'border-color hover:border-accent'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded bg-white border border-color"></div>
                  <div className="w-8 h-8 rounded bg-pink-500"></div>
                </div>
                <div className="text-left">
                  <div className="font-semibold text-primary">Pink/White</div>
                  <div className="text-sm text-secondary">White background with pink accents</div>
                </div>
                {theme === themes.PINK_WHITE && (
                  <div className="mt-2 text-accent text-sm font-medium">✓ Active</div>
                )}
              </button>

              {/* Blue/White Theme */}
              <button
                onClick={() => handleThemeChange(themes.BLUE_WHITE)}
                className={`p-4 border-2 rounded-lg transition-all ${
                  theme === themes.BLUE_WHITE
                    ? 'border-accent bg-accent bg-opacity-10'
                    : 'border-color hover:border-accent'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded bg-white border border-color"></div>
                  <div className="w-8 h-8 rounded bg-blue-400"></div>
                </div>
                <div className="text-left">
                  <div className="font-semibold text-primary">Blue/White</div>
                  <div className="text-sm text-secondary">White background with light blue accents</div>
                </div>
                {theme === themes.BLUE_WHITE && (
                  <div className="mt-2 text-accent text-sm font-medium">✓ Active</div>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Notification Preferences Section */}
        <div className="bg-card rounded-lg shadow p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold text-primary mb-6">Notification Preferences</h2>
          
          {preferencesSuccess && (
            <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
              Preferences saved successfully!
            </div>
          )}

          <div className="space-y-6">
            {/* Email Notifications Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-primary font-medium">Email Notifications</label>
                <p className="text-sm text-secondary">Receive task reminders via email ({user?.email})</p>
              </div>
              <button
                onClick={() => setEmailNotifications(!emailNotifications)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  emailNotifications ? 'bg-accent' : 'bg-secondary border border-color'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    emailNotifications ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* SMS Notifications Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-primary font-medium">SMS Notifications</label>
                <p className="text-sm text-secondary">Receive task reminders via SMS</p>
              </div>
              <button
                onClick={() => setSmsNotifications(!smsNotifications)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  smsNotifications ? 'bg-accent' : 'bg-secondary border border-color'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    smsNotifications ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Phone Number Input (shown when SMS is enabled) */}
            {smsNotifications && (
              <div>
                <label className="block text-primary font-medium mb-2">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+447123456789"
                  className="w-full px-4 py-2 border border-color rounded-md focus:outline-none focus:ring-2 focus:ring-accent bg-secondary text-primary placeholder-text-secondary"
                />
                <p className="text-sm text-secondary mt-1">
                  Include country code (e.g., +44 for UK)
                </p>
              </div>
            )}

            {/* Default Reminder Time */}
            <div>
              <label className="block text-primary font-medium mb-2">
                Default Reminder Time
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={defaultReminderMinutes}
                  onChange={(e) => setDefaultReminderMinutes(e.target.value)}
                  min="0"
                  max="1440"
                  className="w-32 px-4 py-2 border border-color rounded-md focus:outline-none focus:ring-2 focus:ring-accent bg-secondary text-primary"
                />
                <span className="text-secondary">minutes before due time</span>
              </div>
              <p className="text-sm text-secondary mt-1">
                This will be applied to new tasks by default
              </p>
            </div>

            {/* Save Button */}
            <div className="pt-4">
              <button
                onClick={handleSavePreferences}
                disabled={savingPreferences}
                className="px-6 py-2 bg-accent text-white rounded-md hover:bg-accent-dark disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingPreferences ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Category Modal */}
      <CategoryModal
        isOpen={showCategoryModal}
        onClose={handleModalClose}
        onSave={handleCategorySaved}
        category={editingCategory}
      />

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && categoryToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg p-4 sm:p-6 max-w-md w-full">
            <h3 className="text-lg sm:text-xl font-semibold mb-4 text-primary">
              Confirm Delete
            </h3>
            <p className="text-sm sm:text-base text-primary mb-2">
              Are you sure you want to delete the category "{categoryToDelete.name}"?
            </p>
            <p className="text-xs sm:text-sm text-secondary mb-6">
              Note: Tasks with this category will not be deleted, but they will have an orphaned category reference.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-end">
              <button
                onClick={handleCancelDelete}
                disabled={deleting}
                className="px-4 py-2 bg-secondary text-primary border border-color rounded-md hover:bg-tertiary disabled:opacity-50 disabled:cursor-not-allowed order-2 sm:order-1"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed order-1 sm:order-2"
              >
                {deleting ? 'Deleting...' : 'Delete Category'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SettingsPage
