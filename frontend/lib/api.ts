import axios from 'axios'

// Ensure baseURL includes /api prefix
const getBaseURL = () => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL
  if (envUrl) {
    // If env URL doesn't end with /api, add it
    return envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`
  }
  return 'http://localhost:3001/api'
}

const api = axios.create({
  baseURL: getBaseURL(),
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  // TEMPORARY: Use mock token for development
  const token = typeof window !== 'undefined' 
    ? localStorage.getItem('token') || 'dev-token-123'
    : 'dev-token-123'
  
  // Add auth header for development
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  
  return config
})

// Handle errors gracefully
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log error but don't crash the app
    if (error.code === 'ECONNREFUSED') {
      console.warn('Backend not available, using mock data')
    }
    return Promise.reject(error)
  }
)

export default api
