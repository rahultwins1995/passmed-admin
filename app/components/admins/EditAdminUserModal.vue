<script setup lang="ts">
import Loading from '@/components/loaders/Loading.vue'
import { ref, computed,reactive } from 'vue'

const props = defineProps<{
  modelValue: boolean
  detail: any | null
}>()
const emit = defineEmits(["update:modelValue", "saved"]);

const { $api,$toast } = useNuxtApp()
const fullLoading= ref<boolean>(false);
const pageDetail = ref<any>(null)

//Close modal
const closeModal = () => {
  emit("update:modelValue", false);
};


// Form Model (addModel)
const addUserModel = reactive({
  name: "",
  email: "",
  password: "",
  confirmpassword: "",
  role: "institution-admin",
  institution_id: "" as any,
  status: "1",
});


// Institution picker — institution-admin and professor sign in to the INSTITUTE
// portal, and every institute endpoint resolves their institution through
// institution_manages. Creating one of those users without an institution left
// them able to log in but unable to load anything, so the link is required here.
const institutionOptions = ref<any[]>([])
const needsInstitution = computed(() =>
  ['institution-admin', 'professor'].includes(addUserModel.role)
)

const fetchInstitutionOptions = async () => {
  try {
    const res: any = await $api.post('/institutions', { search: '', limit: 1000 })
    const list = res?.data?.data ?? []
    institutionOptions.value = list.map((i: any) => ({ value: i.institution_id, label: i.institution_name }))
  } catch {
    institutionOptions.value = []
  }
}
onMounted(fetchInstitutionOptions)

// Submit API
const saveChanges = async () => {

  if (!props.detail?.id) return

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
  try {

    const res:any = await $api.post("/admin-users/update/"+props.detail.id,addUserModel);

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
      const message = err?.response?.data?.message || err?.response?.data?.msg || 'Save record is failed.'
     $toast(message,'error');
  }
};

const fetchData = async () => {
  if (!props.detail?.id) return
  try {
    const res:any = await $api.get("/admin-users/details/"+props.detail.id)
    const obj:any = res.data

    if (obj.status === 'success') {
      const detail= obj.data;
      pageDetail.value=detail;
      addUserModel.name= detail.name??"";
      addUserModel.email= detail.email??"";
      addUserModel.role=detail.role??"";
      addUserModel.institution_id=detail?.institution_id ?? "";
      addUserModel.status=detail?.status??'1';
      
    }
  } catch (err: any) {
     
  }
}

const editLoadPage=()=>{
  const detail =pageDetail.value;
  if(detail){
    addUserModel.name= detail.name??"";
    addUserModel.email= detail.email??"";
    addUserModel.role=detail.role??"";
    addUserModel.institution_id=detail?.institution_id ?? "";
    addUserModel.status=detail?.status??'1';
  }
}

const errorMsg = computed(() => {
  if (!addUserModel.password || !addUserModel.confirmpassword) {
    return ''
  }

  return addUserModel.password !== addUserModel.confirmpassword
    ? 'Passwords do not match'
    : ''
})

watch(() => props.modelValue, async (val) => {
   pageDetail.value =props.detail;

  if (val && props.detail?.id) {

    //instant UI fill fast Load
     editLoadPage();

     //fresh data in the background
      fetchData();
  } else {
    pageDetail.value = null
  }
})


</script>

<template>
    <Loading v-if="fullLoading" />
    <div
    v-if="modelValue"
    class="overlay overlay-top open"  
    @click.self="closeModal">

        <div class="drawer" style="width:480px;max-width:97vw">
            <div class="drawer-header">
            <div class="fullheadsec">
                <div style="font-size:0.65rem;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:var(--ink-dim);margin-bottom:6px">
                 
                </div>
                <div style="font-family:'Figtree',sans-serif;font-size:1rem;font-weight:700;color:var(--ink)">
                  Edit Admin User
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
              <form v-on:submit="saveChanges">
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

                       <div class="form-row-2">
                        <div class="form-row" style="margin-bottom:14px">
                            <label class="form-label">
                              password
                            </label>
                            <input name="password" class="form-input"
                            placeholder="Enter password *****" type="password"
                            v-model="addUserModel.password"/>
                        </div>
                          <div class="form-row" style="margin-bottom:14px">
                              <label class="form-label">
                                Confirm Password
                              </label>
                              <input name="confirmpassword" class="form-input" 
                               placeholder="Enter confirm password" 
                              type="text"
                              v-model="addUserModel.confirmpassword" 
                              />
                          </div>
                      </div>

                      <div class="form-row-2">

                          <div v-if="needsInstitution" class="form-row" style="margin-bottom:14px">
                              <label class="form-label">
                                Institution:<span class="required">*</span>
                              </label>
                              <select class="form-input form-select"
                              v-model="addUserModel.institution_id" required>
                                  <option value="">Select an institution…</option>
                                  <option v-for="opt in institutionOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                              </select>
                              <small style="color:var(--ink-dim);font-size:0.72rem">
                                Required — this is the institution whose portal they'll sign in to.
                              </small>
                          </div>
                          <div class="form-row" style="margin-bottom:14px">
                              <label class="form-label">
                                Level:<span class="required">*</span>
                              </label>
                              <select class="form-input form-select" id="newUserLevel"
                              v-model="addUserModel.role" required>
                                  <option value="institution-admin">Institution Admin</option>
                                  <option value="professor">Professor</option>
                                  <option value="super-admin">Super Admin</option>
                                  <option value="admin">Admin</option>
                                  <option value="content-admin">Content Admin</option>
                                  <option value="support-admin">Support Admin</option>
                              </select>
                            </div>
                               <div class="form-row">
                                  <label class="form-label">Status</label>
                                  <select class="form-input form-select"
                                    v-model="addUserModel.status">
                                  <option value="1">Active</option>
                                  <option value="0">Deactive</option>
                                  </select>
                              </div>
                        </div>
                    
                  <div style="background:var(--surface);border:1.5px solid var(--border);border-radius:var(--r-sm);padding:14px;margin-bottom:16px">
                      <div style="margin-bottom:10px">
                      <div style="font-size:0.78rem;font-weight:700;color:var(--ink);margin-bottom:2px">
                      <span style="background:rgba(8,145,178,0.1);color:var(--teal);border:1px solid rgba(8,145,178,0.25);border-radius:99px;padding:2px 8px;font-size:0.68rem;margin-right:6px">
                        Institution Admin
                      </span>
                      </div>
                      <div style="font-size:0.75rem;color:var(--ink-dim);margin-top:4px;padding-left:2px">
                        Full licence management: add/remove users, view all analytics, update billing contact,
                         manage access settings.
                        </div>
                      </div>
                      <div>
                      <div style="font-size:0.78rem;font-weight:700;color:var(--ink);margin-bottom:2px">
                      <span style="background:rgba(217,119,6,0.1);color:var(--amber);border:1px solid rgba(217,119,6,0.25);border-radius:99px;padding:2px 8px;font-size:0.68rem;margin-right:6px">
                        Professor
                      </span>
                      </div>
                      <div style="font-size:0.75rem;color:var(--ink-dim);margin-top:4px;padding-left:2px">
                        View student progress and performance,
                         assign question sets and study plans. Cannot manage billing or licence settings.
                        </div>
                      </div>
                  </div>

                      <div style="display:flex;gap:8px">

                        <button class="btn btn-primary" 
                        style="flex:1"
                        type="submit">
                         Save Changes
                        </button>
                        <button class="btn btn-outline"  
                        type="button"
                        @click="closeModal">Cancel</button>
                      </div>
                   </form>
              </div>
        </div>
    </div>
</template>