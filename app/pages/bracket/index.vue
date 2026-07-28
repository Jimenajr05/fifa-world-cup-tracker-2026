<script setup lang="ts">
import type { Match } from '~/composables/useMatches'
import { GRUPOS, buscarSeleccionPorNombre, urlBanderaPorCodigo } from '~/utils/worldCupData'

const { RONDAS, generando, error, generarDieciseisavos, fetchRonda } = useBracket()
const { user } = useAuth()
const { teams, fetchTeams } = useTeams()

const columnas = ref<{ ronda: string; partidos: Match[] }[]>([])
const loadingBracket = ref(false)
const errorCarga = ref('')

const cargarBracket = async () => {
  loadingBracket.value = true
  errorCarga.value = ''
  try {
    const rondas = [...RONDAS, 'Tercer lugar']
    const resultado = []
    for (const ronda of rondas) {
      const partidos = await fetchRonda(ronda as (typeof RONDAS)[number])
      resultado.push({ ronda, partidos })
    }
    columnas.value = resultado
  } catch (err) {
    console.error('Error al cargar el bracket:', err)
    errorCarga.value = 'No se pudo cargar el bracket. Intenta de nuevo.'
  } finally {
    loadingBracket.value = false
  }
}

onMounted(() => {
  cargarBracket()
  fetchTeams()
})

const hayDieciseisavos = computed(() =>
  columnas.value.find((c) => c.ronda === 'Dieciseisavos')?.partidos.length,
)

const generar = async () => {
  await generarDieciseisavos()
  await cargarBracket()
}

const nombreEquipo = (nombre: string) => (nombre === 'Por definir' ? 'Por definir' : nombre)

// Divide cada ronda (menos Final) en mitad izquierda/derecha del cuadro,
// usando bracketPosition: las posiciones bajas alimentan la mitad izquierda,
// las altas la derecha. Como el avance del bracket respeta ese mismo orden
// ronda tras ronda, la división se mantiene consistente hasta la Semifinal.
type Lado = 'izquierda' | 'derecha'
const construirMitad = (lado: Lado) => {
  const rondasSinFinal = RONDAS.filter((r) => r !== 'Final')
  return rondasSinFinal.map((ronda) => {
    const partidos = columnas.value.find((c) => c.ronda === ronda)?.partidos ?? []
    const mitad = Math.max(1, Math.floor(partidos.length / 2))
    const filtrados = partidos.filter((p, idx) => {
      const pos = typeof p.bracketPosition === 'number' && !isNaN(p.bracketPosition) ? p.bracketPosition : idx
      return lado === 'izquierda' ? pos < mitad : pos >= mitad
    })
    return { ronda, partidos: filtrados }
  })
}

// Izquierda: Dieciseisavos → Semifinal (se va acercando al centro)
const mitadIzquierda = computed(() => construirMitad('izquierda'))
// Derecha: Semifinal → Dieciseisavos (espejo, para que el centro quede junto a la Final)
const mitadDerecha = computed(() => [...construirMitad('derecha')].reverse())

const finalMatch = computed(() => columnas.value.find((c) => c.ronda === 'Final')?.partidos[0] ?? null)
const tercerLugarMatch = computed(() => columnas.value.find((c) => c.ronda === 'Tercer lugar')?.partidos[0] ?? null)

const campeon = computed(() => {
  if (!finalMatch.value || finalMatch.value.status !== 'Finalizado') return null
  if (finalMatch.value.homeScore === null || finalMatch.value.awayScore === null) return null
  return finalMatch.value.homeScore > finalMatch.value.awayScore ? finalMatch.value.homeTeam : finalMatch.value.awayTeam
})

