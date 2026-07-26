<script setup lang="ts">
import type { NewTeam } from '~/composables/useTeams'
import { CONFEDERACIONES, GRUPOS, nombresSelecciones, buscarSeleccionPorNombre, urlBanderaPorCodigo, ENTRENADORES_POR_SELECCION, OTRO_ENTRENADOR } from '~/utils/worldCupData'
import { mensajeError } from '~/utils/validation'

const { teams, loading, error, fetchTeams, createTeam, deleteTeam } = useTeams()
const { user } = useAuth()
const { confirmar } = useConfirm()
const { subiendo, errorSubida, subirArchivo } = useFirebaseStorage()

const busqueda = ref('')
const grupoFiltro = ref('')
const confederacionFiltro = ref('')
const mostrarFormulario = ref(false)
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

const cargar = () => fetchTeams()

onMounted(cargar)

const grupos = computed(() => {
  const set = new Set(teams.value.map((t) => t.group).filter(Boolean))
  return Array.from(set).sort()
})

const confederaciones = computed(() => {
  const set = new Set(teams.value.map((t) => t.confederation).filter(Boolean))
  return Array.from(set).sort()
})

const equiposFiltrados = computed(() => {
  const texto = busqueda.value.trim().toLowerCase()
  return teams.value.filter((t) => {
    const coincideTexto = !texto || t.name.toLowerCase().includes(texto)
    const coincideGrupo = !grupoFiltro.value || t.group === grupoFiltro.value
    const coincideConfederacion = !confederacionFiltro.value || t.confederation === confederacionFiltro.value
    return coincideTexto && coincideGrupo && coincideConfederacion
  })
})

