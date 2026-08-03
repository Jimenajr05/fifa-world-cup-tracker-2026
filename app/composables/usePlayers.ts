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
import { POSICIONES_JUGADOR } from '~/utils/worldCupData'
import { ValidationError, requerido, longitud, enteroEnRango, enLista } from '~/utils/validation'

// Estructura de un jugador en Firestore (colección "players")
export interface Player {
  id: string
  teamId: string
  name: string
  number: number
  position: string
  club: string
  titular: boolean
}

export type NewPlayer = Omit<Player, 'id'>

// Reglamento oficial FIFA (Mundial 2026): la plantilla final se numera del
// 1 al 26 (no del 1 al 99 como en clubes), y el dorsal 1 es exclusivo de un
// portero. La plantilla debe tener mínimo 23 y máximo 26 jugadores, con al
// menos 3 porteros.
const MAX_JUGADORES_POR_PLANTILLA = 26
const MIN_JUGADORES_PLANTILLA_COMPLETA = 23
const MIN_PORTEROS_PLANTILLA = 3
const MAX_TITULARES = 11
const POSICION_PORTERO = 'Portero'
const DORSAL_MIN = 1
const DORSAL_MAX = 26
const DORSAL_EXCLUSIVO_PORTERO = 1

export const usePlayers = () => {
  const { db: $firestore } = useFirestore()
  const players = useState<Player[]>('players', () => [])
  const loading = useState<boolean>('playersLoading', () => false)
  const error = useState<string | null>('playersError', () => null)

  const playersCollection = () => collection($firestore, 'players')

  // Trae la plantilla de una selección (query por teamId con where())
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

  // Trae todos los jugadores de todas las selecciones, para la búsqueda global
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

  // ── Reglas de negocio ──────────────────────────────────────────
  const NOMBRE_REGEX = /^[\p{L}\p{M}'’\-. ]+$/u

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

  const equipoExiste = async (teamId: string) => {
    const snap = await getDoc(doc($firestore, 'teams', teamId))
    return snap.exists()
  }

  const jugadoresDelEquipo = async (teamId: string, excludeId?: string) => {
    const snap = await getDocs(query(playersCollection(), where('teamId', '==', teamId)))
    return snap.docs
      .filter((d) => d.id !== excludeId)
      .map((d) => ({ id: d.id, ...(d.data() as NewPlayer) }))
  }

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

  const deletePlayer = async (id: string) => {
    await deleteDoc(doc($firestore, 'players', id))
  }

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
