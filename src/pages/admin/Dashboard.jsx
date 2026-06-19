import { useState, useEffect, useCallback } from 'react'
import logo from '../../assets/logo.png'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../context/AuthContext'
import CriarObraModal from '../../components/admin/CriarObraModal'
import CriarFuncionarioModal from '../../components/admin/CriarFuncionarioModal'
import ListaObras from '../../components/admin/ListaObras'
import ListaFuncionarios from '../../components/admin/ListaFuncionarios'

export default function Dashboard() {
  const { logout } = useAuth()
  const [tab, setTab] = useState('obras')
  const [obras, setObras] = useState([])
  const [funcionarios, setFuncionarios] = useState([])
  const [presentes, setPresentes] = useState(0)
  const [modalObra, setModalObra] = useState(false)
  const [modalFuncionario, setModalFuncionario] = useState(false)
  const [loading, setLoading] = useState(true)

  const hoje = new Date().toLocaleDateString('pt-PT', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  })

  const carregarDados = useCallback(async () => {
    const [{ data: obrasData }, { data: funcData }] = await Promise.all([
      supabase.from('vp_obras').select(`
        *,
        vp_obra_funcionarios (
          funcionario_id,
          vp_funcionarios ( id, nome )
        )
      `).eq('ativa', true).order('nome'),
      supabase.from('vp_funcionarios').select('*').eq('ativo', true).order('nome'),
    ])

    const obrasList = obrasData || []
    const funcList = funcData || []
    setObras(obrasList)
    setFuncionarios(funcList)

    // Contar presentes hoje
    const agora = new Date()
    const inicioDia = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 0, 0, 0)
    const { data: pontosHoje } = await supabase
      .from('vp_registos_ponto')
      .select('funcionario_id, tipo, hora')
      .gte('hora', inicioDia.toISOString())
      .order('hora', { ascending: false })

    const ultimoRegisto = {}
    for (const r of (pontosHoje || [])) {
      if (!ultimoRegisto[r.funcionario_id]) ultimoRegisto[r.funcionario_id] = r
    }
    const totalPresentes = Object.values(ultimoRegisto).filter(r => r.tipo === 'entrada').length
    setPresentes(totalPresentes)
    setLoading(false)
  }, [])

  useEffect(() => {
    carregarDados()
    const intervalo = setInterval(carregarDados, 30000)
    return () => clearInterval(intervalo)
  }, [carregarDados])

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-black">

      {/* Fundo com logo esbatido */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundImage: `url(${logo})`,
          backgroundRepeat: 'repeat',
          backgroundSize: '320px',
          opacity: 0.07,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <div className="relative z-10 w-full max-w-lg px-6 py-10">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-white font-bold text-xl">Vermelho Prudente</h1>
            <p className="text-gray-500 text-sm mt-0.5">Painel admin · {hoje}</p>
          </div>
          <button
            onClick={logout}
            className="text-gray-400 hover:text-white text-sm transition flex items-center gap-1"
          >
            Sair
          </button>
        </div>

        {/* Card resumo */}
        <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl px-5 py-4 mb-8 flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm">Total em obra agora</p>
            <p className="text-white text-3xl font-bold mt-1">
              {presentes}
              <span className="text-gray-500 text-lg font-normal"> / {funcionarios.length} funcionários</span>
            </p>
          </div>
          <div className="w-12 h-12 bg-[#cc0000]/10 rounded-xl flex items-center justify-center">
            <span className="text-2xl">👷</span>
          </div>
        </div>

        {/* Botões ação */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <button
            onClick={() => setModalObra(true)}
            className="flex items-center justify-center gap-2 bg-[#111] border border-[#2a2a2a] hover:border-[#cc0000] text-white rounded-2xl py-3.5 text-sm font-semibold transition"
          >
            <span className="text-[#cc0000] text-lg">+</span> Nova obra
          </button>
          <button
            onClick={() => setModalFuncionario(true)}
            className="flex items-center justify-center gap-2 bg-[#111] border border-[#2a2a2a] hover:border-[#cc0000] text-white rounded-2xl py-3.5 text-sm font-semibold transition"
          >
            <span className="text-[#cc0000] text-lg">+</span> Novo funcionário
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-4 border-b border-[#1e1e1e]">
          <button
            onClick={() => setTab('obras')}
            className={`pb-3 text-sm font-semibold transition border-b-2 -mb-px ${
              tab === 'obras' ? 'text-white border-[#cc0000]' : 'text-gray-500 border-transparent'
            }`}
          >
            Obras ativas
          </button>
          <button
            onClick={() => setTab('funcionarios')}
            className={`pb-3 text-sm font-semibold transition border-b-2 -mb-px ${
              tab === 'funcionarios' ? 'text-white border-[#cc0000]' : 'text-gray-500 border-transparent'
            }`}
          >
            Funcionários
          </button>
        </div>

        {/* Conteúdo */}
        {loading ? (
          <div className="flex justify-center mt-16">
            <div className="w-8 h-8 border-4 border-[#cc0000] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tab === 'obras' ? (
          <ListaObras obras={obras} onAtualizar={carregarDados} />
        ) : (
          <ListaFuncionarios funcionarios={funcionarios} onAtualizar={carregarDados} />
        )}
      </div>

      {modalObra && (
        <CriarObraModal
          onFechar={() => setModalObra(false)}
          onCriado={() => { setModalObra(false); carregarDados() }}
        />
      )}
      {modalFuncionario && (
        <CriarFuncionarioModal
          onFechar={() => setModalFuncionario(false)}
          onCriado={() => { setModalFuncionario(false); carregarDados() }}
        />
      )}
    </div>
  )
}
