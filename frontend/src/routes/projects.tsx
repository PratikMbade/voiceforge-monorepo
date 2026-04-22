import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Plus, Trash2, FolderOpen, X } from 'lucide-react'
import { projectsApi } from '../api'
import { Button, Card, Input, EmptyState, Spinner } from '../components/ui'

function NewProjectModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const mutation = useMutation({
    mutationFn: () => projectsApi.create({ name, description }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); toast.success('Project created!'); onClose() },
    onError: () => toast.error('Failed to create project'),
  })

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="animate-fade" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-xl)', width: '380px', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '16px' }}>New Project</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={16} /></button>
        </div>
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input label="Project Name" placeholder="e.g. My Audiobook, Podcast Series..." value={name} onChange={e => setName(e.target.value)} />
          <Input label="Description (optional)" placeholder="What is this project for?" value={description} onChange={e => setDescription(e.target.value)} />
          <Button variant="primary" size="lg" disabled={!name} loading={mutation.isPending} onClick={() => mutation.mutate()} style={{ width: '100%', justifyContent: 'center' }}>
            Create Project
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function ProjectsPage() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)

  const { data: projects = [], isLoading } = useQuery({ queryKey: ['projects'], queryFn: projectsApi.list })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => projectsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); toast.success('Project deleted') },
  })

  return (
    <div style={{ padding: '32px', maxWidth: '900px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '28px', letterSpacing: '-0.03em' }}>Projects</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '14px' }}>Organise your voice generations into projects</p>
        </div>
        <Button variant="primary" icon={<Plus size={14} />} onClick={() => setShowModal(true)}>New Project</Button>
      </div>

      {isLoading && <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><Spinner size={24} /></div>}

      {!isLoading && projects.length === 0 && (
        <EmptyState icon={<FolderOpen size={32} />} title="No projects yet" description="Create a project to organise your audio generations." action={<Button variant="primary" icon={<Plus size={14} />} onClick={() => setShowModal(true)}>Create First Project</Button>} />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
        {projects.map(p => (
          <Card key={p.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: 36, height: 36, borderRadius: '8px', background: 'var(--bg-overlay)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FolderOpen size={16} color="var(--accent)" />
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '14px' }}>{p.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                    {new Date(p.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="sm" icon={<Trash2 size={12} />} onClick={() => deleteMutation.mutate(p.id)} />
            </div>
            {p.description && (
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '12px', lineHeight: 1.6 }}>{p.description}</div>
            )}
          </Card>
        ))}
      </div>

      {showModal && <NewProjectModal onClose={() => setShowModal(false)} />}
    </div>
  )
}
