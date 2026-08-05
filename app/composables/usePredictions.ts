// Composable para gestión de predicciones de partidos: registrar, calcular y otorgar puntos
// Lectura/escritura de documentos, consultas e incrementos atómicos en Firestore
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
// Tipos de partido
import type { Match, NewMatch } from './useMatches'
// Validaciones de campos de formulario
import { ValidationError, enteroEnRango } from '~/utils/validation'

// Forma de un documento de predicción en Firestore
export interface Prediction {
  id: string
  userId: string
  matchId: string
  homePrediction: number
  awayPrediction: number
  pointsEarned: number | null
}

// Datos de una predicción antes de tener id (para crear/actualizar)
export type NewPrediction = Omit<Prediction, 'id'>

// Puntaje por acertar el marcador exacto
const PUNTOS_MARCADOR_EXACTO = 3
// Puntaje por acertar solo el ganador/empate
const PUNTOS_SOLO_GANADOR = 1
// Bono por acertar el campeón del torneo
const PUNTOS_BONO_CAMPEON = 5

// Resultado de un partido según el marcador (local, visitante o empate)
type Resultado = 'local' | 'visitante' | 'empate'
// Determina el resultado de un partido a partir de los goles de cada equipo
const resultadoDe = (homeScore: number, awayScore: number): Resultado => {
  if (homeScore > awayScore) return 'local'
  if (homeScore < awayScore) return 'visitante'
  return 'empate'
}

// Composable para gestión de predicciones: registrar, calcular y otorgar puntos
export const usePredictions = () => {
  const { db: $firestore } = useFirestore()

  // Lista de predicciones cargadas
  const predictions = useState<Prediction[]>('predictions', () => [])
  // Indica si se están cargando predicciones
  const loading = useState<boolean>('predictionsLoading', () => false)
  // Mensaje de error al cargar predicciones
  const error = useState<string | null>('predictionsError', () => null)

  // Referencia a la colección 'predictions'
  const predictionsCollection = () => collection($firestore, 'predictions')

  // Carga todas las predicciones de un usuario
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

  // Obtiene la predicción de un usuario para un partido específico, o null si no existe
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

  // Crea o actualiza la predicción de un usuario para un partido, validando marcadores y estado del partido
  const guardarPrediccion = async (
    userId: string,
    matchId: string,
    homePrediction: number,
    awayPrediction: number,
  ) => {
    // Validaciones de los marcadores predichos
    enteroEnRango(Number(homePrediction), 'El marcador que predices para el local', 0, 20)
    enteroEnRango(Number(awayPrediction), 'El marcador que predices para el visitante', 0, 20)

    // Verifica que el partido exista y que todavía no haya comenzado
    const matchSnap = await getDoc(doc($firestore, 'matches', matchId))
    if (!matchSnap.exists()) throw new ValidationError('El partido no existe.')
    const match = matchSnap.data() as NewMatch
    if (match.status !== 'Programado') {
      throw new ValidationError('Solo se puede predecir un partido que todavía no comenzó.')
    }
    if (match.kickoff.toDate().getTime() <= Date.now()) {
      throw new ValidationError('Ya no puedes predecir este partido: la hora de inicio ya pasó.')
    }

    // Verifica si ya existe una predicción para este usuario y partido
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

  // Elimina una predicción y revierte los puntos otorgados al usuario, si los tenía
  const eliminarPrediccion = async (predictionId: string) => {
    const snap = await getDoc(doc($firestore, 'predictions', predictionId))
    if (!snap.exists()) return
    const pred = snap.data() as NewPrediction

    if (pred.pointsEarned) {
      await updateDoc(doc($firestore, 'users', pred.userId), { puntos: increment(-pred.pointsEarned) })
    }
    await deleteDoc(doc($firestore, 'predictions', predictionId))
  }

  // Calcula y actualiza los puntos de todas las predicciones de un partido finalizado,
  // y otorga el bono de campeón si el partido era la Final
  const calcularPuntos = async (match: Match) => {
    if (match.status !== 'Finalizado' || match.homeScore === null || match.awayScore === null) return

    // Consulta todas las predicciones para este partido y actualiza los puntos de cada usuario según el resultado
    const q = query(predictionsCollection(), where('matchId', '==', match.id))
    const snap = await getDocs(q)
    const resultadoReal = resultadoDe(match.homeScore, match.awayScore)

    // Actualiza los puntos de cada predicción y del usuario correspondiente
    for (const docSnap of snap.docs) {
      const pred = docSnap.data() as NewPrediction
      const puntosAnteriores = pred.pointsEarned ?? 0

      // Calcula los puntos nuevos según el resultado de la predicción
      let puntosNuevos = 0
      if (pred.homePrediction === match.homeScore && pred.awayPrediction === match.awayScore) {
        puntosNuevos = PUNTOS_MARCADOR_EXACTO
      } else if (resultadoDe(pred.homePrediction, pred.awayPrediction) === resultadoReal) {
        puntosNuevos = PUNTOS_SOLO_GANADOR
      }

      // Actualiza la predicción con los puntos obtenidos y ajusta el puntaje del usuario si hubo un cambio
      await updateDoc(doc($firestore, 'predictions', docSnap.id), { pointsEarned: puntosNuevos })

      // Ajusta el puntaje del usuario según la diferencia entre los puntos nuevos y los anteriores
      const delta = puntosNuevos - puntosAnteriores
      if (delta !== 0) {
        await updateDoc(doc($firestore, 'users', pred.userId), { puntos: increment(delta) })
      }
    }

    if (match.stage === 'Final') {
      const campeonReal = match.homeScore > match.awayScore ? match.homeTeam : match.awayTeam
      await otorgarBonoCampeon(campeonReal)
    }
  }

  // Otorga el bono de puntos por campeón a los usuarios que lo eligieron correctamente (una sola vez)
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

  // API pública del composable
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