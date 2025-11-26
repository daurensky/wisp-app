import { listServers } from '@/api/server'
import logo from '@/assets/logo.png'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { NavLink } from 'react-router'
import { toast } from 'sonner'
import CreateServerDialog from './create-server-dialog'

export default function ServerList() {
  const {
    data: servers,
    status,
    error,
  } = useQuery({ queryKey: ['servers'], queryFn: listServers })

  useEffect(() => {
    error && toast(error.message)
  }, [error])

  if (status === 'pending' || status === 'error') {
    return (
      <aside className="bg-sidebar rounded-sm">
        <div className="py-3 space-y-3">
          <div className="px-3">
            <NavLink to="/">
              <Avatar className="h-10 w-10 rounded-lg">
                <AvatarImage src={logo} alt="Wisp" />
              </Avatar>
            </NavLink>
          </div>

          <Skeleton className="mx-3 h-10 w-10 rounded-lg" />
          <Skeleton className="mx-3 h-10 w-10 rounded-lg" />
          <Skeleton className="mx-3 h-10 w-10 rounded-lg" />
        </div>
      </aside>
    )
  }

  return (
    <aside className="bg-sidebar rounded-sm">
      <div className="py-3 space-y-3">
        <div className="px-3">
          <NavLink to="/">
            <Avatar className="h-10 w-10 rounded-lg">
              <AvatarImage src={logo} alt="Wisp" />
            </Avatar>
          </NavLink>
        </div>

        {servers.map(({ id, name, avatar }) => (
          <NavLink
            key={id}
            to={`/server/${id}`}
            className={({ isActive }) =>
              cn(
                'px-3 [&.selected]:pl-0 group flex gap-2',
                isActive && 'selected'
              )
            }
          >
            <div className="hidden group-[&.selected]:block grow w-1 bg-white rounded-tr-sm rounded-br-sm"></div>
            <Avatar className="h-10 w-10 rounded-lg">
              <AvatarImage src={avatar} alt={name} />
              <AvatarFallback className="rounded-lg">{name[0]}</AvatarFallback>
            </Avatar>
          </NavLink>
        ))}

        <div className="px-3">
          <CreateServerDialog />
        </div>
      </div>
    </aside>
  )
}
