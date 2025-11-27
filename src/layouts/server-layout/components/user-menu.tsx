import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/context/auth-context'
import { useWebRTC } from '@/context/webrtc-context'
import { Headset, Mic, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import UserMenuConnection from './user-menu-connection'

export function UserMenu() {
  const { user } = useAuth()
  const { connection } = useWebRTC()

  return (
    <>
      <div className="bg-accent p-4 rounded-3xl grid gap-4">
        {connection !== null && <UserMenuConnection connection={connection} />}

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

          <Button variant="subtle" size="icon" aria-label="Выключить микрофон">
            <Mic className="size-5" />
          </Button>
          <Button variant="subtle" size="icon" aria-label="Выключить звук">
            <Headset className="size-5" />
          </Button>
          <Button variant="subtle" size="icon" aria-label="Настройки">
            <Settings className="size-5" />
          </Button>
        </div>
      </div>
    </>
  )
}
