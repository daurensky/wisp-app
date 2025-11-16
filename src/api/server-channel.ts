import api from '@/lib/api'
import { ServerChannelMember } from './server-channel-member'

export type ServerChannelType = 'voice' | 'text'

export interface ServerChannel {
  id: string
  name: string
  type: ServerChannelType
  members: ServerChannelMember[]
}

export async function getServerChannel(id: string) {
  return await api.get<ServerChannel>(`server-channel/${id}`).json()
}
