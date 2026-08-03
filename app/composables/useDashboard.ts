// Composable para calcular y exponer el resumen del dashboard
// Consultas de solo lectura a Firestore
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore'
// Tipo de partido
import type { Match } from './useMatches'

// Usuario con más puntos, mostrado en el dashboard
export interface UsuarioDestacado {
  nombre: string
  puntos: number
}

// Resumen de métricas generales mostradas en el dashboard
export interface DashboardResumen {
  partidosJugados: number
  partidosPendientes: number
  golesAnotados: number
  seleccionesClasificadas: number
  usuarioDestacado: UsuarioDestacado | null
  totalPredicciones: number
}

// Composable que calcula y expone el resumen del dashboard
export const useDashboard = () => {
  const { db: $firestore } = useFirestore()

  // Resumen calculado del dashboard
  const resumen = useState<DashboardResumen | null>('dashboardResumen', () => null)
  // Indica si el resumen se está cargando
  const loading = useState<boolean>('dashboardLoading', () => false)
  // Mensaje de error al cargar el dashboard
  const error = useState<string | null>('dashboardError', () => null)

  // Calcula el resumen leyendo partidos, usuarios y predicciones de Firestore
  const cargarDashboard = async () => {
    loading.value = true
    error.value = null
    try {
      // Cargar todos los partidos desde Firestore
      const matchesSnap = await getDocs(collection($firestore, 'matches'))
      // Convertir los documentos a objetos de tipo Match, omitiendo el campo 'id'
      const partidos = matchesSnap.docs.map((d) => d.data() as Omit<Match, 'id'>)

      // Filtrar partidos finalizados y pendientes, y calcular goles anotados
      const finalizados = partidos.filter((p) => p.status === 'Finalizado')
      const pendientes = partidos.filter((p) => p.status !== 'Finalizado')
      const golesAnotados = finalizados.reduce(
        (total, p) => total + (p.homeScore ?? 0) + (p.awayScore ?? 0),
        0,
      )

      // Determinar las selecciones clasificadas a partir de los partidos de rondas eliminatorias
      const rondasEliminatorias = ['Dieciseisavos', 'Octavos', 'Cuartos', 'Semifinal', 'Tercer lugar', 'Final']
      const equiposClasificados = new Set<string>()
      for (const p of partidos) {
        if (!rondasEliminatorias.includes(p.stage)) continue
        if (p.homeTeam && p.homeTeam !== 'Por definir') equiposClasificados.add(p.homeTeam)
        if (p.awayTeam && p.awayTeam !== 'Por definir') equiposClasificados.add(p.awayTeam)
      }
    
      // Obtener el usuario con más puntos desde Firestore
      const usuarioQuery = query(collection($firestore, 'users'), orderBy('puntos', 'desc'), limit(1))
      const usuarioSnap = await getDocs(usuarioQuery)
      const primerUsuario = usuarioSnap.docs[0]?.data()
      const usuarioDestacado: UsuarioDestacado | null = primerUsuario
        ? { nombre: primerUsuario.nombre ?? 'Sin nombre', puntos: primerUsuario.puntos ?? 0 }
        : null

      // Contar el total de predicciones realizadas por todos los usuarios
      const prediccionesSnap = await getDocs(collection($firestore, 'predictions'))

      // Actualizar el estado del resumen con los datos calculados
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