<script setup lang="ts">
const { user, loginWithGoogle } = useAuth()
const { resumen, loading: cargandoDashboard, error: errorDashboard, cargarDashboard } = useDashboard()

const errorFotoHero = ref(false)

const features = [
  {
    title: 'Selección Favorita',
    desc: 'Elige y sigue a tu selección del corazón durante todo el torneo.',
  },
  {
    title: 'Predicciones',
    desc: 'Haz tus predicciones de partidos y compite con amigos.',
  },
  {
    title: 'Calendario en Vivo',
    desc: 'Consulta horarios, sedes y resultados al instante.',
  },
]

const tarjetas = computed(() => {
  if (!resumen.value) return []
  return [
    { etiqueta: 'Partidos jugados', valor: resumen.value.partidosJugados, icono: '⚽' },
    { etiqueta: 'Partidos pendientes', valor: resumen.value.partidosPendientes, icono: '🗓️' },
    { etiqueta: 'Goles anotados', valor: resumen.value.golesAnotados, icono: '🥅' },
    { etiqueta: 'Selecciones clasificadas', valor: resumen.value.seleccionesClasificadas, icono: '🏆' },
    { etiqueta: 'Predicciones realizadas', valor: resumen.value.totalPredicciones, icono: '🔮' },
  ]
})

watch(user, (u) => {
  if (u) cargarDashboard()
}, { immediate: true })
</script>

<template>
  <div class="home">
    <!-- ── Hero ───────────────────────────────────────────── -->
    <section class="hero animate-slide-up">
      <!-- Decorative orbs -->
      <div class="hero__orb hero__orb--1" />
      <div class="hero__orb hero__orb--2" />

      <div class="hero__content">
        <div class="hero__badge animate-fade-in">
          Edición 2026 · USA · México · Canadá
        </div>

        <h1 class="hero__title animate-slide-up delay-1">
          <span class="text-gold-gradient">FIFA World Cup</span><br />
          Tracker 2026
        </h1>

        <p class="hero__subtitle animate-slide-up delay-2">
          Tu compañero personal para vivir el Mundial. Sigue selecciones,
          haz predicciones y no te pierdas ni un gol.
        </p>

        <!-- Not logged in -->
        <div v-if="!user" class="hero__actions animate-slide-up delay-3">
          <button class="btn-google" @click="loginWithGoogle">
            <svg class="btn-google__icon" viewBox="0 0 48 48" width="20" height="20">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Iniciar sesión con Google
          </button>
          <p class="hero__hint">Gratis · Sin registro extra · Solo tu cuenta de Google</p>
        </div>

        <!-- Logged in -->
        <div v-else class="hero__welcome animate-scale-in">
          <div class="hero__welcome-card glass">
            <div class="hero__welcome-avatar">
              <img
                v-if="user.photoURL && !errorFotoHero"
                :src="user.photoURL"
                :alt="user.displayName ?? ''"
                referrerpolicy="no-referrer"
                @error="errorFotoHero = true"
              />
              <span v-else class="hero__welcome-avatar-fallback">
                {{ (user.displayName ?? '?').charAt(0).toUpperCase() }}
              </span>
            </div>
            <div>
              <p class="hero__welcome-greeting">
                ¡Hola, <strong class="text-gold-gradient">{{ user.displayName }}</strong>!
              </p>
              <p class="hero__welcome-sub">Bienvenido de vuelta al tracker del Mundial 2026.</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Dashboard (usuario con sesión iniciada) ─────────── -->
    <section v-if="user" class="dashboard">
      <div class="dashboard__header">
        <h2 class="dashboard__title">
          <span class="text-gold-gradient">Resumen</span> del torneo
        </h2>
        <button class="btn-refetch" @click="cargarDashboard" :disabled="cargandoDashboard">
          Actualizar
        </button>
      </div>

      <!-- Estado: cargando -->
      <div v-if="cargandoDashboard" class="state-box">
        <div class="spinner" />
        <p class="state-text">Calculando indicadores...</p>
      </div>

      <!-- Estado: error -->
      <div v-else-if="errorDashboard" class="state-box">
        <p class="state-text">{{ errorDashboard }}</p>
        <button class="btn-refetch" @click="cargarDashboard">Reintentar</button>
      </div>

      <!-- Estado: vacío -->
      <div v-else-if="!resumen || (resumen.partidosJugados === 0 && resumen.partidosPendientes === 0)" class="state-box">
        <p class="state-text">Todavía no hay partidos registrados para mostrar indicadores.</p>
        <NuxtLink to="/matches" class="btn-refetch">Ir a partidos</NuxtLink>
      </div>

      <!-- Contenido -->
      <template v-else>
        <div class="stats-grid">
          <div v-for="t in tarjetas" :key="t.etiqueta" class="stat-card glass animate-slide-up">
            <span class="stat-card__icon">{{ t.icono }}</span>
            <span class="stat-card__value">{{ t.valor }}</span>
            <span class="stat-card__label">{{ t.etiqueta }}</span>
          </div>
        </div>

        <div class="highlight-card glass-strong animate-slide-up delay-1">
          <h3 class="highlight-card__title">Usuario con mayor puntaje</h3>
          <div v-if="resumen.usuarioDestacado" class="highlight-card__body">
            <span class="highlight-card__avatar">
              {{ resumen.usuarioDestacado.nombre.charAt(0).toUpperCase() }}
            </span>
            <div>
              <p class="highlight-card__name">{{ resumen.usuarioDestacado.nombre }}</p>
              <p class="highlight-card__points">{{ resumen.usuarioDestacado.puntos }} puntos</p>
            </div>
          </div>
          <p v-else class="state-text">Todavía nadie ha sumado puntos con predicciones.</p>
        </div>
      </template>
    </section>

    <!-- ── Features (usuario sin sesión) ───────────────────── -->
    <section v-else class="features">
      <div
        v-for="(feat, i) in features"
        :key="feat.title"
        class="feature-card glass animate-slide-up"
        :class="`delay-${i + 2}`"
      >
        <h3 class="feature-card__title">{{ feat.title }}</h3>
        <p class="feature-card__desc">{{ feat.desc }}</p>
      </div>
    </section>

    <!-- ── Decorative Stadium Silhouette ──────────────────── -->
    <div class="home__decor animate-fade-in delay-5">
      <div class="home__decor-line" />
      <span class="home__decor-text">48 selecciones · 104 partidos · 16 sedes</span>
      <div class="home__decor-line" />
    </div>
  </div>
