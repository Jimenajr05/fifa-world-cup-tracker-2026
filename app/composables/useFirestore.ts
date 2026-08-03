// Composable para acceder a la instancia de Firestore desde cualquier componente
// Tipo de instancia de Firestore
import type { Firestore } from 'firebase/firestore'

// Expone la instancia de Firestore registrada por el plugin de Firebase
export const useFirestore = (): { db: Firestore } => {
  const { $firestore } = useNuxtApp()
  return { db: $firestore as Firestore }
}