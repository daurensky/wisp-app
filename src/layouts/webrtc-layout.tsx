import {
  Connection,
  OnIceCandidate,
  PeerStreams,
  WebRTCContext,
  WebRTCContextValue,
} from '@/context/webrtc-context'
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
  const [connection, setConnection] = useState<Connection | null>(null)

  const peerConnections = useRef<Record<string, RTCPeerConnection>>({})

  const localStream = useRef<MediaStream | null>(null)

  const [peers, setPeers] = useState<Record<string, PeerStreams>>({})

  const pendingIceCandidates = useRef<Record<string, RTCIceCandidateInit[]>>({})

  const [localDisplayStream, setLocalDescription] =
    useState<MediaStream | null>(null)

  const displaySenders = useRef<Record<string, RTCRtpSender[]>>({})

  const initLocalStream = useCallback(async () => {
    if (localStream.current) {
      return localStream.current
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    })

    localStream.current = stream

    return stream
  }, [])

  const stopLocalStream = useCallback(() => {
    if (!localStream.current) return

    localStream.current.getTracks().forEach(track => track.stop())
    localStream.current = null
  }, [])

  const createPeerConnection = useCallback(
    ({
      remoteUserId,
      stream,
      onIceCandidate,
    }: {
      remoteUserId: string
      stream: MediaStream
      onIceCandidate: OnIceCandidate
    }) => {
      const pc = new RTCPeerConnection(servers)

      stream.getTracks().forEach(track => pc.addTrack(track, stream))

      pc.onicecandidate = event => {
        if (event.candidate) {
          onIceCandidate(event.candidate)
        }
      }

      pc.ontrack = event => {
        const remoteStream = event.streams[0]
        const hasVideoStream = remoteStream.getVideoTracks().length > 0
        const isDisplayStream = hasVideoStream

        console.log({ isDisplayStream })

        setPeers(prev => {
          const currentStreams = prev[remoteUserId] || {
            mainStream: null,
            displayStream: null,
          }

          let newStreamData: PeerStreams

          if (isDisplayStream) {
            newStreamData = {
              ...currentStreams,
              displayStream: remoteStream,
            }
          } else {
            newStreamData = {
              ...currentStreams,
              mainStream: remoteStream,
            }
          }

          return {
            ...prev,
            [remoteUserId]: newStreamData,
          }
        })
      }

      peerConnections.current[remoteUserId] = pc

      return pc
    },
    []
  )

  const createOffer = useCallback<WebRTCContextValue['createOffer']>(
    async ({ remoteUserId, onIceCandidate }) => {
      const stream = await initLocalStream()

      const pc = createPeerConnection({ remoteUserId, stream, onIceCandidate })

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      return offer
    },
    [createPeerConnection, initLocalStream]
  )

  const handleOffer = useCallback<WebRTCContextValue['handleOffer']>(
    async ({ from, sdp, onIceCandidate }) => {
      const stream = await initLocalStream()

      const pc = createPeerConnection({
        remoteUserId: from,
        stream,
        onIceCandidate,
      })

      await pc.setRemoteDescription(
        new RTCSessionDescription({ type: 'offer', sdp })
      )

      if (pendingIceCandidates.current[from]) {
        pendingIceCandidates.current[from].forEach(candidate => {
          pc.addIceCandidate(new RTCIceCandidate(candidate))
        })

        pendingIceCandidates.current[from] = []
      }

      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)

      return answer
    },
    [createPeerConnection, initLocalStream, pendingIceCandidates]
  )

  const handleAnswer = useCallback<WebRTCContextValue['handleAnswer']>(
    async ({ from, sdp }) => {
      const pc = peerConnections.current[from]

      if (!pc) {
        throw new Error('User not connected or PC not initialized')
      }

      if (pc.signalingState !== 'have-local-offer') {
        console.warn(`Unexpected signaling state: ${pc.signalingState}`)
        // В реальном приложении здесь может потребоваться пересоздание Offer/PC
        return
      }

      await pc.setRemoteDescription(
        new RTCSessionDescription({ type: 'answer', sdp })
      )

      if (pendingIceCandidates.current[from]) {
        pendingIceCandidates.current[from].forEach(candidate => {
          pc.addIceCandidate(new RTCIceCandidate(candidate))
        })

        pendingIceCandidates.current[from] = []
      }
    },
    [pendingIceCandidates]
  )

  const handleCandidate = useCallback<WebRTCContextValue['handleCandidate']>(
    async ({ from, candidate }) => {
      const pc = peerConnections.current[from]

      if (!pc) {
        return
      }

      if (!pc.remoteDescription) {
        if (!pendingIceCandidates.current[from]) {
          pendingIceCandidates.current[from] = []
        }
        pendingIceCandidates.current[from].push(candidate)

        return
      }

      await pc.addIceCandidate(new RTCIceCandidate(candidate))
    },
    []
  )

  const removePeer = useCallback<WebRTCContextValue['removePeer']>(
    ({ remoteUserId }) => {
      const pc = peerConnections.current[remoteUserId]

      if (!pc) {
        throw new Error(`User not connected ${remoteUserId}`)
      }

      pc.ontrack = null
      pc.onicecandidate = null
      pc.onconnectionstatechange = null

      pc.close()

      delete peerConnections.current[remoteUserId]
      setPeers(prev => {
        const copy = { ...prev }
        delete copy[remoteUserId]
        return copy
      })
    },
    []
  )

  const validatePeers = useCallback<WebRTCContextValue['validatePeers']>(
    ({ connectedUserIds }) => {
      for (const userId in peerConnections.current) {
        if (!connectedUserIds.has(userId)) {
          removePeer({ remoteUserId: userId })
        }
      }
    },
    [removePeer]
  )

  const closeAll = useCallback<WebRTCContextValue['closeAll']>(() => {
    Object.values(peerConnections.current).forEach(pc => {
      pc.ontrack = null
      pc.onicecandidate = null
      pc.onconnectionstatechange = null

      if (pc.signalingState !== 'closed') {
        pc.close()
      }
    })

    peerConnections.current = {}
    setPeers({})

    setConnection(null)
    stopLocalStream()
  }, [stopLocalStream])

  const getPeersPing = useCallback<
    WebRTCContextValue['getPeersPing']
  >(async () => {
    const ping: Record<string, number> = {}

    for (const userId in peerConnections.current) {
      const pc = peerConnections.current[userId]

      const stats = await pc.getStats()

      let rtt = null
      stats.forEach(report => {
        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          rtt = report.currentRoundTripTime
        }
      })

      if (rtt === null) {
        continue
      }

      ping[userId] = Math.round(rtt * 1000)
    }

    return ping
  }, [])

  const initLocalDisplayStream = useCallback(async () => {
    if (localDisplayStream) {
      return localDisplayStream
    }

    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true,
    })

    setLocalDescription(stream)

    return stream
  }, [localDisplayStream])

  const stopScreenShare = useCallback<
    WebRTCContextValue['stopScreenShare']
  >(async () => {
    if (!localDisplayStream) return

    localDisplayStream.getTracks().forEach(track => track.stop())
    setLocalDescription(null)

    Object.entries(peerConnections.current).forEach(
      async ([remoteUserId, pc]) => {
        const senders = displaySenders.current[remoteUserId]

        if (!senders) return

        senders.forEach(sender => pc.removeTrack(sender))
        delete displaySenders.current[remoteUserId]

        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
      }
    )
  }, [localDisplayStream])

  const startScreenShare = useCallback<
    WebRTCContextValue['startScreenShare']
  >(async () => {
    const screenStream = await initLocalDisplayStream()

    Object.entries(peerConnections.current).forEach(
      async ([remoteUserId, pc]) => {
        const currentSenders: RTCRtpSender[] = []

        screenStream.getTracks().forEach(track => {
          const sender = pc.addTrack(track, screenStream)
          currentSenders.push(sender)
        })

        displaySenders.current[remoteUserId] = currentSenders

        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)

        screenStream.getVideoTracks()[0].onended = () => {
          stopScreenShare()
        }
      }
    )
  }, [initLocalDisplayStream, stopScreenShare])

  return (
    <WebRTCContext.Provider
      value={{
        connection,
        initConnection: setConnection,
        localStream,
        peers,
        initLocalStream,
        createOffer,
        handleOffer,
        handleAnswer,
        handleCandidate,
        removePeer,
        validatePeers,
        closeAll,
        getPeersPing,

        localDisplayStream,
        startScreenShare,
        stopScreenShare,
      }}
    >
      <Outlet />
    </WebRTCContext.Provider>
  )
}
