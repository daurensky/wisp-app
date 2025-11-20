import { ServerChannel } from '@/api/server-channel'
import {
  connectServerChannelMember,
  deleteServerChannelMember,
  getServerChannelMembers,
  ServerChannelMember,
  updateServerChannelMember,
} from '@/api/server-channel-member'
import { useAuth } from '@/context/auth-context'
import { useConnection } from '@/context/connection-context'
import { useWebRTC } from '@/context/webrtc-context'
import { cn } from '@/lib/utils'
import { useEcho } from '@laravel/echo-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Volume2 } from 'lucide-react'
import { useCallback } from 'react'
import { toast } from 'sonner'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'

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

  const connectMutation = useMutation({
    mutationKey: ['server-channel-members', channel.id],
    mutationFn: connectServerChannelMember,
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

      return { previousMembers }
    },
    onError: (error, _, context) => {
      if (context?.previousMembers) {
        queryClient.setQueryData(
          ['server-channel-members', channel.id],
          context.previousMembers
        )
      }
      toast(error.message)
    },
  })

  const deleteMutation = useMutation({
    mutationKey: ['server-channel-members', channel.id],
    mutationFn: deleteServerChannelMember,
    onMutate: async memberId => {
      await queryClient.cancelQueries({
        queryKey: ['server-channel-members', channel.id],
      })

      const previousMembers = queryClient.getQueryData<ServerChannelMember[]>([
        'server-channel-members',
        channel.id,
      ])

      queryClient.setQueryData<ServerChannelMember[]>(
        ['server-channel-members', channel.id],
        old => (old ? old.filter(member => member.id !== memberId) : [])
      )

      return { previousMembers }
    },
    onError: (error, _, context) => {
      if (context?.previousMembers) {
        queryClient.setQueryData(
          ['server-channel-members', channel.id],
          context.previousMembers
        )
      }
      toast(error.message)
    },
  })

  const updateMutation = useMutation({
    mutationKey: ['server-channel-members', channel.id],
    mutationFn: updateServerChannelMember,
    onMutate: async ({ memberId, json }) => {
      await queryClient.cancelQueries({
        queryKey: ['server-channel-members', channel.id],
      })

      const previousMembers = queryClient.getQueryData<ServerChannelMember[]>([
        'server-channel-members',
        channel.id,
      ])

      queryClient.setQueryData<ServerChannelMember[]>(
        ['server-channel-members', channel.id],
        old =>
          old
            ? old.flatMap(member =>
                member.id === memberId ? [{ ...member, ...json }] : [member]
              )
            : old
      )

      return { previousMembers }
    },
    onError: (error, _, context) => {
      if (context?.previousMembers) {
        queryClient.setQueryData(
          ['server-channel-members', channel.id],
          context.previousMembers
        )
      }
      toast(error.message)
    },
  })

  const webRTC = useWebRTC()

  const connection = useConnection()

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

      webRTC.validatePeers({
        connectedUserIds: new Set(members.map(({ user }) => user.id)),
      })
    },
    []
  )

  const echo = useEcho(`server-channel.${channel.id}`)

  const handleChannelSignal = useCallback(
    async (payload: SignalPayload) => {
      const echoChannel = echo.channel()

      console.log(payload)

      if (payload.type === 'offer' && payload.to === user.id) {
        const answer = await webRTC.handleOffer({
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
        await webRTC.handleAnswer({ from: payload.from, sdp: payload.sdp })

        return
      }
    },
    [echo, user.id, webRTC]
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
      if (to !== user.id) return

      await webRTC.handleCandidate({ from, candidate })
    },
    [user.id, webRTC]
  )

  const disconnect = useCallback(
    async (memberId: string) => {
      const echoChannel = echo.channel()

      await deleteMutation.mutateAsync(memberId)

      webRTC.closeAll()

      connection.reset()

      echoChannel.stopListeningForWhisper(
        '.channel.signal',
        handleChannelSignal
      )
      echoChannel.stopListeningForWhisper(
        '.channel.candidate',
        handleChannelCandidate
      )
    },
    [
      connection,
      deleteMutation,
      echo,
      handleChannelCandidate,
      handleChannelSignal,
      webRTC,
    ]
  )

  const startScreenShare = useCallback(
    async (memberId: string) => {
      console.log('qwe')

      const echoChannel = echo.channel()

      const offers = await webRTC.startScreenShare()

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

      await updateMutation.mutateAsync({
        memberId,
        json: { is_screen_sharing: true },
      })
    },
    [echo, updateMutation, user.id, webRTC]
  )

  const stopScreenShare = useCallback(
    async (memberId: string) => {
      const echoChannel = echo.channel()

      const offers = await webRTC.stopScreenShare()

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

      await updateMutation.mutateAsync({
        memberId,
        json: { is_screen_sharing: false },
      })
    },
    [echo, updateMutation, user.id, webRTC]
  )

  const connect = useCallback(async () => {
    const echoChannel = echo.channel()

    const member = await connectMutation.mutateAsync({
      server_channel_id: channel.id,
    })

    await webRTC.initLocalStream()

    const memberNameMap: Record<string, string | null> = {}

    for (const member of members) {
      if (member.user.id === user.id) return

      const offer = await webRTC.createOffer({
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
        continue
      }

      echoChannel.whisper('.channel.signal', {
        type: 'offer',
        from: user.id,
        to: member.user.id,
        sdp: offer.sdp,
      } as SignalPayload)

      memberNameMap[member.id] = member.user.name
    }

    connection.init({
      id: channel.id,
      connectable: 'server-channel',
      label: channel.name,
      memberNameMap,
      disconnect: () => disconnect(member.id),
      startScreenShare: () => startScreenShare(member.id),
      stopScreenShare: () => stopScreenShare(member.id),
    })

    echoChannel.listenForWhisper('.channel.signal', handleChannelSignal)
    echoChannel.listenForWhisper('.channel.candidate', handleChannelCandidate)
  }, [
    channel.id,
    channel.name,
    connection,
    connectMutation,
    disconnect,
    echo,
    handleChannelCandidate,
    handleChannelSignal,
    members,
    startScreenShare,
    stopScreenShare,
    user.id,
    webRTC,
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
