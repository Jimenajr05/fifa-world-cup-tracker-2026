// Página de detalle de un partido, mostrando información detallada y la alineación de ambos equipos
<script setup lang="ts">
// Tipo de Timestamp de Firestore
import type { Timestamp } from 'firebase/firestore'
// Tipo de partido
import type { Match } from '~/composables/useMatches'

// Ruta y router, para leer el id del partido y navegar tras eliminar
const route = useRoute()
const router = useRouter()
// Carga de partido por id y eliminación
const { fetchMatchById, deleteMatch } = useMatches()
// Carga de equipos (usada para resolver nombres de equipo)
const { fetchTeams } = useTeams()
// Carga de jugadores por equipo, para mostrar las alineaciones
const { fetchPlayersByTeam, players: jugadoresCargados } = usePlayers()

// Controla si se muestra la alineación del equipo local
const mostrarAlineacionLocal = ref(false)
// Controla si se muestra la alineación del equipo visitante
const mostrarAlineacionVisitante = ref(false)
// Alineación cargada del equipo local
const alineacionLocal = ref<{ id: string; name: string; number: number; position: string; titular: boolean }[]>([])
// Alineación cargada del equipo visitante
const alineacionVisitante = ref<{ id: string; name: string; number: number; position: string; titular: boolean }[]>([])
// Indica si una alineación se está cargando
const cargandoAlineacion = ref(false)

// Etiquetas en plural para agrupar la alineación por posición
const PLURAL_POSICION_ALINEACION: Record<string, string> = {
  Portero: 'Porteros',
  Defensa: 'Defensas',
  Mediocampista: 'Mediocampistas',
  Delantero: 'Delanteros',
}

// Agrupa una alineación por posición y ordena cada grupo por número de camiseta
// Solo se incluyen los jugadores titulares (los 11 que forman la alineación)
const agruparAlineacion = (jugadores: { id: string; name: string; number: number; position: string; titular: boolean }[]) => {
  const titulares = jugadores.filter((j) => j.titular)
  return Object.entries(PLURAL_POSICION_ALINEACION).map(([posicion, etiqueta]) => ({
    posicion,
    etiqueta,
    jugadores: titulares.filter((j) => j.position === posicion).sort((a, b) => a.number - b.number),
  })).filter((grupo) => grupo.jugadores.length > 0)
}

// Alineación local agrupada por posición
const alineacionLocalAgrupada = computed(() => agruparAlineacion(alineacionLocal.value))
// Alineación visitante agrupada por posición
const alineacionVisitanteAgrupada = computed(() => agruparAlineacion(alineacionVisitante.value))

// Muestra/oculta la alineación de un lado, cargándola de Firestore la primera vez que se abre
const alternarAlineacion = async (lado: 'local' | 'visitante') => {
  if (!match.value) return

  if (lado === 'local') {
    mostrarAlineacionLocal.value = !mostrarAlineacionLocal.value
    if (mostrarAlineacionLocal.value && alineacionLocal.value.length === 0 && match.value.homeTeamId) {
      cargandoAlineacion.value = true
      await fetchPlayersByTeam(match.value.homeTeamId)
      alineacionLocal.value = jugadoresCargados.value
      cargandoAlineacion.value = false
    }
  } else {
    mostrarAlineacionVisitante.value = !mostrarAlineacionVisitante.value
    if (mostrarAlineacionVisitante.value && alineacionVisitante.value.length === 0 && match.value.awayTeamId) {
      cargandoAlineacion.value = true
      await fetchPlayersByTeam(match.value.awayTeamId)
      alineacionVisitante.value = jugadoresCargados.value
      cargandoAlineacion.value = false
    }
  }
}
// Usuario, perfil (para favoritos) y acción de alternar partido favorito
const { user, perfil, alternarPartidoFavorito } = useAuth()
// Diálogo de confirmación para eliminar
const { confirmar } = useConfirm()

// Id del partido, tomado de la URL
const id = route.params.id as string

