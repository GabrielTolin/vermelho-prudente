import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import RotaProtegida from './components/RotaProtegida'
import RedireccionarPorRole from './components/RedireccionarPorRole'
import Login from './pages/Login'
import Ponto from './pages/funcionario/Ponto'
import Dashboard from './pages/admin/Dashboard'
import logo from './assets/logo.png'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        {/* Fundo com logo */}
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundImage: `url(${logo})`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            backgroundSize: 'contain',
            mixBlendMode: 'screen',
            opacity: 0.1,
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<RedireccionarPorRole />} />
            <Route
              path="/ponto"
              element={
                <RotaProtegida>
                  <Ponto />
                </RotaProtegida>
              }
            />
            <Route
              path="/dashboard"
              element={
                <RotaProtegida apenasAdmin>
                  <Dashboard />
                </RotaProtegida>
              }
            />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </AuthProvider>
    </BrowserRouter>
  )
}
