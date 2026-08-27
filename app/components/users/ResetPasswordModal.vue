<script setup lang="ts">
import Loading from '@/components/loaders/Loading.vue'
import { ref, computed,reactive } from 'vue'

const props = defineProps<{
  modelValue: boolean
  detailId: any | null
  pageDetail: any | null
}>()
const emit = defineEmits(["update:modelValue"]);

const { $api,$toast } = useNuxtApp()
const fullLoading= ref<boolean>(false);

//Close modal
const closeModal = () => {
  emit("update:modelValue", false);
};


// Form Model (addModel)
const addUserModel = reactive({
  password: "",
  confirmpassword: "",
});


// Submit API
const saveChanges = async () => {

  if (!props.detailId) return

   if (!addUserModel.password || !addUserModel.confirmpassword) {
       $toast('Password fileds required','error');
    return;
  }

   if (addUserModel.password !== addUserModel.confirmpassword) {
      $toast('Passwords do not match','error');
    return;
  }

    closeModal();
    fullLoading.value = true;
  try {

    const res:any = await $api.post("/users/reset-password/"+props.detailId,addUserModel);

    if (res.data.status === "success") {
        const message = res?.data?.msg || 'Password is Updated successfully.'
        $toast(message,'success');
    }else{
        const message = res?.data?.msg || 'failed to update password.'
        $toast(message,'error');
    }

  } catch (err:any) {
      const message = err?.response?.data?.msg || err?.response?.data?.message || 'failed to update password'
     $toast(message,'error');
  }finally{
    fullLoading.value = false;
  }
};



const errorMsg = computed(() => {
  if (!addUserModel.password || !addUserModel.confirmpassword) {
    return ''
  }

  return addUserModel.password !== addUserModel.confirmpassword
    ? 'Passwords do not match'
    : ''
})

const showPassword = ref(false)
const showCnfrmPassword = ref(false)

</script>

<template>
    <Loading v-if="fullLoading" />
    <div
    v-if="modelValue"
    class="overlay overlay-top open"  
    @click.self="closeModal">

        <div class="drawer" style="width:480px;max-width:97vw">
            <div class="drawer-header">
                <div style="font-family:'Figtree',sans-serif;font-size:1rem;font-weight:700;color:var(--ink)">
                  Reset Password
                </div>
                <button class="drawer-close" type="button"
                @click="closeModal">
                    <svg fill="none" height="13" stroke="currentColor" stroke-linecap="round" 
                        stroke-width="2.5" viewBox="0 0 24 24" width="13">
                        <line x1="18" x2="6" y1="6" y2="18"></line>
                        <line x1="6" x2="18" y1="6" y2="18"></line>
                    </svg>
                </button>
            </div>
            <div class="drawer-body">
                  <div class="error-full" :class="errorMsg?'show':''">
                   {{ errorMsg }} 
                  </div>
                       <div class="form-row-2">
                        <div class="form-row" style="margin-bottom:14px">
                            <label class="form-label">
                              new password
                            </label>
                            <div class="input-wrap">
                              <input name="password" class="form-input"
                              placeholder="Enter password *****"
                              :type="showPassword ? 'text' : 'password'" 
                              v-model="addUserModel.password"/>
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
                              <label class="form-label">
                                Confirm Password
                              </label>
                              <div class="input-wrap">
                              <input name="confirmpassword" class="form-input" 
                               placeholder="Enter confirm password" 
                             :type="showCnfrmPassword ? 'text' : 'password'" 
                              v-model="addUserModel.confirmpassword" 
                              />
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
                      </div>
                    
                      <div style="display:flex;gap:8px">
                        <button class="btn btn-primary" 
                        style="flex:1"
                        type="button"
                        @click="saveChanges">
                         Save Changes
                        </button>
                        <button class="btn btn-outline"  
                        type="button"
                        @click="closeModal">Cancel</button>
                      </div>
              </div>
        </div>
    </div>
</template>