// Partido cargado
const match = ref<Match | null>(null)
// Indica si el partido actual está en los favoritos del usuario
const esFavorito = computed(() => !!match.value && (perfil.value?.partidosFavoritos.includes(match.value.id) ?? false))
// Indica si el partido se está cargando
const loading = ref(false)
// Mensaje de error al cargar el partido
const error = ref('')
// Controla si se muestra el formulario de edición
const editando = ref(false)

// Carga el partido por id
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

// Oculta el formulario de edición y recarga el partido
const partidoGuardado = async () => {
  editando.value = false
  await cargar()
}

// Mensaje de error al eliminar el partido
const errorEliminar = ref('')

// Confirma y elimina el partido, luego navega de vuelta al listado
const eliminar = async () => {
  if (!match.value) return
  const confirmado = await confirmar(`¿Eliminar el partido ${match.value.homeTeam} vs ${match.value.awayTeam}?`)
  if (!confirmado) return
  errorEliminar.value = ''
  try {
    await deleteMatch(match.value.id)
    router.push('/matches')
  } catch (err) {
    console.error('Error al eliminar partido:', err)
    errorEliminar.value = mensajeError(err, 'No se pudo eliminar el partido.')
  }
}

// Formatea un Timestamp de Firestore como fecha y hora completa en español
const formatearFecha = (ts: Timestamp) =>
  ts.toDate().toLocaleString('es', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
</script>

<template>
  <div class="match-detail animate-fade-in">
    <NuxtLink to="/matches" class="back-link">← Volver a partidos</NuxtLink>

    <div v-if="loading" class="state-box">
      <div class="spinner" />
      <p class="state-text">Cargando partido...</p>
    </div>

    <div v-else-if="error" class="state-box">
      <p class="state-text">{{ error }}</p>
      <button class="btn-refetch" @click="cargar">Reintentar</button>
    </div>

    <div v-else-if="match" class="match-card-detail glass-strong animate-slide-up">
      <template v-if="!editando">
        <div class="match-detail__header">
          <span class="badge" :class="`badge--${match.status.replace(' ', '').toLowerCase()}`">{{ match.status }}</span>
          <span class="match-detail__stage">{{ match.stage }}<template v-if="match.group"> · Grupo {{ match.group
              }}</template></span>
        </div>

        <div class="match-detail__scoreboard">
          <div class="match-detail__side">
            <span class="match-detail__team">{{ match.homeTeam }}</span>
            <button class="lineup-btn" @click="alternarAlineacion('local')">
              {{ mostrarAlineacionLocal ? 'Ocultar' : 'Ver alineación' }}
            </button>
          </div>

          <span class="match-detail__score">{{ match.homeScore ?? '-' }} : {{ match.awayScore ?? '-' }}</span>

          <div class="match-detail__side">
            <span class="match-detail__team">{{ match.awayTeam }}</span>
            <button class="lineup-btn" @click="alternarAlineacion('visitante')">
              {{ mostrarAlineacionVisitante ? 'Ocultar' : 'Ver alineación' }}
            </button>
          </div>
        </div>

        <div v-if="mostrarAlineacionLocal || mostrarAlineacionVisitante" class="lineups">
          <div v-if="mostrarAlineacionLocal" class="lineup-panel glass">
            <p class="lineup-panel__title">{{ match.homeTeam }}</p>
            <div v-if="cargandoAlineacion && alineacionLocal.length === 0" class="lineup-panel__loading">
              <div class="spinner spinner--sm" />
            </div>
            <p v-else-if="!match.homeTeamId || alineacionLocal.length === 0" class="lineup-panel__empty">
              Esta selección todavía no tiene jugadores registrados.
            </p>
            <div v-else v-for="grupo in alineacionLocalAgrupada" :key="grupo.posicion" class="lineup-group">
              <p class="lineup-group__title">{{ grupo.etiqueta }}</p>
              <p v-for="j in grupo.jugadores" :key="j.id" class="lineup-group__player">
                <span class="lineup-group__number">{{ j.number }}</span> {{ j.name }}
              </p>
            </div>
          </div>

          <div v-if="mostrarAlineacionVisitante" class="lineup-panel glass">
            <p class="lineup-panel__title">{{ match.awayTeam }}</p>
            <div v-if="cargandoAlineacion && alineacionVisitante.length === 0" class="lineup-panel__loading">
              <div class="spinner spinner--sm" />
            </div>
            <p v-else-if="!match.awayTeamId || alineacionVisitante.length === 0" class="lineup-panel__empty">
              Esta selección todavía no tiene jugadores registrados.
            </p>
            <div v-else v-for="grupo in alineacionVisitanteAgrupada" :key="grupo.posicion" class="lineup-group">
              <p class="lineup-group__title">{{ grupo.etiqueta }}</p>
              <p v-for="j in grupo.jugadores" :key="j.id" class="lineup-group__player">
                <span class="lineup-group__number">{{ j.number }}</span> {{ j.name }}
              </p>
            </div>
          </div>
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
          <button class="btn-favorite" :class="{ 'btn-favorite--activo': esFavorito }"
            @click="alternarPartidoFavorito(match.id)">
            {{ esFavorito ? '★ En favoritos' : '☆ Agregar a favoritos' }}
          </button>
          <button class="btn-edit" @click="editando = true">Editar</button>
          <button class="btn-delete" @click="eliminar">Eliminar</button>
        </div>
        <p v-if="errorEliminar" class="form-error">{{ errorEliminar }}</p>
      </template>

      <MatchEditForm v-else :match="match" @saved="partidoGuardado" @cancel="editando = false" />
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

.match-detail__side {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.match-detail__team {
  font-size: 1.25rem;
  font-weight: 700;
  text-align: center;
}

.lineup-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 700;
  white-space: nowrap;
  color: var(--text-gold);
  background: rgba(255, 214, 10, 0.1);
  border: 1px solid rgba(255, 214, 10, 0.35);
  animation: pulse-glow 2.5s ease-in-out infinite;
  transition: all var(--transition-fast);
}

.lineup-btn:hover {
  background: rgba(255, 214, 10, 0.2);
  border-color: rgba(255, 214, 10, 0.6);
  transform: translateY(-2px);
}

.lineup-btn__icon {
  font-size: 1rem;
}

.lineup-btn:hover {
  color: var(--text-gold);
  border-color: rgba(255, 214, 10, 0.3);
}

.match-detail__score {
  padding: 8px 20px;
  border-radius: var(--radius-md);
  background: var(--bg-surface);
  color: var(--text-gold);
  font-size: 1.4rem;
  font-weight: 800;
  align-self: center;
}

.lineups {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--space-md);
  margin-top: var(--space-lg);
}

