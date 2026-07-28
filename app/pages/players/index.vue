<script setup lang="ts">
import { POSICIONES_JUGADOR } from '~/utils/worldCupData'
import { CONVOCADOS_POR_SELECCION } from '~/utils/rosterData'

const { players, loading, error, fetchAllPlayers, createPlayer } = usePlayers()
const { teams, fetchTeams } = useTeams()
const { user } = useAuth()

const busqueda = ref('')
const posicionFiltro = ref('')
const equipoFiltro = ref('')

const cargar = () => {
  fetchAllPlayers()
  fetchTeams()
}

onMounted(cargar)

const equipoPorId = computed(() => new Map(teams.value.map((t) => [t.id, t])))

const jugadoresFiltrados = computed(() => {
  const texto = busqueda.value.trim().toLowerCase()
  return players.value.filter((p) => {
    const equipo = equipoPorId.value.get(p.teamId)
    const coincideTexto =
      !texto ||
      p.name.toLowerCase().includes(texto) ||
      p.club.toLowerCase().includes(texto) ||
      (equipo?.name.toLowerCase().includes(texto) ?? false)
    const coincidePosicion = !posicionFiltro.value || p.position === posicionFiltro.value
    const coincideEquipo = !equipoFiltro.value || p.teamId === equipoFiltro.value
    return coincideTexto && coincidePosicion && coincideEquipo
  })
})

// Paginación del listado de jugadores
const JUGADORES_POR_PAGINA = 16
const paginaActual = ref(1)

watch([busqueda, posicionFiltro, equipoFiltro], () => {
  paginaActual.value = 1
})

const totalPaginas = computed(() =>
  Math.max(1, Math.ceil(jugadoresFiltrados.value.length / JUGADORES_POR_PAGINA)),
)

watch(totalPaginas, (total) => {
  if (paginaActual.value > total) paginaActual.value = total
})

const jugadoresPaginados = computed(() => {
  const inicio = (paginaActual.value - 1) * JUGADORES_POR_PAGINA
  return jugadoresFiltrados.value.slice(inicio, inicio + JUGADORES_POR_PAGINA)
})

// Carga masiva: crea los 26 convocados oficiales de cada selección que ya
// exista en Firestore. Si un jugador no trae número, se le asigna el
// siguiente disponible (reservando el 1 para porteros).
const asignarNumeros = (jugadores: typeof CONVOCADOS_POR_SELECCION[string]) => {
  const usados = new Set(jugadores.filter((j) => j.number).map((j) => j.number as number))
  let siguiente = 2
  return jugadores.map((j) => {
    if (j.number) return j
    if (j.position === 'Portero' && !usados.has(1)) {
      usados.add(1)
      return { ...j, number: 1 }
    }
    while (usados.has(siguiente)) siguiente++
    usados.add(siguiente)
    return { ...j, number: siguiente }
  })
}

const cargandoConvocados = ref(false)
const resultadoConvocados = ref('')

const cargarConvocadosOficiales = async () => {
  cargandoConvocados.value = true
  resultadoConvocados.value = ''
  let creados = 0
  let omitidos = 0
  let fallidos = 0
  try {
    for (const team of teams.value) {
      const convocatoria = CONVOCADOS_POR_SELECCION[team.name]
      if (!convocatoria) continue
      const yaTienePlantilla = players.value.some((p) => p.teamId === team.id)
      if (yaTienePlantilla) {
        omitidos += convocatoria.length
        continue
      }
      for (const jugador of asignarNumeros(convocatoria)) {
        try {
          await createPlayer({
            teamId: team.id,
            name: jugador.name,
            number: jugador.number as number,
            position: jugador.position,
            club: jugador.club ?? 'Sin club',
            titular: false,
          })
          creados++
        } catch (err) {
          console.error(`No se pudo crear ${jugador.name} (${team.name}):`, err)
          fallidos++
        }
      }
    }
    await cargar()
    resultadoConvocados.value = `Listo: ${creados} jugadores creados, ${omitidos} ya tenían plantilla${fallidos ? `, ${fallidos} fallaron` : ''}.`
  } finally {
    cargandoConvocados.value = false
  }
}
</script>

