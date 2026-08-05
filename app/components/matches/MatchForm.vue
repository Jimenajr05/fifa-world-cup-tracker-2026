// Formulario para crear un partido nuevo
<script setup lang="ts">
// Timestamp de Firestore para convertir la fecha del formulario
import { Timestamp } from 'firebase/firestore'
// Tipo de datos para crear un partido
import type { NewMatch } from '~/composables/useMatches'
// Catálogos de fases, grupos, estados y estadios
import { FASES, GRUPOS, ESTADOS_PARTIDO, nombresEstadios, buscarEstadioPorNombre } from '~/utils/worldCupData'
// Extrae un mensaje de error amigable
import { mensajeError } from '~/utils/validation'

// Notifica al padre cuando se crea el partido o se cancela el formulario
const emit = defineEmits<{
  (e: 'created'): void
  (e: 'cancel'): void
}>()

// Acción de creación de partidos
const { createMatch } = useMatches()
// Equipos registrados, usados para llenar los selects de local/visitante
const { teams: equiposRegistrados } = useTeams()

// Nombres de equipos registrados, ordenados alfabéticamente
const nombresEquiposRegistrados = computed(() => equiposRegistrados.value.map((t) => t.name).sort())

// Busca el id de un equipo registrado a partir de su nombre
const idDeEquipo = (nombre: string) => equiposRegistrados.value.find((t) => t.name === nombre)?.id ?? null

// Indica si se está guardando el partido
const creando = ref(false)
// Mensaje de error del formulario
const errorFormulario = ref('')

// Datos del nuevo partido (fecha como string para el input datetime-local)
const nuevoPartido = reactive({
  homeTeam: '',
  awayTeam: '',
  stage: '',
  group: '',
  stadium: '',
  city: '',
  fecha: '',
  status: ESTADOS_PARTIDO[0],
})

// Autocompleta la ciudad al elegir un estadio
watch(() => nuevoPartido.stadium, (nombre) => {
  const estadio = buscarEstadioPorNombre(nombre)
  if (estadio) nuevoPartido.city = estadio.city
})

// Restablece el formulario a sus valores iniciales
const resetFormulario = () => {
  nuevoPartido.homeTeam = ''
  nuevoPartido.awayTeam = ''
  nuevoPartido.stage = ''
  nuevoPartido.group = ''
  nuevoPartido.stadium = ''
  nuevoPartido.city = ''
  nuevoPartido.fecha = ''
  nuevoPartido.status = ESTADOS_PARTIDO[0]
  errorFormulario.value = ''
}

// Valida campos obligatorios y crea el partido, notificando al padre si tiene éxito
const agregarPartido = async () => {
  if (!nuevoPartido.homeTeam || !nuevoPartido.awayTeam || !nuevoPartido.stage || !nuevoPartido.stadium || !nuevoPartido.fecha) {
    errorFormulario.value = 'Completa equipos, fase, estadio y fecha.'
    return
  }
  if (nuevoPartido.homeTeam === nuevoPartido.awayTeam) {
    errorFormulario.value = 'Los dos equipos deben ser diferentes.'
    return
  }
  if (nuevoPartido.stage === 'Fase de grupos' && !nuevoPartido.group) {
    errorFormulario.value = 'Selecciona el grupo para un partido de fase de grupos.'
    return
  }

  creando.value = true
  errorFormulario.value = ''
  try {
    const data: NewMatch = {
      homeTeam: nuevoPartido.homeTeam,
      awayTeam: nuevoPartido.awayTeam,
      homeTeamId: idDeEquipo(nuevoPartido.homeTeam),
      awayTeamId: idDeEquipo(nuevoPartido.awayTeam),
      stage: nuevoPartido.stage,
      group: nuevoPartido.stage === 'Fase de grupos' ? nuevoPartido.group : null,
      stadium: nuevoPartido.stadium,
      city: nuevoPartido.city,
      kickoff: Timestamp.fromDate(new Date(nuevoPartido.fecha)),
      homeScore: null,
      awayScore: null,
      status: nuevoPartido.status,
    }
    await createMatch(data)
    resetFormulario()
    emit('created')
  } catch (err) {
    console.error('Error al crear partido:', err)
    errorFormulario.value = mensajeError(err, 'No se pudo guardar el partido.')
  } finally {
    creando.value = false
  }
}
</script>

<template>
  <form class="match-form glass animate-slide-up" @submit.prevent="agregarPartido">
    <div class="match-form__grid">
      <div class="field">
        <label class="field__label">Equipo local</label>
        <select v-model="nuevoPartido.homeTeam" class="field__input" required
          :disabled="nombresEquiposRegistrados.length === 0">
          <option value="" disabled>Selecciona un equipo</option>
          <option v-for="n in nombresEquiposRegistrados" :key="n" :value="n">{{ n }}</option>
        </select>
      </div>
      <div class="field">
        <label class="field__label">Equipo visitante</label>
        <select v-model="nuevoPartido.awayTeam" class="field__input" required
          :disabled="nombresEquiposRegistrados.length === 0">
          <option value="" disabled>Selecciona un equipo</option>
          <option v-for="n in nombresEquiposRegistrados" :key="n" :value="n">{{ n }}</option>
        </select>
      </div>
      <p v-if="nombresEquiposRegistrados.length === 0" class="form-hint">
        No hay selecciones registradas todavía. <NuxtLink to="/teams">Agrega una selección</NuxtLink> primero.
      </p>
      <div class="field">
        <label class="field__label">Fase</label>
        <select v-model="nuevoPartido.stage" class="field__input" required>
          <option value="" disabled>Selecciona una fase</option>
          <option v-for="f in FASES" :key="f" :value="f">{{ f }}</option>
        </select>
      </div>
      <div v-if="nuevoPartido.stage === 'Fase de grupos'" class="field">
        <label class="field__label">Grupo</label>
        <select v-model="nuevoPartido.group" class="field__input" required>
          <option value="" disabled>Selecciona un grupo</option>
          <option v-for="g in GRUPOS" :key="g" :value="g">Grupo {{ g }}</option>
        </select>
      </div>
      <div class="field">
        <label class="field__label">Estadio</label>
        <select v-model="nuevoPartido.stadium" class="field__input" required>
          <option value="" disabled>Selecciona un estadio</option>
          <option v-for="e in nombresEstadios" :key="e" :value="e">{{ e }}</option>
        </select>
      </div>
      <div class="field">
        <label class="field__label">Ciudad</label>
        <input v-model="nuevoPartido.city" type="text" class="field__input" placeholder="Se completa automáticamente"
          readonly />
      </div>
      <div class="field">
        <label class="field__label">Fecha y hora</label>
        <input v-model="nuevoPartido.fecha" type="datetime-local" class="field__input" required />
      </div>
      <div class="field">
        <label class="field__label">Estado</label>
        <select v-model="nuevoPartido.status" class="field__input" required>
          <option v-for="e in ESTADOS_PARTIDO" :key="e" :value="e">{{ e }}</option>
        </select>
      </div>
    </div>
    <p v-if="errorFormulario" class="form-error">{{ errorFormulario }}</p>

    <button type="submit" class="save-btn" :disabled="creando">
      {{ creando ? 'Guardando...' : 'Guardar partido' }}
    </button>
  </form>
</template>

<style scoped>
.match-form {
  padding: var(--space-xl);
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.match-form__grid {
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

.form-hint {
  grid-column: 1 / -1;
  font-size: 0.82rem;
  color: var(--text-muted);
}

.form-hint a {
  color: var(--text-gold);
  text-decoration: underline;
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