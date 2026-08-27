<script setup lang="ts">

import { useAuthStore } from '@/stores/auth';
import Loading from '@/components/loaders/Loading.vue';

const authStore = useAuthStore()
const { $api,$toast } = useNuxtApp()

const email = ref('')
const password = ref('')
const error = ref('')
const fullLoading = ref(false)
const showPassword = ref(false)

// Admin 2FA (email OTP) — 'password' collects credentials, 'otp' collects the code
// emailed after a correct password when 2FA is on.
const step = ref<'password' | 'otp'>('password')
const otp = ref('')

// Cloudflare Turnstile — empty + inert until a site key is configured.
const turnstileToken = ref('')
const tsRef = ref<any>(null)

const rememberDevice = ref(false);
import { ref, onMounted, watch } from 'vue'

const handleLogin = async () => {

  error.value = ''

  if (!email.value.trim()){
   error.value = 'Please enter your email address.';
    $toast('Please enter your email address.','error');
    return;
  }

  if (!/\S+@\S+\.\S+/.test(email.value.trim())) {
    error.value = 'Invalid your email address'
    $toast('Invalid your email address','error');
       return;
  }

  if (!password.value.trim()){
     error.value = 'Please enter your password.'
     $toast('Please enter your password.','error');
      return;
  }
  
  fullLoading.value = true

  try {
        // Log in through the same-origin server route: it sets the HttpOnly
        // session cookie server-side and returns the backend body directly.
        const res:any = await $fetch('/api/login', {
          method: 'POST',
          credentials: 'include',
          body: {
            email: email.value,
            password: password.value,
            remember: rememberDevice.value,
            turnstileToken: turnstileToken.value
          }
        })

        const obj:any = res

        // 2FA is on for this admin — password was correct, a code was emailed. Switch
        // to the OTP step instead of treating this as success or error.
        if (obj.status === 'otp_required') {
          step.value = 'otp'
          otp.value = ''
          $toast(obj.msg || 'A verification code has been sent to your email.', 'success')
          return;
        }

        if (obj.status !== "success") {
          const message = obj.message ||  obj.msg || 'Invalid Your Login Details';
          error.value = message;
          $toast(message,'error');
          return;
        }

        if (import.meta.client) {
          if (rememberDevice.value) {
          localStorage.setItem('remember_device', 'true');
          localStorage.setItem('remember_email', email.value);
          } else {
          localStorage.removeItem('remember_device');
          localStorage.removeItem('remember_email');
          }
        }

          const authUser = obj.user ?? null
          const authToken = obj.token??null

          if (!authToken || typeof authToken !== 'string') {
             const messge = obj.message ||  obj.msg || 'Invalid login response';
              error.value = messge;
              $toast(messge,'error');
              return;
          }

            // only store handles cookie write
            authStore.setAuth({
            token: authToken,
            user: authUser
            })

          // FORCE redirect
          await navigateTo('/dashboard')
      
  } catch (err: any) {
    const message = err?.data?.msg || err?.data?.message
      || err?.response?.data?.msg || err?.response?.data?.message
      || 'Invalid email or password'
    error.value = message;
    $toast(message,'error');

  } finally {
    fullLoading.value = false
    // Turnstile tokens are single-use — reset so a retry gets a fresh one.
    tsRef.value?.reset?.()
  }
}

// Step two: verify the emailed OTP. On success the server route plants the session
// cookie and returns the token/user, same shape as a direct login.
const handleVerifyOtp = async () => {
  error.value = ''
  if (!otp.value.trim()) {
    error.value = 'Please enter the verification code.'
    $toast('Please enter the verification code.', 'error')
    return
  }

  fullLoading.value = true
  try {
    const res:any = await $fetch('/api/verify-otp', {
      method: 'POST',
      credentials: 'include',
      body: { email: email.value, otp: otp.value.trim() }
    })

    const obj:any = res
    if (obj.status !== 'success') {
      const message = obj.message || obj.msg || 'Invalid or expired code'
      error.value = message
      $toast(message, 'error')
      return
    }

    const authUser = obj.user ?? null
    const authToken = obj.token ?? null
    if (!authToken || typeof authToken !== 'string') {
      const message = obj.message || obj.msg || 'Invalid login response'
      error.value = message
      $toast(message, 'error')
      return
    }

    authStore.setAuth({ token: authToken, user: authUser })
    await navigateTo('/dashboard')
  } catch (err: any) {
    const message = err?.data?.msg || err?.data?.message
      || err?.response?.data?.msg || err?.response?.data?.message
      || 'Invalid or expired code'
    error.value = message
    $toast(message, 'error')
  } finally {
    fullLoading.value = false
  }
}

