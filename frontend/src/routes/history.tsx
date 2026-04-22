import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Trash2, Play, Pause } from 'lucide-react'
import { synthesisApi } from '../api'
import { StatusBadge, Button, Spinner, EmptyState } from '../components/ui'
import { AudioPlayer } from '../components/synthesis/AudioPlayer'
import type { SynthesisJob } from '../types'

function JobRow({ job, isExpanded, onToggle, onDelete }: { job: SynthesisJob; isExpanded: boolean; onToggle: () => void; onDelete: () => void }) {
  const audioFilename = job.audio_url?.split('/').pop()
  const audioUrl = audioFilename ? synthesisApi.audioUrl(audioFilename) : null
  const created = new Date(job.created_at).toLocaleString()

  return (
    <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'hidden', transition: 'border-color 0.15s' }}>
      <div onClick={onToggle} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', cursor: 'pointer', background: isExpanded ? 'var(--bg-raised)' : 'var(--bg-surface)', transition: 'background 0.15s' }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-overlay)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {isExpanded ? <Pause size={11} color="var(--accent)" /> : <Play size={11} color="var(--text-muted)" />}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {job.text?.slice(0, 80)}{(job.text?.length || 0) > 80 ? '…' : ''}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>{created}</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          <StatusBadge status={job.status} />
          {job.duration_seconds && (
            <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
              {job.duration_seconds.toFixed(1)}s
            </span>
          )}
          <Button variant="ghost" size="sm" icon={<Trash2 size={11} />} onClick={e => { e.stopPropagation(); onDelete() }} />
        </div>
      </div>

      {isExpanded && (
        <div className="animate-fade" style={{ padding: '16px', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '14px', fontStyle: 'italic' }}>
            "{job.text}"
          </div>
          {audioUrl && job.status === 'completed' && (
            <AudioPlayer url={audioUrl} filename={audioFilename} duration={job.duration_seconds} />
          )}
          {job.error_message && (
            <div style={{ color: 'var(--error)', fontSize: '12px', background: 'rgba(248,113,113,0.08)', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
              {job.error_message}
            </div>
          )}
          <div style={{ display: 'flex', gap: '16px', marginTop: '12px', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            <span>ID: {(job.job_id || job.id)?.slice(0, 8)}</span>
            {job.characters_used && <span>{job.characters_used} chars</span>}
            {job.model_id && <span>{job.model_id}</span>}
          </div>
        </div>
      )}
    </div>
  )
}

export default function HistoryPage() {
  const qc = useQueryClient()
  const [expanded, setExpanded] = useState<string | null>(null)

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['history'],
    queryFn: () => synthesisApi.history(50),
    refetchInterval: 5000,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => synthesisApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['history'] }); toast.success('Deleted') },
  })

  const completedCount = jobs.filter(j => j.status === 'completed').length

  return (
    <div style={{ padding: '32px', maxWidth: '860px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '28px', letterSpacing: '-0.03em' }}>History</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '14px' }}>
          {jobs.length} total · {completedCount} completed
        </p>
      </div>

      {isLoading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <Spinner size={24} />
        </div>
      )}

      {!isLoading && jobs.length === 0 && (
        <EmptyState icon={<span style={{ fontSize: '32px' }}>📭</span>} title="No generations yet" description="Submit your first synthesis job from the Studio page." />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {jobs.map(job => {
          const id = job.job_id || job.id || ''
          return (
            <JobRow key={id} job={job}
              isExpanded={expanded === id}
              onToggle={() => setExpanded(expanded === id ? null : id)}
              onDelete={() => deleteMutation.mutate(id)}
            />
          )
        })}
      </div>
    </div>
  )
}