<template>
  <div class="players-search-page animate-fade-in">
    <header class="players-search-header animate-slide-up">
      <h1 class="players-search-title">
        <span class="text-gold-gradient">Jugadores</span> del torneo
      </h1>
      <p class="players-search-subtitle">Busca cualquier jugador convocado, de cualquier selección</p>
    </header>

    <div class="players-search-filters animate-slide-up delay-1">
      <input
        v-model="busqueda"
        type="text"
        class="field__input filters__search"
        placeholder="Buscar por jugador, club o selección..."
      />
      <select v-model="posicionFiltro" class="field__input">
        <option value="">Todas las posiciones</option>
        <option v-for="p in POSICIONES_JUGADOR" :key="p" :value="p">{{ p }}</option>
      </select>
      <select v-model="equipoFiltro" class="field__input">
        <option value="">Todas las selecciones</option>
        <option v-for="t in teams" :key="t.id" :value="t.id">{{ t.name }}</option>
      </select>
      <button class="btn-refetch" @click="cargar" :disabled="loading">
        Actualizar
      </button>
      <button v-if="user" class="btn-refetch" :disabled="cargandoConvocados" @click="cargarConvocadosOficiales">
        {{ cargandoConvocados ? 'Cargando...' : '⚡ Cargar convocados oficiales' }}
      </button>
    </div>

    <p v-if="resultadoConvocados" class="state-text">{{ resultadoConvocados }}</p>

    <p v-if="!loading && !error" class="results-count">
      {{ jugadoresFiltrados.length }} jugador{{ jugadoresFiltrados.length === 1 ? '' : 'es' }} en total
    </p>

    <!-- Estado: cargando -->
    <div v-if="loading" class="state-box">
      <div class="spinner" />
      <p class="state-text">Cargando jugadores...</p>
    </div>

    <!-- Estado: error -->
    <div v-else-if="error" class="state-box">
      <p class="state-text">{{ error }}</p>
      <button class="btn-refetch" @click="cargar">Reintentar</button>
    </div>

    <!-- Estado: vacío -->
    <div v-else-if="jugadoresFiltrados.length === 0" class="state-box">
      <p class="state-text">
        {{ players.length === 0 ? 'Todavía no hay jugadores registrados en ninguna selección.' : 'No se encontraron jugadores con esa búsqueda.' }}
      </p>
    </div>

    <!-- Listado -->
    <template v-else>
      <div class="players-grid">
        <NuxtLink
          v-for="player in jugadoresPaginados"
          :key="player.id"
          :to="`/teams/${player.teamId}/players`"
          class="player-card glass animate-slide-up"
        >
          <span class="player-card__number">{{ player.number }}</span>
          <div class="player-card__info">
            <p class="player-card__name">{{ player.name }}</p>
            <p class="player-card__meta">{{ player.position }} · {{ player.club || 'Sin club' }}</p>
            <p v-if="equipoPorId.get(player.teamId)" class="player-card__team">
              <img
                v-if="equipoPorId.get(player.teamId)?.flag"
                :src="equipoPorId.get(player.teamId)?.flag"
                :alt="equipoPorId.get(player.teamId)?.name"
                class="player-card__flag"
              />
              {{ equipoPorId.get(player.teamId)?.name }}
            </p>
          </div>
        </NuxtLink>
      </div>

      <Pagination v-model:pagina-actual="paginaActual" :total-paginas="totalPaginas" />
    </template>
  </div>
</template>

<style scoped>
.players-search-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
}

.players-search-title {
  font-size: clamp(1.6rem, 3vw, 2.2rem);
  font-weight: 800;
  letter-spacing: -0.02em;
}

.players-search-subtitle {
  color: var(--text-secondary);
  font-size: 0.92rem;
  margin-top: 4px;
}

.players-search-filters {
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
  width: auto;
  flex: 0 0 auto;
  text-overflow: ellipsis;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238b95a5' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 14px center;
  padding-right: 36px;
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

.btn-refetch:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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

.players-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--space-lg);
}

.player-card {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-lg);
  border-radius: var(--radius-lg);
  transition: transform var(--transition-base), box-shadow var(--transition-base);
}

.player-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-md);
}

.player-card__number {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--gold-gradient);
  color: #0a0e1a;
  font-weight: 800;
  font-size: 0.85rem;
  flex-shrink: 0;
}

.player-card__info {
  flex: 1;
  min-width: 0;
}

.player-card__name {
  font-size: 0.95rem;
  font-weight: 700;
}

.player-card__meta {
  font-size: 0.78rem;
  color: var(--text-muted);
  margin-top: 2px;
}

.player-card__team {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  color: var(--text-gold);
  margin-top: 6px;
}

.player-card__flag {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  object-fit: cover;
}
</style>
