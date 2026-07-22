import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore'

// Estructura de un jugador en Firestore (colección "players")
export interface Player {
  id: string
  teamId: string
  name: string
  number: number
  position: string
  club: string
}

export type NewPlayer = Omit<Player, 'id'>

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

  const createPlayer = async (data: NewPlayer) => {
    const ref = await addDoc(playersCollection(), data)
    return ref.id
  }

  const updatePlayer = async (id: string, data: Partial<NewPlayer>) => {
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
