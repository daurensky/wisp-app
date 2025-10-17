import { Volume2 } from 'lucide-react'
import { Button } from './ui/button'

export default function VoiceChannelButton({
  id,
  name,
}: {
  id: string
  name: string
}) {
  return (
    <Button variant="navlink" className="w-full">
      <Volume2 /> {name}
    </Button>
  )
}