// ── Bandera de un equipo dado su nombre (usada en las tarjetas de partido) ──
const equipoPorNombre = computed(() => new Map(teams.value.map((t) => [t.name, t])))
const banderaEquipo = (nombre: string): string | null => {
  if (!nombre || nombre === 'Por definir') return null
  const equipo = equipoPorNombre.value.get(nombre)
  if (equipo?.flag) return equipo.flag
  const seleccion = buscarSeleccionPorNombre(nombre)
  return seleccion ? urlBanderaPorCodigo(seleccion.code) : null
}

// ── Paneles de grupos (decorativos) a los costados del bracket, como en el
// cuadro oficial: cada grupo con su color y las banderas de sus 4 equipos.
const COLORES_GRUPO: Record<string, string> = {
  A: '#22c55e',
  B: '#ef4444',
  C: '#f97316',
  D: '#3b82f6',
  E: '#a855f7',
  F: '#14b8a6',
  G: '#ec4899',
  H: '#84cc16',
  I: '#8b5cf6',
  J: '#0ea5e9',
  K: '#f43f5e',
  L: '#eab308',
}

const gruposConEquipos = computed(() =>
  GRUPOS.map((letra) => ({
    letra,
    color: COLORES_GRUPO[letra] ?? '#f5c518',
    equipos: teams.value.filter((t) => t.group === letra),
  })),
)
const gruposIzquierda = computed(() => gruposConEquipos.value.slice(0, 6))
const gruposDerecha = computed(() => gruposConEquipos.value.slice(6, 12))
</script>

