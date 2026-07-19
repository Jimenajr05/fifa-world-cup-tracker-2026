<script setup lang="ts">
import type { Team } from '~/composables/useTeams'
import type { NewPlayer, Player } from '~/composables/usePlayers'
import { CONFEDERACIONES, GRUPOS, POSICIONES_JUGADOR, CLUBES_REFERENCIA, nombresSelecciones, buscarSeleccionPorNombre, urlBanderaPorCodigo } from '~/utils/worldCupData'

const route = useRoute()
const router = useRouter()
const { fetchTeamById, updateTeam, deleteTeam } = useTeams()
const {
  players,
  loading: cargandoJugadores,
  error: errorJugadores,
  fetchPlayersByTeam,
  createPlayer,
  updatePlayer,
  deletePlayer,
} = usePlayers()
const { user } = useAuth()
const { confirmar } = useConfirm()

const id = route.params.id as string

const team = ref<Team | null>(null)
const loading = ref(false)
const error = ref('')
const editando = ref(false)
const guardando = ref(false)

const formulario = reactive({
  name: '',
  group: '',
  flag: '',
  coach: '',
  confederation: '',
  fifaRanking: 1,
})

const cargar = async () => {
  loading.value = true
  error.value = ''
  try {
    const resultado = await fetchTeamById(id)
    if (!resultado) {
      error.value = 'No se encontró la selección solicitada.'
      team.value = null
    } else {
      team.value = resultado
      formulario.name = resultado.name
      formulario.group = resultado.group
      formulario.flag = resultado.flag
      formulario.coach = resultado.coach
      formulario.confederation = resultado.confederation
      formulario.fifaRanking = resultado.fifaRanking
    }
  } catch {
    error.value = 'Ocurrió un error al cargar la selección.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  cargar()
  fetchPlayersByTeam(id)
})

// Al elegir el nombre en el combo box, autocompleta bandera y confederación
watch(() => formulario.name, (nombre) => {
  const seleccion = buscarSeleccionPorNombre(nombre)
  if (seleccion) {
    formulario.flag = urlBanderaPorCodigo(seleccion.code)
    formulario.confederation = seleccion.confederation
  }
})

// ── Plantilla de jugadores ──────────────────────────────────
const mostrarFormularioJugador = ref(false)
const creandoJugador = ref(false)
const errorFormularioJugador = ref('')

const nuevoJugador = reactive<Omit<NewPlayer, 'teamId'>>({
  name: '',
  number: 1,
  position: '',
  club: '',
})

const resetFormularioJugador = () => {
  nuevoJugador.name = ''
  nuevoJugador.number = 1
  nuevoJugador.position = ''
  nuevoJugador.club = ''
  errorFormularioJugador.value = ''
}

const agregarJugador = async () => {
  if (!nuevoJugador.name || !nuevoJugador.position || !nuevoJugador.club) {
    errorFormularioJugador.value = 'Nombre, posición y club son obligatorios.'
    return
  }
  creandoJugador.value = true
  errorFormularioJugador.value = ''
  try {
    await createPlayer({ ...nuevoJugador, number: Number(nuevoJugador.number), teamId: id })
    resetFormularioJugador()
    mostrarFormularioJugador.value = false
    await fetchPlayersByTeam(id)
  } catch (err) {
    console.error('Error al agregar jugador:', err)
    errorFormularioJugador.value = 'No se pudo guardar el jugador.'
  } finally {
    creandoJugador.value = false
  }
}

// Edición de un jugador existente
const edicionJugadorId = ref<string | null>(null)
const guardandoEdicionJugador = ref(false)
const errorEdicionJugador = ref('')

const formularioEdicionJugador = reactive<Omit<NewPlayer, 'teamId'>>({
  name: '',
  number: 1,
  position: POSICIONES_JUGADOR[0],
  club: '',
})

const iniciarEdicionJugador = (player: Player) => {
  edicionJugadorId.value = player.id
  formularioEdicionJugador.name = player.name
  formularioEdicionJugador.number = player.number
  formularioEdicionJugador.position = player.position
  formularioEdicionJugador.club = player.club
  errorEdicionJugador.value = ''
}

