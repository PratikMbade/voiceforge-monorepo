export interface Voice {
  id: string
  name: string
  description?: string
  category: 'cloned' | 'premade'
  labels?: {
    accent?: string
    age?: string
    gender?: string
    use_case?: string
    language?: string
  }
  preview_url?: string
  stability: number
  similarity_boost: number
  style: number
  use_speaker_boost: boolean
  is_public: boolean
  created_at: string
}

export interface VoiceSettings {
  stability: number
  similarity_boost: number
  style: number
  use_speaker_boost: boolean
}

export interface SynthesisJob {
  job_id: string
  id?: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  text?: string
  voice_id?: string
  model_id?: string
  audio_url?: string
  duration_seconds?: number
  characters_used?: number
  file_size_bytes?: number
  error_message?: string
  project_id?: string
  created_at: string
  completed_at?: string
}

export interface SynthesisRequest {
  text: string
  voice_id: string
  model_id?: string
  voice_settings?: VoiceSettings
  project_id?: string
}

export interface Project {
  id: string
  name: string
  description?: string
  default_voice_id?: string
  default_model_id: string
  created_at: string
}

export interface CloningJob {
  job_id: string
  voice_id?: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  message: string
  created_at: string
}

export interface HealthStatus {
  status: string
  version: string
  uptime_seconds: number
  checks: {
    database: string
    redis: string
    mlflow: string
  }
}
