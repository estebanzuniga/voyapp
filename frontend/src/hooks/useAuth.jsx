import { createContext, useCallback, useContext, useState } from 'react'

const TOKEN_KEY = 'voyapp_token'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState(null)

  const login = useCallback((authPayload) => {
    localStorage.setItem(TOKEN_KEY, authPayload.token)
    setToken(authPayload.token)
    setUser(authPayload.user)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUser(null)
  }, [])

  const value = { token, user, isAuthenticated: Boolean(token), login, logout }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
