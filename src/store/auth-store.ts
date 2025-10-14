import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

interface AuthState {
  accessToken: string
  setAccessToken: (accessToken: string) => void
}

export const useAuthStore = create<AuthState>()(
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
