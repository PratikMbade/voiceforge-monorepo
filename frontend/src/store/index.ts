import { create } from 'zustand'
import type { Voice, SynthesisJob } from '../types'

interface AppStore {
  // Selected voice
  selectedVoice: Voice | null
  setSelectedVoice: (v: Voice | null) => void

  // Active synthesis job (polling)
  activeJob: SynthesisJob | null
  setActiveJob: (j: SynthesisJob | null) => void

  // Sidebar
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void

  // Currently playing audio
  playingUrl: string | null
  setPlayingUrl: (url: string | null) => void
}

export const useAppStore = create<AppStore>((set) => ({
  selectedVoice: null,
  setSelectedVoice: (v) => set({ selectedVoice: v }),

  activeJob: null,
  setActiveJob: (j) => set({ activeJob: j }),

  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  playingUrl: null,
  setPlayingUrl: (url) => set({ playingUrl: url }),
}))
