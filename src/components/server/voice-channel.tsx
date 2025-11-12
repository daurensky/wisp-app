import { Server, ServerCategory } from '@/api/server'
import {
  connectChannel,
  getServerChannel,
  ServerChannel,
} from '@/api/server-channel'
import { User } from '@/api/user'
import { useAuth } from '@/context/auth-context'
import { useWebRTC } from '@/context/webrtc-context'
import { useEcho } from '@laravel/echo-react'
import { useQueryClient } from '@tanstack/react-query'
import { Volume2 } from 'lucide-react'
import { useCallback, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { Button } from '../ui/button'

type SignalPayload = {
  type: string
  from: string
  to: string
  sdp: string
}

export default function VoiceChannel({
  server,
  category,
  channel,
}: {
  server: Server
  category: ServerCategory
  channel: ServerChannel
}) {
  const queryClient = useQueryClient()

  const { user } = useAuth()

  const {
    connection,
    initConnection,
    initLocalStream,
    createOffer,
    handleOffer,
    handleAnswer,
    handleCandidate,
    validatePeers,
  } = useWebRTC()

  const connected = useMemo(
    () =>
      connection &&
      connection.connectedTo === 'server-channel' &&
      connection.connectedId === channel.id,
    [channel.id, connection]
  )

  useEcho<User[]>(
    `server-channel.${channel.id}`,
    '.channel.members.updated',
    members => {
      console.log(connected)

      if (connected) {
        validatePeers({
          connectedUserIds: new Set(members.map(({ id }) => id)),
        })
      }

      queryClient.setQueryData<Server>(['server', server.id], old => {
        if (!old) return old

        const categoryIndex = old.categories.findIndex(
          ({ id }) => id === category.id
        )
        if (categoryIndex === -1) return old

        const channelIndex = old.categories[categoryIndex].channels.findIndex(
          ({ id }) => id === channel.id
        )
        if (channelIndex === -1) return old

        const updatedChannel = {
          ...old.categories[categoryIndex].channels[channelIndex],
          members,
        }

        const updatedCategory = {
          ...old.categories[categoryIndex],
          channels: old.categories[categoryIndex].channels.map((ch, i) =>
            i === channelIndex ? updatedChannel : ch
          ),
        }

        return {
          ...old,
          categories: old.categories.map((cat, i) =>
            i === categoryIndex ? updatedCategory : cat
          ),
        }
      })
    },
    [connected]
  )

  const echo = useEcho(`server-channel.${channel.id}`)

  const handleChannelSignal = useCallback(
    async (payload: SignalPayload) => {
      console.log('signal!')

      if (!connected) return

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
    },
    [connected, echo, handleAnswer, handleOffer, user.id]
  )

  const handleChannelCandidate = useCallback(
    async ({
      to,
      from,
      candidate,
    }: {
      to: string
      from: string
      candidate: RTCIceCandidateInit
    }) => {
      if (!connected) return

      if (to !== user.id) return

      await handleCandidate({ from, candidate })
    },
    [connected, handleCandidate, user.id]
  )

  useEffect(() => {
    const echoChannel = echo.channel()

    echoChannel.listenForWhisper('.channel.signal', handleChannelSignal)
    echoChannel.listenForWhisper('.channel.candidate', handleChannelCandidate)

    return () => {
      echoChannel.stopListeningForWhisper(
        '.channel.signal',
        handleChannelSignal
      )
      echoChannel.stopListeningForWhisper(
        '.channel.candidate',
        handleChannelCandidate
      )
    }
  }, [echo, handleChannelCandidate, handleChannelSignal])

  const connect = useCallback(async () => {
    const echoChannel = echo.channel()

    await connectChannel(channel.id)

    await initLocalStream()

    initConnection({
      connectedTo: 'server-channel',
      connectedId: channel.id,
      connectedLabel: channel.name,
    })

    // TODO: Refactor
    const { members } = await getServerChannel(channel.id)

    for (const member of members) {
      if (member.id === user.id) continue

      const offer = await createOffer({
        remoteUserId: member.id,
        onIceCandidate: candidate =>
          echoChannel.whisper('.channel.candidate', {
            from: user.id,
            to: member.id,
            candidate,
          }),
      })

      if (!offer.sdp) {
        toast('WebRTC offer error')
        return
      }

      echoChannel.whisper('.channel.signal', {
        type: 'offer',
        from: user.id,
        to: member.id,
        sdp: offer.sdp,
      } as SignalPayload)
    }
  }, [
    channel.id,
    channel.name,
    createOffer,
    echo,
    initConnection,
    initLocalStream,
    user.id,
  ])

  return (
    <>
      <Button onClick={connect} variant="navlink" className="w-full">
        <Volume2 /> {channel.name}
      </Button>

      {channel.members.map(({ id, name }) => (
        <p key={id}>{name}</p>
      ))}
    </>
  )
}
