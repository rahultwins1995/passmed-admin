<script setup lang="ts">
import Loading from '@/components/loaders/Loading.vue'
import Multiselect from '@vueform/multiselect'
import { ref, onMounted,reactive, watch,computed } from 'vue'
// Same reference lists the student onboarding uses, so Add User offers identical
// Country + Medical-school choices.
import { COUNTRIES, schoolsForCountry } from '@/data/onboarding'

const props = defineProps({
  modelValue: Boolean 
});

const emit = defineEmits(["update:modelValue", "saved"]);

const { $toast,$api,$confirm } = useNuxtApp()

//Close modal
const closeModal = () => {
  errorMsg.value = "";
  emit("update:modelValue", false);
};

// Form Model (addModel)
const inifitForm={
  firstname: "",
  lastname: "",
  email: "",
  // role is ALWAYS 'student' at the auth level (front login only accepts
  // student/professor/institution-admin). The Medical-student vs Resident choice is
  // the onboarding `audience`, not the role — writing 'resident' into role blocked
  // invited residents from logging in.
  role: "student",
  audience: "student",
  grad_year: new Date().getFullYear().toString(),
  institution: "",
  institution_id: "0",
  exam_id: "0",
  plan: "0",
  expiry_date: "",
  internal_note: "",
  // Onboarding intake — admin may set on create.
  medical_school: "",
  country: "",
  work_study: "",
  specialty: "",
  exam_date: "",
  // Admin-created users are INVITED (they get a set-password email, no admin-set
  // password), so they start Pending. Setting their password via the invite link
  // flips them to Active — the "Pending = invited, not yet signed up" lifecycle.
  status: "2",
};
const addUserModel = reactive(inifitForm);

// ── Onboarding intake: Country + Medical-school pickers (mirrors the student modal)
const SCHOOL_OTHER = '__other__'
const schoolSelect = ref('')   // dropdown value: a school name, or SCHOOL_OTHER
const schoolOther  = ref('')   // free text when "not listed", or when the country has no list

const schoolGroups  = computed(() => schoolsForCountry(addUserModel.country || ''))
const hasSchoolList = computed(() => schoolGroups.value.length > 0)
const effectiveSchool = computed(() => {
  if (!hasSchoolList.value) return (schoolOther.value || '').trim()
  return schoolSelect.value === SCHOOL_OTHER ? (schoolOther.value || '').trim() : (schoolSelect.value || '').trim()
})
// Changing country invalidates a school picked for the previous country.
watch(() => addUserModel.country, () => { schoolSelect.value = ''; schoolOther.value = '' })


// Reset form
const resetForm = () => {
  Object.assign(addUserModel,inifitForm);
};

const validatePassword = (password: string ='') => {
  const minLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  return {
    minLength,
    hasNumber,
    hasSpecial,
    anyFilled: password.length > 0,
    oneValid: password.length>0|| minLength||hasNumber||hasSpecial,
    valid: minLength && hasNumber && hasSpecial
  }
}

const validateMatchPassword = (password: string ='',confirmPassword: string ='') => {
const hasPassword = password.trim().length > 0
  const hasConfirm = confirmPassword.trim().length > 0
  const match = password.trim() === confirmPassword.trim()
  return {
    hasPassword,
    hasConfirm,
    match: password === confirmPassword, // correct
    valid: hasPassword && hasConfirm && match
  }
}

const passwordChecks = computed(() =>validatePassword(addUserModel.password));
const confirpasswordChecks = computed(() =>validatePassword(addUserModel.confirmpassword));
const passwMatch = computed(() =>validateMatchPassword(addUserModel.password,addUserModel.confirmpassword));

const fullLoading= ref<boolean>(false);
const errorMsg = ref<string>("");
// Submit API
const submitAddUser = async (e:any) => {
  e.preventDefault();
  errorMsg.value = "";

  if (!addUserModel.email) {
    errorMsg.value = "Email is required.";
    $toast("Email is required.","error");
    return;
  }

  // Basic email-format guard before POST (backend still validates authoritatively).
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRe.test(addUserModel.email.trim())) {
    errorMsg.value = "Please enter a valid email address.";
    $toast("Please enter a valid email address.","error");
    return;
  }

    fullLoading.value = true;

    // Resolve the school picker → medical_school for students; residents have no
    // school (they use work / study), so clear it for them.
    addUserModel.medical_school = addUserModel.audience === 'student' ? effectiveSchool.value : ''

  try {

    const res:any =await $api.post("/users/add",addUserModel);

    if (res.data.status === "success") {
            $toast("Add user successfully");
        emit("saved", true);
        resetForm();
        closeModal();
    }else{
      // Backend sends the real reason in `msg` (or `errormsg` on exceptions)
      const message = res?.data?.msg || res?.data?.errormsg || 'Failed to save.'
      errorMsg.value = message;
      $toast(message,'error');
    }


  } catch (err:any) {
    // Read the actual backend message (msg / errormsg), not `message`
    const message = err?.response?.data?.msg || err?.response?.data?.errormsg || err?.response?.data?.message || 'Failed to save.'
    errorMsg.value = message;
    $toast(message,'error');

  } finally {
    fullLoading.value = false;
  }
};