<template>
  <div class="bracket-page animate-fade-in">
    <header class="bracket-header animate-slide-up">
      <div>
        <h1 class="bracket-title">
          <span class="text-gold-gradient">Llaves</span> de eliminación
        </h1>
        <p class="bracket-subtitle">Bracket generado automáticamente a partir de la fase de grupos</p>
      </div>
      <div class="bracket-header__actions">
        <button class="btn-refetch" :disabled="loadingBracket" @click="cargarBracket">
          Actualizar
        </button>
        <button
          v-if="user && !hayDieciseisavos"
          class="btn-add"
          :disabled="generando"
          @click="generar"
        >
          {{ generando ? 'Generando...' : 'Generar Dieciseisavos' }}
        </button>
      </div>
    </header>

    <p v-if="error" class="form-error">{{ error }}</p>

    <!-- Estado: cargando -->
    <div v-if="loadingBracket" class="state-box">
      <div class="spinner" />
      <p class="state-text">Cargando bracket...</p>
    </div>

    <!-- Estado: error -->
    <div v-else-if="errorCarga" class="state-box">
      <p class="state-text">{{ errorCarga }}</p>
      <button class="btn-refetch" @click="cargarBracket">Reintentar</button>
    </div>

    <!-- Estado: vacío -->
    <div v-else-if="!hayDieciseisavos" class="state-box">
      <p class="state-text">
        Todavía no se ha generado el bracket. Necesitas la fase de grupos completa (32 clasificados) antes de generar Dieciseisavos.
      </p>
    </div>

    <!-- Cuadro completo -->
    <div v-else class="bracket-tree">
      <!-- Columna de grupos A-F -->
      <div class="groups-col">
        <div
          v-for="grupo in gruposIzquierda"
          :key="`g-${grupo.letra}`"
          class="group-box"
          :style="{ '--group-color': grupo.color }"
        >
          <div class="group-box__flags">
            <img
              v-for="equipo in grupo.equipos"
              :key="equipo.id"
              :src="equipo.flag"
              :alt="equipo.name"
              class="group-box__flag"
            />
          </div>
          <span class="group-box__label">Grupo {{ grupo.letra }}</span>
        </div>
      </div>

      <!-- Mitad izquierda -->
      <div class="bracket-half">
        <div v-for="grupo in mitadIzquierda" :key="`i-${grupo.ronda}`" class="bracket-round">
          <span class="bracket-round__label">{{ grupo.ronda }}</span>
          <div class="bracket-round__matches">
            <NuxtLink
              v-for="partido in grupo.partidos"
              :key="partido.id"
              :to="`/matches/${partido.id}`"
              class="bracket-match glass"
            >
              <div class="bracket-match__row">
                <img v-if="banderaEquipo(partido.homeTeam)" :src="banderaEquipo(partido.homeTeam)!" class="bracket-match__flag" alt="" />
                <span v-else class="bracket-match__flag bracket-match__flag--empty">🏳️</span>
                <span class="bracket-match__team">{{ nombreEquipo(partido.homeTeam) }}</span>
                <span class="bracket-match__score">{{ partido.homeScore ?? '-' }}</span>
              </div>
              <div class="bracket-match__row">
                <img v-if="banderaEquipo(partido.awayTeam)" :src="banderaEquipo(partido.awayTeam)!" class="bracket-match__flag" alt="" />
                <span v-else class="bracket-match__flag bracket-match__flag--empty">🏳️</span>
                <span class="bracket-match__team">{{ nombreEquipo(partido.awayTeam) }}</span>
                <span class="bracket-match__score">{{ partido.awayScore ?? '-' }}</span>
              </div>
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- Centro: Campeón + Trofeo + Final + Tercer lugar + Logo FIFA 2026 -->
      <div class="bracket-center">
        <h2 class="world-champions-heading">WORLD CHAMPIONS</h2>

        <div class="bracket-trophy-box">
          <img src="/fifa_world_cup_trophy.png" alt="FIFA World Cup Trophy" class="trophy-img" />
          <div class="champion-name" v-if="campeon">
            🏆 {{ campeon }}
          </div>
        </div>

        <div v-if="finalMatch" class="bracket-round center-match-round">
          <span class="bracket-round__label">Final</span>
          <NuxtLink :to="`/matches/${finalMatch.id}`" class="bracket-match bracket-match--final glass-strong">
            <div class="bracket-match__row">
              <img v-if="banderaEquipo(finalMatch.homeTeam)" :src="banderaEquipo(finalMatch.homeTeam)!" class="bracket-match__flag" alt="" />
              <span v-else class="bracket-match__flag bracket-match__flag--empty">🏳️</span>
              <span class="bracket-match__team">{{ nombreEquipo(finalMatch.homeTeam) }}</span>
              <span class="bracket-match__score">{{ finalMatch.homeScore ?? '-' }}</span>
            </div>
            <div class="bracket-match__row">
              <img v-if="banderaEquipo(finalMatch.awayTeam)" :src="banderaEquipo(finalMatch.awayTeam)!" class="bracket-match__flag" alt="" />
              <span v-else class="bracket-match__flag bracket-match__flag--empty">🏳️</span>
              <span class="bracket-match__team">{{ nombreEquipo(finalMatch.awayTeam) }}</span>
              <span class="bracket-match__score">{{ finalMatch.awayScore ?? '-' }}</span>
            </div>
          </NuxtLink>
        </div>

        <div v-if="tercerLugarMatch" class="bracket-round bracket-round--bronze center-match-round">
          <span class="bracket-round__label">BRONZE WINNER</span>
          <NuxtLink :to="`/matches/${tercerLugarMatch.id}`" class="bracket-match glass">
            <div class="bracket-match__row">
              <img v-if="banderaEquipo(tercerLugarMatch.homeTeam)" :src="banderaEquipo(tercerLugarMatch.homeTeam)!" class="bracket-match__flag" alt="" />
              <span v-else class="bracket-match__flag bracket-match__flag--empty">🏳️</span>
              <span class="bracket-match__team">{{ nombreEquipo(tercerLugarMatch.homeTeam) }}</span>
              <span class="bracket-match__score">{{ tercerLugarMatch.homeScore ?? '-' }}</span>
            </div>
            <div class="bracket-match__row">
              <img v-if="banderaEquipo(tercerLugarMatch.awayTeam)" :src="banderaEquipo(tercerLugarMatch.awayTeam)!" class="bracket-match__flag" alt="" />
              <span v-else class="bracket-match__flag bracket-match__flag--empty">🏳️</span>
              <span class="bracket-match__team">{{ nombreEquipo(tercerLugarMatch.awayTeam) }}</span>
              <span class="bracket-match__score">{{ tercerLugarMatch.awayScore ?? '-' }}</span>
            </div>
          </NuxtLink>
        </div>

        <div class="fifa-2026-badge">
          <span class="fifa-2026-number">26</span>
          <span class="fifa-2026-text">FIFA WORLD CUP 2026</span>
        </div>
      </div>

      <!-- Mitad derecha (espejo) -->
      <div class="bracket-half bracket-half--derecha">
        <div v-for="grupo in mitadDerecha" :key="`d-${grupo.ronda}`" class="bracket-round">
          <span class="bracket-round__label">{{ grupo.ronda }}</span>
          <div class="bracket-round__matches">
            <NuxtLink
              v-for="partido in grupo.partidos"
              :key="partido.id"
              :to="`/matches/${partido.id}`"
              class="bracket-match glass"
            >
              <div class="bracket-match__row">
                <img v-if="banderaEquipo(partido.homeTeam)" :src="banderaEquipo(partido.homeTeam)!" class="bracket-match__flag" alt="" />
                <span v-else class="bracket-match__flag bracket-match__flag--empty">🏳️</span>
                <span class="bracket-match__team">{{ nombreEquipo(partido.homeTeam) }}</span>
                <span class="bracket-match__score">{{ partido.homeScore ?? '-' }}</span>
              </div>
              <div class="bracket-match__row">
                <img v-if="banderaEquipo(partido.awayTeam)" :src="banderaEquipo(partido.awayTeam)!" class="bracket-match__flag" alt="" />
                <span v-else class="bracket-match__flag bracket-match__flag--empty">🏳️</span>
                <span class="bracket-match__team">{{ nombreEquipo(partido.awayTeam) }}</span>
                <span class="bracket-match__score">{{ partido.awayScore ?? '-' }}</span>
              </div>
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- Columna de grupos G-L -->
      <div class="groups-col">
        <div
          v-for="grupo in gruposDerecha"
          :key="`g-${grupo.letra}`"
          class="group-box"
          :style="{ '--group-color': grupo.color }"
        >
          <div class="group-box__flags">
            <img
              v-for="equipo in grupo.equipos"
              :key="equipo.id"
              :src="equipo.flag"
              :alt="equipo.name"
              class="group-box__flag"
            />
          </div>
          <span class="group-box__label">Grupo {{ grupo.letra }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bracket-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
}

