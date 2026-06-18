// Fórmula Haversine — distância em metros entre dois pontos GPS
export function distanciaMetros(lat1, lon1, lat2, lon2) {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function dentroDoRaio(latUser, lonUser, latObra, lonObra, raioMetros = 200) {
  return distanciaMetros(latUser, lonUser, latObra, lonObra) <= raioMetros
}
