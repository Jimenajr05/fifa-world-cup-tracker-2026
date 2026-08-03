// Composable para calcular la tabla de posiciones de un grupo de la fase de grupos
// Consultas de solo lectura a Firestore
import { collection, getDocs, query, where } from 'firebase/firestore'
// Tipo de equipo
import type { Team } from './useTeams'
// Tipo de partido
import type { Match } from './useMatches'

// Fila de la tabla de posiciones de un grupo
export interface StandingRow {
  teamId: string
  teamName: string
  flag: string
  fifaRanking: number
  played: number
  wins: number
  draws: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  points: number
}

// Composable que calcula la tabla de posiciones de un grupo de la fase de grupos
export const useStandings = () => {
  const { db: $firestore } = useFirestore()
  // Tabla de posiciones calculada
  const standings = useState<StandingRow[]>('standings', () => [])
  // Indica si la tabla se está calculando
  const loading = useState<boolean>('standingsLoading', () => false)
  // Mensaje de error al calcular la tabla
  const error = useState<string | null>('standingsError', () => null)

  // Calcula la tabla de posiciones de un grupo a partir de sus equipos y partidos finalizados
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

      // Inicializa una fila en cero por cada equipo del grupo
      const tabla = new Map<string, StandingRow>()
      for (const team of teams) {
        tabla.set(team.name, {
          teamId: team.id,
          teamName: team.name,
          flag: team.flag,
          fifaRanking: team.fifaRanking,
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

      // Acumula partidos jugados, goles y puntos según el resultado de cada partido
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

      // Calcula una mini tabla (puntos, diferencia de gol, goles a favor) solo entre los equipos empatados,
      // usada como criterio de desempate por enfrentamientos directos
      const miniTabla = (equipos: StandingRow[]) => {
        const nombres = new Set(equipos.map((e) => e.teamName))
        const stats = new Map(equipos.map((e) => [e.teamName, { puntos: 0, dg: 0, gf: 0 }]))
        for (const m of matches) {
          if (!nombres.has(m.homeTeam) || !nombres.has(m.awayTeam)) continue
          if (m.homeScore === null || m.awayScore === null) continue
          const local = stats.get(m.homeTeam)!
          const visitante = stats.get(m.awayTeam)!
          local.gf += m.homeScore
          visitante.gf += m.awayScore
          local.dg += m.homeScore - m.awayScore
          visitante.dg += m.awayScore - m.homeScore
          if (m.homeScore > m.awayScore) local.puntos += 3
          else if (m.homeScore < m.awayScore) visitante.puntos += 3
          else { local.puntos++; visitante.puntos++ }
        }
        return stats
      }

      // Compara dos filas aplicando: puntos, enfrentamiento directo (si hay más de un empatado),
      // diferencia de gol general, goles a favor y ranking FIFA
      const comparar = (a: StandingRow, b: StandingRow, empatados: StandingRow[]) => {
        if (b.points !== a.points) return b.points - a.points
        if (empatados.length > 1) {
          const mini = miniTabla(empatados)
          const statsA = mini.get(a.teamName)!
          const statsB = mini.get(b.teamName)!
          if (statsB.puntos !== statsA.puntos) return statsB.puntos - statsA.puntos
          if (statsB.dg !== statsA.dg) return statsB.dg - statsA.dg
          if (statsB.gf !== statsA.gf) return statsB.gf - statsA.gf
        }
        if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference
        if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor
        return a.fifaRanking - b.fifaRanking
      }

      const todos = Array.from(tabla.values())
      standings.value = todos.sort((a, b) => {
        const empatados = todos.filter((t) => t.points === a.points || t.points === b.points)
        return comparar(a, b, empatados.filter((t) => t.points === a.points))
      })
    } catch (err) {
      console.error('Error al calcular la tabla de posiciones:', err)
      error.value = 'No se pudo calcular la tabla de posiciones.'
    } finally {
      loading.value = false
    }
  }

  // API pública del composable
  return { standings, loading, error, fetchStandings }
}