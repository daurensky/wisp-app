import { ConnectionInfo, ConnectionContext } from '@/context/connection-context'
import { useState } from 'react'
import { Outlet } from 'react-router'

export default function ConnectionLayout() {
  const [info, setInfo] = useState<ConnectionInfo | null>(null)

  const reset = () => setInfo(null)

  return (
    <ConnectionContext.Provider
      value={{
        info,
        init: setInfo,
        reset,
      }}
    >
      <Outlet />
    </ConnectionContext.Provider>
  )
}
