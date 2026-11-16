import { createBrowserRouter } from 'react-router-dom'
import { RequireAuth } from './auth/guards'
import MainLayout from './layouts/MainLayout'
import HistoryPage from './pages/HistoryPage'
import LiveScanPage from './pages/LiveScanPage'
import LoginPage from './pages/LoginPage'
import NotFoundPage from './pages/NotFoundPage'

// Aplikasi khusus pengendara: Live HUD (peringatan lubang) + riwayat perjalanan sendiri.
const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: <RequireAuth />,
    children: [
      {
        element: <MainLayout />,
        children: [
          { index: true, element: <LiveScanPage /> },
          { path: 'history', element: <HistoryPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
])

export default router
