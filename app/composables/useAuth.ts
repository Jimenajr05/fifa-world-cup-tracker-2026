// Composable para la gestión de autenticación y perfil de usuario
// Autenticación con Google y control de sesión de Firebase
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User
} from 'firebase/auth'
// Lectura/escritura de documentos y consultas en Firestore
import { doc, setDoc, getDoc, collection, getDocs, query, where, serverTimestamp, arrayUnion, arrayRemove } from 'firebase/firestore'
// Validaciones de campos de formulario
import { requerido, longitud } from '~/utils/validation'

// Forma del documento de usuario guardado en Firestore
export interface PerfilUsuario {
  uid: string
  nombre: string
  email: string
  foto: string
  seleccionFavorita: string | null
  campeonElegido: string | null
  puntos: number
  equiposFavoritos: string[]
  partidosFavoritos: string[]
  bonoCampeonOtorgado?: boolean
  ultimoLogin?: unknown
  creadoEn?: unknown
}

// Evita registrar el listener de sesión más de una vez
let listenerRegistrado = false

// Composable de autenticación: usuario, perfil y acciones de sesión
export const useAuth = () => {
  const { $firebaseAuth } = useNuxtApp()
  const { db: $firestore } = useFirestore()
  const store = useAuthStore()
  const { user, perfil, cargandoPerfil, errorCampeon } = storeToRefs(store)

  // Crea/actualiza el doc del usuario en Firestore tras el login
  const guardarUsuarioEnFirestore = async (usuario: User) => {
    const userRef = doc($firestore, 'users', usuario.uid)
    const existente = await getDoc(userRef)

    // Si el documento ya existe, solo actualiza campos faltantes y último login
    const datosExistentes = existente.exists() ? existente.data() : null
    const camposFaltantes: Record<string, unknown> = {}
    if (datosExistentes) {
      if (datosExistentes.equiposFavoritos === undefined) camposFaltantes.equiposFavoritos = []
      if (datosExistentes.partidosFavoritos === undefined) camposFaltantes.partidosFavoritos = []
      if (datosExistentes.campeonElegido === undefined) camposFaltantes.campeonElegido = null
      if (datosExistentes.puntos === undefined) camposFaltantes.puntos = 0
    }

    // Guardar o actualizar el documento del usuario en Firestore
    await setDoc(userRef, {
      uid: usuario.uid,
      nombre: datosExistentes?.nombre ?? usuario.displayName,
      email: usuario.email,
      foto: datosExistentes?.foto ?? usuario.photoURL,
      ...(existente.exists() ? {} : { seleccionFavorita: null, campeonElegido: null, puntos: 0, equiposFavoritos: [], partidosFavoritos: [], creadoEn: serverTimestamp() }),
      ...camposFaltantes,
      ultimoLogin: serverTimestamp(),
    }, { merge: true })
  }

  // Carga el perfil del usuario desde Firestore al store
  const cargarPerfil = async (uid: string) => {
    cargandoPerfil.value = true
    try {
      const userRef = doc($firestore, 'users', uid)
      const snap = await getDoc(userRef)
      if (snap.exists()) {
        const datos = snap.data() as PerfilUsuario
        perfil.value = {
          ...datos,
          equiposFavoritos: datos.equiposFavoritos ?? [],
          partidosFavoritos: datos.partidosFavoritos ?? [],
        }
      }
    } catch (error) {
      console.error('Error al cargar perfil:', error)
    } finally {
      cargandoPerfil.value = false
    }
  }

  // Actualiza campos editables del perfil (nombre, selección, foto)
  const actualizarPerfil = async (cambios: { nombre?: string; seleccionFavorita?: string; foto?: string }) => {
    if (!user.value) return
    if (cambios.nombre !== undefined) {
      requerido(cambios.nombre, 'El nombre')
      longitud(cambios.nombre, 'El nombre', 2, 60)
    }
    // Guardar cambios en Firestore y actualizar el store
    const userRef = doc($firestore, 'users', user.value.uid)
    await setDoc(userRef, cambios, { merge: true })
    if (perfil.value) {
      perfil.value = { ...perfil.value, ...cambios }
    }
  }

  // Registra el campeón elegido, una sola vez por usuario
  const elegirCampeon = async (equipo: string) => {
    errorCampeon.value = ''
    if (!user.value) return
    if (perfil.value?.campeonElegido) {
      errorCampeon.value = 'Ya elegiste tu campeón, no se puede cambiar.'
      return
    }
    // Verifica que el equipo exista en la colección 'teams'
    const existe = await getDocs(query(collection($firestore, 'teams'), where('name', '==', equipo)))
    if (existe.empty) {
      errorCampeon.value = 'Esa selección no existe.'
      return
    }
    // Guarda el campeón elegido en Firestore y actualiza el store       
    const userRef = doc($firestore, 'users', user.value.uid)
    await setDoc(userRef, { campeonElegido: equipo }, { merge: true })
    if (perfil.value) {
      perfil.value = { ...perfil.value, campeonElegido: equipo }
    }
  }

  // Agrega/quita un id de la lista de favoritos indicada
  const alternarFavorito = async (campo: 'equiposFavoritos' | 'partidosFavoritos', valorId: string) => {
    if (!user.value || !perfil.value) return
    const yaEsFavorito = perfil.value[campo].includes(valorId)
    const userRef = doc($firestore, 'users', user.value.uid)
    await setDoc(userRef, { [campo]: yaEsFavorito ? arrayRemove(valorId) : arrayUnion(valorId) }, { merge: true })
    perfil.value = {
      ...perfil.value,
      [campo]: yaEsFavorito
        ? perfil.value[campo].filter((v) => v !== valorId)
        : [...perfil.value[campo], valorId],
    }
  }

  // Atajo para favorito de equipo
  const alternarEquipoFavorito = (teamId: string) => alternarFavorito('equiposFavoritos', teamId)
  // Atajo para favorito de partido
  const alternarPartidoFavorito = (matchId: string) => alternarFavorito('partidosFavoritos', matchId)

  // Login con Google y sincronización de usuario/perfil
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

  // Cierra sesión y limpia usuario/perfil
  const logout = async () => {
    await signOut($firebaseAuth)
    user.value = null
    perfil.value = null
  }

  // Escucha cambios de sesión (solo en cliente, una vez)
  if (import.meta.client && !listenerRegistrado) {
    listenerRegistrado = true
    onAuthStateChanged($firebaseAuth, (currentUser) => {
      user.value = currentUser
      if (currentUser) {
        cargarPerfil(currentUser.uid)
      }
    })
  }

  // API pública del composable
  return {
    user,
    perfil,
    cargandoPerfil,
    loginWithGoogle,
    logout,
    actualizarPerfil,
    elegirCampeon,
    errorCampeon,
    alternarEquipoFavorito,
    alternarPartidoFavorito,
    cargarPerfil,
  }
}