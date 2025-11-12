import { useAccessTokenStore } from '@/store/auth-store'
import ky from 'ky'

const api = ky.create({
  prefixUrl: import.meta.env.VITE_API_BASE_URL,
  hooks: {
    beforeRequest: [
      request => {
        const accessToken = useAccessTokenStore.getState().accessToken

        if (import.meta.env.DEV) {
          // console.log(accessToken)
        }

        if (accessToken) {
          request.headers.set('Authorization', `Bearer ${accessToken}`)
        }
      },
    ],
  },
})

export default api