</template>

<style scoped>
/* ── Home Layout ───────────────────────────────────────────── */
.home {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3xl);
}

/* ── Hero Section ──────────────────────────────────────────── */
.hero {
  position: relative;
  width: 100%;
  text-align: center;
  padding: var(--space-3xl) 0 var(--space-xl);
  overflow: hidden;
}

/* Decorative floating orbs */
.hero__orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.25;
  pointer-events: none;
}

.hero__orb--1 {
  width: 400px;
  height: 400px;
  background: var(--gold-start);
  top: -120px;
  left: -100px;
  animation: float 8s ease-in-out infinite;
}

.hero__orb--2 {
  width: 300px;
  height: 300px;
  background: var(--green-primary);
  bottom: -80px;
  right: -60px;
  animation: float 6s ease-in-out infinite reverse;
}

.hero__content {
  position: relative;
  z-index: 1;
  max-width: 640px;
  margin: 0 auto;
}

/* Badge */
.hero__badge {
  display: inline-block;
  padding: 6px 16px;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  color: var(--text-gold);
  background: rgba(255, 214, 10, 0.08);
  border: 1px solid rgba(255, 214, 10, 0.15);
  margin-bottom: var(--space-lg);
}

/* Title */
.hero__title {
  font-size: clamp(2.2rem, 5vw, 3.5rem);
  font-weight: 900;
  line-height: 1.12;
  letter-spacing: -0.03em;
  margin-bottom: var(--space-lg);
}

/* Subtitle */
.hero__subtitle {
  font-size: 1.05rem;
  line-height: 1.7;
  color: var(--text-secondary);
  max-width: 480px;
  margin: 0 auto var(--space-xl);
}

/* ── Google Button ─────────────────────────────────────────── */
.hero__actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
}

.btn-google {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 14px 28px;
  border-radius: var(--radius-md);
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
  background: var(--bg-glass-strong);
  border: 1px solid var(--border-glass);
  backdrop-filter: blur(12px);
  transition: all var(--transition-base);
  position: relative;
  overflow: hidden;
}

.btn-google::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 214, 10, 0.08) 50%,
    transparent 100%
  );
  background-size: 200% 100%;
  animation: shimmer 3s ease-in-out infinite;
  pointer-events: none;
}

.btn-google:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 214, 10, 0.3);
  box-shadow: var(--shadow-gold);
  transform: translateY(-2px);
}

.btn-google:active {
  transform: translateY(0) scale(0.98);
}