// Back to the credentials step (e.g. wrong email) — clears the pending code.
const backToPassword = () => {
  step.value = 'password'
  otp.value = ''
  error.value = ''
}

watch(email, (val) => {
  if (!val) {
    error.value = 'Please enter your email address.'
  } else {
    error.value = ''
  }
})

watch(password, (val) => {
  if (!val) {
    error.value = 'Please enter your password.'
  } else {
    error.value = ''
  }
})

onMounted(() => {
  if (import.meta.client) {
    const remember = localStorage.getItem('remember_device');
    const savedEmail = localStorage.getItem('remember_email');
    if (remember === 'true' && savedEmail) {
      rememberDevice.value = true;
      email.value = savedEmail;
    }
  }
});

</script>

<template>
  
  <Loading v-if="fullLoading"/>

  <div class="page wrap-login">
    <div class="login-card">

      <div class="card-header">
        <img class="wraplogoimg" src="/assets/images/logosvg.svg" alt="Passmed US Logo" />
        <div>
          <span class="admin-badge">Admin Portal</span>
        </div>
        <div class="header-text">
          <h1>Sign in to your account</h1>
          <p>Passmed US — internal use only</p>
        </div>
      </div>

      <div class="card-body">
        <div class="error-banner"
        :class="error?'show':''">
        <svg fill="none" height="14" stroke="currentColor" stroke-linecap="round"
         stroke-width="2.5" viewBox="0 0 24 24" width="14">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" x2="12" y1="8" y2="12"></line>
          <line x1="12" x2="12.01" y1="16" y2="16"></line>
        </svg>
        {{ error }}
      </div>

    <form id="loginForm" @submit.prevent="handleLogin" autocomplete="on">
        <div class="form-group">
          <label for="email">Email address</label>
          <div class="input-wrap">
            <svg fill="none" height="15" stroke="currentColor" stroke-linecap="round" stroke-width="2" viewBox="0 0 24 24" width="15"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
            <input name="username"
            type="email" id="email"
             placeholder="admin@passmed.us"
             autocomplete="username"
              required
             v-model="email"
             @keyup.enter="handleLogin"
             />
          </div>
        </div>

        <div class="form-group">
          <label for="password">Password</label>
          <div class="input-wrap">
            <svg fill="none" height="15" stroke="currentColor" stroke-linecap="round" stroke-width="2" viewBox="0 0 24 24" width="15"><rect height="11" rx="2" ry="2" width="18" x="3" y="11"></rect><path d="M7 11V7a5 5 0 0110 0v4"></path>
            </svg>

            <input id="password"
             name="password"
             placeholder="••••••••"  
            autocomplete="current-password" 
             required
              v-model="password"
               :type="showPassword ? 'text' : 'password'" 
                @keyup.enter="handleLogin"
               />

            <button type="button" class="pw-toggle" 
            @click="showPassword = !showPassword">
              <svg id="eyeIcon" fill="none" height="15" stroke="currentColor" stroke-linecap="round" stroke-width="2" viewBox="0 0 24 24" width="15"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle
                ></svg>
            </button>
          </div>
        </div>
     
        <div class="form-meta">
          <label class="remember">
            <input name="remember"
            type="checkbox" id="remember"
            v-model="rememberDevice"/>
            Remember this device
          </label>
          <NuxtLink class="forgot" to="/forgot-password">Forgot password?</NuxtLink >
        </div>

        <!-- Cloudflare Turnstile — renders + requires a token only once a site key is set. -->
        <TurnstileWidget v-model="turnstileToken" ref="tsRef" />

        <button type="submit" class="btn-login"id="loginBtn"
          :disabled="fullLoading">
          <div class="spinner"></div>
          <span class="btn-text">
            {{ fullLoading
                ? 'Logging...'
                : 'Sign in'
            }}
            
          </span>
          <svg class="btn-text" fill="none" height="14" stroke="currentColor" stroke-linecap="round"
          stroke-width="2.5" viewBox="0 0 24 24" width="14"><path d="M5 12h14M12 5l7 7-7 7"></path></svg>
        </button>

      </form>

      </div>

      <div class="card-footer">
        <p class="security-note">
          <svg fill="none" height="12" stroke="currentColor" stroke-linecap="round" 
          stroke-width="2" viewBox="0 0 24 24" width="12">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          </svg> Secured with TLS 1.3 · Admin access only ·
        </p>
      </div>
    </div>

    <p class="below-card">
      Passmed US · Confidential · Unauthorised access is prohibited
    </p>

    <!-- 2FA email-OTP — separate popup (mirrors the student/institute OtpVerify modal) -->
    <div v-if="step === 'otp'" class="otp-overlay" @click.self="backToPassword">
      <div class="otp-modal">
        <button type="button" class="otp-close" @click="backToPassword" aria-label="Close">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <div class="otp-head">
          <div class="otp-eyebrow">Two-factor authentication</div>
          <div class="otp-title">Enter your code</div>
          <div class="otp-sub">We sent a 6-digit code to <strong>{{ email }}</strong>.</div>
        </div>
        <form @submit.prevent="handleVerifyOtp" autocomplete="off">
          <div class="form-group">
            <input id="otp" name="otp" inputmode="numeric" autocomplete="one-time-code" maxlength="6"
              placeholder="000000" required v-model="otp" class="otp-input"
              @keyup.enter="handleVerifyOtp" />
          </div>
          <button type="submit" class="btn-login" :disabled="fullLoading">
            <div class="spinner"></div>
            <span class="btn-text">{{ fullLoading ? 'Verifying...' : 'Verify & sign in' }}</span>
          </button>
          <button type="button" class="btn-back" @click="backToPassword">← Back to sign in</button>
        </form>
        <p class="otp-note">Code expires in 10 minutes.</p>
      </div>
    </div>
  </div>

