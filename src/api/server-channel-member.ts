import api from '@/lib/api'
import { User } from './user'

export type ServerChannelType = 'voice' | 'text'

export interface ServerChannelMember {
  id: string
  server_channel_id: string
  user: User
  is_screen_sharing: boolean
}

export async function getServerChannelMembers(searchParams: {
  server_channel_id: string
}) {
  return await api
    .get<ServerChannelMember[]>(`server-channel-member`, {
      searchParams,
    })
    .json()
}

export async function connectServerChannelMember(json: {
  server_channel_id: string
}) {
  return await api
    .post<ServerChannelMember>(`server-channel-member`, {
      json,
    })
    .json()
}

export async function updateServerChannelMember({
  memberId,
  json,
}: {
  memberId: string
  json: {
    is_screen_sharing?: boolean
  }
}) {
  return await api
    .patch<ServerChannelMember>(`server-channel-member/${memberId}`, {
      json,
    })
    .json()
}

export async function deleteServerChannelMember(memberId: string) {
  return await api.delete(`server-channel-member/${memberId}`).json()
}
