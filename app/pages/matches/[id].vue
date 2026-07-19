<script setup lang="ts">
import { Timestamp } from 'firebase/firestore'
import type { Match } from '~/composables/useMatches'
import { FASES, GRUPOS, ESTADOS_PARTIDO, nombresEstadios, buscarEstadioPorNombre } from '~/utils/worldCupData'

const route = useRoute()
const router = useRouter()
const { fetchMatchById, updateMatch, deleteMatch } = useMatches()
const { teams: equiposRegistrados, fetchTeams } = useTeams()
const { user } = useAuth()
const { confirmar } = useConfirm()

const nombresEquiposRegistrados = computed(() => equiposRegistrados.value.map((t) => t.name).sort())

const id = route.params.id as string

const match = ref<Match | null>(null)
const loading = ref(false)
const error = ref('')
const editando = ref(false)
const guardando = ref(false)

const formulario = reactive({
  homeTeam: '',
  awayTeam: '',
  stage: '',
  group: '',
  stadium: '',
  city: '',
  fecha: '',
  status: '',
  homeScore: null as number | null,
  awayScore: null as number | null,
})

const fechaParaInput = (ts: Timestamp) => {
  const d = ts.toDate()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const cargar = async () => {
  loading.value = true
  error.value = ''
  try {
    const resultado = await fetchMatchById(id)
    if (!resultado) {
      error.value = 'No se encontró el partido solicitado.'
      match.value = null
    } else {
      match.value = resultado
      formulario.homeTeam = resultado.homeTeam
      formulario.awayTeam = resultado.awayTeam
      formulario.stage = resultado.stage
      formulario.group = resultado.group ?? ''
      formulario.stadium = resultado.stadium
      formulario.city = resultado.city
      formulario.fecha = fechaParaInput(resultado.kickoff)
      formulario.status = resultado.status
      formulario.homeScore = resultado.homeScore
      formulario.awayScore = resultado.awayScore
    }
  } catch {
    error.value = 'Ocurrió un error al cargar el partido.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  cargar()
  fetchTeams()
})

watch(() => formulario.stadium, (nombre) => {
  const estadio = buscarEstadioPorNombre(nombre)
  if (estadio) formulario.city = estadio.city
})

const errorEdicion = ref('')

const guardarCambios = async () => {
  if (!match.value) return
  errorEdicion.value = ''

  const esVacio = (v: number | null) => v === null || v === undefined || (v as unknown) === ''
  const marcadorIncompleto = esVacio(formulario.homeScore) || esVacio(formulario.awayScore)
  if (formulario.status === 'Finalizado' && marcadorIncompleto) {
    errorEdicion.value = 'Ingresa el marcador de ambos equipos para marcar el partido como Finalizado.'
    return
  }

  guardando.value = true
  try {
    await updateMatch(match.value.id, {
      homeTeam: formulario.homeTeam,
      awayTeam: formulario.awayTeam,
      stage: formulario.stage,
      group: formulario.stage === 'Fase de grupos' ? formulario.group : null,
      stadium: formulario.stadium,
      city: formulario.city,
      kickoff: Timestamp.fromDate(new Date(formulario.fecha)),
      status: formulario.status,
      homeScore: esVacio(formulario.homeScore) ? null : Number(formulario.homeScore),
      awayScore: esVacio(formulario.awayScore) ? null : Number(formulario.awayScore),
    })
    editando.value = false
    await cargar()
  } catch (err) {
    console.error('Error al actualizar partido:', err)
  } finally {
    guardando.value = false
  }
}

const eliminar = async () => {
  if (!match.value) return
  const confirmado = await confirmar(`¿Eliminar el partido ${match.value.homeTeam} vs ${match.value.awayTeam}?`)
  if (!confirmado) return
  try {
    await deleteMatch(match.value.id)
    router.push('/matches')
  } catch (err) {
    console.error('Error al eliminar partido:', err)
  }
}

const formatearFecha = (ts: Timestamp) =>
  ts.toDate().toLocaleString('es', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
</script>

<template>
  <div class="match-detail animate-fade-in">
    <NuxtLink to="/matches" class="back-link">← Volver a partidos</NuxtLink>

    <!-- Estado: cargando -->
    <div v-if="loading" class="state-box">
      <div class="spinner" />
      <p class="state-text">Cargando partido...</p>
    </div>

    <!-- Estado: error -->
    <div v-else-if="error" class="state-box">
      <p class="state-text">{{ error }}</p>
      <button class="btn-refetch" @click="cargar">Reintentar</button>
    </div>

    <!-- Contenido -->
    <div v-else-if="match" class="match-card-detail glass-strong animate-slide-up">
      <template v-if="!editando">
        <div class="match-detail__header">
          <span class="badge" :class="`badge--${match.status.replace(' ', '').toLowerCase()}`">{{ match.status }}</span>
          <span class="match-detail__stage">{{ match.stage }}<template v-if="match.group"> · Grupo {{ match.group }}</template></span>
        </div>

        <div class="match-detail__scoreboard">
          <span class="match-detail__team">{{ match.homeTeam }}</span>
          <span class="match-detail__score">{{ match.homeScore ?? '-' }} : {{ match.awayScore ?? '-' }}</span>
          <span class="match-detail__team">{{ match.awayTeam }}</span>
        </div>

        <div class="divider" />

        <dl class="match-detail__info">
          <div class="info-item">
            <dt>Estadio</dt>
            <dd>{{ match.stadium }}</dd>
          </div>
          <div class="info-item">
            <dt>Ciudad</dt>
            <dd>{{ match.city }}</dd>
          </div>
          <div class="info-item">
            <dt>Fecha</dt>
            <dd>{{ formatearFecha(match.kickoff) }}</dd>
          </div>
        </dl>

        <div v-if="user" class="match-detail__actions">
          <button class="btn-edit" @click="editando = true">Editar</button>
          <button class="btn-delete" @click="eliminar">Eliminar</button>
        </div>
      </template>

      <!-- Formulario de edición -->
      <form v-else class="edit-form" @submit.prevent="guardarCambios">
        <div class="edit-form__grid">
          <div class="field">
            <label class="field__label">Equipo local</label>
            <select v-model="formulario.homeTeam" class="field__input" required>
              <option v-for="n in nombresEquiposRegistrados" :key="n" :value="n">{{ n }}</option>
            </select>
          </div>
          <div class="field">
            <label class="field__label">Equipo visitante</label>
            <select v-model="formulario.awayTeam" class="field__input" required>
              <option v-for="n in nombresEquiposRegistrados" :key="n" :value="n">{{ n }}</option>
            </select>
          </div>
          <div class="field">
            <label class="field__label">Gol. local</label>
            <input v-model.number="formulario.homeScore" type="number" min="0" class="field__input" placeholder="Sin jugar" />
          </div>
          <div class="field">
            <label class="field__label">Gol. visitante</label>
            <input v-model.number="formulario.awayScore" type="number" min="0" class="field__input" placeholder="Sin jugar" />
          </div>
          <div class="field">
            <label class="field__label">Fase</label>
            <select v-model="formulario.stage" class="field__input" required>
              <option v-for="f in FASES" :key="f" :value="f">{{ f }}</option>
            </select>
          </div>
          <div v-if="formulario.stage === 'Fase de grupos'" class="field">
            <label class="field__label">Grupo</label>
            <select v-model="formulario.group" class="field__input" required>
              <option value="" disabled>Selecciona un grupo</option>
              <option v-for="g in GRUPOS" :key="g" :value="g">Grupo {{ g }}</option>
            </select>
          </div>
          <div class="field">
            <label class="field__label">Estadio</label>
            <select v-model="formulario.stadium" class="field__input" required>
              <option v-for="e in nombresEstadios" :key="e" :value="e">{{ e }}</option>
            </select>
          </div>
          <div class="field">
            <label class="field__label">Ciudad</label>
            <input v-model="formulario.city" type="text" class="field__input" readonly />
          </div>
          <div class="field">
            <label class="field__label">Fecha y hora</label>
            <input v-model="formulario.fecha" type="datetime-local" class="field__input" required />
          </div>
          <div class="field">
            <label class="field__label">Estado</label>
            <select v-model="formulario.status" class="field__input" required>
              <option v-for="e in ESTADOS_PARTIDO" :key="e" :value="e">{{ e }}</option>
            </select>
          </div>
        </div>
        <p v-if="errorEdicion" class="form-error">{{ errorEdicion }}</p>
        <div class="edit-form__actions">
          <button type="submit" class="btn-edit" :disabled="guardando">
            {{ guardando ? 'Guardando...' : 'Guardar cambios' }}
          </button>
          <button type="button" class="btn-cancel" @click="editando = false">Cancelar</button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.match-detail {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  max-width: 640px;
  margin: 0 auto;
}

.back-link {
  font-size: 0.85rem;
  color: var(--text-secondary);
  transition: color var(--transition-fast);
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

.match-card-detail {
  border-radius: var(--radius-xl);
  padding: var(--space-2xl);
}

.match-detail__header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-md);
  margin-bottom: var(--space-lg);
}

.match-detail__stage {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.badge {
  padding: 3px 12px;
  border-radius: 999px;
  font-weight: 600;
  font-size: 0.75rem;
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

.match-detail__scoreboard {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-xl);
}

.match-detail__team {
  font-size: 1.25rem;
  font-weight: 700;
}

.match-detail__score {
  padding: 8px 20px;
  border-radius: var(--radius-md);
  background: var(--bg-surface);
  color: var(--text-gold);
  font-size: 1.4rem;
  font-weight: 800;
}

.divider {
  height: 1px;
  margin: var(--space-xl) 0;
  background: linear-gradient(90deg, transparent, var(--border-glass), transparent);
}

.match-detail__info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: var(--space-lg);
}

.info-item dt {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 4px;
}

.info-item dd {
  font-size: 1rem;
  color: var(--text-primary);
}

.match-detail__actions {
  display: flex;
  gap: var(--space-md);
  margin-top: var(--space-xl);
}

.btn-edit {
  padding: 10px 22px;
  border-radius: var(--radius-md);
  background: var(--gold-gradient);
  color: #0a0e1a;
  font-weight: 700;
  font-size: 0.88rem;
}

.btn-edit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-delete {
  padding: 10px 22px;
  border-radius: var(--radius-md);
  background: var(--bg-surface);
  border: 1px solid rgba(255, 107, 107, 0.3);
  color: #ff6b6b;
  font-weight: 600;
  font-size: 0.88rem;
}

.btn-delete:hover {
  background: rgba(255, 107, 107, 0.08);
}

.edit-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.edit-form__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
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

.edit-form__actions {
  display: flex;
  gap: var(--space-md);
}

.btn-cancel {
  padding: 10px 22px;
  border-radius: var(--radius-md);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 0.88rem;
}
</style>