import api from '@/lib/api'
import { User } from './user'

export type ConnectableType = 'server'

export interface PeerConnection {
  id: string
  user: User
  connectable_type: string
  connectable_id: string
  connectable_child_id: string | null
  mic_muted: boolean
  audio_muted: boolean
  screen_sharing: boolean
}

export async function getPeerConnections(searchParams: {
  connectable_type: ConnectableType
  connectable_id: string
}) {
  return await api
    .get<PeerConnection[]>('peer-connection', {
      searchParams,
    })
    .json()
}

export async function connectPeerConnection(json: {
  connectable_type: ConnectableType
  connectable_id: string
  connectable_child_id: string | null
  mic_muted: boolean
  audio_muted: boolean
}) {
  return await api
    .post<PeerConnection[]>('peer-connection', {
      json,
    })
    .json()
}

export async function updatePeerConnection(json: {
  mic_muted?: boolean
  audio_muted?: boolean
  screen_sharing?: boolean
}) {
  return await api
    .patch<PeerConnection>('peer-connection', {
      json,
    })
    .json()
}

export async function disconnectPeerConnection() {
  await api.delete('peer-connection')
}
