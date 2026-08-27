<script setup lang="ts">
import Loading from '@/components/loaders/Loading.vue'
import { ref, watch,reactive } from 'vue'

const props = defineProps<{
  modelValue: Boolean 
  detailId: any|null 
  detail?: any|null 
}>();

const emit = defineEmits(["update:modelValue", "saved"]);

const { $api,$toast } = useNuxtApp()
const fullLoading= ref<boolean>(false);
//Close modal
const closeModal = () => {
  emit("update:modelValue", false);
};

// Form Model (addModel)
const intsfms = {
  name: "",
  email: "",
  password: "",
  confirmpassword: "",
  role: "professor",
  status: "1"
};

const addUserModel = reactive(intsfms);

// Reset form
const resetForm = () => {
  Object.assign(addUserModel, intsfms);
};

// Submit API
const submitData = async (e:any) => {
  e.preventDefault();

    if(!props.detail.id){
    return;
    }

    if (!addUserModel.name) {
    $toast("name required",'error');
    return;
    }
    if (!addUserModel.email) {
    $toast("Email required",'error');
    return;
    }

    closeModal();
    fullLoading.value = true;
    const institution_manage_id=props.detail.id;

  try {
  
    const res:any = await $api.post("/institutions/users/update/"+institution_manage_id,addUserModel);
      emit("saved", true);

    if (res.data.status === "success") {
        fullLoading.value = false;
         emit('saved', true)

        const message = res?.data?.msg || 'Save record is successfully.'
        $toast(message,'success');
         
    }else{
        const message = res?.data?.msg || 'Save record is failed.'
        $toast(message,'error');
        fullLoading.value = false;
    }

  } catch (err:any) {
    fullLoading.value = false;
      const message = err?.response?.data?.msg || err?.response?.data?.message || 'Save record is failed.'
     $toast(message,'error');
  } finally{
    resetForm();
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

const isEditMode=ref<boolean>(false);
// reset when open
watch(() => props.modelValue, (val) => {

   if (val) {
    const detail=props.detail;
    if(props.detailId){
      isEditMode.value=true;
    }else{
      isEditMode.value=false;
    }
    
    addUserModel.name=detail?.name??"";
    addUserModel.email=detail?.email??"";
    addUserModel.status=detail?.status??"0";
    addUserModel.role=detail?.role??"professor";
  }else{
     resetForm();
  }
});
</script>

<template>
    <Loading v-if="fullLoading" />
    <div
    v-if="modelValue"
    class="overlay overlay-top open"  
    @click.self="closeModal">

        <div class="drawer" style="width:580px;max-width:97vw">
            <div class="drawer-header">
            <div class="fullheadsec">
                <div style="font-size:0.65rem;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:var(--ink-dim);margin-bottom:6px">
                 Edit Admin User
                </div>
                <div style="font-family:'Figtree',sans-serif;font-size:1rem;font-weight:700;color:var(--ink)">
                  Assign institutional admin access
                </div>
                <div class="error-full"
                :class="errorMsg?'show':''">
                   {{ errorMsg }} 
                  </div>
            </div>
            <button class="drawer-close" type="button"
            @click="closeModal"
            >
                <svg fill="none" height="13" stroke="currentColor" stroke-linecap="round" stroke-width="2.5" viewBox="0 0 24 24" width="13"><line x1="18" x2="6" y1="6" y2="18"></line><line x1="6" x2="18" y1="6" y2="18"></line></svg>
            </button>
            </div>
            <div class="drawer-body">
                      <div class="form-row">
                        <div class="form-row" style="margin-bottom:14px">
                            <label class="form-label">
                              Full Name:<span class="required">*</span>
                            </label>
                            <input class="form-input"
                            placeholder="Dr. Sarah Patel" type="text"
                            v-model="addUserModel.name"  
                            required/>
                        </div>
                      </div>

                      <div class="form-row" style="margin-bottom:14px">
                          <label class="form-label">
                          Email Address:<span class="required">*</span>
                        </label>
                          <input class="form-input" id="newUserEmail"
                          placeholder="s.patel@institution.edu" type="email"
                          v-model="addUserModel.email"
                            required />
                      </div>
                       <div  class="form-row-2">
                        <div class="form-row" style="margin-bottom:14px">
                            <label class="form-label">
                              password:
                            </label>
                            <input name="password" class="form-input"
                            placeholder="Enter password *****" type="password"
                            v-model="addUserModel.password"  
                            />
                        </div>
                          <div class="form-row" style="margin-bottom:14px">
                              <label class="form-label">
                                Confirm Password:
                              </label>
                              <input name="confirmpassword" class="form-input"  
                              placeholder="Enter confirm password" 
                              type="text"
                              v-model="addUserModel.confirmpassword" 
                              />
                          </div>
                      </div>

                      <div class="form-row-2">

                          <div class="form-row" style="margin-bottom:14px">
                              <label class="form-label">
                                Level:<span class="required">*</span>
                              </label>
                              <select class="form-input form-select" id="newUserLevel"
                              v-model="addUserModel.role" required>
                                  <option value="institution-admin">Institution Admin</option>
                                  <option value="professor">Professor</option>
                              </select>
                          </div>
                          <div class="form-row">
                                <label class="form-label">Status</label>
                                <select class="form-input form-select"
                                  v-model="addUserModel.status">
                                <option value="1">Active</option>
                                <option value="2">Pending</option>
                                <option value="0">Deactive</option>
                                </select>
                          </div>
                      </div>
                    
                    <div style="background:var(--surface);border:1.5px solid var(--border);border-radius:var(--r-sm);padding:14px;margin-bottom:16px">
                        <div style="margin-bottom:10px">
                        <div style="font-size:0.78rem;font-weight:700;color:var(--ink);margin-bottom:2px">
                        <span style="background:rgba(8,145,178,0.1);color:var(--teal);border:1px solid rgba(8,145,178,0.25);border-radius:99px;padding:2px 8px;font-size:0.68rem;margin-right:6px">Institution Admin</span>
                        </div>
                        <div style="font-size:0.75rem;color:var(--ink-dim);margin-top:4px;padding-left:2px">
                          Full licence management: add/remove users, view all analytics, update billing 
                          contact, manage access settings.
                        </div>
                        </div>

                        <div>
                        <div style="font-size:0.78rem;font-weight:700;color:var(--ink);margin-bottom:2px">
                        <span style="background:rgba(217,119,6,0.1);color:var(--amber);border:1px solid rgba(217,119,6,0.25);border-radius:99px;padding:2px 8px;font-size:0.68rem;margin-right:6px">Professor</span>
                        </div>
                        <div style="font-size:0.75rem;color:var(--ink-dim);margin-top:4px;padding-left:2px">View student progress and performance, assign question sets and study plans. Cannot manage billing or licence settings.</div>
                        </div>
                      </div>

                      <div style="display:flex;gap:8px">
                        <button class="btn btn-primary" 
                        style="flex:1"
                        type="button"
                        @click="submitData">
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