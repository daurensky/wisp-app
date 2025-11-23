import api from '@/lib/api'

export type ServerChannelType = 'voice' | 'text'

export interface ServerChannel {
  id: string
  name: string
  type: ServerChannelType
}

export async function getServerChannel(id: string) {
  return await api.get<ServerChannel>(`server-channel/${id}`).json()
}
