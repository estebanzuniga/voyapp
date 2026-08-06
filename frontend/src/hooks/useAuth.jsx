import { createContext, useCallback, useContext, useState } from 'react'
import { apolloClient } from '../apollo/client'

const TOKEN_KEY = 'voyapp_token'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState(null)

  const login = useCallback(async (authPayload) => {
    localStorage.setItem(TOKEN_KEY, authPayload.token)
    setToken(authPayload.token)
    setUser(authPayload.user)
    // Apollo's cache is keyed by query + variables, not by who's asking -
    // `myTrips` has no per-user variable, so without this, switching
    // accounts would keep serving the previous user's cached result straight
    // from memory instead of ever hitting the network. clearStore() (not
    // resetStore()) on purpose: there's nothing on screen to refetch yet at
    // this point, we're about to navigate to a page that mounts its own
    // fresh queries.
    await apolloClient.clearStore()
  }, [])

  const logout = useCallback(async () => {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUser(null)
    await apolloClient.clearStore()
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
