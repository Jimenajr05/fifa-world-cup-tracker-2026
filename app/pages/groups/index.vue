<script setup lang="ts">
const { teams, loading, error, fetchTeams } = useTeams()

const cargar = () => fetchTeams()

onMounted(cargar)

const grupos = computed(() => {
  const mapa = new Map<string, number>()
  for (const team of teams.value) {
    if (!team.group) continue
    mapa.set(team.group, (mapa.get(team.group) ?? 0) + 1)
  }
  return Array.from(mapa.entries())
    .map(([grupo, cantidad]) => ({ grupo, cantidad }))
    .sort((a, b) => a.grupo.localeCompare(b.grupo))
})
</script>

<template>
  <div class="groups-page animate-fade-in">
    <header class="groups-header animate-slide-up">
      <h1 class="groups-title">
        <span class="text-gold-gradient">Fase de</span> grupos
      </h1>
      <p class="groups-subtitle">Consulta la tabla de posiciones de cada grupo</p>
    </header>

    <!-- Estado: cargando -->
    <div v-if="loading" class="state-box">
      <div class="spinner" />
      <p class="state-text">Cargando grupos...</p>
    </div>

    <!-- Estado: error -->
    <div v-else-if="error" class="state-box">
      <p class="state-text">{{ error }}</p>
      <button class="btn-refetch" @click="cargar">Reintentar</button>
    </div>

    <!-- Estado: vacío -->
    <div v-else-if="grupos.length === 0" class="state-box">
      <p class="state-text">Aún no hay selecciones asignadas a un grupo.</p>
      <NuxtLink to="/teams" class="btn-refetch">Ir a selecciones</NuxtLink>
    </div>

    <!-- Listado de grupos -->
    <div v-else class="groups-grid">
      <NuxtLink
        v-for="g in grupos"
        :key="g.grupo"
        :to="`/groups/${g.grupo}`"
        class="group-card glass animate-slide-up"
      >
        <span class="group-card__letter">{{ g.grupo }}</span>
        <span class="group-card__count">{{ g.cantidad }} selecciones</span>
      </NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.groups-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
}

.groups-title {
  font-size: clamp(1.6rem, 3vw, 2.2rem);
  font-weight: 800;
  letter-spacing: -0.02em;
}

.groups-subtitle {
  color: var(--text-secondary);
  font-size: 0.92rem;
  margin-top: 4px;
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

.groups-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: var(--space-lg);
}

.group-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  padding: var(--space-xl);
  border-radius: var(--radius-lg);
  text-align: center;
  transition: transform var(--transition-base), box-shadow var(--transition-base);
}

.group-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-md);
}

.group-card__letter {
  font-size: 1.8rem;
  font-weight: 800;
  color: var(--text-gold);
}

.group-card__count {
  font-size: 0.78rem;
  color: var(--text-muted);
}
</style>