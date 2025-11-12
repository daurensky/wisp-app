import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/context/auth-context'
import { useWebRTC } from '@/context/webrtc-context'
import { PhoneOff, ScreenShare, Settings } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '../ui/button'
import { Separator } from '../ui/separator'
import { disconnectChannel } from '@/api/server-channel'

export function ServerUserControls() {
  const { user } = useAuth()
  const { connection: connectionDetails, localStream, peers, getPing, closeAll } =
    useWebRTC()

  const [ping, setPing] = useState<number | null>(null)

  const localAudio = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (localAudio.current) {
      localAudio.current.srcObject = localStream.current
    }
  }, [localStream.current])

  // useEffect(() => {
  //   let intervalId: NodeJS.Timeout | null = null

  //   if (currentOfferId) {
  //     intervalId = setInterval(async () => {
  //       getPing({ userId: user.id }).then(p => setPing(p))
  //     }, 2_000)
  //   } else if (intervalId) {
  //     clearInterval(intervalId)
  //   }

  //   return () => {
  //     intervalId && clearInterval(intervalId)
  //   }
  // }, [currentOfferId, getPing])

  const disconnect = async () => {
    if (!connectionDetails) {
      return
    }

    if (connectionDetails.connectedTo === 'server-channel') {
      await disconnectChannel(connectionDetails.connectedId)
    }

    closeAll()
  }

  return (
    <>
      <div className="bg-accent p-4 rounded-3xl grid gap-4">
        {connectionDetails !== null && (
          <>
            <div>
              <div className="">
                {/* <video ref={localAudio} autoPlay playsInline></video> */}
                {Object.entries(peers).map(([id, stream]) => (
                  <RemoteVideo key={id} stream={stream} />
                ))}
              </div>

              <div className="flex justify-between gap-2">
                <div>
                  <p className="text-sm text-green-400">
                    Голосовая связь подключена
                  </p>

                  {ping !== null && (
                    <p className="text-sm text-green-400">Пинг ~{ping} ms</p>
                  )}

                  <p className="text-sm text-muted-foreground">
                    {connectionDetails.connectedLabel}
                  </p>
                </div>

                <div className="space-x-2">
                  <Button
                    onClick={disconnect}
                    size="icon-lg"
                    aria-label="Настройки"
                    className="rounded-full"
                  >
                    <ScreenShare />
                  </Button>
                  <Button
                    onClick={disconnect}
                    size="icon-lg"
                    aria-label="Настройки"
                    className="rounded-full"
                  >
                    <PhoneOff />
                  </Button>
                </div>
              </div>
            </div>

            <Separator />
          </>
        )}

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
          <Button
            size="icon-lg"
            aria-label="Настройки"
            className="rounded-full"
          >
            <Settings />
          </Button>
        </div>
      </div>
    </>
  )
}

function RemoteVideo({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (!ref.current) return

    ref.current.srcObject = stream
  }, [stream])

  return (
    <video
      ref={ref}
      muted={false}
      autoPlay
      playsInline
      style={{ width: '100%', border: '2px solid #444' }}
    />
  )
}
