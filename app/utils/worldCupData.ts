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

export const OTRO_ENTRENADOR = 'Otro / Escribir nombre'
export const OTRO_NOMBRE_JUGADOR = 'Otro / Escribir nombre'

// Entrenadores REALES de cada selección clasificada al Mundial 2026, según
// medios especializados (mayo 2026). Las selecciones que NO clasificaron a
// esta edición (Italia, Dinamarca, Polonia, Camerún, Costa Rica, Nigeria,
// Jamaica) no tienen entrada aquí a propósito: no corresponde sugerir un
// entrenador de un Mundial en el que ese equipo no participa; en el combo
// caen directo a "Otro / Escribir nombre".
export const ENTRENADORES_POR_SELECCION: Record<string, string> = {
  Argentina: 'Lionel Scaloni',
  Brasil: 'Carlo Ancelotti',
  Uruguay: 'Marcelo Bielsa',
  Colombia: 'Néstor Lorenzo',
  Ecuador: 'Sebastián Beccacece',
  Paraguay: 'Gustavo Alfaro',
  España: 'Luis de la Fuente',
  Francia: 'Didier Deschamps',
  Alemania: 'Julian Nagelsmann',
  Portugal: 'Roberto Martínez',
  Inglaterra: 'Thomas Tuchel',
  'Países Bajos': 'Ronald Koeman',
  Bélgica: 'Rudi Garcia',
  Croacia: 'Zlatko Dalić',
  Suiza: 'Murat Yakin',
  México: 'Javier Aguirre',
  'Estados Unidos': 'Mauricio Pochettino',
  Canadá: 'Jesse Marsch',
  Panamá: 'Thomas Christiansen',
  Marruecos: 'Walid Regragui',
  Senegal: 'Pape Thiaw',
  Ghana: 'Carlos Queiroz',
  Egipto: 'Hossam Hassan',
  Túnez: 'Sami Trabelsi',
  Argelia: 'Vladimir Petković',
  Japón: 'Hajime Moriyasu',
  'Corea del Sur': 'Hong Myung-bo',
  'Arabia Saudita': 'Hervé Renard',
  Irán: 'Amir Ghalenoei',
  Australia: 'Tony Popovic',
  Catar: 'Luis García',
  'Nueva Zelanda': 'Darren Bazeley',
  Austria: 'Ralf Rangnick',
  'Bosnia y Herzegovina': 'Sergej Barbarez',
  Escocia: 'Steve Clarke',
  Noruega: 'Ståle Solbakken',
  'República Checa': 'Ivan Hašek',
  Suecia: 'Jon Dahl Tomasson',
  Turquía: 'Vincenzo Montella',
  'Cabo Verde': 'Bubista',
  'Costa de Marfil': 'Emerse Faé',
  'RD del Congo': 'Sébastien Desabre',
  Sudáfrica: 'Hugo Broos',
  Irak: 'Graham Arnold',
  Jordania: 'Hussein Ammouta',
  Uzbekistán: 'Srečko Katanec',
  Curazao: 'Dick Advocaat',
  Haití: 'Sébastien Migné',
}

// Lista plana (fallback mientras no se conoce la selección elegida)
export const ENTRENADORES_REFERENCIA = [
  ...new Set(Object.values(ENTRENADORES_POR_SELECCION)),
] as const

