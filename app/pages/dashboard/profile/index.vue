<script setup lang="ts">
import Loading from '@/components/loaders/Loading.vue'
import { ref, onMounted } from 'vue'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

const auth = useAuthStore()
const { $api, $toast,$confirm } = useNuxtApp()
const fullLoading = ref(false)

const addform = reactive({
  name: '',
  firstname: "",
  lastname: "",
  email: "",
  role: "",
  status: '1',
});

const submitSave = async (e:any) => {
  e.preventDefault();
  fullLoading.value = true;

  try {
    const res:any = await $api.post('/profile/update', addform);

    if (res.data.status === 'success') {
        fullLoading.value = false;
         $toast("Save Changes done");
        if (auth.fetchMe){
          await auth.fetchMe($api); 
        }
     }else{
           $toast('Failed to saved','error');
    }

  } catch (err:any) {
   
    fullLoading.value = false;
      const message = err?.response?.data?.message || 'Failed to saved.'
     $toast(message,'error');

  }
}

  // ===== Change Email =====
const showChangeEmail = ref(false)
const emailForm = reactive({
  new_email: '',
})

const submitChangeEmail = async () => {
  if (!emailForm.new_email) {
    $toast('New email is required', 'error'); return;
  }
  
  fullLoading.value = true;
  try {
    const res:any = await $api.post('/profile/change-email', emailForm);

    if (res.data.status === 'success') {
      $toast('Email updated successfully');
      addform.email = emailForm.new_email;
      // auth store refresh taaki naya email pure app mein reflect ho
      if (auth.fetchMe) await auth.fetchMe($api);
      showChangeEmail.value = false;
      emailForm.new_email = '';

    } else {
      $toast(res?.data?.msg || 'Email change failed', 'error');
    }
  } catch (err: any) {
    const message = err?.response?.data?.msg || 'Email change failed';
    $toast(message, 'error');
  } finally {
    fullLoading.value = false;
  }
}


// ===== Change Password =====
const showChangePassword = ref(false)
const passwordForm = reactive({
  current_password: '',
  new_password: '',
  confirm_password: '',
})

const passwordStrength = computed(() => {
  const p = passwordForm.new_password || ''
  let score = 0
  if (p.length >= 8) score++
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++
  if (/\d/.test(p)) score++
  if (/[^A-Za-z0-9]/.test(p)) score++
  const labels = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong']
  const colors = ['#ef4444', '#ef4444', '#f59e0b', '#3b82f6', '#22c55e']
  return { score, label: p ? labels[score] : '', color: colors[score] }
})

const submitPasswordChange = async () => {
  if (!passwordForm.current_password) { $toast('Current password is required', 'error'); return }
  if (!passwordForm.new_password) { $toast('New password is required', 'error'); return }
  if (passwordForm.new_password.length < 8) { $toast('New password must be at least 8 characters', 'error'); return }
  if (passwordForm.new_password !== passwordForm.confirm_password) {
    $toast('New password and confirm password do not match', 'error'); return
  }

  fullLoading.value = true
  try {
    const res:any = await $api.post('/profile/change-password', passwordForm)
    if (res.data.status === 'success') {
      $toast('Password updated successfully')
      passwordForm.current_password = ''
      passwordForm.new_password = ''
      passwordForm.confirm_password = ''
      showChangePassword.value = false
    } else {
      $toast(res?.data?.msg || 'Password change failed', 'error')
    }
  } catch (err: any) {
    $toast(err?.response?.data?.msg || 'Password change failed', 'error')
  } finally {
    fullLoading.value = false
  }
}

onMounted(() => {
  if (auth.user) {
    addform.firstname = auth?.user?.firstname || ''
    addform.lastname = auth?.user?.lastname || ''
    addform.email = auth.user.email || ''
    addform.role = auth.user.role || ''
  }
})

const showPassword = ref(false)
const showCnfrmPassword = ref(false)
const showcurtnPassword = ref(false)
</script>

