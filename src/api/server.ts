import api from '@/lib/api'
import { User } from './user'

export type ServerChannelType = 'voice' | 'text'

export interface ServerChannel {
  id: string
  name: string
  type: ServerChannelType
}

export interface ServerCategory {
  id: string
  name: string
  channels: ServerChannel[]
}

export interface Server {
  id: string
  name: string
  avatar: string
  author: User
  categories: ServerCategory[]
}

export async function createServer({
  name,
  avatar,
}: {
  name: string
  avatar: File | null
}) {
  const formData = new FormData()
  formData.append('name', name)
  avatar && formData.append('avatar', avatar)

  return await api
    .post<Server>('server', {
      body: formData,
    })
    .json()
}

export async function getServer(id: string) {
  return await api.get<Server>(`server/${id}`).json()
}

export async function listServers() {
  return await api.get<Server[]>('server').json()
}
