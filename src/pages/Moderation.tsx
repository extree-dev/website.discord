import { useServerStore } from '@/stores/server.js'

export default function Moderation() {
  const { bans, kicks } = useServerStore()
  
  return (
    <div className="moderation-page">
      <h1>Moderation</h1>
      <div>
        <h2>Bans: {bans.length}</h2>
        <h2>Kicks: {kicks.length}</h2>
      </div>
    </div>
  )
}