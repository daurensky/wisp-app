import { createContext, MutableRefObject, useContext } from 'react'

type UserId = string

export type OnIceCandidate = (candidate: RTCIceCandidateInit) => void

export interface PeerStreams {
  mainStream: MediaStream | null
  displayStream: MediaStream | null
}

export interface WebRTCContextValue {
  localStream: MutableRefObject<MediaStream | null>
  peers: Record<UserId, PeerStreams>

  initLocalStream: () => Promise<MediaStream>

  createOffer: (args: {
    remoteUserId: UserId
    onIceCandidate: OnIceCandidate
  }) => Promise<RTCSessionDescriptionInit>

  handleOffer: (args: {
    from: UserId
    sdp: string
    onIceCandidate: OnIceCandidate
  }) => Promise<RTCSessionDescriptionInit>

  handleAnswer: (args: { from: string; sdp: string }) => Promise<void>

  handleCandidate: (args: {
    from: UserId
    candidate: RTCIceCandidateInit
  }) => Promise<void>

  removePeer: (args: { remoteUserId: UserId }) => void

  validatePeers: (args: { connectedUserIds: Set<UserId> }) => void

  closeAll: () => void

  getPeersPing: () => Promise<Record<UserId, number>>

  localDisplayStream: MediaStream | null

  startScreenShare: () => Promise<Record<UserId, RTCSessionDescriptionInit>>

  stopScreenShare: () => Promise<Record<UserId, RTCSessionDescriptionInit>>
}

export const WebRTCContext = createContext<WebRTCContextValue | null>(null)

export const useWebRTC = () => {
  const webRTCContext = useContext(WebRTCContext)

  if (!webRTCContext) {
    throw new Error('useWebRTC has to used within <WebRTCContext.Provider>')
  }

  return webRTCContext
}
