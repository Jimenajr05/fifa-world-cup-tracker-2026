import { collection, getDocs, query, where } from 'firebase/firestore'
import type { Team } from './useTeams'
import type { Match } from './useMatches'

// Fila de la tabla de posiciones de un grupo, calculada a partir de
// las selecciones (teams) y los partidos finalizados de fase de grupos (matches).
export interface StandingRow {
  teamId: string
  teamName: string
  flag: string
  played: number
  wins: number
  draws: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  points: number
}

export const useStandings = () => {
  const { $firestore } = useNuxtApp()
  const standings = useState<StandingRow[]>('standings', () => [])
  const loading = useState<boolean>('standingsLoading', () => false)
  const error = useState<string | null>('standingsError', () => null)

  // Calcula la tabla de posiciones de un grupo a partir de los resultados
  // finalizados. Se recalcula cada vez que cambian los resultados en Firestore.
  const fetchStandings = async (group: string) => {
    loading.value = true
    error.value = null
    try {
      const teamsQuery = query(collection($firestore, 'teams'), where('group', '==', group))
      const teamsSnap = await getDocs(teamsQuery)
      const teams = teamsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Team, 'id'>) }))

      const matchesQuery = query(
        collection($firestore, 'matches'),
        where('stage', '==', 'Fase de grupos'),
        where('group', '==', group),
        where('status', '==', 'Finalizado'),
      )
      const matchesSnap = await getDocs(matchesQuery)
      const matches = matchesSnap.docs.map((d) => d.data() as Omit<Match, 'id'>)

      const tabla = new Map<string, StandingRow>()
      for (const team of teams) {
        tabla.set(team.name, {
          teamId: team.id,
          teamName: team.name,
          flag: team.flag,
          played: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDifference: 0,
          points: 0,
        })
      }

      for (const match of matches) {
        if (match.homeScore === null || match.awayScore === null) continue
        const local = tabla.get(match.homeTeam)
        const visitante = tabla.get(match.awayTeam)
        if (!local || !visitante) continue

        local.played++
        visitante.played++
        local.goalsFor += match.homeScore
        local.goalsAgainst += match.awayScore
        visitante.goalsFor += match.awayScore
        visitante.goalsAgainst += match.homeScore

        if (match.homeScore > match.awayScore) {
          local.wins++
          local.points += 3
          visitante.losses++
        } else if (match.homeScore < match.awayScore) {
          visitante.wins++
          visitante.points += 3
          local.losses++
        } else {
          local.draws++
          visitante.draws++
          local.points++
          visitante.points++
        }
      }

      for (const fila of tabla.values()) {
        fila.goalDifference = fila.goalsFor - fila.goalsAgainst
      }

      standings.value = Array.from(tabla.values()).sort(
        (a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor,
      )
    } catch (err) {
      console.error('Error al calcular la tabla de posiciones:', err)
      error.value = 'No se pudo calcular la tabla de posiciones.'
    } finally {
      loading.value = false
    }
  }

  return { standings, loading, error, fetchStandings }
}