import { useState, useEffect } from 'react'
import { supabase } from '../../context/AuthContext'
import ObraModal from './ObraModal'

export default function ListaObras({ obras, onAtualizar }) {
  const [selecionada, setSelecionada] = useState(null)
  const [presencas, setPresencas] = useState({})

  useEffect(() => {
    if (obras.length === 0) return
    carregarPresencas()
  }, [obras])

  async function carregarPresencas() {
    const hoje = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('vp_registos_ponto')
      .select('funcionario_id, obra_id, tipo')
      .gte('hora', `${hoje}T00:00:00Z`)
      .order('hora', { ascending: false })

    const ultimoRegisto = {}
    for (const r of (data || [])) {
      if (!ultimoRegisto[r.funcionario_id]) ultimoRegisto[r.funcionario_id] = r
    }

    const porObra = {}
    for (const [funcId, registo] of Object.entries(ultimoRegisto)) {
      if (registo.tipo === 'entrada') {
        if (!porObra[registo.obra_id]) porObra[registo.obra_id] = []
        porObra[registo.obra_id].push(funcId)
      }
    }
    setPresencas(porObra)
  }

  if (obras.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <p className="text-4xl mb-3">🏗️</p>
        <p>Nenhuma obra ativa</p>
        <p className="text-sm mt-1 text-gray-600">Clica em "Nova Obra" para começar</p>
      </div>
    )
  }

  return (
    <>
    <div className="flex flex-col gap-2">
      {obras.map(obra => {
        const funcionariosObra = obra.vp_obra_funcionarios || []
        const presentesIds = presencas[obra.id] || []
        const nPresentes = funcionariosObra.filter(of => presentesIds.includes(of.funcionario_id)).length
        const nAusentes = funcionariosObra.length - nPresentes

        return (
          <div
            key={obra.id}
            onClick={() => setSelecionada(obra)}
            className="bg-[#111] border border-[#1e1e1e] hover:border-[#2a2a2a] rounded-2xl px-4 py-4 flex items-center gap-4 cursor-pointer transition"
          >
            <div className="w-10 h-10 bg-[#cc0000]/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-lg">🏗️</span>
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm truncate">{obra.nome}</p>
              {obra.morada && (
                <p className="text-gray-500 text-xs truncate mt-0.5">{obra.morada}</p>
              )}
              <div className="flex items-center gap-3 mt-1.5">
                <span className="text-green-400 text-xs font-medium">{nPresentes} presentes</span>
                <span className="text-red-400 text-xs font-medium">{nAusentes} ausentes</span>
                <span className="text-gray-600 text-xs">{funcionariosObra.length} total</span>
              </div>
            </div>

            <span className="text-gray-600 text-lg">›</span>
          </div>
        )
      })}
    </div>

      {selecionada && (
        <ObraModal
          obra={selecionada}
          onFechar={() => setSelecionada(null)}
          onAtualizar={() => { setSelecionada(null); onAtualizar() }}
        />
      )}
    </>
  )
}
