import api from '@/lib/api'
import { User } from './user'

export type ServerChannelType = 'voice' | 'text'

export interface ServerChannelMember {
  id: string
  server_channel_id: string
  user: User
  is_screen_sharing: boolean
}

export async function getServerChannelMembers({
  server_channel_id,
}: {
  server_channel_id: string
}) {
  return await api
    .get<ServerChannelMember[]>(`server-channel-member`, {
      searchParams: {
        server_channel_id,
      },
    })
    .json()
}

export async function createServerChannelMember({
  server_channel_id,
}: {
  server_channel_id: string
}) {
  return await api
    .post<ServerChannelMember>(`server-channel-member`, {
      json: {
        server_channel_id,
      },
    })
    .json()
}

export async function updateServerChannelMember(
  id: string,
  {
    is_screen_sharing,
  }: {
    is_screen_sharing?: boolean
  }
) {
  return await api
    .patch<ServerChannelMember>(`server-channel-member/${id}`, {
      json: {
        is_screen_sharing,
      },
    })
    .json()
}

export async function deleteServerChannelMember(id: string) {
  return await api.delete(`server-channel-member/${id}`).json()
}
