import React from 'react'

// ── Button ────────────────────────────────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: React.ReactNode
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary', size = 'md', loading, icon, children, disabled, style, ...props
}) => {
  const base: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    fontFamily: 'var(--font-display)', fontWeight: 600, letterSpacing: '0.01em',
    border: '1px solid transparent', borderRadius: 'var(--radius-md)',
    transition: 'all 0.15s ease', cursor: disabled || loading ? 'not-allowed' : 'pointer',
    opacity: disabled || loading ? 0.5 : 1, whiteSpace: 'nowrap',
  }
  const sizes: Record<string, React.CSSProperties> = {
    sm: { padding: '5px 12px', fontSize: '12px' },
    md: { padding: '8px 16px', fontSize: '13px' },
    lg: { padding: '11px 22px', fontSize: '14px' },
  }
  const variants: Record<string, React.CSSProperties> = {
    primary:   { background: 'var(--accent)', color: '#000', borderColor: 'var(--accent)' },
    secondary: { background: 'var(--bg-raised)', color: 'var(--text-primary)', borderColor: 'var(--border-default)' },
    ghost:     { background: 'transparent', color: 'var(--text-secondary)', borderColor: 'transparent' },
    danger:    { background: 'rgba(248,113,113,0.1)', color: 'var(--error)', borderColor: 'rgba(248,113,113,0.3)' },
  }
  return (
    <button style={{ ...base, ...sizes[size], ...variants[variant], ...style }} disabled={disabled || loading} {...props}>
      {loading ? <Spinner size={14} /> : icon}
      {children}
    </button>
  )
}

// ── Badge ─────────────────────────────────────────────────────────────────────
interface BadgeProps { label: string; color?: string; bg?: string }
export const Badge: React.FC<BadgeProps> = ({ label, color = 'var(--text-secondary)', bg = 'var(--bg-overlay)' }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', padding: '2px 8px',
    borderRadius: '20px', fontSize: '11px', fontWeight: 500,
    fontFamily: 'var(--font-mono)', letterSpacing: '0.05em',
    color, background: bg, border: '1px solid rgba(255,255,255,0.08)',
  }}>{label}</span>
)

// ── Status Badge ──────────────────────────────────────────────────────────────
export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, { color: string; bg: string }> = {
    completed:  { color: 'var(--success)', bg: 'rgba(52,211,153,0.12)' },
    processing: { color: 'var(--warning)', bg: 'rgba(251,191,36,0.12)' },
    pending:    { color: 'var(--pending)', bg: 'rgba(167,139,250,0.12)' },
    failed:     { color: 'var(--error)',   bg: 'rgba(248,113,113,0.12)' },
  }
  const s = map[status] || map.pending
  return <Badge label={status} color={s.color} bg={s.bg} />
}

// ── Spinner ───────────────────────────────────────────────────────────────────
export const Spinner: React.FC<{ size?: number; color?: string }> = ({ size = 18, color = 'var(--accent)' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    style={{ animation: 'spin 0.8s linear infinite', flexShrink: 0 }}>
    <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" strokeOpacity="0.25" />
    <path d="M12 2a10 10 0 0 1 10 10" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
)

// ── Card ──────────────────────────────────────────────────────────────────────
export const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties; onClick?: () => void }> = ({ children, style, onClick }) => (
  <div onClick={onClick} style={{
    background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-lg)', padding: '20px',
    transition: 'border-color 0.15s, background 0.15s',
    cursor: onClick ? 'pointer' : 'default', ...style,
  }}>{children}</div>
)

// ── Input ─────────────────────────────────────────────────────────────────────
export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string }> = ({ label, style, ...props }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
    {label && <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', fontFamily: 'var(--font-display)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{label}</label>}
    <input style={{
      background: 'var(--bg-raised)', border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-md)', padding: '9px 12px',
      color: 'var(--text-primary)', fontSize: '14px', outline: 'none', width: '100%',
      transition: 'border-color 0.15s', ...style,
    }}
    onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
    onBlur={e => (e.target.style.borderColor = 'var(--border-default)')}
    {...props} />
  </div>
)

// ── Slider ────────────────────────────────────────────────────────────────────
export const Slider: React.FC<{ label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number }> = ({
  label, value, onChange, min = 0, max = 1, step = 0.01
}) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', fontFamily: 'var(--font-display)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</label>
      <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>{value.toFixed(2)}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value}
      onChange={e => onChange(parseFloat(e.target.value))}
      style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }} />
  </div>
)

// ── Divider ───────────────────────────────────────────────────────────────────
export const Divider: React.FC<{ label?: string }> = ({ label }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '4px 0' }}>
    <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
    {label && <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</span>}
    <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
  </div>
)

// ── Empty State ───────────────────────────────────────────────────────────────
export const EmptyState: React.FC<{ icon: React.ReactNode; title: string; description: string; action?: React.ReactNode }> = ({ icon, title, description, action }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: '12px', textAlign: 'center' }}>
    <div style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>{icon}</div>
    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '16px', color: 'var(--text-primary)' }}>{title}</div>
    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '280px', lineHeight: 1.6 }}>{description}</div>
    {action && <div style={{ marginTop: '8px' }}>{action}</div>}
  </div>
)
