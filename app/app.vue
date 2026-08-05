// Archivo principal de la app, que contiene el layout global (navbar, footer, etc.) y el router-view (NuxtPage) para mostrar las páginas según la ruta.
<script setup lang="ts">
// Estado de sesión y acción de logout, compartidos por toda la app
const { user, perfil, logout } = useAuth()

// Controla si el menú móvil está abierto
const mobileMenuOpen = ref(false)
// Indica si la página se ha desplazado (para el estilo del navbar)
const scrolled = ref(false)

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

// Escucha el scroll (solo en cliente) para aplicar el estilo de navbar "scrolled"
if (import.meta.client) {
  window.addEventListener('scroll', () => {
    scrolled.value = window.scrollY > 20
  })
}
</script>

<template>
  <div class="app-wrapper">
    <!-- Barra de navegación superior, fija y con efecto al hacer scroll -->
    <header class="navbar" :class="{ 'navbar--scrolled': scrolled }">
      <div class="navbar__inner">
        <NuxtLink to="/" class="navbar__logo">
          <span class="navbar__logo-icon">⚽</span>
          <span class="navbar__logo-text">
            <span class="text-gold-gradient">FIFA</span> World Cup
            <span class="navbar__logo-year">2026</span>
          </span>
        </NuxtLink>

        <!-- Enlaces de navegación (solo visibles con sesión iniciada) -->
        <nav v-if="user" class="navbar__nav">
          <NuxtLink to="/" class="navbar__link">
            Inicio
          </NuxtLink>
          <NuxtLink to="/teams" class="navbar__link">
            Selecciones
          </NuxtLink>
          <NuxtLink to="/players" class="navbar__link">
            Jugadores
          </NuxtLink>
          <NuxtLink to="/matches" class="navbar__link">
            Partidos
          </NuxtLink>
          <NuxtLink to="/groups" class="navbar__link">
            Grupos
          </NuxtLink>
          <NuxtLink to="/bracket" class="navbar__link">
            Llaves
          </NuxtLink>
          <NuxtLink to="/predictions" class="navbar__link">
            Predicciones
          </NuxtLink>
          <NuxtLink to="/stats" class="navbar__link">
            Estadísticas
          </NuxtLink>
          <NuxtLink to="/profile" class="navbar__link">
            Mi perfil
          </NuxtLink>

        </nav>

        <!-- Avatar del usuario y botón de cerrar sesión (escritorio) -->
        <div v-if="user" class="navbar__user">
          <div class="navbar__avatar-wrap">
            <img v-if="fotoUrl && !imgError" :src="fotoUrl" :alt="perfil?.nombre || user.displayName || 'Avatar'"
              class="navbar__avatar" referrerpolicy="no-referrer" @error="imgError = true" />
            <span v-else class="navbar__avatar navbar__avatar--fallback">
              {{ iniciales }}
            </span>
            <span class="navbar__avatar-ring" />
          </div>
          <button class="navbar__logout" @click="logout">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Salir
          </button>
        </div>

        <!-- Botón hamburguesa para abrir/cerrar el menú en móvil -->
        <button v-if="user" class="navbar__mobile-toggle" @click="mobileMenuOpen = !mobileMenuOpen"
          :aria-label="mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'">
          <span class="navbar__hamburger" :class="{ 'navbar__hamburger--open': mobileMenuOpen }" />
        </button>
      </div>

      <!-- Menú desplegable de navegación para móvil -->
      <Transition name="slide-down">
        <div v-if="mobileMenuOpen && user" class="navbar__mobile-menu">
          <NuxtLink to="/" class="navbar__mobile-link" @click="mobileMenuOpen = false">
            Inicio
          </NuxtLink>
          <NuxtLink to="/teams" class="navbar__mobile-link" @click="mobileMenuOpen = false">
            Selecciones
          </NuxtLink>
          <NuxtLink to="/players" class="navbar__mobile-link" @click="mobileMenuOpen = false">
            Jugadores
          </NuxtLink>
          <NuxtLink to="/matches" class="navbar__mobile-link" @click="mobileMenuOpen = false">
            Partidos
          </NuxtLink>
          <NuxtLink to="/groups" class="navbar__mobile-link" @click="mobileMenuOpen = false">
            Grupos
          </NuxtLink>
          <NuxtLink to="/bracket" class="navbar__mobile-link" @click="mobileMenuOpen = false">
            Llaves
          </NuxtLink>
          <NuxtLink to="/predictions" class="navbar__mobile-link" @click="mobileMenuOpen = false">
            Predicciones
          </NuxtLink>
          <NuxtLink to="/stats" class="navbar__mobile-link" @click="mobileMenuOpen = false">
            Estadísticas
          </NuxtLink>
          <NuxtLink to="/profile" class="navbar__mobile-link" @click="mobileMenuOpen = false">
            Mi perfil
          </NuxtLink>
          <button class="navbar__mobile-link navbar__mobile-link--logout" @click="logout(); mobileMenuOpen = false">
            Cerrar sesión
          </button>
        </div>
      </Transition>
    </header>

    <!-- Contenido de la página activa según la ruta -->
    <main class="main-content">
      <NuxtPage />
    </main>

    <footer class="site-footer">
      <div class="site-footer__inner">
        <p class="site-footer__brand">
          <span class="text-gold-gradient">⚽ FIFA World Cup Tracker</span> 2026
        </p>
        <p class="site-footer__copy">
          Proyecto académico &mdash; Aplicaciones Web · {{ new Date().getFullYear() }}
        </p>
      </div>
    </footer>

    <!-- Diálogo de confirmación global, controlado por useConfirm -->
    <ConfirmDialog />
  </div>
