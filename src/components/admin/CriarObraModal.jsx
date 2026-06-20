import { useState } from 'react'
import { supabase } from '../../context/AuthContext'

export default function CriarObraModal({ onFechar, onCriado }) {
  const [form, setForm] = useState({ nome: '', morada: '', raio_metros: 200 })
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [gpsLoading, setGpsLoading] = useState(false)
  const [coords, setCoords] = useState(null)
  const [buscandoMorada, setBuscandoMorada] = useState(false)

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  // Obter GPS do dispositivo (admin está no local)
  function obterGPSLocal() {
    setGpsLoading(true)
    setErro('')
    navigator.geolocation.getCurrentPosition(
      pos => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setGpsLoading(false)
      },
      () => {
        setErro('Não foi possível obter a localização do dispositivo.')
        setGpsLoading(false)
      }
    )
  }

  // Obter coordenadas pela morada (Nominatim OpenStreetMap)
  async function obterGPSPorMorada() {
    if (!form.morada.trim()) {
      setErro('Escreve a morada primeiro.')
      return
    }
    setBuscandoMorada(true)
    setErro('')
    try {
      const query = encodeURIComponent(form.morada)
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`, {
        headers: { 'Accept-Language': 'pt' }
      })
      const data = await res.json()
      if (!data || data.length === 0) {
        setErro('Morada não encontrada. Tenta ser mais específico.')
        setBuscandoMorada(false)
        return
      }
      setCoords({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) })
    } catch {
      setErro('Erro ao pesquisar morada.')
    }
    setBuscandoMorada(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')

    if (!coords) {
      setErro('É obrigatório definir a localização GPS da obra.')
      return
    }

    setLoading(true)
    const { error } = await supabase.from('vp_obras').insert({
      nome: form.nome,
      morada: form.morada,
      raio_metros: Number(form.raio_metros),
      latitude: coords.lat,
      longitude: coords.lng,
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
            <div className="flex gap-2">
              <input
                name="morada"
                value={form.morada}
                onChange={handleChange}
                placeholder="Rua, número, cidade"
                className="flex-1 bg-[#0a0a0a] border border-[#333] text-white rounded-xl px-4 py-3 outline-none focus:border-[#cc0000] transition"
              />
              <button
                type="button"
                onClick={obterGPSPorMorada}
                disabled={buscandoMorada}
                className="px-3 bg-[#0a0a0a] border border-[#333] text-gray-300 rounded-xl hover:border-[#cc0000] transition text-sm disabled:opacity-50 whitespace-nowrap"
              >
                {buscandoMorada ? '...' : '🔍'}
              </button>
            </div>
            <p className="text-gray-600 text-xs mt-1">Clica em 🔍 para obter coordenadas pela morada</p>
          </div>

          <div>
            <label className="text-gray-400 text-sm mb-1 block">Raio GPS (metros)</label>
            <input
              name="raio_metros"
              type="number"
              value={form.raio_metros}
              onChange={handleChange}
              min={50}
              max={500}
              className="w-full bg-[#0a0a0a] border border-[#333] text-white rounded-xl px-4 py-3 outline-none focus:border-[#cc0000] transition"
            />
          </div>

          {/* GPS */}
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={obterGPSLocal}
              disabled={gpsLoading}
              className="w-full border border-[#333] text-gray-300 rounded-xl py-3 text-sm hover:border-[#cc0000] transition disabled:opacity-50"
            >
              {gpsLoading ? 'A obter localização...' : '📍 Usar a minha localização atual'}
            </button>

            {coords && (
              <div className="bg-green-900/20 border border-green-800/30 rounded-xl px-4 py-3 text-center">
                <p className="text-green-400 text-sm font-medium">✅ Localização definida</p>
                <p className="text-gray-500 text-xs mt-0.5">{coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</p>
              </div>
            )}

            {!coords && (
              <p className="text-yellow-600 text-xs text-center">⚠️ Obrigatório — sem GPS os funcionários não conseguem marcar ponto</p>
            )}
          </div>

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
