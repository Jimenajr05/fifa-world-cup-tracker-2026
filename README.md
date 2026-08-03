# FIFA World Cup Tracker 2026 🏆

Aplicación web para seguir el Mundial FIFA 2026: equipos, jugadores, partidos, grupos, bracket de eliminación, predicciones, estadísticas y favoritos personales.

Construida con [Nuxt 4](https://nuxt.com), [Vue 3](https://vuejs.org), [Pinia](https://pinia.vuejs.org) y [Firebase](https://firebase.google.com) (Auth + Firestore).

## Características

- **Equipos y jugadores**: listado, detalle, alineaciones y gestión (alta/edición) de selecciones y plantillas.
- **Partidos**: calendario, resultados, goles automáticos y detalle de cada encuentro.
- **Grupos y tabla de posiciones**: standings por grupo calculados a partir de los resultados.
- **Bracket de eliminación**: visualización del cuadro de fases finales.
- **Predicciones**: los usuarios pueden predecir resultados de partidos y consultar su historial.
- **Perfil de usuario**: favoritos, predicciones propias y edición de perfil.
- **Estadísticas**: panel con métricas del torneo.
- **Autenticación**: registro/inicio de sesión con Firebase Auth y persistencia de sesión.

## Requisitos previos

- Node.js 18 o superior
- Un proyecto de [Firebase](https://console.firebase.google.com/) con **Authentication** y **Firestore** habilitados

## Instalación

Clona el repositorio e instala las dependencias:

```bash
npm install
```

## Configuración de entorno

La app se conecta a Firebase mediante variables de entorno públicas (ver `nuxt.config.ts` y `app/plugins/firebase.ts`). Crea un archivo `.env` en la raíz del proyecto:

```bash
NUXT_PUBLIC_FIREBASE_API_KEY=
NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NUXT_PUBLIC_FIREBASE_PROJECT_ID=
NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NUXT_PUBLIC_FIREBASE_APP_ID=
```

Estos valores se obtienen desde la configuración del proyecto en la consola de Firebase (Configuración del proyecto → Tus apps → SDK de Firebase).

## Servidor de desarrollo

Inicia el servidor en `http://localhost:3000`:

```bash
npm run dev
```

## Producción

Compilar la aplicación:

```bash
npm run build
```

Previsualizar el build de producción localmente:

```bash
npm run preview
```

Generar la app como sitio estático:

```bash
npm run generate
```

Consulta la [documentación de despliegue de Nuxt](https://nuxt.com/docs/getting-started/deployment) para más información.

## Estructura del proyecto

```
app/
├── components/     # Componentes reutilizables (equipos, jugadores, partidos, predicciones, perfil, compartidos)
├── composables/     # Lógica de datos y acceso a Firestore (useTeams, useMatches, usePlayers, usePredictions, etc.)
├── pages/           # Rutas de la app (bracket, groups, matches, players, predictions, profile, stats, teams)
├── plugins/         # Inicialización de Firebase
├── stores/          # Stores de Pinia (auth)
└── utils/           # Datos y validaciones del Mundial (equipos, fixture, roster, validación de formularios)
```

## Stack técnico

| Tecnología | Uso |
|---|---|
| [Nuxt 4](https://nuxt.com) | Framework principal (SSR/Vue) |
| [Vue 3](https://vuejs.org) | Componentes de interfaz |
| [Pinia](https://pinia.vuejs.org) | Manejo de estado (autenticación) |
| [Firebase Auth](https://firebase.google.com/docs/auth) | Registro e inicio de sesión |
| [Firestore](https://firebase.google.com/docs/firestore) | Base de datos de equipos, jugadores, partidos y predicciones |
| TypeScript | Tipado estático |

## Licencia

Proyecto académico desarrollado para el curso de Aplicaciones Web Utilizando Software Libre.
