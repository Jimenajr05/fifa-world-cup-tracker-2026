<script setup lang="ts">
import type { Team } from '~/composables/useTeams'
import type { Match } from '~/composables/useMatches'

const { user, perfil, alternarEquipoFavorito, alternarPartidoFavorito } = useAuth()
const { fetchTeamById } = useTeams()
const { fetchMatchById } = useMatches()

const equiposFavoritos = ref<Team[]>([])
const partidosFavoritos = ref<Match[]>([])
const loading = ref(false)
const error = ref('')

const cargar = async () => {
  if (!user.value || !perfil.value) return
  loading.value = true
  error.value = ''
  try {
    const equipos = await Promise.all(perfil.value.equiposFavoritos.map((id) => fetchTeamById(id)))
    equiposFavoritos.value = equipos.filter((t): t is Team => t !== null)

    const partidos = await Promise.all(perfil.value.partidosFavoritos.map((id) => fetchMatchById(id)))
    partidosFavoritos.value = partidos.filter((m): m is Match => m !== null)
  } catch {
    error.value = 'Ocurrió un error al cargar tus favoritos.'
  } finally {
    loading.value = false
  }
}

onMounted(cargar)
watch(() => perfil.value?.equiposFavoritos.length, cargar)
watch(() => perfil.value?.partidosFavoritos.length, cargar)

const quitarEquipo = async (teamId: string) => {
  await alternarEquipoFavorito(teamId)
  await cargar()
}

const quitarPartido = async (matchId: string) => {
  await alternarPartidoFavorito(matchId)
  await cargar()
}

const formatearFecha = (ts: { toDate: () => Date }) =>
  ts.toDate().toLocaleString('es', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
</script>

<template>
  <div class="favorites-page animate-fade-in">
    <NuxtLink to="/profile" class="back-link">← Volver a mi perfil</NuxtLink>

    <header class="favorites-header animate-slide-up">
      <h1 class="favorites-title">
        Mis <span class="text-gold-gradient">favoritos</span>
      </h1>
    </header>

    <!-- Estado: no logueado -->
    <div v-if="!user" class="state-box">
      <p class="state-text">Inicia sesión para ver tus favoritos.</p>
    </div>

    <!-- Estado: cargando -->
    <div v-else-if="loading" class="state-box">
      <div class="spinner" />
      <p class="state-text">Cargando favoritos...</p>
    </div>

    <!-- Estado: error -->
    <div v-else-if="error" class="state-box">
      <p class="state-text">{{ error }}</p>
      <button class="btn-refetch" @click="cargar">Reintentar</button>
    </div>

    <template v-else>
      <!-- Equipos favoritos -->
      <section class="favorites-section animate-slide-up delay-1">
        <h2 class="favorites-section__title">Selecciones favoritas</h2>
        <div v-if="equiposFavoritos.length === 0" class="state-box state-box--compact">
          <p class="state-text">
            No has guardado ninguna selección. Ve a <NuxtLink to="/teams">Selecciones</NuxtLink> y toca "Agregar a favoritos".
          </p>
        </div>
        <div v-else class="favorites-grid">
          <div v-for="equipo in equiposFavoritos" :key="equipo.id" class="favorite-card glass">
            <NuxtLink :to="`/teams/${equipo.id}`" class="favorite-card__link">
              <span class="favorite-card__name">{{ equipo.name }}</span>
              <span class="favorite-card__meta">Grupo {{ equipo.group }} · #{{ equipo.fifaRanking }} FIFA</span>
            </NuxtLink>
            <button class="favorite-card__remove" title="Quitar de favoritos" @click="quitarEquipo(equipo.id)">✕</button>
          </div>
        </div>
      </section>

      <!-- Partidos favoritos -->
      <section class="favorites-section animate-slide-up delay-2">
        <h2 class="favorites-section__title">Partidos favoritos</h2>
        <div v-if="partidosFavoritos.length === 0" class="state-box state-box--compact">
          <p class="state-text">
            No has guardado ningún partido. Ve a <NuxtLink to="/matches">Partidos</NuxtLink> y toca "Agregar a favoritos".
          </p>
        </div>
        <div v-else class="favorites-grid">
          <div v-for="partido in partidosFavoritos" :key="partido.id" class="favorite-card glass">
            <NuxtLink :to="`/matches/${partido.id}`" class="favorite-card__link">
              <span class="favorite-card__name">{{ partido.homeTeam }} vs {{ partido.awayTeam }}</span>
              <span class="favorite-card__meta">{{ partido.stage }} · {{ formatearFecha(partido.kickoff) }}</span>
            </NuxtLink>
            <button class="favorite-card__remove" title="Quitar de favoritos" @click="quitarPartido(partido.id)">✕</button>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.favorites-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
  max-width: 720px;
  margin: 0 auto;
}

.back-link {
  font-size: 0.85rem;
  color: var(--text-secondary);
  width: fit-content;
}

.back-link:hover {
  color: var(--text-gold);
}

.favorites-title {
  font-size: clamp(1.4rem, 3vw, 1.9rem);
  font-weight: 800;
  letter-spacing: -0.02em;
}

.state-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-2xl) 0;
  text-align: center;
}

.state-box--compact {
  padding: var(--space-lg) 0;
}

.state-text {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.state-text a {
  color: var(--text-gold);
  text-decoration: underline;
}

.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid var(--border-glass);
  border-top-color: var(--gold-start);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.btn-refetch {
  padding: 10px 18px;
  border-radius: var(--radius-md);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-weight: 600;
}

.favorites-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.favorites-section__title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-primary);
}

.favorites-grid {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.favorite-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  padding: var(--space-md) var(--space-lg);
  border-radius: var(--radius-lg);
  transition: transform var(--transition-base), box-shadow var(--transition-base);
}

.favorite-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.favorite-card__link {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.favorite-card__name {
  font-weight: 700;
  font-size: 0.92rem;
}

.favorite-card__meta {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.favorite-card__remove {
  flex: 0 0 auto;
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

.favorite-card__remove:hover {
  color: #ff6b6b;
  background: rgba(255, 107, 107, 0.1);
}
</style>