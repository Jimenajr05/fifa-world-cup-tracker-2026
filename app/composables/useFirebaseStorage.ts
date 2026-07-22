import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'

// Composable para subir recursos multimedia (ej. banderas personalizadas)
// a Firebase Storage y obtener su URL pública de descarga.
export const useFirebaseStorage = () => {
  const { $firebaseStorage } = useNuxtApp()
  const subiendo = useState<boolean>('storageSubiendo', () => false)
  const errorSubida = useState<string | null>('storageError', () => null)

  const subirArchivo = async (ruta: string, archivo: File): Promise<string> => {
    subiendo.value = true
    errorSubida.value = null
    try {
      const referencia = storageRef($firebaseStorage, ruta)
      await uploadBytes(referencia, archivo)
      return await getDownloadURL(referencia)
    } catch (err) {
      console.error('Error al subir archivo:', err)
      errorSubida.value = 'No se pudo subir la imagen. Intenta de nuevo.'
      throw err
    } finally {
      subiendo.value = false
    }
  }

  return { subiendo, errorSubida, subirArchivo }
}
