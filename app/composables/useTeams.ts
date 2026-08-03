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
  orderBy,
} from 'firebase/firestore'
import { CONFEDERACIONES, GRUPOS } from '~/utils/worldCupData'
import { ValidationError, requerido, longitud, enteroEnRango, enLista } from '~/utils/validation'

// Estructura de una selección en Firestore (colección "teams")
export interface Team {
  id: string
  name: string
  group: string
  flag: string
  coach: string
  confederation: string
  fifaRanking: number
}

export type NewTeam = Omit<Team, 'id'>

const MAX_EQUIPOS_POR_GRUPO = 4

export const useTeams = () => {
  const { db: $firestore } = useFirestore()
  const teams = useState<Team[]>('teams', () => [])
  const loading = useState<boolean>('teamsLoading', () => false)
  const error = useState<string | null>('teamsError', () => null)

  const teamsCollection = () => collection($firestore, 'teams')
  const playersCollection = () => collection($firestore, 'players')
  const matchesCollection = () => collection($firestore, 'matches')

  // Trae todas las selecciones, opcionalmente filtradas por grupo o confederación
  const fetchTeams = async (filters?: { group?: string; confederation?: string }) => {
    loading.value = true
    error.value = null
    try {
      const clauses = []
      if (filters?.group) clauses.push(where('group', '==', filters.group))
      if (filters?.confederation) clauses.push(where('confederation', '==', filters.confederation))

      const q = query(teamsCollection(), ...clauses, orderBy('fifaRanking', 'asc'))
      const snap = await getDocs(q)
      teams.value = snap.docs.map((d) => ({ id: d.id, ...(d.data() as NewTeam) }))
    } catch (err) {
      console.error('Error al cargar selecciones:', err)
      error.value = 'No se pudieron cargar las selecciones. Intenta de nuevo.'
    } finally {
      loading.value = false
    }
  }

  const fetchTeamById = async (id: string): Promise<Team | null> => {
    try {
      const snap = await getDoc(doc($firestore, 'teams', id))
      if (!snap.exists()) return null
      return { id: snap.id, ...(snap.data() as NewTeam) }
    } catch (err) {
      console.error('Error al cargar la selección:', err)
      throw err
    }
  }

  // ── Reglas de negocio ──────────────────────────────────────────
  const validarDatosEquipo = (data: NewTeam) => {
    requerido(data.name, 'El nombre')
    longitud(data.name, 'El nombre', 2, 60)
    requerido(data.flag, 'La bandera')
    requerido(data.coach, 'El entrenador')
    longitud(data.coach, 'El entrenador', 2, 60)
    requerido(data.group, 'El grupo')
    enLista(data.group, 'El grupo', GRUPOS)
    requerido(data.confederation, 'La confederación')
    enLista(data.confederation, 'La confederación', CONFEDERACIONES)
    enteroEnRango(Number(data.fifaRanking), 'El ranking FIFA', 1, 210)
  }

  const nombreDuplicado = async (name: string, excludeId?: string) => {
    const q = query(teamsCollection(), where('name', '==', name.trim()))
    const snap = await getDocs(q)
    return snap.docs.some((d) => d.id !== excludeId)
  }

  const cupoDeGrupoLleno = async (group: string, excludeId?: string) => {
    const q = query(teamsCollection(), where('group', '==', group))
    const snap = await getDocs(q)
    const ocupantes = snap.docs.filter((d) => d.id !== excludeId)
    return ocupantes.length >= MAX_EQUIPOS_POR_GRUPO
  }

  const tieneJugadores = async (teamId: string) => {
    const snap = await getDocs(query(playersCollection(), where('teamId', '==', teamId)))
    return !snap.empty
  }

  // Los partidos antiguos pueden no tener homeTeamId/awayTeamId poblados,
  // así que además se comprueba por nombre de equipo (homeTeam/awayTeam).
  const tienePartidos = async (teamId: string, teamName?: string) => {
    const consultas = [
      getDocs(query(matchesCollection(), where('homeTeamId', '==', teamId))),
      getDocs(query(matchesCollection(), where('awayTeamId', '==', teamId))),
    ]
    if (teamName) {
      consultas.push(
        getDocs(query(matchesCollection(), where('homeTeam', '==', teamName))),
        getDocs(query(matchesCollection(), where('awayTeam', '==', teamName))),
      )
    }
    const resultados = await Promise.all(consultas)
    return resultados.some((snap) => !snap.empty)
  }

  const createTeam = async (data: NewTeam) => {
    validarDatosEquipo(data)
    if (await nombreDuplicado(data.name)) {
      throw new ValidationError(`Ya existe una selección registrada con el nombre "${data.name}".`)
    }
    if (await cupoDeGrupoLleno(data.group)) {
      throw new ValidationError(`El grupo ${data.group} ya tiene ${MAX_EQUIPOS_POR_GRUPO} selecciones (cupo máximo).`)
    }
    const ref = await addDoc(teamsCollection(), data)
    return ref.id
  }

  const updateTeam = async (id: string, data: Partial<NewTeam>) => {
    const actual = await fetchTeamById(id)
    if (!actual) throw new ValidationError('La selección que intentas editar ya no existe.')
    const combinado: NewTeam = { ...actual, ...data }
    validarDatosEquipo(combinado)

    if (data.name && data.name !== actual.name && (await nombreDuplicado(data.name, id))) {
      throw new ValidationError(`Ya existe una selección registrada con el nombre "${data.name}".`)
    }

    if (data.group && data.group !== actual.group) {
      if (await cupoDeGrupoLleno(data.group, id)) {
        throw new ValidationError(`El grupo ${data.group} ya tiene ${MAX_EQUIPOS_POR_GRUPO} selecciones (cupo máximo).`)
      }
      if (await tienePartidos(id, actual.name)) {
        throw new ValidationError('No se puede cambiar el grupo de una selección que ya tiene partidos generados.')
      }
    }

    await updateDoc(doc($firestore, 'teams', id), data)
  }

  const deleteTeam = async (id: string) => {
    const actual = await fetchTeamById(id)
    if (await tieneJugadores(id)) {
      throw new ValidationError('No se puede eliminar la selección: todavía tiene jugadores registrados en su plantilla.')
    }
    if (await tienePartidos(id, actual?.name)) {
      throw new ValidationError('No se puede eliminar la selección: tiene partidos asociados en el calendario.')
    }
    await deleteDoc(doc($firestore, 'teams', id))
  }

  return {
    teams,
    loading,
    error,
    fetchTeams,
    fetchTeamById,
    createTeam,
    updateTeam,
    deleteTeam,
  }
}
