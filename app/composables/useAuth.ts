import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User
} from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp, arrayUnion, arrayRemove } from 'firebase/firestore'

// Estructura del perfil guardado en Firestore (colección "users")
export interface PerfilUsuario {
  uid: string
  nombre: string
  email: string
  foto: string
  seleccionFavorita: string | null
  campeonElegido: string | null // predicción de campeón del torneo; una vez fijada no se puede cambiar
  puntos: number // puntos acumulados por predicciones acertadas
  equiposFavoritos: string[] // ids de equipos guardados como favoritos
  partidosFavoritos: string[] // ids de partidos guardados como favoritos
  bonoCampeonOtorgado?: boolean // evita otorgar el bono de campeón más de una vez
  ultimoLogin?: unknown
  creadoEn?: unknown
}

export const useAuth = () => {
  const { $firebaseAuth } = useNuxtApp()
  const { db: $firestore } = useFirestore()
  const user = useState<User | null>('user', () => null)
  const perfil = useState<PerfilUsuario | null>('perfil', () => null)
  const cargandoPerfil = useState<boolean>('cargandoPerfil', () => false)

  const guardarUsuarioEnFirestore = async (usuario: User) => {
    const userRef = doc($firestore, 'users', usuario.uid)
    const existente = await getDoc(userRef)

    // Migración: si el usuario ya existía pero le faltan campos agregados
    // después (equiposFavoritos, partidosFavoritos, campeonElegido, puntos),
    // se los completamos sin tocar lo que ya tenía.
    const datosExistentes = existente.exists() ? existente.data() : null
    const camposFaltantes: Record<string, unknown> = {}
    if (datosExistentes) {
      if (datosExistentes.equiposFavoritos === undefined) camposFaltantes.equiposFavoritos = []
      if (datosExistentes.partidosFavoritos === undefined) camposFaltantes.partidosFavoritos = []
      if (datosExistentes.campeonElegido === undefined) camposFaltantes.campeonElegido = null
      if (datosExistentes.puntos === undefined) camposFaltantes.puntos = 0
    }

    await setDoc(userRef, {
      uid: usuario.uid,
      nombre: usuario.displayName,
      email: usuario.email,
      foto: usuario.photoURL,
      // Si el documento no existía, inicializa campos por defecto y guarda fecha de creación
      ...(existente.exists() ? {} : { seleccionFavorita: null, campeonElegido: null, puntos: 0, equiposFavoritos: [], partidosFavoritos: [], creadoEn: serverTimestamp() }),
      ...camposFaltantes,
      ultimoLogin: serverTimestamp(),
    }, { merge: true }) // merge: true evita borrar otros campos que ya existan
  }

  // Trae el perfil desde Firestore y lo guarda en el estado reactivo "perfil".
  // Normaliza los arrays de favoritos por si el documento aún no los tuviera
  // (por ejemplo, justo antes de que la migración de arriba termine de guardar).
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

  // Fija la predicción de campeón del torneo. Solo se puede elegir una vez:
  // si el usuario ya tiene un campeonElegido, la función no hace nada.
  const errorCampeon = ref('')
  const elegirCampeon = async (equipo: string) => {
    errorCampeon.value = ''
    if (!user.value) return
    if (perfil.value?.campeonElegido) {
      errorCampeon.value = 'Ya elegiste tu campeón, no se puede cambiar.'
      return
    }
    const userRef = doc($firestore, 'users', user.value.uid)
    await setDoc(userRef, { campeonElegido: equipo }, { merge: true })
    if (perfil.value) {
      perfil.value = { ...perfil.value, campeonElegido: equipo }
    }
  }

  // Agrega o quita un equipo/partido de favoritos (toggle). Usa arrayUnion/arrayRemove
  // para no tener que leer y reescribir el array completo cada vez.
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

  const alternarEquipoFavorito = (teamId: string) => alternarFavorito('equiposFavoritos', teamId)
  const alternarPartidoFavorito = (matchId: string) => alternarFavorito('partidosFavoritos', matchId)

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
    elegirCampeon,
    errorCampeon,
    alternarEquipoFavorito,
    alternarPartidoFavorito,
    cargarPerfil,
  }
}