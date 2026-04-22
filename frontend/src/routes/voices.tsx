import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Plus, Trash2, Mic2, Upload, X, Settings2 } from 'lucide-react'
import { voicesApi, cloningApi } from '../api'
import { Button, Badge, Card, Input, Slider, Spinner, EmptyState } from '../components/ui'
import { useAppStore } from '../store'
import type { Voice } from '../types'

function VoiceCard({ voice, onDelete, onSelect, selected }: { voice: Voice; onDelete: () => void; onSelect: () => void; selected: boolean }) {
  const [showSettings, setShowSettings] = useState(false)
  const qc = useQueryClient()

  const updateSettings = useMutation({
    mutationFn: (s: typeof voice) => voicesApi.updateSettings(voice.id, { stability: s.stability, similarity_boost: s.similarity_boost, style: s.style, use_speaker_boost: s.use_speaker_boost }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['voices'] }); toast.success('Settings saved') },
  })

  const [localSettings, setLocalSettings] = useState({ stability: voice.stability, similarity_boost: voice.similarity_boost, style: voice.style, use_speaker_boost: voice.use_speaker_boost })

  return (
    <Card style={{ border: selected ? '1px solid rgba(56,189,248,0.4)' : undefined, background: selected ? 'rgba(56,189,248,0.03)' : undefined }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={onSelect}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: selected ? 'var(--accent-dim)' : 'var(--bg-overlay)', border: `1px solid ${selected ? 'rgba(56,189,248,0.3)' : 'var(--border-subtle)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Mic2 size={15} color={selected ? 'var(--accent)' : 'var(--text-muted)'} />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '14px' }}>{voice.name}</div>
            {voice.description && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{voice.description}</div>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <Button variant="ghost" size="sm" icon={<Settings2 size={12} />} onClick={() => setShowSettings(s => !s)} />
          <Button variant="danger" size="sm" icon={<Trash2 size={12} />} onClick={onDelete} />
        </div>
      </div>

      {/* Labels */}
      {voice.labels && Object.values(voice.labels).some(Boolean) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '10px' }}>
          {Object.entries(voice.labels).filter(([, v]) => v).map(([k, v]) => (
            <Badge key={k} label={`${v}`} />
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: '6px' }}>
        <Badge label={voice.category} bg={voice.category === 'cloned' ? 'rgba(167,139,250,0.12)' : 'rgba(52,211,153,0.12)'} color={voice.category === 'cloned' ? 'var(--pending)' : 'var(--success)'} />
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="animate-fade" style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Slider label="Stability" value={localSettings.stability} onChange={v => setLocalSettings(s => ({ ...s, stability: v }))} />
          <Slider label="Similarity" value={localSettings.similarity_boost} onChange={v => setLocalSettings(s => ({ ...s, similarity_boost: v }))} />
          <Slider label="Style" value={localSettings.style} onChange={v => setLocalSettings(s => ({ ...s, style: v }))} />
          <Button variant="primary" size="sm" loading={updateSettings.isPending} onClick={() => updateSettings.mutate(localSettings as any)}>
            Save Settings
          </Button>
        </div>
      )}
    </Card>
  )
}

function AddVoiceModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [tab, setTab] = useState<'create' | 'clone'>('create')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [audioFile, setAudioFile] = useState<File | null>(null)

  const createMutation = useMutation({
    mutationFn: () => voicesApi.create({ name, description }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['voices'] }); toast.success('Voice created!'); onClose() },
    onError: () => toast.error('Failed to create voice'),
  })

  const cloneMutation = useMutation({
    mutationFn: () => cloningApi.clone(name, description, audioFile!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['voices'] }); toast.success('Cloning started! Voice will be ready shortly.'); onClose() },
    onError: () => toast.error('Failed to start cloning'),
  })

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="animate-fade" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-xl)', width: '420px', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '16px' }}>Add Voice</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={16} /></button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)' }}>
          {(['create', 'clone'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: '12px', background: 'none', border: 'none', borderBottom: `2px solid ${tab === t ? 'var(--accent)' : 'transparent'}`, color: tab === t ? 'var(--accent)' : 'var(--text-muted)', fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '13px', cursor: 'pointer', transition: 'color 0.15s', textTransform: 'capitalize' }}>
              {t === 'create' ? 'Create Voice' : 'Clone Voice'}
            </button>
          ))}
        </div>

        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input label="Voice Name" placeholder="e.g. Aria, James, Narrator..." value={name} onChange={e => setName(e.target.value)} />
          <Input label="Description (optional)" placeholder="e.g. Warm, professional female voice" value={description} onChange={e => setDescription(e.target.value)} />

          {tab === 'clone' && (
            <div>
              <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', fontFamily: 'var(--font-display)', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                Audio Sample (6–180 seconds)
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '24px', border: `2px dashed ${audioFile ? 'var(--accent)' : 'var(--border-default)'}`, borderRadius: 'var(--radius-md)', cursor: 'pointer', background: audioFile ? 'var(--accent-dim)' : 'transparent', transition: 'all 0.15s' }}>
                <Upload size={20} color={audioFile ? 'var(--accent)' : 'var(--text-muted)'} />
                <span style={{ fontSize: '12px', color: audioFile ? 'var(--accent)' : 'var(--text-muted)' }}>
                  {audioFile ? audioFile.name : 'Click to upload WAV, MP3, or OGG'}
                </span>
                <input type="file" accept="audio/*" style={{ display: 'none' }} onChange={e => setAudioFile(e.target.files?.[0] || null)} />
              </label>
            </div>
          )}

          <Button
            variant="primary" size="lg"
            disabled={!name || (tab === 'clone' && !audioFile)}
            loading={createMutation.isPending || cloneMutation.isPending}
            onClick={() => tab === 'create' ? createMutation.mutate() : cloneMutation.mutate()}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {tab === 'create' ? 'Create Voice' : 'Start Cloning'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function VoicesPage() {
  const qc = useQueryClient()
  const { setSelectedVoice } = useAppStore() as any
  const [showModal, setShowModal] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data: voices = [], isLoading } = useQuery({ queryKey: ['voices'], queryFn: () => voicesApi.list() })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => voicesApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['voices'] }); toast.success('Voice deleted') },
    onError: () => toast.error('Failed to delete'),
  })

  return (
    <div style={{ padding: '32px', maxWidth: '900px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '28px', letterSpacing: '-0.03em' }}>Voice Library</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '14px' }}>
            {voices.length} voice{voices.length !== 1 ? 's' : ''} · Manage your premade and cloned voices
          </p>
        </div>
        <Button variant="primary" icon={<Plus size={14} />} onClick={() => setShowModal(true)}>Add Voice</Button>
      </div>

      {isLoading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <Spinner size={24} />
        </div>
      )}

      {!isLoading && voices.length === 0 && (
        <EmptyState icon={<Mic2 size={32} />} title="No voices yet" description="Create a premade voice or clone a real voice from an audio sample." action={<Button variant="primary" icon={<Plus size={14} />} onClick={() => setShowModal(true)}>Add Your First Voice</Button>} />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
        {voices.map(v => (
          <VoiceCard key={v.id} voice={v}
            selected={selectedId === v.id}
            onSelect={() => { setSelectedId(v.id); setSelectedVoice(v) }}
            onDelete={() => deleteMutation.mutate(v.id)}
          />
        ))}
      </div>

      {showModal && <AddVoiceModal onClose={() => setShowModal(false)} />}
    </div>
  )
}
