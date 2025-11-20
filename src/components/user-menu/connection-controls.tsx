import {
  deleteServerChannelMember,
  updateServerChannelMember,
} from '@/api/server-channel-member'
import { useAuth } from '@/context/auth-context'
import { Connection, useWebRTC } from '@/context/webrtc-context'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PhoneOff, ScreenShare, ScreenShareOff } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '../ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { Skeleton } from '../ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'

export default function ConnectionControls({
  connection,
}: {
  connection: Connection
}) {
  const { peers, closeAll, localDisplayStream } = useWebRTC()

  const videoRef = useRef<HTMLVideoElement>(null)

  const isSharing = useMemo(() => !!localDisplayStream, [localDisplayStream])

  useEffect(() => {
    if (videoRef.current && localDisplayStream) {
      videoRef.current.srcObject = localDisplayStream
    }
  }, [localDisplayStream])

  const handleDisconnect = useCallback(async () => {
    if (connection.connectedTo === 'server-channel') {
      await deleteServerChannelMember(connection.connectorId)
    }

    closeAll()
  }, [closeAll, connection.connectedTo, connection.connectorId])

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
        {Object.entries(peers).map(([id, stream]) => (
          <RemoteAudio key={id} stream={stream.mainStream} />
        ))}
      </div>

      <div className="flex justify-between gap-2">
        <div>
          <p className="text-sm text-green-400">Голосовая связь подключена</p>

          <PingInfo />

          <p className="text-sm text-muted-foreground">
            {connection.connectedLabel}
          </p>
        </div>

        <div className="space-x-2">
          <ScreenShareButton connection={connection} />
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

function ScreenShareButton({ connection }: { connection: Connection }) {
  const queryClient = useQueryClient()

  const { localDisplayStream, startScreenShare, stopScreenShare } = useWebRTC()

  const {
    data: sources,
    status,
    refetch,
  } = useQuery({
    queryKey: ['desktop-captures'],
    queryFn: window.electronApi.getDesktopCapturers,
    enabled: false,
  })

  const isSharing = useMemo(() => !!localDisplayStream, [localDisplayStream])

  const tabs = useMemo(
    () => ({
      window: 'Окно',
      screen: 'Экран',
    }),
    []
  )

  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedSourceId) return

    const handleScreenShare = async () => {
      try {
        await window.electronApi.setDesktopCapturerSource(selectedSourceId)

        await startScreenShare()

        if (connection.connectedTo === 'server-channel') {
          await updateServerChannelMember(connection.connectorId, {
            is_screen_sharing: !isSharing,
          })
        }
      } catch (e) {
        console.error(e)
        toast('Не удалось запустить демонстрацию')
      }
    }

    handleScreenShare()

    return () => {
      stopScreenShare()
    }
  }, [
    connection.connectedTo,
    connection.connectorId,
    isSharing,
    selectedSourceId,
    startScreenShare,
    stopScreenShare,
  ])

  useEffect(() => {
    status === 'error' && toast('Не удалось получить окна для демонстрации')
  }, [status])

  const handleOpenChange = useCallback(
    async (open: boolean) => {
      if (open) {
        queryClient.resetQueries({ queryKey: ['desktop-captures'] })
        await refetch()
      }
    },
    [queryClient, refetch]
  )

  return (
    <Dialog onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant={isSharing ? 'destructive' : 'default'}
          size="icon-lg"
          aria-label="Демонстрация экрана"
          className="rounded-full"
        >
          {isSharing ? <ScreenShareOff /> : <ScreenShare />}
        </Button>
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className="max-w-screen-lg! max-h-2/3 h-full flex flex-col"
      >
        <DialogHeader>
          <DialogTitle>Выберите окно</DialogTitle>
          <DialogDescription>
            Выберите окно, которое собираетесь показать
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="window" className="h-full min-h-0 gap-4">
          <TabsList className="w-full">
            {Object.entries(tabs).map(([tabName, tabLabel]) => (
              <TabsTrigger key={tabName} value={tabName}>
                {tabLabel}
              </TabsTrigger>
            ))}
          </TabsList>
          {Object.entries(tabs).map(([tabName]) => (
            <TabsContent
              key={tabName}
              value={tabName}
              className="overflow-y-auto scrollbar-thin scrollbar-thumb-accent-foreground scrollbar-track-accent"
            >
              <div className="grid grid-cols-2 gap-4 items-start">
                {status === 'success' ? (
                  <>
                    {sources[tabName as keyof typeof tabs].map(source => (
                      <div key={source.id} className="space-y-1">
                        <DialogClose asChild>
                          <button
                            onClick={() => setSelectedSourceId(source.id)}
                            className="scale-95 hover:scale-100 transition-transform cursor-pointer"
                          >
                            <div className="w-full aspect-video rounded-lg overflow-hidden">
                              <img
                                src={source.thumbnail}
                                alt=""
                                className="w-full h-full object-contain"
                              />
                            </div>
                          </button>
                        </DialogClose>
                        <p className="text-sm text-center truncate">
                          {source.name}
                        </p>
                      </div>
                    ))}
                  </>
                ) : (
                  <>
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-[195px] w-full" />
                    ))}
                  </>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

function PingInfo() {
  const { user } = useAuth()

  const { peers, getPeersPing } = useWebRTC()

  const [avgPing, setAvgPing] = useState<number | null>(null)
  const [peersPing, setPeersPing] = useState<Record<string, number>>({})

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null

    if (Object.keys(peers).length > 0) {
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
  }, [getPeersPing, peers, user.id])

  if (avgPing === null) {
    return null
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        {avgPing !== null && (
          <p className="text-sm text-green-400">Средний пинг ~{avgPing} ms</p>
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
  )
}

function RemoteAudio({ stream }: { stream: MediaStream | null }) {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (!ref.current || !stream) return
    ref.current.srcObject = stream
  }, [stream])

  return <audio ref={ref} autoPlay />
}
