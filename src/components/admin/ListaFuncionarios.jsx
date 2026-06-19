import { useState, useEffect } from 'react'
import { supabase } from '../../context/AuthContext'
import FuncionarioModal from './FuncionarioModal'

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

export default function ListaFuncionarios({ funcionarios, onAtualizar }) {
  const [resumos, setResumos] = useState({})
  const [selecionado, setSelecionado] = useState(null)

  useEffect(() => {
    if (funcionarios.length > 0) carregarResumos()
  }, [funcionarios])

  async function carregarResumos() {
    const { inicio, fim } = periodoAtual()
    const { data } = await supabase
      .from('vp_registos_ponto')
      .select('funcionario_id, tipo, hora')
      .gte('hora', inicio.toISOString())
      .lte('hora', fim.toISOString())
      .order('hora')

    const porFunc = {}
    for (const r of (data || [])) {
      if (!porFunc[r.funcionario_id]) porFunc[r.funcionario_id] = []
      porFunc[r.funcionario_id].push(r)
    }

    const resumosCalc = {}
    for (const [funcId, registos] of Object.entries(porFunc)) {
      let totalMs = 0
      const dias = new Set()
      for (let i = 0; i < registos.length - 1; i++) {
        if (registos[i].tipo === 'entrada' && registos[i + 1].tipo === 'saida') {
          const entrada = new Date(registos[i].hora)
          const saida = new Date(registos[i + 1].hora)
          totalMs += saida - entrada
          dias.add(entrada.toISOString().split('T')[0])
        }
      }
      const func = funcionarios.find(f => f.id === funcId)
      const horas = totalMs / 3600000
      resumosCalc[funcId] = {
        horas: horas.toFixed(1),
        dias: dias.size,
        custo: (horas * (func?.valor_hora || 0)).toFixed(2),
      }
    }
    setResumos(resumosCalc)
  }

  if (funcionarios.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <p className="text-4xl mb-3">👷</p>
        <p>Nenhum funcionário cadastrado</p>
        <p className="text-sm mt-1 text-gray-600">Clica em "+ Funcionário" para adicionar</p>
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        {funcionarios.map(func => {
          const r = resumos[func.id] || { horas: '0.0', dias: 0, custo: '0.00' }
          return (
            <div
              key={func.id}
              onClick={() => setSelecionado(func)}
              className="bg-[#111] border border-[#1e1e1e] hover:border-[#2a2a2a] rounded-2xl px-4 py-4 flex items-center gap-4 cursor-pointer transition"
            >
              <div className="w-10 h-10 bg-[#cc0000]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-lg">👷</span>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm truncate">{func.nome}</p>
                <p className="text-gray-500 text-xs mt-0.5 truncate">{func.email}</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-white text-xs">{r.horas}h</span>
                  <span className="text-gray-600 text-xs">·</span>
                  <span className="text-white text-xs">{r.dias} dias</span>
                  <span className="text-gray-600 text-xs">·</span>
                  <span className="text-[#cc0000] text-xs font-semibold">{r.custo}€</span>
                </div>
              </div>

              <span className="text-gray-600 text-lg">›</span>
            </div>
          )
        })}
      </div>

      {selecionado && (
        <FuncionarioModal
          funcionario={selecionado}
          onFechar={() => setSelecionado(null)}
          onAtualizar={() => { setSelecionado(null); onAtualizar() }}
        />
      )}
    </>
  )
}
