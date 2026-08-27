<script setup lang="ts">
definePageMeta({
  middleware: 'guest'
});

import { ref, onMounted, computed } from 'vue'
import Loading from '@/components/loaders/Loading.vue';

const route = useRoute()
const { $api,$toast } = useNuxtApp()

const token = computed(() => {
  return route.query.token || ''
})

const addFormModel = reactive({
  password: "",
  confirmpassword: "",
});

// Reset form
const resetForm = () => {
  Object.assign(addFormModel, {
    password: "",
    confirmpassword: "",
  });
};

const error = ref('')
const fullLoading = ref(true)

const checkResetLinkValidTime = async () => {

  fullLoading.value = true

  try {
        const res:any = await $api.post('/check-reset-link',{
        token: token.value
        })
        const obj:any = res.data||{}
        if (obj.status != "success") {
          const message = obj.msg||'Invalid link';
          $toast(message,'error');
          // redirect home
           await navigateTo('/')
        }
      
  } catch (err: any) {
      const message = err?.response?.data?.msg || err?.response?.data?.message || 'Invalid link'
      $toast(message,'error');
  } finally {
    fullLoading.value = false
  }
}

onMounted(async () =>{
   if (!token.value) {
    $toast('Invalid reset token', 'error')
    await navigateTo('/')
    return;
  }
  await checkResetLinkValidTime();
});


/**
** reset passworad
*/
const handleResetPassword = async () => {

  if(!token.value){
    return;
  }  
  
  if (!addFormModel.password) {
    error.value = 'Password is required.'
      return;
  }

 if (!addFormModel.confirmpassword.trim()) {
    error.value = 'Confirm Password is required.'
      return;
  }


  if(addFormModel.password.trim() !== addFormModel.confirmpassword.trim()){
      error.value = 'Password not Match.'
        return;
  }

  error.value = '';

  fullLoading.value = true

  const params={
    ...addFormModel,
     token: token.value
  }

  try {
        const res:any = await $api.post('/reset-password', params)
        const obj:any = res.data||{}
        if (obj.status == "success") {
            const message = obj.msg||'Reset password is success'
            $toast(message,'success');

            resetForm();
            // After a successful reset, send the user to the login page to sign in
            // with their new password (no auto-login).
            await navigateTo('/login')
        }else{
          const message = obj.msg||'Reset password is failed'
          error.value = message
          $toast(message,'error');
        }
      
  } catch (err: any) {
      const message = err?.response?.data?.msg || err?.response?.data?.message || 'Reset password is failed'
      $toast(message,'error');
      error.value = message
  } finally {
    fullLoading.value = false
  }
}

watch(()=>addFormModel.password, (val) => {
  if (!val) {
    error.value = 'Password is required.'
  } else {
    error.value = ''
  }
})


watch(()=>addFormModel.confirmpassword, (val) => {
  if (!val) {
    error.value = 'Confirm Password is required.'
  } else {
    if(addFormModel.password.trim() !== val.trim()){
      error.value = 'Password not Match.'
    }else{
      error.value = ''
    }
  }
})

const showPassword = ref(false)
const showCnfrmPassword = ref(false)

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

          <form class="resetpassForm" @submit.prevent="handleResetPassword">
            <div class="form-row" style="margin-bottom:14px">
                <label class="form-label">password</label>
                <div class="input-wrap">
                  <svg fill="none" height="15" stroke="currentColor" stroke-linecap="round" stroke-width="2"
                   viewBox="0 0 24 24" width="15"><rect height="11" rx="2" ry="2" width="18" x="3" y="11"></rect>
                    <path d="M7 11V7a5 5 0 0110 0v4"></path>
                  </svg>
                  <input name="password" class="form-input"
                  placeholder="Enter password *****"
                  :type="showPassword ? 'text' : 'password'" 
                  v-model="addFormModel.password"  
                  @keyup.enter="handleResetPassword"
                  required/>
                    <button type="button" class="pw-toggle" 
                  @click="showPassword = !showPassword">
                    <svg id="eyeIcon" fill="none" height="15" stroke="currentColor" stroke-linecap="round" 
                    stroke-width="2" viewBox="0 0 24 24" width="15">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  </button>
                </div>
            </div>

            <div class="form-row" style="margin-bottom:14px">
              <label class="form-label">Confirm Password</label>
              <div class="input-wrap">
                <svg fill="none" height="15" stroke="currentColor" stroke-linecap="round" stroke-width="2"
                  viewBox="0 0 24 24" width="15"><rect height="11" rx="2" ry="2" width="18" x="3" y="11"></rect>
                  <path d="M7 11V7a5 5 0 0110 0v4"></path>
                </svg>
              <input name="confirmpassword" class="form-input" 
              placeholder="Enter confirm password" 
              :type="showCnfrmPassword ? 'text' : 'password'" 
              v-model="addFormModel.confirmpassword" 
              @keyup.enter="handleResetPassword"
              required />

              <button type="button" class="pw-toggle" 
              @click="showCnfrmPassword = !showCnfrmPassword">
                <svg id="eyeIcon" fill="none" height="15" stroke="currentColor" stroke-linecap="round" 
                stroke-width="2" viewBox="0 0 24 24" width="15">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
                </svg>
              </button>
              </div>
            </div>

              <button type="submit" class="btn-login" id="loginBtn">
              <div class="spinner"></div>
              <span class="btn-text">
                Reset Password
              </span>
              <svg class="btn-text" fill="none" height="14" stroke="currentColor" 
              stroke-linecap="round" stroke-width="2.5" viewBox="0 0 24 24" width="14">
              <path d="M5 12h14M12 5l7 7-7 7"></path>
              </svg>
              </button>

              <div class="form-meta">
              <br/>
              <NuxtLink class="forgot" href="/login">Sign in</NuxtLink>
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