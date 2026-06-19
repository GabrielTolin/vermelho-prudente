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

// Arredonda para o quarto de hora mais próximo
// ex: 08:03 → 08:00, 08:08 → 08:15, 07:52 → 08:00
export function arredondar15min(data = new Date()) {
  const ms = 15 * 60 * 1000
  return new Date(Math.round(data.getTime() / ms) * ms)
}
