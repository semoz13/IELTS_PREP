<template lang="pug">
.p-4
  h4.fw-bold Dashboard
  p.text-muted Welcome back, {{ store.fullName }}
</template>

<script setup lang="ts">
import { useUserInfoStore } from '@/stores/userInfo'
const store = useUserInfoStore()
</script>
