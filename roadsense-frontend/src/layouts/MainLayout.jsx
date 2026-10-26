import { Outlet } from 'react-router-dom'
import AppHeader from '../components/AppHeader'

export default function MainLayout() {
  return (
    <div className="app">
      <AppHeader />
      <main className="container">
        <Outlet />
      </main>
    </div>
  )
}
