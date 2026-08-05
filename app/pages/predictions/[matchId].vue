// Página de detalle de un partido para hacer predicciones, mostrando el formulario de predicción si el usuario está autenticado y el partido está "Programado"
<script setup lang="ts">
// Tipo de partido
import type { Match } from '~/composables/useMatches'

// Ruta actual, para leer el id del partido a predecir
const route = useRoute()
// Id del partido, tomado de la URL
const matchId = route.params.matchId as string

// Carga de partido por id
const { fetchMatchById } = useMatches()
// Búsqueda de una predicción existente del usuario para este partido
const { fetchPredictionByMatch } = usePredictions()
// Usuario autenticado
const { user } = useAuth()

// Partido cargado
const match = ref<Match | null>(null)
// Indica si el partido se está cargando
const loading = ref(false)
// Mensaje de error al cargar el partido
const error = ref('')

// Marcador predicho para el equipo local (precargado si ya existe una predicción)
const homePrediction = ref<number | null>(null)
// Marcador predicho para el equipo visitante (precargado si ya existe una predicción)
const awayPrediction = ref<number | null>(null)
// Indica si el usuario ya tenía una predicción guardada para este partido
const yaExistePrediccion = ref(false)

// Carga el partido y, si hay usuario, su predicción previa (si existe)
const cargar = async () => {
  loading.value = true
  error.value = ''
  try {
    const resultado = await fetchMatchById(matchId)
    if (!resultado) {
      error.value = 'No se encontró el partido solicitado.'
      match.value = null
      return
    }
    match.value = resultado

    if (user.value) {
      const prediccionExistente = await fetchPredictionByMatch(user.value.uid, matchId)
      if (prediccionExistente) {
        yaExistePrediccion.value = true
        homePrediction.value = prediccionExistente.homePrediction
        awayPrediction.value = prediccionExistente.awayPrediction
      }
    }
  } catch {
    error.value = 'Ocurrió un error al cargar el partido.'
  } finally {
    loading.value = false
  }
}

onMounted(cargar)

// Indica si el partido todavía admite predicciones (solo si está "Programado")
const puedePronosticar = computed(() => match.value?.status === 'Programado')

// Formatea un Timestamp de Firestore como fecha y hora completa en español
const formatearFecha = (ts: { toDate: () => Date }) =>
  ts.toDate().toLocaleString('es', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
</script>

<template>
  <div class="prediction-detail animate-fade-in">
    <NuxtLink to="/predictions" class="back-link">← Volver a predicciones</NuxtLink>

    <div v-if="!user" class="state-box">
      <p class="state-text">Inicia sesión para hacer tu predicción.</p>
    </div>

    <div v-else-if="loading" class="state-box">
      <div class="spinner" />
      <p class="state-text">Cargando partido...</p>
    </div>

    <div v-else-if="error" class="state-box">
      <p class="state-text">{{ error }}</p>
      <button class="btn-refetch" @click="cargar">Reintentar</button>
    </div>

    <div v-else-if="match" class="prediction-card-detail glass-strong animate-slide-up">
      <div class="prediction-detail__header">
        <span>{{ match.stage }}<template v-if="match.group"> · Grupo {{ match.group }}</template></span>
        <span>{{ formatearFecha(match.kickoff) }}</span>
      </div>

      <div class="prediction-detail__teams">
        <span class="prediction-detail__team">{{ match.homeTeam }}</span>
        <span class="prediction-detail__vs">vs</span>
        <span class="prediction-detail__team">{{ match.awayTeam }}</span>
      </div>

      <p v-if="!puedePronosticar" class="form-hint">
        Este partido ya no está en estado "Programado", así que no se puede pronosticar ni editar la predicción.
      </p>

      <PredictionForm v-else :match-id="matchId" :home-team="match.homeTeam" :away-team="match.awayTeam"
        :initial-home-prediction="homePrediction" :initial-away-prediction="awayPrediction"
        :ya-existe-prediccion="yaExistePrediccion" />

      <p class="scoring-hint">
        Puntuación: 3 pts por marcador exacto · 1 pt por acertar solo el ganador
      </p>
    </div>
  </div>
</template>

<style scoped>
.prediction-detail {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  max-width: 480px;
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

.prediction-card-detail {
  border-radius: var(--radius-xl);
  padding: var(--space-2xl);
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.prediction-detail__header {
  display: flex;
  justify-content: space-between;
  font-size: 0.78rem;
  color: var(--text-muted);
}

.prediction-detail__teams {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-lg);
  font-size: 1.3rem;
  font-weight: 700;
}

.prediction-detail__vs {
  font-size: 0.85rem;
  color: var(--text-muted);
  font-weight: 500;
}

.form-hint {
  font-size: 0.85rem;
  color: var(--text-muted);
  text-align: center;
}

.scoring-hint {
  text-align: center;
  font-size: 0.75rem;
  color: var(--text-muted);
}
</style>