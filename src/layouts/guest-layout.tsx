import { me } from '@/api/user'
import { useQuery } from '@tanstack/react-query'
import { Navigate, Outlet } from 'react-router'

export default function GuestLayout() {
  const { data: user, isLoading } = useQuery({ queryKey: ['me'], queryFn: me })

  if (isLoading) {
    return <>Loading...</>
  }

  if (user) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
