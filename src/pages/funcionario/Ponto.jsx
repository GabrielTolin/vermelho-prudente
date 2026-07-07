import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../context/AuthContext'
import { distanciaMetros } from '../../utils/gps'
import AlterarPasswordModal from '../../components/funcionario/AlterarPasswordModal'
import { formatarHora, formatarData, arredondar15min, timezoneLocal, calcularPeriodo } from '../../utils/horas'

export default function Ponto() {

  
  const { perfil, utilizador, logout } = useAuth()
  const [funcionario, setFuncionario] = useState(null)
  const [obras, setObras] = useState([])
  const [registosHoje, setRegistosHoje] = useState([])
  const [gps, setGps] = useState(null)
  const [erroGps, setErroGps] = useState('')
  const [loading, setLoading] = useState(true)
  const [marcando, setMarcando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [recibos, setRecibos] = useState([])
  const [resumoMes, setResumoMes] = useState({ horas: '0.0', dias: 0, custo: '0.00' })
  const [tab, setTab] = useState('ponto')
  const [modalPassword, setModalPassword] = useState(false) // 'ponto' | 'recibos'

  const hoje = new Date().toLocaleDateString('pt-PT', {
    weekday: 'long', day: '2-digit', month: 'long'
  })

  useEffect(() => {
    if (utilizador) carregarDados()
    obterGPS()
  }, [utilizador])

  async function carregarDados() {
    // Buscar funcionário pelo id do utilizador
    const { data: func } = await supabase
      .from('vp_funcionarios')
      .select('*')
      .eq('id', utilizador.id)
      .single()

    if (!func) { setLoading(false); return }
    setFuncionario(func)

    // Buscar obras associadas
    const { data: obrasAssoc } = await supabase
      .from('vp_obra_funcionarios')
      .select('vp_obras(*)')
      .eq('funcionario_id', func.id)

    const obrasList = (obrasAssoc || []).map(o => o.vp_obras).filter(Boolean).filter(o => o.ativa)
    setObras(obrasList)

    // Registos de hoje — meia-noite em Lisboa (UTC-1 no inverno, UTC no verão)
    const agora = new Date()
    const inicioDia = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 0, 0, 0)
    const fimDia = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 23, 59, 59)
    const { data: registos } = await supabase
      .from('vp_registos_ponto')
      .select('*')
      .eq('funcionario_id', func.id)
      .gte('hora', inicioDia.toISOString())
      .lte('hora', fimDia.toISOString())
      .order('hora')

    setRegistosHoje(registos || [])

    // Recibos
    const { data: recibosData } = await supabase
      .from('vp_recibos')
      .select('*')
      .eq('funcionario_id', func.id)
      .order('criado_em', { ascending: false })
    setRecibos(recibosData || [])

    // Resumo do mês
    const { inicio, fim } = calcularPeriodo(func.tipo_periodo || 'mensal_25')
    const { data: registosMes } = await supabase
      .from('vp_registos_ponto')
      .select('tipo, hora')
      .eq('funcionario_id', func.id)
      .gte('hora', inicio.toISOString())
      .lte('hora', fim.toISOString())
      .order('hora')

    let totalMs = 0
    const dias = new Set()
    const regs = registosMes || []
    for (let i = 0; i < regs.length - 1; i++) {
      if (regs[i].tipo === 'entrada' && regs[i + 1].tipo === 'saida') {
        const entrada = new Date(regs[i].hora)
        const saida = new Date(regs[i + 1].hora)
        totalMs += saida - entrada
        dias.add(entrada.toISOString().split('T')[0])
      }
    }
    const horas = totalMs / 3600000
    setResumoMes({
      horas: horas.toFixed(1),
      dias: dias.size,
      custo: (horas * (func.valor_hora || 0)).toFixed(2),
    })

    setLoading(false)
  }

  async function abrirRecibo(recibo) {
    const { data, error } = await supabase.storage
      .from('recibos')
      .createSignedUrl(recibo.url, 60)
    if (error) return
    window.open(data.signedUrl, '_blank')
  }

  function obterGPS() {
    if (!navigator.geolocation) {
      setErroGps('GPS não disponível neste dispositivo.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      pos => setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setErroGps('Não foi possível obter a localização. Ativa o GPS.')
    )
  }

  // Determina estado atual: dentro ou fora de alguma obra
  const ultimoRegisto = registosHoje[registosHoje.length - 1]
  const estaEmObra = ultimoRegisto?.tipo === 'entrada'
  const obraAtiva = estaEmObra ? obras.find(o => o.id === ultimoRegisto?.obra_id) : null

  async function marcarPonto(obra) {
    if (!gps) { setErroGps('Aguarda o GPS...'); return }

    // Bloquear se obra não tiver GPS definido
    if (!obra.latitude || !obra.longitude) {
      setMensagem('Esta obra não tem localização GPS definida. Contacta o administrador.')
      return
    }

    // Validar raio
    const dist = distanciaMetros(gps.lat, gps.lng, obra.latitude, obra.longitude)
    if (dist > obra.raio_metros) {
      setMensagem(`Estás a ${Math.round(dist)}m da obra. Tens de estar a menos de ${obra.raio_metros}m para marcar ponto.`)
      return
    }

    setMarcando(true)
    setMensagem('')

    const tipo = estaEmObra && obraAtiva?.id === obra.id ? 'saida' : 'entrada'

    const horaArredondada = arredondar15min(new Date())

    const { error } = await supabase.from('vp_registos_ponto').insert({
      funcionario_id: funcionario.id,
      obra_id: obra.id,
      tipo,
      latitude: gps.lat,
      longitude: gps.lng,
      hora: horaArredondada.toISOString(),
    })

    setMarcando(false)
    if (error) { setMensagem('Erro ao marcar ponto.'); return }

    setMensagem(tipo === 'entrada' ? '✅ Entrada registada!' : '✅ Saída registada!')
    await carregarDados()
    setTimeout(() => setMensagem(''), 3000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="w-8 h-8 border-4 border-[#cc0000] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-black overflow-hidden flex flex-col items-center justify-center">

      {/* Fundo */}
      <div
        style={{
          position: 'fixed', inset: 0,
          backgroundImage: `url(/logo.png)`,
          backgroundRepeat: 'repeat',
          backgroundSize: '320px',
          opacity: 0.07,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <div className="relative z-10 w-full max-w-lg mx-auto px-6 py-10 flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-start justify-between mb-0">
          <div>
            <h1 className="text-white font-bold text-lg">Olá, {funcionario?.nome?.split(' ')[0] || 'Funcionário'} 👋</h1>
            <p className="text-gray-500 text-sm mt-0.5 capitalize">{hoje}</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setModalPassword(true)} className="text-gray-500 hover:text-white text-sm transition">🔑</button>
            <button onClick={logout} className="text-gray-500 hover:text-white text-sm transition">Sair</button>
          </div>
        </div>

        {/* Resumo do mês */}
        <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl px-5 py-4">
          <p className="text-gray-500 text-xs mb-3 uppercase tracking-wider font-semibold">Este mês</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-white font-bold text-xl">{resumoMes.horas}h</p>
              <p className="text-gray-500 text-xs mt-0.5">Horas</p>
            </div>
            <div className="text-center border-x border-[#222]">
              <p className="text-white font-bold text-xl">{resumoMes.dias}</p>
              <p className="text-gray-500 text-xs mt-0.5">Dias</p>
            </div>
            <div className="text-center">
              <p className="text-[#cc0000] font-bold text-xl">{resumoMes.custo}€</p>
              <p className="text-gray-500 text-xs mt-0.5">A receber</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-0 border-b border-[#1e1e1e]">
          <button
            onClick={() => setTab('ponto')}
            className={`pb-3 text-sm font-semibold transition border-b-2 -mb-px ${
              tab === 'ponto' ? 'text-white border-[#cc0000]' : 'text-gray-500 border-transparent'
            }`}
          >
            Ponto
          </button>
          <button
            onClick={() => setTab('recibos')}
            className={`pb-3 text-sm font-semibold transition border-b-2 -mb-px ${
              tab === 'recibos' ? 'text-white border-[#cc0000]' : 'text-gray-500 border-transparent'
            }`}
          >
            Recibos {recibos.length > 0 && <span className="ml-1 bg-[#cc0000] text-white text-xs rounded-full px-1.5 py-0.5">{recibos.length}</span>}
          </button>
        </div>

        {tab === 'recibos' && (
          <div>
            {recibos.length === 0 ? (
              <div className="text-center py-12 text-gray-500 bg-[#111] rounded-2xl border border-[#1e1e1e]">
                <p className="text-3xl mb-2">📄</p>
                <p className="text-sm">Nenhum recibo disponível</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {recibos.map(r => (
                  <div key={r.id} className="bg-[#111] border border-[#1e1e1e] rounded-xl px-4 py-3 flex items-center gap-3">
                    <span className="text-xl flex-shrink-0">📄</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{r.nome}</p>
                      <p className="text-gray-500 text-xs mt-0.5">{formatarData(r.criado_em)}</p>
                    </div>
                    <button
                      onClick={() => abrirRecibo(r)}
                      className="text-xs text-[#cc0000] hover:text-white border border-[#cc0000]/40 hover:bg-[#cc0000] hover:border-[#cc0000] px-3 py-1.5 rounded-lg transition"
                    >
                      Abrir
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'ponto' && <>

        {/* Estado GPS */}
        <div className={`rounded-xl px-4 py-3 mb-0 flex items-center gap-3 ${gps ? 'bg-green-900/20 border border-green-800/30' : 'bg-[#1a1a1a] border border-[#2a2a2a]'}`}>
          <span className="text-lg">{gps ? '📍' : '⏳'}</span>
          <div>
            <p className={`text-sm font-medium ${gps ? 'text-green-400' : 'text-gray-400'}`}>
              {gps ? 'GPS ativo' : 'A obter localização...'}
            </p>
            {erroGps && <p className="text-red-400 text-xs mt-0.5">{erroGps}</p>}
            {gps && <p className="text-gray-500 text-xs mt-0.5">{gps.lat.toFixed(5)}, {gps.lng.toFixed(5)}</p>}
          </div>
          {!gps && !erroGps && (
            <button onClick={obterGPS} className="ml-auto text-xs text-[#cc0000] hover:underline">Tentar novamente</button>
          )}
        </div>

        {/* Mensagem de feedback */}
        {mensagem && (
          <div className={`rounded-xl px-4 py-3 mb-4 text-sm text-center font-medium ${mensagem.startsWith('✅') ? 'bg-green-900/20 text-green-400 border border-green-800/30' : 'bg-red-900/20 text-red-400 border border-red-800/30'}`}>
            {mensagem}
          </div>
        )}

        {/* Obras */}
        <div className="mb-0">
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">As tuas obras</p>

          {obras.length === 0 ? (
            <div className="text-center py-10 text-gray-500 bg-[#111] rounded-2xl border border-[#1e1e1e]">
              <p className="text-3xl mb-2">🏗️</p>
              <p className="text-sm">Nenhuma obra atribuída</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {obras.map(obra => {
                const estaNestaObra = estaEmObra && obraAtiva?.id === obra.id
                return (
                  <div key={obra.id} className={`bg-[#111] border rounded-2xl p-4 transition ${estaNestaObra ? 'border-green-700' : 'border-[#1e1e1e]'}`}>
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h2 className="text-white font-bold">{obra.nome}</h2>
                        {obra.morada && <p className="text-gray-500 text-xs mt-0.5">{obra.morada}</p>}
                      </div>
                      {estaNestaObra && (
                        <span className="bg-green-900/30 text-green-400 text-xs font-semibold px-2 py-1 rounded-lg">● Em obra</span>
                      )}
                    </div>

                    {!obra.latitude || !obra.longitude ? (
                      <div className="w-full text-center py-3 text-yellow-500 text-xs border border-yellow-800/40 rounded-xl bg-yellow-900/10">
                        ⚠️ Sem GPS definido — contacta o administrador
                      </div>
                    ) : (
                      <button
                        onClick={() => marcarPonto(obra)}
                        disabled={marcando || !gps || (estaEmObra && !estaNestaObra)}
                        className={`w-full font-semibold rounded-xl py-3.5 transition disabled:opacity-40 text-sm ${
                          estaNestaObra
                            ? 'bg-red-700 hover:bg-red-800 text-white'
                            : 'bg-[#cc0000] hover:bg-[#aa0000] text-white'
                        }`}
                      >
                        {marcando ? 'A registar...' : estaNestaObra ? 'Marcar Saída' : 'Marcar Entrada'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Histórico de hoje */}
        {registosHoje.length > 0 && (
          <div>
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">Registos de hoje</p>
            <div className="flex flex-col gap-2">
              {[...registosHoje].reverse().map(r => (
                <div key={r.id} className="bg-[#111] border border-[#1e1e1e] rounded-xl px-4 py-3 flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${r.tipo === 'entrada' ? 'bg-green-400' : 'bg-red-400'}`} />
                  <p className="text-white text-sm capitalize flex-1">{r.tipo}</p>
                  <p className="text-gray-400 text-sm font-mono">{formatarHora(r.hora)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        </>}
      </div>

      {modalPassword && (
        <AlterarPasswordModal onFechar={() => setModalPassword(false)} />
      )}
    </div>
  )
}