/*********** start *************/
const getDataExamsList = ref<any[]>([])

const dataaExamsloading= ref<boolean>(false);
const inputSearchExam= ref<any>("");
const fetchExamsListData= async ()=>{
  dataaExamsloading.value=true;
    
try{
        const res:any = await $api.post("/exams/list", {
                search: inputSearchExam.value
        });
        const obj:any = res.data || {};
    
        if(obj.status == 'success'){
        getDataExamsList.value=obj.data||[];
        }else{
        getDataExamsList.value=[];
        }

    } catch(err){
      getDataExamsList.value=[];

    }finally{
        dataaExamsloading.value=false;
    }
}

let searchTimeout: any = null;
const onSearchExam =async (query: string) => {
    inputSearchExam.value = query;
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
       await fetchExamsListData();
    }, 500);
};

const examOptions = computed(() => [
    { id: "0", name: "! -- Please Select Option -- !" },
    ...getDataExamsList.value
]);

const getExamsPlanList = ref<any[]>([])
const dataExamsPlanloading= ref<boolean>(false);

const fetchExamsPlanData= async (id:string|number=0)=>{

dataExamsPlanloading.value=true;
  
  try{
      const res:any = await $api.get("/exams/plans/"+id);
      const obj:any = res.data;
  
      if(obj.status == 'success'){
      getExamsPlanList.value=obj.data;
      }else{
      getExamsPlanList.value=[];
      }

  } catch(err){
    getExamsPlanList.value=[];

  }finally{
      dataExamsPlanloading.value=false;
  }
}

const onChangeExamId = async (id: string | number) => {
  addUserModel.plan = "0";
  if (id && id !== "0") {
      await fetchExamsPlanData(id);
  }else{
    getExamsPlanList.value=[];
  }
}

  const examPlanOptions = computed(() => {
  // plan '0' = the 7-day free trial (backend stores plan=0, expiry = now+7d — same as
  // a self-signup trial). It used to read "! -- Select -- !", so admins had no way to
  // knowingly pick a trial. Labelled explicitly now.
  return [
  { plan: '0', name: 'Free Trial (7 days)' },
  ...getExamsPlanList.value
  ]
  })

  /*********** end *************/

/*********** institutions dropdown (optional assignment) *************/
const getInstitutionList = ref<any[]>([])
const institutionLoading = ref<boolean>(false)
const inputSearchInst = ref<string>("")

const fetchInstitutionList = async () => {
  institutionLoading.value = true
  try {
    const res:any = await $api.post("/institutions", { limit: 1000, search: inputSearchInst.value })
    const obj:any = res.data || {}
    getInstitutionList.value = obj.status === 'success' ? (obj.data || []) : []
  } catch {
    getInstitutionList.value = []
  } finally {
    institutionLoading.value = false
  }
}

let instSearchTimeout: any = null
const onSearchInstitution = (query: string) => {
  inputSearchInst.value = query
  clearTimeout(instSearchTimeout)
  instSearchTimeout = setTimeout(() => fetchInstitutionList(), 400)
}

const institutionOptions = computed(() => [
  { institution_id: "0", institution_name: "— None —" },
  ...getInstitutionList.value.map((i:any) => ({ ...i, institution_id: String(i.institution_id) }))
])

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

onMounted(() => {
    fetchExamsListData();
    fetchInstitutionList();
});

</script>

