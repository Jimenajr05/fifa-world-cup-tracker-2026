// Composable para la gestión del bracket de eliminatorias del mundial
// Consultas y escritura de documentos en Firestore
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
  Timestamp,
} from 'firebase/firestore'
// Lista de grupos del mundial
import { GRUPOS } from '~/utils/worldCupData'
// Tipos de partido
import type { Match, NewMatch } from './useMatches'
// Tabla de posiciones por grupo
import { useStandings, type StandingRow } from './useStandings'

// Orden de las rondas eliminatorias
export const RONDAS = [
  'Dieciseisavos',
  'Octavos',
  'Cuartos',
  'Semifinal',
  'Final',
] as const

// Tipo derivado de las rondas válidas
export type Ronda = (typeof RONDAS)[number]

// Devuelve la ronda siguiente a la indicada, o null si es la última
const siguienteRonda = (ronda: Ronda): Ronda | null => {
  const idx = RONDAS.indexOf(ronda)
  if (idx === -1 || idx === RONDAS.length - 1) return null
  const siguiente = RONDAS[idx + 1]
  return siguiente ?? null
}

// Composable del bracket de eliminatorias: generación y avance de rondas
export const useBracket = () => {
  const { db: $firestore } = useFirestore()
  const { fetchStandings } = useStandings()

  // Estado global: si se está generando el bracket
  const generando = useState<boolean>('bracketGenerando', () => false)
  // Estado global: mensaje de error del bracket
  const error = useState<string | null>('bracketError', () => null)

  // Referencia a la colección 'matches'
  const matchesCollection = () => collection($firestore, 'matches')

  // Obtiene los partidos de una ronda, ordenados por posición de bracket
  const fetchRonda = async (round: Ronda): Promise<Match[]> => {
    const q = query(
      matchesCollection(),
      where('stage', '==', round),
    )
    // Se obtienen los documentos y se mapean a objetos Match, ordenados por bracketPosition
    const snap = await getDocs(q)
    return snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as Omit<Match, 'id'>) }))
      .sort((a, b) => (a.bracketPosition ?? 0) - (b.bracketPosition ?? 0))
  }

  // Calcula primeros, segundos y mejores terceros de todos los grupos
  const calcularClasificados = async () => {
    const primeros: StandingRow[] = []
    const segundos: StandingRow[] = []
    const terceros: StandingRow[] = []

    // Para cada grupo, obtiene la tabla de posiciones y extrae los primeros, segundos y terceros
    for (const grupo of GRUPOS) {
      await fetchStandings(grupo)
      const tabla = useState<StandingRow[]>('standings').value
      if (tabla[0]) primeros.push(tabla[0])
      if (tabla[1]) segundos.push(tabla[1])
      if (tabla[2]) terceros.push(tabla[2])
    }

    // Ordena los terceros por puntos, diferencia de goles, goles a favor y ranking FIFA, y toma los 8 mejores
    const mejoresTerceros = [...terceros]
      .sort((a, b) =>
        b.points - a.points
        || b.goalDifference - a.goalDifference
        || b.goalsFor - a.goalsFor
        || a.fifaRanking - b.fifaRanking,
      )
      .slice(0, 8)

    return { primeros, segundos, mejoresTerceros }
  }

  // Genera los partidos de Dieciseisavos a partir de los clasificados de grupos
  const generarDieciseisavos = async () => {
    generando.value = true
    error.value = null
    try {

      // Verifica que no haya partidos de fase de grupos pendientes
      const pendientes = await getDocs(query(
        matchesCollection(),
        where('stage', '==', 'Fase de grupos'),
        where('status', '!=', 'Finalizado'),
      ))
      if (!pendientes.empty) {
        error.value = `Todavía hay ${pendientes.size} partido(s) de fase de grupos sin finalizar.`
        return
      }

      // Calcula los equipos clasificados de grupos
      const { primeros, segundos, mejoresTerceros } = await calcularClasificados()
      // Combina los primeros, segundos y mejores terceros en un solo array de 32 equipos
      const clasificados = [...primeros, ...segundos, ...mejoresTerceros]

      // Verifica que haya 32 equipos clasificados 
      if (clasificados.length < 32) {
        error.value = `Aún faltan resultados de fase de grupos: solo hay ${clasificados.length}/32 clasificados.`
        return
      }

      // Verifica que no se hayan generado los Dieciseisavos previamente
      const yaExiste = await fetchRonda('Dieciseisavos')
      if (yaExiste.length > 0) {
        error.value = 'Los Dieciseisavos ya fueron generados.'
        return
      }

      // Genera los 16 partidos de Dieciseisavos: el primero del grupo A vs el segundo del grupo B, etc.
      const total = clasificados.length
      for (let i = 0; i < total / 2; i++) {
        const local = clasificados[i]
        const visitante = clasificados[total - 1 - i]
        if (!local || !visitante) continue

        // Crea un nuevo partido de Dieciseisavos con los equipos local y visitante
        const nuevo: NewMatch = {
          homeTeam: local.teamName,
          awayTeam: visitante.teamName,
          stage: 'Dieciseisavos',
          group: null,
          stadium: 'Por definir',
          city: 'Por definir',
          kickoff: Timestamp.now(),
          homeScore: null,
          awayScore: null,
          status: 'Programado',
          round: 0,
          bracketPosition: i,
        }
        await addDoc(matchesCollection(), nuevo)
      }
    } catch (err) {
      console.error('Error al generar Dieciseisavos:', err)
      error.value = 'No se pudo generar el bracket de Dieciseisavos.'
    } finally {
      generando.value = false
    }
  }

  // Avanza al ganador de un partido a la siguiente ronda (y perdedor de semifinal a tercer lugar)
  const avanzarGanador = async (match: Match) => {
    if (match.homeScore === null || match.awayScore === null) return
    if (match.homeScore === match.awayScore) {
      error.value = 'Los partidos de eliminatoria no pueden terminar en empate. Registra el resultado de penales como marcador final.'
      return
    }

    // Determina la ronda siguiente, el ganador y la posición en el bracket
    const siguiente = siguienteRonda(match.stage as Ronda)
    // Determina el ganador y la posición en el bracket
    const ganador = match.homeScore > match.awayScore ? match.homeTeam : match.awayTeam
    // Determina la posición actual en el bracket y la posición en la siguiente ronda
    const posicionActual = match.bracketPosition ?? 0
    // Calcula la posición en la siguiente ronda y si el ganador será local o visitante
    const posicionSiguiente = Math.floor(posicionActual / 2)
    // Determina si el ganador será local o visitante en la siguiente ronda
    const esLocalEnSiguiente = posicionActual % 2 === 0

    // Si es semifinal, coloca al perdedor en el partido de tercer lugar
    if (match.stage === 'Semifinal') {
      const perdedor = match.homeScore > match.awayScore ? match.awayTeam : match.homeTeam
      await colocarEnRonda('Tercer lugar' as Ronda, 0, perdedor, posicionActual === 0)
    }

    // Si hay una ronda siguiente, coloca al ganador en la posición correspondiente
    if (!siguiente) return
    await colocarEnRonda(siguiente, posicionSiguiente, ganador, esLocalEnSiguiente)
  }

  // Ubica un equipo en la posición del bracket de una ronda (crea o actualiza el partido)
  const colocarEnRonda = async (
    ronda: Ronda,
    bracketPosition: number,
    equipo: string,
    esLocal: boolean,
  ) => {
    // Obtiene los partidos de la ronda y busca si ya existe un partido en esa posición
    const partidos = await fetchRonda(ronda)
    // Busca un partido existente en la posición de bracket indicada
    const existente = partidos.find((p) => p.bracketPosition === bracketPosition)

    // Si el partido ya existe, actualiza el equipo local o visitante según corresponda
    if (existente) {
      await updateDoc(doc($firestore, 'matches', existente.id), {
        [esLocal ? 'homeTeam' : 'awayTeam']: equipo,
      })
    } else {
      const nuevo: NewMatch = {
        homeTeam: esLocal ? equipo : 'Por definir',
        awayTeam: esLocal ? 'Por definir' : equipo,
        stage: ronda,
        group: null,
        stadium: 'Por definir',
        city: 'Por definir',
        kickoff: Timestamp.now(),
        homeScore: null,
        awayScore: null,
        status: 'Programado',
        round: RONDAS.indexOf(ronda),
        bracketPosition,
      }
      await addDoc(matchesCollection(), nuevo)
    }
  }

  // API pública del composable
  return {
    generando,
    error,
    RONDAS,
    fetchRonda,
    generarDieciseisavos,
    avanzarGanador,
  }
}