<script setup lang="ts">
import { mensajeError } from '~/utils/validation'

const props = defineProps<{
  matchId: string
  homeTeam: string
  awayTeam: string
  initialHomePrediction: number | null
  initialAwayPrediction: number | null
  yaExistePrediccion: boolean
}>()

const emit = defineEmits<{
  (e: 'saved'): void
}>()

const { user } = useAuth()
const { guardarPrediccion } = usePredictions()

const guardando = ref(false)
const errorFormulario = ref('')
const mensajeExito = ref(false)

const homePrediction = ref<number | null>(props.initialHomePrediction)
const awayPrediction = ref<number | null>(props.initialAwayPrediction)
const yaExiste = ref(props.yaExistePrediccion)

const guardar = async () => {
  errorFormulario.value = ''
  if (!user.value) return
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
    await guardarPrediccion(user.value.uid, props.matchId, homePrediction.value, awayPrediction.value)
    mensajeExito.value = true
    yaExiste.value = true
    setTimeout(() => { mensajeExito.value = false }, 3000)
    emit('saved')
  } catch (err) {
    console.error('Error al guardar predicción:', err)
    errorFormulario.value = mensajeError(err, 'No se pudo guardar tu predicción.')
  } finally {
    guardando.value = false
  }
}
</script>

<template>
  <form class="prediction-form" @submit.prevent="guardar">
    <div class="prediction-form__grid">
      <div class="field">
        <label class="field__label">{{ homeTeam }}</label>
        <input v-model.number="homePrediction" type="number" min="0" class="field__input" required />
      </div>
      <div class="field">
        <label class="field__label">{{ awayTeam }}</label>
        <input v-model.number="awayPrediction" type="number" min="0" class="field__input" required />
      </div>
    </div>

    <p v-if="errorFormulario" class="form-error">{{ errorFormulario }}</p>

    <button type="submit" class="save-btn" :disabled="guardando">
      {{ guardando ? 'Guardando...' : yaExiste ? 'Actualizar predicción' : 'Guardar predicción' }}
    </button>

    <Transition name="fade">
      <p v-if="mensajeExito" class="success-msg">Predicción guardada correctamente</p>
    </Transition>
  </form>
</template>

<style scoped>
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

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
