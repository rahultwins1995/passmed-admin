<script setup lang="ts">
definePageMeta({
  middleware: 'guest'
});


import Loading from '@/components/loaders/Loading.vue';

const { $api,$toast } = useNuxtApp()

const email = ref('')

const error = ref('')
const fullLoading = ref(false)
const resetSuccess = ref(false)

const handleResetPassword = async () => {

  resetSuccess.value=false;
  error.value = ''

  if (!email.value.trim()){
   error.value = 'Please enter your email address.';
    return;
  }

  if (!/\S+@\S+\.\S+/.test(email.value.trim())) {
    error.value = 'Invalid your email address'
       return;
  }

  fullLoading.value = true

  try {
        const res:any = await $api.post('/forgot-password', {
          email: email.value,
        })

        //  FIX HERE
        const obj:any = res.data

        if (obj.status == "success") {
            const message = obj.msg||'Please check mail'
            $toast(message,'success');

            resetSuccess.value=true;

        }else{
          const message = obj.msg||'Reset password is failed'
          $toast(message,'error');
        }
      
  } catch (err: any) {
      const message =  err?.response?.data?.msg || err?.response?.data?.message || 'Reset password is failed'
      $toast(message,'error');
      error.value = message
  } finally {
    fullLoading.value = false
  }
}

watch(email, (val) => {
  if (!val) {
    error.value = 'Please enter your email address.'
  } else {
    error.value = ''
  }
})

watch(resetSuccess, (val) => {
  if (val === true) {
      setTimeout(()=>{
      resetSuccess.value=false;
      },8000);
  }
})


</script>


<template>
  
  <Loading v-if="fullLoading"/>

  <div class="page wrap-login">
    <div class="login-card">
      
      <div class="card-header">
          <img class="wraplogoimg" src="/assets/images/logosvg.svg" alt="Passmed US Logo"/>
          <div>
            <span class="admin-badge">Admin Portal</span>
          </div>
          <div class="header-text">
            <h1>Reset password in to your account</h1>
            <p>Passmed US — internal use only</p>
          </div>
      </div>

      <div class="card-body">
          <div class="error-banner" :class="error?'show':''">
              <svg fill="none" height="14" stroke="currentColor" stroke-linecap="round"
              stroke-width="2.5" viewBox="0 0 24 24" width="14">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" x2="12" y1="8" y2="12"></line>
                <line x1="12" x2="12.01" y1="16" y2="16"></line>
              </svg>
              {{ error }}
          </div>

          <div v-if="resetSuccess" class="resetpassForm">
              <div class="resetsuccess">
                  <svg fill="none" height="36" stroke="currentColor" stroke-linecap="round" 
                  stroke-width="1.5" viewBox="0 0 24 24" width="36" 
                  style="display:block;margin:0 auto 12px">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                  <p>
                  <strong>Check your inbox.</strong>
                  <br>If that address is registered, a reset link is on its way. Link expires in 30 minutes.
                  </p>
              </div>
          </div>

          <form v-else class="resetpassForm" @submit.prevent="handleResetPassword">

              <div class="form-group">
              <label for="email">Email address</label>
              <div class="input-wrap">
              <svg fill="none" height="15" stroke="currentColor" stroke-linecap="round" stroke-width="2" 
              viewBox="0 0 24 24" width="15"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
              <input type="email" name="email" placeholder="Enter email" autocomplete="email" required
              v-model="email"
              @keyup.enter="handleResetPassword"
              />
              </div>
              </div>

              <div class="form-group">
              <p>Enter your admin email address and we'll send you a password reset link.</p>
              </div>

              <button type="submit" class="btn-login" id="loginBtn">
              <div class="spinner"></div>
              <span class="btn-text">
              Send reset link
              </span>
              <svg class="btn-text" fill="none" height="14" stroke="currentColor" 
              stroke-linecap="round" stroke-width="2.5" viewBox="0 0 24 24" width="14">
              <path d="M5 12h14M12 5l7 7-7 7"></path>
              </svg>
              </button>

              <div class="form-meta">
              <br/>
              <NuxtLink class="forgot" to="/login">Sign in</NuxtLink>
              </div>
          </form>
          
      </div>

      <div class="card-footer">
        <p class="security-note">
          <svg fill="none" height="12" stroke="currentColor" stroke-linecap="round"
           stroke-width="2" viewBox="0 0 24 24" width="12">
           <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          </svg>
            Secured with TLS 1.3 · Admin access only ·
        </p>
      </div>
    </div>

    <p class="below-card">
      Passmed US · Confidential · Unauthorised access is prohibited
    </p>
  </div>

</template>