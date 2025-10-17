import { User } from '@/api/user'
import { createContext, useContext } from 'react'

interface AuthContextValue {
  user: User
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export const useAuth = () => {
  const authContext = useContext(AuthContext)

  if (!authContext) {
    throw new Error('useAuth has to used within <AuthContext.Provider>')
  }

  return authContext
}
