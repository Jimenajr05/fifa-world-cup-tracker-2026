// Errores de regla de negocio: su .message está pensado para mostrarse tal
// cual al usuario final (en español, sin jerga técnica).
export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export const mensajeError = (err: unknown, fallback: string): string =>
  err instanceof ValidationError ? err.message : fallback

export const requerido = (valor: string | null | undefined, campo: string) => {
  if (!valor || !valor.trim()) throw new ValidationError(`${campo} es obligatorio.`)
}

export const longitud = (valor: string, campo: string, min: number, max: number) => {
  const len = valor.trim().length
  if (len < min || len > max) {
    throw new ValidationError(`${campo} debe tener entre ${min} y ${max} caracteres.`)
  }
}

export const enteroEnRango = (valor: number, campo: string, min: number, max: number) => {
  if (!Number.isInteger(valor) || valor < min || valor > max) {
    throw new ValidationError(`${campo} debe ser un número entero entre ${min} y ${max}.`)
  }
}

export const enLista = <T extends string>(valor: string, campo: string, lista: readonly T[]) => {
  if (!lista.includes(valor as T)) {
    throw new ValidationError(`${campo} no es válido.`)
  }
}
