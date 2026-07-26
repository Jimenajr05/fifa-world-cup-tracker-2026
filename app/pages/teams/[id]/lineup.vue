<script setup lang="ts">
import type { Team } from '~/composables/useTeams'
import type { NewPlayer, Player } from '~/composables/usePlayers'
import { POSICIONES_JUGADOR, CLUBES_REFERENCIA, NOMBRES_JUGADORES_POR_SELECCION, OTRO_NOMBRE_JUGADOR as OTRO_NOMBRE } from '~/utils/worldCupData'
import { mensajeError } from '~/utils/validation'

const route = useRoute()
const id = route.params.id as string

const { fetchTeamById } = useTeams()
const {
  players,
  loading: cargandoJugadores,
  error: errorJugadores,
  fetchPlayersByTeam,
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

// Nombres REALES convocados 2026 de esta selección (si hay datos verificados);
// si no hay datos para esta selección, solo queda "Otro" para escribirlo a mano
const nombresDisponibles = computed(() => {
  const reales = NOMBRES_JUGADORES_POR_SELECCION[team.value?.name ?? '']
  return reales ? [...reales, OTRO_NOMBRE] : [OTRO_NOMBRE]
})

// ── Titulares en la cancha, resto en el banco de suplentes ──
const titulares = computed(() => players.value.filter((p) => p.titular))
const suplentes = computed(() => players.value.filter((p) => !p.titular))
const porPosicion = (pos: string) => titulares.value.filter((p) => p.position === pos)

// Aviso no bloqueante: una alineación real necesita 11 titulares con 1 portero
const avisoFormacion = computed(() => {
  if (players.value.length === 0) return ''
  if (titulares.value.length === 0) return 'Todavía no marcaste ningún jugador como titular.'
  if (porPosicion('Portero').length === 0) return 'La alineación no tiene portero titular.'
  if (titulares.value.length < 11) return `Formación incompleta: ${titulares.value.length}/11 titulares.`
  return ''
})

// ── Edición / eliminación al hacer clic sobre un jugador ─────
const edicionJugadorId = ref<string | null>(null)
const guardandoEdicionJugador = ref(false)
const errorEdicionJugador = ref('')

const formularioEdicionJugador = reactive<Omit<NewPlayer, 'teamId'>>({
  name: '',
  number: 1,
  position: POSICIONES_JUGADOR[0],
  club: '',
  titular: false,
})

const nombreSeleccionadoEdicion = ref('')
const escribirNombrePropioEdicion = computed(() => nombreSeleccionadoEdicion.value === OTRO_NOMBRE)
watch(nombreSeleccionadoEdicion, (valor) => {
  if (valor) formularioEdicionJugador.name = valor === OTRO_NOMBRE ? '' : valor
})

const seleccionarJugador = (player: Player) => {
  if (!user.value) return
  edicionJugadorId.value = player.id
  formularioEdicionJugador.name = player.name
  formularioEdicionJugador.number = player.number
  formularioEdicionJugador.position = player.position
  formularioEdicionJugador.club = player.club
  formularioEdicionJugador.titular = player.titular
  nombreSeleccionadoEdicion.value = nombresDisponibles.value.includes(player.name) ? player.name : OTRO_NOMBRE
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
    errorEdicionJugador.value = mensajeError(err, 'No se pudo guardar el jugador.')
  } finally {
    guardandoEdicionJugador.value = false
  }
}

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
    <NuxtLink :to="`/teams/${id}/players`" class="back-link">← Volver a la plantilla de {{ team?.name ?? '...' }}</NuxtLink>

    <header class="lineup-header animate-slide-up">
      <img v-if="team?.flag" :src="team.flag" :alt="team.name" class="lineup-header__flag" />
      <h1 class="lineup-title">
        Alineación de <span class="text-gold-gradient">{{ team?.name ?? '...' }}</span>
      </h1>
    </header>

    <p v-if="avisoFormacion" class="form-hint">⚠ {{ avisoFormacion }}</p>

    <!-- Estado: cargando -->
    <div v-if="cargandoJugadores" class="state-box">
      <div class="spinner" />
      <p class="state-text">Cargando alineación...</p>
    </div>

    <!-- Estado: error -->
    <div v-else-if="errorJugadores" class="state-box">
      <p class="state-text">{{ errorJugadores }}</p>
      <button class="btn-refetch" @click="cargar">Reintentar</button>
    </div>

    <!-- Estado: vacío -->
    <div v-else-if="players.length === 0" class="state-box">
      <p class="state-text">Esta selección aún no tiene jugadores registrados.</p>
      <NuxtLink :to="`/teams/${id}/players`" class="btn-refetch">Agregar jugadores</NuxtLink>
    </div>

    <!-- Alineación -->
    <div v-else class="lineup animate-slide-up delay-1">
      <!-- Suplentes -->
      <aside class="bench">
        <h2 class="bench__title">Suplentes</h2>
        <p v-if="suplentes.length === 0" class="bench__empty">Sin suplentes.</p>
        <ul class="bench__list">
          <li v-for="player in suplentes" :key="player.id" class="bench-card">
            <template v-if="edicionJugadorId === player.id">
              <form class="player-edit-form" @submit.prevent="guardarEdicionJugador">
                <div class="player-edit-form__grid">
                  <select v-model="nombreSeleccionadoEdicion" class="field__input" required>
                    <option value="" disabled>Selecciona un nombre</option>
                    <option v-for="n in nombresDisponibles" :key="n" :value="n">{{ n }}</option>
                  </select>
                  <input
                    v-if="escribirNombrePropioEdicion"
                    v-model="formularioEdicionJugador.name"
                    type="text"
                    class="field__input"
                    placeholder="Escribe el nombre del jugador"
                    required
                  />
                  <input v-model.number="formularioEdicionJugador.number" type="number" min="1" max="26" class="field__input" />
                  <select v-model="formularioEdicionJugador.position" class="field__input">
                    <option v-for="p in POSICIONES_JUGADOR" :key="p" :value="p">{{ p }}</option>
                  </select>
                  <select v-model="formularioEdicionJugador.club" class="field__input">
                    <option value="" disabled>Selecciona un club</option>
                    <option v-for="club in CLUBES_REFERENCIA" :key="club" :value="club">{{ club }}</option>
                  </select>
                </div>
                <label class="field__checkbox">
                  <input v-model="formularioEdicionJugador.titular" type="checkbox" />
                  <span>Titular</span>
                </label>
                <p v-if="errorEdicionJugador" class="form-error">{{ errorEdicionJugador }}</p>
                <div class="player-edit-form__actions">
                  <button type="submit" class="btn-edit" :disabled="guardandoEdicionJugador">
                    {{ guardandoEdicionJugador ? 'Guardando...' : 'Guardar' }}
                  </button>
                  <button type="button" class="btn-delete-inline" @click="eliminarJugador(player)">Eliminar</button>
                  <button type="button" class="btn-cancel" @click="cancelarEdicionJugador">Cancelar</button>
                </div>
              </form>
            </template>
            <button v-else type="button" class="bench-card__button" :class="{ 'bench-card__button--static': !user }" @click="seleccionarJugador(player)">
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

      <!-- Cancha -->
      <div class="pitch-wrap">
        <div class="pitch">
          <div class="pitch__lines" />
          <div class="pitch__row" v-for="pos in ['Delantero', 'Mediocampista', 'Defensa', 'Portero']" :key="pos">
            <div v-for="player in porPosicion(pos)" :key="player.id" class="jersey">
              <template v-if="edicionJugadorId === player.id">
                <form class="player-edit-form jersey-edit-form" @submit.prevent="guardarEdicionJugador">
                  <div class="player-edit-form__grid">
                    <select v-model="nombreSeleccionadoEdicion" class="field__input" required>
                      <option value="" disabled>Selecciona un nombre</option>
                      <option v-for="n in nombresDisponibles" :key="n" :value="n">{{ n }}</option>
                    </select>
                    <input
                      v-if="escribirNombrePropioEdicion"
                      v-model="formularioEdicionJugador.name"
                      type="text"
                      class="field__input"
                      placeholder="Escribe el nombre del jugador"
                      required
                    />
                    <input v-model.number="formularioEdicionJugador.number" type="number" min="1" max="26" class="field__input" />
                    <select v-model="formularioEdicionJugador.position" class="field__input">
                      <option v-for="p in POSICIONES_JUGADOR" :key="p" :value="p">{{ p }}</option>
                    </select>
                    <select v-model="formularioEdicionJugador.club" class="field__input">
                      <option value="" disabled>Selecciona un club</option>
                      <option v-for="club in CLUBES_REFERENCIA" :key="club" :value="club">{{ club }}</option>
                    </select>
                  </div>
                  <label class="field__checkbox">
                    <input v-model="formularioEdicionJugador.titular" type="checkbox" />
                    <span>Titular</span>
                  </label>
                  <p v-if="errorEdicionJugador" class="form-error">{{ errorEdicionJugador }}</p>
                  <div class="player-edit-form__actions">
                    <button type="submit" class="btn-edit" :disabled="guardandoEdicionJugador">
                      {{ guardandoEdicionJugador ? 'Guardando...' : 'Guardar' }}
                    </button>
                    <button type="button" class="btn-delete-inline" @click="eliminarJugador(player)">Eliminar</button>
                    <button type="button" class="btn-cancel" @click="cancelarEdicionJugador">Cancelar</button>
                  </div>
                </form>
              </template>
              <button v-else type="button" class="jersey__button" :class="{ 'jersey__button--static': !user }" @click="seleccionarJugador(player)">
                <span
                  class="jersey__shirt"
                  :style="team?.flag ? { backgroundImage: `url(${team.flag})` } : undefined"
                />
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

