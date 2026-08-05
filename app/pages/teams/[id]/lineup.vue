// Página de alineación de un equipo, mostrando titulares en la cancha y suplentes en la banca, con posibilidad de editar/mover jugadores si hay usuario autenticado
<script setup lang="ts">
// Tipo de equipo
import type { Team } from '~/composables/useTeams'
// Tipo de jugador
import type { Player } from '~/composables/usePlayers'
// Nombres reales por selección, para el select de nombre de jugador
import { NOMBRES_JUGADORES_POR_SELECCION, OTRO_NOMBRE_JUGADOR as OTRO_NOMBRE } from '~/utils/worldCupData'
// Extrae un mensaje de error amigable
import { mensajeError } from '~/utils/validation'

// Ruta actual, para leer el id del equipo
const route = useRoute()
// Id del equipo, tomado de la URL
const id = route.params.id as string

// Carga de equipo por id
const { fetchTeamById } = useTeams()
// Jugadores del equipo, estado de carga y acciones de actualizar/eliminar
const {
  players,
  loading: cargandoJugadores,
  error: errorJugadores,
  fetchPlayersByTeam,
  updatePlayer,
  deletePlayer,
} = usePlayers()
// Usuario autenticado (controla si se puede editar la alineación)
const { user } = useAuth()
// Diálogo de confirmación para eliminar
const { confirmar } = useConfirm()

// Equipo cargado
const team = ref<Team | null>(null)

// Carga el equipo y sus jugadores
const cargar = () => {
  fetchTeamById(id).then((resultado) => { team.value = resultado })
  fetchPlayersByTeam(id)
}

onMounted(cargar)

// Nombres reales disponibles para la selección, más la opción de escribir uno propio
const nombresDisponibles = computed(() => {
  const reales = NOMBRES_JUGADORES_POR_SELECCION[team.value?.name ?? '']
  return reales ? [...reales, OTRO_NOMBRE] : [OTRO_NOMBRE]
})

// Jugadores marcados como titulares
const titulares = computed(() => players.value.filter((p) => p.titular))
// Jugadores suplentes (no titulares)
const suplentes = computed(() => players.value.filter((p) => !p.titular))
// Titulares de una posición específica, para dibujar cada línea de la cancha
const porPosicion = (pos: string) => titulares.value.filter((p) => p.position === pos)

// Mensaje de aviso si la formación titular está incompleta o sin portero
const avisoFormacion = computed(() => {
  if (players.value.length === 0) return ''
  if (titulares.value.length === 0) return 'Todavía no marcaste ningún jugador como titular.'
  if (porPosicion('Portero').length === 0) return 'La alineación no tiene portero titular.'
  if (titulares.value.length < 11) return `Formación incompleta: ${titulares.value.length}/11 titulares.`
  return ''
})

// Id del jugador seleccionado para editar/mover (null si ninguno)
const edicionJugadorId = ref<string | null>(null)
// Indica si se está guardando un cambio de titularidad
const guardandoEdicionJugador = ref(false)
// Mensaje de error al editar/mover un jugador
const errorEdicionJugador = ref('')

// Selecciona un jugador para editarlo (solo si hay usuario autenticado)
const seleccionarJugador = (player: Player) => {
  if (!user.value) return
  edicionJugadorId.value = player.id
  errorEdicionJugador.value = ''
}

// Cancela la edición en curso
const cancelarEdicionJugador = () => {
  edicionJugadorId.value = null
  errorEdicionJugador.value = ''
}

// Sale del modo edición y recarga la plantilla tras guardar cambios
const jugadorEditado = async () => {
  edicionJugadorId.value = null
  await fetchPlayersByTeam(id)
}

// Envía a un titular a la banca de suplentes
const quitarDeTitulares = async (player: Player) => {
  guardandoEdicionJugador.value = true
  errorEdicionJugador.value = ''
  try {
    await updatePlayer(player.id, {
      name: player.name,
      number: player.number,
      position: player.position,
      club: player.club,
      titular: false,
    })
    edicionJugadorId.value = null
    await fetchPlayersByTeam(id)
  } catch (err) {
    console.error('Error al enviar a la banca:', err)
    errorEdicionJugador.value = mensajeError(err, 'No se pudo actualizar el jugador.')
  } finally {
    guardandoEdicionJugador.value = false
  }
}

