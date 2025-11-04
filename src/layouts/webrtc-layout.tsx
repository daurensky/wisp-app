import { useAuth } from '@/context/auth-context'
import { WebRTCContext } from '@/context/webrtc-context'
import { useCallback, useRef, useState } from 'react'
import { Outlet } from 'react-router'

const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
  iceCandidatePoolSize: 10,
}

export default function WebRTCLayout() {
  const { user } = useAuth()

  const [currentOfferId, setCurrentOfferId] = useState<string | null>(null)

  const peerConnections = useRef<Record<string, RTCPeerConnection>>({})

  const localStream = useRef<MediaStream | null>(null)
  const remoteStreams = useRef<Record<string, MediaStream>>({})

  const createOffer = useCallback(
    async ({
      id,
      onIceCandidate,
      video,
    }: {
      id: string
      onIceCandidate: (candidate: RTCIceCandidateInit) => void
      video: boolean
    }) => {
      const pc = new RTCPeerConnection(servers)
      const ls = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video,
      })
      const rs = new MediaStream()

      ls.getTracks().forEach(track => {
        pc.addTrack(track, ls)
      })

      pc.ontrack = event => {
        event.streams[0].getTracks().forEach(track => {
          rs.addTrack(track)
        })
      }

      peerConnections.current[user.id] = pc
      localStream.current = ls
      remoteStreams.current[user.id] = rs

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      pc.onicecandidate = async event => {
        if (event.candidate) {
          onIceCandidate(event.candidate.toJSON())
        }
      }

      setCurrentOfferId(id)

      return offer
    },
    [user.id]
  )

  const createAnswer = useCallback(
    async (offer: RTCSessionDescriptionInit) => {
      const pc = peerConnections.current[user.id]

      if (!pc) {
        throw new Error('User not connected')
      }

      await pc.setRemoteDescription(new RTCSessionDescription(offer))

      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)

      return answer
    },
    [user.id]
  )

  const addIceCandidate = useCallback(
    async (candidate: RTCIceCandidateInit) => {
      const pc = peerConnections.current[user.id]

      if (!pc) {
        throw new Error('User not connected')
      }

      await pc.addIceCandidate(new RTCIceCandidate(candidate))
    },
    [user.id]
  )

  const setRemoteDescription = useCallback(
    async (answer: RTCSessionDescriptionInit) => {
      const pc = peerConnections.current[user.id]

      if (!pc) {
        throw new Error('User not connected')
      }

      await pc.setRemoteDescription(new RTCSessionDescription(answer))
    },
    [user.id]
  )

  const getPing = useCallback(async () => {
    const pc = peerConnections.current[user.id]

    if (!pc) {
      throw new Error('User not connected')
    }

    const stats = await pc.getStats()

    let rtt = null
    stats.forEach(report => {
      if (report.type === 'candidate-pair' && report.state === 'succeeded') {
        rtt = report.currentRoundTripTime
      }
    })

    if (rtt === null) {
      return null
    }

    return Math.round(rtt * 1000)
  }, [user.id])

  const closeConnection = useCallback(async () => {
    localStream.current?.getTracks().forEach(track => track.stop())

    Object.values(remoteStreams.current).forEach(rs => {
      rs.getTracks().forEach(track => track.stop())
    })

    const pc = peerConnections.current[user.id]

    if (pc) {
      pc.onicecandidate = null
      pc.ontrack = null
      pc.close()
    }

    peerConnections.current = {}
    localStream.current = null
    remoteStreams.current = {}

    setCurrentOfferId(null)
  }, [user.id])

  return (
    <WebRTCContext.Provider
      value={{
        currentOfferId,
        localStream,
        remoteStreams,
        createOffer,
        createAnswer,
        addIceCandidate,
        setRemoteDescription,
        getPing,
        closeConnection,
      }}
    >
      <Outlet />
    </WebRTCContext.Provider>
  )
}
