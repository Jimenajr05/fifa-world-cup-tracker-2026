// Componente de paginación reutilizable, con botones de página y elipsis
<script setup lang="ts">
// Página actual y total de páginas, controladas por el componente padre
const props = defineProps<{
  paginaActual: number
  totalPaginas: number
}>()

// Emite el cambio de página hacia el padre (v-model:paginaActual)
const emit = defineEmits<{
  (e: 'update:paginaActual', valor: number): void
}>()

// Navega a una página válida y distinta de la actual
const ir = (pagina: number) => {
  if (pagina < 1 || pagina > props.totalPaginas || pagina === props.paginaActual) return
  emit('update:paginaActual', pagina)
}

// Lista de páginas a mostrar (primera, última, rango cercano a la actual y elipsis)
const paginasVisibles = computed(() => {
  const total = props.totalPaginas
  const actual = props.paginaActual
  const rango = 1
  const paginas: (number | '...')[] = []

  const inicio = Math.max(2, actual - rango)
  const fin = Math.min(total - 1, actual + rango)

  paginas.push(1)
  if (inicio > 2) paginas.push('...')
  for (let p = inicio; p <= fin; p++) paginas.push(p)
  if (fin < total - 1) paginas.push('...')
  if (total > 1) paginas.push(total)

  return paginas
})
</script>

<template>
  <nav v-if="totalPaginas > 1" class="pagination" aria-label="Paginación">
    <button class="pagination__btn" :disabled="paginaActual === 1" @click="ir(paginaActual - 1)">
      ‹ Anterior
    </button>

    <span v-for="(p, i) in paginasVisibles" :key="`${p}-${i}`" class="pagination__item">
      <span v-if="p === '...'" class="pagination__ellipsis">…</span>
      <button v-else class="pagination__page" :class="{ 'pagination__page--active': p === paginaActual }"
        @click="ir(p as number)">
        {{ p }}
      </button>
    </span>

    <button class="pagination__btn" :disabled="paginaActual === totalPaginas" @click="ir(paginaActual + 1)">
      Siguiente ›
    </button>
  </nav>
</template>

<style scoped>
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  flex-wrap: wrap;
  padding-top: var(--space-md);
}

.pagination__btn,
.pagination__page {
  padding: 8px 14px;
  border-radius: var(--radius-md);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-weight: 600;
  transition: all var(--transition-fast);
}

.pagination__page {
  padding: 8px 13px;
  min-width: 38px;
}

.pagination__btn:hover:not(:disabled),
.pagination__page:hover {
  color: var(--text-primary);
  border-color: var(--border-glass);
}

.pagination__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination__page--active {
  background: var(--gold-gradient);
  border-color: transparent;
  color: #0a0e1a;
}

.pagination__ellipsis {
  padding: 0 4px;
  color: var(--text-muted);
}
</style>