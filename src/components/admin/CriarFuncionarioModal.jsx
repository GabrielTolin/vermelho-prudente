import { useState } from 'react'

export default function CriarFuncionarioModal({ onFechar, onCriado }) {
  const [form, setForm] = useState({
    nome: '',
    email: '',
    telefone: '',
    valor_hora: '',
  })
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    setLoading(true)

    try {
      const res = await fetch('http://localhost:3001/api/funcionarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao criar funcionário')
      onCriado()
    } catch (err) {
      setErro(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={onFechar}>
      <div
        className="bg-[#111] rounded-none w-full max-w-lg p-6 pb-8 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-white font-bold text-xl mb-6">Novo Funcionário</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-gray-400 text-sm mb-1 block">Nome completo *</label>
            <input
              name="nome"
              value={form.nome}
              onChange={handleChange}
              required
              placeholder="Ex: João Silva"
              className="w-full bg-[#0a0a0a] border border-[#333] text-white rounded-xl px-4 py-3 outline-none focus:border-[#cc0000] transition"
            />
          </div>

          <div>
            <label className="text-gray-400 text-sm mb-1 block">Email *</label>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              required
              placeholder="funcionario@email.com"
              className="w-full bg-[#0a0a0a] border border-[#333] text-white rounded-xl px-4 py-3 outline-none focus:border-[#cc0000] transition"
            />
          </div>

          <div>
            <label className="text-gray-400 text-sm mb-1 block">Telefone</label>
            <input
              name="telefone"
              type="tel"
              value={form.telefone}
              onChange={handleChange}
              placeholder="+351 912 345 678"
              className="w-full bg-[#0a0a0a] border border-[#333] text-white rounded-xl px-4 py-3 outline-none focus:border-[#cc0000] transition"
            />
          </div>

          <div>
            <label className="text-gray-400 text-sm mb-1 block">Valor por hora (€)</label>
            <input
              name="valor_hora"
              type="number"
              step="0.01"
              min="0"
              value={form.valor_hora}
              onChange={handleChange}
              placeholder="0.00"
              className="w-full bg-[#0a0a0a] border border-[#333] text-white rounded-xl px-4 py-3 outline-none focus:border-[#cc0000] transition"
            />
          </div>

          <div className="bg-[#0a0a0a] border border-[#222] rounded-xl px-4 py-3">
            <p className="text-gray-500 text-xs">Password temporária:</p>
            <p className="text-white font-mono text-sm mt-1">VermelhoPrudente2026!</p>
          </div>

          {erro && <p className="text-red-400 text-sm text-center">{erro}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#cc0000] hover:bg-[#aa0000] text-white font-semibold rounded-xl py-4 transition disabled:opacity-50 mt-1"
          >
            {loading ? 'A criar...' : 'Criar Funcionário'}
          </button>
        </form>
      </div>
    </div>
  )
}
