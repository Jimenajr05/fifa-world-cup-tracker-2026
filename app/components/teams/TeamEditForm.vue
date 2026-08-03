<script setup lang="ts">
import type { Team } from '~/composables/useTeams'
import { CONFEDERACIONES, GRUPOS, nombresSelecciones, buscarSeleccionPorNombre, urlBanderaPorCodigo, ENTRENADORES_POR_SELECCION, OTRO_ENTRENADOR } from '~/utils/worldCupData'
import { mensajeError } from '~/utils/validation'

const props = defineProps<{
  team: Team
}>()

const emit = defineEmits<{
  (e: 'saved'): void
  (e: 'cancel'): void
}>()

const { updateTeam } = useTeams()

const guardando = ref(false)
const errorEdicion = ref('')

const formulario = reactive({
  name: props.team.name,
  group: props.team.group,
  flag: props.team.flag,
  coach: props.team.coach,
  confederation: props.team.confederation,
  fifaRanking: props.team.fifaRanking,
})

// Combo box de entrenador: muestra el entrenador REAL 2026 de la selección
// elegida (si está clasificada y confirmado), más "Otro" para escribirlo a mano
const cargado = ref(false)
const entrenadorSeleccionado = ref('')
const escribirEntrenadorPropio = computed(() => entrenadorSeleccionado.value === OTRO_ENTRENADOR)
const entrenadoresDisponibles = computed(() => {
  const real = ENTRENADORES_POR_SELECCION[formulario.name]
  return real ? [real, OTRO_ENTRENADOR] : [OTRO_ENTRENADOR]
})
watch(entrenadorSeleccionado, (valor) => {
  if (valor) formulario.coach = valor === OTRO_ENTRENADOR ? '' : valor
})
// Si el usuario cambia la selección (no la carga inicial), resetea el entrenador
watch(() => formulario.name, () => {
  if (cargado.value) {
    entrenadorSeleccionado.value = ''
    formulario.coach = ''
  }
})

entrenadorSeleccionado.value = entrenadoresDisponibles.value.includes(props.team.coach)
  ? props.team.coach
  : OTRO_ENTRENADOR
cargado.value = true

// Al elegir el nombre en el combo box, autocompleta bandera y confederación
watch(() => formulario.name, (nombre) => {
  const seleccion = buscarSeleccionPorNombre(nombre)
  if (seleccion) {
    formulario.flag = urlBanderaPorCodigo(seleccion.code)
    formulario.confederation = seleccion.confederation
  }
})

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
      <input v-model="formulario.flag" type="text" class="field__input" placeholder="Se completa automáticamente" readonly />
    </div>
    <div class="field">
      <label class="field__label">Entrenador</label>
      <select v-model="entrenadorSeleccionado" class="field__input">
        <option value="" disabled>Selecciona un entrenador</option>
        <option v-for="e in entrenadoresDisponibles" :key="e" :value="e">{{ e }}</option>
      </select>
      <input
        v-if="escribirEntrenadorPropio"
        v-model="formulario.coach"
        type="text"
        class="field__input"
        placeholder="Escribe el nombre del entrenador"
      />
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
