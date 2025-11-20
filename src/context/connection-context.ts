import { createContext, useContext } from 'react'

export interface ConnectionInfo {
  id: string
  connectable: 'server-channel'
  label: string
  memberNameMap: Record<string, string | null>
  disconnect: () => Promise<void>
  startScreenShare: () => Promise<void>
  stopScreenShare: () => Promise<void>
}

export interface ConnectionContextValue {
  info: ConnectionInfo | null
  init: (connectionInfo: ConnectionInfo) => void
  reset: () => void
}

export const ConnectionContext = createContext<ConnectionContextValue | null>(
  null
)

export const useConnection = () => {
  const connectionContext = useContext(ConnectionContext)

  if (!connectionContext) {
    throw new Error(
      'useConnection has to used within <ConnectionContext.Provider>'
    )
  }

  return connectionContext
}
