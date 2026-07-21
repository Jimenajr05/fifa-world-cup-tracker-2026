<script setup lang="ts">
import { Timestamp } from 'firebase/firestore'
import type { NewMatch } from '~/composables/useMatches'
import { FASES, GRUPOS, ESTADOS_PARTIDO, nombresEstadios, buscarEstadioPorNombre } from '~/utils/worldCupData'

const { matches, loading, error, fetchMatches, createMatch, deleteMatch } = useMatches()
const { teams: equiposRegistrados, fetchTeams } = useTeams()
const { user } = useAuth()
const { confirmar } = useConfirm()

const nombresEquiposRegistrados = computed(() => equiposRegistrados.value.map((t) => t.name).sort())

// Busca el id del equipo por nombre, para poder relacionar el partido con su documento en "teams"
const idDeEquipo = (nombre: string) => equiposRegistrados.value.find((t) => t.name === nombre)?.id ?? null

const busqueda = ref('')
const faseFiltro = ref('')
const estadoFiltro = ref('')
const fechaFiltro = ref('')
const mostrarFormulario = ref(false)
const creando = ref(false)
const errorFormulario = ref('')

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

// Al elegir el estadio, autocompleta la ciudad
watch(() => nuevoPartido.stadium, (nombre) => {
  const estadio = buscarEstadioPorNombre(nombre)
  if (estadio) nuevoPartido.city = estadio.city
})

const cargar = () => fetchMatches()

onMounted(() => {
  cargar()
  fetchTeams()
})

const partidosFiltrados = computed(() => {
  const texto = busqueda.value.trim().toLowerCase()
  return matches.value.filter((m) => {
    const coincideTexto =
      !texto ||
      m.homeTeam.toLowerCase().includes(texto) ||
      m.awayTeam.toLowerCase().includes(texto) ||
      m.stadium.toLowerCase().includes(texto) ||
      m.city.toLowerCase().includes(texto)
    const coincideFase = !faseFiltro.value || m.stage === faseFiltro.value
    const coincideEstado = !estadoFiltro.value || m.status === estadoFiltro.value
    const coincideFecha = !fechaFiltro.value || m.kickoff.toDate().toISOString().slice(0, 10) === fechaFiltro.value
    return coincideTexto && coincideFase && coincideEstado && coincideFecha
  })
})

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
    mostrarFormulario.value = false
    await cargar()
  } catch (err) {
    console.error('Error al crear partido:', err)
    errorFormulario.value = 'No se pudo guardar el partido.'
  } finally {
    creando.value = false
  }
}

const eliminarPartido = async (id: string) => {
  const confirmado = await confirmar('¿Eliminar este partido? Esta acción no se puede deshacer.')
  if (!confirmado) return
  try {
    await deleteMatch(id)
    await cargar()
  } catch (err) {
    console.error('Error al eliminar partido:', err)
  }
}

