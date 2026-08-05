// Página de listado de partidos disponibles para predecir, con filtros y búsqueda
<script setup lang="ts">
// Catálogos de fases y grupos, para los filtros
import { FASES, GRUPOS } from '~/utils/worldCupData'

// Partidos y estado de carga
const { matches, loading, error, fetchMatches } = useMatches()
// Predicciones del usuario actual
const { predictions, fetchPredictionsByUser } = usePredictions()
// Usuario autenticado
const { user } = useAuth()

// Texto de búsqueda libre (por selección)
const busqueda = ref('')
// Filtro de fase seleccionada
const faseFiltro = ref('')
// Filtro de grupo seleccionado
const grupoFiltro = ref('')

// Carga partidos y, si hay usuario, sus predicciones
const cargar = async () => {
  await fetchMatches()
  if (user.value) await fetchPredictionsByUser(user.value.uid)
}

onMounted(cargar)
// Recarga las predicciones cuando cambia el usuario (login/logout)
watch(user, cargar)

// Partidos que aún no han comenzado (los únicos disponibles para predecir)
const partidosProgramados = computed(() => matches.value.filter((m) => m.status === 'Programado'))

// Partidos programados que cumplen con los filtros activos
const partidosFiltrados = computed(() => {
  const texto = busqueda.value.trim().toLowerCase()
  return partidosProgramados.value.filter((m) => {
    const coincideTexto =
      !texto || m.homeTeam.toLowerCase().includes(texto) || m.awayTeam.toLowerCase().includes(texto)
    const coincideFase = !faseFiltro.value || m.stage === faseFiltro.value
    const coincideGrupo = !grupoFiltro.value || m.group === grupoFiltro.value
    return coincideTexto && coincideFase && coincideGrupo
  })
})

// Ids de partidos que ya tienen una predicción del usuario, para mostrar el badge "Ya predicho"
const matchIdsPredichos = computed(() => new Set(predictions.value.map((p) => p.matchId)))

// Mapa de predicción (marcador) por id de partido
const prediccionPorMatchId = computed(() => {
  const mapa = new Map<string, { homePrediction: number; awayPrediction: number }>()
  for (const p of predictions.value) {
    mapa.set(p.matchId, { homePrediction: p.homePrediction, awayPrediction: p.awayPrediction })
  }
  return mapa
})

// Formatea un Timestamp de Firestore como fecha y hora en español
const formatearFecha = (ts: { toDate: () => Date }) =>
  ts.toDate().toLocaleString('es', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
</script>

<template>
  <div class="predictions-page animate-fade-in">
    <header class="predictions-header animate-slide-up">
      <div>
        <h1 class="predictions-title">
          <span class="text-gold-gradient">Predicciones</span>
        </h1>
        <p class="predictions-subtitle">Pronostica el marcador antes de que empiece cada partido</p>
      </div>
    </header>

    <div v-if="!user" class="state-box">
      <p class="state-text">Inicia sesión para hacer tus predicciones.</p>
    </div>

    <template v-else>
      <div class="predictions-filters animate-slide-up delay-1">
        <input v-model="busqueda" type="text" class="field__input filters__search"
          placeholder="Buscar por selección..." />
        <select v-model="faseFiltro" class="field__input">
          <option value="">Todas las fases</option>
          <option v-for="f in FASES" :key="f" :value="f">{{ f }}</option>
        </select>
        <select v-model="grupoFiltro" class="field__input">
          <option value="">Todos los grupos</option>
          <option v-for="g in GRUPOS" :key="g" :value="g">Grupo {{ g }}</option>
        </select>
        <button class="btn-refetch" :disabled="loading" @click="cargar">Actualizar</button>
      </div>

      <div v-if="loading" class="state-box">
        <div class="spinner" />
        <p class="state-text">Cargando partidos...</p>
      </div>

      <div v-else-if="error" class="state-box">
        <p class="state-text">{{ error }}</p>
        <button class="btn-refetch" @click="cargar">Reintentar</button>
      </div>

      <div v-else-if="partidosFiltrados.length === 0" class="state-box">
        <p class="state-text">No hay partidos programados disponibles para pronosticar todavía.</p>
      </div>

      <div v-else class="predictions-list">
        <NuxtLink v-for="match in partidosFiltrados" :key="match.id" :to="`/predictions/${match.id}`"
          class="prediction-card glass animate-slide-up">
          <span v-if="matchIdsPredichos.has(match.id)" class="badge badge--predicho">Ya predicho</span>
          <div class="prediction-card__teams">
            <span class="prediction-card__team">{{ match.homeTeam }}</span>
            <span v-if="prediccionPorMatchId.has(match.id)" class="prediction-card__score">
              {{ prediccionPorMatchId.get(match.id)?.homePrediction }} - {{
                prediccionPorMatchId.get(match.id)?.awayPrediction }}
            </span>
            <span v-else class="prediction-card__vs">vs</span>
            <span class="prediction-card__team">{{ match.awayTeam }}</span>
          </div>
          <div class="prediction-card__meta">
            <span>{{ match.stage }}<template v-if="match.group"> · Grupo {{ match.group }}</template></span>
            <span>{{ formatearFecha(match.kickoff) }}</span>
          </div>
        </NuxtLink>
      </div>
    </template>
  </div>
</template>

<style scoped>
.predictions-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
}

.predictions-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  flex-wrap: wrap;
}

.predictions-title {
  font-size: clamp(1.6rem, 3vw, 2.2rem);
  font-weight: 800;
  letter-spacing: -0.02em;
}

.predictions-subtitle {
  color: var(--text-secondary);
  font-size: 0.92rem;
  margin-top: 4px;
}

.predictions-filters {
  display: flex;
  gap: var(--space-md);
  flex-wrap: wrap;
}

.field__input {
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

.filters__search {
  flex: 1;
  min-width: 200px;
}

.predictions-filters select.field__input {
  width: auto;
  flex: 0 0 auto;
  appearance: none;
  -webkit-appearance: none;
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

.predictions-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.prediction-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-lg);
  border-radius: var(--radius-lg);
  transition: transform var(--transition-base), box-shadow var(--transition-base);
}

.prediction-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.prediction-card__teams {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  font-size: 1.05rem;
  font-weight: 700;
}

.prediction-card__vs {
  font-size: 0.8rem;
  color: var(--text-muted);
  font-weight: 500;
}

.prediction-card__score {
  padding: 2px 12px;
  border-radius: var(--radius-sm);
  background: var(--bg-surface);
  color: var(--text-gold);
  font-size: 0.85rem;
  font-weight: 800;
}

.prediction-card__meta {
  display: flex;
  gap: var(--space-md);
  font-size: 0.78rem;
  color: var(--text-muted);
}

.badge--predicho {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 2px 10px;
  border-radius: 999px;
  font-weight: 600;
  font-size: 0.7rem;
  white-space: nowrap;
  background: rgba(0, 184, 148, 0.15);
  color: var(--green-primary);
}
</style>