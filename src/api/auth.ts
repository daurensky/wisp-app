import api from '@/lib/api'

interface LoginResponse {
  success: boolean
  token: string
}

export async function login({
  email,
  password,
}: {
  email: string
  password: string
}) {
  return await api
    .post<LoginResponse>('login', {
      json: {
        email,
        password,
      },
    })
    .json()
}

interface RegisterResponse {
  success: boolean
  token: string
}

export async function register({
  email,
  password,
  username,
  name,
}: {
  email: string
  password: string
  username: string
  name?: string
}) {
  return await api
    .post<RegisterResponse>('register', {
      json: {
        email,
        password,
        username,
        name,
      },
    })
    .json()
}
