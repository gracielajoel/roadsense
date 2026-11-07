import { createBrowserRouter } from 'react-router-dom'
import { RequireAdmin, RequireAuth } from './auth/guards'
import AdminLayout from './layouts/AdminLayout'
import MainLayout from './layouts/MainLayout'
import EventsPage from './pages/admin/EventsPage'
import OverviewPage from './pages/admin/OverviewPage'
import ReportDetailPage from './pages/admin/ReportDetailPage'
import ReportsPage from './pages/admin/ReportsPage'
import TriagePage from './pages/admin/TriagePage'
import UsersPage from './pages/admin/UsersPage'
import VideoDetailPage from './pages/admin/VideoDetailPage'
import VideosPage from './pages/admin/VideosPage'
import WorkOrdersPage from './pages/admin/WorkOrdersPage'
import CitizenPage from './pages/CitizenPage'
import LiveScanPage from './pages/LiveScanPage'
import LoginPage from './pages/LoginPage'
import MyReportsPage from './pages/MyReportsPage'
import NotFoundPage from './pages/NotFoundPage'

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: <RequireAuth />,
    children: [
      {
        element: <MainLayout />,
        children: [
          { index: true, element: <CitizenPage /> },
          { path: 'live', element: <LiveScanPage /> },
          { path: 'reports', element: <MyReportsPage /> },
          {
            path: 'admin',
            element: <RequireAdmin />,
            children: [
              {
                element: <AdminLayout />,
                children: [
                  { index: true, element: <OverviewPage /> },
                  { path: 'triage', element: <TriagePage /> },
                  { path: 'work-orders', element: <WorkOrdersPage /> },
                  { path: 'reports', element: <ReportsPage /> },
                  { path: 'reports/:id', element: <ReportDetailPage /> },
                  { path: 'events', element: <EventsPage /> },
                  { path: 'videos', element: <VideosPage /> },
                  { path: 'videos/:id', element: <VideoDetailPage /> },
                  { path: 'users', element: <UsersPage /> },
                ],
              },
            ],
          },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
])

export default router
