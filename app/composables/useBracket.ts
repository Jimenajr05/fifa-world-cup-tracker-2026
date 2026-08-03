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
import { GRUPOS } from '~/utils/worldCupData'
import type { Match, NewMatch } from './useMatches'
import { useStandings, type StandingRow } from './useStandings'

// Orden de las rondas eliminatorias. El número indica el orden de avance
// (0 = ronda inicial de 32, y así sucesivamente). "Tercer lugar" comparte
// ronda con la Final mas no alimenta a nadie: se arma aparte con los
// perdedores de Semifinal.
export const RONDAS = [
  'Dieciseisavos',
  'Octavos',
  'Cuartos',
  'Semifinal',
  'Final',
] as const

export type Ronda = (typeof RONDAS)[number]

// Nombre de la siguiente ronda dentro del bracket ("Final" no tiene siguiente)
const siguienteRonda = (ronda: Ronda): Ronda | null => {
  const idx = RONDAS.indexOf(ronda)
  if (idx === -1 || idx === RONDAS.length - 1) return null
  const siguiente = RONDAS[idx + 1]
  return siguiente ?? null
}

export const useBracket = () => {
  const { db: $firestore } = useFirestore()
  const { fetchStandings } = useStandings()

  const generando = useState<boolean>('bracketGenerando', () => false)
  const error = useState<string | null>('bracketError', () => null)

  const matchesCollection = () => collection($firestore, 'matches')

  // Trae todos los partidos de una ronda de eliminatoria, ordenados por
  // bracketPosition, para poder emparejar consecutivos (0-1, 2-3, ...)
  const fetchRonda = async (round: Ronda): Promise<Match[]> => {
    const q = query(
      matchesCollection(),
      where('stage', '==', round),
    )
    const snap = await getDocs(q)
    return snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as Omit<Match, 'id'>) }))
      .sort((a, b) => (a.bracketPosition ?? 0) - (b.bracketPosition ?? 0))
  }

  // Calcula los 32 clasificados a Dieciseisavos: 1° y 2° de cada grupo
  // (24 equipos) + los 8 mejores terceros lugares entre los 12 grupos.
  const calcularClasificados = async () => {
    const primeros: StandingRow[] = []
    const segundos: StandingRow[] = []
    const terceros: StandingRow[] = []

    for (const grupo of GRUPOS) {
      await fetchStandings(grupo)
      // fetchStandings deja el resultado en el useState "standings";
      // lo leemos de inmediato para no pisar el valor con la siguiente iteración
      const tabla = useState<StandingRow[]>('standings').value
      if (tabla[0]) primeros.push(tabla[0])
      if (tabla[1]) segundos.push(tabla[1])
      if (tabla[2]) terceros.push(tabla[2])
    }

    // Mejores 8 terceros (reglamento FIFA): puntos, diferencia de gol, goles a
    // favor y, por último, ranking FIFA. No aplica head-to-head porque los
    // terceros de distintos grupos nunca se enfrentaron entre sí.
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

  // Genera los 16 partidos de Dieciseisavos a partir de la fase de grupos.
  // Sembrado simple: clasificados directos (1°s y 2°s) ordenados por puntos
  // se enfrentan contra los mejores terceros y entre sí en un patrón 1 vs 32,
  // 2 vs 31, etc. Es una siembra simplificada (no replica el sorteo real de
  // la FIFA), pero mantiene el bracket balanceado y 100% derivado de datos.
  const generarDieciseisavos = async () => {
    generando.value = true
    error.value = null
    try {
      // No se puede armar el bracket si todavía quedan partidos de fase de
      // grupos sin finalizar: la clasificación estaría incompleta.
      const pendientes = await getDocs(query(
        matchesCollection(),
        where('stage', '==', 'Fase de grupos'),
        where('status', '!=', 'Finalizado'),
      ))
      if (!pendientes.empty) {
        error.value = `Todavía hay ${pendientes.size} partido(s) de fase de grupos sin finalizar.`
        return
      }

      const { primeros, segundos, mejoresTerceros } = await calcularClasificados()
      const clasificados = [...primeros, ...segundos, ...mejoresTerceros]

      if (clasificados.length < 32) {
        error.value = `Aún faltan resultados de fase de grupos: solo hay ${clasificados.length}/32 clasificados.`
        return
      }

      // Evita duplicar el bracket si ya se generó antes
      const yaExiste = await fetchRonda('Dieciseisavos')
      if (yaExiste.length > 0) {
        error.value = 'Los Dieciseisavos ya fueron generados.'
        return
      }

      const total = clasificados.length
      for (let i = 0; i < total / 2; i++) {
        const local = clasificados[i]
        const visitante = clasificados[total - 1 - i]
        // Con noUncheckedIndexedAccess, TS no sabe que estos índices siempre
        // existen dentro del rango del ciclo; esta guarda lo confirma.
        if (!local || !visitante) continue

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

  // Al finalizar un partido de eliminatoria, determina el ganador y lo
  // coloca automáticamente en el partido correspondiente de la siguiente
  // ronda (creándolo si aún no existe).
  const avanzarGanador = async (match: Match) => {
    if (match.homeScore === null || match.awayScore === null) return
    if (match.homeScore === match.awayScore) {
      error.value = 'Los partidos de eliminatoria no pueden terminar en empate. Registra el resultado de penales como marcador final.'
      return
    }

    const siguiente = siguienteRonda(match.stage as Ronda)
    const ganador = match.homeScore > match.awayScore ? match.homeTeam : match.awayTeam
    const posicionActual = match.bracketPosition ?? 0
    const posicionSiguiente = Math.floor(posicionActual / 2)
    const esLocalEnSiguiente = posicionActual % 2 === 0

    // Tercer lugar: se arma con los perdedores de Semifinal (posiciones 0 y 1),
    // no forma parte del avance normal del bracket.
    if (match.stage === 'Semifinal') {
      const perdedor = match.homeScore > match.awayScore ? match.awayTeam : match.homeTeam
      await colocarEnRonda('Tercer lugar' as Ronda, 0, perdedor, posicionActual === 0)
    }

    if (!siguiente) return
    await colocarEnRonda(siguiente, posicionSiguiente, ganador, esLocalEnSiguiente)
  }

  // Coloca un equipo (local o visitante) en el partido de bracketPosition
  // indicado dentro de una ronda; crea el partido si todavía no existe.
  const colocarEnRonda = async (
    ronda: Ronda,
    bracketPosition: number,
    equipo: string,
    esLocal: boolean,
  ) => {
    const partidos = await fetchRonda(ronda)
    const existente = partidos.find((p) => p.bracketPosition === bracketPosition)

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

  return {
    generando,
    error,
    RONDAS,
    fetchRonda,
    generarDieciseisavos,
    avanzarGanador,
  }
}