// Formulario para editar un partido
<script setup lang="ts">

// Timestamp de Firestore y consultas directas para cargar plantillas de jugadores
import {
  Timestamp,
  collection as firestoreCollection,
  query as firestoreQuery,
  where as firestoreWhere,
  getDocs as firestoreGetDocs,
} from 'firebase/firestore'
// Tipos de partido y goleador
import type { Match, MatchScorer } from '~/composables/useMatches'
// Catálogos de fases, grupos, estados, posiciones y estadios
import { FASES, GRUPOS, ESTADOS_PARTIDO, POSICIONES_JUGADOR, nombresEstadios, buscarEstadioPorNombre } from '~/utils/worldCupData'
// Extrae un mensaje de error amigable
import { mensajeError } from '~/utils/validation'

// Partido que se está editando
const props = defineProps<{
  match: Match
}>()

// Notifica al padre cuando se guarda o se cancela la edición
const emit = defineEmits<{
  (e: 'saved'): void
  (e: 'cancel'): void
}>()

// Composables
// Acción de actualización de partidos
const { updateMatch } = useMatches()
// Equipos registrados, usados para llenar los selects de local/visitante
const { teams: equiposRegistrados } = useTeams()
// Avanza al ganador en el bracket cuando el partido es de eliminatoria
const { avanzarGanador } = useBracket()
// Recalcula los puntos de las predicciones cuando el partido finaliza
const { calcularPuntos } = usePredictions()

// Nombres de equipos registrados, ordenados alfabéticamente
const nombresEquiposRegistrados = computed(() => equiposRegistrados.value.map((t) => t.name).sort())
// Busca el id de un equipo registrado a partir de su nombre
const idDeEquipo = (nombre: string) => equiposRegistrados.value.find((t) => t.name === nombre)?.id ?? null

// Plantilla del equipo local, cargada desde Firestore
const jugadoresLocal = ref<{ id: string; name: string; position: string }[]>([])
// Plantilla del equipo visitante, cargada desde Firestore
const jugadoresVisitante = ref<{ id: string; name: string; position: string }[]>([])

// Etiquetas en plural para agrupar jugadores por posición en los selects
const PLURAL_POSICION: Record<string, string> = {
  Portero: 'Porteros',
  Defensa: 'Defensas',
  Mediocampista: 'Mediocampistas',
  Delantero: 'Delanteros',
}
// Agrupa una lista de jugadores por posición, omitiendo grupos vacíos
const agruparPorPosicion = (jugadores: { id: string; name: string; position: string }[]) => {
  return POSICIONES_JUGADOR.map((posicion) => ({
    posicion,
    etiqueta: PLURAL_POSICION[posicion] ?? posicion,
    jugadores: jugadores.filter((j) => j.position === posicion),
  })).filter((grupo) => grupo.jugadores.length > 0)
}
// Lista editable de goleadores del partido
const goleadores = ref<MatchScorer[]>(props.match.scorers ? [...props.match.scorers] : [])

// Indica si se están guardando los cambios
const guardando = ref(false)
// Mensaje de error de la edición
const errorEdicion = ref('')

