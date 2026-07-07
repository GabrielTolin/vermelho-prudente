import { useState } from 'react'
import { jsPDF } from 'jspdf'
import { supabase } from '../../context/AuthContext'
import { calcularPeriodo } from '../../utils/horas'

function formatarDataPT(date) {
  return date.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function calcularResumoFuncionario(registos) {
  const ordenados = [...registos].sort((a, b) => new Date(a.hora) - new Date(b.hora))
  let totalMs = 0
  const dias = new Set()
  for (let i = 0; i < ordenados.length - 1; i++) {
    if (ordenados[i].tipo === 'entrada' && ordenados[i + 1].tipo === 'saida') {
      const entrada = new Date(ordenados[i].hora)
      const saida = new Date(ordenados[i + 1].hora)
      totalMs += saida - entrada
      dias.add(entrada.toISOString().split('T')[0])
    }
  }
  return { horas: (totalMs / 3600000).toFixed(1), dias: dias.size }
}

export default function RelatoriosMensais({ funcionarios }) {
  const [gerandoPT, setGerandoPT] = useState(false)
  const [gerandoES, setGerandoES] = useState(false)

  async function gerarRelatorio(tipoPeriodo) {
    const setter = tipoPeriodo === 'mensal_25' ? setGerandoPT : setGerandoES
    setter(true)

    const funcsFiltrados = funcionarios.filter(f => (f.tipo_periodo || 'mensal_25') === tipoPeriodo)

    if (funcsFiltrados.length === 0) {
      alert('Não há funcionários para este período.')
      setter(false)
      return
    }

    // Buscar obras associadas e registos de cada funcionário
    const ids = funcsFiltrados.map(f => f.id)
    const { inicio, fim } = calcularPeriodo(tipoPeriodo)

    const [{ data: registos }, { data: obraAssoc }] = await Promise.all([
      supabase
        .from('vp_registos_ponto')
        .select('funcionario_id, tipo, hora, obra_id')
        .in('funcionario_id', ids)
        .gte('hora', inicio.toISOString())
        .lte('hora', fim.toISOString()),
      supabase
        .from('vp_obra_funcionarios')
        .select('funcionario_id, vp_obras(nome)')
        .in('funcionario_id', ids),
    ])

    // Mapear obras por funcionário
    const obrasPorFunc = {}
    for (const oa of (obraAssoc || [])) {
      if (!obrasPorFunc[oa.funcionario_id]) obrasPorFunc[oa.funcionario_id] = []
      if (oa.vp_obras?.nome) obrasPorFunc[oa.funcionario_id].push(oa.vp_obras.nome)
    }

    // Calcular resumo por funcionário
    const dados = funcsFiltrados.map(func => {
      const regsFunc = (registos || []).filter(r => r.funcionario_id === func.id)
      const { horas, dias } = calcularResumoFuncionario(regsFunc)
      const obras = (obrasPorFunc[func.id] || []).join(', ') || '—'
      return { nome: func.nome, horas, dias, obras }
    })

    // Gerar PDF
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pais = tipoPeriodo === 'mensal_25' ? 'Portugal' : 'Espanha'
    const periodoStr = `${formatarDataPT(inicio)} — ${formatarDataPT(fim)}`
    const geradoEm = formatarDataPT(new Date())

    // Cores
    const vermelho = [204, 0, 0]
    const cinzaEscuro = [30, 30, 30]
    const cinzaMedio = [80, 80, 80]
    const cinzaClaro = [240, 240, 240]

    // Fundo preto
    doc.setFillColor(10, 10, 10)
    doc.rect(0, 0, 210, 297, 'F')

    // Barra vermelha topo
    doc.setFillColor(...vermelho)
    doc.rect(0, 0, 210, 18, 'F')

    // Título na barra
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text('VERMELHO PRUDENTE CANALIZAÇÕES', 14, 11)

    // Subtítulo
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...cinzaMedio)
    doc.text(`Relatório Mensal · ${pais} · ${periodoStr}`, 14, 26)
    doc.text(`Gerado em ${geradoEm}`, 14, 32)

    // Linha separadora
    doc.setDrawColor(...vermelho)
    doc.setLineWidth(0.5)
    doc.line(14, 36, 196, 36)

    // Cabeçalho da tabela
    let y = 44
    doc.setFillColor(...cinzaEscuro)
    doc.rect(14, y - 5, 182, 8, 'F')

    doc.setTextColor(200, 200, 200)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text('NOME', 16, y)
    doc.text('DIAS', 110, y)
    doc.text('HORAS', 130, y)
    doc.text('OBRAS', 155, y)

    y += 6

    // Linhas de dados
    dados.forEach((d, i) => {
      if (i % 2 === 0) {
        doc.setFillColor(20, 20, 20)
        doc.rect(14, y - 4, 182, 8, 'F')
      }

      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.text(d.nome, 16, y)

      doc.setTextColor(200, 200, 200)
      doc.text(String(d.dias), 110, y)
      doc.text(`${d.horas}h`, 130, y)

      // Obras com wrap
      const obrasTexto = doc.splitTextToSize(d.obras, 40)
      doc.text(obrasTexto[0], 155, y)

      y += 9

      // Nova página se necessário
      if (y > 270) {
        doc.addPage()
        doc.setFillColor(10, 10, 10)
        doc.rect(0, 0, 210, 297, 'F')
        y = 20
      }
    })

    // Total
    const totalHoras = dados.reduce((acc, d) => acc + parseFloat(d.horas), 0).toFixed(1)
    doc.setDrawColor(...vermelho)
    doc.line(14, y, 196, y)
    y += 6
    doc.setTextColor(...vermelho)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text(`Total: ${dados.length} funcionários · ${totalHoras}h trabalhadas`, 16, y)

    // Rodapé
    doc.setTextColor(...cinzaMedio)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text('Vermelho Prudente Canalizações Hidráulicas', 14, 290)
    doc.text(geradoEm, 170, 290)

    // Download
    const nomeFicheiro = `relatorio_${pais.toLowerCase()}_${inicio.getFullYear()}_${String(inicio.getMonth() + 1).padStart(2, '0')}.pdf`
    doc.save(nomeFicheiro)

    setter(false)
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Portugal */}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">🇵🇹</span>
          <div>
            <p className="text-white font-semibold">Portugal</p>
            <p className="text-gray-500 text-xs mt-0.5">Período: dia 26 ao dia 25</p>
          </div>
        </div>
        <p className="text-gray-600 text-xs mb-4">
          {funcionarios.filter(f => (f.tipo_periodo || 'mensal_25') === 'mensal_25').length} funcionários
        </p>
        <button
          onClick={() => gerarRelatorio('mensal_25')}
          disabled={gerandoPT}
          className="w-full bg-[#cc0000] hover:bg-[#aa0000] text-white font-semibold rounded-xl py-3.5 text-sm transition disabled:opacity-50"
        >
          {gerandoPT ? 'A gerar PDF...' : '⬇️ Gerar Relatório PDF'}
        </button>
      </div>

      {/* Espanha */}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">🇪🇸</span>
          <div>
            <p className="text-white font-semibold">Espanha</p>
            <p className="text-gray-500 text-xs mt-0.5">Período: dia 1 ao último dia do mês</p>
          </div>
        </div>
        <p className="text-gray-600 text-xs mb-4">
          {funcionarios.filter(f => f.tipo_periodo === 'mensal_fim').length} funcionários
        </p>
        <button
          onClick={() => gerarRelatorio('mensal_fim')}
          disabled={gerandoES}
          className="w-full bg-[#cc0000] hover:bg-[#aa0000] text-white font-semibold rounded-xl py-3.5 text-sm transition disabled:opacity-50"
        >
          {gerandoES ? 'A gerar PDF...' : '⬇️ Gerar Relatório PDF'}
        </button>
      </div>

    </div>
  )
}