<template>
    <Loading v-if="fullLoading"/>
  <div class="dashwrap">
    <form  v-on:submit="submitSave">
    <div class="form-row-2">
        <div class="form-row" style="margin-bottom: 14px">
            <label class="form-label">First Name</label
            ><input class="form-input" placeholder="e.g. Sarah"
             type="text"
             v-model="addform.firstname"
              required/>
        </div>
        <div class="form-row" style="margin-bottom: 14px">
            <label class="form-label">Last Name</label
            >
            <input class="form-input" id="newUserLast"
             placeholder="e.g. Chen"
             type="text"
             v-model="addform.lastname"
             required />
        </div>
    </div>
    <div class="form-row" style="margin-bottom: 14px">
        <label class="form-label"> Email Address</label
        >
        <div style="display:flex;gap:8px;align-items:center;">
          <input class="form-input" id="newUserEmail" placeholder="sarah.chen@med.edu" 
          type="email"
           v-model="addform.email"
           disabled style="flex:1;" />
          <button class="btn btn-sm" type="button" 
            @click="showChangeEmail = !showChangeEmail"
            style="white-space:nowrap;">
            {{ showChangeEmail ? 'Cancel' : 'Change Email' }}
          </button>
        </div>
    </div>
    
    <!-- Change Email section -->
    <div v-if="showChangeEmail" 
      style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;margin-bottom:14px;">
          <div class="form-row" style="margin-bottom: 10px">
                <label class="form-label">New Email</label>
                <input class="form-input" placeholder="new.email@med.edu"
                 type="email"
                 v-model="emailForm.new_email" />
        </div>
        <button class="btn btn-primary btn-sm" type="button" @click="submitChangeEmail">
          Update Email
        </button>
        <p style="font-size:12px;color:#64748b;margin:8px 0 0;">
          A security notification will be sent to your current email.
        </p>
    </div>

    <!-- Change Password (dedicated, separate from profile save) -->
    <div class="form-row" style="margin-bottom: 14px">
        <label class="form-label">Password</label>
        <div>
          <button class="btn btn-sm" type="button"
            @click="showChangePassword = !showChangePassword">
            {{ showChangePassword ? 'Cancel' : 'Change Password' }}
          </button>
        </div>
    </div>

    <div v-if="showChangePassword"
      style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;margin-bottom:14px;">

        <div class="form-row" style="margin-bottom: 10px">
            <label class="form-label">Current Password</label>
            <div class="input-wrap">
              <input class="form-input" placeholder="Enter current password"
                :type="showcurtnPassword ? 'text' : 'password'"
                v-model="passwordForm.current_password" />
              <button type="button" class="pw-toggle" @click="showcurtnPassword = !showcurtnPassword">
                <svg fill="none" height="15" stroke="currentColor" stroke-linecap="round" stroke-width="2" viewBox="0 0 24 24" width="15">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>
                </svg>
              </button>
            </div>
        </div>

        <div class="form-row" style="margin-bottom: 10px">
            <label class="form-label">New Password</label>
            <div class="input-wrap">
              <input class="form-input" placeholder="At least 8 characters"
                :type="showPassword ? 'text' : 'password'"
                v-model="passwordForm.new_password" />
              <button type="button" class="pw-toggle" @click="showPassword = !showPassword">
                <svg fill="none" height="15" stroke="currentColor" stroke-linecap="round" stroke-width="2" viewBox="0 0 24 24" width="15">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>
                </svg>
              </button>
            </div>
            <div v-if="passwordForm.new_password" style="margin-top:6px;">
              <div style="height:5px;border-radius:3px;background:#e5e7eb;overflow:hidden;">
                <div :style="{ width: (passwordStrength.score * 25) + '%', background: passwordStrength.color, height:'100%', transition:'all .2s' }"></div>
              </div>
              <span :style="{ fontSize:'11px', color: passwordStrength.color }">{{ passwordStrength.label }}</span>
            </div>
        </div>

        <div class="form-row" style="margin-bottom: 10px">
            <label class="form-label">Confirm New Password</label>
            <div class="input-wrap">
              <input class="form-input" placeholder="Re-enter new password"
                :type="showCnfrmPassword ? 'text' : 'password'"
                v-model="passwordForm.confirm_password" />
              <button type="button" class="pw-toggle" @click="showCnfrmPassword = !showCnfrmPassword">
                <svg fill="none" height="15" stroke="currentColor" stroke-linecap="round" stroke-width="2" viewBox="0 0 24 24" width="15">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>
                </svg>
              </button>
            </div>
        </div>

        <button class="btn btn-primary btn-sm" type="button" @click="submitPasswordChange">
          Update Password
        </button>
        <p style="font-size:12px;color:#64748b;margin:8px 0 0;">
          You'll need your current password. A security notification will be sent to your email.
        </p>
    </div>
    <div class="form-row-2">
        <div class="form-row" style="margin-bottom: 14px">
            <label class="form-label">Level</label
            >
        <input class="form-input" :value="addform.role" disabled />
        </div>
        <div class="form-row">
            <label class="form-label">Status</label
            >
            <span class="badge badge-green">
                 {{ (addform.status == '1')?'Active':'Deactive' }}
            </span>
        </div>
    </div>
    <div style="display: flex; gap: 8px">
        <button class="btn btn-primary" type="submit" style="flex: 1 1 0%">
          Save Changes
        </button>
    </div>
  </form>

  </div>
</template>