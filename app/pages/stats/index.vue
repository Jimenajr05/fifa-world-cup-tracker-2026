<script setup lang="ts">
const { estadisticas, loading, error, calcularEstadisticas } = useStatistics()

onMounted(calcularEstadisticas)
</script>

<template>
  <div class="stats-page animate-fade-in">
    <header class="stats-header animate-slide-up">
      <div>
        <h1 class="stats-title">
          <span class="text-gold-gradient">Estadísticas</span> del torneo
        </h1>
        <p class="stats-subtitle">Calculadas automáticamente a partir de los partidos finalizados</p>
      </div>
      <button class="btn-refetch" :disabled="loading" @click="calcularEstadisticas">Actualizar</button>
    </header>

    <!-- Estado: cargando -->
    <div v-if="loading" class="state-box">
      <div class="spinner" />
      <p class="state-text">Calculando estadísticas...</p>
    </div>

    <!-- Estado: error -->
    <div v-else-if="error" class="state-box">
      <p class="state-text">{{ error }}</p>
      <button class="btn-refetch" @click="calcularEstadisticas">Reintentar</button>
    </div>

    <!-- Estado: vacío -->
    <div v-else-if="!estadisticas || estadisticas.partidosDisputados === 0" class="state-box">
      <p class="state-text">Todavía no hay partidos finalizados para calcular estadísticas.</p>
    </div>

    <template v-else>
      <!-- Tarjetas de resumen -->
      <div class="stats-summary animate-slide-up delay-1">
        <div class="summary-card glass">
          <span class="summary-card__value">{{ estadisticas.partidosDisputados }}</span>
          <span class="summary-card__label">Partidos disputados</span>
        </div>
        <div class="summary-card glass">
          <span class="summary-card__value">{{ estadisticas.golesTotales }}</span>
          <span class="summary-card__label">Goles totales</span>
        </div>
        <div class="summary-card glass">
          <span class="summary-card__value">{{ estadisticas.promedioGoles }}</span>
          <span class="summary-card__label">Promedio de goles / partido</span>
        </div>
      </div>

      <!-- Destacados -->
      <div class="stats-highlights animate-slide-up delay-2">
        <div v-if="estadisticas.maximoGoleador" class="highlight-card glass">
          <span class="highlight-card__icon">⚽</span>
          <div>
            <p class="highlight-card__label">Máximo goleador</p>
            <p class="highlight-card__value">{{ estadisticas.maximoGoleador.playerName }}</p>
            <p class="highlight-card__sub">{{ estadisticas.maximoGoleador.goles }} goles</p>
          </div>
        </div>
        <div v-if="estadisticas.seleccionMasGoles" class="highlight-card glass">
          <span class="highlight-card__icon">🥅</span>
          <div>
            <p class="highlight-card__label">Selección con más goles</p>
            <p class="highlight-card__value">{{ estadisticas.seleccionMasGoles.teamName }}</p>
            <p class="highlight-card__sub">{{ estadisticas.seleccionMasGoles.golesAFavor }} goles a favor</p>
          </div>
        </div>
        <div v-if="estadisticas.seleccionMenosGoleada" class="highlight-card glass">
          <span class="highlight-card__icon">🛡️</span>
          <div>
            <p class="highlight-card__label">Selección menos goleada</p>
            <p class="highlight-card__value">{{ estadisticas.seleccionMenosGoleada.teamName }}</p>
            <p class="highlight-card__sub">{{ estadisticas.seleccionMenosGoleada.golesEnContra }} goles en contra</p>
          </div>
        </div>
      </div>

      <!-- Tabla completa por equipo -->
      <div class="stats-table-wrap animate-slide-up delay-3">
        <table class="stats-table">
          <thead>
            <tr>
              <th>Selección</th>
              <th>PJ</th>
              <th>Victorias</th>
              <th>% Victorias</th>
              <th>GF</th>
              <th>GC</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="equipo in estadisticas.tablaEquipos" :key="equipo.teamName">
              <td class="stats-table__team">{{ equipo.teamName }}</td>
              <td>{{ equipo.partidosJugados }}</td>
              <td>{{ equipo.victorias }}</td>
              <td>{{ equipo.porcentajeVictorias }}%</td>
              <td>{{ equipo.golesAFavor }}</td>
              <td>{{ equipo.golesEnContra }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<style scoped>
.stats-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
}

.stats-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  flex-wrap: wrap;
}

.stats-title {
  font-size: clamp(1.6rem, 3vw, 2.2rem);
  font-weight: 800;
  letter-spacing: -0.02em;
}

.stats-subtitle {
  color: var(--text-secondary);
  font-size: 0.92rem;
  margin-top: 4px;
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

.stats-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: var(--space-md);
}

.summary-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: var(--space-lg);
  border-radius: var(--radius-lg);
  text-align: center;
}

.summary-card__value {
  font-size: 1.8rem;
  font-weight: 800;
  color: var(--text-gold);
}

.summary-card__label {
  font-size: 0.78rem;
  color: var(--text-muted);
}

.stats-highlights {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--space-md);
}

.highlight-card {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-lg);
  border-radius: var(--radius-lg);
}

.highlight-card__icon {
  font-size: 1.8rem;
}

.highlight-card__label {
  font-size: 0.75rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.highlight-card__value {
  font-size: 1.05rem;
  font-weight: 700;
  margin-top: 2px;
}

.highlight-card__sub {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.stats-table-wrap {
  overflow-x: auto;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-glass);
}

.stats-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.stats-table th {
  padding: 12px 14px;
  text-align: left;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  background: var(--bg-surface);
  white-space: nowrap;
}

.stats-table td {
  padding: 10px 14px;
  border-top: 1px solid var(--border-subtle);
  white-space: nowrap;
}

.stats-table__team {
  font-weight: 600;
  color: var(--text-primary);
}
</style>