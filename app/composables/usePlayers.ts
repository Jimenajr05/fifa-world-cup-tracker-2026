// Composable para gestión de jugadores en Firestore: CRUD y validaciones de plantilla
// Lectura/escritura de documentos y consultas en Firestore
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore'
// Catálogo de posiciones válidas de jugador
import { POSICIONES_JUGADOR } from '~/utils/worldCupData'
// Validaciones de campos de formulario
import { ValidationError, requerido, longitud, enteroEnRango, enLista } from '~/utils/validation'

// Forma de un documento de jugador en Firestore
export interface Player {
  id: string
  teamId: string
  name: string
  number: number
  position: string
  club: string
  titular: boolean
}

// Datos de un jugador antes de tener id (para crear/actualizar)
export type NewPlayer = Omit<Player, 'id'>

// Reglas de plantilla: límites de jugadores, titulares y dorsales
const MAX_JUGADORES_POR_PLANTILLA = 26
const MIN_JUGADORES_PLANTILLA_COMPLETA = 23
const MIN_PORTEROS_PLANTILLA = 3
const MAX_TITULARES = 11
const POSICION_PORTERO = 'Portero'
const DORSAL_MIN = 1
const DORSAL_MAX = 26
const DORSAL_EXCLUSIVO_PORTERO = 1

