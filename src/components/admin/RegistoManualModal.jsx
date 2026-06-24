import { useState, useEffect } from 'react'
import { supabase } from '../../context/AuthContext'

export default function RegistoManualModal({ funcionario, onFechar, onGuardado }) {
  const [obras, setObras] = useState([])
  const [form, setForm] = useState({
    obra_id: '',
    tipo: 'entrada',
    data: new Date().toISOString().split('T')[0],
    hora: '08:00',
  })
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    supabase
      .from('vp_obra_funcionarios')
      .select('obra_id, vp_obras(id, nome)')
      .eq('funcionario_id', funcionario.id)
      .then(({ data }) => {
        const obrasAtivas = (data || []).map(d => d.vp_obras).filter(Boolean)
        setObras(obrasAtivas)
        if (obrasAtivas.length > 0) setForm(f => ({ ...f, obra_id: obrasAtivas[0].id }))
      })
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')

    if (!form.obra_id) { setErro('Seleciona uma obra.'); return }

    // Combinar data + hora num Date local
    const [ano, mes, dia] = form.data.split('-').map(Number)
    const [horas, minutos] = form.hora.split(':').map(Number)
    const horaLocal = new Date(ano, mes - 1, dia, horas, minutos, 0)

    setLoading(true)
    const { error } = await supabase.from('vp_registos_ponto').insert({
      funcionario_id: funcionario.id,
      obra_id: form.obra_id,
      tipo: form.tipo,
      hora: horaLocal.toISOString(),
    })
    setLoading(false)

    if (error) { setErro('Erro ao guardar registo.'); return }
    onGuardado()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 px-4" onClick={onFechar}>
      <div
        className="bg-[#111] rounded-none w-full max-w-sm p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-white font-bold text-lg">Registo Manual</h2>
            <p className="text-gray-500 text-xs mt-0.5">{funcionario.nome}</p>
          </div>
          <button onClick={onFechar} className="text-gray-500 hover:text-white text-2xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-gray-400 text-sm mb-1 block">Obra</label>
            <select
              value={form.obra_id}
              onChange={e => setForm(f => ({ ...f, obra_id: e.target.value }))}
              className="w-full bg-[#0a0a0a] border border-[#333] text-white rounded-xl px-4 py-3 outline-none focus:border-[#cc0000] transition"
            >
              {obras.length === 0 && <option value="">Sem obras associadas</option>}
              {obras.map(o => (
                <option key={o.id} value={o.id}>{o.nome}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-gray-400 text-sm mb-1 block">Tipo</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, tipo: 'entrada' }))}
                className={`py-3 rounded-xl text-sm font-semibold border transition ${
                  form.tipo === 'entrada'
                    ? 'bg-green-900/30 border-green-700 text-green-400'
                    : 'bg-[#0a0a0a] border-[#333] text-gray-400'
                }`}
              >
                ● Entrada
              </button>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, tipo: 'saida' }))}
                className={`py-3 rounded-xl text-sm font-semibold border transition ${
                  form.tipo === 'saida'
                    ? 'bg-red-900/30 border-red-700 text-red-400'
                    : 'bg-[#0a0a0a] border-[#333] text-gray-400'
                }`}
              >
                ● Saída
              </button>
            </div>
          </div>

          <div>
            <label className="text-gray-400 text-sm mb-1 block">Data</label>
            <input
              type="date"
              value={form.data}
              onChange={e => setForm(f => ({ ...f, data: e.target.value }))}
              className="w-full bg-[#0a0a0a] border border-[#333] text-white rounded-xl px-4 py-3 outline-none focus:border-[#cc0000] transition"
            />
          </div>

          <div>
            <label className="text-gray-400 text-sm mb-1 block">Hora</label>
            <input
              type="time"
              value={form.hora}
              onChange={e => setForm(f => ({ ...f, hora: e.target.value }))}
              className="w-full bg-[#0a0a0a] border border-[#333] text-white rounded-xl px-4 py-3 outline-none focus:border-[#cc0000] transition"
            />
          </div>

          {erro && <p className="text-red-400 text-sm text-center">{erro}</p>}

          <button
            type="submit"
            disabled={loading || obras.length === 0}
            className="w-full bg-[#cc0000] hover:bg-[#aa0000] text-white font-semibold rounded-xl py-4 transition disabled:opacity-50"
          >
            {loading ? 'A guardar...' : 'Guardar Registo'}
          </button>
        </form>
      </div>
    </div>
  )
}
