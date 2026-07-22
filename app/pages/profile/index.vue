<script setup lang="ts">
import { nombresSelecciones } from '~/utils/worldCupData'

const { user, perfil, cargandoPerfil, actualizarPerfil, elegirCampeon, errorCampeon, cargarPerfil } = useAuth()

const recargarPerfil = () => {
  if (user.value) cargarPerfil(user.value.uid)
}

const nombreEditable = ref('')
const seleccionEditable = ref<string | null>(null)
const guardando = ref(false)
const mensajeExito = ref(false)

// Sincroniza el formulario cuando el perfil termina de cargar
watch(perfil, (nuevoPerfil) => {
  if (nuevoPerfil) {
    nombreEditable.value = nuevoPerfil.nombre ?? ''
    seleccionEditable.value = nuevoPerfil.seleccionFavorita ?? null
  }
}, { immediate: true })

const iniciales = computed(() => {
  const base = nombreEditable.value || perfil.value?.nombre || user.value?.email || ''
  return base.trim().charAt(0).toUpperCase() || '?'
})

const puntos = computed(() => perfil.value?.puntos ?? 0)

// Predicción de campeón: una vez elegida queda bloqueada
const campeonSeleccionado = ref('')
const guardandoCampeon = ref(false)

const confirmarCampeon = async () => {
  if (!campeonSeleccionado.value) return
  guardandoCampeon.value = true
  try {
    await elegirCampeon(campeonSeleccionado.value)
  } finally {
    guardandoCampeon.value = false
  }
}

const guardarCambios = async () => {
  guardando.value = true
  mensajeExito.value = false
  try {
    await actualizarPerfil({
      nombre: nombreEditable.value,
      seleccionFavorita: seleccionEditable.value ?? '',
    })
    mensajeExito.value = true
    setTimeout(() => { mensajeExito.value = false }, 3000)
  } catch (error) {
    console.error('Error al guardar perfil:', error)
  } finally {
    guardando.value = false
  }
}
</script>

<template>
  <div class="profile-page animate-fade-in">
    <div class="profile-card glass-strong animate-slide-up delay-1">
      <!-- Estado: no logueado -->
      <div v-if="!user" class="state-box">
        <p class="state-text">Debes iniciar sesión para ver tu perfil.</p>
      </div>

      <!-- Estado: cargando -->
      <div v-else-if="cargandoPerfil" class="state-box">
        <div class="spinner" />
        <p class="state-text">Cargando perfil...</p>
      </div>

      <!-- Estado: vacío/error (no se pudo cargar el documento del perfil) -->
      <div v-else-if="!perfil" class="state-box">
        <p class="state-text">No se pudo cargar tu perfil.</p>
        <button class="btn-refetch" @click="recargarPerfil">Reintentar</button>
      </div>

      <!-- Estado: perfil cargado -->
      <template v-else>
        <!-- Header -->
        <div class="profile-header">
          <div class="avatar-container">
            <div class="avatar">{{ iniciales }}</div>
            <span class="avatar-ring" />
          </div>
          <div class="profile-info">
            <h2 class="profile-title">Mi perfil</h2>
            <p class="profile-email">{{ user.email }}</p>
            <span class="points-badge">⭐ {{ puntos }} puntos</span>
          </div>
        </div>

        <!-- Divider -->
        <div class="divider" />

        <!-- Predicción de campeón -->
        <div class="champion-section">
          <p class="field__label">Predicción de campeón del torneo</p>
          <p v-if="perfil?.campeonElegido" class="champion-locked">
            🏆 Elegiste a <strong>{{ perfil.campeonElegido }}</strong> — esta predicción no se puede cambiar.
          </p>
          <div v-else class="champion-form">
            <select v-model="campeonSeleccionado" class="field__input">
              <option value="" disabled>Selecciona tu campeón</option>
              <option v-for="pais in nombresSelecciones" :key="pais" :value="pais">{{ pais }}</option>
            </select>
            <button
              type="button"
              class="save-btn champion-confirm-btn"
              :disabled="!campeonSeleccionado || guardandoCampeon"
              @click="confirmarCampeon"
            >
              {{ guardandoCampeon ? 'Guardando...' : 'Confirmar campeón' }}
            </button>
          </div>
          <p v-if="errorCampeon" class="form-error">{{ errorCampeon }}</p>
        </div>

        <NuxtLink to="/profile/predictions" class="predictions-link">
          Ver mis predicciones →
        </NuxtLink>
        <NuxtLink to="/profile/favorites" class="predictions-link">
          Ver mis favoritos →
        </NuxtLink>

        <!-- Form -->
        <form @submit.prevent="guardarCambios" class="profile-form">
          <div class="field">
            <label for="nombre" class="field__label">
              Nombre
            </label>
            <input
              id="nombre"
              v-model="nombreEditable"
              type="text"
              placeholder="Tu nombre"
              required
              class="field__input"
            />
          </div>

          <div class="field">
            <label for="seleccion" class="field__label">
              Selección favorita
            </label>
            <select id="seleccion" v-model="seleccionEditable" class="field__input">
              <option :value="null">Sin selección favorita</option>
              <option v-for="pais in nombresSelecciones" :key="pais" :value="pais">
                {{ pais }}
              </option>
            </select>
          </div>

          <button type="submit" class="save-btn" :disabled="guardando">
            <span v-if="guardando" class="btn-spinner" />
            <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
              <polyline points="17 21 17 13 7 13 7 21"/>
              <polyline points="7 3 7 8 15 8"/>
            </svg>
            {{ guardando ? 'Guardando...' : 'Guardar cambios' }}
          </button>

          <Transition name="fade">
            <div v-if="mensajeExito" class="success-msg">
              Perfil actualizado correctamente
            </div>
          </Transition>
        </form>
      </template>
    </div>
  </div>
