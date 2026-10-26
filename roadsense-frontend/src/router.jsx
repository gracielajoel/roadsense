import { createBrowserRouter } from 'react-router-dom'
import AdminLayout from './layouts/AdminLayout'
import MainLayout from './layouts/MainLayout'
import EventsPage from './pages/admin/EventsPage'
import OverviewPage from './pages/admin/OverviewPage'
import ReportDetailPage from './pages/admin/ReportDetailPage'
import ReportsPage from './pages/admin/ReportsPage'
import UsersPage from './pages/admin/UsersPage'
import VideoDetailPage from './pages/admin/VideoDetailPage'
import VideosPage from './pages/admin/VideosPage'
import CitizenPage from './pages/CitizenPage'
import NotFoundPage from './pages/NotFoundPage'

const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <CitizenPage /> },
      {
        path: 'admin',
        element: <AdminLayout />,
        children: [
          { index: true, element: <OverviewPage /> },
          { path: 'reports', element: <ReportsPage /> },
          { path: 'reports/:id', element: <ReportDetailPage /> },
          { path: 'events', element: <EventsPage /> },
          { path: 'videos', element: <VideosPage /> },
          { path: 'videos/:id', element: <VideoDetailPage /> },
          { path: 'users', element: <UsersPage /> },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])

export default router
