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
  increment,
} from 'firebase/firestore'
import type { Match } from './useMatches'

// Estructura de una predicción guardada en Firestore (colección "predictions")
export interface Prediction {
  id: string
  userId: string
  matchId: string
  homePrediction: number
  awayPrediction: number
  pointsEarned: number | null // null mientras el partido no ha terminado
}

export type NewPrediction = Omit<Prediction, 'id'>

// Puntos otorgados según el sistema de puntuación acordado
const PUNTOS_MARCADOR_EXACTO = 3
const PUNTOS_SOLO_GANADOR = 1
const PUNTOS_BONO_CAMPEON = 5

// Convierte un marcador en el resultado general del partido, para poder
// comparar "acertó el ganador" sin importar el marcador exacto.
type Resultado = 'local' | 'visitante' | 'empate'
const resultadoDe = (homeScore: number, awayScore: number): Resultado => {
  if (homeScore > awayScore) return 'local'
  if (homeScore < awayScore) return 'visitante'
  return 'empate'
}

export const usePredictions = () => {
  const { db: $firestore } = useFirestore()

  const predictions = useState<Prediction[]>('predictions', () => [])
  const loading = useState<boolean>('predictionsLoading', () => false)
  const error = useState<string | null>('predictionsError', () => null)

  const predictionsCollection = () => collection($firestore, 'predictions')

  // Trae todas las predicciones de un usuario (para /profile/predictions)
  const fetchPredictionsByUser = async (userId: string) => {
    loading.value = true
    error.value = null
    try {
      const q = query(predictionsCollection(), where('userId', '==', userId))
      const snap = await getDocs(q)
      predictions.value = snap.docs.map((d) => ({ id: d.id, ...(d.data() as NewPrediction) }))
    } catch (err) {
      console.error('Error al cargar predicciones:', err)
      error.value = 'No se pudieron cargar tus predicciones.'
    } finally {
      loading.value = false
    }
  }

  // Trae la predicción de un usuario para un partido específico, o null si no existe.
  // Se usa para precargar el formulario en /predictions/[matchId]
  const fetchPredictionByMatch = async (userId: string, matchId: string): Promise<Prediction | null> => {
    const q = query(
      predictionsCollection(),
      where('userId', '==', userId),
      where('matchId', '==', matchId),
    )
    const snap = await getDocs(q)
    if (snap.empty) return null
    const d = snap.docs[0]
    if (!d) return null
    return { id: d.id, ...(d.data() as NewPrediction) }
  }

  // Crea o actualiza la predicción de un usuario para un partido (upsert).
  // Solo debe llamarse mientras el partido siga en estado "Programado"
  // (esa validación se hace en la página, donde se conoce el estado del partido).
  const guardarPrediccion = async (
    userId: string,
    matchId: string,
    homePrediction: number,
    awayPrediction: number,
  ) => {
    const existente = await fetchPredictionByMatch(userId, matchId)
    if (existente) {
      await updateDoc(doc($firestore, 'predictions', existente.id), {
        homePrediction,
        awayPrediction,
      })
    } else {
      const nueva: NewPrediction = {
        userId,
        matchId,
        homePrediction,
        awayPrediction,
        pointsEarned: null,
      }
      await addDoc(predictionsCollection(), nueva)
    }
  }

  // Elimina una predicción propia. Si ya tenía puntos otorgados, se los
  // resta al usuario para no dejar puntaje "huérfano" en el ranking.
  const eliminarPrediccion = async (predictionId: string) => {
    const snap = await getDoc(doc($firestore, 'predictions', predictionId))
    if (!snap.exists()) return
    const pred = snap.data() as NewPrediction

    if (pred.pointsEarned) {
      await updateDoc(doc($firestore, 'users', pred.userId), { puntos: increment(-pred.pointsEarned) })
    }
    await deleteDoc(doc($firestore, 'predictions', predictionId))
  }

  // Al finalizar un partido, calcula los puntos de todas las predicciones
  // hechas para ese partido y actualiza el total de puntos de cada usuario.
  // Usa la diferencia (delta) contra los puntos ya otorgados antes, para que
  // si el resultado se corrige después no se dupliquen los puntos.
  const calcularPuntos = async (match: Match) => {
    if (match.status !== 'Finalizado' || match.homeScore === null || match.awayScore === null) return

    const q = query(predictionsCollection(), where('matchId', '==', match.id))
    const snap = await getDocs(q)
    const resultadoReal = resultadoDe(match.homeScore, match.awayScore)

    for (const docSnap of snap.docs) {
      const pred = docSnap.data() as NewPrediction
      const puntosAnteriores = pred.pointsEarned ?? 0

      let puntosNuevos = 0
      if (pred.homePrediction === match.homeScore && pred.awayPrediction === match.awayScore) {
        puntosNuevos = PUNTOS_MARCADOR_EXACTO
      } else if (resultadoDe(pred.homePrediction, pred.awayPrediction) === resultadoReal) {
        puntosNuevos = PUNTOS_SOLO_GANADOR
      }

      await updateDoc(doc($firestore, 'predictions', docSnap.id), { pointsEarned: puntosNuevos })

      const delta = puntosNuevos - puntosAnteriores
      if (delta !== 0) {
        await updateDoc(doc($firestore, 'users', pred.userId), { puntos: increment(delta) })
      }
    }

    // Bono por campeón acertado: solo aplica cuando se finaliza la Final del torneo
    if (match.stage === 'Final') {
      const campeonReal = match.homeScore > match.awayScore ? match.homeTeam : match.awayTeam
      await otorgarBonoCampeon(campeonReal)
    }
  }

  // Otorga el bono de puntos a los usuarios que eligieron al campeón correcto.
  // Revisa bonoCampeonOtorgado para no volver a sumarlo si el partido se re-edita.
  const otorgarBonoCampeon = async (campeonReal: string) => {
    const q = query(collection($firestore, 'users'), where('campeonElegido', '==', campeonReal))
    const snap = await getDocs(q)
    for (const docSnap of snap.docs) {
      const datos = docSnap.data()
      if (datos.bonoCampeonOtorgado) continue
      await updateDoc(doc($firestore, 'users', docSnap.id), {
        puntos: increment(PUNTOS_BONO_CAMPEON),
        bonoCampeonOtorgado: true,
      })
    }
  }

  return {
    predictions,
    loading,
    error,
    fetchPredictionsByUser,
    fetchPredictionByMatch,
    guardarPrediccion,
    eliminarPrediccion,
    calcularPuntos,
  }
}