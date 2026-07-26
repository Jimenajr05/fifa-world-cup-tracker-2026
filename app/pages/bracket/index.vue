<script setup lang="ts">
import type { Match } from '~/composables/useMatches'
import { buscarSeleccionPorNombre } from '~/utils/worldCupData'

const { RONDAS, generando, error, generarDieciseisavos, fetchRonda } = useBracket()
const { teams, fetchTeams } = useTeams()
const { user } = useAuth()

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

<<<<<<< HEAD
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
    const mitad = partidos.length / 2
    const filtrados = partidos.filter((p) =>
      lado === 'izquierda' ? (p.bracketPosition ?? 0) < mitad : (p.bracketPosition ?? 0) >= mitad,
    )
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
=======
// ── Bandera + código corto de un equipo, a partir del nombre ────────────
const equipoPorNombre = computed(() => new Map(teams.value.map((t) => [t.name, t])))
const infoEquipo = (nombre: string) => {
  if (!nombre || nombre === 'Por definir') return { flag: '', code: '?' }
  const team = equipoPorNombre.value.get(nombre)
  const ref = buscarSeleccionPorNombre(nombre)
  return {
    flag: team?.flag || (ref ? `https://flagcdn.com/w160/${ref.code}.png` : ''),
    code: (ref?.code || nombre.slice(0, 3)).toUpperCase(),
  }
}

// ══════════════════════════════════════════════════════════════════════
// Geometría del bracket: dos mitades (izquierda/derecha) que convergen en
// la Final, calculadas en píxeles para poder dibujar las líneas conectoras
// con divs absolutos (sin SVG). Cada mitad tiene 8-4-2-1 partidos por ronda.
// ══════════════════════════════════════════════════════════════════════
const ROUND_W = 180
const GAP = 46
const COL_W = ROUND_W + GAP
const ROW_H = 58
const CARD_H = 52
const BASE_HALF = 8 // partidos de Dieciseisavos en cada mitad
const TOTAL_H = BASE_HALF * ROW_H
const HEADER_H = 40
const THIRD_PLACE_GAP = 70

const leftColX = [0, 1, 2, 3].map((r) => r * COL_W)
const finalX = 4 * COL_W
const centerAxis = finalX + ROUND_W / 2
const rightColX = [0, 1, 2, 3].map((r) => 2 * centerAxis - leftColX[r]! - ROUND_W)

const totalWidth = rightColX[0]! + ROUND_W
const totalHeight = HEADER_H + TOTAL_H + THIRD_PLACE_GAP + CARD_H + 30

const spanOf = (r: number) => ROW_H * 2 ** r
const centerYOf = (r: number, i: number) => HEADER_H + i * spanOf(r) + spanOf(r) / 2

const nombresRondas = ['Dieciseisavos', 'Octavos', 'Cuartos', 'Semifinal'] as const

const partidoEnPosicion = (ronda: string, bracketPosition: number): Match | null => {
  const columna = columnas.value.find((c) => c.ronda === ronda)
  return columna?.partidos.find((p) => (p.bracketPosition ?? 0) === bracketPosition) ?? null
}

interface BracketBox {
  id: string
  x: number
  y: number
  match: Match | null
  esFinal?: boolean
}

interface BracketLine {
  id: string
  left: number
  top: number
  width: number
  height: number
  vertical?: boolean
}

const cajas = computed<BracketBox[]>(() => {
  const boxes: BracketBox[] = []
  for (const side of ['left', 'right'] as const) {
    const colX = side === 'left' ? leftColX : rightColX
    for (let r = 0; r < 4; r++) {
      const count = BASE_HALF / 2 ** r
      const ronda = nombresRondas[r]!
      for (let i = 0; i < count; i++) {
        const bracketPosition = side === 'left' ? i : i + count
        boxes.push({
          id: `${side}-${ronda}-${i}`,
          x: colX[r]!,
          y: centerYOf(r, i) - CARD_H / 2,
          match: partidoEnPosicion(ronda, bracketPosition),
        })
      }
    }
  }
  // Final: un único cruce en el centro
  boxes.push({
    id: 'final',
    x: finalX,
    y: HEADER_H + TOTAL_H / 2 - CARD_H / 2,
    match: partidoEnPosicion('Final', 0),
    esFinal: true,
  })
  return boxes
})

