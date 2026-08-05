// Página de jugadores de un equipo, mostrando la plantilla completa con opciones de edición y eliminación
<script setup lang="ts">
// Tipo de equipo
import type { Team } from '~/composables/useTeams'
// Tipo de jugador
import type { Player } from '~/composables/usePlayers'
// Nombres reales por selección, para el select de nombre de jugador
import { NOMBRES_JUGADORES_POR_SELECCION, OTRO_NOMBRE_JUGADOR as OTRO_NOMBRE } from '~/utils/worldCupData'

// Ruta actual, para leer el id del equipo
const route = useRoute()
// Id del equipo, tomado de la URL
const id = route.params.id as string

// Carga de equipo por id
const { fetchTeamById } = useTeams()
// Jugadores del equipo, estado de carga y acción de eliminar
const {
  players,
  loading: cargandoJugadores,
  error: errorJugadores,
  fetchPlayersByTeam,
  deletePlayer,
} = usePlayers()
// Usuario autenticado (controla si se muestran acciones de administración)
const { user } = useAuth()
// Diálogo de confirmación para eliminar
const { confirmar } = useConfirm()
// Verifica si el equipo tiene un partido en vivo (bloquea eliminar jugadores)
const { equipoTienePartidoEnVivo } = useMatches()
// Goles totales por jugador, para mostrarlos en la lista
const { obtenerGolesPorJugador } = useStatistics()

// Equipo cargado
const team = ref<Team | null>(null)
// Mapa de goles por id de jugador
const golesPorJugador = ref<Map<string, number>>(new Map())

// Carga el equipo, sus jugadores y los goles totales
const cargar = () => {
  fetchTeamById(id).then((resultado) => { team.value = resultado })
  fetchPlayersByTeam(id)
  obtenerGolesPorJugador().then((mapa) => { golesPorJugador.value = mapa })
}

onMounted(cargar)

// Nombres reales disponibles para la selección, más la opción de escribir uno propio
const nombresDisponibles = computed(() => {
  const reales = NOMBRES_JUGADORES_POR_SELECCION[team.value?.name ?? '']
  return reales ? [...reales, OTRO_NOMBRE] : [OTRO_NOMBRE]
})

// Mensaje de aviso si la plantilla no cumple los mínimos de FIFA (23 jugadores, 3 porteros)
const avisoPlantilla = computed(() => {
  if (players.value.length === 0) return ''
  const porteros = players.value.filter((p) => p.position === 'Portero').length
  if (players.value.length < 23) {
    return `La plantilla tiene ${players.value.length} jugador(es). FIFA exige un mínimo de 23 convocados.`
  }
  if (porteros < 3) {
    return `La plantilla solo tiene ${porteros} portero(s). FIFA exige un mínimo de 3.`
  }
  return ''
})

// Texto de búsqueda libre (por nombre o club)
const busqueda = ref('')
// Jugadores que coinciden con el texto de búsqueda
const jugadoresFiltrados = computed(() => {
  const texto = busqueda.value.trim().toLowerCase()
  if (!texto) return players.value
  return players.value.filter(
    (p) => p.name.toLowerCase().includes(texto) || p.club.toLowerCase().includes(texto),
  )
})

// Controla la visibilidad del formulario de creación de jugador
const mostrarFormularioJugador = ref(false)

// Oculta el formulario y recarga la plantilla tras crear un jugador
const jugadorCreado = async () => {
  mostrarFormularioJugador.value = false
  await fetchPlayersByTeam(id)
}

// Id del jugador que se está editando actualmente (null si ninguno)
const edicionJugadorId = ref<string | null>(null)

// Activa el modo edición para un jugador
const iniciarEdicionJugador = (player: Player) => {
  edicionJugadorId.value = player.id
}

// Cancela la edición en curso
const cancelarEdicionJugador = () => {
  edicionJugadorId.value = null
}

// Sale del modo edición y recarga la plantilla tras guardar cambios
const jugadorEditado = async () => {
  edicionJugadorId.value = null
  await fetchPlayersByTeam(id)
}

// Indica si se está eliminando un jugador
const eliminandoJugador = ref(false)
// Mensaje de error al eliminar un jugador
const errorEliminarJugador = ref('')

