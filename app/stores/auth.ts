// Utilidad de Pinia para definir stores con la sintaxis de composición
import { defineStore } from 'pinia'
// Tipo de usuario de Firebase Auth
import type { User } from 'firebase/auth'
// Forma del perfil de usuario en Firestore
import type { PerfilUsuario } from '~/composables/useAuth'

// Store global de autenticación: usuario de Firebase, su perfil y estados relacionados
export const useAuthStore = defineStore('auth', () => {
  // Usuario autenticado en Firebase (null si no hay sesión)
  const user = ref<User | null>(null)
  // Perfil del usuario cargado desde Firestore
  const perfil = ref<PerfilUsuario | null>(null)
  // Indica si el perfil se está cargando
  const cargandoPerfil = ref(false)
  // Mensaje de error al elegir campeón
  const errorCampeon = ref('')

  // Estado expuesto por el store
  return {
    user,
    perfil,
    cargandoPerfil,
    errorCampeon,
  }
})