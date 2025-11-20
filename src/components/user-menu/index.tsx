import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/context/auth-context'
import { useConnection } from '@/context/connection-context'
import { Settings } from 'lucide-react'
import { Button } from '../ui/button'
import ConnectionControls from './connection-controls'

export function UserMenu() {
  const { user } = useAuth()
  const connection = useConnection()

  return (
    <>
      <div className="bg-accent p-4 rounded-3xl grid gap-4">
        {connection.info !== null && (
          <ConnectionControls connectionInfo={connection.info} />
        )}

        <div className="flex items-center gap-2">
          <Avatar className="h-10 w-10 rounded-full">
            <AvatarImage src={user.avatar} alt={user.username} />
            <AvatarFallback className="rounded-lg">
              {user.username}
            </AvatarFallback>
          </Avatar>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-medium">
              <span className="font-medium">{user.name || user.username}</span>
            </span>
          </div>
          <Button
            size="icon-lg"
            aria-label="Настройки"
            className="rounded-full"
          >
            <Settings />
          </Button>
        </div>
      </div>
    </>
  )
}
