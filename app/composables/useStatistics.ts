import { collection, getDocs, query, where } from 'firebase/firestore'
import type { Match } from './useMatches'

export interface EstadisticaEquipo {
  teamName: string
  partidosJugados: number
  victorias: number
  golesAFavor: number
  golesEnContra: number
  porcentajeVictorias: number // 0-100
}

export interface EstadisticaGoleador {
  playerId: string
  playerName: string
  goles: number
}

export interface EstadisticasGenerales {
  partidosDisputados: number
  golesTotales: number
  promedioGoles: number
  maximoGoleador: EstadisticaGoleador | null
  seleccionMasGoles: EstadisticaEquipo | null
  seleccionMenosGoleada: EstadisticaEquipo | null
  tablaEquipos: EstadisticaEquipo[]
}

export const useStatistics = () => {
  const { $firestore } = useNuxtApp()

  const estadisticas = useState<EstadisticasGenerales | null>('estadisticas', () => null)
  const loading = useState<boolean>('estadisticasLoading', () => false)
  const error = useState<string | null>('estadisticasError', () => null)

  // Calcula todas las estadísticas a partir de los partidos ya finalizados.
  // No se guarda nada en Firestore: se deriva en el momento, igual que useStandings.
  const calcularEstadisticas = async () => {
    loading.value = true
    error.value = null
    try {
      const q = query(collection($firestore, 'matches'), where('status', '==', 'Finalizado'))
      const snap = await getDocs(q)
      const partidos = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Match, 'id'>) }))

      const porEquipo = new Map<string, EstadisticaEquipo>()
      const obtenerEquipo = (nombre: string): EstadisticaEquipo => {
        if (!porEquipo.has(nombre)) {
          porEquipo.set(nombre, {
            teamName: nombre,
            partidosJugados: 0,
            victorias: 0,
            golesAFavor: 0,
            golesEnContra: 0,
            porcentajeVictorias: 0,
          })
        }
        return porEquipo.get(nombre)!
      }

      let golesTotales = 0
      const golesPorJugador = new Map<string, EstadisticaGoleador>()

      for (const partido of partidos) {
        if (partido.homeScore === null || partido.awayScore === null) continue

        const local = obtenerEquipo(partido.homeTeam)
        const visitante = obtenerEquipo(partido.awayTeam)

        local.partidosJugados++
        visitante.partidosJugados++
        local.golesAFavor += partido.homeScore
        local.golesEnContra += partido.awayScore
        visitante.golesAFavor += partido.awayScore
        visitante.golesEnContra += partido.homeScore

        if (partido.homeScore > partido.awayScore) local.victorias++
        else if (partido.awayScore > partido.homeScore) visitante.victorias++

        golesTotales += partido.homeScore + partido.awayScore

        for (const goleador of partido.scorers ?? []) {
          const actual = golesPorJugador.get(goleador.playerId) ?? {
            playerId: goleador.playerId,
            playerName: goleador.playerName,
            goles: 0,
          }
          actual.goles += goleador.goals
          golesPorJugador.set(goleador.playerId, actual)
        }
      }

      const tablaEquipos = [...porEquipo.values()].map((e) => ({
        ...e,
        porcentajeVictorias: e.partidosJugados > 0 ? Math.round((e.victorias / e.partidosJugados) * 100) : 0,
      }))

      const seleccionMasGoles = [...tablaEquipos].sort((a, b) => b.golesAFavor - a.golesAFavor)[0] ?? null
      const seleccionMenosGoleada = tablaEquipos.length > 0
        ? ([...tablaEquipos].sort((a, b) => a.golesEnContra - b.golesEnContra)[0] ?? null)
        : null
      const maximoGoleador = [...golesPorJugador.values()].sort((a, b) => b.goles - a.goles)[0] ?? null

      estadisticas.value = {
        partidosDisputados: partidos.length,
        golesTotales,
        promedioGoles: partidos.length > 0 ? Number((golesTotales / partidos.length).toFixed(2)) : 0,
        maximoGoleador,
        seleccionMasGoles,
        seleccionMenosGoleada,
        tablaEquipos: tablaEquipos.sort((a, b) => b.golesAFavor - a.golesAFavor),
      }
    } catch (err) {
      console.error('Error al calcular estadísticas:', err)
      error.value = 'No se pudieron calcular las estadísticas.'
    } finally {
      loading.value = false
    }
  }

  return {
    estadisticas,
    loading,
    error,
    calcularEstadisticas,
  }
}