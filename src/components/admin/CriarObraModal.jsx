import { useState } from 'react'
import { supabase } from '../../context/AuthContext'

export default function CriarObraModal({ onFechar, onCriado }) {
  const [form, setForm] = useState({ nome: '', morada: '', raio_metros: 200 })
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [gpsLoading, setGpsLoading] = useState(false)
  const [coords, setCoords] = useState(null)

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  function obterGPS() {
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setGpsLoading(false)
      },
      () => {
        setErro('Não foi possível obter a localização.')
        setGpsLoading(false)
      }
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    const { error } = await supabase.from('vp_obras').insert({
      nome: form.nome,
      morada: form.morada,
      raio_metros: Number(form.raio_metros),
      latitude: coords?.lat || null,
      longitude: coords?.lng || null,
      ativa: true,
    })
    setLoading(false)
    if (error) { setErro('Erro ao criar obra.'); return }
    onCriado()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={onFechar}>
      <div
        className="bg-[#111] rounded-none w-full max-w-lg p-6 pb-8 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-white font-bold text-xl mb-6">Nova Obra</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-gray-400 text-sm mb-1 block">Nome da obra *</label>
            <input
              name="nome"
              value={form.nome}
              onChange={handleChange}
              required
              placeholder="Ex: Moradia João Silva"
              className="w-full bg-[#0a0a0a] border border-[#333] text-white rounded-xl px-4 py-3 outline-none focus:border-[#cc0000] transition"
            />
          </div>

          <div>
            <label className="text-gray-400 text-sm mb-1 block">Morada</label>
            <input
              name="morada"
              value={form.morada}
              onChange={handleChange}
              placeholder="Rua, número, cidade"
              className="w-full bg-[#0a0a0a] border border-[#333] text-white rounded-xl px-4 py-3 outline-none focus:border-[#cc0000] transition"
            />
          </div>

          <div>
            <label className="text-gray-400 text-sm mb-1 block">Raio GPS (metros)</label>
            <input
              name="raio_metros"
              type="number"
              value={form.raio_metros}
              onChange={handleChange}
              min={50}
              max={1000}
              className="w-full bg-[#0a0a0a] border border-[#333] text-white rounded-xl px-4 py-3 outline-none focus:border-[#cc0000] transition"
            />
          </div>

          {/* GPS */}
          <button
            type="button"
            onClick={obterGPS}
            className="w-full border border-[#333] text-gray-300 rounded-xl py-3 text-sm hover:border-[#cc0000] transition"
          >
            {gpsLoading ? 'A obter localização...' : coords ? `✅ GPS: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}` : '📍 Capturar localização GPS'}
          </button>

          {erro && <p className="text-red-400 text-sm text-center">{erro}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#cc0000] hover:bg-[#aa0000] text-white font-semibold rounded-xl py-4 transition disabled:opacity-50 mt-1"
          >
            {loading ? 'A criar...' : 'Criar Obra'}
          </button>
        </form>
      </div>
    </div>
  )
}
