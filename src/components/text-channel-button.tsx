import { Hash } from 'lucide-react'
import { Button } from './ui/button'

export default function TextChannelButton({
  id,
  name,
}: {
  id: string
  name: string
}) {
  return (
    <Button variant="navlink" className="w-full">
      <Hash /> {name}
    </Button>
  )
}
