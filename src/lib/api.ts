import { useAuthStore } from '@/store/auth-store'
import ky from 'ky'

const api = ky.create({
  prefixUrl: import.meta.env.VITE_API_BASE_URL,
  hooks: {
    beforeRequest: [
      request => {
        const accessToken = useAuthStore.getState().accessToken

        if (accessToken) {
          request.headers.set('Authorization', `Bearer ${accessToken}`)
        }
      },
    ],
  },
})

export default api
