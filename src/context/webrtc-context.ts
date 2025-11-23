import { createContext, RefObject, useContext } from 'react'

type UserId = string

export type OnIceCandidate = (candidate: RTCIceCandidateInit) => void

export interface RemoteStream {
  mainStream: MediaStream | null
  displayStream: MediaStream | null
}

export interface WebRTCConnection {
  label: string
  connectableType: string
  connectableId: string
  onClose: () => void
  onRenegotiation: (offers: Record<UserId, RTCSessionDescriptionInit>) => void
}

export interface WebRTCContextValue {
  connection: WebRTCConnection | null

  initConnection: (args: WebRTCConnection) => void

  localStream: RefObject<MediaStream | null>
  remoteStreams: Record<UserId, RemoteStream>

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

  closeAll: () => void

  getPeersPing: () => Promise<Record<UserId, number>>

  localDisplayStream: MediaStream | null

  startScreenShare: () => Promise<void>

  stopScreenShare: () => Promise<void>
}

export const WebRTCContext = createContext<WebRTCContextValue | null>(null)

export const useWebRTC = () => {
  const webRTCContext = useContext(WebRTCContext)

  if (!webRTCContext) {
    throw new Error('useWebRTC has to used within <WebRTCContext.Provider>')
  }

  return webRTCContext
}
