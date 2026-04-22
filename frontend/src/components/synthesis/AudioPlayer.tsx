import React, { useRef, useState, useEffect } from 'react'
import { Play, Pause, Download, Volume2 } from 'lucide-react'

interface AudioPlayerProps {
  url: string
  filename?: string
  duration?: number
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ url, filename, duration }) => {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [totalDuration, setTotalDuration] = useState(duration || 0)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onTime = () => {
      setCurrentTime(audio.currentTime)
      setProgress(audio.duration ? (audio.currentTime / audio.duration) * 100 : 0)
    }
    const onLoaded = () => setTotalDuration(audio.duration)
    const onEnded = () => { setPlaying(false); setProgress(0); setCurrentTime(0) }
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('loadedmetadata', onLoaded)
    audio.addEventListener('ended', onEnded)
    return () => {
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('loadedmetadata', onLoaded)
      audio.removeEventListener('ended', onEnded)
    }
  }, [url])

  const toggle = () => {
    if (!audioRef.current) return
    if (playing) { audioRef.current.pause(); setPlaying(false) }
    else { audioRef.current.play(); setPlaying(true) }
  }

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = (e.clientX - rect.left) / rect.width
    audioRef.current.currentTime = pct * audioRef.current.duration
  }

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

  // Waveform bars (decorative)
  const bars = Array.from({ length: 40 }, (_, i) => ({
    height: Math.sin(i * 0.4) * 0.4 + Math.random() * 0.3 + 0.3,
    active: (i / 40) * 100 < progress,
  }))

  return (
    <div style={{
      background: 'var(--bg-raised)', border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-lg)', padding: '16px 20px',
      display: 'flex', flexDirection: 'column', gap: '12px',
    }}>
      <audio ref={audioRef} src={url} preload="metadata" />

      {/* Waveform */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '2px', height: '40px', cursor: 'pointer' }}
        onClick={seek}>
        {bars.map((bar, i) => (
          <div key={i} style={{
            flex: 1, borderRadius: '2px',
            height: `${bar.height * 100}%`,
            background: bar.active ? 'var(--accent)' : 'var(--border-default)',
            transition: 'background 0.1s',
            animation: playing && bar.active ? `wave ${0.5 + Math.random() * 0.5}s ease-in-out infinite alternate` : 'none',
          }} />
        ))}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={toggle} style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'var(--accent)', border: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', flexShrink: 0,
          boxShadow: playing ? 'var(--shadow-accent)' : 'none',
          transition: 'box-shadow 0.2s',
        }}>
          {playing ? <Pause size={14} color="#000" fill="#000" /> : <Play size={14} color="#000" fill="#000" />}
        </button>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
              {fmt(currentTime)}
            </span>
            <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
              {fmt(totalDuration)}
            </span>
          </div>
          <div style={{ height: '3px', background: 'var(--border-default)', borderRadius: '2px', overflow: 'hidden', cursor: 'pointer' }}
            onClick={seek}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'var(--accent)', transition: 'width 0.1s', borderRadius: '2px' }} />
          </div>
        </div>

        <a href={url} download={filename || 'audio.wav'} style={{
          width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 'var(--radius-sm)', background: 'var(--bg-overlay)',
          border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)',
          transition: 'color 0.15s', flexShrink: 0,
        }}>
          <Download size={13} />
        </a>
      </div>
    </div>
  )
}
