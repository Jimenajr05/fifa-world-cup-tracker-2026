<script setup lang="ts">
const { estado, responder } = useConfirm()
</script>

<template>
  <Transition name="fade">
    <div v-if="estado.visible" class="confirm-overlay" @click.self="responder(false)">
      <div class="confirm-dialog glass-strong animate-scale-in">
        <p class="confirm-dialog__message">{{ estado.message }}</p>
        <div class="confirm-dialog__actions">
          <button class="confirm-dialog__cancel" @click="responder(false)">Cancelar</button>
          <button class="confirm-dialog__confirm" @click="responder(true)">Eliminar</button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.confirm-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-xl);
  background: rgba(10, 14, 26, 0.7);
  backdrop-filter: blur(4px);
}

.confirm-dialog {
  width: 100%;
  max-width: 360px;
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.confirm-dialog__message {
  font-size: 0.95rem;
  color: var(--text-primary);
  text-align: center;
}

.confirm-dialog__actions {
  display: flex;
  gap: var(--space-md);
}

.confirm-dialog__cancel,
.confirm-dialog__confirm {
  flex: 1;
  padding: 10px 16px;
  border-radius: var(--radius-md);
  font-weight: 600;
  font-size: 0.88rem;
  transition: all var(--transition-fast);
}

.confirm-dialog__cancel {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  color: var(--text-secondary);
}

.confirm-dialog__cancel:hover {
  color: var(--text-primary);
  border-color: var(--border-glass);
}

.confirm-dialog__confirm {
  background: rgba(255, 107, 107, 0.12);
  border: 1px solid rgba(255, 107, 107, 0.3);
  color: #ff6b6b;
}

.confirm-dialog__confirm:hover {
  background: rgba(255, 107, 107, 0.2);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
