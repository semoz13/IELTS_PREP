<template lang="pug">
.container
  .row.justify-content-center.align-items-center(style="min-height: 100vh")
    .col-12.col-sm-8.col-md-5.col-lg-4

      //- Card
      .card.shadow-sm
        .card-body.p-4

          //- Brand
          h4.fw-bold.mb-1 Raqib
          p.text-muted.mb-4 Sign in to your account

          //- Error
          .alert.alert-danger(v-if="error") {{ error }}

          //- Form
          form(@submit.prevent="handleLogin")

            .mb-3
              label.form-label Email
              input.form-control(
                v-model="form.email"
                type="email"
                placeholder="you@example.com"
                required
              )

            .mb-4
              label.form-label Password
              input.form-control(
                v-model="form.password"
                type="password"
                placeholder="••••••••"
                required
              )

            button.btn.btn-primary.w-100(
              type="submit"
              :disabled="loading"
            ) {{ loading ? 'Signing in...' : 'Sign in' }}
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserInfoStore } from '@/stores/userInfo'
import axios from 'axios'
import { paths } from '@/api/paths'
import { toast, treatError } from '@/helpers/utils'

const router = useRouter()
const store = useUserInfoStore()

const form = ref({
  email: '',
  password: '',
})

const error = ref('')
const loading = ref(false)

const handleLogin = async () => {
  loading.value = true
  try {
    const { data } = await axios.post(paths.auth.login(), form.value)
    store.setAuth(data.token, data.user)
    router.push('/')
    toast('success', 'Logged in successfully!')
  } catch (err: any) {
    treatError(err)
  } finally {
    loading.value = false
  }
}
</script>
