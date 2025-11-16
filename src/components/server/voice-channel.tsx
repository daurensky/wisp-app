import { ServerChannel } from '@/api/server-channel'
import {
  createServerChannelMember,
  getServerChannelMembers,
  ServerChannelMember,
} from '@/api/server-channel-member'
import { useAuth } from '@/context/auth-context'
import { useWebRTC } from '@/context/webrtc-context'
import { useEcho } from '@laravel/echo-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Volume2 } from 'lucide-react'
import { useCallback, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { cn } from '@/lib/utils'

type SignalPayload = {
  type: string
  from: string
  to: string
  sdp: string
}

export default function VoiceChannel({ channel }: { channel: ServerChannel }) {
  const queryClient = useQueryClient()

  const { user } = useAuth()

  const { data: members, refetch } = useQuery({
    queryKey: ['server-channel-members', channel.id],
    queryFn: () => getServerChannelMembers({ server_channel_id: channel.id }),
    initialData: channel.members,
    enabled: false,
  })

  const createMutation = useMutation({
    mutationKey: ['server-channel-members', channel.id],
    mutationFn: createServerChannelMember,
    onMutate: async () => {
      const queries = queryClient
        .getQueryCache()
        .findAll({ queryKey: ['server-channel-members'], exact: false })

      queries.forEach(query => {
        const key = query.queryKey
        const data = query.state.data

        if (!data) return

        queryClient.setQueryData<ServerChannelMember[]>(key, old =>
          old ? old.filter(oldMember => oldMember.user.id !== user.id) : old
        )
      })

      const member: ServerChannelMember = {
        id: '',
        user,
        server_channel_id: channel.id,
        is_screen_sharing: false,
      }

      await queryClient.cancelQueries({
        queryKey: ['server-channel-members', channel.id],
      })

      const previousMembers = queryClient.getQueryData<ServerChannelMember[]>([
        'server-channel-members',
        channel.id,
      ])

      queryClient.setQueryData<ServerChannelMember[]>(
        ['server-channel-members', channel.id],
        old => (old ? [...old, member] : [member])
      )

      return { previousTodos: previousMembers }
    },
    onError: error => {
      toast(error.message)
    },
  })

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

  useEcho<ServerChannelMember>(
    `server-channel.${channel.id}`,
    [
      '.ServerChannelMemberCreated',
      '.ServerChannelMemberUpdated',
      '.ServerChannelMemberDeleted',
    ],
    async member => {
      const queries = queryClient
        .getQueryCache()
        .findAll({ queryKey: ['server-channel-members'], exact: false })

      queries.forEach(query => {
        const key = query.queryKey
        const data = query.state.data

        if (!data) return

        queryClient.setQueryData<ServerChannelMember[]>(key, old =>
          old ? old.filter(oldMember => oldMember.id !== member.id) : old
        )
      })

      const { data: members } = await refetch()

      if (!members) return

      validatePeers({
        connectedUserIds: new Set(members.map(({ user }) => user.id)),
      })
    },
    [connected]
  )

  const echo = useEcho(`server-channel.${channel.id}`)

  const handleChannelSignal = useCallback(
    async (payload: SignalPayload) => {
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

    const member = await createMutation.mutateAsync({
      server_channel_id: channel.id,
    })

    await initLocalStream()

    initConnection({
      connectedTo: 'server-channel',
      connectedId: channel.id,
      connectedLabel: channel.name,
      connectorId: member.id,
    })

    for (const member of members) {
      if (member.user.id === user.id) continue

      const offer = await createOffer({
        remoteUserId: member.user.id,
        onIceCandidate: candidate =>
          echoChannel.whisper('.channel.candidate', {
            from: user.id,
            to: member.user.id,
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
        to: member.user.id,
        sdp: offer.sdp,
      } as SignalPayload)
    }
  }, [
    channel.id,
    channel.name,
    createMutation,
    createOffer,
    echo,
    initConnection,
    initLocalStream,
    members,
    user.id,
  ])

  return (
    <>
      <Button onClick={connect} variant="navlink" className="w-full">
        <Volume2 />
        {channel.name}
      </Button>

      <ul>
        {members.map(member => (
          <li
            key={member.user.id}
            className={cn('flex', member.id === '' && 'opacity-50')}
          >
            <Button variant="navlink" className="grow ml-4">
              <img
                src={member.user.avatar}
                alt=""
                className="w-6 h-6 rounded-full"
              />

              <span className="truncate">{member.user.name}</span>

              {member.is_screen_sharing && (
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
