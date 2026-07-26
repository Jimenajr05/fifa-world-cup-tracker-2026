<script setup lang="ts">
import type { Team } from '~/composables/useTeams'
import type { NewPlayer, Player } from '~/composables/usePlayers'
import { POSICIONES_JUGADOR, CLUBES_REFERENCIA } from '~/utils/worldCupData'

const route = useRoute()
const id = route.params.id as string

const { fetchTeamById } = useTeams()
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

const team = ref<Team | null>(null)

const cargar = () => {
  fetchTeamById(id).then((resultado) => { team.value = resultado })
  fetchPlayersByTeam(id)
}

onMounted(cargar)

// ── Búsqueda dentro de la plantilla ─────────────────────────
const busqueda = ref('')
const jugadoresFiltrados = computed(() => {
  const texto = busqueda.value.trim().toLowerCase()
  if (!texto) return players.value
  return players.value.filter(
    (p) => p.name.toLowerCase().includes(texto) || p.club.toLowerCase().includes(texto),
  )
})

// ── Alta de jugador ──────────────────────────────────────────
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

// ── Edición de un jugador existente ──────────────────────────
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
</script>

<template>
  <div class="players-page animate-fade-in">
    <NuxtLink :to="`/teams/${id}`" class="back-link">← Volver a {{ team?.name ?? 'la selección' }}</NuxtLink>

    <header class="players-header animate-slide-up">
      <div class="players-header__team">
        <img v-if="team?.flag" :src="team.flag" :alt="team.name" class="players-header__flag" />
        <div>
          <h1 class="players-title">
            Plantilla de <span class="text-gold-gradient">{{ team?.name ?? '...' }}</span>
          </h1>
          <p class="players-subtitle">Jugadores convocados para el Mundial 2026</p>
        </div>
      </div>
      <button v-if="user" class="btn-add-player" @click="mostrarFormularioJugador = !mostrarFormularioJugador">
        {{ mostrarFormularioJugador ? 'Cancelar' : '+ Agregar jugador' }}
      </button>
    </header>

    <!-- Formulario de alta -->
    <Transition name="fade">
      <form v-if="mostrarFormularioJugador" class="player-form glass animate-slide-up" @submit.prevent="agregarJugador">
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

    <!-- Búsqueda -->
    <input
      v-model="busqueda"
      type="text"
      class="field__input search-input animate-slide-up delay-1"
      placeholder="Buscar jugador por nombre o club..."
    />

    <!-- Estado: cargando -->
    <div v-if="cargandoJugadores" class="state-box">
      <div class="spinner" />
      <p class="state-text">Cargando plantilla...</p>
    </div>

    <!-- Estado: error -->
    <div v-else-if="errorJugadores" class="state-box">
      <p class="state-text">{{ errorJugadores }}</p>
      <button class="btn-refetch" @click="cargar">Reintentar</button>
    </div>

    <!-- Estado: vacío -->
    <div v-else-if="jugadoresFiltrados.length === 0" class="state-box">
      <p class="state-text">
        {{ players.length === 0 ? 'Esta selección aún no tiene jugadores registrados.' : 'No se encontraron jugadores con esa búsqueda.' }}
      </p>
    </div>

    <!-- Listado -->
    <ul v-else class="player-list">
      <li v-for="player in jugadoresFiltrados" :key="player.id" class="player-item">
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
</template>

<style scoped>
.players-page {
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

.players-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  flex-wrap: wrap;
}

.players-header__team {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.players-header__flag {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
}

.players-title {
  font-size: clamp(1.3rem, 3vw, 1.7rem);
  font-weight: 800;
  letter-spacing: -0.02em;
}

.players-subtitle {
  color: var(--text-secondary);
  font-size: 0.85rem;
  margin-top: 2px;
}

.btn-add-player {
  padding: 10px 18px;
  border-radius: var(--radius-md);
  background: var(--gold-gradient);
  color: #0a0e1a;
  font-weight: 700;
  font-size: 0.85rem;
}

.player-form {
  padding: var(--space-xl);
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

.search-input {
  max-width: 360px;
}

.form-error {
  color: #ff6b6b;
  font-size: 0.85rem;
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

.btn-cancel {
  padding: 10px 22px;
  border-radius: var(--radius-md);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 0.88rem;
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
