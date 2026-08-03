<script setup lang="ts">
import type { NewTeam } from '~/composables/useTeams'
import { CONFEDERACIONES, GRUPOS, GRUPO_POR_SELECCION, nombresSelecciones, buscarSeleccionPorNombre, urlBanderaPorCodigo, ENTRENADORES_POR_SELECCION, OTRO_ENTRENADOR } from '~/utils/worldCupData'
import { mensajeError } from '~/utils/validation'

const emit = defineEmits<{
  (e: 'created'): void
}>()

const { createTeam } = useTeams()


const creando = ref(false)
const errorFormulario = ref('')

const nuevoEquipo = reactive<NewTeam>({
  name: '',
  group: '',
  flag: '',
  coach: '',
  confederation: '',
  fifaRanking: 1,
})

// Combo box de entrenador: muestra el entrenador REAL 2026 de la selección
// elegida (si está clasificada y confirmado), más "Otro" para escribirlo a mano
const entrenadorSeleccionado = ref('')
const escribirEntrenadorPropio = computed(() => entrenadorSeleccionado.value === OTRO_ENTRENADOR)
const entrenadoresDisponibles = computed(() => {
  const real = ENTRENADORES_POR_SELECCION[nuevoEquipo.name]
  return real ? [real, OTRO_ENTRENADOR] : [OTRO_ENTRENADOR]
})
watch(entrenadorSeleccionado, (valor) => {
  nuevoEquipo.coach = valor === OTRO_ENTRENADOR ? '' : valor
})
// Si cambia la selección elegida y el entrenador ya no corresponde, se resetea
watch(() => nuevoEquipo.name, () => {
  entrenadorSeleccionado.value = ''
  nuevoEquipo.coach = ''
})

// Al elegir el nombre en el combo box, autocompleta bandera, confederación
// y el grupo oficial del sorteo del Mundial 2026 (el usuario puede cambiarlo)
watch(() => nuevoEquipo.name, (nombre) => {
  const seleccion = buscarSeleccionPorNombre(nombre)
  if (seleccion) {
    nuevoEquipo.flag = urlBanderaPorCodigo(seleccion.code)
    nuevoEquipo.confederation = seleccion.confederation
  }
  const grupoOficial = GRUPO_POR_SELECCION[nombre]
  if (grupoOficial) {
    nuevoEquipo.group = grupoOficial
  }
})

const resetFormulario = () => {
  nuevoEquipo.name = ''
  nuevoEquipo.group = ''
  nuevoEquipo.flag = ''
  nuevoEquipo.coach = ''
  nuevoEquipo.confederation = ''
  nuevoEquipo.fifaRanking = 1
  entrenadorSeleccionado.value = ''
  errorFormulario.value = ''
}

const agregarEquipo = async () => {
  if (!nuevoEquipo.name || !nuevoEquipo.group) {
    errorFormulario.value = 'El nombre y el grupo son obligatorios.'
    return
  }
  creando.value = true
  errorFormulario.value = ''
  try {
    await createTeam({ ...nuevoEquipo, fifaRanking: Number(nuevoEquipo.fifaRanking) })
    resetFormulario()
    emit('created')
  } catch (err) {
    console.error('Error al crear selección:', err)
    errorFormulario.value = mensajeError(err, 'No se pudo guardar la selección.')
  } finally {
    creando.value = false
  }
}

// Permite reemplazar la bandera autocompletada por una imagen propia,
// subida a Firebase Storage (recurso multimedia del equipo)
// Custom flag upload removed per project guidelines (Firebase Storage not allowed).
      // Users can set the flag URL manually if needed.
</script>

<template>
  <form class="team-form glass animate-slide-up" @submit.prevent="agregarEquipo">
    <div class="team-form__grid">
      <div class="field">
        <label class="field__label">Nombre</label>
        <select v-model="nuevoEquipo.name" class="field__input" required>
          <option value="" disabled>Selecciona una selección</option>
          <option v-for="nombre in nombresSelecciones" :key="nombre" :value="nombre">{{ nombre }}</option>
        </select>
      </div>
      <div class="field">
        <label class="field__label">Grupo</label>
        <select v-model="nuevoEquipo.group" class="field__input" required>
          <option value="" disabled>Selecciona un grupo</option>
          <option v-for="g in GRUPOS" :key="g" :value="g">Grupo {{ g }}</option>
        </select>
      </div>
      <div class="field">
        <label class="field__label">Bandera</label>
        <input v-model="nuevoEquipo.flag" type="text" class="field__input" placeholder="Se completa automáticamente" readonly />
      </div>
      <div class="field">
        <label class="field__label">Entrenador</label>
        <select v-model="entrenadorSeleccionado" class="field__input" :disabled="!nuevoEquipo.name">
          <option value="" disabled>{{ nuevoEquipo.name ? 'Selecciona un entrenador' : 'Primero elige la selección' }}</option>
          <option v-for="e in entrenadoresDisponibles" :key="e" :value="e">{{ e }}</option>
        </select>
        <input
          v-if="escribirEntrenadorPropio"
          v-model="nuevoEquipo.coach"
          type="text"
          class="field__input"
          placeholder="Escribe el nombre del entrenador"
        />
      </div>
      <div class="field">
        <label class="field__label">Confederación</label>
        <select v-model="nuevoEquipo.confederation" class="field__input" required>
          <option value="" disabled>Selecciona una confederación</option>
          <option v-for="c in CONFEDERACIONES" :key="c" :value="c">{{ c }}</option>
        </select>
      </div>
      <div class="field">
        <label class="field__label">Ranking FIFA</label>
        <input v-model.number="nuevoEquipo.fifaRanking" type="number" min="1" class="field__input" />
      </div>
    </div>
    <p v-if="errorFormulario" class="form-error">{{ errorFormulario }}</p>
    <button type="submit" class="save-btn" :disabled="creando">
      {{ creando ? 'Guardando...' : 'Guardar selección' }}
    </button>
  </form>
</template>

<style scoped>
.team-form {
  padding: var(--space-xl);
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.team-form__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--space-md);
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

.form-error {
  color: #ff6b6b;
  font-size: 0.85rem;
}

.upload-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: 6px;
  padding: 8px 14px;
  border-radius: var(--radius-sm);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  color: var(--text-secondary);
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.upload-btn:hover {
  color: var(--text-primary);
  border-color: var(--border-glass);
}

.save-btn {
  align-self: flex-start;
  padding: 12px 24px;
  border-radius: var(--radius-md);
  background: var(--gold-gradient);
  color: #0a0e1a;
  font-weight: 700;
  font-size: 0.9rem;
}

.save-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