// Composable para gestión de jugadores: CRUD y validaciones de plantilla
export const usePlayers = () => {
  const { db: $firestore } = useFirestore()
  // Lista de jugadores cargados
  const players = useState<Player[]>('players', () => [])
  // Indica si se están cargando jugadores
  const loading = useState<boolean>('playersLoading', () => false)
  // Mensaje de error al cargar jugadores
  const error = useState<string | null>('playersError', () => null)

  // Referencia a la colección 'players'
  const playersCollection = () => collection($firestore, 'players')

  // Carga los jugadores de un equipo, ordenados por número de camiseta
  const fetchPlayersByTeam = async (teamId: string) => {
    loading.value = true
    error.value = null
    try {
      const q = query(playersCollection(), where('teamId', '==', teamId))
      const snap = await getDocs(q)
      players.value = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as NewPlayer) }))
        .sort((a, b) => a.number - b.number)
    } catch (err) {
      console.error('Error al cargar jugadores:', err)
      error.value = 'No se pudo cargar la plantilla de jugadores.'
    } finally {
      loading.value = false
    }
  }

  // Carga todos los jugadores, ordenados alfabéticamente por nombre
  const fetchAllPlayers = async () => {
    loading.value = true
    error.value = null
    try {
      const snap = await getDocs(playersCollection())
      players.value = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as NewPlayer) }))
        .sort((a, b) => a.name.localeCompare(b.name))
    } catch (err) {
      console.error('Error al cargar jugadores:', err)
      error.value = 'No se pudo cargar la lista de jugadores.'
    } finally {
      loading.value = false
    }
  }

  // Patrón que valida nombres con letras, espacios, apóstrofes y guiones
  const NOMBRE_REGEX = /^[\p{L}\p{M}'’\-. ]+$/u

  // Valida los campos de un jugador (nombre, dorsal, posición, club)
  const validarDatosJugador = (data: NewPlayer) => {
    requerido(data.name, 'El nombre')
    longitud(data.name, 'El nombre', 2, 60)
    if (!NOMBRE_REGEX.test(data.name.trim())) {
      throw new ValidationError('El nombre solo puede contener letras, espacios, apóstrofes y guiones.')
    }
    enteroEnRango(Number(data.number), 'El número de camiseta', DORSAL_MIN, DORSAL_MAX)
    requerido(data.position, 'La posición')
    enLista(data.position, 'La posición', POSICIONES_JUGADOR)
    if (Number(data.number) === DORSAL_EXCLUSIVO_PORTERO && data.position !== POSICION_PORTERO) {
      throw new ValidationError('El dorsal 1 está reservado exclusivamente para un portero.')
    }
    requerido(data.club, 'El club')
    longitud(data.club, 'El club', 2, 80)
  }

  // Verifica que el equipo indicado exista en Firestore
  const equipoExiste = async (teamId: string) => {
    const snap = await getDoc(doc($firestore, 'teams', teamId))
    return snap.exists()
  }

  // Obtiene los compañeros de plantilla de un equipo, excluyendo opcionalmente un id
  const jugadoresDelEquipo = async (teamId: string, excludeId?: string) => {
    const snap = await getDocs(query(playersCollection(), where('teamId', '==', teamId)))
    return snap.docs
      .filter((d) => d.id !== excludeId)
      .map((d) => ({ id: d.id, ...(d.data() as NewPlayer) }))
  }

  // Valida reglas de plantilla: dorsal libre, cupo máximo y límites de titulares
  const validarReglasDePlantilla = (
    compañeros: (NewPlayer & { id: string })[],
    data: NewPlayer,
  ) => {
    if (compañeros.some((p) => p.number === Number(data.number))) {
      throw new ValidationError(`El número ${data.number} ya está ocupado por otro jugador de esta selección.`)
    }
    if (compañeros.length >= MAX_JUGADORES_POR_PLANTILLA) {
      throw new ValidationError(`La plantilla ya tiene el máximo permitido de ${MAX_JUGADORES_POR_PLANTILLA} jugadores.`)
    }
    if (data.titular) {
      const titularesActuales = compañeros.filter((p) => p.titular)
      if (titularesActuales.length >= MAX_TITULARES) {
        throw new ValidationError(`Ya hay ${MAX_TITULARES} titulares. Desmarca a otro jugador antes de agregar uno nuevo.`)
      }
      if (data.position === POSICION_PORTERO && titularesActuales.some((p) => p.position === POSICION_PORTERO)) {
        throw new ValidationError('Ya hay un portero titular. Solo puede haber uno en la alineación.')
      }
    }
  }

  // Crea un jugador validando datos, existencia del equipo, nombre único y reglas de plantilla
  const createPlayer = async (data: NewPlayer) => {
    validarDatosJugador(data)
    if (!(await equipoExiste(data.teamId))) {
      throw new ValidationError('La selección indicada no existe.')
    }
    const compañeros = await jugadoresDelEquipo(data.teamId)
    if (compañeros.some((p) => p.name.trim().toLowerCase() === data.name.trim().toLowerCase())) {
      throw new ValidationError(`Ya existe un jugador llamado "${data.name}" en esta selección.`)
    }
    validarReglasDePlantilla(compañeros, data)
    const ref = await addDoc(playersCollection(), data)
    return ref.id
  }

  // Actualiza un jugador validando datos, nombre único y reglas de plantilla
  const updatePlayer = async (id: string, data: Partial<NewPlayer>) => {
    const actualSnap = await getDoc(doc($firestore, 'players', id))
    if (!actualSnap.exists()) throw new ValidationError('El jugador que intentas editar ya no existe.')
    const actual = { id, ...(actualSnap.data() as NewPlayer) }
    const combinado: NewPlayer = { ...actual, ...data }
    validarDatosJugador(combinado)

    const compañeros = await jugadoresDelEquipo(combinado.teamId, id)
    if (
      combinado.name.trim().toLowerCase() !== actual.name.trim().toLowerCase()
      && compañeros.some((p) => p.name.trim().toLowerCase() === combinado.name.trim().toLowerCase())
    ) {
      throw new ValidationError(`Ya existe un jugador llamado "${combinado.name}" en esta selección.`)
    }
    validarReglasDePlantilla(compañeros, combinado)

    await updateDoc(doc($firestore, 'players', id), data)
  }

  // Elimina un jugador de Firestore
  const deletePlayer = async (id: string) => {
    await deleteDoc(doc($firestore, 'players', id))
  }

  // API pública del composable
  return {
    players,
    loading,
    error,
    fetchPlayersByTeam,
    fetchAllPlayers,
    createPlayer,
    updatePlayer,
    deletePlayer,
  }
}