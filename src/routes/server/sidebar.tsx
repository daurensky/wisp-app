import { PeerConnection } from '@/api/peer-connection'
import { Server } from '@/api/server'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/auth-context'
import { useEcho } from '@laravel/echo-react'
import { useQueryClient } from '@tanstack/react-query'
import { Hash } from 'lucide-react'
import SidebarVoiceChannel from './sidebar-voice-channel'
import { useWebRTC } from '@/context/webrtc-context'

export default function Sidebar({ server }: { server: Server }) {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { removePeer } = useWebRTC()

  useEcho(
    `peer-connection.server.${server.id}`,
    ['.PeerConnectionCreated', '.PeerConnectionUpdated'],
    (peer: PeerConnection) => {
      queryClient.setQueryData<Server>(['server', server.id], old =>
        !old
          ? old
          : {
              ...old,
              peers: [
                ...old.peers.filter(p => p.user.id !== peer.user.id),
                peer,
              ].sort((a, b) => b.user.name.localeCompare(a.user.name)),
            }
      )
    },
    [server.id]
  )

  useEcho(
    `peer-connection.server.${server.id}`,
    '.PeerConnectionDeleted',
    (peer: PeerConnection) => {
      if (peer.user.id === user.id) return

      queryClient.setQueryData<Server>(['server', server.id], old =>
        !old
          ? old
          : {
              ...old,
              peers: old.peers.filter(p => p.user.id !== peer.user.id),
            }
      )

      removePeer({ remoteUserId: peer.user.id })
    },
    [server.id]
  )

  return (
    <aside className="bg-sidebar rounded-sm w-[300px] shrink-0">
      <div className="p-3 border-b border-accent">
        <p>{server.name}</p>
      </div>

      <ul className="p-3 space-y-4">
        {server.categories.map(category => (
          <li key={category.id} className="space-y-2">
            <p className="text-xs text-muted-foreground">{category.name}</p>

            <ul>
              {category.channels.map(channel => (
                <li key={channel.id}>
                  {channel.type === 'text' && (
                    <Button variant="navlink" className="w-full">
                      <Hash /> {channel.name}
                    </Button>
                  )}

                  {channel.type === 'voice' && (
                    <SidebarVoiceChannel
                      server={server}
                      channel={channel}
                      peers={server.peers
                        .filter(
                          peer => peer.connectable_child_id === channel.id
                        )
                        .sort((a, b) => b.user.name.localeCompare(a.user.name))}
                    />
                  )}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </aside>
  )
}