.btn-google__icon {
  flex-shrink: 0;
}

.hero__hint {
  font-size: 0.75rem;
  color: var(--text-muted);
}

/* ── Welcome Card ──────────────────────────────────────────── */
.hero__welcome-card {
  display: flex;
  align-items: center;
  gap: var(--space-lg);
  padding: var(--space-lg) var(--space-xl);
  border-radius: var(--radius-lg);
  text-align: left;
  max-width: 440px;
  margin: 0 auto;
}

.hero__welcome-avatar img {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: 2px solid var(--gold-start);
  box-shadow: 0 0 12px rgba(255, 214, 10, 0.25);
  object-fit: cover;
}

.hero__welcome-avatar-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--gold-gradient);
  color: #0a0e1a;
  font-weight: 700;
  font-size: 1.2rem;
  overflow: hidden;
}

.hero__welcome-greeting {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 4px;
}

.hero__welcome-sub {
  font-size: 0.88rem;
  color: var(--text-secondary);
}

/* ── Dashboard ─────────────────────────────────────────────── */
.dashboard {
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
  width: 100%;
}

.dashboard__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  flex-wrap: wrap;
}

.dashboard__title {
  font-size: clamp(1.4rem, 3vw, 1.8rem);
  font-weight: 800;
  letter-spacing: -0.02em;
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

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--space-lg);
}

.stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-xl);
  border-radius: var(--radius-lg);
  text-align: center;
  transition: transform var(--transition-base), box-shadow var(--transition-base);
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-md);
}

.stat-card__icon {
  font-size: 1.8rem;
}

.stat-card__value {
  font-size: 2rem;
  font-weight: 800;
  color: var(--text-gold);
}

.stat-card__label {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.highlight-card {
  padding: var(--space-xl);
  border-radius: var(--radius-lg);
}

.highlight-card__title {
  font-size: 1.05rem;
  font-weight: 700;
  margin-bottom: var(--space-lg);
}

.highlight-card__body {
  display: flex;
  align-items: center;
  gap: var(--space-lg);
}

.highlight-card__avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--gold-gradient);
  color: #0a0e1a;
  font-weight: 800;
  font-size: 1.3rem;
  flex-shrink: 0;
}

.highlight-card__name {
  font-size: 1.05rem;
  font-weight: 700;
}

.highlight-card__points {
  font-size: 0.85rem;
  color: var(--text-gold);
  margin-top: 2px;
}

/* ── Feature Cards ─────────────────────────────────────────── */
.features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: var(--space-lg);
  width: 100%;
}

.feature-card {
  padding: var(--space-xl);
  border-radius: var(--radius-lg);
  text-align: center;
  transition: transform var(--transition-base), box-shadow var(--transition-base),
              border-color var(--transition-base);
}

.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-md);
  border-color: rgba(255, 214, 10, 0.2);
}

.feature-card__icon {
  display: block;
  font-size: 2.4rem;
  margin-bottom: var(--space-md);
  animation: float 4s ease-in-out infinite;
}

.feature-card:nth-child(2) .feature-card__icon {
  animation-delay: 0.5s;
}

.feature-card:nth-child(3) .feature-card__icon {
  animation-delay: 1s;
}

.feature-card__title {
  font-size: 1.05rem;
  font-weight: 700;
  margin-bottom: var(--space-sm);
  color: var(--text-primary);
}

.feature-card__desc {
  font-size: 0.88rem;
  line-height: 1.6;
  color: var(--text-secondary);
}

/* ── Decorative Footer Line ────────────────────────────────── */
.home__decor {
  display: flex;
  align-items: center;
  gap: var(--space-lg);
  width: 100%;
  padding: var(--space-md) 0;
}

.home__decor-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    var(--border-glass),
    transparent
  );
}

.home__decor-text {
  font-size: 0.78rem;
  color: var(--text-muted);
  white-space: nowrap;
  font-weight: 500;
  letter-spacing: 0.02em;
}

/* ── Responsive ────────────────────────────────────────────── */
@media (max-width: 768px) {
  .hero {
    padding: var(--space-xl) 0;
  }

  .hero__orb--1 {
    width: 250px;
    height: 250px;
  }

  .hero__orb--2 {
    width: 180px;
    height: 180px;
  }

  .hero__welcome-card {
    flex-direction: column;
    text-align: center;
  }

  .features {
    grid-template-columns: 1fr;
  }

  .home__decor-text {
    font-size: 0.7rem;
  }
}
</style>