.field__checkbox {
  display: flex;
  align-items: center;
  gap: 10px;
  width: fit-content;
  padding: 10px 16px;
  border-radius: var(--radius-md);
  background: var(--bg-surface);
  border: 1px solid var(--border-glass);
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-primary);
  cursor: pointer;
}

.field__checkbox input {
  width: 18px;
  height: 18px;
  accent-color: var(--gold-start);
  cursor: pointer;
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

.btn-delete-inline {
  padding: 10px 22px;
  border-radius: var(--radius-md);
  background: var(--bg-surface);
  border: 1px solid rgba(255, 107, 107, 0.3);
  color: #ff6b6b;
  font-weight: 600;
  font-size: 0.88rem;
}

.btn-delete-inline:hover {
  background: rgba(255, 107, 107, 0.08);
}

.player-edit-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  width: 100%;
  padding: var(--space-md);
  border-radius: var(--radius-md);
  background: var(--bg-surface);
  border: 1px solid var(--border-glass);
}

.player-edit-form__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: var(--space-sm);
}

.player-edit-form__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
}

/* ── Alineación: suplentes + cancha ─────────────────────────── */
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

/* Cancha */
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
    repeating-linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.03) 0,
      rgba(255, 255, 255, 0.03) 60px,
      transparent 60px,
      transparent 120px
    ),
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
  clip-path: polygon(
    31% 0%, 0% 24%, 10% 42%, 23% 33%,
    23% 100%, 77% 100%, 77% 33%, 90% 42%,
    100% 24%, 69% 0%, 59% 16%, 41% 16%
  );
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

.jersey-edit-form {
  width: 220px;
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
