import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

const AuthContext = createContext()

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for existing session
    const session = localStorage.getItem('app:session')
    if (session) {
      try {
        const sessionData = JSON.parse(session)
        if (sessionData.userId) {
          setUser({ id: sessionData.userId })
        }
      } catch (error) {
        console.error('Error parsing session:', error)
        localStorage.removeItem('app:session')
      }
    }
    setLoading(false)
  }, [])

  const login = async (email, password) => {
    try {
      // Hash password (simplified - in real app use proper hashing)
      const passwordHash = btoa(password) // Base64 encoding for demo
      
      const response = await axios.post('/api/users/login', {
        email,
        password_hash: passwordHash
      })

      const userData = response.data
      setUser(userData)
      
      // Store session
      localStorage.setItem('app:session', JSON.stringify({
        userId: userData.id,
        issuedAt: Date.now()
      }))

      return userData
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Login failed')
    }
  }

  const signup = async (email, password) => {
    try {
      const passwordHash = btoa(password)
      
      const response = await axios.post('/api/users', {
        email,
        password_hash: passwordHash
      })

      const userData = response.data
      setUser({ id: userData.id, email: userData.email })
      
      localStorage.setItem('app:session', JSON.stringify({
        userId: userData.id,
        issuedAt: Date.now()
      }))

      return userData
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Signup failed')
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('app:session')
  }

  const value = {
    user,
    login,
    signup,
    logout,
    loading
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
