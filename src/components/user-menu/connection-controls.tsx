import { useAuth } from '@/context/auth-context'
import { ConnectionInfo } from '@/context/connection-context'
import { useWebRTC } from '@/context/webrtc-context'
import { PhoneOff, ScreenShare, ScreenShareOff } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ScreenShareDialog } from '../screen-share-dialog'
import { Button } from '../ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'

export default function ConnectionControls({
  connectionInfo,
}: {
  connectionInfo: ConnectionInfo
}) {
  const { user } = useAuth()
  const { peers, localDisplayStream, getPeersPing } = useWebRTC()

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
          <audio
            key={id}
            ref={el => el && stream && (el.srcObject = stream.mainStream)}
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

          <p className="text-sm text-muted-foreground">
            {connectionInfo.label}
          </p>
        </div>

        <div className="space-x-2">
          {isSharing ? (
            <Button
              onClick={connectionInfo.stopScreenShare}
              variant="destructive"
              size="icon-lg"
              aria-label="Демонстрация экрана"
              className="rounded-full"
            >
              <ScreenShareOff />
            </Button>
          ) : (
            <ScreenShareDialog onScreenShare={connectionInfo.startScreenShare}>
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
            onClick={connectionInfo.disconnect}
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
