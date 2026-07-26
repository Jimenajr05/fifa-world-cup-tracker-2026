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

export const useTeams = () => {
  const { db: $firestore } = useFirestore()
  const teams = useState<Team[]>('teams', () => [])
  const loading = useState<boolean>('teamsLoading', () => false)
  const error = useState<string | null>('teamsError', () => null)

  const teamsCollection = () => collection($firestore, 'teams')

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

  const createTeam = async (data: NewTeam) => {
    const ref = await addDoc(teamsCollection(), data)
    return ref.id
  }

  const updateTeam = async (id: string, data: Partial<NewTeam>) => {
    await updateDoc(doc($firestore, 'teams', id), data)
  }

  const deleteTeam = async (id: string) => {
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