const cancelarEdicionJugador = () => {
  edicionJugadorId.value = null
  errorEdicionJugador.value = ''
}

const guardarEdicionJugador = async () => {
  if (!edicionJugadorId.value) return
  if (!formularioEdicionJugador.name) {
    errorEdicionJugador.value = 'El nombre del jugador es obligatorio.'
    return
  }
  guardandoEdicionJugador.value = true
  errorEdicionJugador.value = ''
  try {
    await updatePlayer(edicionJugadorId.value, {
      ...formularioEdicionJugador,
      number: Number(formularioEdicionJugador.number),
    })
    edicionJugadorId.value = null
    await fetchPlayersByTeam(id)
  } catch (err) {
    console.error('Error al editar jugador:', err)
    errorEdicionJugador.value = 'No se pudo guardar el jugador.'
  } finally {
    guardandoEdicionJugador.value = false
  }
}

const eliminarJugador = async (playerId: string) => {
  const confirmado = await confirmar('¿Eliminar este jugador de la plantilla?')
  if (!confirmado) return
  try {
    await deletePlayer(playerId)
    await fetchPlayersByTeam(id)
  } catch (err) {
    console.error('Error al eliminar jugador:', err)
  }
}

const guardarCambios = async () => {
  if (!team.value) return
  guardando.value = true
  try {
    await updateTeam(team.value.id, {
      ...formulario,
      fifaRanking: Number(formulario.fifaRanking),
    })
    editando.value = false
    await cargar()
  } catch (err) {
    console.error('Error al actualizar selección:', err)
  } finally {
    guardando.value = false
  }
}

const eliminar = async () => {
  if (!team.value) return
  const confirmado = await confirmar(`¿Eliminar la selección ${team.value.name}?`)
  if (!confirmado) return
  try {
    await deleteTeam(team.value.id)
    router.push('/teams')
  } catch (err) {
    console.error('Error al eliminar selección:', err)
  }
}
</script>