// Convierte un Timestamp de Firestore al formato que espera un input datetime-local
const fechaParaInput = (ts: Timestamp) => {
  const d = ts.toDate()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Copia editable de los datos del partido
const formulario = reactive({
  homeTeam: props.match.homeTeam,
  awayTeam: props.match.awayTeam,
  stage: props.match.stage,
  group: props.match.group ?? '',
  stadium: props.match.stadium,
  city: props.match.city,
  fecha: fechaParaInput(props.match.kickoff),
  status: props.match.status,
  homeScore: props.match.homeScore,
  awayScore: props.match.awayScore,
})

// Autocompleta la ciudad al cambiar el estadio
watch(() => formulario.stadium, (nombre) => {
  const estadio = buscarEstadioPorNombre(nombre)
  if (estadio) formulario.city = estadio.city
})

// Carga las plantillas de jugadores de ambos equipos para elegir goleadores
const cargarPlantillas = async () => {
  const { db: $firestore } = useFirestore()

  if (equiposRegistrados.value.length === 0) {
    const { fetchTeams } = useTeams()
    await fetchTeams()
  }

  const idLocal = idDeEquipo(formulario.homeTeam)
  if (idLocal) {
    const q = firestoreQuery(firestoreCollection($firestore, 'players'), firestoreWhere('teamId', '==', idLocal))
    const snap = await firestoreGetDocs(q)
    jugadoresLocal.value = snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as { name: string; position: string }) }))
      .sort((a, b) => a.name.localeCompare(b.name))
  } else {
    jugadoresLocal.value = []
  }

  const idVisitante = idDeEquipo(formulario.awayTeam)
  if (idVisitante) {
    const q = firestoreQuery(firestoreCollection($firestore, 'players'), firestoreWhere('teamId', '==', idVisitante))
    const snap = await firestoreGetDocs(q)
    jugadoresVisitante.value = snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as { name: string; position: string }) }))
      .sort((a, b) => a.name.localeCompare(b.name))
  } else {
    jugadoresVisitante.value = []
  }
}
cargarPlantillas()

// Agrega una fila vacía de goleador para el equipo local o visitante
const agregarGoleador = (lado: 'local' | 'visitante') => {
  const equipoId = lado === 'local' ? idDeEquipo(formulario.homeTeam) : idDeEquipo(formulario.awayTeam)
  if (!equipoId) return
  goleadores.value.push({ playerId: '', playerName: '', teamId: equipoId, goals: 1 })
}

// Actualiza el jugador elegido para una fila de goleador, según el equipo (local/visitante)
const actualizarGoleadorJugador = (index: number, playerId: string, lado: 'local' | 'visitante') => {
  const lista = lado === 'local' ? jugadoresLocal.value : jugadoresVisitante.value
  const jugador = lista.find((j) => j.id === playerId)
  const goleador = goleadores.value[index]
  if (goleador && jugador) {
    goleador.playerId = jugador.id
    goleador.playerName = jugador.name
  }
}

// Elimina una fila de goleador
const quitarGoleador = (index: number) => {
  goleadores.value.splice(index, 1)
}

// Goleadores filtrados del equipo local
const goleadoresLocal = computed(() => goleadores.value.filter((g) => g.teamId === idDeEquipo(formulario.homeTeam)))
// Goleadores filtrados del equipo visitante
const goleadoresVisitante = computed(() => goleadores.value.filter((g) => g.teamId === idDeEquipo(formulario.awayTeam)))
// Índice real de un goleador dentro del arreglo completo (necesario tras filtrar)
const indiceGlobal = (g: MatchScorer) => goleadores.value.indexOf(g)

// Jugadores del equipo local agrupados por posición, para el select de goleadores
const jugadoresLocalAgrupados = computed(() => agruparPorPosicion(jugadoresLocal.value))
// Jugadores del equipo visitante agrupados por posición, para el select de goleadores
const jugadoresVisitanteAgrupados = computed(() => agruparPorPosicion(jugadoresVisitante.value))

