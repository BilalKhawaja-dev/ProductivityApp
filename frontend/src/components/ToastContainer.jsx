import { createContext, useContext, useState, useCallback } from 'react'
import Toast from './Toast'

const ToastContext = createContext()

/**
 * Hook to use toast notifications
 * @returns {object} - Toast functions
 */
export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

/**
 * Toast Provider component
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  
  const addToast = useCallback((message, type = 'info', duration = 5000) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message, type, duration }])
  }, [])
  
  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])
  
  const showSuccess = useCallback((message, duration) => {
    addToast(message, 'success', duration)
  }, [addToast])
  
  const showError = useCallback((message, duration) => {
    addToast(message, 'error', duration)
  }, [addToast])
  
  const showWarning = useCallback((message, duration) => {
    addToast(message, 'warning', duration)
  }, [addToast])
  
  const showInfo = useCallback((message, duration) => {
    addToast(message, 'info', duration)
  }, [addToast])
  
  const value = {
    showSuccess,
    showError,
    showWarning,
    showInfo,
  }
  
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-0 right-0 z-50 p-4 space-y-4 pointer-events-none">
        <div className="space-y-2 pointer-events-auto">
          {toasts.map(toast => (
            <Toast
              key={toast.id}
              message={toast.message}
              type={toast.type}
              duration={toast.duration}
              onClose={() => removeToast(toast.id)}
            />
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  )
}
