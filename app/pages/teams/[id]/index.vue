<script setup lang="ts">
import type { Team } from '~/composables/useTeams'
import { CONFEDERACIONES, GRUPOS, nombresSelecciones, buscarSeleccionPorNombre, urlBanderaPorCodigo, ENTRENADORES_POR_SELECCION, OTRO_ENTRENADOR } from '~/utils/worldCupData'
import { mensajeError } from '~/utils/validation'

const route = useRoute()
const router = useRouter()
const { fetchTeamById, updateTeam, deleteTeam } = useTeams()
const { user, perfil, alternarEquipoFavorito } = useAuth()
const { confirmar } = useConfirm()

const esFavorito = computed(() => !!team.value && (perfil.value?.equiposFavoritos.includes(team.value.id) ?? false))

const id = route.params.id as string
const team = ref<Team | null>(null)

const loading = ref(false)
const error = ref('')
const editando = ref(false)
const guardando = ref(false)
const errorEdicion = ref('')
const errorEliminar = ref('')

const formulario = reactive({
  name: '',
  group: '',
  flag: '',
  coach: '',
  confederation: '',
  fifaRanking: 1,
})

// Combo box de entrenador: muestra el entrenador REAL 2026 de la selección
// elegida (si está clasificada y confirmado), más "Otro" para escribirlo a mano
const cargado = ref(false)
const entrenadorSeleccionado = ref('')
const escribirEntrenadorPropio = computed(() => entrenadorSeleccionado.value === OTRO_ENTRENADOR)
const entrenadoresDisponibles = computed(() => {
  const real = ENTRENADORES_POR_SELECCION[formulario.name]
  return real ? [real, OTRO_ENTRENADOR] : [OTRO_ENTRENADOR]
})
watch(entrenadorSeleccionado, (valor) => {
  if (valor) formulario.coach = valor === OTRO_ENTRENADOR ? '' : valor
})
// Si el usuario cambia la selección (no la carga inicial), resetea el entrenador
watch(() => formulario.name, () => {
  if (cargado.value) {
    entrenadorSeleccionado.value = ''
    formulario.coach = ''
  }
})

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
      formulario.name = resultado.name
      formulario.group = resultado.group
      formulario.flag = resultado.flag
      formulario.coach = resultado.coach
      formulario.confederation = resultado.confederation
      formulario.fifaRanking = resultado.fifaRanking
      entrenadorSeleccionado.value = entrenadoresDisponibles.value.includes(resultado.coach)
        ? resultado.coach
        : OTRO_ENTRENADOR
      cargado.value = true
    }
  } catch {
    error.value = 'Ocurrió un error al cargar la selección.'
  } finally {
    loading.value = false
  }
}

onMounted(cargar)

// Al elegir el nombre en el combo box, autocompleta bandera y confederación
watch(() => formulario.name, (nombre) => {
  const seleccion = buscarSeleccionPorNombre(nombre)
  if (seleccion) {
    formulario.flag = urlBanderaPorCodigo(seleccion.code)
    formulario.confederation = seleccion.confederation
  }
})

const guardarCambios = async () => {
  if (!team.value) return
  guardando.value = true
  errorEdicion.value = ''
  try {
    await updateTeam(team.value.id, {
      ...formulario,
      fifaRanking: Number(formulario.fifaRanking),
    })
    editando.value = false
    await cargar()
  } catch (err) {
    console.error('Error al actualizar selección:', err)
    errorEdicion.value = mensajeError(err, 'No se pudo actualizar la selección.')
  } finally {
    guardando.value = false
  }
}

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

    <!-- Estado: cargando -->
    <div v-if="loading" class="state-box">
      <div class="spinner" />
      <p class="state-text">Cargando selección...</p>
    </div>

    <!-- Estado: error -->
    <div v-else-if="error" class="state-box">
      <p class="state-text">{{ error }}</p>
      <button class="btn-refetch" @click="cargar">Reintentar</button>
    </div>

    <!-- Contenido -->
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
          <button
            class="btn-favorite"
            :class="{ 'btn-favorite--activo': esFavorito }"
            @click="alternarEquipoFavorito(team.id)"
          >
            {{ esFavorito ? '★ En favoritos' : '☆ Agregar a favoritos' }}
          </button>
          <button class="btn-edit" @click="editando = true">Editar</button>
          <button class="btn-delete" @click="eliminar">Eliminar</button>
        </div>
        <p v-if="errorEliminar" class="form-error">{{ errorEliminar }}</p>
      </template>

      <!-- Formulario de edición -->
      <form v-else class="edit-form" @submit.prevent="guardarCambios">
        <div class="field">
          <label class="field__label">Nombre</label>
          <select v-model="formulario.name" class="field__input" required>
            <option value="" disabled>Selecciona una selección</option>
            <option v-for="nombre in nombresSelecciones" :key="nombre" :value="nombre">{{ nombre }}</option>
          </select>
        </div>
        <div class="field">
          <label class="field__label">Grupo</label>
          <select v-model="formulario.group" class="field__input" required>
            <option value="" disabled>Selecciona un grupo</option>
            <option v-for="g in GRUPOS" :key="g" :value="g">Grupo {{ g }}</option>
          </select>
        </div>
        <div class="field">
          <label class="field__label">Bandera</label>
          <input v-model="formulario.flag" type="text" class="field__input" placeholder="Se completa automáticamente" readonly />
        </div>
        <div class="field">
          <label class="field__label">Entrenador</label>
          <select v-model="entrenadorSeleccionado" class="field__input">
            <option value="" disabled>Selecciona un entrenador</option>
            <option v-for="e in entrenadoresDisponibles" :key="e" :value="e">{{ e }}</option>
          </select>
          <input
            v-if="escribirEntrenadorPropio"
            v-model="formulario.coach"
            type="text"
            class="field__input"
            placeholder="Escribe el nombre del entrenador"
          />
        </div>
        <div class="field">
          <label class="field__label">Confederación</label>
          <select v-model="formulario.confederation" class="field__input" required>
            <option value="" disabled>Selecciona una confederación</option>
            <option v-for="c in CONFEDERACIONES" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>
        <div class="field">
          <label class="field__label">Ranking FIFA</label>
          <input v-model.number="formulario.fifaRanking" type="number" min="1" class="field__input" />
        </div>
        <p v-if="errorEdicion" class="form-error">{{ errorEdicion }}</p>
        <div class="edit-form__actions">
          <button type="submit" class="btn-edit" :disabled="guardando">
            {{ guardando ? 'Guardando...' : 'Guardar cambios' }}
          </button>
          <button type="button" class="btn-cancel" @click="editando = false">Cancelar</button>
        </div>
      </form>

      <div class="divider" />

      <!-- Enlaces a la plantilla y a la alineación (rutas anidadas /teams/[id]/players y /lineup) -->
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

.edit-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.field__label {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
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

.edit-form__actions {
  display: flex;
  gap: var(--space-md);
}

.form-error {
  color: #ff6b6b;
  font-size: 0.85rem;
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

/* ── Enlaces a plantilla / alineación ─────────────────────────── */
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