.lineup-panel {
  padding: var(--space-lg);
  border-radius: var(--radius-lg);
}

.lineup-panel__title {
  font-size: 0.85rem;
  font-weight: 700;
  margin-bottom: var(--space-sm);
}

.lineup-panel__loading {
  display: flex;
  justify-content: center;
  padding: var(--space-md) 0;
}

.spinner--sm {
  width: 22px;
  height: 22px;
  border-width: 2px;
}

.lineup-panel__empty {
  font-size: 0.78rem;
  color: var(--text-muted);
}

.lineup-group {
  margin-top: var(--space-sm);
}

.lineup-group__title {
  font-size: 0.68rem;
  font-weight: 700;
  color: var(--text-gold);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 4px;
}

.lineup-group__player {
  font-size: 0.82rem;
  padding: 3px 0;
}

.lineup-group__number {
  display: inline-block;
  width: 20px;
  color: var(--text-muted);
  font-weight: 700;
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
  flex-wrap: wrap;
}

.btn-favorite {
  padding: 10px 22px;
  border-radius: var(--radius-md);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 0.88rem;
  transition: all var(--transition-fast);
}

.btn-favorite--activo {
  background: rgba(255, 214, 10, 0.1);
  border-color: rgba(255, 214, 10, 0.3);
  color: var(--text-gold);
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

.form-error {
  color: #ff6b6b;
  font-size: 0.85rem;
}
</style>