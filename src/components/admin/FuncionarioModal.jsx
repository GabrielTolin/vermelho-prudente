import { useState, useEffect } from 'react'
import { supabase } from '../../context/AuthContext'
import { formatarHora, formatarData, calcularPeriodo } from '../../utils/horas'
import RecibosTab from './RecibosTab'
import RegistoManualModal from './RegistoManualModal'
import EditarRegistoModal from './EditarRegistoModal'

function periodoAtual() {
  const agora = new Date()
  const dia = agora.getDate()
  const mes = agora.getMonth()
  const ano = agora.getFullYear()
  if (dia <= 25) {
    return { inicio: new Date(ano, mes - 1, 26), fim: new Date(ano, mes, 25, 23, 59, 59) }
  } else {
    return { inicio: new Date(ano, mes, 26), fim: new Date(ano, mes + 1, 25, 23, 59, 59) }
  }
}

export default function FuncionarioModal({ funcionario, onFechar, onAtualizar }) {
  const [tab, setTab] = useState('info') // 'info' | 'ponto' | 'recibos'
  const [editando, setEditando] = useState(false)
  const [form, setForm] = useState({
    nome: funcionario.nome,
    email: funcionario.email,
    telefone: funcionario.telefone || '',
    valor_hora: funcionario.valor_hora || 0,
    tipo_periodo: funcionario.tipo_periodo || 'mensal_25',
  })
  const [registos, setRegistos] = useState([])
  const [loading, setLoading] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [modalManual, setModalManual] = useState(false)
  const [deletando, setDeletando] = useState(false)
  const [registoEditar, setRegistoEditar] = useState(null)

  useEffect(() => {
    if (tab === 'ponto') carregarRegistos()
  }, [tab])

  async function carregarRegistos() {
    setLoading(true)
    const { inicio, fim } = calcularPeriodo(funcionario.tipo_periodo || 'mensal_25')
    const { data } = await supabase
      .from('vp_registos_ponto')
      .select('*, vp_obras(nome)')
      .eq('funcionario_id', funcionario.id)
      .gte('hora', inicio.toISOString())
      .lte('hora', fim.toISOString())
      .order('hora', { ascending: false })
    setRegistos(data || [])
    setLoading(false)
  }

  async function apagarRegisto(id) {
    if (!confirm('Apagar este registo de ponto?')) return
    await supabase.from('vp_registos_ponto').delete().eq('id', id)
    carregarRegistos()
  }

  async function deletarFuncionario() {
    if (!confirm(`Eliminar permanentemente "${funcionario.nome}"? Esta ação não pode ser revertida.`)) return
    setDeletando(true)
    const BASE_URL = import.meta.env.DEV ? 'http://localhost:3001/api' : 'https://vermelho-prudente.onrender.com/api'
    const res = await fetch(`${BASE_URL}/funcionarios/${funcionario.id}`, { method: 'DELETE' })
    setDeletando(false)
    if (!res.ok) { setErro('Erro ao eliminar funcionário.'); return }
    onAtualizar()
    onFechar()
  }

  async function salvar() {
    setErro('')
    setSalvando(true)
    const { error } = await supabase
      .from('vp_funcionarios')
      .update({
        nome: form.nome,
        telefone: form.telefone,
        valor_hora: Number(form.valor_hora),
        tipo_periodo: form.tipo_periodo,
      })
      .eq('id', funcionario.id)
    setSalvando(false)
    if (error) { setErro('Erro ao guardar.'); return }
    setEditando(false)
    onAtualizar()
  }

  // Agrupa registos por dia
  const registosPorDia = {}
  for (const r of registos) {
    const dia = new Date(r.hora).toISOString().split('T')[0]
    if (!registosPorDia[dia]) registosPorDia[dia] = []
    registosPorDia[dia].push(r)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={onFechar}>
      <div
        className="bg-[#111] rounded-none w-full max-w-lg max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}

        {/* Header */}
        <div className="px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-white font-bold text-lg">{funcionario.nome}</h2>
            <p className="text-gray-500 text-xs mt-0.5">{funcionario.email}</p>
          </div>
          <button onClick={onFechar} className="text-gray-500 hover:text-white text-2xl leading-none">×</button>
        </div>

        {/* Tabs */}
        <div className="flex px-6 gap-4 border-b border-[#1e1e1e] flex-shrink-0">
          <button
            onClick={() => setTab('info')}
            className={`pb-3 text-sm font-semibold transition border-b-2 -mb-px ${
              tab === 'info' ? 'text-white border-[#cc0000]' : 'text-gray-500 border-transparent'
            }`}
          >
            Informações
          </button>
          <button
            onClick={() => setTab('ponto')}
            className={`pb-3 text-sm font-semibold transition border-b-2 -mb-px ${
              tab === 'ponto' ? 'text-white border-[#cc0000]' : 'text-gray-500 border-transparent'
            }`}
          >
            Registos de Ponto
          </button>
          <button
            onClick={() => setTab('recibos')}
            className={`pb-3 text-sm font-semibold transition border-b-2 -mb-px ${
              tab === 'recibos' ? 'text-white border-[#cc0000]' : 'text-gray-500 border-transparent'
            }`}
          >
            Recibos
          </button>
        </div>

        {/* Conteúdo scrollável */}
        <div className="overflow-y-auto flex-1 px-6 py-4 pb-8">

          {tab === 'info' && (
            <div className="flex flex-col gap-4">
              {/* Cards de resumo */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#0a0a0a] rounded-xl p-3 text-center">
                  <p className="text-[#cc0000] font-bold text-xl">{funcionario.valor_hora}€</p>
                  <p className="text-gray-500 text-xs mt-0.5">por hora</p>
                </div>
                <div className="bg-[#0a0a0a] rounded-xl p-3 text-center">
                  <p className="text-white font-bold text-xl">{funcionario.ativo ? 'Ativo' : 'Inativo'}</p>
                  <p className="text-gray-500 text-xs mt-0.5">estado</p>
                </div>
              </div>

              {/* Formulário */}
              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Nome</label>
                  <input
                    value={form.nome}
                    onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                    disabled={!editando}
                    className={`w-full bg-[#0a0a0a] border rounded-xl px-4 py-3 text-white outline-none transition text-sm ${
                      editando ? 'border-[#cc0000]' : 'border-[#222] text-gray-300'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Email</label>
                  <input
                    value={form.email}
                    disabled
                    className="w-full bg-[#0a0a0a] border border-[#222] rounded-xl px-4 py-3 text-gray-500 text-sm"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Telefone</label>
                  <input
                    value={form.telefone}
                    onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))}
                    disabled={!editando}
                    placeholder="—"
                    className={`w-full bg-[#0a0a0a] border rounded-xl px-4 py-3 text-white outline-none transition text-sm ${
                      editando ? 'border-[#cc0000]' : 'border-[#222] text-gray-300'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Período de fecho</label>
                  <select
                    value={form.tipo_periodo}
                    onChange={e => setForm(f => ({ ...f, tipo_periodo: e.target.value }))}
                    disabled={!editando}
                    className={`w-full bg-[#0a0a0a] border rounded-xl px-4 py-3 text-white outline-none transition text-sm ${
                      editando ? 'border-[#cc0000]' : 'border-[#222] text-gray-300'
                    }`}
                  >
                    <option value="mensal_25">Dia 26 ao dia 25 (Portugal)</option>
                    <option value="mensal_fim">Dia 1 ao último dia do mês (Espanha)</option>
                  </select>
                </div>

                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Valor por hora (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.valor_hora}
                    onChange={e => setForm(f => ({ ...f, valor_hora: e.target.value }))}
                    disabled={!editando}
                    className={`w-full bg-[#0a0a0a] border rounded-xl px-4 py-3 text-white outline-none transition text-sm ${
                      editando ? 'border-[#cc0000]' : 'border-[#222] text-gray-300'
                    }`}
                  />
                </div>
              </div>

              {erro && <p className="text-red-400 text-sm text-center">{erro}</p>}

              {editando ? (
                <div className="flex gap-3">
                  <button
                    onClick={() => { setEditando(false); setErro('') }}
                    className="flex-1 border border-[#333] text-gray-400 rounded-xl py-3 text-sm transition hover:border-white"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={salvar}
                    disabled={salvando}
                    className="flex-1 bg-[#cc0000] hover:bg-[#aa0000] text-white font-semibold rounded-xl py-3 text-sm transition disabled:opacity-50"
                  >
                    {salvando ? 'A guardar...' : 'Guardar'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setEditando(true)}
                  className="w-full border border-[#333] hover:border-[#cc0000] text-white rounded-xl py-3 text-sm transition"
                >
                  Editar informações
                </button>
              )}

              <button
                onClick={deletarFuncionario}
                disabled={deletando}
                className="w-full border border-red-900/50 text-red-500 hover:bg-red-900/20 rounded-xl py-3 text-sm transition disabled:opacity-50"
              >
                {deletando ? 'A eliminar...' : 'Eliminar funcionário'}
              </button>
            </div>
          )}

          {tab === 'recibos' && (
            <RecibosTab funcionario={funcionario} />
          )}

          {tab === 'ponto' && (
            <div>
              <button
                onClick={() => setModalManual(true)}
                className="w-full mb-4 border border-[#333] hover:border-[#cc0000] text-gray-300 hover:text-white rounded-xl py-3 text-sm transition"
              >
                + Adicionar registo manual
              </button>

              {loading ? (
                <div className="flex justify-center mt-10">
                  <div className="w-7 h-7 border-4 border-[#cc0000] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : Object.keys(registosPorDia).length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-3xl mb-2">📍</p>
                  <p>Sem registos neste período</p>
                </div>
              ) : (
                Object.entries(registosPorDia).map(([dia, regs]) => (
                  <div key={dia} className="mb-5">
                    <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">
                      {formatarData(dia)}
                    </p>
                    <div className="flex flex-col gap-2">
                      {regs.map(r => (
                        <div key={r.id} className="bg-[#0a0a0a] border border-[#1e1e1e] rounded-xl px-4 py-3 flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${r.tipo === 'entrada' ? 'bg-green-400' : 'bg-red-400'}`} />
                          <div className="flex-1">
                            <p className="text-white text-sm font-medium capitalize">{r.tipo}</p>
                            {r.vp_obras?.nome && (
                              <p className="text-gray-500 text-xs mt-0.5">📍 {r.vp_obras.nome}</p>
                            )}
                          </div>
                          <p className="text-gray-300 text-sm font-mono">{formatarHora(r.hora)}</p>
                          <button
                            onClick={() => setRegistoEditar(r)}
                            className="text-gray-500 hover:text-white text-xs px-2 py-1 border border-[#333] rounded-lg hover:border-[#cc0000] transition"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => apagarRegisto(r.id)}
                            className="text-red-600 hover:text-red-400 text-xs px-2 py-1 border border-red-900/40 rounded-lg hover:border-red-500 transition"
                          >
                            🗑️
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {modalManual && (
        <RegistoManualModal
          funcionario={funcionario}
          onFechar={() => setModalManual(false)}
          onGuardado={() => { setModalManual(false); carregarRegistos() }}
        />
      )}

      {registoEditar && (
        <EditarRegistoModal
          registo={registoEditar}
          onFechar={() => setRegistoEditar(null)}
          onGuardado={() => { setRegistoEditar(null); carregarRegistos() }}
        />
      )}
    </div>
  )
}
