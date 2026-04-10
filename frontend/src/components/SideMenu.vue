<template lang="pug">
aside.d-flex.flex-column.border-end.p-3(style="width: 240px; min-height: 100vh")

  //- Logo
  .fw-bold.fs-4.mb-4 Raqib

  //- Nav
  nav.d-flex.flex-column.gap-2.flex-grow-1
    router-link(
      v-for="item in navItems"
      :key="item.to"
      :to="item.to"
      v-show="!item.adminOnly || store.isAdmin"
      class="nav-link text-dark rounded px-3 py-2"
      active-class="bg-light fw-semibold"
    ) {{ item.label }}

  //- Footer
  .border-top.pt-3
    p.mb-0.fw-semibold {{ store.fullName }}
    p.mb-2.text-muted.small {{ store.user?.role }}
    button.btn.btn-outline-danger.btn-sm.w-100(@click="logout") Logout
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useUserInfoStore } from '@/stores/userInfo'
import { paths } from '@/api/paths'
import axios from 'axios'
import { toast, treatError } from '@/helpers/utils'

const router = useRouter()
const store = useUserInfoStore()

const navItems = [
  { label: 'Dashboard', to: '/' },
  { label: 'Users', to: '/users', adminOnly: true },
  { label: 'Settings', to: '/settings' },
  { label: 'Profile', to: '/profile' },
]

const logout = async () => {
  try {
    await axios.post(paths.auth.logout())
    store.clearAuth()
    router.push('/login')
    toast('success', 'Logged out successfully')
  } catch (error) {
    treatError(error)
  }
}
</script>
