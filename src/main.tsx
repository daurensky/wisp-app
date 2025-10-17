import React from 'react'
import ReactDOM from 'react-dom/client'
import Welcome from './routes/welcome.tsx'
import './index.css'
import { HashRouter, Route, Routes } from 'react-router'
import Login from './routes/auth/login.tsx'
import Register from './routes/auth/register.tsx'
import RootLayout from './layouts/root-layout.tsx'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import GuestLayout from './layouts/guest-layout.tsx'
import AuthLayout from './layouts/auth-layout.tsx'
import Server from './routes/server.tsx'
import { configureEcho } from '@laravel/echo-react'

configureEcho({
  broadcaster: 'reverb',
  key: import.meta.env.VITE_REVERB_APP_KEY,
  wsHost: import.meta.env.VITE_REVERB_HOST,
  wsPort: import.meta.env.VITE_REVERB_PORT ?? 80,
  wssPort: import.meta.env.VITE_REVERB_PORT ?? 443,
  forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'https') === 'https',
  authEndpoint:
    import.meta.env.VITE_REVERB_AUTH_ENDPOINT ?? '/broadcasting/auth',
  enabledTransports: ['ws', 'wss'],
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
              <Route path="/" element={<Welcome />} />
              <Route path="server/:id" element={<Server />} />
            </Route>
          </Route>
        </Routes>
      </HashRouter>
    </QueryClientProvider>
  </React.StrictMode>
)

// Use contextBridge
window.ipcRenderer.on('main-process-message', (_event, message) => {
  console.log(message)
})
