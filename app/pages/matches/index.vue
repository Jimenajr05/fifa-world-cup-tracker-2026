// Página de listado de partidos, con filtros y paginación
<script setup lang="ts">
// Timestamp de Firestore para convertir fechas del fixture
import { Timestamp } from 'firebase/firestore'
// Catálogos de fases, grupos y estados
import { FASES, GRUPOS, ESTADOS_PARTIDO } from '~/utils/worldCupData'
// Fixture oficial de la fase de grupos, para precargar partidos
import { FIXTURE_FASE_GRUPOS } from '~/utils/worldCupFixture'
// Extrae un mensaje de error amigable
import { mensajeError } from '~/utils/validation'

// Partidos, estado de carga y acciones CRUD
const { matches, loading, error, fetchMatches, createMatch, updateMatch, deleteMatch } = useMatches()
// Equipos registrados, para resolver ids de equipo por nombre
const { teams: equiposRegistrados, fetchTeams } = useTeams()
// Usuario autenticado (controla si se muestran acciones de administración)
const { user } = useAuth()
// Diálogo de confirmación para acciones destructivas
const { confirmar } = useConfirm()

// Busca el id de un equipo registrado a partir de su nombre
const idDeEquipo = (nombre: string) => equiposRegistrados.value.find((t) => t.name === nombre)?.id ?? null

// Texto de búsqueda libre (equipo, estadio o ciudad)
const busqueda = ref('')
// Filtro de fase seleccionada
const faseFiltro = ref('')
// Filtro de estado seleccionado
const estadoFiltro = ref('')
// Filtro de fecha seleccionada
const fechaFiltro = ref('')
// Filtro de ciudad seleccionada
const ciudadFiltro = ref('')
// Controla la visibilidad del formulario de creación
const mostrarFormulario = ref(false)

// Carga (o recarga) los partidos
const cargar = () => fetchMatches()

onMounted(() => {
  cargar()
  fetchTeams()
})

// Lista de ciudades distintas presentes en los partidos, para el filtro de ciudad
const ciudades = computed(() => {
  const set = new Set(matches.value.map((m) => m.city).filter(Boolean))
  return Array.from(set).sort()
})

// Partidos que cumplen con todos los filtros activos
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
    const coincideCiudad = !ciudadFiltro.value || m.city === ciudadFiltro.value
    return coincideTexto && coincideFase && coincideEstado && coincideFecha && coincideCiudad
  })
})

// Cantidad de partidos mostrados por página
const PARTIDOS_POR_PAGINA = 12
// Página actual de la lista de partidos
const paginaActual = ref(1)

// Vuelve a la primera página cuando cambia cualquier filtro
watch([busqueda, faseFiltro, estadoFiltro, fechaFiltro, ciudadFiltro], () => {
  paginaActual.value = 1
})

// Total de páginas según la cantidad de partidos filtrados
const totalPaginas = computed(() =>
  Math.max(1, Math.ceil(partidosFiltrados.value.length / PARTIDOS_POR_PAGINA)),
)

// Ajusta la página actual si queda fuera de rango tras filtrar
watch(totalPaginas, (total) => {
  if (paginaActual.value > total) paginaActual.value = total
})

// Partidos de la página actual
const partidosPaginados = computed(() => {
  const inicio = (paginaActual.value - 1) * PARTIDOS_POR_PAGINA
  return partidosFiltrados.value.slice(inicio, inicio + PARTIDOS_POR_PAGINA)
})

// Oculta el formulario y recarga la lista tras crear un partido
const partidoCreado = async () => {
  mostrarFormulario.value = false
  await cargar()
}

// Indica si se está cargando el fixture oficial
const cargandoFixture = ref(false)
// Mensaje con el resultado de la carga del fixture
const resultadoFixture = ref('')

// Carga el fixture oficial de la fase de grupos: crea partidos nuevos o actualiza los existentes
const cargarFixtureOficial = async () => {
  if (matches.value.length > 0) {
    const confirmado = await confirmar('Ya hay partidos cargados. ¿Cargar de todas formas el fixture oficial? Se actualizarán los resultados y estados de los enfrentamientos existentes.')
    if (!confirmado) return
  }
  cargandoFixture.value = true
  resultadoFixture.value = ''
  let creados = 0
  let actualizados = 0
  let fallidos = 0
  try {
    for (const partido of FIXTURE_FASE_GRUPOS) {
      const matchExistente = matches.value.find(
        (m) => m.homeTeam === partido.homeTeam && m.awayTeam === partido.awayTeam && m.stage === partido.stage,
      )
      if (matchExistente) {
        try {
          await updateMatch(matchExistente.id, {
            homeScore: partido.homeScore !== undefined ? partido.homeScore : null,
            awayScore: partido.awayScore !== undefined ? partido.awayScore : null,
            status: partido.status || 'Programado',
            bracketPosition: partido.bracketPosition !== undefined ? partido.bracketPosition : null,
          })
          actualizados++
        } catch (err) {
          console.error(`No se pudo actualizar ${partido.homeTeam} vs ${partido.awayTeam}:`, err)
          fallidos++
        }
        continue
      }
      try {
        await createMatch(
          {
            homeTeam: partido.homeTeam,
            awayTeam: partido.awayTeam,
            homeTeamId: idDeEquipo(partido.homeTeam),
            awayTeamId: idDeEquipo(partido.awayTeam),
            stage: partido.stage,
            group: partido.group,
            stadium: partido.stadium,
            city: partido.city,
            kickoff: Timestamp.fromDate(new Date(partido.kickoff)),
            homeScore: partido.homeScore !== undefined ? partido.homeScore : null,
            awayScore: partido.awayScore !== undefined ? partido.awayScore : null,
            status: partido.status || 'Programado',
            bracketPosition: partido.bracketPosition !== undefined ? partido.bracketPosition : null,
          },
          { permitirFechaPasada: true, omitirValidacionAlineacion: true },
        )
        creados++
      } catch (err) {
        console.error(`No se pudo crear ${partido.homeTeam} vs ${partido.awayTeam}:`, err)
        fallidos++
      }
    }
    await cargar()
    resultadoFixture.value = `Listo: ${creados} partidos creados, ${actualizados} actualizados${fallidos ? `, ${fallidos} fallaron` : ''}.`
  } finally {
    cargandoFixture.value = false
  }
}

