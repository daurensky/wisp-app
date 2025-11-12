import api from '@/lib/api'
import { User } from './user'

export type ServerChannelType = 'voice' | 'text'

export interface ServerChannel {
  id: string
  name: string
  type: ServerChannelType
  members: User[]
}

export async function getServerChannel(id: string) {
  return await api.get<ServerChannel>(`server-channel/${id}`).json()
}

export async function connectChannel(id: string) {
  return await api.post(`server-channel/${id}/connect`).json()
}

export async function disconnectChannel(id: string) {
  return await api.post(`server-channel/${id}/disconnect`).json()
}
