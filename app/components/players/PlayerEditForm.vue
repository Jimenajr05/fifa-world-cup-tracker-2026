// Formulario para editar los datos de un jugador
<script setup lang="ts">
// Tipos de jugador y de datos editables
import type { NewPlayer, Player } from '~/composables/usePlayers'
// Catálogos de posiciones, clubes y marcador de "nombre propio"
import { POSICIONES_JUGADOR, CLUBES_REFERENCIA, OTRO_NOMBRE_JUGADOR as OTRO_NOMBRE } from '~/utils/worldCupData'
// Extrae un mensaje de error amigable
import { mensajeError } from '~/utils/validation'

// Jugador a editar, nombres disponibles para el select y si se muestra el botón eliminar
const props = defineProps<{
  player: Player
  nombresDisponibles: string[]
  showDelete?: boolean
}>()

// Notifica al padre cuando se guarda, se cancela o se solicita eliminar
const emit = defineEmits<{
  (e: 'saved'): void
  (e: 'cancel'): void
  (e: 'delete'): void
}>()

// Acción de actualización de jugadores
const { updatePlayer } = usePlayers()

// Indica si se están guardando los cambios
const guardando = ref(false)
// Mensaje de error de la edición
const errorEdicion = ref('')

// Copia editable de los datos del jugador
const formulario = reactive<Omit<NewPlayer, 'teamId'>>({
  name: props.player.name,
  number: props.player.number,
  position: props.player.position,
  club: props.player.club,
  titular: props.player.titular,
})

// Nombre elegido en el select (el actual del jugador, u "otro" si no está en la lista)
const nombreSeleccionado = ref(props.nombresDisponibles.includes(props.player.name) ? props.player.name : OTRO_NOMBRE)
// Indica si se debe mostrar el campo para escribir un nombre distinto al de la lista
const escribirNombrePropio = computed(() => nombreSeleccionado.value === OTRO_NOMBRE)
// Sincroniza el nombre del jugador con el elegido en el select
watch(nombreSeleccionado, (valor) => {
  if (valor) formulario.name = valor === OTRO_NOMBRE ? '' : valor
})

// Valida el nombre y guarda los cambios del jugador
const guardar = async () => {
  if (!formulario.name) {
    errorEdicion.value = 'El nombre del jugador es obligatorio.'
    return
  }
  guardando.value = true
  errorEdicion.value = ''
  try {
    await updatePlayer(props.player.id, {
      ...formulario,
      number: Number(formulario.number),
    })
    emit('saved')
  } catch (err) {
    console.error('Error al editar jugador:', err)
    errorEdicion.value = mensajeError(err, 'No se pudo guardar el jugador.')
  } finally {
    guardando.value = false
  }
}
</script>

<template>
  <form class="player-edit-form" @submit.prevent="guardar">
    <div class="player-edit-form__grid">
      <select v-model="nombreSeleccionado" class="field__input" required>
        <option value="" disabled>Selecciona un nombre</option>
        <option v-for="n in nombresDisponibles" :key="n" :value="n">{{ n }}</option>
      </select>
      <input v-if="escribirNombrePropio" v-model="formulario.name" type="text" class="field__input"
        placeholder="Escribe el nombre del jugador" required />
      <input v-model.number="formulario.number" type="number" min="1" max="26" class="field__input" />
      <select v-model="formulario.position" class="field__input">
        <option v-for="p in POSICIONES_JUGADOR" :key="p" :value="p">{{ p }}</option>
      </select>
      <select v-model="formulario.club" class="field__input">
        <option value="" disabled>Selecciona un club</option>
        <option v-for="club in CLUBES_REFERENCIA" :key="club" :value="club">{{ club }}</option>
      </select>
    </div>
    <label class="field__checkbox">
      <input v-model="formulario.titular" type="checkbox" />
      <span>Titular</span>
    </label>
    <p v-if="errorEdicion" class="form-error">{{ errorEdicion }}</p>
    <div class="player-edit-form__actions">
      <button type="submit" class="btn-edit" :disabled="guardando">
        {{ guardando ? 'Guardando...' : 'Guardar' }}
      </button>
      <button v-if="showDelete" type="button" class="btn-delete-inline" @click="emit('delete')">Eliminar</button>
      <button type="button" class="btn-cancel" @click="emit('cancel')">Cancelar</button>
    </div>
  </form>
</template>

<style scoped>
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

select.field__input {
  appearance: none;
  -webkit-appearance: none;
  text-overflow: ellipsis;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238b95a5' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 14px center;
  padding-right: 36px;
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
  font-size: 0.85rem;
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

.btn-delete-inline {
  padding: 10px 22px;
  border-radius: var(--radius-md);
  background: var(--bg-surface);
  border: 1px solid rgba(255, 107, 107, 0.3);
  color: #ff6b6b;
  font-weight: 600;
  font-size: 0.88rem;
}

.btn-delete-inline:hover {
  background: rgba(255, 107, 107, 0.08);
}

.player-edit-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  width: 100%;
}

.player-edit-form__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: var(--space-sm);
}

.player-edit-form__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
}
</style>