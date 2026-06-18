import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import logo from '../assets/logo.png'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    try {
      await login(email, password)
      // Aguarda o perfil ser carregado antes de redirecionar
      setTimeout(() => {
        navigate('/', { replace: true })
      }, 500)
    } catch {
      setErro('Email ou password incorretos.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-6 bg-black overflow-hidden">

      {/* Fundo com logo esbatido */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundImage: `url(${logo})`,
          backgroundRepeat: 'repeat',
          backgroundSize: '320px',
          opacity: 0.06,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center">

        {/* Logo */}
        <img src={logo} alt="Vermelho Prudente" className="w-64 mb-2" />

        {/* Subtítulo com linhas */}
        <div className="flex items-center gap-3 mb-10 w-full justify-center">
          <div className="flex-1 h-px bg-[#cc0000]" />
          <span className="text-white text-xs font-semibold tracking-widest uppercase whitespace-nowrap">
            Canalizações Hidráulicas
          </span>
          <div className="flex-1 h-px bg-[#cc0000]" />
        </div>

        {/* Formulário */}
        <div className="w-full">
          <h1 className="text-2xl font-bold text-white mb-1">Bem-vindo</h1>
          <p className="text-gray-400 text-sm mb-6">Entra na tua conta para continuar</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-white text-sm font-medium mb-1 block">Email</label>
              <input
                type="email"
                placeholder="o.teu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full bg-[#111] border border-[#333] text-white rounded-xl px-4 py-3 outline-none focus:border-[#cc0000] transition placeholder-gray-600"
              />
            </div>

            <div>
              <label className="text-white text-sm font-medium mb-1 block">Password</label>
              <input
                type="password"
                placeholder="••••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full bg-[#111] border border-[#333] text-white rounded-xl px-4 py-3 outline-none focus:border-[#cc0000] transition placeholder-gray-600"
              />
            </div>

            {erro && <p className="text-red-400 text-sm text-center">{erro}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#cc0000] hover:bg-[#aa0000] text-white font-semibold rounded-xl py-4 mt-1 transition disabled:opacity-50 flex items-center justify-center gap-2 text-base"
            >
              {loading ? 'A entrar...' : <>Entrar <span>→</span></>}
            </button>
          </form>
        </div>

        {/* Rodapé */}
        <p className="mt-8 text-sm">
          <span className="text-[#cc0000] font-semibold">Vermelho Prudente</span>
          <span className="text-gray-500"> • Canalizações</span>
        </p>
      </div>
    </div>
  )
}