const cajaTercerLugar = computed<BracketBox>(() => ({
  id: 'tercer-lugar',
  x: finalX,
  y: HEADER_H + TOTAL_H + THIRD_PLACE_GAP - CARD_H / 2,
  match: partidoEnPosicion('Tercer lugar', 0),
}))

const lineas = computed<BracketLine[]>(() => {
  const lines: BracketLine[] = []
  let n = 0
  const push = (l: Omit<BracketLine, 'id'>) => lines.push({ id: `line-${n++}`, ...l })

  for (const side of ['left', 'right'] as const) {
    const colX = side === 'left' ? leftColX : rightColX

    for (let r = 0; r < 3; r++) {
      const childCount = BASE_HALF / 2 ** r
      const pares = childCount / 2
      for (let p = 0; p < pares; p++) {
        const y0 = centerYOf(r, p * 2)
        const y1 = centerYOf(r, p * 2 + 1)
        const parentY = centerYOf(r + 1, p)
        const xEdgeChild = side === 'left' ? colX[r]! + ROUND_W : colX[r]!
        const xEdgeParent = side === 'left' ? colX[r + 1]! : colX[r + 1]! + ROUND_W
        const xMid = (xEdgeChild + xEdgeParent) / 2

        push({ left: Math.min(xEdgeChild, xMid), top: y0, width: Math.abs(xMid - xEdgeChild), height: 2 })
        push({ left: Math.min(xEdgeChild, xMid), top: y1, width: Math.abs(xMid - xEdgeChild), height: 2 })
        push({ left: xMid, top: Math.min(y0, y1), width: 2, height: Math.abs(y1 - y0), vertical: true })
        push({ left: Math.min(xMid, xEdgeParent), top: parentY, width: Math.abs(xEdgeParent - xMid), height: 2 })
      }
    }

    // Semifinal (única por mitad) → Final: ambas quedan a la misma altura
    const ySemi = centerYOf(3, 0)
    const xEdgeSemi = side === 'left' ? colX[3]! + ROUND_W : colX[3]!
    const xEdgeFinal = side === 'left' ? finalX : finalX + ROUND_W
    push({ left: Math.min(xEdgeSemi, xEdgeFinal), top: ySemi, width: Math.abs(xEdgeFinal - xEdgeSemi), height: 2 })
  }
  return lines
>>>>>>> cba1885 (Reflejar validaciones y errores en la UI de paginas existentes)
})
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

