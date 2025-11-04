import { configureEcho } from '@laravel/echo-react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter, Route, Routes } from 'react-router'
import { authorizeBroadcasting } from './api/auth.ts'
import './index.css'
import AuthLayout from './layouts/auth-layout.tsx'
import GuestLayout from './layouts/guest-layout.tsx'
import RootLayout from './layouts/root-layout.tsx'
import Login from './routes/auth/login.tsx'
import Register from './routes/auth/register.tsx'
import Server from './routes/server.tsx'
import Welcome from './routes/welcome.tsx'
import WebRTCLayout from './layouts/webrtc-layout.tsx'
import ServerLayout from './layouts/server-layout.tsx'

configureEcho({
  broadcaster: 'reverb',
  key: import.meta.env.VITE_REVERB_APP_KEY,
  wsHost: import.meta.env.VITE_REVERB_HOST,
  wsPort: import.meta.env.VITE_REVERB_PORT ?? 80,
  wssPort: import.meta.env.VITE_REVERB_PORT ?? 443,
  forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'https') === 'https',
  enabledTransports: ['ws', 'wss'],
  authorizer: channel => ({
    authorize: async (socketId, callback) => {
      try {
        const { auth } = await authorizeBroadcasting({
          socketId,
          channelName: channel.name,
        })

        callback(null, { auth })
      } catch (error) {
        callback(error as Error, null)
      }
    },
  }),
})

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <Routes>
          <Route element={<RootLayout />}>
            <Route element={<GuestLayout />}>
              <Route path="login" element={<Login />} />
              <Route path="register" element={<Register />} />
            </Route>

            <Route element={<AuthLayout />}>
              <Route element={<WebRTCLayout />}>
                <Route element={<ServerLayout />}>
                  <Route path="/" element={<Welcome />} />
                  <Route path="server/:id" element={<Server />} />
                </Route>
              </Route>
            </Route>
          </Route>
        </Routes>
      </HashRouter>
    </QueryClientProvider>
  </React.StrictMode>
)

// Use contextBridge
// window.ipcRenderer.on('main-process-message', (_event, message) => {
//   console.log(message)
// })
