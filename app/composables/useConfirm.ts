// Estado compartido para mostrar un modal de confirmación en vez del confirm() nativo del navegador
interface ConfirmState {
  visible: boolean
  message: string
  resolve: ((valor: boolean) => void) | null
}

export const useConfirm = () => {
  const estado = useState<ConfirmState>('confirmDialog', () => ({
    visible: false,
    message: '',
    resolve: null,
  }))

  const confirmar = (message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      estado.value = { visible: true, message, resolve }
    })
  }

  const responder = (valor: boolean) => {
    estado.value.resolve?.(valor)
    estado.value = { visible: false, message: '', resolve: null }
  }

  return { estado, confirmar, responder }
}