<<<<<<< HEAD
    <!-- Cuadro completo -->
    <div v-else class="bracket-tree">
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
                <span class="bracket-match__team">{{ nombreEquipo(partido.homeTeam) }}</span>
                <span class="bracket-match__score">{{ partido.homeScore ?? '-' }}</span>
              </div>
              <div class="bracket-match__row">
                <span class="bracket-match__team">{{ nombreEquipo(partido.awayTeam) }}</span>
                <span class="bracket-match__score">{{ partido.awayScore ?? '-' }}</span>
              </div>
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- Centro: Campeón + Final + Tercer lugar -->
      <div class="bracket-center">
        <span class="bracket-center__label">Campeón del mundo</span>
        <div class="bracket-trophy">
          <span class="bracket-trophy__icon">🏆</span>
          <span class="bracket-trophy__team">{{ campeon ?? '¿Quién será?' }}</span>
        </div>

        <div v-if="finalMatch" class="bracket-round">
          <span class="bracket-round__label">Final</span>
          <NuxtLink :to="`/matches/${finalMatch.id}`" class="bracket-match bracket-match--final glass-strong">
            <div class="bracket-match__row">
              <span class="bracket-match__team">{{ nombreEquipo(finalMatch.homeTeam) }}</span>
              <span class="bracket-match__score">{{ finalMatch.homeScore ?? '-' }}</span>
            </div>
            <div class="bracket-match__row">
              <span class="bracket-match__team">{{ nombreEquipo(finalMatch.awayTeam) }}</span>
              <span class="bracket-match__score">{{ finalMatch.awayScore ?? '-' }}</span>
            </div>
          </NuxtLink>
        </div>

        <div v-if="tercerLugarMatch" class="bracket-round bracket-round--bronze">
          <span class="bracket-round__label">🥉 Tercer lugar</span>
          <NuxtLink :to="`/matches/${tercerLugarMatch.id}`" class="bracket-match glass">
            <div class="bracket-match__row">
              <span class="bracket-match__team">{{ nombreEquipo(tercerLugarMatch.homeTeam) }}</span>
              <span class="bracket-match__score">{{ tercerLugarMatch.homeScore ?? '-' }}</span>
            </div>
            <div class="bracket-match__row">
              <span class="bracket-match__team">{{ nombreEquipo(tercerLugarMatch.awayTeam) }}</span>
              <span class="bracket-match__score">{{ tercerLugarMatch.awayScore ?? '-' }}</span>
            </div>
          </NuxtLink>
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
                <span class="bracket-match__team">{{ nombreEquipo(partido.homeTeam) }}</span>
                <span class="bracket-match__score">{{ partido.homeScore ?? '-' }}</span>
              </div>
              <div class="bracket-match__row">
                <span class="bracket-match__team">{{ nombreEquipo(partido.awayTeam) }}</span>
                <span class="bracket-match__score">{{ partido.awayScore ?? '-' }}</span>
              </div>
            </NuxtLink>
          </div>
        </div>
