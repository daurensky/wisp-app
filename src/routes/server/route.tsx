import type {
  ServerCategory as ServerCategoryResponse,
  Server as ServerResponse,
} from '@/api/server'
import { getServer } from '@/api/server'
import { Skeleton } from '@/components/ui/skeleton'
import { useWebRTC } from '@/context/webrtc-context'
import { useEcho } from '@laravel/echo-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
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

      <main>
        {Object.entries(peers).map(([userId, peerStreams]) => (
          <div key={userId}>
            {peerStreams.displayStream && (
              <RemoteVideo stream={peerStreams.displayStream} />
            )}
          </div>
        ))}
      </main>
    </>
  )
}

function RemoteVideo({ stream }: { stream: MediaStream | null }) {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (!ref.current || !stream) return
    ref.current.srcObject = stream
  }, [stream])

  return <video ref={ref} autoPlay playsInline muted />
}
