import { createRouter, createWebHistory } from 'vue-router'
import { useUserInfoStore } from '@/stores/userInfo'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    // ─── Public ───────────────────────────────────────────────
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/auth/LoginView.vue'),
      meta: { requiresAuth: false },
    },

    // ─── Protected ────────────────────────────────────────────
    {
      path: '/',
      component: () => import('@/layouts/AppLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'Dashboard',
          component: () => import('@/views/dashboard/DashboardView.vue'),
        },
        {
          path: 'users',
          name: 'Users',
          component: () => import('@/views/dashboard/UsersView.vue'),
          meta: { adminOnly: true },
        },
        {
          path: 'settings',
          name: 'Settings',
          component: () => import('@/views/dashboard/SettingsView.vue'),
        },
        {
          path: 'profile',
          name: 'Profile',
          component: () => import('@/views/dashboard/ProfileView.vue'),
        },
      ],
    },

    // ─── Fallback ─────────────────────────────────────────────
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

// ─── Auth Guard ───────────────────────────────────────────────
router.beforeEach(async (to) => {
  const store = useUserInfoStore()

  const requiresAuth = to.meta.requiresAuth !== false
  const adminOnly = to.meta.adminOnly === true

  // fetch user on page refresh if token exists but user is null
  if (store.token && !store.user) {
    await store.fetchUser()
  }

  if (requiresAuth && !store.isAuthenticated) {
    return { name: 'Login' }
  }

  if (to.name === 'Login' && store.isAuthenticated) {
    return { name: 'Dashboard' }
  }

  if (adminOnly && !store.isAdmin) {
    return { name: 'Dashboard' }
  }
})

export default router
