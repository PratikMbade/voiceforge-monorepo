import React from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { Mic2, AudioWaveform, FolderOpen, History, Settings, Zap } from 'lucide-react'

const navItems = [
  { to: '/',          icon: AudioWaveform,   label: 'Studio' },
  { to: '/voices',    icon: Mic2,       label: 'Voices' },
  { to: '/history',   icon: History,    label: 'History' },
  { to: '/projects',  icon: FolderOpen, label: 'Projects' },
]

export const Sidebar: React.FC = () => {
  const router = useRouterState()
  const current = router.location.pathname

  return (
    <aside style={{
      width: 'var(--sidebar-w)', minHeight: '100vh',
      background: 'var(--bg-surface)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex', flexDirection: 'column',
      position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 100,
    }}>
      {/* Logo */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: 32, height: 32, borderRadius: '8px',
            background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Zap size={16} color="#000" fill="#000" />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '15px', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
              VoiceForge
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>
              TTS PLATFORM
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 10px' }}>
        <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 10px 8px' }}>
          Navigation
        </div>
        {navItems.map(({ to, icon: Icon, label }) => {
          const active = current === to || (to !== '/' && current.startsWith(to))
          return (
            <Link key={to} to={to} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '9px 10px', borderRadius: 'var(--radius-md)', marginBottom: '2px',
              color: active ? 'var(--accent)' : 'var(--text-secondary)',
              background: active ? 'var(--accent-dim)' : 'transparent',
              border: `1px solid ${active ? 'rgba(56,189,248,0.2)' : 'transparent'}`,
              fontSize: '13px', fontWeight: active ? 600 : 400,
              fontFamily: 'var(--font-display)',
              transition: 'all 0.15s ease',
              textDecoration: 'none',
            }}>
              <Icon size={15} />
              {label}
              {active && (
                <div style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: '12px 10px', borderTop: '1px solid var(--border-subtle)' }}>
        <Link to="/settings" style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '9px 10px', borderRadius: 'var(--radius-md)',
          color: 'var(--text-muted)', fontSize: '13px',
          fontFamily: 'var(--font-display)', transition: 'color 0.15s',
          textDecoration: 'none',
        }}>
          <Settings size={15} />
          Settings
        </Link>
        <div style={{ padding: '8px 10px' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            v1.0.0 · Python 3.9
          </div>
        </div>
      </div>
    </aside>
  )
}