<template>
  <Loading v-if="fullLoading"/>
    <div
    v-if="modelValue"
    class="overlay overlay-top open"  
    @click.self="closeModal">

        <div class="drawer" style="width:580px;max-width:97vw">
            <div class="drawer-header">
            <div>
                <div style="font-size:0.65rem;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:var(--ink-dim);margin-bottom:6px">
                    Add New User
                </div>
            </div>
            <button class="drawer-close" type="button"
            @click="closeModal"
            >
                <svg fill="none" height="13" stroke="currentColor" stroke-linecap="round" stroke-width="2.5" viewBox="0 0 24 24" width="13"><line x1="18" x2="6" y1="6" y2="18"></line><line x1="6" x2="18" y1="6" y2="18"></line></svg>
            </button>
            </div>
            <div class="drawer-body">
              <div v-if="errorMsg"
                style="display:flex;align-items:center;gap:8px;margin-bottom:14px;padding:10px 14px;border-radius:8px;background:rgba(220,38,38,0.06);border:1.5px solid rgba(220,38,38,0.25);color:#b91c1c;font-size:0.82rem;font-weight:600">
                <svg fill="none" height="15" stroke="currentColor" stroke-linecap="round" stroke-width="2.5" viewBox="0 0 24 24" width="15" style="flex-shrink:0">
                  <circle cx="12" cy="12" r="10"></circle><line x1="12" x2="12" y1="8" y2="12"></line><line x1="12" x2="12.01" y1="16" y2="16"></line>
                </svg>
                {{ errorMsg }}
              </div>
              <form v-on:submit="submitAddUser">
                      <div class="form-row-2">
                        <div class="form-row" style="margin-bottom:14px">
                            <label class="form-label">First Name</label>
                            <input class="form-input"
                            placeholder="e.g. Sarah" type="text"
                            v-model="addUserModel.firstname"  
                            required/>
                        </div>
                          <div class="form-row" style="margin-bottom:14px">
                              <label class="form-label">Last Name</label>
                              <input class="form-input" id="newUserLast" placeholder="e.g. Chen" 
                              type="text"
                              v-model="addUserModel.lastname" 
                              required />
                          </div>
                      </div>

                      <div class="form-row" style="margin-bottom:14px">
                          <label class="form-label">
                          Email Address</label>
                          <input class="form-input" id="newUserEmail"
                          placeholder="sarah.chen@med.edu" type="email"
                          v-model="addUserModel.email"
                            required />
                      </div>

                      <!-- Invite-only: no admin-set password. The user gets a
                           set-password email and chooses their own. -->
                      <div class="form-row" style="margin-bottom:14px">
                        <div class="no-pass-needed-prompt">
                          <span style="font-size:1rem;line-height:1">✉️</span>
                          <span style="font-size:0.8rem;color:var(--ink-dim,#6b7280)">
                            No password needed — we'll email <strong>{{ addUserModel.email || 'this user' }}</strong>
                            an invite link to set their own password.
                          </span>
                        </div>
                      </div>

                      <div class="form-row" style="margin-bottom:14px">
                              <label class="form-label">
                                  Institution
                                  <span style="font-weight:400;font-size:0.72rem;color:var(--ink-dim)">
                                  (optional)
                                  </span>
                              </label>

                              <Multiselect
                              class="multiexam-select-options"
                              placeholder="Select institution (optional)"
                              v-model="addUserModel.institution_id"
                              :options="institutionOptions"
                              label="institution_name"
                              valueProp="institution_id"
                              :searchable="true"
                              :loading="institutionLoading"
                              @search-change="onSearchInstitution"
                              />
                      </div>

                      <div class="form-row-2">

                          <div class="form-row" style="margin-bottom:14px">
                              <label class="form-label">Level</label>
                              <select class="form-input form-select" id="newUserLevel"
                              v-model="addUserModel.audience">
                                  <option value="student">Medical student</option>
                                  <option value="resident">Resident or doctor</option>
                              </select>
                          </div>
                           <div class="form-row" style="margin-bottom:14px">
                            <label class="form-label">Grad Year</label>
                            <input class="form-input" placeholder="2027"
                            type="text" inputmode="numeric"
                            v-model="addUserModel.grad_year"
                            />
                          </div>
                      </div>

                      <!-- Onboarding intake — same fields + lists as the student onboarding -->
                      <div class="form-row" style="margin-bottom:14px">
                        <label class="form-label">Country <span style="font-weight:400;font-size:0.72rem;color:var(--ink-dim)">(optional)</span></label>
                        <select class="form-input form-select" v-model="addUserModel.country">
                          <option value="">— Select country —</option>
                          <option v-for="c in COUNTRIES" :key="c" :value="c">{{ c }}</option>
                        </select>
                      </div>

                      <!-- Student → medical school (dropdown scoped to country, free-text fallback). -->
                      <template v-if="addUserModel.audience === 'student'">
                        <div v-if="hasSchoolList" class="form-row" style="margin-bottom:14px">
                          <label class="form-label">Medical School</label>
                          <select class="form-input form-select" v-model="schoolSelect">
                            <option value="">— Select your school —</option>
                            <optgroup v-for="grp in schoolGroups" :key="grp.group" :label="grp.group">
                              <option v-for="s in grp.schools" :key="s" :value="s">{{ s }}</option>
                            </optgroup>
                            <option :value="SCHOOL_OTHER">My school isn’t listed…</option>
                          </select>
                        </div>
                        <div v-if="hasSchoolList && schoolSelect === SCHOOL_OTHER" class="form-row" style="margin-bottom:14px">
                          <label class="form-label">School name</label>
                          <input class="form-input" type="text" v-model="schoolOther" placeholder="Type your medical school"/>
                        </div>
                        <div v-if="!hasSchoolList" class="form-row" style="margin-bottom:14px">
                          <label class="form-label">Medical School</label>
                          <input class="form-input" type="text" v-model="schoolOther" placeholder="Your medical school"/>
                        </div>
                      </template>

                      <!-- Resident / doctor → where they work / study + specialty. -->
                      <template v-else>
                        <div class="form-row" style="margin-bottom:14px">
                          <label class="form-label">Where you work / study <span style="font-weight:400;font-size:0.72rem;color:var(--ink-dim)">(optional)</span></label>
                          <input class="form-input" type="text" v-model="addUserModel.work_study" placeholder="Institution or program"/>
                        </div>
                        <div class="form-row" style="margin-bottom:14px">
                          <label class="form-label">Specialty <span style="font-weight:400;font-size:0.72rem;color:var(--ink-dim)">(optional)</span></label>
                          <input class="form-input" type="text" v-model="addUserModel.specialty" placeholder="e.g. Internal Medicine"/>
                        </div>
                      </template>

                      <div class="form-row" style="margin-bottom:14px">
                        <label class="form-label">Exam Date <span style="font-weight:400;font-size:0.72rem;color:var(--ink-dim)">(optional)</span></label>
                        <input class="form-input" type="date" v-model="addUserModel.exam_date"/>
                      </div>

                      <div class="form-row-2">
                      <div class="form-row" style="margin-bottom:14px">
                        <label class="form-label">Exam Access</label>
                        <Multiselect
                        class="multiexam-select-options"
                        placeholder="Select Exam"
                        v-model="addUserModel.exam_id"
                        :options="examOptions"
                        label="name"
                        valueProp="id"
                        :searchable="true"
                        :loading="dataaExamsloading"
                        @search-change="onSearchExam"
                        @change="onChangeExamId"
                        />

                      </div>

                      <div class="form-row" style="margin-bottom:14px">
                      <label class="form-label">Plan</label>
                      <Multiselect class="multiexam-select-options exam-plan-select"
                      v-model="addUserModel.plan"
                      :options="examPlanOptions"
                      label="name"
                      valueProp="plan"
                      :searchable="true"
                      :loading="dataExamsPlanloading"
                      />
                     
                      </div>
                      </div>
                      <div class="form-row" style="margin-bottom:14px">
                      <label class="form-label">Access Expiry
                        <span style="font-weight:400;font-size:0.72rem;color:var(--ink-dim)">(leave blank to calculate from plan)</span></label>
                      <input name="expiry_date" class="form-input" id="newUserExpiry" type="date"
                      v-model="addUserModel.expiry_date" />
                      </div>
                      <div class="form-row" style="margin-bottom:20px">
                      <label class="form-label">Internal Note <span style="font-weight:400;font-size:0.72rem;color:var(--ink-dim)">(optional)</span></label>
                      <textarea class="form-input" id="newUserNote" rows="3"
                      maxlength="200"
                      placeholder="e.g. Scholarship recipient, added by admin"
                       v-model="addUserModel.internal_note"></textarea>
                      <!-- Live counter. The column is TEXT now, so this is a soft guide,
                           not a hard DB cap — the old silent "too long" 500 is gone. -->
                      <div style="text-align:right;font-size:0.7rem;color:var(--ink-dim)">
                        {{ (addUserModel.internal_note || '').length }} / 200
                      </div>
                      </div>
                      <div style="display:flex;gap:8px">

                        <button class="btn btn-primary" style="flex:1" type="submit"
                          :disabled="fullLoading" >
                            {{ fullLoading ? "Saving..." : "Create User  &amp; Send Welcome Email" }}
                        </button>
                        <button class="btn btn-outline" type="button"
                        @click="closeModal">Cancel</button>
                      </div>
                   </form>
              </div>
        </div>
    </div>
</template>