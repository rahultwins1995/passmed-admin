<script setup lang="ts">
import Loading from '@/components/loaders/Loading.vue'
import Multiselect from '@vueform/multiselect'
import { ref, onMounted,reactive, watch,computed, nextTick } from 'vue'
// Same reference lists the student onboarding uses (copied verbatim), so the admin
// edit form offers identical Country + Medical-school choices.
import { COUNTRIES, schoolsForCountry } from '@/data/onboarding'

const props = defineProps<{
  modelValue: Boolean
    detail: any | null
    // When true, the SAME form renders as a plain embedded section (no overlay /
    // drawer chrome, no close button) so it can live inline on the user detail page.
    // Default false keeps the original modal behaviour for the users list page.
    inline?: boolean
}>()

const emit = defineEmits(["update:modelValue", "saved"]);

const { $toast,$api,$confirm } = useNuxtApp()

const loading = ref(false);
const pageDetail = ref(null);

//Close modal
const closeModal = () => {
  emit("update:modelValue", false);
};


// Form Model (addModel)
const inifitForm={
  firstname: "",
  lastname: "",
  email: "",
  password: "",
  confirmpassword: "",
  // role stays 'student' at the auth level; the Level dropdown is `audience`.
  role: "student",
  audience: "student",
  grad_year: new Date().getFullYear().toString(),
  institution: "",
  institution_id: "0",
  exam_id: "0",
  plan: "0",
  expiry_date: "",
  internal_note: "",
  status: "1",
  // Onboarding intake — editable here.
  medical_school: "",
  country: "",
  work_study: "",
  specialty: "",
  exam_date: "",
};

const addUserModel = reactive<any>(inifitForm);

// ── Onboarding intake: Country + Medical-school pickers (mirrors the student modal)
const SCHOOL_OTHER = '__other__'
const schoolSelect = ref('')   // dropdown value: a school name, or SCHOOL_OTHER
const schoolOther  = ref('')   // free text when "not listed", or when the country has no list
let hydratingSchool = false     // suppresses the country-change reset during prefill

const schoolGroups  = computed(() => schoolsForCountry(addUserModel.country || ''))
const hasSchoolList = computed(() => schoolGroups.value.length > 0)
const effectiveSchool = computed(() => {
  if (!hasSchoolList.value) return (schoolOther.value || '').trim()
  return schoolSelect.value === SCHOOL_OTHER ? (schoolOther.value || '').trim() : (schoolSelect.value || '').trim()
})

// Changing country invalidates a school picked for the previous country.
watch(() => addUserModel.country, () => {
  if (hydratingSchool) return
  schoolSelect.value = ''
  schoolOther.value  = ''
})

// Seed the school pickers from an existing medical_school value (edit prefill).
const hydrateSchool = (country:string, ms:string) => {
  hydratingSchool = true
  const groups = schoolsForCountry(country || '')
  if (groups.length > 0) {
    const inList = groups.some((g:any) => (g.schools || []).includes(ms))
    if (ms && inList)      { schoolSelect.value = ms;          schoolOther.value = '' }
    else if (ms)           { schoolSelect.value = SCHOOL_OTHER; schoolOther.value = ms }
    else                   { schoolSelect.value = '';           schoolOther.value = '' }
  } else {
    schoolSelect.value = ''
    schoolOther.value  = ms || ''
  }
  nextTick(() => { hydratingSchool = false })
}

