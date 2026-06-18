// Formata hora do Supabase sem desfasamento de timezone
export function formatarHora(hora) {
  if (!hora) return '--:--'
  return new Date(
    hora.endsWith('Z') || hora.includes('+') ? hora : hora + 'Z'
  ).toLocaleTimeString('pt-PT', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Lisbon',
  })
}

export function formatarData(data) {
  if (!data) return '--/--/----'
  return new Date(data).toLocaleDateString('pt-PT', {
    timeZone: 'Europe/Lisbon',
  })
}
