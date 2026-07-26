<script setup lang="ts">
import type { Match } from '~/composables/useMatches'

const { user, perfil } = useAuth()
const { predictions, loading, error, fetchPredictionsByUser, eliminarPrediccion } = usePredictions()
const { fetchMatchById } = useMatches()
const { confirmar } = useConfirm()

// Guardamos los partidos asociados a cada predicción, indexados por matchId,
// para mostrar equipos y resultado sin tener que repetir la consulta.
const partidosPorId = ref<Record<string, Match | null>>({})
const cargandoPartidos = ref(false)

const cargar = async () => {
  if (!user.value) return
  await fetchPredictionsByUser(user.value.uid)

  cargandoPartidos.value = true
  try {
    const entradas = await Promise.all(
      predictions.value.map(async (p) => [p.matchId, await fetchMatchById(p.matchId)] as const),
    )
    partidosPorId.value = Object.fromEntries(entradas)
  } finally {
    cargandoPartidos.value = false
  }
}

onMounted(cargar)
watch(user, cargar)

// Predicciones ordenadas: primero las pendientes de resultado, luego las ya calificadas
const prediccionesOrdenadas = computed(() =>
  [...predictions.value].sort((a, b) => {
    if (a.pointsEarned === null && b.pointsEarned !== null) return -1
    if (a.pointsEarned !== null && b.pointsEarned === null) return 1
    return 0
  }),
)

const formatearFecha = (ts: { toDate: () => Date }) =>
  ts.toDate().toLocaleString('es', { day: '2-digit', month: 'short', year: 'numeric' })

// Solo se puede borrar una predicción mientras el partido siga programado
const puedeEliminar = (matchId: string) => partidosPorId.value[matchId]?.status === 'Programado'

const eliminar = async (predictionId: string) => {
  const confirmado = await confirmar('¿Eliminar esta predicción?')
  if (!confirmado) return
  try {
    await eliminarPrediccion(predictionId)
    await cargar()
  } catch (err) {
    console.error('Error al eliminar predicción:', err)
  }
}
</script>

<template>
  <div class="my-predictions animate-fade-in">
    <NuxtLink to="/profile" class="back-link">← Volver a mi perfil</NuxtLink>

    <header class="my-predictions__header animate-slide-up">
      <h1 class="my-predictions__title">
        Mis <span class="text-gold-gradient">predicciones</span>
      </h1>
      <span class="points-badge">⭐ {{ perfil?.puntos ?? 0 }} puntos totales</span>
    </header>

    <!-- Estado: no logueado -->
    <div v-if="!user" class="state-box">
      <p class="state-text">Inicia sesión para ver tus predicciones.</p>
    </div>

    <!-- Estado: cargando -->
    <div v-else-if="loading || cargandoPartidos" class="state-box">
      <div class="spinner" />
      <p class="state-text">Cargando tus predicciones...</p>
    </div>

    <!-- Estado: error -->
    <div v-else-if="error" class="state-box">
      <p class="state-text">{{ error }}</p>
      <button class="btn-refetch" @click="cargar">Reintentar</button>
    </div>

    <!-- Estado: vacío -->
    <div v-else-if="prediccionesOrdenadas.length === 0" class="state-box">
      <p class="state-text">Todavía no has hecho ninguna predicción.</p>
      <NuxtLink to="/predictions" class="btn-refetch">Ir a predicciones</NuxtLink>
    </div>

    <!-- Listado -->
    <div v-else class="my-predictions__list">
      <div v-for="pred in prediccionesOrdenadas" :key="pred.id" class="prediction-row glass animate-slide-up">
        <template v-if="partidosPorId[pred.matchId]">
          <div class="prediction-row__teams">
            <span>{{ partidosPorId[pred.matchId]!.homeTeam }}</span>
            <span class="prediction-row__vs">vs</span>
            <span>{{ partidosPorId[pred.matchId]!.awayTeam }}</span>
          </div>
          <div class="prediction-row__details">
            <span>Tu predicción: <strong>{{ pred.homePrediction }} - {{ pred.awayPrediction }}</strong></span>
            <span v-if="partidosPorId[pred.matchId]!.status === 'Finalizado'">
              Resultado real: <strong>{{ partidosPorId[pred.matchId]!.homeScore }} - {{ partidosPorId[pred.matchId]!.awayScore }}</strong>
            </span>
            <span>{{ formatearFecha(partidosPorId[pred.matchId]!.kickoff) }}</span>
          </div>
        </template>
        <div class="prediction-row__end">
          <span
            class="points-pill"
            :class="{
              'points-pill--pending': pred.pointsEarned === null,
              'points-pill--zero': pred.pointsEarned === 0,
              'points-pill--won': (pred.pointsEarned ?? 0) > 0,
            }"
          >
            {{ pred.pointsEarned === null ? 'Pendiente' : `+${pred.pointsEarned} pts` }}
          </span>
          <button
            v-if="puedeEliminar(pred.matchId)"
            class="prediction-row__delete"
            title="Eliminar predicción"
            @click="eliminar(pred.id)"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.my-predictions {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  max-width: 640px;
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

.my-predictions__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-md);
}

.my-predictions__title {
  font-size: clamp(1.4rem, 3vw, 1.9rem);
  font-weight: 800;
  letter-spacing: -0.02em;
}

.points-badge {
  padding: 4px 14px;
  border-radius: 999px;
  background: rgba(255, 214, 10, 0.1);
  color: var(--text-gold);
  font-size: 0.82rem;
  font-weight: 700;
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

.btn-refetch {
  padding: 10px 18px;
  border-radius: var(--radius-md);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-weight: 600;
}

.my-predictions__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.prediction-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  padding: var(--space-lg);
  border-radius: var(--radius-lg);
  flex-wrap: wrap;
}

.prediction-row__teams {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-weight: 700;
  font-size: 0.95rem;
}

.prediction-row__vs {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-weight: 500;
}

.prediction-row__details {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 0.78rem;
  color: var(--text-muted);
}

.points-pill {
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 700;
  white-space: nowrap;
}

.points-pill--pending {
  background: rgba(139, 149, 165, 0.15);
  color: var(--text-secondary);
}

.points-pill--zero {
  background: rgba(255, 107, 107, 0.1);
  color: #ff6b6b;
}

.points-pill--won {
  background: rgba(0, 184, 148, 0.15);
  color: var(--green-primary);
}

.prediction-row__end {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.prediction-row__delete {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  background: var(--bg-glass);
  font-size: 0.75rem;
  transition: all var(--transition-fast);
}

.prediction-row__delete:hover {
  color: #ff6b6b;
  background: rgba(255, 107, 107, 0.1);
}
</style>