import { ReactNode, useEffect, useState } from 'react'
import { MsalProvider } from '@azure/msal-react'
import { PublicClientApplication, EventType, EventMessage, AuthenticationResult } from '@azure/msal-browser'
import { msalConfig } from './authConfig'

export const msalInstance = new PublicClientApplication(msalConfig)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    const initializeMsal = async () => {
      try {
        await msalInstance.initialize()
        await msalInstance.handleRedirectPromise()

        const accounts = msalInstance.getAllAccounts()
        if (accounts.length > 0) {
          msalInstance.setActiveAccount(accounts[0])
        }

        msalInstance.addEventCallback((event: EventMessage) => {
          if (event.eventType === EventType.LOGIN_SUCCESS && event.payload) {
            const payload = event.payload as AuthenticationResult
            msalInstance.setActiveAccount(payload.account)
          }
        })

        setIsInitialized(true)
      } catch (error) {
        console.error('MSAL initialization failed:', error)
        setIsInitialized(true)
      }
    }

    initializeMsal()
  }, [])

  if (!isInitialized) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#f8f9fa',
        color: '#5f6368'
      }}>
        Loading...
      </div>
    )
  }

  return <MsalProvider instance={msalInstance}>{children}</MsalProvider>
}
