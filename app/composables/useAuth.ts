import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, type User } from 'firebase/auth'

export const useAuth = () => {
  const { $firebaseAuth } = useNuxtApp()
  const user = useState<User | null>('user', () => null)

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider()
    try {
      const result = await signInWithPopup($firebaseAuth, provider)
      user.value = result.user
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