</template>

<style scoped>
.app-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.navbar {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(10, 14, 26, 0.6);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border-subtle);
  transition: background var(--transition-base), box-shadow var(--transition-base);
}

.navbar--scrolled {
  background: rgba(10, 14, 26, 0.92);
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.4);
  border-bottom-color: var(--border-glass);
}

.navbar__inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--space-xl);
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.navbar__logo {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  text-decoration: none;
  transition: transform var(--transition-fast);
}

.navbar__logo:hover {
  transform: scale(1.03);
}

.navbar__logo-icon {
  font-size: 1.5rem;
  animation: float 3s ease-in-out infinite;
}

.navbar__logo-text {
  font-weight: 700;
  font-size: 1.1rem;
  letter-spacing: -0.02em;
  color: var(--text-primary);
}

.navbar__logo-year {
  font-weight: 800;
  font-size: 0.75rem;
  padding: 2px 6px;
  border-radius: 6px;
  background: var(--gold-gradient);
  color: #0a0e1a;
  margin-left: 4px;
  vertical-align: middle;
}

.navbar__nav {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-wrap: nowrap;
  min-width: 0;
}

.navbar__link {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  font-size: 0.88rem;
  font-weight: 500;
  color: var(--text-secondary);
  white-space: nowrap;
  transition: color var(--transition-fast), background var(--transition-fast);
}

.navbar__link:hover {
  color: var(--text-primary);
  background: var(--bg-surface-hover);
}

.navbar__link.router-link-active {
  color: var(--text-gold);
  background: rgba(255, 214, 10, 0.08);
}

.navbar__link-icon {
  font-size: 0.9rem;
}

.navbar__user {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.navbar__avatar-wrap {
  position: relative;
  width: 36px;
  height: 36px;
}

.navbar__avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
}

.navbar__avatar--fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--gold-gradient);
  color: #0a0e1a;
  font-weight: 700;
  font-size: 0.85rem;
}

.navbar__avatar-ring {
  position: absolute;
  inset: -3px;
  border-radius: 50%;
  border: 2px solid transparent;
  background: var(--gold-gradient) border-box;
  -webkit-mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
  mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  animation: pulse-glow 3s ease-in-out infinite;
}

.navbar__logout {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: var(--radius-sm);
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--text-secondary);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  transition: all var(--transition-fast);
}

.navbar__logout:hover {
  color: #ff6b6b;
  border-color: rgba(255, 107, 107, 0.3);
  background: rgba(255, 107, 107, 0.08);
}

.navbar__mobile-toggle {
  display: none;
  width: 32px;
  height: 32px;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
}

.navbar__hamburger {
  position: relative;
  width: 20px;
  height: 2px;
  background: var(--text-primary);
  border-radius: 2px;
  transition: background var(--transition-fast);
}

.navbar__hamburger::before,
.navbar__hamburger::after {
  content: '';
  position: absolute;
  left: 0;
  width: 20px;
  height: 2px;
  background: var(--text-primary);
  border-radius: 2px;
  transition: transform var(--transition-base);
}

.navbar__hamburger::before {
  top: -6px;
}

.navbar__hamburger::after {
  top: 6px;
}

.navbar__hamburger--open {
  background: transparent;
}

.navbar__hamburger--open::before {
  transform: translateY(6px) rotate(45deg);
}

.navbar__hamburger--open::after {
  transform: translateY(-6px) rotate(-45deg);
}

.navbar__mobile-menu {
  display: none;
  flex-direction: column;
  padding: var(--space-sm) var(--space-xl) var(--space-lg);
  border-top: 1px solid var(--border-subtle);
}

.navbar__mobile-link {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-md);
  border-radius: var(--radius-sm);
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--text-secondary);
  text-decoration: none;
  transition: background var(--transition-fast), color var(--transition-fast);
}

.navbar__mobile-link:hover {
  background: var(--bg-surface-hover);
  color: var(--text-primary);
}

.navbar__mobile-link--logout {
  color: #ff6b6b;
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.25s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.main-content {
  flex: 1;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--space-2xl) var(--space-xl);
}

.site-footer {
  border-top: 1px solid var(--border-subtle);
  padding: var(--space-xl) var(--space-xl);
  background: rgba(10, 14, 26, 0.5);
  backdrop-filter: blur(10px);
}

.site-footer__inner {
  max-width: 1200px;
  margin: 0 auto;
  text-align: center;
}

.site-footer__brand {
  font-weight: 600;
  font-size: 0.95rem;
  margin-bottom: var(--space-xs);
}

.site-footer__copy {
  font-size: 0.78rem;
  color: var(--text-muted);
}

@media (max-width: 768px) {
  .navbar__inner {
    padding: 0 var(--space-md);
  }

  .navbar__nav,
  .navbar__user {
    display: none;
  }

  .navbar__mobile-toggle {
    display: flex;
  }

  .navbar__mobile-menu {
    display: flex;
  }

  .main-content {
    padding: var(--space-xl) var(--space-md);
  }
}
</style>