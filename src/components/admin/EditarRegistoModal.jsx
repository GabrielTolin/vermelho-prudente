import { useState } from 'react'
import { supabase } from '../../context/AuthContext'

export default function EditarRegistoModal({ registo, onFechar, onGuardado }) {
  const horaLocal = new Date(registo.hora)
  const dataStr = `${horaLocal.getFullYear()}-${String(horaLocal.getMonth() + 1).padStart(2, '0')}-${String(horaLocal.getDate()).padStart(2, '0')}`
  const horaStr = `${String(horaLocal.getHours()).padStart(2, '0')}:${String(horaLocal.getMinutes()).padStart(2, '0')}`

  const [form, setForm] = useState({
    tipo: registo.tipo,
    data: dataStr,
    hora: horaStr,
  })
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')

    const [ano, mes, dia] = form.data.split('-').map(Number)
    const [horas, minutos] = form.hora.split(':').map(Number)
    const horaFinal = new Date(ano, mes - 1, dia, horas, minutos, 0)

    setLoading(true)
    const { error } = await supabase
      .from('vp_registos_ponto')
      .update({ tipo: form.tipo, hora: horaFinal.toISOString() })
      .eq('id', registo.id)
    setLoading(false)

    if (error) { setErro('Erro ao guardar.'); return }
    onGuardado()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 px-4" onClick={onFechar}>
      <div
        className="bg-[#111] rounded-none w-full max-w-sm p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white font-bold text-lg">Editar Registo</h2>
          <button onClick={onFechar} className="text-gray-500 hover:text-white text-2xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
            disabled={loading}
            className="w-full bg-[#cc0000] hover:bg-[#aa0000] text-white font-semibold rounded-xl py-4 transition disabled:opacity-50"
          >
            {loading ? 'A guardar...' : 'Guardar'}
          </button>
        </form>
      </div>
    </div>
  )
}
