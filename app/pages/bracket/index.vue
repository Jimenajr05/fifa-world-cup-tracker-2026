<script setup lang="ts">
import type { Match } from '~/composables/useMatches'

const { RONDAS, generando, error, generarDieciseisavos, fetchRonda } = useBracket()
const { user } = useAuth()

// Cada columna del bracket: las 5 rondas normales + "Tercer lugar" aparte,
// porque no alimenta a ninguna otra ronda (solo se juega junto a la Final).
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

    <!-- Bracket -->
    <div v-else class="bracket-board">
      <div v-for="columna in columnas" :key="columna.ronda" class="bracket-column">
        <h2 class="bracket-column__title">{{ columna.ronda }}</h2>

        <p v-if="columna.partidos.length === 0" class="bracket-column__empty">
          Aún no definido
        </p>

        <NuxtLink
          v-for="partido in columna.partidos"
          :key="partido.id"
          :to="`/matches/${partido.id}`"
          class="bracket-match glass animate-slide-up"
        >
          <div class="bracket-match__row">
            <span class="bracket-match__team">{{ nombreEquipo(partido.homeTeam) }}</span>
            <span class="bracket-match__score">{{ partido.homeScore ?? '-' }}</span>
          </div>
          <div class="bracket-match__row">
            <span class="bracket-match__team">{{ nombreEquipo(partido.awayTeam) }}</span>
            <span class="bracket-match__score">{{ partido.awayScore ?? '-' }}</span>
          </div>
          <span class="badge" :class="`badge--${partido.status.replace(' ', '').toLowerCase()}`">
            {{ partido.status }}
          </span>
        </NuxtLink>
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

/* Board */
.bracket-board {
  display: flex;
  gap: var(--space-xl);
  overflow-x: auto;
  padding-bottom: var(--space-md);
}

.bracket-column {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  min-width: 220px;
  flex: 0 0 auto;
}

.bracket-column__title {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-gold);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  text-align: center;
}

.bracket-column__empty {
  font-size: 0.78rem;
  color: var(--text-muted);
  text-align: center;
}

.bracket-match {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-md);
  border-radius: var(--radius-md);
  transition: transform var(--transition-base), box-shadow var(--transition-base);
}

.bracket-match:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.bracket-match__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: var(--space-sm);
  font-size: 0.85rem;
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
  font-size: 0.8rem;
  font-weight: 800;
}

.badge {
  padding: 2px 10px;
  border-radius: 999px;
  font-weight: 600;
  font-size: 0.7rem;
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
</style>