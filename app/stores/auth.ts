import { defineStore } from 'pinia'
import type { User } from 'firebase/auth'
import type { PerfilUsuario } from '~/composables/useAuth'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const perfil = ref<PerfilUsuario | null>(null)
  const cargandoPerfil = ref(false)
  const errorCampeon = ref('')

  return {
    user,
    perfil,
    cargandoPerfil,
    errorCampeon,
  }
})
