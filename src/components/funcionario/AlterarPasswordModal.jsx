import { useState } from 'react'
import { supabase } from '../../context/AuthContext'

export default function AlterarPasswordModal({ onFechar }) {
  const [form, setForm] = useState({ nova: '', confirmar: '' })
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')

    if (form.nova.length < 6) {
      setErro('A password deve ter pelo menos 6 caracteres.')
      return
    }
    if (form.nova !== form.confirmar) {
      setErro('As passwords não coincidem.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: form.nova })
    setLoading(false)

    if (error) { setErro('Erro ao alterar password. Tenta novamente.'); return }
    setSucesso(true)
    setTimeout(onFechar, 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={onFechar}>
      <div
        className="bg-[#111] rounded-none w-full max-w-sm p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white font-bold text-lg">Alterar Password</h2>
          <button onClick={onFechar} className="text-gray-500 hover:text-white text-2xl leading-none">×</button>
        </div>

        {sucesso ? (
          <div className="text-center py-6">
            <p className="text-4xl mb-3">✅</p>
            <p className="text-green-400 font-semibold">Password alterada com sucesso!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-gray-400 text-sm mb-1 block">Nova password</label>
              <input
                type="password"
                value={form.nova}
                onChange={e => setForm(f => ({ ...f, nova: e.target.value }))}
                required
                placeholder="Mínimo 6 caracteres"
                className="w-full bg-[#0a0a0a] border border-[#333] text-white rounded-xl px-4 py-3 outline-none focus:border-[#cc0000] transition"
              />
            </div>

            <div>
              <label className="text-gray-400 text-sm mb-1 block">Confirmar password</label>
              <input
                type="password"
                value={form.confirmar}
                onChange={e => setForm(f => ({ ...f, confirmar: e.target.value }))}
                required
                placeholder="Repete a nova password"
                className="w-full bg-[#0a0a0a] border border-[#333] text-white rounded-xl px-4 py-3 outline-none focus:border-[#cc0000] transition"
              />
            </div>

            {erro && <p className="text-red-400 text-sm text-center">{erro}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#cc0000] hover:bg-[#aa0000] text-white font-semibold rounded-xl py-4 transition disabled:opacity-50"
            >
              {loading ? 'A alterar...' : 'Alterar Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