// Al elegir el nombre en el combo box, autocompleta bandera y confederación
watch(() => nuevoEquipo.name, (nombre) => {
  const seleccion = buscarSeleccionPorNombre(nombre)
  if (seleccion) {
    nuevoEquipo.flag = urlBanderaPorCodigo(seleccion.code)
    nuevoEquipo.confederation = seleccion.confederation
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
    mostrarFormulario.value = false
    await cargar()
  } catch (err) {
    console.error('Error al crear selección:', err)
    errorFormulario.value = mensajeError(err, 'No se pudo guardar la selección.')
  } finally {
    creando.value = false
  }
}

// Permite reemplazar la bandera autocompletada por una imagen propia,
// subida a Firebase Storage (recurso multimedia del equipo)
const subirBanderaPersonalizada = async (evento: Event) => {
  const archivo = (evento.target as HTMLInputElement).files?.[0]
  if (!archivo) return
  try {
    const ruta = `flags/${Date.now()}-${archivo.name}`
    nuevoEquipo.flag = await subirArchivo(ruta, archivo)
  } catch {
    // errorSubida ya queda seteado dentro de useStorage
  }
}

const errorEliminar = ref('')

const eliminarEquipo = async (id: string) => {
  const confirmado = await confirmar('¿Eliminar esta selección? Esta acción no se puede deshacer.')
  if (!confirmado) return
  errorEliminar.value = ''
  try {
    await deleteTeam(id)
    await cargar()
  } catch (err) {
    console.error('Error al eliminar selección:', err)
    errorEliminar.value = mensajeError(err, 'No se pudo eliminar la selección.')
  }
}
</script>

<template>
  <div class="teams-page animate-fade-in">
    <header class="teams-header animate-slide-up">
      <div>
        <h1 class="teams-title">
          <span class="text-gold-gradient">Selecciones</span> participantes
        </h1>
        <p class="teams-subtitle">Explora los equipos del Mundial 2026</p>
      </div>
      <button v-if="user" class="btn-add" @click="mostrarFormulario = !mostrarFormulario">
        {{ mostrarFormulario ? 'Cancelar' : '+ Agregar selección' }}
      </button>
    </header>

    <!-- Formulario de creación -->
    <Transition name="fade">
      <form v-if="mostrarFormulario" class="team-form glass animate-slide-up" @submit.prevent="agregarEquipo">
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
            <label class="upload-btn">
              {{ subiendo ? 'Subiendo...' : '📷 Subir imagen propia' }}
              <input type="file" accept="image/*" hidden :disabled="subiendo" @change="subirBanderaPersonalizada" />
            </label>
            <p v-if="errorSubida" class="form-error">{{ errorSubida }}</p>
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
    </Transition>

    <!-- Búsqueda y filtros -->
    <div class="teams-filters animate-slide-up delay-1">
      <input
        v-model="busqueda"
        type="text"
        class="field__input filters__search"
        placeholder="Buscar selección..."
      />
      <select v-model="grupoFiltro" class="field__input">
        <option value="">Todos los grupos</option>
        <option v-for="g in grupos" :key="g" :value="g">Grupo {{ g }}</option>
      </select>
      <select v-model="confederacionFiltro" class="field__input">
        <option value="">Todas las confederaciones</option>
        <option v-for="c in confederaciones" :key="c" :value="c">{{ c }}</option>
      </select>
      <button class="btn-refetch" @click="cargar" :disabled="loading">
        Actualizar
      </button>
    </div>

    <!-- Estado: cargando -->
    <div v-if="loading" class="state-box">
      <div class="spinner" />
      <p class="state-text">Cargando selecciones...</p>
    </div>

    <!-- Estado: error -->
    <div v-else-if="error" class="state-box">
      <p class="state-text">{{ error }}</p>
      <button class="btn-refetch" @click="cargar">Reintentar</button>
    </div>

    <!-- Estado: vacío -->
    <div v-else-if="equiposFiltrados.length === 0" class="state-box">
      <p class="state-text">No se encontraron selecciones con esos filtros.</p>
    </div>

    <p v-if="errorEliminar" class="form-error">{{ errorEliminar }}</p>

    <!-- Listado -->
    <div v-else class="teams-grid">
      <div
        v-for="team in equiposFiltrados"
        :key="team.id"
        class="team-card glass animate-slide-up"
      >
        <NuxtLink :to="`/teams/${team.id}`" class="team-card__link">
          <img v-if="team.flag" :src="team.flag" :alt="team.name" class="team-card__flag" />
          <span v-else class="team-card__flag team-card__flag--fallback">🏳️</span>
          <div class="team-card__info">
            <h3 class="team-card__name">{{ team.name }}</h3>
            <p class="team-card__meta">Grupo {{ team.group }} · #{{ team.fifaRanking }} FIFA</p>
            <p class="team-card__coach">{{ team.coach }}</p>
          </div>
        </NuxtLink>
        <button v-if="user" class="team-card__delete" @click="eliminarEquipo(team.id)" title="Eliminar">
          ✕
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.teams-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
}

.teams-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  flex-wrap: wrap;
}

.teams-title {
  font-size: clamp(1.6rem, 3vw, 2.2rem);
  font-weight: 800;
  letter-spacing: -0.02em;
}

.teams-subtitle {
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

/* Filters */
.teams-filters {
  display: flex;
  gap: var(--space-md);
  flex-wrap: wrap;
}

.filters__search {
  flex: 1;
  min-width: 200px;
}

.teams-filters select.field__input {
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

/* Grid */
.teams-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: var(--space-lg);
}

.team-card {
  position: relative;
  border-radius: var(--radius-lg);
  transition: transform var(--transition-base), box-shadow var(--transition-base);
}

.team-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-md);
}

.team-card__link {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-lg);
}

.team-card__flag {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.team-card__flag--fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
  background: var(--bg-surface);
}

.team-card__name {
  font-size: 1.05rem;
  font-weight: 700;
  margin-bottom: 2px;
}

.team-card__meta {
  font-size: 0.8rem;
  color: var(--text-gold);
  margin-bottom: 2px;
}

.team-card__coach {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.team-card__delete {
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

.team-card__delete:hover {
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
