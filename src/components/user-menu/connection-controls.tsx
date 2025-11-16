import {
  deleteServerChannelMember,
  updateServerChannelMember,
} from '@/api/server-channel-member'
import { useAuth } from '@/context/auth-context'
import { Connection, useWebRTC } from '@/context/webrtc-context'
import { PhoneOff, ScreenShare, ScreenShareOff } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '../ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'

export default function ConnectionControls({
  connection,
}: {
  connection: Connection
}) {
  const {
    peers,
    closeAll,
    localDisplayStream,
    startScreenShare,
    stopScreenShare,
  } = useWebRTC()

  const videoRef = useRef<HTMLVideoElement>(null)

  const isSharing = useMemo(() => !!localDisplayStream, [localDisplayStream])

  useEffect(() => {
    if (videoRef.current && localDisplayStream) {
      videoRef.current.srcObject = localDisplayStream
    }
  }, [localDisplayStream])

  const handleShare = useCallback(async () => {
    isSharing ? await stopScreenShare() : await startScreenShare()

    if (connection.connectedTo === 'server-channel') {
      await updateServerChannelMember(connection.connectorId, {
        is_screen_sharing: !isSharing,
      })
    }
  }, [
    connection.connectedTo,
    connection.connectorId,
    isSharing,
    startScreenShare,
    stopScreenShare,
  ])

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
          <Button
            variant={isSharing ? 'destructive' : 'default'}
            onClick={handleShare}
            size="icon-lg"
            aria-label="Демонстрация экрана"
            className="rounded-full"
          >
            {isSharing ? <ScreenShareOff /> : <ScreenShare />}
          </Button>
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
