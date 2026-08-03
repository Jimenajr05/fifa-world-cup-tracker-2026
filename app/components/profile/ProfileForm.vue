<script setup lang="ts">
import { nombresSelecciones } from '~/utils/worldCupData'
import { mensajeError } from '~/utils/validation'

const props = defineProps<{
  nombreInicial: string
  seleccionInicial: string | null
  fotoInicial?: string | null
}>()

const { actualizarPerfil } = useAuth()

const nombreEditable = ref(props.nombreInicial)
const seleccionEditable = ref<string | null>(props.seleccionInicial)
const fotoEditable = ref(props.fotoInicial ?? '')
const guardando = ref(false)
const mensajeExito = ref(false)
const errorPerfil = ref('')
const fileInput = ref<HTMLInputElement | null>(null)

watch(() => props.nombreInicial, (valor) => { nombreEditable.value = valor })
watch(() => props.seleccionInicial, (valor) => { seleccionEditable.value = valor })
watch(() => props.fotoInicial, (valor) => { fotoEditable.value = valor ?? '' })

const triggerFileInput = () => {
  fileInput.value?.click()
}

const onFileSelected = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (!file.type.startsWith('image/')) {
    errorPerfil.value = 'Por favor selecciona un archivo de imagen válido.'
    return
  }

  const reader = new FileReader()
  reader.onload = (e) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const maxSize = 256
      let width = img.width
      let height = img.height
      if (width > height) {
        if (width > maxSize) {
          height = Math.round((height * maxSize) / width)
          width = maxSize
        }
      } else {
        if (height > maxSize) {
          width = Math.round((width * maxSize) / height)
          height = maxSize
        }
      }
      canvas.width = width
      canvas.height = height
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height)
        fotoEditable.value = canvas.toDataURL('image/jpeg', 0.85)
      }
    }
    img.src = e.target?.result as string
  }
  reader.readAsDataURL(file)
}

const guardarCambios = async () => {
  guardando.value = true
  mensajeExito.value = false
  errorPerfil.value = ''
  try {
    await actualizarPerfil({
      nombre: nombreEditable.value,
      seleccionFavorita: seleccionEditable.value ?? '',
      foto: fotoEditable.value,
    })
    mensajeExito.value = true
    setTimeout(() => { mensajeExito.value = false }, 3000)
  } catch (error) {
    console.error('Error al guardar perfil:', error)
    errorPerfil.value = mensajeError(error, 'No se pudo guardar el perfil.')
  } finally {
    guardando.value = false
  }
}
</script>

<template>
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
      <label class="field__label">
        Foto de perfil
      </label>
      <div class="photo-input-group">
        <input
          v-model="fotoEditable"
          type="url"
          placeholder="URL de tu foto de perfil (https://...)"
          class="field__input photo-url-input"
        />
        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          class="hidden-file-input"
          @change="onFileSelected"
        />
        <button
          type="button"
          class="btn-upload"
          @click="triggerFileInput"
          title="Subir imagen desde tu dispositivo"
        >
          📷 Subir imagen
        </button>
      </div>
      <p class="field__help">Puedes pegar la URL de una imagen o subir un archivo desde tu dispositivo.</p>
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

    <p v-if="errorPerfil" class="form-error">{{ errorPerfil }}</p>
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

<style scoped>
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

.field__help {
  font-size: 0.76rem;
  color: var(--text-muted);
}

.photo-input-group {
  display: flex;
  gap: var(--space-sm);
  align-items: center;
}

.photo-url-input {
  flex: 1;
}

.hidden-file-input {
  display: none;
}

.btn-upload {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px 16px;
  background: var(--bg-surface-hover);
  border: 1px solid var(--border-glass);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background var(--transition-fast), border-color var(--transition-fast);
}

.btn-upload:hover {
  background: var(--bg-surface);
  border-color: var(--gold-start);
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

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@media (max-width: 480px) {
  .photo-input-group {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
