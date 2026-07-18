import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User
} from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'

export const useAuth = () => {
  const { $firebaseAuth, $firestore } = useNuxtApp()
  const user = useState<User | null>('user', () => null)

  const guardarUsuarioEnFirestore = async (usuario: User) => {
    const userRef = doc($firestore, 'users', usuario.uid)

    await setDoc(userRef, {
      uid: usuario.uid,
      nombre: usuario.displayName,
      email: usuario.email,
      foto: usuario.photoURL,
      ultimoLogin: serverTimestamp(),
    }, { merge: true }) // merge: true evita borrar otros campos que ya existan (ej. fecha de creación)
  }

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider()
    try {
      const result = await signInWithPopup($firebaseAuth, provider)
      user.value = result.user
      await guardarUsuarioEnFirestore(result.user)
    } catch (error) {
      console.error('Error en login:', error)
    }
  }

  const logout = async () => {
    await signOut($firebaseAuth)
    user.value = null
  }

  onAuthStateChanged($firebaseAuth, (currentUser) => {
    user.value = currentUser
  })

  return { user, loginWithGoogle, logout }
}