// Mensaje de error al eliminar un partido
const errorEliminar = ref('')

// Confirma y elimina un partido
const eliminarPartido = async (id: string) => {
  const confirmado = await confirmar('¿Eliminar este partido? Esta acción no se puede deshacer.')
  if (!confirmado) return
  errorEliminar.value = ''
  try {
    await deleteMatch(id)
    await cargar()
  } catch (err) {
    console.error('Error al eliminar partido:', err)
    errorEliminar.value = mensajeError(err, 'No se pudo eliminar el partido.')
  }
}

// Formatea un Timestamp de Firestore como fecha y hora en español
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
      <div v-if="user" class="matches-header__actions">
        <button class="btn-refetch" :disabled="cargandoFixture" @click="cargarFixtureOficial">
          {{ cargandoFixture ? 'Cargando...' : '⚡ Cargar fixture oficial' }}
        </button>
        <button class="btn-add" @click="mostrarFormulario = !mostrarFormulario">
          {{ mostrarFormulario ? 'Cancelar' : '+ Agregar partido' }}
        </button>
      </div>
    </header>
    <p v-if="resultadoFixture" class="state-text">{{ resultadoFixture }}</p>

    <Transition name="fade">
      <MatchForm v-if="mostrarFormulario" @created="partidoCreado" />
    </Transition>

    <div class="matches-filters animate-slide-up delay-1">
      <input v-model="busqueda" type="text" class="field__input filters__search"
        placeholder="Buscar por selección, estadio o ciudad..." />
      <select v-model="faseFiltro" class="field__input">
        <option value="">Todas las fases</option>
        <option v-for="f in FASES" :key="f" :value="f">{{ f }}</option>
      </select>
      <select v-model="estadoFiltro" class="field__input">
        <option value="">Todos los estados</option>
        <option v-for="e in ESTADOS_PARTIDO" :key="e" :value="e">{{ e }}</option>
      </select>
      <input v-model="fechaFiltro" type="date" class="field__input" />
      <select v-model="ciudadFiltro" class="field__input">
        <option value="">Todas las ciudades</option>
        <option v-for="c in ciudades" :key="c" :value="c">{{ c }}</option>
      </select>
      <button class="btn-refetch" @click="cargar" :disabled="loading">
        Actualizar
      </button>
    </div>

    <p v-if="!loading && !error" class="results-count">
      {{ partidosFiltrados.length }} partido{{ partidosFiltrados.length === 1 ? '' : 's' }} en total
    </p>

    <p v-if="errorEliminar" class="form-error">{{ errorEliminar }}</p>

    <div v-if="loading" class="state-box">
      <div class="spinner" />
      <p class="state-text">Cargando partidos...</p>
    </div>

    <div v-else-if="error" class="state-box">
      <p class="state-text">{{ error }}</p>
      <button class="btn-refetch" @click="cargar">Reintentar</button>
    </div>

    <div v-else-if="partidosFiltrados.length === 0" class="state-box">
      <p class="state-text">No se encontraron partidos con esos filtros.</p>
    </div>

    <template v-else>
      <div class="matches-list">
        <div v-for="match in partidosPaginados" :key="match.id" class="match-card glass animate-slide-up">
          <NuxtLink :to="`/matches/${match.id}`" class="match-card__link">
            <div class="match-card__teams">
              <span class="match-card__team">{{ match.homeTeam }}</span>
              <span class="match-card__score">
                {{ match.homeScore ?? '-' }} : {{ match.awayScore ?? '-' }}
              </span>
              <span class="match-card__team">{{ match.awayTeam }}</span>
            </div>
            <div class="match-card__meta">
              <span class="badge" :class="`badge--${match.status.replace(' ', '').toLowerCase()}`">{{ match.status
                }}</span>
              <span>{{ match.stage }}<template v-if="match.group"> · Grupo {{ match.group }}</template></span>
              <span>{{ match.stadium }}, {{ match.city }}</span>
              <span>{{ formatearFecha(match.kickoff) }}</span>
            </div>
          </NuxtLink>
          <button v-if="user" class="match-card__delete" title="Eliminar" @click="eliminarPartido(match.id)">✕</button>
        </div>
      </div>

      <Pagination v-model:pagina-actual="paginaActual" :total-paginas="totalPaginas" />
    </template>
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

.matches-header__actions {
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

.matches-filters {
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