import { getServer } from '@/api/server'
import { ServerChannel } from '@/api/server-chaannel'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useWebRTC } from '@/context/webrtc-context'
import { useEcho, useEchoModel } from '@laravel/echo-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Hash, Volume2 } from 'lucide-react'
import { useEffect } from 'react'
import { Outlet, useParams } from 'react-router'

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

  useEchoModel('App.Models.Server', id, ['ServerUpdated'], data => {
    queryClient.setQueryData(['server', id], () => data)
  })

  const echo = useEcho(`server.${id}`)

  const { createOffer, createAnswer, addIceCandidate, setRemoteDescription } =
    useWebRTC()

  useEffect(() => {
    const channel = echo.channel()

    const handleOffer = async (offer: RTCSessionDescriptionInit) => {
      const answer = await createAnswer(offer)
      channel.whisper('answer', answer)
    }

    const handleOfferCandidate = async (candidate: RTCIceCandidateInit) => {
      await addIceCandidate(candidate)
    }

    const handleAnswer = async (answer: RTCSessionDescriptionInit) => {
      await setRemoteDescription(answer)
    }

    channel.listenForWhisper('offer', handleOffer)
    channel.listenForWhisper('offer-candidate', handleOfferCandidate)
    channel.listenForWhisper('answer', handleAnswer)

    return () => {
      channel.stopListeningForWhisper('offer', handleOffer)
      channel.stopListeningForWhisper('offer-candidate', handleOfferCandidate)
      channel.stopListeningForWhisper('answer', handleAnswer)
    }
  }, [echo, addIceCandidate, createAnswer, setRemoteDescription])

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

  const connect = async ({
    id: channelId,
    name,
  }: Pick<ServerChannel, 'id' | 'name'>) => {
    const channel = echo.channel()

    const offer = await createOffer({
      id: `server:${id}:channel:${channelId}:${name} / ${server.name}`,
      onIceCandidate: candidate => {
        channel.whisper('offer-candidate', candidate)
      },
      video: false,
    })

    channel.whisper('offer', offer)
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
                      <Button variant="navlink" className="w-full">
                        <Hash /> {name}
                      </Button>
                    )}

                    {type === 'voice' && (
                      <Button
                        onClick={() => connect({ id, name })}
                        variant="navlink"
                        className="w-full"
                      >
                        <Volume2 /> {name}
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </aside>

      <Outlet />
    </>
  )
}