=======
    <!-- Bracket tipo árbol -->
    <div v-else class="bracket-scroll">
      <div class="bracket-tree" :style="{ width: totalWidth + 'px', height: totalHeight + 'px' }">
        <!-- Encabezados de ronda -->
        <template v-for="side in ['left', 'right']" :key="side">
          <span
            v-for="(nombre, r) in nombresRondas"
            :key="`${side}-h-${r}`"
            class="round-label"
            :style="{
              left: (side === 'left' ? leftColX[r] : rightColX[r]) + 'px',
              top: '4px',
              width: ROUND_W + 'px',
            }"
          >
            {{ nombre }}
          </span>
        </template>
        <span class="round-label round-label--final" :style="{ left: finalX + 'px', top: '4px', width: ROUND_W + 'px' }">
          Final
        </span>

        <!-- Trofeo decorativo en el centro -->
        <div class="trophy" :style="{ left: finalX - 30 + ROUND_W / 2 + 'px', top: HEADER_H + TOTAL_H / 2 - 90 + 'px' }">
          🏆
        </div>

        <!-- Líneas conectoras -->
        <div
          v-for="linea in lineas"
          :key="linea.id"
          class="bracket-line"
          :class="{ 'bracket-line--vertical': linea.vertical }"
          :style="{ left: linea.left + 'px', top: linea.top + 'px', width: linea.width + 'px', height: linea.height + 'px' }"
        />

        <!-- Partidos -->
        <NuxtLink
          v-for="caja in cajas"
          :key="caja.id"
          :to="caja.match ? `/matches/${caja.match.id}` : ''"
          class="bracket-box"
          :class="{ 'bracket-box--final': caja.esFinal, 'bracket-box--empty': !caja.match }"
          :style="{ left: caja.x + 'px', top: caja.y + 'px', width: ROUND_W + 'px', height: CARD_H + 'px' }"
        >
          <template v-if="caja.match">
            <div class="bracket-box__row">
              <img v-if="infoEquipo(caja.match.homeTeam).flag" :src="infoEquipo(caja.match.homeTeam).flag" class="bracket-box__flag" alt="" />
              <span v-else class="bracket-box__flag bracket-box__flag--empty">🏳️</span>
              <span class="bracket-box__code">{{ infoEquipo(caja.match.homeTeam).code }}</span>
              <span class="bracket-box__score">{{ caja.match.homeScore ?? '' }}</span>
            </div>
            <div class="bracket-box__row">
              <img v-if="infoEquipo(caja.match.awayTeam).flag" :src="infoEquipo(caja.match.awayTeam).flag" class="bracket-box__flag" alt="" />
              <span v-else class="bracket-box__flag bracket-box__flag--empty">🏳️</span>
              <span class="bracket-box__code">{{ infoEquipo(caja.match.awayTeam).code }}</span>
              <span class="bracket-box__score">{{ caja.match.awayScore ?? '' }}</span>
            </div>
          </template>
          <template v-else>
            <div class="bracket-box__row bracket-box__row--placeholder"><span>?</span></div>
            <div class="bracket-box__row bracket-box__row--placeholder"><span>?</span></div>
          </template>
        </NuxtLink>

        <!-- Tercer lugar -->
        <span class="round-label" :style="{ left: cajaTercerLugar.x + 'px', top: cajaTercerLugar.y - 24 + 'px', width: ROUND_W + 'px' }">
          3er Lugar
        </span>
        <NuxtLink
          :to="cajaTercerLugar.match ? `/matches/${cajaTercerLugar.match.id}` : ''"
          class="bracket-box bracket-box--third"
          :class="{ 'bracket-box--empty': !cajaTercerLugar.match }"
          :style="{ left: cajaTercerLugar.x + 'px', top: cajaTercerLugar.y + 'px', width: ROUND_W + 'px', height: CARD_H + 'px' }"
        >
          <template v-if="cajaTercerLugar.match">
            <div class="bracket-box__row">
              <img v-if="infoEquipo(cajaTercerLugar.match.homeTeam).flag" :src="infoEquipo(cajaTercerLugar.match.homeTeam).flag" class="bracket-box__flag" alt="" />
              <span v-else class="bracket-box__flag bracket-box__flag--empty">🏳️</span>
              <span class="bracket-box__code">{{ infoEquipo(cajaTercerLugar.match.homeTeam).code }}</span>
              <span class="bracket-box__score">{{ cajaTercerLugar.match.homeScore ?? '' }}</span>
            </div>
            <div class="bracket-box__row">
              <img v-if="infoEquipo(cajaTercerLugar.match.awayTeam).flag" :src="infoEquipo(cajaTercerLugar.match.awayTeam).flag" class="bracket-box__flag" alt="" />
              <span v-else class="bracket-box__flag bracket-box__flag--empty">🏳️</span>
              <span class="bracket-box__code">{{ infoEquipo(cajaTercerLugar.match.awayTeam).code }}</span>
              <span class="bracket-box__score">{{ cajaTercerLugar.match.awayScore ?? '' }}</span>
            </div>
          </template>
          <template v-else>
            <div class="bracket-box__row bracket-box__row--placeholder"><span>?</span></div>
            <div class="bracket-box__row bracket-box__row--placeholder"><span>?</span></div>
          </template>
        </NuxtLink>
>>>>>>> cba1885 (Reflejar validaciones y errores en la UI de paginas existentes)
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

<<<<<<< HEAD
/* Cuadro completo: izquierda | centro | derecha */
.bracket-tree {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-xl);
  overflow-x: auto;
  padding: var(--space-md) 0 var(--space-xl);
}

.bracket-half {
  display: flex;
  align-items: center;
  gap: var(--space-lg);
  flex: 0 0 auto;
}

.bracket-round {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: space-around;
  gap: var(--space-lg);
  min-width: 190px;
  flex: 0 0 auto;
}

