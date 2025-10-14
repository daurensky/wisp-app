import api from '@/lib/api'

interface User {
  id: number
  name: string | null
  email: string
  username: string
  email_verified_at: string | null
  created_at: string
  updated_at: string
}

export async function me() {
  return await api.get<User>('me').json()
}
