import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate, Link } from 'react-router-dom'
import insightService from '../services/insightService'

function InsightsPage() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  
  const [insights, setInsights] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState(null)

  // Fetch past insights on component mount
  useEffect(() => {
    fetchInsights()
  }, [])

  const fetchInsights = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await insightService.getInsights()
      
      // Sort insights by generation date (newest first)
      const sortedInsights = (response.insights || []).sort((a, b) => {
        return new Date(b.generatedAt) - new Date(a.generatedAt)
      })
      
      setInsights(sortedInsights)
    } catch (err) {
      console.error('Error fetching insights:', err)
      setError('Failed to load insights. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateInsights = async () => {
    try {
      setGenerating(true)
      setError(null)
      
      const response = await insightService.generateInsights()
      
      // Add the new insight to the beginning of the list
      if (response.insight) {
        setInsights([response.insight, ...insights])
      }
    } catch (err) {
      console.error('Error generating insights:', err)
      setError(err.message || 'Failed to generate insights. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatPercentage = (value) => {
    return `${Math.round(value * 100)}%`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-primary text-xl">Loading insights...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-primary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-primary">AI Insights</h1>
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
              Tasks
            </Link>
            <Link
              to="/calendar"
              className="px-3 py-2 text-sm sm:text-base bg-accent text-white rounded-md hover:bg-accent-dark"
            >
              Calendar
            </Link>
            <Link
              to="/settings"
              className="px-3 py-2 text-sm sm:text-base bg-accent text-white rounded-md hover:bg-accent-dark"
            >
              Settings
            </Link>
            <button
              onClick={handleLogout}
              className="px-3 py-2 text-sm sm:text-base bg-gray-600 text-white rounded-md hover:bg-gray-700"
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

        {/* Generate Insights Section */}
        <div className="bg-card rounded-lg shadow p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-primary mb-2">
                Generate New Insights
              </h2>
              <p className="text-sm sm:text-base text-secondary">
                Analyze your productivity patterns from the past 4 weeks using AI
              </p>
            </div>
            <button
              onClick={handleGenerateInsights}
              disabled={generating}
              className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-accent text-white rounded-md hover:bg-accent-dark disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base whitespace-nowrap"
            >
              {generating ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating...
                </>
              ) : (
                'Generate Insights'
              )}
            </button>
          </div>
        </div>

        {/* Insights List */}
        <div className="space-y-6">
          {insights.length > 0 ? (
            insights.map((insight, index) => (
              <div key={index} className="bg-card rounded-lg shadow p-6">
                {/* Insight Header */}
                <div className="mb-4 pb-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-primary">
                      Insight from {formatDate(insight.generatedAt)}
                    </h3>
                    <span className="text-sm text-secondary">
                      {formatDate(insight.generatedAt)}
                    </span>
                  </div>
                </div>

                {/* Summary */}
                <div className="mb-6">
                  <h4 className="text-md font-semibold text-primary mb-2">Summary</h4>
                  <p className="text-secondary">{insight.summary}</p>
                </div>

                {/* Patterns */}
                {insight.patterns && (
                  <div className="mb-6">
                    <h4 className="text-md font-semibold text-primary mb-3">Patterns</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      {/* Most Productive Day */}
                      {insight.patterns.mostProductiveDay && (
                        <div className="bg-green-50 border border-green-200 rounded-md p-4">
                          <p className="text-sm text-gray-600 mb-1">Most Productive Day</p>
                          <p className="text-lg font-semibold text-green-800">
                            {insight.patterns.mostProductiveDay}
                          </p>
                        </div>
                      )}

                      {/* Least Productive Day */}
                      {insight.patterns.leastProductiveDay && (
                        <div className="bg-orange-50 border border-orange-200 rounded-md p-4">
                          <p className="text-sm text-gray-600 mb-1">Least Productive Day</p>
                          <p className="text-lg font-semibold text-orange-800">
                            {insight.patterns.leastProductiveDay}
                          </p>
                        </div>
                      )}

                      {/* Completion Rate */}
                      {insight.patterns.completionRate !== undefined && (
                        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                          <p className="text-sm text-gray-600 mb-1">Completion Rate</p>
                          <p className="text-lg font-semibold text-blue-800">
                            {formatPercentage(insight.patterns.completionRate)}
                          </p>
                        </div>
                      )}

                      {/* Average Tasks Per Day */}
                      {insight.patterns.averageTasksPerDay !== undefined && (
                        <div className="bg-purple-50 border border-purple-200 rounded-md p-4">
                          <p className="text-sm text-gray-600 mb-1">Average Tasks Per Day</p>
                          <p className="text-lg font-semibold text-purple-800">
                            {insight.patterns.averageTasksPerDay.toFixed(1)}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Task Type Frequency */}
                    {insight.patterns.taskTypeFrequency && Object.keys(insight.patterns.taskTypeFrequency).length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-primary mb-2">Task Frequency by Category</p>
                        <div className="space-y-2">
                          {Object.entries(insight.patterns.taskTypeFrequency)
                            .sort(([, a], [, b]) => b - a)
                            .map(([category, count]) => (
                              <div key={category} className="flex items-center justify-between">
                                <span className="text-secondary capitalize">{category}</span>
                                <span className="text-primary font-medium">{count} tasks</span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Recommendations */}
                {insight.recommendations && insight.recommendations.length > 0 && (
                  <div>
                    <h4 className="text-md font-semibold text-primary mb-3">Recommendations</h4>
                    <ul className="space-y-2">
                      {insight.recommendations.map((recommendation, recIndex) => (
                        <li key={recIndex} className="flex items-start gap-2">
                          <span className="text-accent mt-1">•</span>
                          <span className="text-secondary">{recommendation}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="bg-card rounded-lg shadow p-12 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400 mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              <h3 className="text-lg font-medium text-primary mb-2">No Insights Yet</h3>
              <p className="text-secondary mb-4">
                Generate your first insight to see AI-powered analysis of your productivity patterns
              </p>
              <button
                onClick={handleGenerateInsights}
                disabled={generating}
                className="px-6 py-2 bg-accent text-white rounded-md hover:bg-accent-dark disabled:opacity-50"
              >
                {generating ? 'Generating...' : 'Generate Your First Insight'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default InsightsPage
