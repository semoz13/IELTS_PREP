import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from '@backend/types/UserType'
import { paths } from '@/api/paths'
import { setAuthToken } from '@/api/axios'
import axios from 'axios'

export const useUserInfoStore = defineStore('userInfo', () => {
  // ─── State ──────────────────────────────────────────────────
  const user = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem('token'))

  // ─── Getters ─────────────────────────────────────────────────
  const isAuthenticated = computed(() => !!token.value)
  const isAdmin = computed(() => user.value?.role === 'admin')
  const fullName = computed(() => {
    if (!user.value) return ''
    return user.value.surName ? `${user.value.name} ${user.value.surName}` : user.value.name
  })

  // ─── Actions ─────────────────────────────────────────────────
  const setAuth = (newToken: string, newUser: User) => {
    token.value = newToken
    user.value = newUser
    localStorage.setItem('token', newToken)
    setAuthToken(newToken)
  }

  const clearAuth = () => {
    token.value = null
    user.value = null
    localStorage.removeItem('token')
    setAuthToken(null)
  }

  const fetchUser = async () => {
    if (!token.value) return
    try {
      const { data } = await axios.get(paths.auth.me())
      user.value = data.user
    } catch {
      clearAuth()
    }
  }

  return {
    user,
    token,
    isAuthenticated,
    isAdmin,
    fullName,
    setAuth,
    clearAuth,
    fetchUser,
  }
})