<template>
  <div class="team-detail animate-fade-in">
    <NuxtLink to="/teams" class="back-link">← Volver a selecciones</NuxtLink>

    <!-- Estado: cargando -->
    <div v-if="loading" class="state-box">
      <div class="spinner" />
      <p class="state-text">Cargando selección...</p>
    </div>

    <!-- Estado: error -->
    <div v-else-if="error" class="state-box">
      <p class="state-text">{{ error }}</p>
      <button class="btn-refetch" @click="cargar">Reintentar</button>
    </div>

    <!-- Contenido -->
    <div v-else-if="team" class="team-card-detail glass-strong animate-slide-up">
      <div class="team-detail__header">
        <img v-if="team.flag" :src="team.flag" :alt="team.name" class="team-detail__flag" />
        <span v-else class="team-detail__flag team-detail__flag--fallback">🏳️</span>
        <div>
          <h1 class="team-detail__name">{{ team.name }}</h1>
          <p class="team-detail__meta">Grupo {{ team.group }} · Ranking FIFA #{{ team.fifaRanking }}</p>
        </div>
      </div>

      <div class="divider" />

      <template v-if="!editando">
        <dl class="team-detail__info">
          <div class="info-item">
            <dt>Entrenador</dt>
            <dd>{{ team.coach || 'Sin definir' }}</dd>
          </div>
          <div class="info-item">
            <dt>Confederación</dt>
            <dd>{{ team.confederation || 'Sin definir' }}</dd>
          </div>
          <div class="info-item">
            <dt>Grupo</dt>
            <dd>{{ team.group }}</dd>
          </div>
          <div class="info-item">
            <dt>Ranking FIFA</dt>
            <dd>#{{ team.fifaRanking }}</dd>
          </div>
        </dl>

        <div v-if="user" class="team-detail__actions">
          <button class="btn-edit" @click="editando = true">Editar</button>
          <button class="btn-delete" @click="eliminar">Eliminar</button>
        </div>
      </template>

      <!-- Formulario de edición -->
      <form v-else class="edit-form" @submit.prevent="guardarCambios">
        <div class="field">
          <label class="field__label">Nombre</label>
          <select v-model="formulario.name" class="field__input" required>
            <option value="" disabled>Selecciona una selección</option>
            <option v-for="nombre in nombresSelecciones" :key="nombre" :value="nombre">{{ nombre }}</option>
          </select>
        </div>
        <div class="field">
          <label class="field__label">Grupo</label>
          <select v-model="formulario.group" class="field__input" required>
            <option value="" disabled>Selecciona un grupo</option>
            <option v-for="g in GRUPOS" :key="g" :value="g">Grupo {{ g }}</option>
          </select>
        </div>
        <div class="field">
          <label class="field__label">Bandera</label>
          <input v-model="formulario.flag" type="text" class="field__input" placeholder="Se completa automáticamente" readonly />
        </div>
        <div class="field">
          <label class="field__label">Entrenador</label>
          <input v-model="formulario.coach" type="text" class="field__input" />
        </div>
        <div class="field">
          <label class="field__label">Confederación</label>
          <select v-model="formulario.confederation" class="field__input" required>
            <option value="" disabled>Selecciona una confederación</option>
            <option v-for="c in CONFEDERACIONES" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>
        <div class="field">
          <label class="field__label">Ranking FIFA</label>
          <input v-model.number="formulario.fifaRanking" type="number" min="1" class="field__input" />
        </div>
        <div class="edit-form__actions">
          <button type="submit" class="btn-edit" :disabled="guardando">
            {{ guardando ? 'Guardando...' : 'Guardar cambios' }}
          </button>
          <button type="button" class="btn-cancel" @click="editando = false">Cancelar</button>
        </div>
      </form>

      <div class="divider" />

      <!-- Plantilla de jugadores -->
      <div class="squad">
        <div class="squad__header">
          <h2 class="squad__title">Plantilla de jugadores</h2>
          <button v-if="user" class="btn-add-player" @click="mostrarFormularioJugador = !mostrarFormularioJugador">
            {{ mostrarFormularioJugador ? 'Cancelar' : '+ Agregar jugador' }}
          </button>
        </div>

        <Transition name="fade">
          <form v-if="mostrarFormularioJugador" class="player-form glass" @submit.prevent="agregarJugador">
            <div class="player-form__grid">
              <div class="field">
                <label class="field__label">Nombre</label>
                <input v-model="nuevoJugador.name" type="text" class="field__input" placeholder="Nombre del jugador" required />
              </div>
              <div class="field">
                <label class="field__label">Número</label>
                <input v-model.number="nuevoJugador.number" type="number" min="1" max="99" class="field__input" />
              </div>
              <div class="field">
                <label class="field__label">Posición</label>
                <select v-model="nuevoJugador.position" class="field__input" required>
                  <option value="" disabled>Selecciona una posición</option>
                  <option v-for="p in POSICIONES_JUGADOR" :key="p" :value="p">{{ p }}</option>
                </select>
              </div>
              <div class="field">
                <label class="field__label">Club</label>
                <select v-model="nuevoJugador.club" class="field__input">
                  <option value="" disabled>Selecciona un club</option>
                  <option v-for="club in CLUBES_REFERENCIA" :key="club" :value="club">{{ club }}</option>
                </select>
              </div>
            </div>
            <p v-if="errorFormularioJugador" class="form-error">{{ errorFormularioJugador }}</p>
            <button type="submit" class="btn-edit" :disabled="creandoJugador">
              {{ creandoJugador ? 'Guardando...' : 'Guardar jugador' }}
            </button>
          </form>
        </Transition>

        <!-- Estado: cargando -->
        <div v-if="cargandoJugadores" class="state-box">
          <div class="spinner" />
          <p class="state-text">Cargando plantilla...</p>
        </div>

        <!-- Estado: error -->
        <div v-else-if="errorJugadores" class="state-box">
          <p class="state-text">{{ errorJugadores }}</p>
        </div>

        <!-- Estado: vacío -->
        <div v-else-if="players.length === 0" class="state-box">
          <p class="state-text">Esta selección aún no tiene jugadores registrados.</p>
        </div>

        <!-- Listado -->
        <ul v-else class="player-list">
          <li v-for="player in players" :key="player.id" class="player-item">
            <!-- Modo edición -->
            <form
              v-if="edicionJugadorId === player.id"
              class="player-edit-form"
              @submit.prevent="guardarEdicionJugador"
            >
              <div class="player-edit-form__grid">
                <input v-model="formularioEdicionJugador.name" type="text" class="field__input" placeholder="Nombre" required />
                <input v-model.number="formularioEdicionJugador.number" type="number" min="1" max="99" class="field__input" />
                <select v-model="formularioEdicionJugador.position" class="field__input">
                  <option v-for="p in POSICIONES_JUGADOR" :key="p" :value="p">{{ p }}</option>
                </select>
                <select v-model="formularioEdicionJugador.club" class="field__input">
                  <option value="" disabled>Selecciona un club</option>
                  <option v-for="club in CLUBES_REFERENCIA" :key="club" :value="club">{{ club }}</option>
                </select>
              </div>
              <p v-if="errorEdicionJugador" class="form-error">{{ errorEdicionJugador }}</p>
              <div class="player-edit-form__actions">
                <button type="submit" class="btn-edit" :disabled="guardandoEdicionJugador">
                  {{ guardandoEdicionJugador ? 'Guardando...' : 'Guardar' }}
                </button>
                <button type="button" class="btn-cancel" @click="cancelarEdicionJugador">Cancelar</button>
              </div>
            </form>

            <!-- Modo visualización -->
            <template v-else>
              <span class="player-item__number">{{ player.number }}</span>
              <div class="player-item__info">
                <p class="player-item__name">{{ player.name }}</p>
                <p class="player-item__meta">{{ player.position }} · {{ player.club || 'Sin club' }}</p>
              </div>
              <div v-if="user" class="player-item__actions">
                <button class="player-item__edit" title="Editar" @click="iniciarEdicionJugador(player)">✎</button>
                <button class="player-item__delete" title="Eliminar" @click="eliminarJugador(player.id)">✕</button>
              </div>
            </template>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
