import { create } from 'zustand'

interface ServerState {
  bans: string[]
  kicks: string[]
  warnings: string[]
  isLoading: boolean
}

interface ServerActions {
  fetchModerationData: () => Promise<void>
  addBan: (userId: string) => Promise<void>
  addKick: (userId: string) => Promise<void>
}

type ServerStore = ServerState & ServerActions

export const useServerStore = create<ServerStore>((set, get) => ({
  bans: [],
  kicks: [],
  warnings: [],
  isLoading: false,

  fetchModerationData: async () => {
    set({ isLoading: true })
    try {
      const response = await fetch('/api/moderation')
      if (!response.ok) throw new Error('Failed to fetch moderation data')
      const data = await response.json()
      set({ ...data, isLoading: false })
    } catch (error) {
      console.error('Error fetching moderation data:', error)
      set({ isLoading: false })
    }
  },

  addBan: async (userId: string) => {
    try {
      const response = await fetch('/api/moderation/ban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })
      if (!response.ok) throw new Error('Failed to add ban')
      
      // Обновляем локальное состояние после успешного запроса
      const { bans } = await response.json()
      set({ bans })
    } catch (error) {
      console.error('Error adding ban:', error)
    }
  },

  addKick: async (userId: string) => {
    try {
      const response = await fetch('/api/moderation/kick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })
      if (!response.ok) throw new Error('Failed to add kick')
      
      const { kicks } = await response.json()
      set({ kicks })
    } catch (error) {
      console.error('Error adding kick:', error)
    }
  }
}))