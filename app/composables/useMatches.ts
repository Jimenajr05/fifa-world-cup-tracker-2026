// Composable para manejar partidos de fútbol en Firestore
// Lectura/escritura de documentos y consultas en Firestore
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  Timestamp,
} from 'firebase/firestore'
// Catálogos de fases, grupos y estados válidos de partido
import { FASES, GRUPOS, ESTADOS_PARTIDO } from '~/utils/worldCupData'
// Validaciones de campos de formulario
import { ValidationError, requerido, longitud, enLista } from '~/utils/validation'

// Goleador registrado en un partido
export interface MatchScorer {
  playerId: string
  playerName: string
  teamId: string
  goals: number
}

// Forma de un documento de partido en Firestore
export interface Match {
  id: string
  homeTeam: string
  awayTeam: string
  homeTeamId?: string | null
  awayTeamId?: string | null
  stage: string
  group: string | null
  stadium: string
  city: string
  kickoff: Timestamp
  homeScore: number | null
  awayScore: number | null
  status: string
  round?: number
  bracketPosition?: number | null
  scorers?: MatchScorer[]
}

// Forma de un nuevo partido a crear (sin ID)
export type NewMatch = Omit<Match, 'id'>

// Composable para manejar partidos de fútbol en Firestore
const MARCADOR_MAX = 50

