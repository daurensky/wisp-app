import api from '@/lib/api'

export interface User {
  id: string
  name: string
  username: string
  email: string
  avatar: string
}

export async function me() {
  return await api.get<User>('me').json()
}