const formatearFecha = (ts: { toDate: () => Date }) =>
  ts.toDate().toLocaleString('es', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
</script>

<template>
  <div class="matches-page animate-fade-in">
    <header class="matches-header animate-slide-up">
      <div>
        <h1 class="matches-title">
          <span class="text-gold-gradient">Partidos</span> del torneo
        </h1>
        <p class="matches-subtitle">Calendario, resultados y estado de los encuentros</p>
      </div>
      <button v-if="user" class="btn-add" @click="mostrarFormulario = !mostrarFormulario">
        {{ mostrarFormulario ? 'Cancelar' : '+ Agregar partido' }}
      </button>
    </header>

    <!-- Formulario de creación -->
    <Transition name="fade">
      <form v-if="mostrarFormulario" class="match-form glass animate-slide-up" @submit.prevent="agregarPartido">
        <div class="match-form__grid">
          <div class="field">
            <label class="field__label">Equipo local</label>
            <select v-model="nuevoPartido.homeTeam" class="field__input" required :disabled="nombresEquiposRegistrados.length === 0">
              <option value="" disabled>Selecciona un equipo</option>
              <option v-for="n in nombresEquiposRegistrados" :key="n" :value="n">{{ n }}</option>
            </select>
          </div>
          <div class="field">
            <label class="field__label">Equipo visitante</label>
            <select v-model="nuevoPartido.awayTeam" class="field__input" required :disabled="nombresEquiposRegistrados.length === 0">
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
            <input v-model="nuevoPartido.city" type="text" class="field__input" placeholder="Se completa automáticamente" readonly />
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
    </Transition>

    <!-- Búsqueda y filtros -->
    <div class="matches-filters animate-slide-up delay-1">
      <input
        v-model="busqueda"
        type="text"
        class="field__input filters__search"
        placeholder="Buscar por selección, estadio o ciudad..."
      />
      <select v-model="faseFiltro" class="field__input">
        <option value="">Todas las fases</option>
        <option v-for="f in FASES" :key="f" :value="f">{{ f }}</option>
      </select>
      <select v-model="estadoFiltro" class="field__input">
        <option value="">Todos los estados</option>
        <option v-for="e in ESTADOS_PARTIDO" :key="e" :value="e">{{ e }}</option>
      </select>
      <input v-model="fechaFiltro" type="date" class="field__input" />
      <button class="btn-refetch" @click="cargar" :disabled="loading">
        Actualizar
      </button>
    </div>

    <!-- Estado: cargando -->
    <div v-if="loading" class="state-box">
      <div class="spinner" />
      <p class="state-text">Cargando partidos...</p>
    </div>

    <!-- Estado: error -->
    <div v-else-if="error" class="state-box">
      <p class="state-text">{{ error }}</p>
      <button class="btn-refetch" @click="cargar">Reintentar</button>
    </div>

    <!-- Estado: vacío -->
    <div v-else-if="partidosFiltrados.length === 0" class="state-box">
      <p class="state-text">No se encontraron partidos con esos filtros.</p>
    </div>

    <!-- Listado -->
    <div v-else class="matches-list">
      <div v-for="match in partidosFiltrados" :key="match.id" class="match-card glass animate-slide-up">
        <NuxtLink :to="`/matches/${match.id}`" class="match-card__link">
          <div class="match-card__teams">
            <span class="match-card__team">{{ match.homeTeam }}</span>
            <span class="match-card__score">
              {{ match.homeScore ?? '-' }} : {{ match.awayScore ?? '-' }}
            </span>
            <span class="match-card__team">{{ match.awayTeam }}</span>
          </div>
          <div class="match-card__meta">
            <span class="badge" :class="`badge--${match.status.replace(' ', '').toLowerCase()}`">{{ match.status }}</span>
            <span>{{ match.stage }}<template v-if="match.group"> · Grupo {{ match.group }}</template></span>
            <span>{{ match.stadium }}, {{ match.city }}</span>
            <span>{{ formatearFecha(match.kickoff) }}</span>
          </div>
        </NuxtLink>
        <button v-if="user" class="match-card__delete" title="Eliminar" @click="eliminarPartido(match.id)">✕</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.matches-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
}

.matches-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  flex-wrap: wrap;
}

.matches-title {
  font-size: clamp(1.6rem, 3vw, 2.2rem);
  font-weight: 800;
  letter-spacing: -0.02em;
}

.matches-subtitle {
  color: var(--text-secondary);
  font-size: 0.92rem;
  margin-top: 4px;
}

.btn-add {
  padding: 10px 20px;
  border-radius: var(--radius-md);
  background: var(--gold-gradient);
  color: #0a0e1a;
  font-weight: 700;
  font-size: 0.88rem;
  transition: transform var(--transition-fast);
}

.btn-add:hover {
  transform: translateY(-2px);
}

/* Form */
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

/* Filters */
.matches-filters {
  display: flex;
  gap: var(--space-md);
  flex-wrap: wrap;
}

.filters__search {
  flex: 1;
  min-width: 200px;
}

.matches-filters select.field__input,
.matches-filters input[type='date'] {
  width: auto;
  flex: 0 0 auto;
}

.btn-refetch {
  padding: 10px 18px;
  border-radius: var(--radius-md);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-weight: 600;
  transition: all var(--transition-fast);
}

.btn-refetch:hover:not(:disabled) {
  color: var(--text-primary);
  border-color: var(--border-glass);
}

/* States */
.state-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-2xl) 0;
  text-align: center;
}

.state-text {
  color: var(--text-secondary);
  font-size: 0.95rem;
}

.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid var(--border-glass);
  border-top-color: var(--gold-start);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* Matches list */
.matches-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.match-card {
  position: relative;
  border-radius: var(--radius-lg);
  transition: transform var(--transition-base), box-shadow var(--transition-base);
}

.match-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.match-card__link {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding: var(--space-lg);
}

.match-card__teams {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-lg);
  font-size: 1.05rem;
  font-weight: 700;
}

.match-card__score {
  padding: 4px 14px;
  border-radius: var(--radius-sm);
  background: var(--bg-surface);
  color: var(--text-gold);
  font-size: 1rem;
}

.match-card__meta {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--space-md);
  font-size: 0.78rem;
  color: var(--text-muted);
}

.badge {
  padding: 2px 10px;
  border-radius: 999px;
  font-weight: 600;
  font-size: 0.72rem;
}

.badge--programado {
  background: rgba(139, 149, 165, 0.15);
  color: var(--text-secondary);
}

.badge--envivo {
  background: rgba(255, 107, 107, 0.15);
  color: #ff6b6b;
}

.badge--finalizado {
  background: rgba(0, 184, 148, 0.15);
  color: var(--green-primary);
}

.match-card__delete {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  background: var(--bg-surface);
  font-size: 0.75rem;
  transition: all var(--transition-fast);
}

.match-card__delete:hover {
  color: #ff6b6b;
  background: rgba(255, 107, 107, 0.1);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>