// Composable para manejar partidos de fútbol en Firestore
export const useMatches = () => {
  // Referencia a la colección de partidos y predicciones en Firestore
  const { db: $firestore } = useFirestore()
  const matches = useState<Match[]>('matches', () => [])
  const loading = useState<boolean>('matchesLoading', () => false)
  const error = useState<string | null>('matchesError', () => null)

  // Referencias a las colecciones de Firestore
  const matchesCollection = () => collection($firestore, 'matches')
  const predictionsCollection = () => collection($firestore, 'predictions')

  // Función para obtener partidos desde Firestore con filtros opcionales
  const fetchMatches = async (filters?: { stage?: string; group?: string; status?: string }) => {
    loading.value = true
    error.value = null
    try {
      const clauses = []
      if (filters?.stage) clauses.push(where('stage', '==', filters.stage))
      if (filters?.group) clauses.push(where('group', '==', filters.group))
      if (filters?.status) clauses.push(where('status', '==', filters.status))

      const q = query(matchesCollection(), ...clauses)
      const snap = await getDocs(q)
      matches.value = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as NewMatch) }))
        .sort((a, b) => a.kickoff.toMillis() - b.kickoff.toMillis())
    } catch (err) {
      console.error('Error al cargar partidos:', err)
      error.value = 'No se pudieron cargar los partidos. Intenta de nuevo.'
    } finally {
      loading.value = false
    }
  }

  // Función para obtener un partido por su ID desde Firestore
  const fetchMatchById = async (id: string): Promise<Match | null> => {
    try {
      const snap = await getDoc(doc($firestore, 'matches', id))
      if (!snap.exists()) return null
      return { id: snap.id, ...(snap.data() as NewMatch) }
    } catch (err) {
      console.error('Error al cargar el partido:', err)
      throw err
    }
  }

  // Validación de marcador (debe ser un número entero entre 0 y MARCADOR_MAX)
  const validarMarcador = (valor: number | null, campo: string) => {
    if (valor === null) return
    if (!Number.isInteger(valor) || valor < 0 || valor > MARCADOR_MAX) {
      throw new ValidationError(`${campo} debe ser un número entero entre 0 y ${MARCADOR_MAX}.`)
    }
  }

  // Validación de goleadores: la suma de goles de los goleadores no puede exceder el marcador del equipo
  const validarGoleadores = (data: NewMatch) => {
    // Validación de goleadores: la suma de goles de los goleadores no puede exceder el marcador del equipo
    const scorers = data.scorers ?? []
    if (data.homeTeamId && data.homeScore !== null) {
      const goles = scorers.filter((s) => s.teamId === data.homeTeamId).reduce((sum, s) => sum + Number(s.goals || 0), 0)
      if (goles > data.homeScore) {
        throw new ValidationError(`Los goleadores de ${data.homeTeam} suman más goles (${goles}) que el marcador (${data.homeScore}).`)
      }
    }
    // Validación de goleadores: la suma de goles de los goleadores no puede exceder el marcador del equipo
    if (data.awayTeamId && data.awayScore !== null) {
      const goles = scorers.filter((s) => s.teamId === data.awayTeamId).reduce((sum, s) => sum + Number(s.goals || 0), 0)
      if (goles > data.awayScore) {
        throw new ValidationError(`Los goleadores de ${data.awayTeam} suman más goles (${goles}) que el marcador (${data.awayScore}).`)
      }
    }

    // Validación adicional: no puede haber más goleadores que goles en el marcador
    const scorerCountHome = scorers.filter((s) => s.teamId === data.homeTeamId).length;
    if (data.homeScore !== null && scorerCountHome > data.homeScore) {
      throw new ValidationError(`Se han ingresado ${scorerCountHome} goleadores para ${data.homeTeam}, pero el marcador indica solo ${data.homeScore} goles.`);
    }
    // Validación adicional: no puede haber más goleadores que goles en el marcador
    const scorerCountAway = scorers.filter((s) => s.teamId === data.awayTeamId).length;
    if (data.awayScore !== null && scorerCountAway > data.awayScore) {
      throw new ValidationError(`Se han ingresado ${scorerCountAway} goleadores para ${data.awayTeam}, pero el marcador indica solo ${data.awayScore} goles.`);
    }
    // Validación adicional: cada goleador debe tener al menos 1 gol registrado
    if (scorers.some((s) => !Number.isInteger(s.goals) || s.goals < 1)) {
      throw new ValidationError('Cada goleador debe tener al menos 1 gol registrado.')
    }
  }

  // Validación de datos de un partido antes de crear o actualizar
  const validarDatosPartido = (data: NewMatch) => {
    requerido(data.homeTeam, 'El equipo local')
    requerido(data.awayTeam, 'El equipo visitante')
    if (data.homeTeam.trim() === data.awayTeam.trim()) {
      throw new ValidationError('Un equipo no puede jugar contra sí mismo: elige dos selecciones distintas.')
    }
    requerido(data.stage, 'La fase')
    enLista(data.stage, 'La fase', FASES)
    if (data.stage === 'Fase de grupos') {
      requerido(data.group, 'El grupo')
      enLista(data.group as string, 'El grupo', GRUPOS)
    }
    requerido(data.stadium, 'El estadio')
    longitud(data.stadium, 'El estadio', 2, 80)
    requerido(data.city, 'La ciudad')
    longitud(data.city, 'La ciudad', 2, 80)
    if (!data.kickoff || Number.isNaN(data.kickoff.toDate?.().getTime())) {
      throw new ValidationError('La fecha y hora del partido no es válida.')
    }
    requerido(data.status, 'El estado')
    enLista(data.status, 'El estado', ESTADOS_PARTIDO)
    validarMarcador(data.homeScore, 'El marcador local')
    validarMarcador(data.awayScore, 'El marcador visitante')
    if (data.status === 'Finalizado' && (data.homeScore === null || data.awayScore === null)) {
      throw new ValidationError('No se puede finalizar un partido sin cargar el marcador de ambos equipos.')
    }
    validarGoleadores(data)
  }

  // Verifica si ya existe un partido entre los mismos equipos con la misma fecha y hora
  const partidoDuplicado = async (data: NewMatch, excludeId?: string) => {
    const snap = await getDocs(matchesCollection())
    return snap.docs.some((d) => {
      if (d.id === excludeId) return false
      const m = d.data() as NewMatch
      return (
        m.homeTeam === data.homeTeam
        && m.awayTeam === data.awayTeam
        && m.kickoff.toMillis() === data.kickoff.toMillis()
      )
    })
  }

  // Elimina todas las predicciones asociadas a un partido
  const eliminarPrediccionesDelPartido = async (matchId: string) => {
    const snap = await getDocs(query(predictionsCollection(), where('matchId', '==', matchId)))
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)))
  }

  // Verifica que el equipo tenga 11 jugadores titulares definidos
  const validarAlineacionTitular = async (nombreEquipo: string, equipoId?: string | null) => {
    let targetTeamId = equipoId
    if (!targetTeamId) {
      const qTeam = query(collection($firestore, 'teams'), where('name', '==', nombreEquipo))
      const snapTeam = await getDocs(qTeam)
      targetTeamId = snapTeam.docs[0]?.id
    }

    if (!targetTeamId) {
      throw new ValidationError(`La selección "${nombreEquipo}" aún no está registrada en el sistema.`)
    }

    // Verifica que el equipo tenga 11 jugadores titulares definidos
    const qPlayers = query(collection($firestore, 'players'), where('teamId', '==', targetTeamId))
    const snapPlayers = await getDocs(qPlayers)
    const titulares = snapPlayers.docs.filter((d) => d.data().titular === true)

    if (titulares.length < 11) {
      throw new ValidationError(
        `La selección "${nombreEquipo}" no tiene 11 jugadores en su alineación titular (actualmente tiene ${titulares.length}/11). Debe definir los 11 titulares antes de poder crear un partido.`
      )
    }
  }

  // Crea un partido validando datos, fecha, duplicados y alineaciones titulares
  const createMatch = async (
    data: NewMatch,
    opciones?: { permitirFechaPasada?: boolean; omitirValidacionAlineacion?: boolean }
  ) => {
    validarDatosPartido(data)
    if (
      data.status === 'Programado'
      && !opciones?.permitirFechaPasada
      && data.kickoff.toDate().getTime() <= Date.now()
    ) {
      throw new ValidationError('Un partido "Programado" debe tener una fecha y hora futura.')
    }
    if (await partidoDuplicado(data)) {
      throw new ValidationError('Ya existe un partido entre estos equipos con la misma fecha y hora.')
    }

    if (!opciones?.omitirValidacionAlineacion) {
      await validarAlineacionTitular(data.homeTeam, data.homeTeamId)
      await validarAlineacionTitular(data.awayTeam, data.awayTeamId)
    }

    const ref = await addDoc(matchesCollection(), data)
    return ref.id
  }

  // Actualiza un partido, validando datos y reglas de negocio sobre partidos finalizados
  const updateMatch = async (id: string, data: Partial<NewMatch>) => {
    const actualSnap = await getDoc(doc($firestore, 'matches', id))
    if (!actualSnap.exists()) throw new ValidationError('El partido que intentas editar ya no existe.')
    const actual = actualSnap.data() as NewMatch
    const combinado: NewMatch = { ...actual, ...data }
    validarDatosPartido(combinado)

    if (
      actual.status === 'Finalizado'
      && (combinado.homeTeam !== actual.homeTeam || combinado.awayTeam !== actual.awayTeam)
    ) {
      throw new ValidationError('No se pueden cambiar los equipos de un partido ya finalizado.')
    }
    if (actual.status === 'Finalizado' && combinado.status !== 'Finalizado') {
      throw new ValidationError('No se puede revertir el estado de un partido finalizado (afectaría estadísticas y predicciones ya calculadas).')
    }

    if (
      (data.homeTeam || data.awayTeam || data.kickoff)
      && (await partidoDuplicado(combinado, id))
    ) {
      throw new ValidationError('Ya existe un partido entre estos equipos con la misma fecha y hora.')
    }

    await updateDoc(doc($firestore, 'matches', id), data)
  }

  // Elimina un partido (si no está finalizado) y sus predicciones asociadas
  const deleteMatch = async (id: string) => {
    const snap = await getDoc(doc($firestore, 'matches', id))
    if (snap.exists() && (snap.data() as NewMatch).status === 'Finalizado') {
      throw new ValidationError('No se puede eliminar un partido finalizado: ya tiene estadísticas y predicciones calculadas.')
    }
    await eliminarPrediccionesDelPartido(id)
    await deleteDoc(doc($firestore, 'matches', id))
  }

  // Indica si el equipo tiene un partido en curso ("En Vivo")
  const equipoTienePartidoEnVivo = async (teamId: string): Promise<boolean> => {
    const q = query(collection($firestore, 'matches'), where('status', '==', 'En Vivo'))
    const snap = await getDocs(q)
    return snap.docs.some((d) => {
      const partido = d.data() as NewMatch
      return partido.homeTeamId === teamId || partido.awayTeamId === teamId
    })
  }

  // API pública del composable
  return {
    matches,
    loading,
    error,
    fetchMatches,
    fetchMatchById,
    createMatch,
    updateMatch,
    deleteMatch,
    equipoTienePartidoEnVivo,
  }
}