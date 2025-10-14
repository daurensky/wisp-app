import { me } from '@/api/user'
import { AppSidebar } from '@/components/app-sidebar'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { useQuery } from '@tanstack/react-query'
import { Navigate, Outlet } from 'react-router'

export default function AuthLayout() {
  const { data: user, isLoading } = useQuery({ queryKey: ['me'], queryFn: me })

  if (isLoading) {
    return <>Loading...</>
  }

  if (!user) {
    return <Navigate to="/" replace />
  }

  return (
    <SidebarProvider
      style={
        {
          '--sidebar-width': 'calc(var(--spacing) * 72)',
          '--header-height': 'calc(var(--spacing) * 12)',
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  )
}