</template>

<style scoped>
/* ── Page Layout ───────────────────────────────────────────── */
.profile-page {
  display: flex;
  justify-content: center;
  padding: var(--space-xl) 0;
}

/* ── Card ──────────────────────────────────────────────────── */
.profile-card {
  width: 100%;
  max-width: 480px;
  border-radius: var(--radius-xl);
  padding: var(--space-2xl);
  position: relative;
  overflow: hidden;
}

/* Decorative top border glow */
.profile-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 60%;
  height: 2px;
  background: var(--gold-gradient);
  border-radius: 0 0 2px 2px;
  box-shadow: 0 2px 20px rgba(255, 214, 10, 0.25);
}

/* ── States ────────────────────────────────────────────────── */
.state-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-2xl) 0;
  text-align: center;
}

.state-icon {
  font-size: 3rem;
  animation: float 3s ease-in-out infinite;
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

/* ── Profile Header ────────────────────────────────────────── */
.profile-header {
  display: flex;
  align-items: center;
  gap: var(--space-lg);
}

.avatar-container {
  position: relative;
  flex-shrink: 0;
}

.avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: var(--gold-gradient);
  color: #0a0e1a;
  font-weight: 800;
  font-size: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 1;
}

.avatar-ring {
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 2px solid transparent;
  background: var(--gold-gradient) border-box;
  -webkit-mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
  mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  animation: pulse-glow 3s ease-in-out infinite;
}

.profile-title {
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}

.profile-email {
  margin-top: 2px;
  font-size: 0.82rem;
  color: var(--text-muted);
}

.points-badge {
  display: inline-block;
  margin-top: 8px;
  padding: 3px 12px;
  border-radius: 999px;
  background: rgba(255, 214, 10, 0.1);
  color: var(--text-gold);
  font-size: 0.78rem;
  font-weight: 700;
}

.champion-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  margin-bottom: var(--space-xl);
}

.champion-locked {
  padding: 12px 16px;
  border-radius: var(--radius-md);
  background: rgba(255, 214, 10, 0.08);
  border: 1px solid rgba(255, 214, 10, 0.2);
  color: var(--text-primary);
  font-size: 0.9rem;
}

.champion-form {
  display: flex;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.champion-form .field__input {
  flex: 1;
  min-width: 180px;
}

.champion-confirm-btn {
  margin-top: 0;
  padding: 10px 20px;
  font-size: 0.85rem;
  flex: 0 0 auto;
}

.predictions-link {
  display: block;
  text-align: center;
  margin-bottom: var(--space-lg);
  font-size: 0.85rem;
  color: var(--text-gold);
  font-weight: 600;
}

.predictions-link:hover {
  text-decoration: underline;
}

/* ── Divider ───────────────────────────────────────────────── */
.divider {
  height: 1px;
  margin: var(--space-xl) 0;
  background: linear-gradient(
    90deg,
    transparent,
    var(--border-glass),
    transparent
  );
}

/* ── Form ──────────────────────────────────────────────────── */
.profile-form {
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
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.field__label-icon {
  font-size: 0.85rem;
}

.field__input {
  padding: 12px 16px;
  border: 1px solid var(--border-glass);
  border-radius: var(--radius-md);
  font-size: 0.95rem;
  color: var(--text-primary);
  background: var(--bg-surface);
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast),
              background var(--transition-fast);
  appearance: none;
  -webkit-appearance: none;
}

.field__input::placeholder {
  color: var(--text-muted);
}

.field__input:focus {
  outline: none;
  border-color: var(--gold-start);
  box-shadow: 0 0 0 3px rgba(255, 214, 10, 0.1);
  background: var(--bg-surface-hover);
}

/* Select arrow */
select.field__input {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238b95a5' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 14px center;
  padding-right: 40px;
}

/* ── Save Button ───────────────────────────────────────────── */
.save-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: var(--space-sm);
  padding: 14px var(--space-xl);
  border: none;
  border-radius: var(--radius-md);
  background: var(--gold-gradient);
  color: #0a0e1a;
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
  transition: transform var(--transition-fast), box-shadow var(--transition-base);
  position: relative;
  overflow: hidden;
}

.save-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.2) 50%,
    transparent 100%
  );
  background-size: 200% 100%;
  animation: shimmer 3s ease-in-out infinite;
  pointer-events: none;
}

.save-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: var(--shadow-gold-strong);
}

.save-btn:active:not(:disabled) {
  transform: translateY(0) scale(0.98);
}

.save-btn:disabled {
  background: var(--bg-surface-hover);
  color: var(--text-muted);
  cursor: not-allowed;
}

.save-btn:disabled::before {
  display: none;
}

.btn-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(10, 14, 26, 0.3);
  border-top-color: #0a0e1a;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

/* ── Success Message ───────────────────────────────────────── */
.success-msg {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  border-radius: var(--radius-md);
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--green-primary);
  background: rgba(0, 184, 148, 0.08);
  border: 1px solid rgba(0, 184, 148, 0.2);
}

.success-msg__icon {
  font-size: 1rem;
}

/* ── Transitions ───────────────────────────────────────────── */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* ── Responsive ────────────────────────────────────────────── */
@media (max-width: 768px) {
  .profile-card {
    padding: var(--space-xl) var(--space-lg);
  }

  .profile-header {
    flex-direction: column;
    text-align: center;
  }
}
</style>