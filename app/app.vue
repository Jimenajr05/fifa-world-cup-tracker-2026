<script setup lang="ts">
const { user, loginWithGoogle, logout } = useAuth()
</script>

<template>
  <div style="padding: 2rem; text-align: center;">
    <h1>FIFA World Cup Tracker 2026</h1>

    <div v-if="user">
      <p>Hola, {{ user.displayName }} 👋</p>
      <img :src="user.photoURL ?? ''" alt="avatar" width="60" style="border-radius: 50%;" />
      <br />
      <button @click="logout">Cerrar sesión</button>
    </div>

    <div v-else>
      <button @click="loginWithGoogle">Iniciar sesión con Google</button>
    </div>
  </div>
</template>