// Confirma y elimina un jugador, bloqueando la acción si el equipo tiene un partido en vivo
const eliminarJugador = async (playerId: string) => {
  errorEliminarJugador.value = ''
  eliminandoJugador.value = true
  try {
    const jugando = await equipoTienePartidoEnVivo(id)
    if (jugando) {
      errorEliminarJugador.value = 'No se puede eliminar: esta selección tiene un partido en vivo ahora mismo.'
      return
    }

    const confirmado = await confirmar('¿Eliminar este jugador de la plantilla?')
    if (!confirmado) return
    await deletePlayer(playerId)
    await fetchPlayersByTeam(id)
  } catch (err) {
    console.error('Error al eliminar jugador:', err)
  } finally {
    eliminandoJugador.value = false
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
      <div class="players-header__actions">
        <NuxtLink :to="`/teams/${id}/lineup`" class="btn-lineup"> Ver alineación</NuxtLink>
        <button v-if="user" class="btn-add-player" @click="mostrarFormularioJugador = !mostrarFormularioJugador">
          {{ mostrarFormularioJugador ? 'Cancelar' : '+ Agregar jugador' }}
        </button>
      </div>
    </header>

    <p v-if="avisoPlantilla" class="form-hint">⚠ {{ avisoPlantilla }}</p>

    <Transition name="fade">
      <PlayerForm v-if="mostrarFormularioJugador" :team-id="id" :team-name="team?.name ?? ''" @created="jugadorCreado"
        @cancel="mostrarFormularioJugador = false" />
    </Transition>

    <input v-model="busqueda" type="text" class="field__input search-input animate-slide-up delay-1"
      placeholder="Buscar jugador por nombre o club..." />
    <p v-if="errorEliminarJugador" class="form-error">{{ errorEliminarJugador }}</p>

    <p v-if="errorEliminarJugador" class="form-error">{{ errorEliminarJugador }}</p>

    <div v-if="cargandoJugadores" class="state-box">
      <div class="spinner" />
      <p class="state-text">Cargando plantilla...</p>
    </div>

    <div v-else-if="errorJugadores" class="state-box">
      <p class="state-text">{{ errorJugadores }}</p>
      <button class="btn-refetch" @click="cargar">Reintentar</button>
    </div>

    <div v-else-if="jugadoresFiltrados.length === 0" class="state-box">
      <p class="state-text">
        {{ players.length === 0 ? 'Esta selección aún no tiene jugadores registrados.' : 'No se encontraron jugadores con esa búsqueda.' }}
      </p>
    </div>

    <ul v-else class="player-list">
      <li v-for="player in jugadoresFiltrados" :key="player.id" class="player-item">
        <PlayerEditForm v-if="edicionJugadorId === player.id" :player="player" :nombres-disponibles="nombresDisponibles"
          @saved="jugadorEditado" @cancel="cancelarEdicionJugador" />

        <template v-else>
          <span class="player-item__number">{{ player.number }}</span>
          <div class="player-item__info">
            <p class="player-item__name">{{ player.name }}</p>
            <p class="player-item__meta">
              {{ player.position }} · {{ player.club || 'Sin club' }} ·
              <span class="player-item__goals"> {{ golesPorJugador.get(player.id) ?? 0 }} goles</span>
            </p>
          </div>
          <div v-if="user" class="player-item__actions">
            <button class="player-item__edit" title="Editar" @click="iniciarEdicionJugador(player)">✎</button>
            <button class="player-item__delete" title="Eliminar" :disabled="eliminandoJugador"
              @click="eliminarJugador(player.id)">✕</button>
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

.players-header__actions {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
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

.btn-lineup {
  padding: 10px 18px;
  border-radius: var(--radius-md);
  background: var(--bg-surface);
  border: 1px solid var(--border-glass);
  color: var(--text-gold);
  font-weight: 700;
  font-size: 0.85rem;
  transition: all var(--transition-fast);
}

.btn-lineup:hover {
  border-color: var(--gold-start);
  transform: translateY(-1px);
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

.form-hint {
  padding: 10px 16px;
  border-radius: var(--radius-md);
  background: rgba(255, 214, 10, 0.08);
  border: 1px solid rgba(255, 214, 10, 0.25);
  color: var(--text-gold);
  font-size: 0.82rem;
  width: fit-content;
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
  display: flex;
  align-items: center;
  gap: 8px;
}

.player-item__badge {
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(255, 214, 10, 0.12);
  color: var(--text-gold);
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.player-item__goals {
  color: var(--text-gold);
  font-weight: 600;
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

.player-item__delete:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.player-item__edit:hover {
  color: var(--text-gold);
  background: rgba(255, 214, 10, 0.1);
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