// Jugadores REALES de referencia (figuras conocidas) de cada selección
// clasificada al Mundial 2026, según cobertura de prensa deportiva.
export const NOMBRES_JUGADORES_POR_SELECCION: Record<string, readonly string[]> = {
  Argentina: ['Lionel Messi', 'Julián Álvarez', 'Lautaro Martínez', 'Enzo Fernández', 'Rodrigo De Paul', 'Emiliano Martínez'],
  Brasil: ['Vinícius Júnior', 'Neymar', 'Matheus Cunha', 'Raphinha', 'Gabriel Martinelli', 'Endrick'],
  Uruguay: ['Federico Valverde', 'Rodrigo Bentancur', 'José María Giménez', 'Fernando Muslera', 'Manuel Ugarte'],
  Colombia: ['James Rodríguez'],
  Ecuador: ['Moisés Caicedo'],
  Paraguay: ['Miguel Almirón', 'Antonio Sanabria'],
  Francia: ['Kylian Mbappé'],
  Portugal: ['Cristiano Ronaldo'],
  Inglaterra: ['Jude Bellingham', 'Harry Kane'],
  Croacia: ['Luka Modrić'],
  'Países Bajos': ['Memphis Depay', 'Cody Gakpo', 'Donyell Malen', 'Virgil van Dijk', 'Frenkie de Jong'],
  México: ['Guillermo Ochoa', 'Edson Álvarez', 'Raúl Jiménez', 'Santiago Giménez'],
  'Estados Unidos': ['Christian Pulisic'],
  Canadá: ['Stephen Eustáquio', 'Alistair Johnston'],
  Panamá: ['Aníbal Godoy', 'José Fajardo', 'Cecilio Waterman'],
  Marruecos: ['Yassine Bounou', 'Nayef Aguerd', 'Sofyan Amrabat', 'Achraf Hakimi'],
  Senegal: ['Sadio Mané'],
  Egipto: ['Mohamed Salah'],
  Japón: ['Wataru Endo', 'Kaoru Mitoma', 'Daichi Kamada', 'Ao Tanaka', 'Daizen Maeda'],
  'Corea del Sur': ['Son Heung-min', 'Lee Jae-sung', 'Hwang Hee-chan', 'Kim Min-jae'],
  Australia: ['Mathew Leckie', 'Nestory Irankunda'],
  Alemania: ['Jamal Musiala', 'Florian Wirtz', 'Kai Havertz', 'Joshua Kimmich', 'Manuel Neuer'],
  España: ['Lamine Yamal', 'Pedri', 'Nico Williams', 'Álvaro Morata', 'Rodri'],
  Bélgica: ['Kevin De Bruyne', 'Romelu Lukaku', 'Jérémy Doku'],
  Austria: ['David Alaba', 'Marcel Sabitzer', 'Christoph Baumgartner'],
  'Bosnia y Herzegovina': ['Edin Džeko'],
  Escocia: ['Andy Robertson', 'Scott McTominay'],
  Noruega: ['Erling Haaland', 'Martin Ødegaard'],
  'República Checa': ['Patrik Schick'],
  Suecia: ['Alexander Isak', 'Viktor Gyökeres'],
  Suiza: ['Granit Xhaka', 'Manuel Akanji'],
  Turquía: ['Arda Güler', 'Kenan Yıldız'],
  Argelia: ['Riyad Mahrez'],
  'Cabo Verde': ['Ryan Mendes'],
  'Costa de Marfil': ['Sébastien Haller', 'Franck Kessié'],
  Ghana: ['Mohammed Kudus', 'Thomas Partey'],
  'RD del Congo': ['Chancel Mbemba'],
  Sudáfrica: ['Percy Tau'],
  Túnez: ['Ellyes Skhiri'],
  'Arabia Saudita': ['Salem Al-Dawsari'],
  Catar: ['Akram Afif'],
  Irak: ['Ayman Hussein'],
  Irán: ['Mehdi Taremi'],
  Jordania: ['Musa Al-Taamari'],
  Uzbekistán: ['Eldor Shomurodov'],
  'Nueva Zelanda': ['Chris Wood'],
  Curazao: ['Juninho Bacuna'],
  Haití: ['Duckens Nazon'],
}

// Lista plana (fallback general, solo jugadores verificados de cualquier selección)
export const NOMBRES_JUGADORES_REFERENCIA = [
  ...new Set(Object.values(NOMBRES_JUGADORES_POR_SELECCION).flat()),
] as const