// Valida el marcador, guarda los cambios y dispara efectos secundarios si el partido finaliza
// (cálculo de puntos de predicciones y avance en el bracket de eliminatoria)
const guardarCambios = async () => {
  errorEdicion.value = ''

  const esVacio = (v: number | null) => v === null || v === undefined || (v as unknown) === ''
  const marcadorIncompleto = esVacio(formulario.homeScore) || esVacio(formulario.awayScore)
  if (formulario.status === 'Finalizado' && marcadorIncompleto) {
    errorEdicion.value = 'Ingresa el marcador de ambos equipos para marcar el partido como Finalizado.'
    return
  }

  guardando.value = true
  try {
    const homeScore = esVacio(formulario.homeScore) ? null : Number(formulario.homeScore)
    const awayScore = esVacio(formulario.awayScore) ? null : Number(formulario.awayScore)

    await updateMatch(props.match.id, {
      homeTeam: formulario.homeTeam,
      awayTeam: formulario.awayTeam,
      homeTeamId: idDeEquipo(formulario.homeTeam),
      awayTeamId: idDeEquipo(formulario.awayTeam),
      stage: formulario.stage,
      group: formulario.stage === 'Fase de grupos' ? formulario.group : null,
      stadium: formulario.stadium,
      city: formulario.city,
      kickoff: Timestamp.fromDate(new Date(formulario.fecha)),
      status: formulario.status,
      homeScore,
      awayScore,
      scorers: goleadores.value.filter((g) => g.playerId), // descarta filas sin jugador seleccionado
    })

    const partidoActualizado = { ...props.match, homeTeam: formulario.homeTeam, awayTeam: formulario.awayTeam, stage: formulario.stage, homeScore, awayScore, status: formulario.status }

    if (formulario.status === 'Finalizado') {
      await calcularPuntos(partidoActualizado)
    }

    const esEliminatoria = formulario.stage !== 'Fase de grupos'
    if (esEliminatoria && formulario.status === 'Finalizado') {
      await avanzarGanador(partidoActualizado)
    }

    emit('saved')
  } catch (err) {
    console.error('Error al actualizar partido:', err)
    errorEdicion.value = mensajeError(err, 'No se pudo actualizar el partido.')
  } finally {
    guardando.value = false
  }
}
</script>

