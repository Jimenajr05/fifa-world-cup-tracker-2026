// Página de listado de equipos, con filtros, paginación y acciones de administración (crear, eliminar, cargar selecciones oficiales)
<script setup lang="ts">
// Catálogos y utilidades para cargar las selecciones oficiales en lote
import { CONFEDERACIONES, GRUPO_POR_SELECCION, FIFA_RANKING_POR_SELECCION, SELECCIONES_REFERENCIA, urlBanderaPorCodigo, ENTRENADORES_POR_SELECCION } from '~/utils/worldCupData'
// Extrae un mensaje de error amigable
import { mensajeError } from '~/utils/validation'

// Equipos, estado de carga y acciones CRUD
const { teams, loading, error, fetchTeams, createTeam, deleteTeam } = useTeams()
// Usuario autenticado (controla si se muestran acciones de administración)
const { user } = useAuth()
// Diálogo de confirmación para eliminar
const { confirmar } = useConfirm()

// Texto de búsqueda libre (por nombre de selección)
const busqueda = ref('')
// Filtro de grupo seleccionado
const grupoFiltro = ref('')
// Filtro de confederación seleccionada
const confederacionFiltro = ref('')
// Controla la visibilidad del formulario de creación
const mostrarFormulario = ref(false)

// Carga (o recarga) los equipos
const cargar = () => fetchTeams()

onMounted(cargar)

// Grupos distintos presentes en los equipos cargados, para el filtro de grupo
const grupos = computed(() => {
  const set = new Set(teams.value.map((t) => t.group).filter(Boolean))
  return Array.from(set).sort()
})

// Confederaciones distintas presentes en los equipos cargados, para el filtro de confederación
const confederaciones = computed(() => {
  const set = new Set(teams.value.map((t) => t.confederation).filter(Boolean))
  return Array.from(set).sort()
})

// Equipos que cumplen con todos los filtros activos
const equiposFiltrados = computed(() => {
  const texto = busqueda.value.trim().toLowerCase()
  return teams.value.filter((t) => {
    const coincideTexto = !texto || t.name.toLowerCase().includes(texto)
    const coincideGrupo = !grupoFiltro.value || t.group === grupoFiltro.value
    const coincideConfederacion = !confederacionFiltro.value || t.confederation === confederacionFiltro.value
    return coincideTexto && coincideGrupo && coincideConfederacion
  })
})

// Cantidad de equipos mostrados por página
const EQUIPOS_POR_PAGINA = 12
// Página actual de la lista de equipos
const paginaActual = ref(1)

// Vuelve a la primera página cuando cambia cualquier filtro
watch([busqueda, grupoFiltro, confederacionFiltro], () => {
  paginaActual.value = 1
})

// Total de páginas según la cantidad de equipos filtrados
const totalPaginas = computed(() =>
  Math.max(1, Math.ceil(equiposFiltrados.value.length / EQUIPOS_POR_PAGINA)),
)

// Ajusta la página actual si queda fuera de rango tras filtrar
watch(totalPaginas, (total) => {
  if (paginaActual.value > total) paginaActual.value = total
})

// Equipos de la página actual
const equiposPaginados = computed(() => {
  const inicio = (paginaActual.value - 1) * EQUIPOS_POR_PAGINA
  return equiposFiltrados.value.slice(inicio, inicio + EQUIPOS_POR_PAGINA)
})

// Oculta el formulario y recarga la lista tras crear un equipo
const equipoCreado = async () => {
  mostrarFormulario.value = false
  await cargar()
}

// Indica si se está cargando el lote de selecciones oficiales
const cargandoLote = ref(false)
// Mensaje con el resultado de la carga en lote
const resultadoLote = ref('')

// Crea las 48 selecciones oficiales del Mundial que aún no existan, con sus datos precargados
const cargarSeleccionesOficiales = async () => {
  cargandoLote.value = true
  resultadoLote.value = ''
  let creadas = 0
  let omitidas = 0
  let fallidas = 0
  try {
    for (const seleccion of SELECCIONES_REFERENCIA) {
      const yaExiste = teams.value.some((t) => t.name === seleccion.name)
      if (yaExiste) {
        omitidas++
        continue
      }
      const grupo = GRUPO_POR_SELECCION[seleccion.name]
      if (!grupo) {
        omitidas++
        continue
      }
      try {
        await createTeam({
          name: seleccion.name,
          group: grupo,
          flag: urlBanderaPorCodigo(seleccion.code),
          coach: ENTRENADORES_POR_SELECCION[seleccion.name] ?? '',
          confederation: seleccion.confederation,
          fifaRanking: FIFA_RANKING_POR_SELECCION[seleccion.name] ?? 100,
        })
        creadas++
      } catch (err) {
        console.error(`No se pudo crear ${seleccion.name}:`, err)
        fallidas++
      }
    }
    await cargar()
    resultadoLote.value = `Listo: ${creadas} creadas, ${omitidas} ya existían${fallidas ? `, ${fallidas} fallaron` : ''}.`
  } finally {
    cargandoLote.value = false
  }
}

// Mensaje de error al eliminar un equipo
const errorEliminar = ref('')

// Confirma y elimina un equipo
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
      <div v-if="user" class="teams-header__actions">
        <button class="btn-refetch" :disabled="cargandoLote" @click="cargarSeleccionesOficiales">
          {{ cargandoLote ? 'Cargando...' : 'Cargar las 48 selecciones oficiales' }}
        </button>
        <button class="btn-add" @click="mostrarFormulario = !mostrarFormulario">
          {{ mostrarFormulario ? 'Cancelar' : '+ Agregar selección' }}
        </button>
      </div>
    </header>
    <p v-if="resultadoLote" class="state-text">{{ resultadoLote }}</p>

    <Transition name="fade">
      <TeamForm v-if="mostrarFormulario" @created="equipoCreado" />
    </Transition>

    <div class="teams-filters animate-slide-up delay-1">
      <input v-model="busqueda" type="text" class="field__input filters__search" placeholder="Buscar selección..." />
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

    <p v-if="!loading && !error" class="results-count">
      {{ equiposFiltrados.length }} selección{{ equiposFiltrados.length === 1 ? '' : 'es' }} en total
    </p>

    <div v-if="loading" class="state-box">
      <div class="spinner" />
      <p class="state-text">Cargando selecciones...</p>
    </div>

    <div v-else-if="error" class="state-box">
      <p class="state-text">{{ error }}</p>
      <button class="btn-refetch" @click="cargar">Reintentar</button>
    </div>

    <div v-else-if="equiposFiltrados.length === 0" class="state-box">
      <p class="state-text">No se encontraron selecciones con esos filtros.</p>
    </div>

    <p v-if="errorEliminar" class="form-error">{{ errorEliminar }}</p>

    <template v-else>
      <div class="teams-grid">
        <div v-for="team in equiposPaginados" :key="team.id" class="team-card glass animate-slide-up">
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

      <Pagination v-model:pagina-actual="paginaActual" :total-paginas="totalPaginas" />
    </template>
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

.teams-header__actions {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  flex-wrap: wrap;
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

.teams-filters {
  display: flex;
  gap: var(--space-md);
  flex-wrap: wrap;
}

.results-count {
  color: var(--text-muted);
  font-size: 0.85rem;
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