import { createContext, MutableRefObject, useContext } from 'react'

type UserId = string

interface WebRTCContextValue {
  currentOfferId: string | null

  localStream: MutableRefObject<MediaStream | null>
  remoteStreams: MutableRefObject<Record<UserId, MediaStream>>

  createOffer: ({
    id,
    onIceCandidate,
    video,
  }: {
    id: string
    onIceCandidate: (candidate: RTCIceCandidateInit) => void
    video: boolean
  }) => Promise<RTCSessionDescriptionInit>

  createAnswer: (
    offer: RTCSessionDescriptionInit
  ) => Promise<RTCSessionDescriptionInit>

  addIceCandidate: (candidate: RTCIceCandidateInit) => Promise<void>

  setRemoteDescription: (answer: RTCSessionDescriptionInit) => Promise<void>

  getPing: () => Promise<number | null>

  closeConnection: () => Promise<void>
}

export const WebRTCContext = createContext<WebRTCContextValue | null>(null)

export const useWebRTC = () => {
  const webRTCContext = useContext(WebRTCContext)

  if (!webRTCContext) {
    throw new Error('useWebRTC has to used within <WebRTCContext.Provider>')
  }

  return webRTCContext
}
