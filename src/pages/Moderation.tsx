import { useServerStore } from '@/stores/clientServer.js'
import { useEffect } from 'react'

export default function Moderation() {
  const { bans, kicks, warnings, isLoading, fetchModerationData } = useServerStore()

  useEffect(() => {
    fetchModerationData()
  }, [fetchModerationData])

  if (isLoading) {
    return <div>Loading moderation data...</div>
  }

  return (
    <div className="moderation-page">
      <h1>Moderation</h1>
      <div>
        <h2>Bans: {bans.length}</h2>
        <h2>Kicks: {kicks.length}</h2>
        <h2>Warnings: {warnings.length}</h2>
      </div>
    </div>
  )
}