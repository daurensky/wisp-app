import { getServer } from '@/api/server'
import TextChannelButton from '@/components/text-channel-button'
import { Skeleton } from '@/components/ui/skeleton'
import VoiceChannelButton from '@/components/voice-channel-button'
import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router'

export default function Server() {
  const { id } = useParams() as { id: string }
  const {
    data: server,
    status,
    error,
  } = useQuery({
    queryKey: ['server', id],
    queryFn: () => getServer(id),
  })

  if (status === 'pending') {
    return (
      <>
        <aside className="bg-sidebar rounded-sm w-[300px]">
          <div className="p-3 border-b">
            <Skeleton className="h-6 w-24" />
          </div>

          <ul className="p-3 space-y-4">
            <li className="space-y-2">
              <Skeleton className="h-15 w-69" />
              <Skeleton className="h-15 w-69" />
            </li>
          </ul>
        </aside>

        <main></main>
      </>
    )
  }

  if (status === 'error') {
    return (
      <>
        <p>{error.message}</p>
      </>
    )
  }

  return (
    <>
      <aside className="bg-sidebar rounded-sm w-[300px]">
        <div className="p-3 border-b border-accent">
          <p>{server.name}</p>
        </div>

        <ul className="p-3 space-y-4">
          {server.categories.map(({ id, name, channels }) => (
            <li key={id} className="space-y-2">
              <p className="text-xs text-muted-foreground">{name}</p>

              <ul>
                {channels.map(({ id, name, type }) => (
                  <li key={id}>
                    {type === 'text' && (
                      <TextChannelButton id={id} name={name} />
                    )}

                    {type === 'voice' && (
                      <VoiceChannelButton id={id} name={name} />
                    )}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </aside>

      <main></main>
    </>
  )
}