// Confirma y elimina un jugador de la plantilla (avisando si es titular)
const eliminarJugador = async (player: Player) => {
  const mensaje = player.titular
    ? `${player.name} es titular. ¿Eliminarlo igual de la plantilla?`
    : '¿Eliminar este jugador de la plantilla?'
  const confirmado = await confirmar(mensaje)
  if (!confirmado) return
  try {
    await deletePlayer(player.id)
    edicionJugadorId.value = null
    await fetchPlayersByTeam(id)
  } catch (err) {
    console.error('Error al eliminar jugador:', err)
    errorEdicionJugador.value = mensajeError(err, 'No se pudo eliminar el jugador.')
  }
}
</script>

<template>
  <div class="lineup-page animate-fade-in">
    <NuxtLink :to="`/teams/${id}/players`" class="back-link">← Volver a la plantilla de {{ team?.name ?? '...' }}
    </NuxtLink>

    <header class="lineup-header animate-slide-up">
      <img v-if="team?.flag" :src="team.flag" :alt="team.name" class="lineup-header__flag" />
      <h1 class="lineup-title">
        Alineación de <span class="text-gold-gradient">{{ team?.name ?? '...' }}</span>
      </h1>
    </header>

    <p v-if="avisoFormacion" class="form-hint">⚠ {{ avisoFormacion }}</p>

    <div v-if="cargandoJugadores" class="state-box">
      <div class="spinner" />
      <p class="state-text">Cargando alineación...</p>
    </div>

    <div v-else-if="errorJugadores" class="state-box">
      <p class="state-text">{{ errorJugadores }}</p>
      <button class="btn-refetch" @click="cargar">Reintentar</button>
    </div>

    <div v-else-if="players.length === 0" class="state-box">
      <p class="state-text">Esta selección aún no tiene jugadores registrados.</p>
      <NuxtLink :to="`/teams/${id}/players`" class="btn-refetch">Agregar jugadores</NuxtLink>
    </div>

    <div v-else class="lineup animate-slide-up delay-1">
      <aside class="bench">
        <h2 class="bench__title">Suplentes</h2>
        <p v-if="suplentes.length === 0" class="bench__empty">Sin suplentes.</p>
        <ul class="bench__list">
          <li v-for="player in suplentes" :key="player.id" class="bench-card">
            <template v-if="edicionJugadorId === player.id">
              <div class="bench-edit-form">
                <PlayerEditForm :player="player" :nombres-disponibles="nombresDisponibles" show-delete
                  @saved="jugadorEditado" @cancel="cancelarEdicionJugador" @delete="eliminarJugador(player)" />
              </div>
            </template>
            <button v-else type="button" class="bench-card__button" :class="{ 'bench-card__button--static': !user }"
              @click="seleccionarJugador(player)">
              <span class="bench-card__avatar">👤</span>
              <span class="bench-card__info">
                <span class="bench-card__name">{{ player.name }}</span>
                <span class="bench-card__meta">{{ player.position }} · {{ player.club || 'Sin club' }}</span>
              </span>
              <span class="bench-card__number">{{ player.number }}</span>
            </button>
          </li>
        </ul>
      </aside>

      <div class="pitch-wrap">
        <div class="pitch">
          <div class="pitch__lines" />
          <div class="pitch__row" v-for="pos in ['Delantero', 'Mediocampista', 'Defensa', 'Portero']" :key="pos">
            <div v-for="player in porPosicion(pos)" :key="player.id" class="jersey">
              <template v-if="edicionJugadorId === player.id">
                <div class="jersey-actions">
                  <button type="button" class="icon-btn" title="Cerrar" @click="cancelarEdicionJugador">✕</button>
                  <button type="button" class="icon-btn icon-btn--gold" title="Enviar a la banca"
                    @click="quitarDeTitulares(player)">⬇</button>
                  <button type="button" class="icon-btn icon-btn--danger" title="Eliminar"
                    @click="eliminarJugador(player)">🗑</button>
                </div>
                <p v-if="errorEdicionJugador" class="form-error jersey-actions__error">{{ errorEdicionJugador }}</p>
              </template>
              <button v-else type="button" class="jersey__button" :class="{ 'jersey__button--static': !user }"
                @click="seleccionarJugador(player)">
                <span class="jersey__shirt"
                  :style="team?.flag ? { backgroundImage: `url(${team.flag})` } : undefined" />
                <span class="jersey__number">{{ player.number }}</span>
                <span class="jersey__name">{{ player.name }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lineup-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  max-width: 1100px;
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

.lineup-header {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.lineup-header__flag {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  object-fit: cover;
}

.lineup-title {
  font-size: clamp(1.3rem, 3vw, 1.7rem);
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

.bench-edit-form {
  width: 100%;
  padding: var(--space-md);
  border-radius: var(--radius-md);
  background: var(--bg-surface);
  border: 1px solid var(--border-glass);
}

.lineup {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: var(--space-lg);
  align-items: start;
}

.bench {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.bench__title {
  font-size: 0.95rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-secondary);
}

.bench__empty {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.bench__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.bench-card {
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.bench-card__button {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  width: 100%;
  padding: 12px var(--space-md);
  border-radius: var(--radius-lg);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  transition: transform var(--transition-fast), border-color var(--transition-fast);
  text-align: left;
  cursor: pointer;
}

.bench-card__button:hover {
  transform: translateX(2px);
  border-color: var(--gold-start);
}

.bench-card__button--static {
  cursor: default;
}

.bench-card__button--static:hover {
  transform: none;
  border-color: var(--border-subtle);
}

.bench-card__avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-glass);
  flex-shrink: 0;
  font-size: 1rem;
}

.bench-card__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.bench-card__name {
  font-size: 0.9rem;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bench-card__meta {
  font-size: 0.75rem;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bench-card__number {
  font-weight: 800;
  font-size: 0.85rem;
  color: var(--text-gold);
  flex-shrink: 0;
}

.pitch-wrap {
  border-radius: var(--radius-lg);
  overflow: hidden;
  padding: var(--space-md);
  background: radial-gradient(ellipse at top, rgba(255, 214, 10, 0.06), transparent 60%), #0a0e1a;
  border: 1px solid var(--border-glass);
}

.pitch {
  position: relative;
  min-height: 560px;
  border-radius: var(--radius-lg);
  background:
    repeating-linear-gradient(180deg,
      rgba(255, 255, 255, 0.03) 0,
      rgba(255, 255, 255, 0.03) 60px,
      transparent 60px,
      transparent 120px),
    linear-gradient(180deg, #1e6b34, #14501f 55%, #103f19);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: var(--space-xl) var(--space-md);
  overflow: hidden;
}

.pitch__lines {
  position: absolute;
  inset: var(--space-md);
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-radius: 6px;
  pointer-events: none;
}

.pitch__lines::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 2px;
  background: rgba(255, 255, 255, 0.35);
}

.pitch__lines::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 90px;
  height: 90px;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-radius: 50%;
  transform: translate(-50%, -50%);
}

.pitch__row {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: var(--space-lg);
}

.jersey {
  position: relative;
  width: 84px;
}

.jersey__button {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  width: 100%;
  animation: fadeIn 0.35s ease;
  cursor: pointer;
}

.jersey__button--static {
  cursor: default;
}

.jersey__shirt {
  display: block;
  width: 48px;
  height: 48px;
  background: var(--gold-gradient) center / cover no-repeat;
  clip-path: polygon(31% 0%, 0% 24%, 10% 42%, 23% 33%,
      23% 100%, 77% 100%, 77% 33%, 90% 42%,
      100% 24%, 69% 0%, 59% 16%, 41% 16%);
  filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.45));
  transition: transform var(--transition-fast);
  outline: 1px solid rgba(255, 255, 255, 0.25);
  outline-offset: -1px;
}

.jersey__button:hover .jersey__shirt {
  transform: translateY(-3px) scale(1.06);
}

.jersey__number {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.75rem;
  font-weight: 800;
  color: #fff;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
}

.jersey__name {
  margin-top: 2px;
  font-size: 0.72rem;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 84px;
}

.jersey-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 5px;
  border-radius: 999px;
  background: rgba(10, 14, 26, 0.85);
  backdrop-filter: blur(6px);
  border: 1px solid var(--border-glass);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
  animation: fadeIn 0.15s ease;
}

.jersey-actions__error {
  margin-top: 4px;
  font-size: 0.65rem;
  text-align: center;
  max-width: 90px;
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  color: var(--text-secondary);
  font-size: 0.75rem;
  line-height: 1;
  transition: transform var(--transition-fast), border-color var(--transition-fast);
}

.icon-btn:hover {
  transform: scale(1.08);
}

.icon-btn--gold {
  background: var(--gold-gradient);
  border-color: transparent;
  color: #0a0e1a;
}

.icon-btn--danger {
  border-color: rgba(255, 107, 107, 0.35);
  color: #ff6b6b;
}

@media (max-width: 860px) {
  .lineup {
    grid-template-columns: 1fr;
  }

  .pitch {
    min-height: 460px;
  }
}
</style>