import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore'
import type { Match } from './useMatches'

export interface UsuarioDestacado {
  nombre: string
  puntos: number
}

export interface DashboardResumen {
  partidosJugados: number
  partidosPendientes: number
  golesAnotados: number
  seleccionesClasificadas: number
  usuarioDestacado: UsuarioDestacado | null
  totalPredicciones: number
}

// Calcula los indicadores del dashboard a partir de los datos ya guardados
// en Firestore (matches, users, predictions y el bracket de eliminatorias).
// No se persiste nada: se recalcula cada vez, igual que useStandings/useStatistics.
export const useDashboard = () => {
  const { db: $firestore } = useFirestore()

  const resumen = useState<DashboardResumen | null>('dashboardResumen', () => null)
  const loading = useState<boolean>('dashboardLoading', () => false)
  const error = useState<string | null>('dashboardError', () => null)

  const cargarDashboard = async () => {
    loading.value = true
    error.value = null
    try {
      const matchesSnap = await getDocs(collection($firestore, 'matches'))
      const partidos = matchesSnap.docs.map((d) => d.data() as Omit<Match, 'id'>)

      const finalizados = partidos.filter((p) => p.status === 'Finalizado')
      const pendientes = partidos.filter((p) => p.status !== 'Finalizado')
      const golesAnotados = finalizados.reduce(
        (total, p) => total + (p.homeScore ?? 0) + (p.awayScore ?? 0),
        0,
      )

      // Selecciones clasificadas: equipos que ya tienen un partido de
      // Dieciseisavos en adelante (es decir, salieron de fase de grupos).
      const rondasEliminatorias = ['Dieciseisavos', 'Octavos', 'Cuartos', 'Semifinal', 'Tercer lugar', 'Final']
      const equiposClasificados = new Set<string>()
      for (const p of partidos) {
        if (!rondasEliminatorias.includes(p.stage)) continue
        if (p.homeTeam && p.homeTeam !== 'Por definir') equiposClasificados.add(p.homeTeam)
        if (p.awayTeam && p.awayTeam !== 'Por definir') equiposClasificados.add(p.awayTeam)
      }

      const usuarioQuery = query(collection($firestore, 'users'), orderBy('puntos', 'desc'), limit(1))
      const usuarioSnap = await getDocs(usuarioQuery)
      const primerUsuario = usuarioSnap.docs[0]?.data()
      const usuarioDestacado: UsuarioDestacado | null = primerUsuario
        ? { nombre: primerUsuario.nombre ?? 'Sin nombre', puntos: primerUsuario.puntos ?? 0 }
        : null

      const prediccionesSnap = await getDocs(collection($firestore, 'predictions'))

      resumen.value = {
        partidosJugados: finalizados.length,
        partidosPendientes: pendientes.length,
        golesAnotados,
        seleccionesClasificadas: equiposClasificados.size,
        usuarioDestacado,
        totalPredicciones: prediccionesSnap.size,
      }
    } catch (err) {
      console.error('Error al cargar el dashboard:', err)
      error.value = 'No se pudo cargar el dashboard. Intenta de nuevo.'
    } finally {
      loading.value = false
    }
  }

  return { resumen, loading, error, cargarDashboard }
}