.bracket-round__label {
  font-size: 0.72rem;
  font-weight: 700;
=======
/* ── Bracket en árbol ─────────────────────────────────────────── */
.bracket-scroll {
  overflow-x: auto;
  padding-bottom: var(--space-lg);
  border-radius: var(--radius-lg);
  background: radial-gradient(ellipse at center, rgba(255, 214, 10, 0.05), transparent 65%), #0a0e1a;
  border: 1px solid var(--border-glass);
}

.bracket-tree {
  position: relative;
  margin: 0 auto;
}

.round-label {
  position: absolute;
  text-align: center;
  font-size: 0.7rem;
  font-weight: 800;
>>>>>>> cba1885 (Reflejar validaciones y errores en la UI de paginas existentes)
  color: var(--text-gold);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

<<<<<<< HEAD
.bracket-round__matches {
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  gap: var(--space-lg);
  flex: 1;
=======
.round-label--final {
  color: #fff;
>>>>>>> cba1885 (Reflejar validaciones y errores en la UI de paginas existentes)
}

.trophy {
  position: absolute;
  font-size: 3.4rem;
  opacity: 0.15;
  filter: drop-shadow(0 0 12px rgba(255, 214, 10, 0.4));
  pointer-events: none;
  user-select: none;
}

.bracket-line {
  position: absolute;
  background: rgba(255, 214, 10, 0.35);
}

.bracket-box {
  position: absolute;
  display: flex;
  flex-direction: column;
<<<<<<< HEAD
  gap: 6px;
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-md);
  transition: transform var(--transition-base), box-shadow var(--transition-base);
}

.bracket-match:hover {
  transform: translateY(-2px) scale(1.02);
  box-shadow: var(--shadow-md);
}

.bracket-match--final {
  padding: var(--space-md) var(--space-lg);
  border: 1px solid rgba(255, 214, 10, 0.3);
}

.bracket-match__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
  font-size: 0.8rem;
  font-weight: 600;
=======
  justify-content: center;
  gap: 4px;
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  transition: transform var(--transition-fast), border-color var(--transition-fast);
  z-index: 1;
}

.bracket-box:hover {
  transform: scale(1.03);
  border-color: var(--gold-start);
  z-index: 2;
}

.bracket-box--final {
  border-color: rgba(255, 214, 10, 0.5);
  background: rgba(255, 214, 10, 0.06);
}

.bracket-box--third {
  border-style: dashed;
}

.bracket-box--empty {
  opacity: 0.55;
  cursor: default;
  pointer-events: none;
}

.bracket-box__row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.72rem;
  font-weight: 700;
>>>>>>> cba1885 (Reflejar validaciones y errores en la UI de paginas existentes)
}

.bracket-box__row--placeholder {
  justify-content: center;
  color: var(--text-muted);
  font-weight: 800;
  font-size: 0.8rem;
}

.bracket-box__flag {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.bracket-box__flag--empty {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
}

.bracket-box__code {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bracket-box__score {
  color: var(--text-gold);
<<<<<<< HEAD
  font-size: 0.78rem;
=======
>>>>>>> cba1885 (Reflejar validaciones y errores en la UI de paginas existentes)
  font-weight: 800;
  font-size: 0.75rem;
}
<<<<<<< HEAD

/* Centro: trofeo + final + tercer lugar */
.bracket-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-lg);
  flex: 0 0 auto;
  padding: 0 var(--space-md);
}

.bracket-center__label {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.bracket-trophy {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.bracket-trophy__icon {
  font-size: 2.4rem;
  animation: float 3s ease-in-out infinite;
}

.bracket-trophy__team {
  font-size: 1rem;
  font-weight: 800;
  color: var(--text-gold);
}

.bracket-round--bronze {
  opacity: 0.85;
}
</style>
=======
</style>
>>>>>>> cba1885 (Reflejar validaciones y errores en la UI de paginas existentes)
