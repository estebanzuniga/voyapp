import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthPage } from './pages/AuthPage'
import { DashboardPage } from './pages/DashboardPage'
import { TripDetailPage } from './pages/TripDetailPage'
import { ProtectedRoute } from './components/ProtectedRoute'
import { PullToRefresh } from './components/PullToRefresh'

function App() {
  return (
    <PullToRefresh>
      <Routes>
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/signup" element={<AuthPage mode="signup" />} />
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
        <Route path="*" element={<Navigate to="/trips" replace />} />
      </Routes>
    </PullToRefresh>
  )
}

export default App
