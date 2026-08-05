// Página de detalle de un grupo, mostrando la tabla de posiciones y los partidos del grupo.
<script setup lang="ts">
// Ruta actual, para leer el parámetro de grupo
const route = useRoute()
// Letra del grupo (en mayúsculas) tomada de la URL
const group = computed(() => (route.params.group as string).toUpperCase())

// Tabla de posiciones del grupo
const { standings, loading, error, fetchStandings } = useStandings()
// Partidos de fase de grupos correspondientes a este grupo
const { matches, loading: cargandoPartidos, error: errorPartidos, fetchMatches } = useMatches()

// Carga la tabla de posiciones y los partidos del grupo actual
const cargar = () => {
  fetchStandings(group.value)
  fetchMatches({ stage: 'Fase de grupos', group: group.value })
}

onMounted(cargar)
// Recarga los datos si cambia el grupo (navegación entre grupos)
watch(group, cargar)

// Formatea un Timestamp de Firestore como fecha y hora corta en español
const formatearFecha = (ts: { toDate: () => Date }) =>
  ts.toDate().toLocaleString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
</script>

<template>
  <div class="group-detail animate-fade-in">
    <NuxtLink to="/groups" class="back-link">← Volver a grupos</NuxtLink>

    <header class="group-header animate-slide-up">
      <h1 class="group-title">
        Grupo <span class="text-gold-gradient">{{ group }}</span>
      </h1>
      <button class="btn-refetch" @click="cargar">Actualizar</button>
    </header>

    <section class="section glass animate-slide-up delay-1">
      <h2 class="section__title">Tabla de posiciones</h2>

      <div v-if="loading" class="state-box">
        <div class="spinner" />
        <p class="state-text">Calculando posiciones...</p>
      </div>

      <div v-else-if="error" class="state-box">
        <p class="state-text">{{ error }}</p>
        <button class="btn-refetch" @click="cargar">Reintentar</button>
      </div>

      <div v-else-if="standings.length === 0" class="state-box">
        <p class="state-text">No hay selecciones registradas en el grupo {{ group }}.</p>
      </div>

      <div v-else class="table-wrapper">
        <table class="standings-table">
          <thead>
            <tr>
              <th class="col-team">Selección</th>
              <th>PJ</th>
              <th>G</th>
              <th>E</th>
              <th>P</th>
              <th>GF</th>
              <th>GC</th>
              <th>DG</th>
              <th>Pts</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in standings" :key="row.teamId" :class="{ 'row--qualified': i < 2 }">
              <td class="col-team">
                <img v-if="row.flag" :src="row.flag" :alt="row.teamName" class="team-flag" />
                <NuxtLink :to="`/teams/${row.teamId}`">{{ row.teamName }}</NuxtLink>
              </td>
              <td>{{ row.played }}</td>
              <td>{{ row.wins }}</td>
              <td>{{ row.draws }}</td>
              <td>{{ row.losses }}</td>
              <td>{{ row.goalsFor }}</td>
              <td>{{ row.goalsAgainst }}</td>
              <td>{{ row.goalDifference > 0 ? '+' : '' }}{{ row.goalDifference }}</td>
              <td class="col-points">{{ row.points }}</td>
            </tr>
          </tbody>
        </table>
        <p class="table-hint">Los dos primeros lugares (resaltados) avanzan a la siguiente fase.</p>
      </div>
    </section>

    <section class="section glass animate-slide-up delay-2">
      <h2 class="section__title">Partidos del grupo</h2>

      <div v-if="cargandoPartidos" class="state-box">
        <div class="spinner" />
        <p class="state-text">Cargando partidos...</p>
      </div>

      <div v-else-if="errorPartidos" class="state-box">
        <p class="state-text">{{ errorPartidos }}</p>
      </div>

      <div v-else-if="matches.length === 0" class="state-box">
        <p class="state-text">Aún no hay partidos registrados para este grupo.</p>
      </div>

      <ul v-else class="matches-list">
        <li v-for="match in matches" :key="match.id" class="match-row">
          <NuxtLink :to="`/matches/${match.id}`" class="match-row__link">
            <span class="match-row__team">{{ match.homeTeam }}</span>
            <span class="match-row__score">{{ match.homeScore ?? '-' }} : {{ match.awayScore ?? '-' }}</span>
            <span class="match-row__team">{{ match.awayTeam }}</span>
            <span class="match-row__date">{{ formatearFecha(match.kickoff) }}</span>
          </NuxtLink>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.group-detail {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  max-width: 800px;
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

.group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
}

.group-title {
  font-size: clamp(1.5rem, 3vw, 2rem);
  font-weight: 800;
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

.btn-refetch:hover {
  color: var(--text-primary);
  border-color: var(--border-glass);
}

.section {
  padding: var(--space-xl);
  border-radius: var(--radius-lg);
}

.section__title {
  font-size: 1.1rem;
  font-weight: 700;
  margin-bottom: var(--space-lg);
}

.state-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-xl) 0;
  text-align: center;
}

.state-text {
  color: var(--text-secondary);
  font-size: 0.92rem;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border-glass);
  border-top-color: var(--gold-start);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}


.table-wrapper {
  overflow-x: auto;
}

.standings-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.standings-table th {
  padding: 10px 8px;
  text-align: center;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid var(--border-glass);
}

.standings-table td {
  padding: 10px 8px;
  text-align: center;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border-subtle);
}

.col-team {
  text-align: left !important;
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: var(--text-primary) !important;
}

th.col-team {
  display: table-cell;
}

.team-flag {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  object-fit: cover;
}

.col-points {
  font-weight: 800;
  color: var(--text-gold);
}

.row--qualified td {
  background: rgba(0, 184, 148, 0.06);
}

.table-hint {
  margin-top: var(--space-md);
  font-size: 0.75rem;
  color: var(--text-muted);
}

.matches-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.match-row__link {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md);
  border-radius: var(--radius-md);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  transition: border-color var(--transition-fast);
}

.match-row__link:hover {
  border-color: var(--border-glass);
}

.match-row__team {
  flex: 1;
  font-size: 0.88rem;
  font-weight: 600;
}

.match-row__team:last-of-type {
  text-align: right;
}

.match-row__score {
  padding: 4px 12px;
  border-radius: var(--radius-sm);
  background: var(--bg-glass);
  color: var(--text-gold);
  font-size: 0.85rem;
  font-weight: 700;
}

.match-row__date {
  font-size: 0.75rem;
  color: var(--text-muted);
  white-space: nowrap;
}

@media (max-width: 640px) {
  .match-row__link {
    flex-wrap: wrap;
    justify-content: center;
  }

  .match-row__date {
    width: 100%;
    text-align: center;
  }
}
</style>