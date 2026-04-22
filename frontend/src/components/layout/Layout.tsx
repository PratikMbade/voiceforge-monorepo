import React from 'react'
import { Sidebar } from './Sidebar'

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: 'flex', minHeight: '100vh' }}>
    <Sidebar />
    <main style={{
      marginLeft: 'var(--sidebar-w)',
      flex: 1,
      minHeight: '100vh',
      background: 'var(--bg-base)',
    }}>
      {children}
    </main>
  </div>
)
