// Datos de referencia para los combo box del módulo de Equipos y Jugadores.
// No requieren estar en Firestore: son catálogos fijos para facilitar la carga de datos.

export interface SeleccionRef {
  name: string
  code: string // código ISO usado para la bandera (flagcdn.com)
  confederation: string
}

export const CONFEDERACIONES = [
  'CONMEBOL',
  'UEFA',
  'CONCACAF',
  'CAF',
  'AFC',
  'OFC',
] as const

// Grupos del formato de 48 selecciones (Mundial 2026): A a L
export const GRUPOS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'] as const

export const POSICIONES_JUGADOR = ['Portero', 'Defensa', 'Mediocampista', 'Delantero'] as const

// Clubes conocidos para el combo box de jugadores (no requiere saber de fútbol)
export const CLUBES_REFERENCIA = [
  'Real Madrid',
  'FC Barcelona',
  'Manchester City',
  'Manchester United',
  'Liverpool',
  'Chelsea',
  'Arsenal',
  'Tottenham Hotspur',
  'Bayern Múnich',
  'Borussia Dortmund',
  'Paris Saint-Germain',
  'Juventus',
  'AC Milan',
  'Inter de Milán',
  'Napoli',
  'Atlético de Madrid',
  'Sevilla',
  'Ajax',
  'Porto',
  'Benfica',
  'River Plate',
  'Boca Juniors',
  'Flamengo',
  'Palmeiras',
  'Al Hilal',
  'Al Nassr',
  'Inter Miami',
  'LA Galaxy',
  'Monterrey',
  'Club América',
  'Otro / Sin club',
] as const

export const SELECCIONES_REFERENCIA: SeleccionRef[] = [
  { name: 'Argentina', code: 'ar', confederation: 'CONMEBOL' },
  { name: 'Brasil', code: 'br', confederation: 'CONMEBOL' },
  { name: 'Uruguay', code: 'uy', confederation: 'CONMEBOL' },
  { name: 'Colombia', code: 'co', confederation: 'CONMEBOL' },
  { name: 'Ecuador', code: 'ec', confederation: 'CONMEBOL' },
  { name: 'Paraguay', code: 'py', confederation: 'CONMEBOL' },
  { name: 'España', code: 'es', confederation: 'UEFA' },
  { name: 'Francia', code: 'fr', confederation: 'UEFA' },
  { name: 'Alemania', code: 'de', confederation: 'UEFA' },
  { name: 'Portugal', code: 'pt', confederation: 'UEFA' },
  { name: 'Inglaterra', code: 'gb-eng', confederation: 'UEFA' },
  { name: 'Países Bajos', code: 'nl', confederation: 'UEFA' },
  { name: 'Italia', code: 'it', confederation: 'UEFA' },
  { name: 'Bélgica', code: 'be', confederation: 'UEFA' },
  { name: 'Croacia', code: 'hr', confederation: 'UEFA' },
  { name: 'Suiza', code: 'ch', confederation: 'UEFA' },
  { name: 'Dinamarca', code: 'dk', confederation: 'UEFA' },
  { name: 'Polonia', code: 'pl', confederation: 'UEFA' },
  { name: 'México', code: 'mx', confederation: 'CONCACAF' },
  { name: 'Estados Unidos', code: 'us', confederation: 'CONCACAF' },
  { name: 'Canadá', code: 'ca', confederation: 'CONCACAF' },
  { name: 'Costa Rica', code: 'cr', confederation: 'CONCACAF' },
  { name: 'Panamá', code: 'pa', confederation: 'CONCACAF' },
  { name: 'Jamaica', code: 'jm', confederation: 'CONCACAF' },
  { name: 'Marruecos', code: 'ma', confederation: 'CAF' },
  { name: 'Senegal', code: 'sn', confederation: 'CAF' },
  { name: 'Nigeria', code: 'ng', confederation: 'CAF' },
  { name: 'Ghana', code: 'gh', confederation: 'CAF' },
  { name: 'Camerún', code: 'cm', confederation: 'CAF' },
  { name: 'Egipto', code: 'eg', confederation: 'CAF' },
  { name: 'Túnez', code: 'tn', confederation: 'CAF' },
  { name: 'Argelia', code: 'dz', confederation: 'CAF' },
  { name: 'Japón', code: 'jp', confederation: 'AFC' },
  { name: 'Corea del Sur', code: 'kr', confederation: 'AFC' },
  { name: 'Arabia Saudita', code: 'sa', confederation: 'AFC' },
  { name: 'Irán', code: 'ir', confederation: 'AFC' },
  { name: 'Australia', code: 'au', confederation: 'AFC' },
  { name: 'Catar', code: 'qa', confederation: 'AFC' },
  { name: 'Nueva Zelanda', code: 'nz', confederation: 'OFC' },
]

export const nombresSelecciones = SELECCIONES_REFERENCIA.map((s) => s.name)

export const buscarSeleccionPorNombre = (nombre: string) =>
  SELECCIONES_REFERENCIA.find((s) => s.name === nombre)

export const urlBanderaPorCodigo = (code: string) => `https://flagcdn.com/w160/${code}.png`

// ── Catálogos para el módulo de Partidos ────────────────────────

export interface EstadioRef {
  name: string
  city: string
}

// Sedes oficiales del Mundial 2026 (USA, México, Canadá)
export const ESTADIOS_REFERENCIA: EstadioRef[] = [
  { name: 'Estadio Azteca', city: 'Ciudad de México' },
  { name: 'Estadio Akron', city: 'Guadalajara' },
  { name: 'Estadio BBVA', city: 'Monterrey' },
  { name: 'BC Place', city: 'Vancouver' },
  { name: 'BMO Field', city: 'Toronto' },
  { name: 'MetLife Stadium', city: 'Nueva York / Nueva Jersey' },
  { name: 'AT&T Stadium', city: 'Dallas' },
  { name: 'SoFi Stadium', city: 'Los Ángeles' },
  { name: 'Levi\'s Stadium', city: 'San Francisco' },
  { name: 'Arrowhead Stadium', city: 'Kansas City' },
  { name: 'Mercedes-Benz Stadium', city: 'Atlanta' },
  { name: 'Hard Rock Stadium', city: 'Miami' },
  { name: 'Lincoln Financial Field', city: 'Filadelfia' },
  { name: 'Gillette Stadium', city: 'Boston' },
  { name: 'NRG Stadium', city: 'Houston' },
  { name: 'Lumen Field', city: 'Seattle' },
]

export const nombresEstadios = ESTADIOS_REFERENCIA.map((e) => e.name)

export const buscarEstadioPorNombre = (nombre: string) =>
  ESTADIOS_REFERENCIA.find((e) => e.name === nombre)

export const FASES = [
  'Fase de grupos',
  'Dieciseisavos',
  'Octavos',
  'Cuartos',
  'Semifinal',
  'Tercer lugar',
  'Final',
] as const

export const ESTADOS_PARTIDO = ['Programado', 'En Vivo', 'Finalizado'] as const
