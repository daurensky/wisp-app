import ServerList from './components/server-list'
import { UserMenu } from './components/user-menu'
import { CSSProperties } from 'react'
import { Outlet } from 'react-router'

export default function ServerLayout() {
  return (
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
        <UserMenu />
      </div>

      <ServerList />

      <Outlet />
    </div>
  )
}
