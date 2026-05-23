import { useMsal, useIsAuthenticated } from '@azure/msal-react'
import { loginRequest, graphRequest, graphConfig } from './authConfig'
import { useState, useEffect, useCallback } from 'react'

export interface UserProfile {
  displayName: string
  email: string
  initials: string
  jobTitle?: string
}

export function useAuth() {
  const { instance, accounts, inProgress } = useMsal()
  const isAuthenticated = useIsAuthenticated()
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const account = accounts[0]

  const fetchUserProfile = useCallback(async () => {
    if (!account) return

    try {
      const response = await instance.acquireTokenSilent({
        ...graphRequest,
        account: account,
      })

      const graphResponse = await fetch(graphConfig.graphMeEndpoint, {
        headers: {
          Authorization: `Bearer ${response.accessToken}`,
        },
      })

      if (graphResponse.ok) {
        const data = await graphResponse.json()
        const displayName = data.displayName || account.name || 'User'
        const initials = displayName
          .split(' ')
          .map((n: string) => n[0])
          .join('')
          .substring(0, 2)
          .toUpperCase()

        setUserProfile({
          displayName,
          email: data.mail || data.userPrincipalName || account.username,
          initials,
          jobTitle: data.jobTitle,
        })
      }
    } catch {
      const displayName = account.name || 'User'
      const initials = displayName
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()

      setUserProfile({
        displayName,
        email: account.username,
        initials,
      })
    }
  }, [account, instance])

  useEffect(() => {
    if (isAuthenticated && account) {
      fetchUserProfile()
    } else {
      setUserProfile(null)
    }
  }, [isAuthenticated, account, fetchUserProfile])

  const login = async () => {
    setIsLoading(true)
    try {
      await instance.loginPopup(loginRequest)
    } catch (error) {
      console.error('Login failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    setIsLoading(true)
    try {
      await instance.logoutPopup({
        postLogoutRedirectUri: '/',
        mainWindowRedirectUri: '/',
      })
    } catch (error) {
      console.error('Logout failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return {
    isAuthenticated,
    isLoading: isLoading || inProgress !== 'none',
    userProfile,
    login,
    logout,
  }
}
