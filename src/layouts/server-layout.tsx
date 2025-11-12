import ServerList from '@/components/server/server-list'
import { ServerUserControls } from '@/components/server/server-user-controls'
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
        <ServerUserControls />
      </div>

      <ServerList />

      <Outlet />
    </div>
  )
}
