import React from 'react'
import { createRouter, createRoute, createRootRoute, Outlet, RouterProvider } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { Layout } from './components/layout/Layout'
import StudioPage from './routes/studio'
import VoicesPage from './routes/voices'
import HistoryPage from './routes/history'
import ProjectsPage from './routes/projects'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
})

const rootRoute = createRootRoute({
  component: () => (
    <Layout>
      <Outlet />
    </Layout>
  ),
})

const studioRoute   = createRoute({ getParentRoute: () => rootRoute, path: '/',         component: StudioPage })
const voicesRoute   = createRoute({ getParentRoute: () => rootRoute, path: '/voices',   component: VoicesPage })
const historyRoute  = createRoute({ getParentRoute: () => rootRoute, path: '/history',  component: HistoryPage })
const projectsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/projects', component: ProjectsPage })
const settingsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/settings', component: () => (
  <div style={{ padding: '32px' }}>
    <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '28px' }}>Settings</h1>
    <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>Configuration coming soon.</p>
  </div>
)})

const routeTree = rootRoute.addChildren([studioRoute, voicesRoute, historyRoute, projectsRoute, settingsRoute])
const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register { router: typeof router }
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'var(--bg-overlay)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-default)',
            fontFamily: 'var(--font-body)',
            fontSize: '13px',
          },
          success: { iconTheme: { primary: 'var(--success)', secondary: '#000' } },
          error:   { iconTheme: { primary: 'var(--error)',   secondary: '#000' } },
        }}
      />
    </QueryClientProvider>
  )
}
