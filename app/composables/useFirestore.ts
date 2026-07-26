import type { Firestore } from 'firebase/firestore'

// Composable base que expone la instancia de Cloud Firestore.
// El resto de composables del proyecto (useTeams, useMatches, usePlayers,
// usePredictions, useStandings, useStatistics, useBracket, useDashboard)
// la usan en vez de llamar a useNuxtApp() directamente, para no acoplarse
// al plugin de Firebase y tener un único punto de acceso a la base de datos.
export const useFirestore = (): { db: Firestore } => {
  const { $firestore } = useNuxtApp()
  return { db: $firestore as Firestore }
}
