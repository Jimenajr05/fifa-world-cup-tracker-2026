<script setup lang="ts">
import { POSICIONES_JUGADOR } from '~/utils/worldCupData'

const { players, loading, error, fetchAllPlayers } = usePlayers()
const { teams, fetchTeams } = useTeams()

const busqueda = ref('')
const posicionFiltro = ref('')

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
    return coincideTexto && coincidePosicion
  })
})
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
      <button class="btn-refetch" @click="cargar" :disabled="loading">
        Actualizar
      </button>
    </div>

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
    <div v-else class="players-grid">
      <NuxtLink
        v-for="player in jugadoresFiltrados"
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
