// Sirve como plugin de Nuxt para inicializar Firebase y exponer auth/firestore a toda la app
// Inicializa la app de Firebase
import { initializeApp } from 'firebase/app'
// Autenticación y persistencia de sesión en el navegador
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth'
// Base de datos Firestore
import { getFirestore } from 'firebase/firestore'

// Plugin de Nuxt que inicializa Firebase y expone auth/firestore a toda la app
export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig()

  // Configuración del proyecto de Firebase, tomada de las variables de entorno
  const firebaseConfig = {
    apiKey: config.public.firebaseApiKey,
    authDomain: config.public.firebaseAuthDomain,
    projectId: config.public.firebaseProjectId,
    storageBucket: config.public.firebaseStorageBucket,
    messagingSenderId: config.public.firebaseMessagingSenderId,
    appId: config.public.firebaseAppId,
  }

  const app = initializeApp(firebaseConfig)
  const auth = getAuth(app)
  const db = getFirestore(app)

  // En el cliente, mantiene la sesión guardada en el navegador entre recargas
  if (import.meta.client) {
    setPersistence(auth, browserLocalPersistence)
  }

  // Expone $firebaseAuth y $firestore para usarlos en toda la app (useNuxtApp)
  return {
    provide: {
      firebaseAuth: auth,
      firestore: db,
    }
  }
})