// Reset form
const resetForm = () => {
  Object.assign(addUserModel, inifitForm);
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

const fullLoading=ref<boolean>(false);

// Current subscriptions (list) + add-subscription action state.
const subscriptions = ref<any[]>([]);
const addingSubscription = ref<boolean>(false);

// Submit API
const submitAddUser = async (e:any) => {
  e.preventDefault();

  if (!props.detail?.id) return

  if (!addUserModel.email) {
     $toast("Email required","error");
    return;
  }

  fullLoading.value = true;

  // Resolve the school picker → medical_school for students; residents have no
  // school (they use work / study), so clear it for them.
  addUserModel.medical_school = addUserModel.audience === 'student' ? effectiveSchool.value : ''

  try {
    // Subscriptions are managed separately (list + "Add Subscription"), so the
    // profile save must NOT create/replace a subscription — force exam_id/plan off.
    const res:any = await $api.post("/users/edit/" + props.detail.id, { ...addUserModel, exam_id: '0', plan: '0' });
  
    if (res.data.status === "success") {
            $toast("Changes saved successfully");
            emit("saved", true);
            resetForm();
    } else {
       $toast('Update Change failed',"error");
    }

  } catch (err:any) {
        const message = err?.response?.data?.message || 'Failed to saved.'
        $toast(message,'error');
  } finally {
    fullLoading.value = false;
    // Inline (embedded on the detail page) stays open after saving — only the
    // modal variant closes itself.
    if (!props.inline) closeModal();
  }
};

const formatDate = (dateStr:any) => {
  if (!dateStr || dateStr == "1970-01-01 00:00:00"){
    return ''
  }
  return dateStr.split(' ')[0]   // removes time part
}

const fetchData = async () => {
   
  if (!props.detail?.id){
    return
  }

  fullLoading.value = true

  try {
    const res:any = await $api.get("/users/edit/" + props.detail.id)
    
    if (res?.data?.status === 'success') {
        const obj:any = res.data.data;
        pageDetail.value=obj;

        Object.assign(addUserModel, {
        firstname: obj.firstname || "",
        lastname: obj.lastname || "",
        email: obj.email || "",
        role: "student",
        audience: obj.audience || (obj.role === 'resident' ? 'resident' : 'student'),
        //  DEFAULT GRAD YEAR
        grad_year: obj.grad_year && obj.grad_year !== "0"
        ? obj.grad_year
        : new Date().getFullYear().toString(),

        institution: obj.institution || "",
        institution_id: String(obj.institution_id ?? "0"),
        // Add-subscription form starts empty (subscriptions shown in the list below).
        exam_id: "0",
        expiry_date: "",

        internal_note: obj.internal_note || "",
        status: String(obj.status ?? "1"),
        // Onboarding intake — prefill from the user detail.
        medical_school: obj.medical_school || "",
        country: obj.country || "",
        work_study: obj.work_study || "",
        specialty: obj.specialty || "",
        exam_date: obj.exam_date || "",
        });

        // Seed the school dropdown / "other" free-text from the stored school.
        hydrateSchool(obj.country || "", obj.medical_school || "");

        // Populate the current-subscriptions list.
        subscriptions.value = Array.isArray(obj.subscriptions) ? obj.subscriptions : [];
        addUserModel.plan = "0";
        getExamsPlanList.value = [];
    }else{
          pageDetail.value = null;
          const message = res?.data?.msg || 'No data found.'
          $toast(message,'error');
    }

  } catch (err:any) {
         pageDetail.value = null;
        const message = err?.response?.data?.message || 'No data found.'
        $toast(message,'error');
        
  } finally {
    fullLoading.value = false
  }
}


// Append a new subscription (does NOT replace existing ones).
const addSubscriptionAction = async () => {
  if (!props.detail?.id) return
  if (!addUserModel.exam_id || addUserModel.exam_id === '0') {
    $toast('Select an exam first', 'error'); return
  }
  addingSubscription.value = true
  try {
    const res:any = await $api.post(`/users/${props.detail.id}/subscriptions`, {
      exam_id: addUserModel.exam_id,
      plan: addUserModel.plan,
      expiry_date: addUserModel.expiry_date,
    })
    if (res?.data?.status === 'success') {
      subscriptions.value.unshift(res.data.data)   // newest first
      $toast('Subscription added')
      // reset the add-form
      addUserModel.exam_id = '0'
      addUserModel.plan = '0'
      addUserModel.expiry_date = ''
      getExamsPlanList.value = []
    } else {
      $toast(res?.data?.msg || 'Failed to add subscription', 'error')
    }
  } catch (err:any) {
    $toast(err?.response?.data?.msg || 'Failed to add subscription', 'error')
  } finally {
    addingSubscription.value = false
  }
}

// Remove an errant subscription (e.g. a free trial started on an exam the user
// already has a paid plan for). Guarded — removal is immediate.
const deletingSubId = ref<number | null>(null)
const deleteSubscriptionAction = async (sub:any) => {
  if (!props.detail?.id || !sub?.id) return
  const confirmed = await $confirm(
    `Remove this subscription (${sub.exam_name || 'exam'} · ${sub.plan_label})? This cannot be undone.`
  )
  if (!confirmed) return
  deletingSubId.value = sub.id
  try {
    const res:any = await $api.delete(`/users/${props.detail.id}/subscriptions/${sub.id}`)
    if (res?.data?.status === 'success') {
      subscriptions.value = subscriptions.value.filter((s:any) => s.id !== sub.id)
      $toast('Subscription removed')
    } else {
      $toast(res?.data?.msg || 'Failed to remove subscription', 'error')
    }
  } catch (err:any) {
    $toast(err?.response?.data?.msg || 'Failed to remove subscription', 'error')
  } finally {
    deletingSubId.value = null
  }
}

const getDataExamsList = ref<any[]>([])
const dataaExamsloading= ref<boolean>(false);
  const inputSearchExam= ref<any>("");
const fetchExamData= async ()=>{

  dataaExamsloading.value=true;
    
  try{
       const res:any = await $api.post("/exams/list", {
                search: inputSearchExam.value
        });

        const obj:any = res.data||{};
    
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
       await fetchExamData();
    }, 500);
};

