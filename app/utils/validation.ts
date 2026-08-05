// Error de validación de datos de formulario, distinguible de errores inesperados
export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

// Extrae un mensaje amigable de un error: el mensaje de validación si aplica, o un mensaje genérico
export const mensajeError = (err: unknown, fallback: string): string =>
  err instanceof ValidationError ? err.message : fallback

// Valida que un campo de texto no esté vacío
export const requerido = (valor: string | null | undefined, campo: string) => {
  if (!valor || !valor.trim()) throw new ValidationError(`${campo} es obligatorio.`)
}

// Valida que la longitud de un texto esté dentro de un rango
export const longitud = (valor: string, campo: string, min: number, max: number) => {
  const len = valor.trim().length
  if (len < min || len > max) {
    throw new ValidationError(`${campo} debe tener entre ${min} y ${max} caracteres.`)
  }
}

// Valida que un número sea entero y esté dentro de un rango
export const enteroEnRango = (valor: number, campo: string, min: number, max: number) => {
  if (!Number.isInteger(valor) || valor < min || valor > max) {
    throw new ValidationError(`${campo} debe ser un número entero entre ${min} y ${max}.`)
  }
}

// Valida que un valor esté dentro de una lista de opciones permitidas
export const enLista = <T extends string>(valor: string, campo: string, lista: readonly T[]) => {
  if (!lista.includes(valor as T)) {
    throw new ValidationError(`${campo} no es válido.`)
  }
}