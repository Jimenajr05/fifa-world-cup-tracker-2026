// Composable para gestión de selecciones (equipos): CRUD y validaciones de grupo/plantilla/calendario
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
  orderBy,
} from 'firebase/firestore'
// Catálogos de confederaciones y grupos válidos
import { CONFEDERACIONES, GRUPOS } from '~/utils/worldCupData'
// Validaciones de campos de formulario
import { ValidationError, requerido, longitud, enteroEnRango, enLista } from '~/utils/validation'

// Forma de un documento de selección (equipo) en Firestore
export interface Team {
  id: string
  name: string
  group: string
  flag: string
  coach: string
  confederation: string
  fifaRanking: number
}

// Datos de un equipo antes de tener id (para crear/actualizar)
export type NewTeam = Omit<Team, 'id'>

// Cupo máximo de selecciones por grupo
const MAX_EQUIPOS_POR_GRUPO = 4

// Composable para gestión de selecciones: CRUD y validaciones de grupo/plantilla/calendario
export const useTeams = () => {
  const { db: $firestore } = useFirestore()
  // Lista de equipos cargados
  const teams = useState<Team[]>('teams', () => [])
  // Indica si se están cargando equipos
  const loading = useState<boolean>('teamsLoading', () => false)
  // Mensaje de error al cargar equipos
  const error = useState<string | null>('teamsError', () => null)

  // Referencia a la colección 'teams'
  const teamsCollection = () => collection($firestore, 'teams')
  // Referencia a la colección 'players'
  const playersCollection = () => collection($firestore, 'players')
  // Referencia a la colección 'matches'
  const matchesCollection = () => collection($firestore, 'matches')

  // Carga equipos aplicando filtros opcionales de grupo y confederación, ordenados por ranking FIFA
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

  // Obtiene un equipo por su id
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

  // Valida los campos de un equipo (nombre, bandera, entrenador, grupo, confederación, ranking)
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

  // Verifica si ya existe una selección con el mismo nombre
  const nombreDuplicado = async (name: string, excludeId?: string) => {
    const q = query(teamsCollection(), where('name', '==', name.trim()))
    const snap = await getDocs(q)
    return snap.docs.some((d) => d.id !== excludeId)
  }

  // Verifica si un grupo ya alcanzó el cupo máximo de selecciones
  const cupoDeGrupoLleno = async (group: string, excludeId?: string) => {
    const q = query(teamsCollection(), where('group', '==', group))
    const snap = await getDocs(q)
    const ocupantes = snap.docs.filter((d) => d.id !== excludeId)
    return ocupantes.length >= MAX_EQUIPOS_POR_GRUPO
  }

  // Verifica si el equipo tiene jugadores registrados en su plantilla
  const tieneJugadores = async (teamId: string) => {
    const snap = await getDocs(query(playersCollection(), where('teamId', '==', teamId)))
    return !snap.empty
  }

  // Verifica si el equipo tiene partidos asociados (por id o por nombre)
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

  // Crea una selección validando datos, nombre único y cupo del grupo
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

  // Actualiza una selección validando datos, nombre único y reglas al cambiar de grupo
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

  // Elimina una selección si no tiene jugadores ni partidos asociados
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

  // API pública del composable
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