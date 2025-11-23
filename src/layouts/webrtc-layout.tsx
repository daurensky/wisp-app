import {
  OnIceCandidate,
  RemoteStream,
  WebRTCConnection,
  WebRTCContext,
  WebRTCContextValue,
} from '@/context/webrtc-context'
import { useRef, useState } from 'react'
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
  const [connection, setConnection] = useState<WebRTCConnection | null>(null)

  const peerConnections = useRef<Record<string, RTCPeerConnection>>({})

  const localStream = useRef<MediaStream | null>(null)

  const [remoteStreams, setRemoteStreams] = useState<
    Record<string, RemoteStream>
  >({})

  const pendingIceCandidates = useRef<Record<string, RTCIceCandidateInit[]>>({})

  const [localDisplayStream, setLocalDescription] =
    useState<MediaStream | null>(null)

  const displaySenders = useRef<Record<string, RTCRtpSender[]>>({})

  const initLocalStream = async () => {
    if (localStream.current) {
      return localStream.current
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    })

    localStream.current = stream

    return stream
  }

  const stopLocalStream = () => {
    if (!localStream.current) return

    localStream.current.getTracks().forEach(track => track.stop())
    localStream.current = null
  }

  const createPeerConnection = ({
    remoteUserId,
    stream,
    onIceCandidate,
  }: {
    remoteUserId: string
    stream: MediaStream
    onIceCandidate: OnIceCandidate
  }) => {
    const pc = new RTCPeerConnection(servers)

    stream.getTracks().forEach(track => {
      const sender = pc.addTrack(track, stream)

      if (track.kind === 'video') {
        const codecs = RTCRtpSender.getCapabilities('video')?.codecs
        const h264 = codecs?.filter(c => c.mimeType === 'video/H264')

        if (h264?.length) {
          pc.getTransceivers().forEach(transceiver => {
            if (transceiver.sender.track === track) {
              transceiver.setCodecPreferences(h264)
            }
          })
        }

        const params = sender.getParameters()
        params.encodings = [{ maxBitrate: 4_000_000, maxFramerate: 60 }]
        sender.setParameters(params)
      }
    })

    pc.onicecandidate = event => {
      if (event.candidate) {
        onIceCandidate(event.candidate)
      }
    }

    pc.ontrack = event => {
      const remoteStream = event.streams[0]
      const hasVideoStream = remoteStream.getVideoTracks().length > 0
      const isDisplayStream = hasVideoStream

      setRemoteStreams(prev => {
        const currentStreams = prev[remoteUserId] || {
          mainStream: null,
          displayStream: null,
        }

        let newStreamData: RemoteStream

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
  }

  const createOffer: WebRTCContextValue['createOffer'] = async ({
    remoteUserId,
    onIceCandidate,
  }) => {
    const stream = await initLocalStream()

    const pc = createPeerConnection({ remoteUserId, stream, onIceCandidate })

    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)

    return offer
  }

  const handleOffer: WebRTCContextValue['handleOffer'] = async ({
    from,
    sdp,
    onIceCandidate,
  }) => {
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
  }

  const handleAnswer: WebRTCContextValue['handleAnswer'] = async ({
    from,
    sdp,
  }) => {
    const pc = peerConnections.current[from]

    if (!pc) {
      throw new Error('User not connected or PC not initialized')
    }

    if (pc.signalingState !== 'have-local-offer') {
      console.warn(`Unexpected signaling state: ${pc.signalingState}`)
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
  }

  const handleCandidate: WebRTCContextValue['handleCandidate'] = async ({
    from,
    candidate,
  }) => {
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
  }

  const removePeer: WebRTCContextValue['removePeer'] = ({ remoteUserId }) => {
    const pc = peerConnections.current[remoteUserId]

    if (!pc) {
      console.warn(`User not connected ${remoteUserId}`)
      return
    }

    pc.ontrack = null
    pc.onicecandidate = null
    pc.onconnectionstatechange = null

    pc.close()

    delete peerConnections.current[remoteUserId]
    setRemoteStreams(prev => {
      const copy = { ...prev }
      delete copy[remoteUserId]
      return copy
    })
  }

  const closeAll: WebRTCContextValue['closeAll'] = () => {
    if (!connection) return

    Object.values(peerConnections.current).forEach(pc => {
      pc.ontrack = null
      pc.onicecandidate = null
      pc.onconnectionstatechange = null

      if (pc.signalingState !== 'closed') {
        pc.close()
      }
    })

    peerConnections.current = {}
    setRemoteStreams({})

    stopLocalStream()

    if (localDisplayStream) {
      localDisplayStream.getTracks().forEach(track => track.stop())
      setLocalDescription(null)
    }

    displaySenders.current = {}

    connection.onClose()

    setConnection(null)
  }

  const getPeersPing: WebRTCContextValue['getPeersPing'] = async () => {
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
  }

  const initLocalDisplayStream = async () => {
    if (localDisplayStream) {
      return localDisplayStream
    }

    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true,
    })

    setLocalDescription(stream)

    return stream
  }

  const startScreenShare: WebRTCContextValue['startScreenShare'] = async () => {
    if (!connection) return

    const screenStream = await initLocalDisplayStream()

    const offers: Record<string, RTCSessionDescriptionInit> = {}

    for (const [remoteUserId, pc] of Object.entries(peerConnections.current)) {
      if (displaySenders.current[remoteUserId]?.length > 0) {
        continue
      }

      const currentSenders: RTCRtpSender[] = []

      screenStream.getTracks().forEach(track => {
        const sender = pc.addTrack(track, screenStream)
        currentSenders.push(sender)
      })

      displaySenders.current[remoteUserId] = currentSenders

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      offers[remoteUserId] = offer

      screenStream.getVideoTracks()[0].onended = () => {
        stopScreenShare()
      }
    }

    connection.onRenegotiation(offers)
  }

  const stopScreenShare: WebRTCContextValue['stopScreenShare'] = async () => {
    if (!connection || !localDisplayStream) return

    localDisplayStream.getTracks().forEach(track => track.stop())
    setLocalDescription(null)

    const offers: Record<string, RTCSessionDescriptionInit> = {}

    for (const [remoteUserId, pc] of Object.entries(peerConnections.current)) {
      const senders = displaySenders.current[remoteUserId]

      if (!senders) continue

      senders.forEach(sender => pc.removeTrack(sender))
      delete displaySenders.current[remoteUserId]

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      offers[remoteUserId] = offer
    }

    connection.onRenegotiation(offers)
  }

  return (
    <WebRTCContext.Provider
      value={{
        connection,
        initConnection: setConnection,

        localStream,
        remoteStreams,
        initLocalStream,
        createOffer,
        handleOffer,
        handleAnswer,
        handleCandidate,
        removePeer,
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
