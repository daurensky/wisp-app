import type {
  ServerCategory as ServerCategoryResponse,
  Server as ServerResponse,
} from '@/api/server'
import { getServer } from '@/api/server'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useWebRTC } from '@/context/webrtc-context'
import { useEcho } from '@laravel/echo-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Maximize } from 'lucide-react'
import { Fragment, useRef } from 'react'
import { Outlet, useParams } from 'react-router'
import Sidebar from './sidebar'

export default function Server() {
  const queryClient = useQueryClient()

  const { id } = useParams() as { id: string }
  const {
    data: server,
    status,
    error,
  } = useQuery({
    queryKey: ['server', id],
    queryFn: () => getServer(id),
  })

  useEcho<ServerResponse>(`server.${id}`, '.ServerUpdated', data => {
    queryClient.setQueryData<ServerResponse>(['server', id], () => data)
  })

  useEcho<ServerCategoryResponse>(
    `server.${id}`,
    '.ServerCategoryCreated',
    data => {
      queryClient.setQueryData(
        ['server', id],
        (old: ServerResponse): ServerResponse => ({
          ...old,
          categories: [...old.categories, data],
        })
      )
    }
  )

  const { remoteStreams: peers } = useWebRTC()

  const playerRef = useRef<HTMLDivElement>(null)

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      playerRef.current?.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

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

        <Outlet />
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
      <Sidebar server={server} />

      <main className="grow">
        <div
          ref={playerRef}
          className="bg-sidebar rounded-sm w-full aspect-video flex items-center justify-center relative"
        >
          {Object.entries(peers).map(([userId, peerStreams]) => (
            <Fragment key={userId}>
              {peerStreams.displayStream && (
                <video
                  ref={el => {
                    el &&
                      peerStreams.displayStream &&
                      (el.srcObject = peerStreams.displayStream)
                  }}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-contain"
                />
              )}
            </Fragment>
          ))}

          <div className="absolute bottom-0 w-full flex items-center px-4 py-8 opacity-0 hover:opacity-100 transition-opacity backdrop-blur-2xl">
            <Button
              onClick={toggleFullscreen}
              variant="ghost"
              aria-label="Полноэкранный режим"
              className="rounded-full ml-auto"
            >
              <Maximize />
              Полноэкранный режим
            </Button>
          </div>
        </div>
      </main>
    </>
  )
}
