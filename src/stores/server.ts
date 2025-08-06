import { create } from 'zustand'

interface ServerState {
  bans: string[]
  kicks: string[]
  warnings: string[]
}

interface ServerActions {
  addBan: (userId: string) => void
  addKick: (userId: string) => void
}

type ServerStore = ServerState & ServerActions

export const useServerStore = create<ServerStore>((set) => ({
  bans: [],
  kicks: [],
  warnings: [],
  addBan: (userId: string) => set((state) => ({ bans: [...state.bans, userId] })),
  addKick: (userId: string) => set((state) => ({ kicks: [...state.kicks, userId] })),
}))