.team-detail {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  max-width: 720px;
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

.team-card-detail {
  border-radius: var(--radius-xl);
  padding: var(--space-2xl);
}

.team-detail__header {
  display: flex;
  align-items: center;
  gap: var(--space-lg);
}

.team-detail__flag {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.team-detail__flag--fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  background: var(--bg-surface);
}

.team-detail__name {
  font-size: 1.6rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.team-detail__meta {
  font-size: 0.85rem;
  color: var(--text-gold);
  margin-top: 4px;
}

.divider {
  height: 1px;
  margin: var(--space-xl) 0;
  background: linear-gradient(90deg, transparent, var(--border-glass), transparent);
}

.team-detail__info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
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

.team-detail__actions {
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

/* ── Plantilla de jugadores ────────────────────────────────── */
.squad {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.squad__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  flex-wrap: wrap;
}

.squad__title {
  font-size: 1.15rem;
  font-weight: 700;
}

.btn-add-player {
  padding: 8px 16px;
  border-radius: var(--radius-md);
  background: var(--gold-gradient);
  color: #0a0e1a;
  font-weight: 700;
  font-size: 0.82rem;
}

.player-form {
  padding: var(--space-lg);
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.player-form__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: var(--space-md);
}

.form-error {
  color: #ff6b6b;
  font-size: 0.85rem;
}

.player-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.player-item {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md);
  border-radius: var(--radius-md);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
}

.player-item__number {
  width: 32px;
  height: 32px;
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

.player-item__info {
  flex: 1;
}

.player-item__name {
  font-size: 0.95rem;
  font-weight: 600;
}

.player-item__meta {
  font-size: 0.78rem;
  color: var(--text-muted);
}

.player-item__actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.player-item__delete,
.player-item__edit {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  background: var(--bg-glass);
  font-size: 0.75rem;
  flex-shrink: 0;
  transition: all var(--transition-fast);
}

.player-item__delete:hover {
  color: #ff6b6b;
  background: rgba(255, 107, 107, 0.1);
}

.player-item__edit:hover {
  color: var(--text-gold);
  background: rgba(255, 214, 10, 0.1);
}

.player-edit-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  width: 100%;
}

.player-edit-form__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: var(--space-sm);
}

.player-edit-form__actions {
  display: flex;
  gap: var(--space-sm);
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
