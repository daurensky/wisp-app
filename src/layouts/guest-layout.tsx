import { me } from '@/api/user'
import logo from '@/assets/logo.png'
import { useAccessTokenStore } from '@/store/auth-store'
import { useQuery } from '@tanstack/react-query'
import { Navigate, Outlet } from 'react-router'

export default function GuestLayout() {
  const { accessToken } = useAccessTokenStore()

  const { data: user, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: me,
    retry: 0,
    enabled: !!accessToken,
  })

  if (accessToken) {
    return <Navigate to="/" replace />
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 justify-center items-center">
        <img src={logo} alt="Wisp" className="w-24 h-24 animate-ping" />
      </div>
    )
  }

  if (user) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
