import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function RedireccionarPorRole() {
  const { utilizador, perfil, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!utilizador) return <Navigate to="/login" replace />

  return perfil?.role === 'admin'
    ? <Navigate to="/dashboard" replace />
    : <Navigate to="/ponto" replace />
}
