import { me } from '@/api/user'
import logo from '@/assets/logo.png'
import { AuthContext } from '@/context/auth-context'
import { useAccessTokenStore } from '@/store/auth-store'
import { useQuery } from '@tanstack/react-query'
import { HTTPError } from 'ky'
import { useEffect } from 'react'
import { Navigate, Outlet } from 'react-router'

export default function AuthLayout() {
  const { accessToken, setAccessToken } = useAccessTokenStore()

  const {
    data: user,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['me'],
    queryFn: me,
    retry: 0,
    enabled: !!accessToken,
  })

  useEffect(() => {
    if (error instanceof HTTPError) {
      if (error.response.status === 401) {
        setAccessToken('')
      }
    }
  }, [error, setAccessToken])

  if (!accessToken) {
    return <Navigate to="/login" replace />
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 justify-center items-center">
        <img src={logo} alt="Wisp" className="w-24 h-24 animate-ping" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return (
    <AuthContext.Provider value={{ user }}>
      <Outlet />
    </AuthContext.Provider>
  )
}
