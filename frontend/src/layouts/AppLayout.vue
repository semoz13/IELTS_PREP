<template lang="pug">
.d-flex(style="min-height: 100vh")
  SideMenu
  main.flex-grow-1.overflow-auto
    router-view
</template>

<script setup lang="ts">
import SideMenu from '@/components/SideMenu.vue'
</script>
