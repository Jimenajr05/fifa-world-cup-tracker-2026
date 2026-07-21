<script setup lang="ts">
import type { Match } from '~/composables/useMatches'

const route = useRoute()
const router = useRouter()
const matchId = route.params.matchId as string

const { fetchMatchById } = useMatches()
const { fetchPredictionByMatch, guardarPrediccion } = usePredictions()
const { user } = useAuth()

const match = ref<Match | null>(null)
const loading = ref(false)
const error = ref('')
const guardando = ref(false)
const errorFormulario = ref('')
const mensajeExito = ref(false)

const homePrediction = ref<number | null>(null)
const awayPrediction = ref<number | null>(null)
const yaExistePrediccion = ref(false)

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

// Una vez que el partido deja de estar "Programado" ya no se puede pronosticar
const puedePronosticar = computed(() => match.value?.status === 'Programado')

const guardar = async () => {
  errorFormulario.value = ''
  if (!user.value || !match.value) return
  if (homePrediction.value === null || awayPrediction.value === null) {
    errorFormulario.value = 'Ingresa un marcador para ambos equipos.'
    return
  }
  if (homePrediction.value < 0 || awayPrediction.value < 0) {
    errorFormulario.value = 'El marcador no puede ser negativo.'
    return
  }

  guardando.value = true
  try {
    await guardarPrediccion(user.value.uid, matchId, homePrediction.value, awayPrediction.value)
    mensajeExito.value = true
    yaExistePrediccion.value = true
    setTimeout(() => { mensajeExito.value = false }, 3000)
  } catch (err) {
    console.error('Error al guardar predicción:', err)
    errorFormulario.value = 'No se pudo guardar tu predicción.'
  } finally {
    guardando.value = false
  }
}

const formatearFecha = (ts: { toDate: () => Date }) =>
  ts.toDate().toLocaleString('es', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
</script>

<template>
  <div class="prediction-detail animate-fade-in">
    <NuxtLink to="/predictions" class="back-link">← Volver a predicciones</NuxtLink>

    <!-- Estado: no logueado -->
    <div v-if="!user" class="state-box">
      <p class="state-text">Inicia sesión para hacer tu predicción.</p>
    </div>

    <!-- Estado: cargando -->
    <div v-else-if="loading" class="state-box">
      <div class="spinner" />
      <p class="state-text">Cargando partido...</p>
    </div>

    <!-- Estado: error -->
    <div v-else-if="error" class="state-box">
      <p class="state-text">{{ error }}</p>
      <button class="btn-refetch" @click="cargar">Reintentar</button>
    </div>

    <!-- Contenido -->
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

      <!-- Ya no se puede pronosticar -->
      <p v-if="!puedePronosticar" class="form-hint">
        Este partido ya no está en estado "Programado", así que no se puede pronosticar ni editar la predicción.
      </p>

      <form v-else class="prediction-form" @submit.prevent="guardar">
        <div class="prediction-form__grid">
          <div class="field">
            <label class="field__label">{{ match.homeTeam }}</label>
            <input v-model.number="homePrediction" type="number" min="0" class="field__input" required />
          </div>
          <div class="field">
            <label class="field__label">{{ match.awayTeam }}</label>
            <input v-model.number="awayPrediction" type="number" min="0" class="field__input" required />
          </div>
        </div>

        <p v-if="errorFormulario" class="form-error">{{ errorFormulario }}</p>

        <button type="submit" class="save-btn" :disabled="guardando">
          {{ guardando ? 'Guardando...' : yaExistePrediccion ? 'Actualizar predicción' : 'Guardar predicción' }}
        </button>

        <Transition name="fade">
          <p v-if="mensajeExito" class="success-msg">Predicción guardada correctamente</p>
        </Transition>
      </form>

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

.prediction-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.prediction-form__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-lg);
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
  text-align: center;
}

.field__input {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--border-glass);
  border-radius: var(--radius-md);
  font-size: 1.1rem;
  font-weight: 700;
  text-align: center;
  color: var(--text-primary);
  background: var(--bg-surface);
}

.field__input:focus {
  outline: none;
  border-color: var(--gold-start);
  box-shadow: 0 0 0 3px rgba(255, 214, 10, 0.1);
}

.form-error {
  color: #ff6b6b;
  font-size: 0.85rem;
  text-align: center;
}

.save-btn {
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

.success-msg {
  text-align: center;
  padding: 10px;
  border-radius: var(--radius-md);
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--green-primary);
  background: rgba(0, 184, 148, 0.08);
  border: 1px solid rgba(0, 184, 148, 0.2);
}

.scoring-hint {
  text-align: center;
  font-size: 0.75rem;
  color: var(--text-muted);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>