export const SELECCIONES_REFERENCIA: SeleccionRef[] = [
  // CONMEBOL (6)
  { name: 'Argentina', code: 'ar', confederation: 'CONMEBOL' },
  { name: 'Brasil', code: 'br', confederation: 'CONMEBOL' },
  { name: 'Colombia', code: 'co', confederation: 'CONMEBOL' },
  { name: 'Ecuador', code: 'ec', confederation: 'CONMEBOL' },
  { name: 'Paraguay', code: 'py', confederation: 'CONMEBOL' },
  { name: 'Uruguay', code: 'uy', confederation: 'CONMEBOL' },

  // UEFA (16)
  { name: 'Alemania', code: 'de', confederation: 'UEFA' },
  { name: 'Austria', code: 'at', confederation: 'UEFA' },
  { name: 'Bélgica', code: 'be', confederation: 'UEFA' },
  { name: 'Bosnia y Herzegovina', code: 'ba', confederation: 'UEFA' },
  { name: 'Croacia', code: 'hr', confederation: 'UEFA' },
  { name: 'España', code: 'es', confederation: 'UEFA' },
  { name: 'Escocia', code: 'gb-sct', confederation: 'UEFA' },
  { name: 'Francia', code: 'fr', confederation: 'UEFA' },
  { name: 'Inglaterra', code: 'gb-eng', confederation: 'UEFA' },
  { name: 'Noruega', code: 'no', confederation: 'UEFA' },
  { name: 'Países Bajos', code: 'nl', confederation: 'UEFA' },
  { name: 'Portugal', code: 'pt', confederation: 'UEFA' },
  { name: 'República Checa', code: 'cz', confederation: 'UEFA' },
  { name: 'Suecia', code: 'se', confederation: 'UEFA' },
  { name: 'Suiza', code: 'ch', confederation: 'UEFA' },
  { name: 'Turquía', code: 'tr', confederation: 'UEFA' },

  // CAF (10)
  { name: 'Argelia', code: 'dz', confederation: 'CAF' },
  { name: 'Cabo Verde', code: 'cv', confederation: 'CAF' },
  { name: 'Costa de Marfil', code: 'ci', confederation: 'CAF' },
  { name: 'Egipto', code: 'eg', confederation: 'CAF' },
  { name: 'Ghana', code: 'gh', confederation: 'CAF' },
  { name: 'Marruecos', code: 'ma', confederation: 'CAF' },
  { name: 'RD del Congo', code: 'cd', confederation: 'CAF' },
  { name: 'Senegal', code: 'sn', confederation: 'CAF' },
  { name: 'Sudáfrica', code: 'za', confederation: 'CAF' },
  { name: 'Túnez', code: 'tn', confederation: 'CAF' },

  // AFC (9)
  { name: 'Arabia Saudita', code: 'sa', confederation: 'AFC' },
  { name: 'Australia', code: 'au', confederation: 'AFC' },
  { name: 'Catar', code: 'qa', confederation: 'AFC' },
  { name: 'Corea del Sur', code: 'kr', confederation: 'AFC' },
  { name: 'Irak', code: 'iq', confederation: 'AFC' },
  { name: 'Irán', code: 'ir', confederation: 'AFC' },
  { name: 'Japón', code: 'jp', confederation: 'AFC' },
  { name: 'Jordania', code: 'jo', confederation: 'AFC' },
  { name: 'Uzbekistán', code: 'uz', confederation: 'AFC' },

  // CONCACAF (6) — incluye los 3 países anfitriones
  { name: 'Canadá', code: 'ca', confederation: 'CONCACAF' },
  { name: 'Curazao', code: 'cw', confederation: 'CONCACAF' },
  { name: 'Estados Unidos', code: 'us', confederation: 'CONCACAF' },
  { name: 'Haití', code: 'ht', confederation: 'CONCACAF' },
  { name: 'México', code: 'mx', confederation: 'CONCACAF' },
  { name: 'Panamá', code: 'pa', confederation: 'CONCACAF' },

  // OFC (1)
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