import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useQuery } from '@apollo/client/react'
import { apolloClient } from '../apollo/client'
import { ME_QUERY } from '../graphql/queries'

const TOKEN_KEY = 'voyapp_token'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState(null)

  // We only ever persist the JWT to localStorage, not the user object it
  // came with - so on a hard refresh `token` says "logged in" but `user`
  // starts out null. Fetch it once here (skipped once we already have it,
  // e.g. right after login/signup set it directly) instead of making every
  // page that wants `user.email` fetch it itself.
  const { data: meData, error: meError } = useQuery(ME_QUERY, {
    skip: !token || Boolean(user),
    fetchPolicy: 'network-only',
  })

  useEffect(() => {
    if (meData?.me) {
      setUser(meData.me)
    }
  }, [meData])

  useEffect(() => {
    // The stored token is no longer valid (expired, or the secret rotated) -
    // drop it rather than leave the app thinking it's logged in while every
    // real query 401s.
    if (meError) {
      localStorage.removeItem(TOKEN_KEY)
      setToken(null)
    }
  }, [meError])

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

  // Merges a partial update (e.g. { avatarColor } after updateAvatarColor
  // resolves) into the cached user object, so a component like ProfilePage
  // can reflect a change immediately instead of waiting on a refetch.
  const updateUser = useCallback((patch) => {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev))
  }, [])

  const value = { token, user, isAuthenticated: Boolean(token), login, logout, updateUser }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