<template>
  <form class="edit-form" @submit.prevent="guardarCambios">
    <div class="edit-form__grid">
      <div class="field">
        <label class="field__label">Equipo local</label>
        <select v-model="formulario.homeTeam" class="field__input" required>
          <option v-for="n in nombresEquiposRegistrados" :key="n" :value="n">{{ n }}</option>
        </select>
      </div>
      <div class="field">
        <label class="field__label">Equipo visitante</label>
        <select v-model="formulario.awayTeam" class="field__input" required>
          <option v-for="n in nombresEquiposRegistrados" :key="n" :value="n">{{ n }}</option>
        </select>
      </div>
      <div class="field">
        <label class="field__label">Gol. local</label>
        <input v-model.number="formulario.homeScore" type="number" min="0" class="field__input"
          placeholder="Sin jugar" />
      </div>
      <div class="field">
        <label class="field__label">Gol. visitante</label>
        <input v-model.number="formulario.awayScore" type="number" min="0" class="field__input"
          placeholder="Sin jugar" />
      </div>
      <div class="field">
        <label class="field__label">Fase</label>
        <select v-model="formulario.stage" class="field__input" required>
          <option v-for="f in FASES" :key="f" :value="f">{{ f }}</option>
        </select>
      </div>
      <div v-if="formulario.stage === 'Fase de grupos'" class="field">
        <label class="field__label">Grupo</label>
        <select v-model="formulario.group" class="field__input" required>
          <option value="" disabled>Selecciona un grupo</option>
          <option v-for="g in GRUPOS" :key="g" :value="g">Grupo {{ g }}</option>
        </select>
      </div>
      <div class="field">
        <label class="field__label">Estadio</label>
        <select v-model="formulario.stadium" class="field__input" required>
          <option v-for="e in nombresEstadios" :key="e" :value="e">{{ e }}</option>
        </select>
      </div>
      <div class="field">
        <label class="field__label">Ciudad</label>
        <input v-model="formulario.city" type="text" class="field__input" readonly />
      </div>
      <div class="field">
        <label class="field__label">Fecha y hora</label>
        <input v-model="formulario.fecha" type="datetime-local" class="field__input" required />
      </div>
      <div class="field">
        <label class="field__label">Estado</label>
        <select v-model="formulario.status" class="field__input" required>
          <option v-for="e in ESTADOS_PARTIDO" :key="e" :value="e">{{ e }}</option>
        </select>
      </div>
    </div>
    <p v-if="errorEdicion" class="form-error">{{ errorEdicion }}</p>

    <div class="scorers-section">
      <h3 class="scorers-section__title">Goleadores</h3>

      <div class="scorers-team">
        <p class="scorers-team__label">{{ formulario.homeTeam }}</p>
        <div v-for="g in goleadoresLocal" :key="`h-${indiceGlobal(g)}`" class="scorer-row">
          <select :value="g.playerId" class="field__input"
            @change="actualizarGoleadorJugador(indiceGlobal(g), ($event.target as HTMLSelectElement).value, 'local')">
            <option value="" disabled>Selecciona jugador</option>
            <optgroup v-for="grupo in jugadoresLocalAgrupados" :key="grupo.posicion" :label="grupo.etiqueta">
              <option v-for="j in grupo.jugadores" :key="j.id" :value="j.id">{{ j.name }}</option>
            </optgroup>
          </select>
          <input v-model.number="g.goals" type="number" min="1" class="field__input scorer-row__goals" />
          <button type="button" class="scorer-row__remove" @click="quitarGoleador(indiceGlobal(g))">✕</button>
        </div>
        <button type="button" class="scorers-team__add" @click="agregarGoleador('local')">+ Agregar goleador</button>
      </div>

      <div class="scorers-team">
        <p class="scorers-team__label">{{ formulario.awayTeam }}</p>
        <div v-for="g in goleadoresVisitante" :key="`a-${indiceGlobal(g)}`" class="scorer-row">
          <select :value="g.playerId" class="field__input"
            @change="actualizarGoleadorJugador(indiceGlobal(g), ($event.target as HTMLSelectElement).value, 'visitante')">
            <option value="" disabled>Selecciona jugador</option>
            <optgroup v-for="grupo in jugadoresVisitanteAgrupados" :key="grupo.posicion" :label="grupo.etiqueta">
              <option v-for="j in grupo.jugadores" :key="j.id" :value="j.id">{{ j.name }}</option>
            </optgroup>
          </select>
          <input v-model.number="g.goals" type="number" min="1" class="field__input scorer-row__goals" />
          <button type="button" class="scorer-row__remove" @click="quitarGoleador(indiceGlobal(g))">✕</button>
        </div>
        <button type="button" class="scorers-team__add" @click="agregarGoleador('visitante')">+ Agregar
          goleador</button>
      </div>
    </div>

    <div class="edit-form__actions">
      <button type="submit" class="btn-edit" :disabled="guardando">
        {{ guardando ? 'Guardando...' : 'Guardar cambios' }}
      </button>
      <button type="button" class="btn-cancel" @click="emit('cancel')">Cancelar</button>
    </div>
  </form>
</template>

<style scoped>
.edit-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.edit-form__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
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

.form-error {
  color: #ff6b6b;
  font-size: 0.85rem;
}

.edit-form__actions {
  display: flex;
  gap: var(--space-md);
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

.btn-cancel {
  padding: 10px 22px;
  border-radius: var(--radius-md);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 0.88rem;
}

.scorers-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  padding-top: var(--space-md);
  border-top: 1px solid var(--border-subtle);
}

.scorers-section__title {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-gold);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.scorers-team {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.scorers-team__label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.scorer-row {
  display: flex;
  gap: var(--space-sm);
  align-items: center;
}

.scorer-row .field__input {
  flex: 1;
}

.scorer-row__goals {
  flex: 0 0 70px;
}

.scorer-row__remove {
  flex: 0 0 auto;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  color: var(--text-muted);
  background: var(--bg-surface);
  font-size: 0.75rem;
}

.scorer-row__remove:hover {
  color: #ff6b6b;
  background: rgba(255, 107, 107, 0.1);
}

.scorers-team__add {
  align-self: flex-start;
  font-size: 0.8rem;
  color: var(--text-gold);
  font-weight: 600;
}

.scorers-team__add:hover {
  text-decoration: underline;
}
</style>