const examOptions = computed(() => [
    { id: "0", name: "! -- Please Select Option -- !" },
    ...getDataExamsList.value
]);

const getExamsPlanList = ref<any[]>([])
const dataExamsPlanloading= ref<boolean>(false);

const fetchExamsPlanData= async (id:string|number=0)=>{
  if(id == '0'){
    return;
  }
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
  getExamsPlanList.value = [];

  if (id && id !== "0") {
      await fetchExamsPlanData(id);
  }
}

  const examPlanOptions = computed(() => {
  // plan '0' = the 7-day free trial (backend stores plan=0, expiry = now+7d).
  return [
  { plan: '0', name: 'Free Trial (7 days)' },
  ...getExamsPlanList.value
  ]
  })

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

watch(() => addUserModel.plan, (val) => {

  if (!val || addUserModel.expiry_date) return;

  const today = new Date();

  let days = 0;

  if (val === "trial") days = 7;
  if (val === "1mo") days = 30;
  if (val === "3mo") days = 90;
  if (val === "6mo") days = 180;
  if (val === "12mo") days = 365;

  if (days > 0) {
    const future = new Date(today);
    future.setDate(today.getDate() + days);

    addUserModel.expiry_date = future.toISOString().split("T")[0];
  }
});

// Institutions dropdown (optional assignment).
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
  // Normalise institution_id to STRING so it matches the prefilled model value
  // (String(obj.institution_id)); @vueform/multiselect compares strictly, so a
  // numeric option id vs a string model value would never pre-select on edit.
  ...getInstitutionList.value.map((i:any) => ({ ...i, institution_id: String(i.institution_id) }))
])

onMounted(()=> {
     pageDetail.value = null
    if (props.detail?.id){
      fetchData()
      fetchExamData();
      fetchInstitutionList();
    }
});

</script>

