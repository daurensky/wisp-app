import { me } from '@/api/user'
import { useAccessTokenStore } from '@/store/auth-store'
import { useQuery } from '@tanstack/react-query'
import { Navigate, Outlet } from 'react-router'

export default function GuestLayout() {
  const { accessToken } = useAccessTokenStore()

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

  if (status === 'pending') {
    return (
      <div className="flex flex-1 justify-center items-center">
        <img src="/logo.png" alt="Wisp" className="w-24 h-24 animate-ping" />
      </div>
    )
  }

  if (status === 'error') {
    return <>{error.message}...</>
  }

  if (user) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
