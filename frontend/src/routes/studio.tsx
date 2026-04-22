import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Sparkles, ChevronDown, Settings2, Mic2 } from 'lucide-react'
import { synthesisApi, voicesApi } from '../api'
import { useAppStore } from '../store'
import { Button, Spinner, Slider, StatusBadge } from '../components/ui'
import { AudioPlayer } from '../components/synthesis/AudioPlayer'
import type { SynthesisJob, Voice } from '../types'

const MODELS = [
  { id: 'eleven_multilingual_v2', label: 'Multilingual v2' },
  { id: 'eleven_turbo_v2',        label: 'Turbo v2 (fast)' },
  { id: 'eleven_english_v2',      label: 'English v2' },
]

export default function StudioPage() {
  const qc = useQueryClient()
  const { selectedVoice, setSelectedVoice } = useAppStore()

  const [text, setText] = useState('')
  const [modelId, setModelId] = useState('eleven_multilingual_v2')
  const [showSettings, setShowSettings] = useState(false)
  const [showVoicePicker, setShowVoicePicker] = useState(false)
  const [settings, setSettings] = useState({ stability: 0.75, similarity_boost: 0.75, style: 0.0, use_speaker_boost: true })
  const [activeJob, setActiveJob] = useState<SynthesisJob | null>(null)
  const [pollingId, setPollingId] = useState<string | null>(null)

  const { data: voices = [] } = useQuery({ queryKey: ['voices'], queryFn: () => voicesApi.list() })

  // Auto-select first voice
  useEffect(() => {
    if (voices.length > 0 && !selectedVoice) setSelectedVoice(voices[0])
  }, [voices])

  // Poll job status
  useEffect(() => {
    if (!pollingId) return
    const interval = setInterval(async () => {
      const job = await synthesisApi.getJob(pollingId)
      setActiveJob(job)
      if (job.status === 'completed' || job.status === 'failed') {
        clearInterval(interval)
        setPollingId(null)
        qc.invalidateQueries({ queryKey: ['history'] })
        if (job.status === 'completed') toast.success('Audio ready!')
        else toast.error(job.error_message || 'Synthesis failed')
      }
    }, 1500)
    return () => clearInterval(interval)
  }, [pollingId])

  const submitMutation = useMutation({
    mutationFn: () => synthesisApi.submit({
      text,
      voice_id: selectedVoice!.id,
      model_id: modelId,
      voice_settings: settings,
    }),
    onSuccess: (job) => {
      setActiveJob(job)
      setPollingId(job.job_id || job.id || null)
      toast('Generating audio...', { icon: '🎙️' })
    },
    onError: () => toast.error('Failed to submit job'),
  })

  const charCount = text.length
  const charPct = (charCount / 5000) * 100
  const isProcessing = activeJob?.status === 'pending' || activeJob?.status === 'processing'

  const audioFilename = activeJob?.audio_url?.split('/').pop()
  const audioUrl = audioFilename ? synthesisApi.audioUrl(audioFilename) : null

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

      {/* ── Left: Text Editor ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border-subtle)' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '20px', letterSpacing: '-0.02em' }}>Studio</h1>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Text to Speech · Voice Cloning</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="ghost" size="sm" icon={<Settings2 size={13} />} onClick={() => setShowSettings(s => !s)}>
              Settings
            </Button>
            <Button
              variant="primary" size="sm"
              icon={isProcessing ? <Spinner size={13} color="#000" /> : <Sparkles size={13} />}
              disabled={!text.trim() || !selectedVoice || isProcessing}
              loading={submitMutation.isPending}
              onClick={() => submitMutation.mutate()}
            >
              {isProcessing ? 'Generating...' : 'Generate'}
            </Button>
          </div>
        </div>

        {/* Voice selector bar */}
        <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Voice</span>
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowVoicePicker(v => !v)} style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: 'var(--bg-raised)', border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)', padding: '6px 12px',
              color: 'var(--text-primary)', fontSize: '13px', cursor: 'pointer',
              fontFamily: 'var(--font-display)', fontWeight: 500,
            }}>
              <Mic2 size={13} color="var(--accent)" />
              {selectedVoice?.name || 'Select a voice'}
              <ChevronDown size={12} color="var(--text-muted)" />
            </button>
            {showVoicePicker && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, zIndex: 50, marginTop: '4px',
                background: 'var(--bg-overlay)', border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)', minWidth: '200px',
                boxShadow: 'var(--shadow-md)', overflow: 'hidden',
              }}>
                {voices.map(v => (
                  <button key={v.id} onClick={() => { setSelectedVoice(v); setShowVoicePicker(false) }} style={{
                    width: '100%', textAlign: 'left', padding: '10px 14px',
                    background: selectedVoice?.id === v.id ? 'var(--accent-dim)' : 'transparent',
                    color: selectedVoice?.id === v.id ? 'var(--accent)' : 'var(--text-primary)',
                    border: 'none', cursor: 'pointer', fontSize: '13px',
                    fontFamily: 'var(--font-display)',
                    borderBottom: '1px solid var(--border-subtle)',
                  }}>
                    <div style={{ fontWeight: 500 }}>{v.name}</div>
                    {v.description && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{v.description}</div>}
                  </button>
                ))}
                {voices.length === 0 && (
                  <div style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--text-muted)' }}>No voices yet — create one in Voices</div>
                )}
              </div>
            )}
          </div>

          {/* Model selector */}
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginLeft: '8px' }}>Model</span>
          <select value={modelId} onChange={e => setModelId(e.target.value)} style={{
            background: 'var(--bg-raised)', border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md)', padding: '6px 10px',
            color: 'var(--text-primary)', fontSize: '12px', cursor: 'pointer',
            fontFamily: 'var(--font-mono)',
          }}>
            {MODELS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </div>

        {/* Text area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px' }}>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Start typing or paste your text here…"
            maxLength={5000}
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none', resize: 'none',
              color: 'var(--text-primary)', fontSize: '16px', lineHeight: 1.8,
              fontFamily: 'var(--font-body)', fontWeight: 300,
              letterSpacing: '0.01em',
            }}
          />
          {/* Char counter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '12px' }}>
            <div style={{ flex: 1, height: '2px', background: 'var(--border-subtle)', borderRadius: '1px' }}>
              <div style={{ height: '100%', width: `${charPct}%`, background: charPct > 90 ? 'var(--error)' : 'var(--accent)', borderRadius: '1px', transition: 'width 0.2s' }} />
            </div>
            <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: charPct > 90 ? 'var(--error)' : 'var(--text-muted)' }}>
              {charCount.toLocaleString()} / 5,000
            </span>
          </div>
        </div>
      </div>

      {/* ── Right: Output + Settings ── */}
      <div style={{ width: '340px', display: 'flex', flexDirection: 'column', overflow: 'auto' }}>

        {/* Voice Settings panel */}
        {showSettings && (
          <div className="animate-fade" style={{ padding: '20px', borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '13px', marginBottom: '16px', color: 'var(--text-secondary)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Voice Settings
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <Slider label="Stability" value={settings.stability} onChange={v => setSettings(s => ({ ...s, stability: v }))} />
              <Slider label="Clarity + Similarity" value={settings.similarity_boost} onChange={v => setSettings(s => ({ ...s, similarity_boost: v }))} />
              <Slider label="Style Exaggeration" value={settings.style} onChange={v => setSettings(s => ({ ...s, style: v }))} />
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'var(--font-display)' }}>
                <input type="checkbox" checked={settings.use_speaker_boost} onChange={e => setSettings(s => ({ ...s, use_speaker_boost: e.target.checked }))} style={{ accentColor: 'var(--accent)' }} />
                Speaker Boost
              </label>
            </div>
          </div>
        )}

        {/* Output */}
        <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '13px', color: 'var(--text-secondary)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Output
          </div>

          {!activeJob && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--bg-raised)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={20} color="var(--text-muted)" />
              </div>
              <div style={{ fontSize: '14px', fontFamily: 'var(--font-display)', color: 'var(--text-secondary)', fontWeight: 500 }}>Ready to generate</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6 }}>Type your text, select a voice,<br />and hit Generate</div>
            </div>
          )}

          {activeJob && (
            <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <StatusBadge status={activeJob.status} />
                {isProcessing && <Spinner size={16} />}
              </div>

              {isProcessing && (
                <div style={{ background: 'var(--bg-raised)', borderRadius: 'var(--radius-md)', padding: '16px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '8px' }}>
                    {[0, 1, 2, 3, 4].map(i => (
                      <div key={i} style={{ width: 3, borderRadius: '2px', background: 'var(--accent)', animation: `wave 0.8s ease-in-out ${i * 0.1}s infinite` }} />
                    ))}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Synthesizing speech…</div>
                </div>
              )}

              {activeJob.status === 'completed' && audioUrl && (
                <>
                  <AudioPlayer url={audioUrl} filename={audioFilename} duration={activeJob.duration_seconds} />
                  <div style={{ display: 'flex', gap: '16px', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    {activeJob.duration_seconds && <span>⏱ {activeJob.duration_seconds.toFixed(1)}s</span>}
                    {activeJob.characters_used && <span>📝 {activeJob.characters_used} chars</span>}
                    {activeJob.file_size_bytes && <span>💾 {(activeJob.file_size_bytes / 1024).toFixed(0)}KB</span>}
                  </div>
                </>
              )}

              {activeJob.status === 'failed' && (
                <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 'var(--radius-md)', padding: '12px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--error)' }}>{activeJob.error_message || 'Generation failed'}</div>
                </div>
              )}

              <Button variant="ghost" size="sm" onClick={() => { setActiveJob(null); setPollingId(null) }}>
                Clear
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