</template>

<style scoped>
.otp-overlay {
  position: fixed; inset: 0; z-index: 1000;
  /* Opaque so the login card behind is fully hidden — only the OTP shows. The card
     stays mounted in the DOM, so closing this overlay reliably reveals it again. */
  background: #0f1f2e;
  display: flex; align-items: center; justify-content: center; padding: 20px;
}
.otp-modal {
  position: relative; width: 100%; max-width: 380px;
  background: #fff; border-radius: 16px; padding: 30px 26px 24px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
}
.otp-close {
  position: absolute; top: 14px; right: 14px;
  background: none; border: none; color: #94a3b8; cursor: pointer; padding: 4px; line-height: 0;
}
.otp-close:hover { color: #0f1f2e; }
.otp-head { text-align: center; margin-bottom: 20px; }
.otp-eyebrow { font-size: 0.66rem; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #0891b2; }
.otp-title { font-size: 1.25rem; font-weight: 800; color: #0f1f2e; margin-top: 4px; }
.otp-sub { font-size: 0.82rem; color: #64748b; margin-top: 6px; }
.otp-input {
  width: 100%; text-align: center; letter-spacing: 8px;
  font-size: 1.3rem; font-weight: 700; padding: 12px;
  border: 1.5px solid #e2e8f0; border-radius: 10px; outline: none;
}
.otp-input:focus { border-color: #0891b2; }
.otp-note { text-align: center; font-size: 0.72rem; color: #94a3b8; margin-top: 12px; }
.btn-back { margin-top: 10px; width: 100%; background: none; border: none; color: #64748b; font-size: 0.8rem; font-weight: 600; cursor: pointer; padding: 6px; }
.btn-back:hover { color: #0f1f2e; }
</style>