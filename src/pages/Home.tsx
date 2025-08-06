import '../components/CSS/Home.css'
import { useAuth } from '@/stores/auth'
import { useEffect, useState } from 'react'


const Home = () => {
  const { login } = useAuth()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    console.log('Env variables:', {
      clientId: import.meta.env.VITE_DISCORD_CLIENT_ID,
      redirectUri: import.meta.env.VITE_DISCORD_REDIRECT_URI
    })
  }, [])

  const handleDiscordLogin = () => {
    const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID
    const redirectUri = import.meta.env.VITE_DISCORD_REDIRECT_URI
    const scope = import.meta.env.VITE_DISCORD_SCOPE

    if (!clientId) {
      setError('Discord Client ID is not configured')
      return
    }

    if (isNaN(Number(clientId))) {
      setError('Invalid Discord Client ID format - must be numeric')
      return
    }

    try {
      const authUrl = new URL('https://discord.com/api/oauth2/authorize')
      authUrl.searchParams.append('client_id', clientId)
      authUrl.searchParams.append('redirect_uri', redirectUri)
      authUrl.searchParams.append('response_type', 'code')
      authUrl.searchParams.append('scope', scope)
      
      window.location.href = authUrl.toString()
    } catch (err) {
      setError('Failed to construct Discord auth URL')
      console.error(err)
    }
  }

  useEffect(() => {
    if (!import.meta.env.VITE_DISCORD_CLIENT_ID) {
      console.error('Missing VITE_DISCORD_CLIENT_ID in .env')
      setError('Application misconfigured - please contact admin')
    }
  }, [])

  return (
    <div className="home-container">
      <h1 className="home-title">Discord Moderation Panel</h1>
      {error && <div className="home-error">{error}</div>}
      <button
        className="home-login-button"
        onClick={handleDiscordLogin}
        disabled={!!error}
      >
        Login with Discord
      </button>
    </div>
  )
}

export default Home