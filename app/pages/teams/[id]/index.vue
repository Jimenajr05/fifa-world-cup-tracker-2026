// Página de detalle de un equipo, mostrando información, acciones de edición y eliminación, y enlaces a la plantilla y alineación
<script setup lang="ts">
// Tipo de equipo
import type { Team } from '~/composables/useTeams'
// Extrae un mensaje de error amigable
import { mensajeError } from '~/utils/validation'

// Ruta y router, para leer el id del equipo y navegar tras eliminar
const route = useRoute()
const router = useRouter()
// Carga de equipo por id y eliminación
const { fetchTeamById, deleteTeam } = useTeams()
// Usuario, perfil (para favoritos) y acción de alternar equipo favorito
const { user, perfil, alternarEquipoFavorito } = useAuth()
// Diálogo de confirmación para eliminar
const { confirmar } = useConfirm()

// Indica si el equipo actual está en los favoritos del usuario
const esFavorito = computed(() => !!team.value && (perfil.value?.equiposFavoritos.includes(team.value.id) ?? false))

// Id del equipo, tomado de la URL
const id = route.params.id as string
// Equipo cargado
const team = ref<Team | null>(null)

// Indica si el equipo se está cargando
const loading = ref(false)
// Mensaje de error al cargar el equipo
const error = ref('')
// Controla si se muestra el formulario de edición
const editando = ref(false)
// Mensaje de error al eliminar el equipo
const errorEliminar = ref('')

// Carga el equipo por id
const cargar = async () => {
  loading.value = true
  error.value = ''
  try {
    const resultado = await fetchTeamById(id)
    if (!resultado) {
      error.value = 'No se encontró la selección solicitada.'
      team.value = null
    } else {
      team.value = resultado
    }
  } catch {
    error.value = 'Ocurrió un error al cargar la selección.'
  } finally {
    loading.value = false
  }
}

onMounted(cargar)

// Oculta el formulario de edición y recarga el equipo
const equipoGuardado = async () => {
  editando.value = false
  await cargar()
}

// Confirma y elimina el equipo, luego navega de vuelta al listado
const eliminar = async () => {
  if (!team.value) return
  const confirmado = await confirmar(`¿Eliminar la selección ${team.value.name}?`)
  if (!confirmado) return
  errorEliminar.value = ''
  try {
    await deleteTeam(team.value.id)
    router.push('/teams')
  } catch (err) {
    console.error('Error al eliminar selección:', err)
    errorEliminar.value = mensajeError(err, 'No se pudo eliminar la selección.')
  }
}
</script>

<template>
  <div class="team-detail animate-fade-in">
    <NuxtLink to="/teams" class="back-link">← Volver a selecciones</NuxtLink>

    <div v-if="loading" class="state-box">
      <div class="spinner" />
      <p class="state-text">Cargando selección...</p>
    </div>

    <div v-else-if="error" class="state-box">
      <p class="state-text">{{ error }}</p>
      <button class="btn-refetch" @click="cargar">Reintentar</button>
    </div>

    <div v-else-if="team" class="team-card-detail glass-strong animate-slide-up">
      <div class="team-detail__header">
        <img v-if="team.flag" :src="team.flag" :alt="team.name" class="team-detail__flag" />
        <span v-else class="team-detail__flag team-detail__flag--fallback">🏳️</span>
        <div>
          <h1 class="team-detail__name">{{ team.name }}</h1>
          <p class="team-detail__meta">Grupo {{ team.group }} · Ranking FIFA #{{ team.fifaRanking }}</p>
        </div>
      </div>

      <div class="divider" />

      <template v-if="!editando">
        <dl class="team-detail__info">
          <div class="info-item">
            <dt>Entrenador</dt>
            <dd>{{ team.coach || 'Sin definir' }}</dd>
          </div>
          <div class="info-item">
            <dt>Confederación</dt>
            <dd>{{ team.confederation || 'Sin definir' }}</dd>
          </div>
          <div class="info-item">
            <dt>Grupo</dt>
            <dd>{{ team.group }}</dd>
          </div>
          <div class="info-item">
            <dt>Ranking FIFA</dt>
            <dd>#{{ team.fifaRanking }}</dd>
          </div>
        </dl>

        <div v-if="user" class="team-detail__actions">
          <button class="btn-favorite" :class="{ 'btn-favorite--activo': esFavorito }"
            @click="alternarEquipoFavorito(team.id)">
            {{ esFavorito ? '★ En favoritos' : '☆ Agregar a favoritos' }}
          </button>
          <button class="btn-edit" @click="editando = true">Editar</button>
          <button class="btn-delete" @click="eliminar">Eliminar</button>
        </div>
        <p v-if="errorEliminar" class="form-error">{{ errorEliminar }}</p>
      </template>

      <TeamEditForm v-else :team="team" @saved="equipoGuardado" @cancel="editando = false" />

      <div class="divider" />

      <div class="squad-links">
        <NuxtLink :to="`/teams/${id}/players`" class="squad-link glass">
          <span class="squad-link__icon">👕</span>
          <div class="squad-link__text">
            <p class="squad-link__title">Plantilla de jugadores</p>
            <p class="squad-link__sub">Ver, agregar, editar y eliminar jugadores de {{ team.name }}</p>
          </div>
          <span class="squad-link__arrow">→</span>
        </NuxtLink>
        <NuxtLink :to="`/teams/${id}/lineup`" class="squad-link glass">
          <span class="squad-link__icon">⚽</span>
          <div class="squad-link__text">
            <p class="squad-link__title">Alineación</p>
            <p class="squad-link__sub">Ver la formación titular y los suplentes en la cancha</p>
          </div>
          <span class="squad-link__arrow">→</span>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.team-detail {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  max-width: 720px;
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

.team-card-detail {
  border-radius: var(--radius-xl);
  padding: var(--space-2xl);
}

.team-detail__header {
  display: flex;
  align-items: center;
  gap: var(--space-lg);
}

.team-detail__flag {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.team-detail__flag--fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  background: var(--bg-surface);
}

.team-detail__name {
  font-size: 1.6rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.team-detail__meta {
  font-size: 0.85rem;
  color: var(--text-gold);
  margin-top: 4px;
}

.divider {
  height: 1px;
  margin: var(--space-xl) 0;
  background: linear-gradient(90deg, transparent, var(--border-glass), transparent);
}

.team-detail__info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
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

.team-detail__actions {
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

.squad-links {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.squad-link {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-lg);
  border-radius: var(--radius-lg);
  transition: transform var(--transition-fast), border-color var(--transition-fast);
}

.squad-link:hover {
  transform: translateY(-2px);
  border-color: rgba(255, 214, 10, 0.25);
}

.squad-link__icon {
  font-size: 1.6rem;
}

.squad-link__text {
  flex: 1;
}

.squad-link__title {
  font-size: 1rem;
  font-weight: 700;
}

.squad-link__sub {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-top: 2px;
}

.squad-link__arrow {
  font-size: 1.2rem;
  color: var(--text-gold);
}
</style>