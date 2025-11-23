import {
  disconnectPeerConnection,
  updatePeerConnection,
} from '@/api/peer-connection'
import { Server } from '@/api/server'
import { useAuth } from '@/context/auth-context'
import { useWebRTC, WebRTCConnection } from '@/context/webrtc-context'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { PhoneOff, ScreenShare, ScreenShareOff } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { ScreenShareDialog } from '../screen-share-dialog'
import { Button } from '../ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'

export default function ConnectionControls({
  connection,
}: {
  connection: WebRTCConnection
}) {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const {
    remoteStreams,
    localDisplayStream,
    getPeersPing,
    closeAll,
    startScreenShare,
    stopScreenShare,
  } = useWebRTC()

  const disconnectMutation = useMutation({
    mutationKey: [connection.connectableType, connection.connectableId],
    mutationFn: disconnectPeerConnection,
    onMutate: async () => {
      if (connection.connectableType === 'server') {
        await queryClient.cancelQueries({
          queryKey: ['server', connection.connectableId],
        })

        const previousServer = queryClient.getQueryData<Server>([
          'server',
          connection.connectableId,
        ])

        queryClient.setQueryData<Server>(
          ['server', connection.connectableId],
          old =>
            !old
              ? old
              : {
                  ...old,
                  peers: old.peers.filter(p => p.user.id !== user.id),
                }
        )

        return { previousServer }
      }
    },
    onError: (error, _, context) => {
      if (context?.previousServer) {
        queryClient.setQueryData(
          ['server', connection.connectableId],
          context.previousServer
        )
      }
      toast(error.message)
    },
  })

  const updateMutation = useMutation({
    mutationKey: [connection.connectableType, connection.connectableId],
    mutationFn: updatePeerConnection,
    onMutate: async json => {
      if (connection.connectableType === 'server') {
        await queryClient.cancelQueries({
          queryKey: ['server', connection.connectableId],
        })

        const previousServer = queryClient.getQueryData<Server>([
          'server',
          connection.connectableId,
        ])

        queryClient.setQueryData<Server>(
          ['server', connection.connectableId],
          old => {
            if (!old) return

            return {
              ...old,
              peers: old.peers.flatMap(p =>
                p.user.id === user.id ? [{ ...p, ...json }] : [p]
              ),
            }
          }
        )

        return { previousServer }
      }
    },
    onError: (error, _, context) => {
      if (context?.previousServer) {
        queryClient.setQueryData(
          ['server', connection.connectableId],
          context.previousServer
        )
      }
      toast(error.message)
    },
    onSettled: async peer => {
      if (!peer) return

      peer.screen_sharing ? await startScreenShare() : await stopScreenShare()
    },
  })

  const videoRef = useRef<HTMLVideoElement>(null)

  const isSharing = useMemo(() => !!localDisplayStream, [localDisplayStream])

  useEffect(() => {
    if (videoRef.current && localDisplayStream) {
      videoRef.current.srcObject = localDisplayStream
    }
  }, [localDisplayStream])

  const [avgPing, setAvgPing] = useState<number | null>(null)
  const [peersPing, setPeersPing] = useState<Record<string, number>>({})

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null

    if (Object.keys(remoteStreams).length > 0) {
      intervalId = setInterval(() => {
        getPeersPing().then(p => {
          setPeersPing(p)

          const total = Object.values(p).reduce((acc, ping) => (acc += ping), 0)
          const count = Object.values(p).length

          setAvgPing(Math.round(total / count))
        })
      }, 2_000)
    } else if (intervalId) {
      clearInterval(intervalId)
      setPeersPing({})
      setAvgPing(null)
    }

    return () => {
      intervalId && clearInterval(intervalId)
      setPeersPing({})
      setAvgPing(null)
    }
  }, [getPeersPing, remoteStreams, user.id])

  const handleStartScreenShare = async () => {
    await updateMutation.mutateAsync({
      screen_sharing: true,
    })
  }

  const handleStopScreenShare = async () => {
    await updateMutation.mutateAsync({
      screen_sharing: false,
    })
  }

  const handleDisconnect = async () => {
    await disconnectMutation.mutateAsync()

    closeAll()
  }

  return (
    <div className="flex flex-col gap-4">
      {isSharing && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={true}
          className="w-full bg-sidebar rounded-xl aspect-video"
        />
      )}

      <div className="hidden">
        {Object.entries(remoteStreams).map(([id, stream]) => (
          <audio
            key={id}
            ref={el => {
              el && stream && (el.srcObject = stream.mainStream)
            }}
            autoPlay
          />
        ))}
      </div>

      <div className="flex justify-between gap-2">
        <div>
          <p className="text-sm text-green-400">Голосовая связь подключена</p>

          {avgPing !== null && (
            <Popover>
              <PopoverTrigger asChild>
                {avgPing !== null && (
                  <p className="text-sm text-green-400">
                    Средний пинг ~{avgPing} ms
                  </p>
                )}
              </PopoverTrigger>

              <PopoverContent className="w-80">
                {Object.entries(peersPing).map(([userId, ping]) => (
                  <p key={userId} className="text-sm">
                    {userId} - ~{ping} ms
                  </p>
                ))}
              </PopoverContent>
            </Popover>
          )}

          <p className="text-sm text-muted-foreground">{connection.label}</p>
        </div>

        <div className="space-x-2">
          {isSharing ? (
            <Button
              onClick={handleStopScreenShare}
              variant="destructive"
              size="icon-lg"
              aria-label="Демонстрация экрана"
              className="rounded-full"
            >
              <ScreenShareOff />
            </Button>
          ) : (
            <ScreenShareDialog onScreenShare={handleStartScreenShare}>
              <Button
                size="icon-lg"
                aria-label="Демонстрация экрана"
                className="rounded-full"
              >
                <ScreenShare />
              </Button>
            </ScreenShareDialog>
          )}

          <Button
            onClick={handleDisconnect}
            size="icon-lg"
            aria-label="Отключиться"
            className="rounded-full"
          >
            <PhoneOff />
          </Button>
        </div>
      </div>
    </div>
  )
}
