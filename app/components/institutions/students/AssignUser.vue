<script setup lang="ts">
import Loading from '@/components/loaders/Loading.vue'
import { ref, watch,reactive, computed } from 'vue'

const props = defineProps<{
  modelValue: Boolean
  institution_id: any|null
  seatsTotal?: number | string | null
  seatsUsed?: number | string | null
}>();

// Student seat capacity. seatsTotal <= 0 means "no limit configured".
const seatsTotalNum = computed(() => Number(props.seatsTotal ?? 0) || 0)
const seatsUsedNum = computed(() => Number(props.seatsUsed ?? 0) || 0)
const hasSeatLimit = computed(() => seatsTotalNum.value > 0)
const seatsRemaining = computed(() => Math.max(seatsTotalNum.value - seatsUsedNum.value, 0))
const isSeatFull = computed(() => hasSeatLimit.value && seatsRemaining.value <= 0)

const emit = defineEmits(["update:modelValue", "saved"]);

const { $api,$toast } = useNuxtApp()
const fullLoading= ref<boolean>(false);
//Close modal
const closeModal = () => {
  emit("update:modelValue", false);
};

// Form Model (addModel)
const forminit = {
  firstname: "",
  lastname: "",
  email: "",
  grad_year: "",
  invive_user: "1",
  status: "1"
};

const addUserModel = reactive(forminit);


// Reset form
const resetForm = () => {
  Object.assign(addUserModel, forminit);
};

// Submit API
const submitAddUser = async (e:any) => {
   e.preventDefault();

    if(!props.institution_id){
      $toast("No found data.");
      closeModal();
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

    // Client-side seat enforcement (backend also enforces)
    if (isSeatFull.value) {
    $toast("No seats available. All " + seatsTotalNum.value + " student seats are in use.",'error');
    return;
    }

    fullLoading.value = true;
    const institution_id=props.institution_id;

  try {
  
    const res:any = await $api.post("/institution-students/add/"+institution_id,addUserModel);
      emit("saved", true);

    if (res.data.status === "success") {
        fullLoading.value = false;
         emit('saved', true)

        const message = res?.data?.msg || 'Add record is successfully.'
        $toast(message,'success');
          closeModal();
           resetForm();
    }else{
        const message = res?.data?.msg || 'Add record is failed.'
        $toast(message,'error');
        fullLoading.value = false;
    }

  } catch (err:any) {
   
      const message = err?.response?.data?.msg || err?.response?.data?.message || 'Add record is failed.'
     $toast(message,'error');
  } finally{
   fullLoading.value = false;
  } 
};

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
watch(() => props.modelValue, (val) => {
  if (val) {
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

        <div class="drawer" style="width:680px;max-width:97vw">
            <div class="drawer-header">
            <div class="fullheadsec">
                <div style="font-size:0.65rem;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:var(--ink-dim);margin-bottom:6px">
                  Add Student
                </div>
            </div>
            <button class="drawer-close" type="button"
            @click="closeModal"
            >
                <svg fill="none" height="13" stroke="currentColor" stroke-linecap="round" stroke-width="2.5" viewBox="0 0 24 24" width="13"><line x1="18" x2="6" y1="6" y2="18"></line><line x1="6" x2="18" y1="6" y2="18"></line></svg>
            </button>
            </div>
            <div class="drawer-body">
                    <div v-if="hasSeatLimit"
                        class="seat-banner"
                        :class="isSeatFull ? 'seat-banner--full' : 'seat-banner--ok'"
                        style="display:flex;align-items:center;justify-content:space-between;gap:8px;border:1.5px solid;border-radius:var(--r-sm);padding:10px 12px;margin-bottom:16px;font-size:0.8rem;font-weight:600">
                        <span>
                          <strong>{{ seatsRemaining }}</strong> of <strong>{{ seatsTotalNum }}</strong> student seats available
                        </span>
                        <span v-if="isSeatFull" style="font-weight:700">Licence full</span>
                    </div>

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
                          placeholder="Enter email..." type="email"
                          v-model="addUserModel.email"
                            required />
                      </div>

                      <div class="form-row" style="margin-bottom:14px">
                        <div class="wrapformsmall" style="background:rgba(8,145,178,0.05);border:1.5px solid rgba(8,145,178,0.15);border-radius:var(--r-sm);padding:10px 12px">
                          <small style="color:#6b7280;">
                            An invitation email with a secure link will be sent to the student to create and set their own password. No password is set manually.
                          </small>
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
                        :disabled="isSeatFull"
                        :title="isSeatFull ? 'No student seats available on this licence' : ''"
                        @click="submitAddUser">
                          {{ isSeatFull ? 'No seats available' : 'Add Student' }}
                        </button>
                        <button class="btn btn-outline"  
                        type="button"
                        @click="closeModal">Cancel</button>
                      </div>
              </div>
        </div>
    </div>
</template>

<style scoped>
.seat-banner--ok {
  border-color: rgba(8, 145, 178, 0.25);
  background: rgba(8, 145, 178, 0.08);
  color: var(--teal);
}
.seat-banner--full {
  border-color: rgba(220, 38, 38, 0.3);
  background: rgba(220, 38, 38, 0.08);
  color: #dc2626;
}
.btn-primary:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
</style>