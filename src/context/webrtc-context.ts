import { createContext, MutableRefObject, useContext } from 'react'

type UserId = string

export type OnIceCandidate = (candidate: RTCIceCandidateInit) => void

export type Connection = {
  connectedTo: 'server-channel'
  connectedId: string
  connectedLabel: string
}

export interface WebRTCContextValue {
  connection: Connection | null
  initConnection: (connectionDetails: Connection) => void

  localStream: MutableRefObject<MediaStream | null>
  peers: Record<UserId, MediaStream>

  initLocalStream: () => Promise<MediaStream>

  createOffer: ({
    remoteUserId,
    onIceCandidate,
  }: {
    remoteUserId: UserId
    onIceCandidate: OnIceCandidate
  }) => Promise<RTCSessionDescriptionInit>

  handleOffer: ({
    from,
    sdp,
    onIceCandidate,
  }: {
    from: UserId
    sdp: string
    onIceCandidate: OnIceCandidate
  }) => Promise<RTCSessionDescriptionInit>

  handleAnswer: ({ from, sdp }: { from: string; sdp: string }) => Promise<void>

  handleCandidate: ({
    from,
    candidate,
  }: {
    from: UserId
    candidate: RTCIceCandidateInit
  }) => Promise<void>

  removePeer: ({ remoteUserId }: { remoteUserId: UserId }) => void

  validatePeers: ({
    connectedUserIds,
  }: {
    connectedUserIds: Set<UserId>
  }) => void

  closeAll: () => void

  getPing: ({ userId }: { userId: UserId }) => Promise<number | null>
}

export const WebRTCContext = createContext<WebRTCContextValue | null>(null)

export const useWebRTC = () => {
  const webRTCContext = useContext(WebRTCContext)

  if (!webRTCContext) {
    throw new Error('useWebRTC has to used within <WebRTCContext.Provider>')
  }

  return webRTCContext
}
