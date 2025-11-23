import { connectPeerConnection, PeerConnection } from '@/api/peer-connection'
import { Server } from '@/api/server'
import { ServerChannel } from '@/api/server-channel'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/auth-context'
import { useWebRTC } from '@/context/webrtc-context'
import { cn } from '@/lib/utils'
import { useEcho } from '@laravel/echo-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Volume2 } from 'lucide-react'
import { toast } from 'sonner'

type SignalPayload = {
  type: string
  from: string
  to: string
  sdp: string
}

export default function SidebarVoiceChannel({
  server,
  channel,
  peers,
}: {
  server: Server
  channel: ServerChannel
  peers: PeerConnection[]
}) {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const echo = useEcho(`server.${server.id}`)

  const {
    initConnection,
    initLocalStream,
    createOffer,
    handleOffer,
    handleAnswer,
    handleCandidate,
    closeAll,
  } = useWebRTC()

  const connectMutation = useMutation({
    mutationKey: ['server', server.id],
    mutationFn: connectPeerConnection,
    onMutate: async json => {
      const peer: PeerConnection = {
        ...json,
        id: '',
        user,
        screen_sharing: false,
      }

      await queryClient.cancelQueries({
        queryKey: ['server', server.id],
      })

      const previousServer = queryClient.getQueryData<Server>([
        'server',
        server.id,
      ])

      queryClient.setQueryData<Server>(['server', server.id], old =>
        !old
          ? old
          : {
              ...old,
              peers: [
                ...old.peers.filter(p => p.user.id !== peer.user.id),
                peer,
              ].sort((a, b) => a.user.name.localeCompare(b.user.name)),
            }
      )

      return { previousServer }
    },
    onError: (error, _, context) => {
      if (context?.previousServer) {
        queryClient.setQueryData(['server', server.id], context.previousServer)
      }
      toast(error.message)
    },
    onSettled: async peers => {
      if (!peers) {
        toast('Invalid response')
        return
      }

      closeAll()

      const echoChannel = echo.channel()

      initConnection({
        label: `${server.name} / ${channel.name}`,
        connectableType: 'server',
        connectableId: server.id,
        onClose: () => {
          echoChannel.stopListeningForWhisper(
            '.channel.signal',
            handleChannelSignal
          )
          echoChannel.stopListeningForWhisper(
            '.channel.candidate',
            handleChannelCandidate
          )
        },
        onRenegotiation: offers => {
          for (const [remoteUserId, offer] of Object.entries(offers)) {
            if (!offer.sdp) {
              console.warn('Offer sdp not set')
              continue
            }

            echoChannel.whisper('.channel.signal', {
              type: 'offer',
              from: user.id,
              to: remoteUserId,
              sdp: offer.sdp,
            } as SignalPayload)
          }
        },
      })

      await initLocalStream()

      echoChannel.listenForWhisper('.channel.signal', handleChannelSignal)
      echoChannel.listenForWhisper('.channel.candidate', handleChannelCandidate)

      for (const peer of peers) {
        if (
          peer.user.id === user.id ||
          peer.connectable_child_id !== channel.id
        ) {
          continue
        }

        const offer = await createOffer({
          remoteUserId: peer.user.id,
          onIceCandidate: candidate =>
            echoChannel.whisper('.channel.candidate', {
              from: user.id,
              to: peer.user.id,
              candidate,
            }),
        })

        if (!offer.sdp) {
          toast('WebRTC offer error')
          continue
        }

        echoChannel.whisper('.channel.signal', {
          type: 'offer',
          from: user.id,
          to: peer.user.id,
          sdp: offer.sdp,
        } as SignalPayload)
      }
    },
  })

  const handleChannelSignal = async (payload: SignalPayload) => {
    const echoChannel = echo.channel()

    if (payload.type === 'offer' && payload.to === user.id) {
      const answer = await handleOffer({
        from: payload.from,
        sdp: payload.sdp,
        onIceCandidate: candidate =>
          echoChannel.whisper('.channel.candidate', {
            from: user.id,
            to: payload.from,
            candidate,
          }),
      })

      if (!answer.sdp) {
        toast('WebRTC answer error')
        return
      }

      echoChannel.whisper('.channel.signal', {
        type: 'answer',
        from: user.id,
        to: payload.from,
        sdp: answer.sdp,
      } as SignalPayload)

      return
    }

    if (payload.type === 'answer' && payload.to === user.id) {
      await handleAnswer({ from: payload.from, sdp: payload.sdp })

      return
    }
  }

  const handleChannelCandidate = async ({
    to,
    from,
    candidate,
  }: {
    to: string
    from: string
    candidate: RTCIceCandidateInit
  }) => {
    if (to !== user.id) return

    await handleCandidate({ from, candidate })
  }

  const connect = async (channel: ServerChannel) => {
    await connectMutation.mutateAsync({
      connectable_type: 'server',
      connectable_id: server.id,
      connectable_child_id: channel.id,
      mic_muted: false,
      audio_muted: false,
    })
  }

  const handleClick = () => {
    connect(channel)
  }

  return (
    <>
      <Button onClick={handleClick} variant="navlink" className="w-full">
        <Volume2 />
        {channel.name}
      </Button>

      <ul>
        {peers.map(peer => (
          <li
            key={peer.user.id}
            className={cn('flex', peer.id === '' && 'opacity-50')}
          >
            <Button variant="navlink" className="grow ml-4">
              <img
                src={peer.user.avatar}
                alt=""
                className="w-6 h-6 rounded-full"
              />

              <span className="truncate">{peer.user.name}</span>

              {peer.screen_sharing && (
                <Badge variant="destructive" className="ml-auto uppercase">
                  В эфире
                </Badge>
              )}
            </Button>
          </li>
        ))}
      </ul>
    </>
  )
}
