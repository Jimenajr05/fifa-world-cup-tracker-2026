// Página de perfil del usuario, mostrando su información, puntos acumulados y la predicción de campeón del torneo
<script setup lang="ts">
// Catálogo de nombres de selecciones para elegir campeón
import { nombresSelecciones } from '~/utils/worldCupData'

// Usuario, perfil y acciones relacionadas (elegir campeón, recargar perfil)
const { user, perfil, cargandoPerfil, elegirCampeon, errorCampeon, cargarPerfil } = useAuth()

// Vuelve a cargar el perfil del usuario actual
const recargarPerfil = () => {
  if (user.value) cargarPerfil(user.value.uid)
}

// Indica si la imagen de avatar falló al cargar
const imgError = ref(false)
// URL de la foto de perfil: prioriza la de Firestore, luego la de Firebase Auth
const fotoUrl = computed(() => perfil.value?.foto || user.value?.photoURL || '')
// Reinicia el estado de error cada vez que cambia la URL de la foto
watch(fotoUrl, () => {
  imgError.value = false
})

// Inicial del nombre del usuario, usada como avatar de respaldo
const iniciales = computed(() => {
  const base = perfil.value?.nombre || user.value?.displayName || user.value?.email || ''
  return base.trim().charAt(0).toUpperCase() || '?'
})

// Puntos acumulados del usuario
const puntos = computed(() => perfil.value?.puntos ?? 0)

// Campeón elegido en el select (antes de confirmar)
const campeonSeleccionado = ref('')
// Indica si se está guardando la elección de campeón
const guardandoCampeon = ref(false)

// Confirma la elección de campeón del usuario
const confirmarCampeon = async () => {
  if (!campeonSeleccionado.value) return
  guardandoCampeon.value = true
  try {
    await elegirCampeon(campeonSeleccionado.value)
  } finally {
    guardandoCampeon.value = false
  }
}
</script>

<template>
  <div class="profile-page animate-fade-in">
    <div class="profile-card glass-strong animate-slide-up delay-1">
      <div v-if="!user" class="state-box">
        <p class="state-text">Debes iniciar sesión para ver tu perfil.</p>
      </div>

      <div v-else-if="cargandoPerfil" class="state-box">
        <div class="spinner" />
        <p class="state-text">Cargando perfil...</p>
      </div>

      <div v-else-if="!perfil" class="state-box">
        <p class="state-text">No se pudo cargar tu perfil.</p>
        <button class="btn-refetch" @click="recargarPerfil">Reintentar</button>
      </div>

      <template v-else>
        
        <div class="profile-header">
          <div class="avatar-container">
            <img v-if="fotoUrl && !imgError" :src="fotoUrl" :alt="perfil?.nombre || user?.displayName || 'Avatar'"
              class="avatar avatar-img" referrerpolicy="no-referrer" @error="imgError = true" />
            <div v-else class="avatar">{{ iniciales }}</div>
            <span class="avatar-ring" />
          </div>
          <div class="profile-info">
            <h2 class="profile-title">Mi perfil</h2>
            <p class="profile-email">{{ user.email }}</p>
            <span class="points-badge">⭐ {{ puntos }} puntos</span>
          </div>
        </div>

        <div class="divider" />

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
            <button type="button" class="save-btn champion-confirm-btn"
              :disabled="!campeonSeleccionado || guardandoCampeon" @click="confirmarCampeon">
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

        <ProfileForm :nombre-inicial="perfil.nombre ?? ''" :seleccion-inicial="perfil.seleccionFavorita ?? null"
          :foto-inicial="perfil.foto ?? user?.photoURL ?? ''" />
      </template>
    </div>
  </div>
</template>

<style scoped>
.profile-page {
  display: flex;
  justify-content: center;
  padding: var(--space-xl) 0;
}

.profile-card {
  width: 100%;
  max-width: 480px;
  border-radius: var(--radius-xl);
  padding: var(--space-2xl);
  position: relative;
  overflow: hidden;
}

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
  object-fit: cover;
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

.divider {
  height: 1px;
  margin: var(--space-xl) 0;
  background: linear-gradient(90deg,
      transparent,
      var(--border-glass),
      transparent);
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

select.field__input {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238b95a5' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 14px center;
  padding-right: 40px;
}

.form-error {
  color: #ff6b6b;
  font-size: 0.85rem;
}

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
  background: linear-gradient(90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.2) 50%,
      transparent 100%);
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