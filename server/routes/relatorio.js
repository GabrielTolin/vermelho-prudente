import { Router } from 'express'
import { Resend } from 'resend'
import { supabase } from '../supabase.js'

const router = Router()
const resend = new Resend(process.env.RESEND_API_KEY)

function periodoFecho(tipo = 'mensal_25') {
  const agora = new Date()
  const dia = agora.getDate()
  const mes = agora.getMonth()
  const ano = agora.getFullYear()

  if (tipo === 'mensal_25') {
    if (dia <= 25) {
      return { inicio: new Date(ano, mes - 1, 26, 0, 0, 0), fim: new Date(ano, mes, 25, 23, 59, 59) }
    } else {
      return { inicio: new Date(ano, mes, 26, 0, 0, 0), fim: new Date(ano, mes + 1, 25, 23, 59, 59) }
    }
  }

  // mensal_fim
  const ultimoDia = new Date(ano, mes + 1, 0).getDate()
  return { inicio: new Date(ano, mes, 1, 0, 0, 0), fim: new Date(ano, mes, ultimoDia, 23, 59, 59) }
}

function calcularResumo(registos, valorHora) {
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

  const horas = totalMs / 3600000
  return {
    horas: horas.toFixed(1),
    dias: dias.size,
    custo: (horas * valorHora).toFixed(2),
  }
}

function formatarPeriodo(inicio, fim) {
  const opts = { day: '2-digit', month: 'long', year: 'numeric' }
  return `${inicio.toLocaleDateString('pt-PT', opts)} — ${fim.toLocaleDateString('pt-PT', opts)}`
}

router.post('/enviar', async (req, res) => {
  // Buscar funcionários ativos
  const { data: funcionarios, error: funcError } = await supabase
    .from('vp_funcionarios')
    .select('*')
    .eq('ativo', true)
    .order('nome')

  if (funcError) return res.status(500).json({ error: funcError.message })

  // Buscar todos os registos (filtro por período é feito por funcionário)
  const { data: registos } = await supabase
    .from('vp_registos_ponto')
    .select('funcionario_id, tipo, hora')

  // Calcular resumo por funcionário usando o período correto de cada um
  const resumos = funcionarios.map(func => {
    const { inicio, fim } = periodoFecho(func.tipo_periodo || 'mensal_25')
    const registosFunc = (registos || []).filter(r =>
      r.funcionario_id === func.id &&
      new Date(r.hora) >= inicio &&
      new Date(r.hora) <= fim
    )
    const resumo = calcularResumo(registosFunc, func.valor_hora || 0)
    return { ...func, ...resumo, periodo: formatarPeriodo(inicio, fim) }
  })

  const totalCusto = resumos.reduce((acc, r) => acc + parseFloat(r.custo), 0).toFixed(2)

  // Gerar HTML do email
  const linhasFuncionarios = resumos.map(r => `
    <tr>
      <td style="padding:12px 16px;border-bottom:1px solid #222;color:#fff;font-size:14px;">${r.nome}</td>
      <td style="padding:12px 16px;border-bottom:1px solid #222;color:#fff;font-size:14px;text-align:center;">${r.dias}</td>
      <td style="padding:12px 16px;border-bottom:1px solid #222;color:#fff;font-size:14px;text-align:center;">${r.horas}h</td>
      <td style="padding:12px 16px;border-bottom:1px solid #222;color:#cc0000;font-size:14px;text-align:right;font-weight:bold;">${r.custo}€</td>
    </tr>
  `).join('')

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="background:#0a0a0a;margin:0;padding:32px;font-family:sans-serif;">
      <div style="max-width:600px;margin:0 auto;">

        <!-- Header -->
        <div style="margin-bottom:32px;">
          <h1 style="color:#fff;font-size:24px;margin:0;">Vermelho Prudente</h1>
          <p style="color:#cc0000;font-size:12px;margin:4px 0 0;letter-spacing:2px;text-transform:uppercase;">Canalizações Hidráulicas</p>
        </div>

        <!-- Título -->
        <div style="background:#111;border:1px solid #222;border-radius:12px;padding:24px;margin-bottom:24px;">
          <h2 style="color:#fff;font-size:18px;margin:0 0 4px;">Relatório Mensal</h2>
          <p style="color:#666;font-size:13px;margin:0;">Gerado em ${new Date().toLocaleDateString('pt-PT')}</p>
        </div>

        <!-- Tabela -->
        <table style="width:100%;border-collapse:collapse;background:#111;border:1px solid #222;border-radius:12px;overflow:hidden;">
          <thead>
            <tr style="background:#1a1a1a;">
              <th style="padding:12px 16px;text-align:left;color:#888;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Funcionário</th>
              <th style="padding:12px 16px;text-align:center;color:#888;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Dias</th>
              <th style="padding:12px 16px;text-align:center;color:#888;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Horas</th>
              <th style="padding:12px 16px;text-align:right;color:#888;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Custo</th>
            </tr>
          </thead>
          <tbody>
            ${linhasFuncionarios}
          </tbody>
          <tfoot>
            <tr style="background:#1a1a1a;">
              <td colspan="3" style="padding:14px 16px;color:#888;font-size:13px;font-weight:bold;">Total</td>
              <td style="padding:14px 16px;color:#cc0000;font-size:16px;font-weight:bold;text-align:right;">${totalCusto}€</td>
            </tr>
          </tfoot>
        </table>

        <!-- Rodapé -->
        <p style="color:#444;font-size:12px;text-align:center;margin-top:32px;">
          Relatório gerado automaticamente · Vermelho Prudente Canalizações
        </p>
      </div>
    </body>
    </html>
  `

  const { error: emailError } = await resend.emails.send({
    from: 'Vermelho Prudente <onboarding@resend.dev>',
    to: process.env.EMAIL_ADMIN,
    subject: `Relatório Mensal — ${new Date().toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}`,
    html,
  })

  if (emailError) return res.status(500).json({ error: emailError.message })

  res.json({ ok: true, funcionarios: resumos.length, totalCusto })
})

export default router
