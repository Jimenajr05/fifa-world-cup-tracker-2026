// Composable para manejar un diálogo de confirmación global en la aplicación
// Estado del diálogo de confirmación global
interface ConfirmState {
  visible: boolean
  message: string
  resolve: ((valor: boolean) => void) | null
}

// Composable para mostrar un diálogo de confirmación y esperar la respuesta del usuario
export const useConfirm = () => {
  // Estado global compartido del diálogo
  const estado = useState<ConfirmState>('confirmDialog', () => ({
    visible: false,
    message: '',
    resolve: null,
  }))

  // Muestra el diálogo con el mensaje dado y devuelve una promesa con la respuesta
  const confirmar = (message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      estado.value = { visible: true, message, resolve }
    })
  }

  // Resuelve la promesa pendiente con la respuesta y oculta el diálogo
  const responder = (valor: boolean) => {
    estado.value.resolve?.(valor)
    estado.value = { visible: false, message: '', resolve: null }
  }

  // API pública del composable
  return { estado, confirmar, responder }
}