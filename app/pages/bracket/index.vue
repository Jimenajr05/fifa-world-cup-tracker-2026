<script setup lang="ts">
import type { Match } from '~/composables/useMatches'

const { RONDAS, generando, error, generarDieciseisavos, fetchRonda } = useBracket()
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

onMounted(cargarBracket)

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
  color: var(--text-gold);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  text-align: center;
}

.bracket-round__matches {
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  gap: var(--space-lg);
  flex: 1;
}

.bracket-match {
  display: flex;
  flex-direction: column;
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
}

.bracket-match__team {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bracket-match__score {
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  background: var(--bg-surface);
  color: var(--text-gold);
  font-size: 0.78rem;
  font-weight: 800;
}

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