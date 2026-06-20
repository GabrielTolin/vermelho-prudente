// Calcula o período de fecho por tipo
// mensal_25: dia 26 mês anterior até dia 25 mês atual
// mensal_fim: dia 1 do mês atual até último dia do mês atual
export function calcularPeriodo(tipo = 'mensal_25') {
  const agora = new Date()
  const dia = agora.getDate()
  const mes = agora.getMonth()
  const ano = agora.getFullYear()

  if (tipo === 'mensal_25') {
    if (dia <= 25) {
      return {
        inicio: new Date(ano, mes - 1, 26, 0, 0, 0),
        fim: new Date(ano, mes, 25, 23, 59, 59),
      }
    } else {
      return {
        inicio: new Date(ano, mes, 26, 0, 0, 0),
        fim: new Date(ano, mes + 1, 25, 23, 59, 59),
      }
    }
  }

  // mensal_fim: dia 1 até último dia do mês atual
  const ultimoDia = new Date(ano, mes + 1, 0).getDate()
  return {
    inicio: new Date(ano, mes, 1, 0, 0, 0),
    fim: new Date(ano, mes, ultimoDia, 23, 59, 59),
  }
}

// Timezone do dispositivo
export const timezoneLocal = Intl.DateTimeFormat().resolvedOptions().timeZone

// Formata hora usando o timezone do dispositivo
export function formatarHora(hora, timezone = timezoneLocal) {
  if (!hora) return '--:--'
  return new Date(
    hora.endsWith('Z') || hora.includes('+') ? hora : hora + 'Z'
  ).toLocaleTimeString('pt-PT', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone,
  })
}

export function formatarData(data, timezone = timezoneLocal) {
  if (!data) return '--/--/----'
  return new Date(data).toLocaleDateString('pt-PT', {
    timeZone: timezone,
  })
}

// Arredonda para o múltiplo de 30 minutos mais próximo
// 12:45 a 13:14 → 13:00 | 13:15 a 13:44 → 13:30 | 13:45 a 14:14 → 14:00
export function arredondar15min(data = new Date()) {
  const ms = 30 * 60 * 1000
  return new Date(Math.round(data.getTime() / ms) * ms)
}