.bracket-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  flex-wrap: wrap;
}

.bracket-title {
  font-size: clamp(1.6rem, 3vw, 2.2rem);
  font-weight: 800;
  letter-spacing: -0.02em;
}

.bracket-subtitle {
  color: var(--text-secondary);
  font-size: 0.92rem;
  margin-top: 4px;
}

.bracket-header__actions {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.btn-add {
  padding: 10px 20px;
  border-radius: var(--radius-md);
  background: var(--gold-gradient);
  color: #0a0e1a;
  font-weight: 700;
  font-size: 0.88rem;
  transition: transform var(--transition-fast);
}

.btn-add:hover:not(:disabled) {
  transform: translateY(-2px);
}

.btn-add:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-refetch {
  padding: 10px 18px;
  border-radius: var(--radius-md);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-weight: 600;
  transition: all var(--transition-fast);
}

.btn-refetch:hover:not(:disabled) {
  color: var(--text-primary);
  border-color: var(--border-glass);
}

.btn-refetch:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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
  max-width: 480px;
}

.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid var(--border-glass);
  border-top-color: var(--gold-start);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* Cuadro completo: izquierda | centro | derecha */
.bracket-tree {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  overflow-x: auto;
  padding: 20px 10px;
  background: transparent;
  width: 100%;
}

.bracket-half {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 0 0 auto;
}

