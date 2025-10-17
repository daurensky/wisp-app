import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/context/auth-context'
import { Settings } from 'lucide-react'
import { Button } from './ui/button'

export function ServerUserControls() {
  const { user } = useAuth()

  return (
    <div className="bg-accent p-2 rounded-full">
      <div className="flex items-center gap-2">
        <Avatar className="h-10 w-10 rounded-full">
          <AvatarImage src={user.avatar} alt={user.username} />
          <AvatarFallback className="rounded-lg">
            {user.username}
          </AvatarFallback>
        </Avatar>
        <div className="grid flex-1 text-left text-sm leading-tight">
          <span className="truncate font-medium">
            {user.name || user.username}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon-lg"
          aria-label="Настройки"
          className="rounded-full"
        >
          <Settings />
        </Button>
      </div>
    </div>
  )
}
