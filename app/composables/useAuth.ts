import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User
} from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'

// Estructura del perfil guardado en Firestore (colección "users")
export interface PerfilUsuario {
  uid: string
  nombre: string
  email: string
  foto: string
  seleccionFavorita: string | null
  ultimoLogin?: unknown
  creadoEn?: unknown
}

export const useAuth = () => {
  const { $firebaseAuth, $firestore } = useNuxtApp()
  const user = useState<User | null>('user', () => null)
  const perfil = useState<PerfilUsuario | null>('perfil', () => null)
  const cargandoPerfil = useState<boolean>('cargandoPerfil', () => false)

  const guardarUsuarioEnFirestore = async (usuario: User) => {
    const userRef = doc($firestore, 'users', usuario.uid)
    const existente = await getDoc(userRef)

    await setDoc(userRef, {
      uid: usuario.uid,
      nombre: usuario.displayName,
      email: usuario.email,
      foto: usuario.photoURL,
      // Si el documento no existía, inicializa seleccionFavorita en null y guarda fecha de creación
      ...(existente.exists() ? {} : { seleccionFavorita: null, creadoEn: serverTimestamp() }),
      ultimoLogin: serverTimestamp(),
    }, { merge: true }) // merge: true evita borrar otros campos que ya existan
  }

  // Trae el perfil desde Firestore y lo guarda en el estado reactivo "perfil"
  const cargarPerfil = async (uid: string) => {
    cargandoPerfil.value = true
    try {
      const userRef = doc($firestore, 'users', uid)
      const snap = await getDoc(userRef)
      if (snap.exists()) {
        perfil.value = snap.data() as PerfilUsuario
      }
    } catch (error) {
      console.error('Error al cargar perfil:', error)
    } finally {
      cargandoPerfil.value = false
    }
  }

  // Permite editar nombre y/o selección favorita
  const actualizarPerfil = async (cambios: { nombre?: string; seleccionFavorita?: string }) => {
    if (!user.value) return
    const userRef = doc($firestore, 'users', user.value.uid)
    await setDoc(userRef, cambios, { merge: true })
    // Refleja el cambio localmente sin necesidad de volver a leer Firestore
    if (perfil.value) {
      perfil.value = { ...perfil.value, ...cambios }
    }
  }

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider()
    try {
      const result = await signInWithPopup($firebaseAuth, provider)
      user.value = result.user
      await guardarUsuarioEnFirestore(result.user)
      await cargarPerfil(result.user.uid)
    } catch (error) {
      console.error('Error en login:', error)
    }
  }

  const logout = async () => {
    await signOut($firebaseAuth)
    user.value = null
    perfil.value = null
  }

  onAuthStateChanged($firebaseAuth, (currentUser) => {
    user.value = currentUser
    if (currentUser) {
      cargarPerfil(currentUser.uid)
    }
  })

  return {
    user,
    perfil,
    cargandoPerfil,
    loginWithGoogle,
    logout,
    actualizarPerfil,
  }
}