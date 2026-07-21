import { useState, useEffect } from 'react'
import { supabase } from '../../context/AuthContext'
import { formatarHora } from '../../utils/horas'

export default function ObraModal({ obra, onFechar, onAtualizar }) {
  const [tab, setTab] = useState('presenca') // 'presenca' | 'detalhes'
  const [associados, setAssociados] = useState([])
  const [disponiveis, setDisponiveis] = useState([])
  const [presencaAgora, setPresencaAgora] = useState([])
  const [loading, setLoading] = useState(true)
  const [adicionando, setAdicionando] = useState(false)
  const [mensagem, setMensagem] = useState('')

  // Edição de detalhes
  const [form, setForm] = useState({
    nome: obra.nome,
    morada: obra.morada || '',
    raio_metros: obra.raio_metros || 200,
  })
  const [coords, setCoords] = useState(
    obra.latitude && obra.longitude ? { lat: obra.latitude, lng: obra.longitude } : null
  )
  const [salvando, setSalvando] = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [buscandoMorada, setBuscandoMorada] = useState(false)
  const [erroDetalhe, setErroDetalhe] = useState('')

  useEffect(() => {
    carregarDados()
    const intervalo = setInterval(carregarPresenca, 30000)
    return () => clearInterval(intervalo)
  }, [])

  async function carregarPresenca() {
    const hoje = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('vp_registos_ponto')
      .select('funcionario_id, tipo, hora, vp_funcionarios(nome)')
      .eq('obra_id', obra.id)
      .gte('hora', `${hoje}T00:00:00Z`)
      .order('hora', { ascending: false })

    const ultimoRegisto = {}
    for (const r of (data || [])) {
      if (!ultimoRegisto[r.funcionario_id]) ultimoRegisto[r.funcionario_id] = r
    }
    setPresencaAgora(Object.values(ultimoRegisto).filter(r => r.tipo === 'entrada'))
  }

  async function carregarDados() {
    setLoading(true)
    const [{ data: assoc }, { data: todos }] = await Promise.all([
      supabase.from('vp_obra_funcionarios').select('funcionario_id, vp_funcionarios(id, nome, email)').eq('obra_id', obra.id),
      supabase.from('vp_funcionarios').select('id, nome, email').eq('ativo', true).order('nome'),
    ])
    const assocIds = (assoc || []).map(a => a.funcionario_id)
    setAssociados((assoc || []).map(a => a.vp_funcionarios))
    setDisponiveis((todos || []).filter(f => !assocIds.includes(f.id)))
    await carregarPresenca()
    setLoading(false)
  }

  async function adicionar(func) {
    setAdicionando(true)
    const { error } = await supabase.from('vp_obra_funcionarios').insert({ obra_id: obra.id, funcionario_id: func.id })
    setAdicionando(false)
    if (error) { setMensagem('Erro ao adicionar.'); return }
    await carregarDados()
    onAtualizar()
  }

  async function remover(funcId) {
    const { error } = await supabase.from('vp_obra_funcionarios').delete().eq('obra_id', obra.id).eq('funcionario_id', funcId)
    if (error) { setMensagem('Erro ao remover.'); return }
    await carregarDados()
    onAtualizar()
  }

  async function encerrarObra() {
    if (!confirm(`Encerrar a obra "${obra.nome}"?`)) return
    const { error } = await supabase.from('vp_obras').update({ ativa: false }).eq('id', obra.id)
    if (error) { setMensagem('Erro ao encerrar obra.'); return }
    onAtualizar()
  }

  function obterGPSLocal() {
    setGpsLoading(true)
    setErroDetalhe('')
    navigator.geolocation.getCurrentPosition(
      pos => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGpsLoading(false) },
      () => { setErroDetalhe('Não foi possível obter localização.'); setGpsLoading(false) }
    )
  }

  async function obterGPSPorMorada() {
    if (!form.morada.trim()) { setErroDetalhe('Escreve a morada primeiro.'); return }
    setBuscandoMorada(true)
    setErroDetalhe('')
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(form.morada)}&format=json&limit=1`, { headers: { 'Accept-Language': 'pt' } })
      const data = await res.json()
      if (!data || data.length === 0) { setErroDetalhe('Morada não encontrada.'); setBuscandoMorada(false); return }
      setCoords({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) })
    } catch { setErroDetalhe('Erro ao pesquisar morada.') }
    setBuscandoMorada(false)
  }

  async function salvarDetalhes() {
    setErroDetalhe('')
    setSalvando(true)
    const { error } = await supabase.from('vp_obras').update({
      nome: form.nome,
      morada: form.morada,
      raio_metros: Number(form.raio_metros),
      latitude: coords?.lat || null,
      longitude: coords?.lng || null,
    }).eq('id', obra.id)
    setSalvando(false)
    if (error) { setErroDetalhe('Erro ao guardar.'); return }
    onAtualizar()
    setErroDetalhe('')
    setMensagem('✅ Obra atualizada com sucesso!')
    setTimeout(() => setMensagem(''), 3000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={onFechar}>
      <div className="bg-[#111] rounded-none w-full max-w-lg max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="px-6 py-5 border-b border-[#1e1e1e] flex items-start justify-between flex-shrink-0">
          <div>
            <h2 className="text-white font-bold text-lg">{obra.nome}</h2>
            {obra.morada && <p className="text-gray-500 text-xs mt-0.5">{obra.morada}</p>}
            <p className="text-gray-600 text-xs mt-1">Raio GPS: {obra.raio_metros}m</p>
          </div>
          <button onClick={onFechar} className="text-gray-500 hover:text-white text-2xl leading-none">×</button>
        </div>

        {/* Tabs */}
        <div className="flex px-6 gap-4 border-b border-[#1e1e1e] flex-shrink-0">
          <button
            onClick={() => setTab('presenca')}
            className={`pb-3 text-sm font-semibold transition border-b-2 -mb-px ${tab === 'presenca' ? 'text-white border-[#cc0000]' : 'text-gray-500 border-transparent'}`}
          >
            Equipa
          </button>
          <button
            onClick={() => setTab('detalhes')}
            className={`pb-3 text-sm font-semibold transition border-b-2 -mb-px ${tab === 'detalhes' ? 'text-white border-[#cc0000]' : 'text-gray-500 border-transparent'}`}
          >
            Detalhes
          </button>
        </div>

        {/* Conteúdo */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          {mensagem && <p className="text-green-400 text-sm text-center mb-3">{mensagem}</p>}

          {tab === 'presenca' && (
            loading ? (
              <div className="flex justify-center mt-10">
                <div className="w-7 h-7 border-4 border-[#cc0000] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                {/* Presença agora */}
                <div className="mb-6">
                  <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">Presença agora ({presencaAgora.length})</p>
                  {presencaAgora.length === 0 ? (
                    <div className="bg-[#0a0a0a] border border-[#1e1e1e] rounded-xl px-4 py-4 text-center text-gray-600 text-sm">Nenhum funcionário em obra agora</div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {presencaAgora.map(r => (
                        <div key={r.funcionario_id} className="bg-green-900/10 border border-green-800/30 rounded-xl px-4 py-3 flex items-center gap-3">
                          <span className="text-green-400 text-lg">●</span>
                          <div className="flex-1">
                            <p className="text-white text-sm font-medium">{r.vp_funcionarios?.nome}</p>
                            <p className="text-gray-500 text-xs mt-0.5">Entrada às {formatarHora(r.hora)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Funcionários associados */}
                <div className="mb-6">
                  <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">Na obra ({associados.length})</p>
                  {associados.length === 0 ? (
                    <p className="text-gray-600 text-sm text-center py-4">Nenhum funcionário associado</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {associados.map(func => (
                        <div key={func.id} className="bg-[#0a0a0a] border border-[#1e1e1e] rounded-xl px-4 py-3 flex items-center gap-3">
                          <div className="w-8 h-8 bg-[#cc0000]/10 rounded-lg flex items-center justify-center flex-shrink-0"><span>👷</span></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium truncate">{func.nome}</p>
                            <p className="text-gray-500 text-xs truncate">{func.email}</p>
                          </div>
                          <button onClick={() => remover(func.id)} className="text-red-500 hover:text-red-400 text-xs font-semibold transition px-2 py-1 border border-red-900/40 rounded-lg hover:border-red-500">Remover</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Adicionar */}
                {disponiveis.length > 0 && (
                  <div>
                    <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">Adicionar funcionário</p>
                    <div className="flex flex-col gap-2">
                      {disponiveis.map(func => (
                        <div key={func.id} className="bg-[#0a0a0a] border border-[#1e1e1e] rounded-xl px-4 py-3 flex items-center gap-3">
                          <div className="w-8 h-8 bg-[#1a1a1a] rounded-lg flex items-center justify-center flex-shrink-0"><span>👷</span></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium truncate">{func.nome}</p>
                            <p className="text-gray-500 text-xs truncate">{func.email}</p>
                          </div>
                          <button onClick={() => adicionar(func)} disabled={adicionando} className="text-[#cc0000] hover:text-white text-xs font-semibold transition px-2 py-1 border border-[#cc0000]/40 rounded-lg hover:bg-[#cc0000] hover:border-[#cc0000] disabled:opacity-40">Adicionar</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )
          )}

          {tab === 'detalhes' && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Nome da obra</label>
                <input
                  value={form.nome}
                  onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  className="w-full bg-[#0a0a0a] border border-[#cc0000] text-white rounded-xl px-4 py-3 outline-none text-sm"
                />
              </div>

              <div>
                <label className="text-gray-400 text-xs mb-1 block">Morada</label>
                <div className="flex gap-2">
                  <input
                    value={form.morada}
                    onChange={e => setForm(f => ({ ...f, morada: e.target.value }))}
                    placeholder="Rua, número, cidade"
                    className="flex-1 bg-[#0a0a0a] border border-[#cc0000] text-white rounded-xl px-4 py-3 outline-none text-sm"
                  />
                  <button
                    type="button"
                    onClick={obterGPSPorMorada}
                    disabled={buscandoMorada}
                    className="px-3 bg-[#0a0a0a] border border-[#333] text-gray-300 rounded-xl hover:border-[#cc0000] transition text-sm disabled:opacity-50"
                  >
                    {buscandoMorada ? '...' : '🔍'}
                  </button>
                </div>
                <p className="text-gray-600 text-xs mt-1">Clica em 🔍 para obter coordenadas pela morada</p>
              </div>

              <div>
                <label className="text-gray-400 text-xs mb-1 block">Raio GPS (metros)</label>
                <input
                  type="number"
                  value={form.raio_metros}
                  onChange={e => setForm(f => ({ ...f, raio_metros: e.target.value }))}
                  min={50} max={500}
                  className="w-full bg-[#0a0a0a] border border-[#cc0000] text-white rounded-xl px-4 py-3 outline-none text-sm"
                />
              </div>

              <button
                type="button"
                onClick={obterGPSLocal}
                disabled={gpsLoading}
                className="w-full border border-[#333] text-gray-300 rounded-xl py-3 text-sm hover:border-[#cc0000] transition disabled:opacity-50"
              >
                {gpsLoading ? 'A obter localização...' : '📍 Usar a minha localização atual'}
              </button>

              {coords ? (
                <div className="bg-green-900/20 border border-green-800/30 rounded-xl px-4 py-3 text-center">
                  <p className="text-green-400 text-sm font-medium">✅ Localização definida</p>
                  <p className="text-gray-500 text-xs mt-0.5">{coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</p>
                </div>
              ) : (
                <div className="bg-yellow-900/10 border border-yellow-800/20 rounded-xl px-4 py-3 text-center">
                  <p className="text-yellow-600 text-xs">⚠️ Sem localização GPS — funcionários não conseguem marcar ponto</p>
                </div>
              )}

              {erroDetalhe && <p className="text-red-400 text-sm text-center">{erroDetalhe}</p>}

              <button
                onClick={salvarDetalhes}
                disabled={salvando}
                className="w-full bg-[#cc0000] hover:bg-[#aa0000] text-white font-semibold rounded-xl py-4 transition disabled:opacity-50"
              >
                {salvando ? 'A guardar...' : 'Guardar alterações'}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#1e1e1e] flex-shrink-0">
          <button onClick={encerrarObra} className="w-full border border-red-900/50 text-red-500 hover:bg-red-900/20 rounded-xl py-3 text-sm font-semibold transition">
            Encerrar obra
          </button>
        </div>
      </div>
    </div>
  )
}
