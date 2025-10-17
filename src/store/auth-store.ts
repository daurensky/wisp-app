import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

interface AccessTokenState {
  accessToken: string
  setAccessToken: (accessToken: string) => void
}

export const useAccessTokenStore = create<AccessTokenState>()(
  persist(
    set => ({
      accessToken: '',
      setAccessToken: accessToken => set(() => ({ accessToken })),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
