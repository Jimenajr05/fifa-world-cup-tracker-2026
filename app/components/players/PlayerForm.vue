// Formulario para crear un nuevo jugador
<script setup lang="ts">
// Tipo de datos para crear un jugador
import type { NewPlayer } from '~/composables/usePlayers'
// Catálogos de posiciones, clubes y nombres reales por selección
import { POSICIONES_JUGADOR, CLUBES_REFERENCIA, NOMBRES_JUGADORES_POR_SELECCION, OTRO_NOMBRE_JUGADOR as OTRO_NOMBRE } from '~/utils/worldCupData'
// Extrae un mensaje de error amigable
import { mensajeError } from '~/utils/validation'

// Equipo al que pertenecerá el nuevo jugador
const props = defineProps<{
  teamId: string
  teamName: string
}>()

// Notifica al padre cuando se crea el jugador o se cancela el formulario
const emit = defineEmits<{
  (e: 'created'): void
  (e: 'cancel'): void
}>()

// Acción de creación de jugadores
const { createPlayer } = usePlayers()

// Nombres reales disponibles para la selección, más la opción de escribir uno propio
const nombresDisponibles = computed(() => {
  const reales = NOMBRES_JUGADORES_POR_SELECCION[props.teamName]
  return reales ? [...reales, OTRO_NOMBRE] : [OTRO_NOMBRE]
})

// Indica si se está guardando el jugador
const creando = ref(false)
// Mensaje de error del formulario
const errorFormulario = ref('')

// Datos del nuevo jugador (sin teamId, que se agrega al enviar)
const nuevoJugador = reactive<Omit<NewPlayer, 'teamId'>>({
  name: '',
  number: 1,
  position: '',
  club: '',
  titular: false,
})

// Nombre elegido en el select (puede ser el real o "otro")
const nombreSeleccionado = ref('')
// Indica si se debe mostrar el campo para escribir un nombre distinto al de la lista
const escribirNombrePropio = computed(() => nombreSeleccionado.value === OTRO_NOMBRE)
// Sincroniza el nombre del jugador con el elegido en el select
watch(nombreSeleccionado, (valor) => {
  nuevoJugador.name = valor === OTRO_NOMBRE ? '' : valor
})

// Restablece el formulario a sus valores iniciales
const resetFormulario = () => {
  nuevoJugador.name = ''
  nuevoJugador.number = 1
  nuevoJugador.position = ''
  nuevoJugador.club = ''
  nuevoJugador.titular = false
  nombreSeleccionado.value = ''
  errorFormulario.value = ''
}

// Valida campos obligatorios y crea el jugador, notificando al padre si tiene éxito
const agregarJugador = async () => {
  if (!nuevoJugador.name || !nuevoJugador.position || !nuevoJugador.club) {
    errorFormulario.value = 'Nombre, posición y club son obligatorios.'
    return
  }
  creando.value = true
  errorFormulario.value = ''
  try {
    await createPlayer({ ...nuevoJugador, number: Number(nuevoJugador.number), teamId: props.teamId })
    resetFormulario()
    emit('created')
  } catch (err) {
    console.error('Error al agregar jugador:', err)
    errorFormulario.value = mensajeError(err, 'No se pudo guardar el jugador.')
  } finally {
    creando.value = false
  }
}
</script>

<template>
  <form class="player-form glass animate-slide-up" @submit.prevent="agregarJugador">
    <h2 class="player-form__title">Crear jugador</h2>
    <div class="player-form__grid">
      <div class="field">
        <label class="field__label">Selección</label>
        <input class="field__input field__input--static" type="text" :value="teamName ?? '...'" disabled />
      </div>
      <div class="field">
        <label class="field__label">Nombre</label>
        <select v-model="nombreSeleccionado" class="field__input" required>
          <option value="" disabled>Selecciona un nombre</option>
          <option v-for="n in nombresDisponibles" :key="n" :value="n">{{ n }}</option>
        </select>
        <input v-if="escribirNombrePropio" v-model="nuevoJugador.name" type="text" class="field__input"
          placeholder="Escribe el nombre del jugador" required />
      </div>
      <div class="field">
        <label class="field__label">Número</label>
        <input v-model.number="nuevoJugador.number" type="number" min="1" max="26" class="field__input" />
      </div>
      <div class="field">
        <label class="field__label">Posición</label>
        <select v-model="nuevoJugador.position" class="field__input" required>
          <option value="" disabled>Selecciona una posición</option>
          <option v-for="p in POSICIONES_JUGADOR" :key="p" :value="p">{{ p }}</option>
        </select>
      </div>
      <div class="field">
        <label class="field__label">Club</label>
        <select v-model="nuevoJugador.club" class="field__input">
          <option value="" disabled>Selecciona un club</option>
          <option v-for="club in CLUBES_REFERENCIA" :key="club" :value="club">{{ club }}</option>
        </select>
      </div>
    </div>
    <label class="field__checkbox">
      <input v-model="nuevoJugador.titular" type="checkbox" />
      <span>Titular</span>
    </label>
    <p v-if="errorFormulario" class="form-error">{{ errorFormulario }}</p>
    <div class="player-form__actions">
      <button type="button" class="btn-cancel" @click="emit('cancel')">Cancelar</button>
      <button type="submit" class="btn-edit" :disabled="creando">
        {{ creando ? 'Guardando...' : 'Crear jugador' }}
      </button>
    </div>
  </form>
</template>

<style scoped>
.player-form {
  padding: var(--space-xl);
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.player-form__title {
  font-size: 1.1rem;
  font-weight: 800;
  letter-spacing: -0.01em;
}

.player-form__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: var(--space-md);
}

.player-form__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-sm);
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.field__label {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.field__input {
  width: 100%;
  min-width: 0;
  padding: 10px 14px;
  border: 1px solid var(--border-glass);
  border-radius: var(--radius-md);
  font-size: 0.9rem;
  color: var(--text-primary);
  background: var(--bg-surface);
}

.field__input:focus {
  outline: none;
  border-color: var(--gold-start);
  box-shadow: 0 0 0 3px rgba(255, 214, 10, 0.1);
}

.field__input--static {
  opacity: 0.7;
  cursor: not-allowed;
}

.field__checkbox {
  display: flex;
  align-items: center;
  gap: 10px;
  width: fit-content;
  padding: 10px 16px;
  border-radius: var(--radius-md);
  background: var(--bg-surface);
  border: 1px solid var(--border-glass);
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text-primary);
  cursor: pointer;
}

.field__checkbox input {
  width: 18px;
  height: 18px;
  accent-color: var(--gold-start);
  cursor: pointer;
}

select.field__input {
  appearance: none;
  -webkit-appearance: none;
  text-overflow: ellipsis;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238b95a5' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 14px center;
  padding-right: 36px;
}

.form-error {
  color: #ff6b6b;
  font-size: 0.85rem;
}

.btn-edit {
  padding: 10px 22px;
  border-radius: var(--radius-md);
  background: var(--gold-gradient);
  color: #0a0e1a;
  font-weight: 700;
  font-size: 0.88rem;
}

.btn-edit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-cancel {
  padding: 10px 22px;
  border-radius: var(--radius-md);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 0.88rem;
}
</style>