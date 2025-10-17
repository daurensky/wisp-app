import { me } from '@/api/user'
import ServerList from '@/components/server-list'
import { ServerUserControls } from '@/components/server-user-controls'
import { AuthContext } from '@/context/auth-context'
import { useAccessTokenStore } from '@/store/auth-store'
import { useQuery } from '@tanstack/react-query'
import { HTTPError } from 'ky'
import { CSSProperties, useEffect } from 'react'
import { Navigate, Outlet } from 'react-router'

export default function AuthLayout() {
  const { accessToken, setAccessToken } = useAccessTokenStore()

  const {
    data: user,
    status,
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

  if (status === 'pending') {
    return (
      <div className="flex flex-1 justify-center items-center">
        <img src="/logo.png" alt="Wisp" className="w-24 h-24 animate-ping" />
      </div>
    )
  }

  if (status === 'error') {
    return <Navigate to="/login" replace />
  }

  return (
    <AuthContext.Provider value={{ user }}>
      <div className="flex flex-1 gap-2 p-2 relative">
        <div
          className="fixed left-3 bottom-3 w-[calc(var(--server-list-width)+var(--sidebar-width))]"
          style={
            {
              '--server-list-width': 'calc(16 * var(--spacing))',
              '--sidebar-width': '300px',
            } as CSSProperties
          }
        >
          <ServerUserControls />
        </div>

        <ServerList />

        <Outlet />
      </div>
    </AuthContext.Provider>
  )
}
