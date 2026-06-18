// TODO: substituir pela URL do Render após deploy
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

export async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!res.ok) {
    const erro = await res.json().catch(() => ({ error: 'Erro desconhecido' }))
    throw new Error(erro.error || `HTTP ${res.status}`)
  }
  return res.json()
}