.bracket-round {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: space-around;
  gap: 10px;
  width: 145px;
  flex: 0 0 auto;
}

.bracket-round__label {
  font-size: 0.7rem;
  font-weight: 800;
  color: var(--text-gold);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  text-align: center;
  margin-bottom: 2px;
}

.bracket-round__matches {
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  gap: 10px;
  flex: 1;
}

.bracket-match {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px 10px;
  border-radius: 8px;
  background: rgba(18, 24, 38, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.12);
  transition: all var(--transition-fast);
  text-decoration: none;
  color: #ffffff;
}

.bracket-match:hover {
  transform: translateY(-2px) scale(1.03);
  border-color: rgba(255, 214, 10, 0.6);
  box-shadow: 0 4px 20px rgba(255, 214, 10, 0.2);
}

.bracket-match--final {
  padding: 10px 14px;
  border: 2px solid #ffd60a;
  box-shadow: 0 0 25px rgba(255, 214, 10, 0.3);
  background: linear-gradient(135deg, rgba(35, 28, 10, 0.95), rgba(13, 18, 29, 0.95));
}

.bracket-match__row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.78rem;
  font-weight: 700;
}

.bracket-match__flag {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.bracket-match__flag--empty {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
}

.bracket-match__team {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #ffffff;
}

.bracket-match__score {
  color: #ffd60a;
  font-weight: 900;
  font-size: 0.85rem;
  flex-shrink: 0;
}

/* Columnas de grupos (decorativas) a los costados */
.groups-col {
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  gap: 8px;
  flex: 0 0 auto;
}

.group-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 6px;
  min-width: 85px;
  border-radius: 10px;
  border: 2px solid var(--group-color, #333);
  background: rgba(8, 12, 20, 0.85);
  box-shadow: 0 0 10px color-mix(in srgb, var(--group-color, #000) 40%, transparent);
}

.group-box__flags {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 4px;
}

.group-box__flag {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.group-box__label {
  font-size: 0.68rem;
  font-weight: 800;
  color: #ffffff;
  background: var(--group-color, #333);
  padding: 2px 8px;
  border-radius: 8px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-top: 1px;
}

/* Centro: trofeo + marcas oficiales */
.bracket-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
  flex: 0 0 auto;
  padding: 0 6px;
  width: 240px;
}

.world-champions-heading {
  font-size: 1.15rem;
  font-weight: 900;
  color: #ffffff;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  text-align: center;
  white-space: nowrap;
  width: 100%;
  margin: 0 auto 4px;
  text-shadow: 0 0 15px rgba(255, 255, 255, 0.6);
}

.bracket-trophy-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  position: relative;
}

.trophy-img {
  width: 150px;
  height: auto;
  object-fit: contain;
  mix-blend-mode: lighten;
  mask-image: radial-gradient(circle at center, black 55%, transparent 90%);
  -webkit-mask-image: radial-gradient(circle at center, black 55%, transparent 90%);
  animation: float 4s ease-in-out infinite;
}

.champion-name {
  font-size: 1.15rem;
  font-weight: 900;
  color: var(--text-gold);
  background: rgba(18, 24, 38, 0.95);
  border: 1px solid var(--border-gold);
  padding: 6px 18px;
  border-radius: 20px;
  box-shadow: 0 0 20px rgba(255, 214, 10, 0.3);
}

.center-match-round {
  width: 100%;
  max-width: 240px;
}

.fifa-2026-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: var(--space-md);
  opacity: 0.9;
}

.fifa-2026-number {
  font-size: 2rem;
  font-weight: 900;
  line-height: 1;
  color: #ffffff;
  letter-spacing: -0.05em;
}

.fifa-2026-text {
  font-size: 0.65rem;
  font-weight: 800;
  color: var(--text-muted);
  letter-spacing: 0.15em;
}

.bracket-round--bronze {
  opacity: 0.9;
}
</style>
