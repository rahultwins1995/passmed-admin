<script setup lang="ts">
import Loading from '@/components/loaders/Loading.vue'
import { ref, watch,reactive } from 'vue'

const props = defineProps<{
  modelValue: Boolean 
  detailId: any|null 
}>();

const emit = defineEmits(["update:modelValue", "saved"]);

const { $api,$toast } = useNuxtApp()
const fullLoading= ref<boolean>(false);
//Close modal
const closeModal = () => {
  emit("update:modelValue", false);
};

// Form Model (addModel)
const addUserModel = reactive({
  firstname: "",
  lastname: "",
  email: "",
  password: "",
  confirmpassword: "",
   grad_year: "",
  status: "1"
});


// Reset form
const resetForm = () => {
  Object.assign(addUserModel, {
    firstname: "",
    lastname: "",
    email: "",
    password: "",
    confirmpassword: "",
    grad_year: "",
    status: "1"
  });
};

// Submit API
const submitAddUser = async (e:any) => {
  e.preventDefault();
    if(!props.detailId){
     return;
    }

    if (!addUserModel.firstname) {
    $toast("Frist name required");
    return;
    }
    
    if (!addUserModel.lastname) {
    $toast("Frist name required",'error');
    return;
    }

    if (!addUserModel.email) {
    $toast("Email required",'error');
    return;
    }

    closeModal();

    fullLoading.value = true;
    const institution_manage_id=props.detailId;

  try {
  
    const res:any = await $api.post("/institution-students/update/"+institution_manage_id,addUserModel);
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
/**
 *  fetch data by id
 */ 
const pageDetail = ref(null);
const fetchData = async () => {
     if (!props.detailId){
     $toast('No data found','error');
     return
  }

  fullLoading.value = true
 
  try {
    const res:any = await $api.get("/institution-students/show/" + props.detailId)
    
    if (res?.data?.status === 'success') {
        const detail = res.data.data;
        pageDetail.value=detail;

        addUserModel.firstname=detail?.firstname??"";
        addUserModel.lastname=detail?.lastname??"";
        addUserModel.email=detail?.email??"";
        addUserModel.grad_year=detail?.grad_year??"";
        addUserModel.status=detail?.status??"0";

    }else{
          closeModal();
          pageDetail.value = null;
          const message = res?.data?.msg || 'No data found.'
          $toast(message,'error');
    }

  } catch (err:any) {
          closeModal();
         pageDetail.value = null;
        const message = err?.response?.data?.message || 'No data found.'
        $toast(message,'error');
        
  } finally {
    fullLoading.value = false
  }
}

watch(() => addUserModel.grad_year, (val) => {

  if (!val) return;

  // remove non-numeric
  let clean = val.toString().replace(/\D/g, '');

  // limit 4 digits
  clean = clean.slice(0, 4);

  //  VALID YEAR RANGE
  if (clean.length === 4) {
    const year = parseInt(clean);
    const currentYear = new Date().getFullYear();

    // invalid year like 6546, 0999 etc
    if (year < 1900 || year > currentYear + 10) {
      $toast("Enter valid year (1900 - " + (currentYear + 10) + ")", "error");
      clean = "";
    }
  }

  if (clean !== val) {
    addUserModel.grad_year = clean;
  }

});


// reset when open
watch(() => props.modelValue, async (val) => {
   if (val) {
    await fetchData();
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

        <div class="drawer" style="width:480px;max-width:97vw">
            <div class="drawer-header">
            <div class="fullheadsec">
                <div style="font-size:0.65rem;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:var(--ink-dim);margin-bottom:6px">
                Edit Student
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
                        <div class="form-row-2">
                        <div class="form-row" style="margin-bottom:14px">
                            <label class="form-label">
                              First Name:<span class="required">*</span>
                            </label>
                            <input class="form-input"
                            placeholder="e.g. Sarah" type="text"
                            v-model="addUserModel.firstname"  
                            required/>
                        </div>
                          <div class="form-row" style="margin-bottom:14px">
                              <label class="form-label">
                                Last Name:<span class="required">*</span>
                              </label>
                              <input class="form-input" id="newUserLast" placeholder="e.g. Chen" 
                              type="text"
                              v-model="addUserModel.lastname" 
                              required />
                          </div>
                      </div>

                      <div class="form-row" style="margin-bottom:14px">
                          <label class="form-label">
                          Email Address:<span class="required">*</span>
                        </label>
                          <input class="form-input" id="newUserEmail"
                          placeholder="Enter email" type="email"
                          v-model="addUserModel.email"
                            required />
                      </div>

                       <div class="form-row-2">
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

                         <div class="form-row" style="margin-bottom:14px">
                            <label class="form-label">Grad Year</label>
                            <input 
                            class="form-input"
                            placeholder="2027"
                            type="text"
                            inputmode="numeric"
                            v-model="addUserModel.grad_year"
                            />
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
                      
                   

                      <div style="display:flex;gap:8px">
                        <button class="btn btn-primary" 
                        style="flex:1"
                        type="button"
                        @click="submitAddUser">
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