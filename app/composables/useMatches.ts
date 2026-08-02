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

// Un gol registrado en un partido, para poder calcular "máximo goleador"
export interface MatchScorer {
  playerId: string
  playerName: string
  teamId: string
  goals: number
}

// Estructura de un partido en Firestore (colección "matches")
export interface Match {
  id: string
  homeTeam: string
  awayTeam: string
  homeTeamId?: string | null // referencia al documento del equipo local (para filtrar jugadores)
  awayTeamId?: string | null // referencia al documento del equipo visitante
  stage: string
  group: string | null // solo aplica cuando stage === 'Fase de grupos'
  stadium: string
  city: string
  kickoff: Timestamp
  homeScore: number | null
  awayScore: number | null
  status: string
  round?: number // orden de la ronda eliminatoria (0 = Dieciseisavos), ver useBracket
  bracketPosition?: number // posición dentro del bracket de esa ronda
  scorers?: MatchScorer[] // goleadores del partido, usados en useStatistics
}

export type NewMatch = Omit<Match, 'id'>

export const useMatches = () => {
  const { db: $firestore } = useFirestore()
  const matches = useState<Match[]>('matches', () => [])
  const loading = useState<boolean>('matchesLoading', () => false)
  const error = useState<string | null>('matchesError', () => null)

  const matchesCollection = () => collection($firestore, 'matches')

  // Trae los partidos, opcionalmente filtrados por fase, grupo o estado
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

  const createMatch = async (data: NewMatch) => {
    const ref = await addDoc(matchesCollection(), data)
    return ref.id
  }

  const updateMatch = async (id: string, data: Partial<NewMatch>) => {
    await updateDoc(doc($firestore, 'matches', id), data)
  }

  const deleteMatch = async (id: string) => {
    await deleteDoc(doc($firestore, 'matches', id))
  }

  // Revisa si el equipo (por id) tiene AHORA MISMO un partido en estado "En Vivo",
  // ya sea como local o como visitante. Se usa para bloquear la eliminación de
  // jugadores de una selección que está jugando en este momento.
  const equipoTienePartidoEnVivo = async (teamId: string): Promise<boolean> => {
    const q = query(collection($firestore, 'matches'), where('status', '==', 'En Vivo'))
    const snap = await getDocs(q)
    return snap.docs.some((d) => {
      const partido = d.data() as NewMatch
      return partido.homeTeamId === teamId || partido.awayTeamId === teamId
    })
  }

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