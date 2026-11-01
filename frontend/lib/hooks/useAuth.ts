'use client'

// TEMPORARILY DISABLED - No Clerk credentials
// import { useAuth as useClerkAuth } from '@clerk/nextjs'
import { useEffect } from 'react'
import api from '../api'

export function useAuth() {
  // TEMPORARY: Mock auth for development
  // const { getToken, userId } = useClerkAuth()

  // useEffect(() => {
  //   const setToken = async () => {
  //     if (userId) {
  //       const token = await getToken()
  //       if (token) {
  //         localStorage.setItem('token', token)
  //       }
  //     }
  //   }
  //   setToken()
  // }, [userId, getToken])

  // TEMPORARY: Return mock values
  useEffect(() => {
    // Set a mock token for API calls (will need to handle auth differently)
    localStorage.setItem('token', 'mock-token-for-development')
  }, [])

  return { 
    userId: 'mock-user-id', // TEMPORARY
    getToken: async () => 'mock-token-for-development' // TEMPORARY
  }
}
