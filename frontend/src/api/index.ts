import axios from 'axios'
import type { Voice, VoiceSettings, SynthesisJob, SynthesisRequest, Project, CloningJob } from '../types'

const BASE = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: BASE,
  timeout: 60000,
})

// ── Voices ────────────────────────────────────────────────────────────────────
export const voicesApi = {
  list: (category?: string) =>
    api.get<Voice[]>('/api/v1/voices', { params: category ? { category } : {} }).then(r => r.data),

  get: (id: string) =>
    api.get<Voice>(`/api/v1/voices/${id}`).then(r => r.data),

  create: (data: { name: string; description?: string; labels?: Voice['labels']; settings?: VoiceSettings }) =>
    api.post<Voice>('/api/v1/voices', data).then(r => r.data),

  update: (id: string, data: Partial<{ name: string; description: string; labels: Voice['labels'] }>) =>
    api.patch<Voice>(`/api/v1/voices/${id}`, data).then(r => r.data),

  updateSettings: (id: string, settings: VoiceSettings) =>
    api.post<Voice>(`/api/v1/voices/${id}/settings`, settings).then(r => r.data),

  delete: (id: string) =>
    api.delete(`/api/v1/voices/${id}`),
}

// ── Synthesis ─────────────────────────────────────────────────────────────────
export const synthesisApi = {
  submit: (data: SynthesisRequest) =>
    api.post<SynthesisJob>('/api/v1/synthesis', data).then(r => r.data),

  getJob: (jobId: string) =>
    api.get<SynthesisJob>(`/api/v1/synthesis/${jobId}`).then(r => r.data),

  history: (limit = 20, offset = 0) =>
    api.get<SynthesisJob[]>('/api/v1/synthesis/history', { params: { limit, offset } }).then(r => r.data),

  audioUrl: (filename: string) =>
    `${BASE}/api/v1/synthesis/audio/${filename}`,

  delete: (jobId: string) =>
    api.delete(`/api/v1/synthesis/${jobId}`),
}

// ── Cloning ───────────────────────────────────────────────────────────────────
export const cloningApi = {
  clone: (name: string, description: string, audioFile: File) => {
    const form = new FormData()
    form.append('name', name)
    form.append('description', description)
    form.append('audio_file', audioFile)
    return api.post<CloningJob>('/api/v1/cloning', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data)
  },

  status: (taskId: string) =>
    api.get(`/api/v1/cloning/status/${taskId}`).then(r => r.data),

  delete: (voiceId: string) =>
    api.delete(`/api/v1/cloning/${voiceId}`),
}

// ── Projects ──────────────────────────────────────────────────────────────────
export const projectsApi = {
  list: () =>
    api.get<Project[]>('/api/v1/projects').then(r => r.data),

  get: (id: string) =>
    api.get<Project>(`/api/v1/projects/${id}`).then(r => r.data),

  create: (data: { name: string; description?: string; default_voice_id?: string }) =>
    api.post<Project>('/api/v1/projects', data).then(r => r.data),

  update: (id: string, data: Partial<Project>) =>
    api.patch<Project>(`/api/v1/projects/${id}`, data).then(r => r.data),

  delete: (id: string) =>
    api.delete(`/api/v1/projects/${id}`),

  history: (id: string) =>
    api.get<SynthesisJob[]>(`/api/v1/projects/${id}/history`).then(r => r.data),
}

// ── Health ────────────────────────────────────────────────────────────────────
export const healthApi = {
  check: () => api.get('/api/health/ready').then(r => r.data),
}

export default api
