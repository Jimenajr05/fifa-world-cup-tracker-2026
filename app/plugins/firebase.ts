import { initializeApp } from 'firebase/app'
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig()

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
  const storage = getStorage(app)

  // Mantiene la sesión iniciada aunque el usuario cierre y vuelva a abrir el navegador
  if (import.meta.client) {
    setPersistence(auth, browserLocalPersistence)
  }

  return {
    provide: {
      firebaseAuth: auth,
      firestore: db,
      firebaseStorage: storage,
    }
  }
})