<template>
  <Loading v-if="fullLoading"/>
    <div
    v-if="(inline || modelValue) && pageDetail"
    :class="inline ? 'user-edit-inline' : 'overlay overlay-top open'"
    @click.self="!inline && closeModal()">

        <div :class="inline ? 'user-edit-card' : 'drawer'" :style="inline ? '' : 'width:580px;max-width:97vw'">
            <div v-if="!inline" class="drawer-header">
            <div>
                <div style="font-size:0.65rem;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:var(--ink-dim);margin-bottom:6px">
                    Edit User
                </div>
            </div>
            <button class="drawer-close" type="button"
            @click="closeModal"
            >
            <svg fill="none" height="13" stroke="currentColor" stroke-linecap="round" stroke-width="2.5" viewBox="0 0 24 24" width="13"><line x1="18" x2="6" y1="6" y2="18"></line><line x1="6" x2="18" y1="6" y2="18"></line></svg>
            </button>
            </div>
            <div :class="inline ? 'user-edit-body' : 'drawer-body'">
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

                       <div class="form-row-2">
                        <div class="form-row" style="margin-bottom:14px">
                            <label class="form-label">password</label>
                            <input name="password" class="form-input"
                            placeholder="Enter password *****" type="password"
                            v-model="addUserModel.password"  
                            />
                          <div v-if="!passwordChecks.valid" class="form-row password-rules"
                          :class="{ active: passwordChecks.oneValid }"
                            >
                              <div class="clvald" 
                                :class="{ valid: passwordChecks.minLength }">
                                Min 8 characters
                              </div>
                              <div  class="clvald" 
                                :class="{ valid: passwordChecks.hasNumber }">
                                At least 1 number
                              </div>
                              <div  class="clvald"  
                                :class="{ valid: passwordChecks.hasSpecial }">
                                1 special character
                              </div>
                          </div>

                        </div>
                          <div class="form-row" style="margin-bottom:14px">
                              <label class="form-label">Confirm Password</label>
                              <input name="confirmpassword" class="form-input"  placeholder="Enter confirm password" 
                              type="text"
                              v-model="addUserModel.confirmpassword" 
                              />
                              <div  v-if="!confirpasswordChecks.valid"
                              class="form-row password-rules"
                               :class="{ active: confirpasswordChecks.oneValid }"
                              >
                                <div class="clvald" 
                                  :class="{ valid: confirpasswordChecks.minLength }">
                                  Min 8 characters
                                </div>
                                <div  class="clvald" 
                                  :class="{ valid: confirpasswordChecks.hasNumber }">
                                  At least 1 number
                                </div>
                                <div  class="clvald"  
                                  :class="{ valid: confirpasswordChecks.hasSpecial }">
                                  1 special character
                                </div>
                            </div>
                          </div>
                      </div>

                        <div class="form-row passwordrules">
                            <div v-if="passwMatch.hasPassword && passwMatch.hasConfirm && !passwMatch.match" 
                            class="required">
                            Password not Match
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
                          <input
                          class="form-input"
                          placeholder="2027"
                          type="text"
                          inputmode="numeric"
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

                      <!-- Student → medical school (dropdown scoped to country, with a
                           free-text fallback), matching the student onboarding. -->
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

                      <!-- CURRENT SUBSCRIPTIONS -->
                      <div class="form-row" style="margin-bottom:14px">
                        <label class="form-label">Current Subscriptions</label>
                        <div v-if="subscriptions.length">
                          <div v-for="s in subscriptions" :key="s.id"
                            style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 10px;border:1px solid var(--line,#e5e7eb);border-radius:8px;margin-bottom:6px">
                            <span style="font-weight:600">{{ s.exam_name || '—' }}</span>
                            <span style="display:flex;align-items:center;gap:10px">
                              <span style="font-size:0.78rem;color:var(--ink-dim,#6b7280)">
                                {{ s.plan_label }} · Expires {{ s.expiry_label }}
                              </span>
                              <button type="button" class="btn btn-danger btn-sm"
                                :disabled="deletingSubId === s.id"
                                title="Remove this subscription"
                                @click="deleteSubscriptionAction(s)">
                                {{ deletingSubId === s.id ? '…' : 'Remove' }}
                              </button>
                            </span>
                          </div>
                        </div>
                        <div v-else style="font-size:0.8rem;color:var(--ink-dim,#6b7280);padding:6px 2px">
                          No subscriptions yet.
                        </div>
                      </div>

                      <!-- ADD SUBSCRIPTION (appends a new plan, doesn't replace) -->
                      <div style="border:1px dashed var(--line,#e5e7eb);border-radius:10px;padding:12px;margin-bottom:14px">
                        <label class="form-label" style="margin-bottom:10px;display:block">Add Subscription</label>
                        <div class="form-row-2">
                          <div class="form-row" style="margin-bottom:10px">
                            <label class="form-label">Exam</label>
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

                          <div class="form-row" style="margin-bottom:10px">
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
                        <div class="form-row" style="margin-bottom:10px">
                        <label class="form-label">Access Expiry
                          <span style="font-weight:400;font-size:0.72rem;color:var(--ink-dim)">(leave blank to calculate from plan)</span></label>
                        <input name="expiry_date" class="form-input" id="newUserExpiry" type="date"
                        v-model="addUserModel.expiry_date" />
                        </div>
                        <button class="btn btn-outline" type="button"
                          :disabled="addingSubscription"
                          @click="addSubscriptionAction">
                          {{ addingSubscription ? 'Adding…' : '+ Add Subscription' }}
                        </button>
                      </div>

                      <div class="form-row" style="margin-bottom:20px">
                      <label class="form-label">Internal Note <span style="font-weight:400;font-size:0.72rem;color:var(--ink-dim)">(optional)</span></label>
                      <textarea class="form-input" id="newUserNote" rows="3"
                      maxlength="200"
                      placeholder="e.g. Scholarship recipient, added by admin"
                       v-model="addUserModel.internal_note"></textarea>
                      <!-- Live counter. Column is TEXT now, so this is a soft guide. -->
                      <div style="text-align:right;font-size:0.7rem;color:var(--ink-dim)">
                        {{ (addUserModel.internal_note || '').length }} / 200
                      </div>
                      </div>


                      <div class="form-row" style="margin-bottom:20px">
                        <label class="form-label">
                          Status
                        </label>
                        <!-- Login state only. Free Trial is NOT here — it's derived from
                             the plan (a trial user is Active with a plan-0 subscription). -->
                        <select class="form-input form-select"
                        v-model="addUserModel.status">
                        <option value="1">Active</option>
                        <option value="0">Inactive</option>
                        <option value="2">Pending</option>
                        <option value="3">Blocked</option>
                        </select>
                      </div>


                      <div style="display:flex;gap:8px">

                        <button class="btn btn-primary"
                        :style="inline ? 'min-width:180px' : 'flex:1'"
                        type="submit"
                          :disabled="loading" >
                         Save Changes
                        </button>
                        <button v-if="!inline" class="btn btn-outline"
                        type="button"
                        @click="closeModal">Cancel</button>
                      </div>
                   </form>
              </div>
        </div>
    </div>
</template>

<style scoped>
/* Inline (embedded) mode — the same form, rendered as a neat card section on the
   user detail page instead of a fixed overlay drawer. Constrained width so the
   inputs don't stretch edge-to-edge across the whole page (they were meant for a
   ~580px drawer). */
.user-edit-inline { display: block; width: 100%; }
.user-edit-card {
  width: 100%;
  max-width: 780px;
  margin: 0 auto;                 /* centre the card in the page */
  border: 1px solid var(--line, #e5e7eb);
  border-radius: 12px;
  background: var(--card, #fff);
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04);
}
.user-edit-body { padding: 24px 26px; }
</style>