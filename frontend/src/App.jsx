import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthPage } from './pages/AuthPage'
import { DashboardPage } from './pages/DashboardPage'
import { InviteAcceptPage } from './pages/InviteAcceptPage'
import { ProfilePage } from './pages/ProfilePage'
import { TripDetailPage } from './pages/TripDetailPage'
import { ProtectedRoute } from './components/ProtectedRoute'
import { PullToRefresh } from './components/PullToRefresh'

const PwaInstallPrompt = lazy(() =>
  import('./components/PwaInstallPrompt').then((module) => ({ default: module.PwaInstallPrompt })),
)

function App() {
  return (
    <PullToRefresh>
      <Routes>
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/signup" element={<AuthPage mode="signup" />} />
        <Route path="/invite/:token" element={<InviteAcceptPage />} />
        <Route
          path="/trips"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/trips/:id"
          element={
            <ProtectedRoute>
              <TripDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/trips" replace />} />
      </Routes>
      <Suspense fallback={null}>
        <PwaInstallPrompt />
      </Suspense>
    </PullToRefresh>
  )
}

export default App
