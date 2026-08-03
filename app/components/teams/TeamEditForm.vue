// Componente de formulario para editar un equipo existente
<script setup lang="ts">
// Tipo de equipo existente a editar
import type { Team } from '~/composables/useTeams'
// Catálogos y utilidades para autocompletar datos de la selección elegida
import { CONFEDERACIONES, GRUPOS, nombresSelecciones, buscarSeleccionPorNombre, urlBanderaPorCodigo, ENTRENADORES_POR_SELECCION, OTRO_ENTRENADOR } from '~/utils/worldCupData'
// Extrae un mensaje de error amigable
import { mensajeError } from '~/utils/validation'

// Equipo que se está editando
const props = defineProps<{
  team: Team
}>()

// Notifica al padre cuando se guarda o se cancela la edición
const emit = defineEmits<{
  (e: 'saved'): void
  (e: 'cancel'): void
}>()

// Acción de actualización de equipos
const { updateTeam } = useTeams()

// Indica si se están guardando los cambios
const guardando = ref(false)
// Mensaje de error de la edición
const errorEdicion = ref('')

// Copia editable de los datos del equipo
const formulario = reactive({
  name: props.team.name,
  group: props.team.group,
  flag: props.team.flag,
  coach: props.team.coach,
  confederation: props.team.confederation,
  fifaRanking: props.team.fifaRanking,
})

// Evita que los watchers de reinicio se disparen durante la carga inicial
const cargado = ref(false)
// Entrenador elegido en el select (puede ser el real o "otro")
const entrenadorSeleccionado = ref('')
// Indica si se debe mostrar el campo para escribir un entrenador distinto al oficial
const escribirEntrenadorPropio = computed(() => entrenadorSeleccionado.value === OTRO_ENTRENADOR)
// Opciones de entrenador disponibles según la selección elegida
const entrenadoresDisponibles = computed(() => {
  const real = ENTRENADORES_POR_SELECCION[formulario.name]
  return real ? [real, OTRO_ENTRENADOR] : [OTRO_ENTRENADOR]
})
// Sincroniza el campo coach con el entrenador elegido en el select
watch(entrenadorSeleccionado, (valor) => {
  if (valor) formulario.coach = valor === OTRO_ENTRENADOR ? '' : valor
})

// Reinicia la selección de entrenador cuando cambia la selección de equipo (tras la carga inicial)
watch(() => formulario.name, () => {
  if (cargado.value) {
    entrenadorSeleccionado.value = ''
    formulario.coach = ''
  }
})

// Precarga el entrenador seleccionado según el valor actual del equipo
entrenadorSeleccionado.value = entrenadoresDisponibles.value.includes(props.team.coach)
  ? props.team.coach
  : OTRO_ENTRENADOR
cargado.value = true

// Autocompleta bandera y confederación al cambiar la selección de equipo
watch(() => formulario.name, (nombre) => {
  const seleccion = buscarSeleccionPorNombre(nombre)
  if (seleccion) {
    formulario.flag = urlBanderaPorCodigo(seleccion.code)
    formulario.confederation = seleccion.confederation
  }
})

// Guarda los cambios del equipo y notifica al padre si tiene éxito
const guardarCambios = async () => {
  guardando.value = true
  errorEdicion.value = ''
  try {
    await updateTeam(props.team.id, {
      ...formulario,
      fifaRanking: Number(formulario.fifaRanking),
    })
    emit('saved')
  } catch (err) {
    console.error('Error al actualizar selección:', err)
    errorEdicion.value = mensajeError(err, 'No se pudo actualizar la selección.')
  } finally {
    guardando.value = false
  }
}
</script>

<template>
  <form class="edit-form" @submit.prevent="guardarCambios">
    <div class="field">
      <label class="field__label">Nombre</label>
      <select v-model="formulario.name" class="field__input" required>
        <option value="" disabled>Selecciona una selección</option>
        <option v-for="nombre in nombresSelecciones" :key="nombre" :value="nombre">{{ nombre }}</option>
      </select>
    </div>
    <div class="field">
      <label class="field__label">Grupo</label>
      <select v-model="formulario.group" class="field__input" required>
        <option value="" disabled>Selecciona un grupo</option>
        <option v-for="g in GRUPOS" :key="g" :value="g">Grupo {{ g }}</option>
      </select>
    </div>
    <div class="field">
      <label class="field__label">Bandera</label>
      <input v-model="formulario.flag" type="text" class="field__input" placeholder="Se completa automáticamente"
        readonly />
    </div>
    <div class="field">
      <label class="field__label">Entrenador</label>
      <select v-model="entrenadorSeleccionado" class="field__input">
        <option value="" disabled>Selecciona un entrenador</option>
        <option v-for="e in entrenadoresDisponibles" :key="e" :value="e">{{ e }}</option>
      </select>
      <input v-if="escribirEntrenadorPropio" v-model="formulario.coach" type="text" class="field__input"
        placeholder="Escribe el nombre del entrenador" />
    </div>
    <div class="field">
      <label class="field__label">Confederación</label>
      <select v-model="formulario.confederation" class="field__input" required>
        <option value="" disabled>Selecciona una confederación</option>
        <option v-for="c in CONFEDERACIONES" :key="c" :value="c">{{ c }}</option>
      </select>
    </div>
    <div class="field">
      <label class="field__label">Ranking FIFA</label>
      <input v-model.number="formulario.fifaRanking" type="number" min="1" class="field__input" />
    </div>
    <p v-if="errorEdicion" class="form-error">{{ errorEdicion }}</p>
    <div class="edit-form__actions">
      <button type="submit" class="btn-edit" :disabled="guardando">
        {{ guardando ? 'Guardando...' : 'Guardar cambios' }}
      </button>
      <button type="button" class="btn-cancel" @click="emit('cancel')">Cancelar</button>
    </div>
  </form>
</template>

<style scoped>
.edit-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
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

select.field__input {
  appearance: none;
  -webkit-appearance: none;
  text-overflow: ellipsis;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238b95a5' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 14px center;
  padding-right: 36px;
}

.edit-form__actions {
  display: flex;
  gap: var(--space-md);
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