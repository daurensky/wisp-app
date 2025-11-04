import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/context/auth-context'
import { useWebRTC } from '@/context/webrtc-context'
import { PhoneOff, ScreenShare, Settings } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '../ui/button'
import { Separator } from '../ui/separator'

export function ServerUserControls() {
  const { user } = useAuth()
  const {
    currentOfferId,
    localStream,
    remoteStreams,
    getPing,
    closeConnection,
  } = useWebRTC()

  // TODO: Refactor
  const [, , , , offerLabel] = currentOfferId?.split(':') || []

  const [ping, setPing] = useState<number | null>(null)

  const localAudio = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (localAudio.current) {
      localAudio.current.srcObject = localStream.current
    }
  }, [localStream.current])

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null

    if (currentOfferId) {
      intervalId = setInterval(async () => {
        getPing().then(p => setPing(p))
      }, 2_000)
    } else if (intervalId) {
      clearInterval(intervalId)
    }

    return () => {
      intervalId && clearInterval(intervalId)
    }
  }, [currentOfferId, getPing])

  const disconnect = async () => {
    await closeConnection()
  }

  return (
    <>
      <div className="bg-accent p-4 rounded-3xl grid gap-4">
        {currentOfferId !== null && (
          <>
            <div>
              <div className="hidden">
                {/* <audio ref={localAudio} autoPlay></audio> */}
                {Object.entries(remoteStreams.current)
                  .filter(([id]) => id !== user.id)
                  .map(([id, stream]) => (
                    <audio
                      key={id}
                      ref={el => {
                        if (el && stream && el.srcObject !== stream) {
                          el.srcObject = stream
                        }
                      }}
                      autoPlay
                    ></audio>
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

                  {/* TODO: Refactor */}
                  <p className="text-sm text-muted-foreground">{offerLabel}</p>
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
              {user.name || user.username}
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
