import { createBrowserRouter, RouterProvider, type RouteObject } from 'react-router'
import { LandingPage } from './landing/LandingPage'

export const routes: RouteObject[] = [
  { path: '/', element: <LandingPage /> },
  {
    path: '/dashboard/*',
    lazy: async () => ({ Component: (await import('./dashboard/NexusDashboard')).default }),
  },
  { path: '*', element: <LandingPage /> },
]

// Created on first render, not at import, so the module can load without a DOM (unit tests).
let router: ReturnType<typeof createBrowserRouter> | undefined

export function AppRouter() {
  router ??= createBrowserRouter(routes)
  return <RouterProvider router={router} />
}
