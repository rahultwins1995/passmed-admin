<script setup lang="ts">
import Loading from '@/components/loaders/Loading.vue'
import AssignInstitutionUser from '@/components/institutions/AssignInstitutionUser.vue'
import AssignEditInstitutionUser from '@/components/institutions/AssignEditInstitutionUser.vue'

import { ref,reactive, watch , onMounted, computed, nextTick} from 'vue'
// Country list (shared with the user onboarding modals).
import { COUNTRIES, DEFAULT_COUNTRY } from '@/data/onboarding'

const props = defineProps<{
  modelValue: Boolean
    detailId: any | null
}>()

const emit = defineEmits(["update:modelValue", "saved"]);

const { $toast,$api,$confirm } = useNuxtApp()
const pageDetail = ref(null);

//Close modal
const closeModal = () => {
  emit("update:modelValue", false);
};

const formatDate = (dateStr:any) => {
  if (!dateStr) return ''
  return dateStr.split(' ')[0]   // removes time part
}

const fullLoading=ref<boolean>(false);

/**
 *  set Tab
**/
const activeInstTab = ref('details');
const setInstTab =(tab:string) => {
  activeInstTab.value = tab;
}

const initialForm ={
  institution_name: "",
  institution_type: "medical-school",
  institution_country: DEFAULT_COUNTRY, // top of the Country -> State -> City cascade
  institution_city: "",
  institution_state: "",
  primarycontact_name: "",
  primarycontact_email: "", // only enter email
  institution_notes: "",
  licence_start_date: "", //only enter date
  licence_end_date: "", // only enter date
  licence_seats: "0",  // only enter number not nagtive value like -1 not allow
  licence_annual_contract_value: "0", // only enter number not nagtive value like -1 not allow
  licence_exams_ids:[] as number[],
  licence_access_method:'email-domain-whitelist',
  licence_email_domain:'',  // only enter email or like med.stanford.edu, stanford.edu
  licence_auto_renew:'0', 
  licence_status: "1",
    financee_name: "",
  invoice_email: "",
  po_number: "PO-2026-1148",

  // ── Team + security ───────────────────────────────────────────────────────
  // How many admins / professors this institution may have. Enforced by
  // InstitutionTeam from BOTH doorways (pm-admin and the institute portal), so
  // raising the number here is the sanctioned way to let a school past the cap —
  // there is deliberately no bypass.
  max_admins: "3",
  max_professors: "10",

  // '' = inherit the platform-wide default (Settings → Security). Deliberately NOT
  // the same as 'never': an institution that has never chosen must follow whatever
  // PassMed sets, and collapsing the two would quietly switch the policy off for
  // everyone who left it alone.
  session_timeout: "",
};

const addFromModel = reactive<any>(initialForm);

/**
 * What the session timeout resolves to once inheritance is applied — so support can
 * see the real number instead of an empty box when the institution is inheriting.
 * Sent by the API alongside the stored value.
 */
const effectiveTimeoutMinutes = ref<number | null>(null)

const effectiveTimeoutLabel = computed(() => {
  const m = effectiveTimeoutMinutes.value
  if (m === null) return 'never'
  if (m < 60) return `${m} minutes`
  const h = m / 60
  return h === 1 ? '1 hour' : `${h} hours`
})


// Reset form
const resetForm = () => {
  Object.assign(addFromModel,initialForm);
};

// ── Country → State → City cascade ─────────────────────────────────────────
// geo.ts is large (states + cities), so load it LAZILY (own chunk) when the
// modal mounts rather than bundling it into the main app.
const geo = ref<any>(null)
const loadGeo = async () => { if (!geo.value) geo.value = await import('@/data/geo') }

const statesList = computed<string[]>(() =>
  geo.value ? geo.value.statesForCountry(addFromModel.institution_country || '') : [])
const hasStateList = computed(() => statesList.value.length > 0)
const citiesList = computed<string[]>(() =>
  geo.value ? geo.value.citiesForState(addFromModel.institution_country || '', addFromModel.institution_state || '') : [])
const hasCityList = computed(() => citiesList.value.length > 0)

// Suppress the reset watches while prefilling from the loaded detail, otherwise
// setting the country would wipe the state/city we just restored.
const prefilling = ref(false)
watch(() => addFromModel.institution_country, () => {
  if (prefilling.value) return
  addFromModel.institution_state = ''
  addFromModel.institution_city = ''
})
watch(() => addFromModel.institution_state, () => {
  if (prefilling.value) return
  addFromModel.institution_city = ''
})

// Restore the country/state/city cascade from a loaded institution detail.
const prefillGeo = async (detail:any) => {
  prefilling.value = true
  addFromModel.institution_country = detail.institution_country || DEFAULT_COUNTRY
  addFromModel.institution_state   = detail.institution_state ?? ''
  addFromModel.institution_city    = detail.institution_city ?? ''
  await nextTick()
  prefilling.value = false
}

//  REGEX
const onlyText = /^[A-Za-z\s]+$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const domainRegex = /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;

// VALIDATION FUNCTION
const validateForm = () => {

  // Institution Name
  if (!addFromModel.institution_name.trim()) {
    $toast("Institution name required", "error");
    return false;
  }

  // City / State are now dropdown-driven (with a free-text fallback for
  // countries without a list), so the old "no numbers" checks are dropped.

  // Primary Email
  if (addFromModel.primarycontact_email && !emailRegex.test(addFromModel.primarycontact_email)) {
    $toast("Invalid primary email", "error");
    return false;
  }

  // Dates
  if (addFromModel.licence_start_date && isNaN(Date.parse(addFromModel.licence_start_date))) {
    $toast("Invalid start date", "error");
    return false;
  }

  if (addFromModel.licence_end_date && isNaN(Date.parse(addFromModel.licence_end_date))) {
    $toast("Invalid end date", "error");
    return false;
  }

  // Seats (only positive number)
  if (Number(addFromModel.licence_seats) < 0) {
    $toast("Seats cannot be negative", "error");
    return false;
  }

  // Contract value
  if (addFromModel.licence_annual_contract_value && Number(addFromModel.licence_annual_contract_value) < 0) {
    $toast("Contract value cannot be negative", "error");
    return false;
  }

  // Email Domain
  if (addFromModel.licence_email_domain) {
    const domains = addFromModel.licence_email_domain.split(',').map((d:string) => d.trim());

    for (let d of domains) {
      if (!(emailRegex.test(d) || domainRegex.test(d))) {
        $toast("Invalid email/domain: " + d, "error");
        return false;
      }
    }
  }

  return true;
};

// Submit API
const submitForm = async (e:any) => {
  e.preventDefault();

  if (!props.detailId) return

  addFromModel.licence_exams_ids=selectedExam.value;

  // VALIDATION CALL
  if (!validateForm()){
  return;
  }

  fullLoading.value = true;

  try {
    const res:any = await $api.post("/institutions/update/" + props.detailId, addFromModel);
  
    if (res.data.status === "success") {
            $toast("Changes saved successfully");
            emit("saved", true);
            closeModal();
            resetForm();
    } else {
       $toast('Update Change failed',"error");
    }

  } catch (err:any) {
        const message = err?.response?.data?.msg || err?.response?.data?.message || 'Failed to saved.'
        $toast(message,'error');
  } finally {
    fullLoading.value = false;
  }
};


const filterUserSearch = ref<string>('')


/**
 * fetch data user list start 
 **/
const usersLoading = ref(false)
const getUsersDataList = ref<any[]>([])
const totalUsersPages = ref<any>(1)
const userCurntPage = ref<any>(1)
const userDataPageCurnt = ref(1)
const userslimit = ref<any>(10)
const totalUserData = ref<any>(0)

const fetchAssignUsers = async () => {
    if(!props.detailId){
        return;
    }
  usersLoading.value = true
  try {
    const res: any = await $api.post('/institutions/users/assign/'+props.detailId,{
        search:filterUserSearch.value,
        page: userDataPageCurnt.value,
        limit: userslimit.value
    })
    const obj:any = res.data||{};
     if (obj.status === 'success') {

      totalUserData.value = obj.total
      totalUsersPages.value = Math.ceil(obj.total / obj.limit)
      userCurntPage.value = obj.current_page

      //  transform data
      const dataList= obj.data||[];
      getUsersDataList.value = dataList;

    } else {
      getUsersDataList.value = []
      totalUserData.value = 0
    }
  
  } catch (error) {
    getUsersDataList.value = [];
     totalUserData.value = 0
  } finally {
    usersLoading.value = false
  }
}

watch(userCurntPage, (newPage) => {
  userDataPageCurnt.value = newPage
  fetchAssignUsers()
})

// update search 
watch(() => filterUserSearch,() => {
  setTimeout(async ()=>{
    userCurntPage.value=1;
    await fetchAssignUsers();
  },800);
})

const savedCallBack=(tems:any)=>{
    fetchAssignUsers();
}

// ── Invite code ──────────────────────────────────────────────────────────────
// Populated from the institution detail (see fetchDetail). Kept out of
// addFromModel on purpose so a licence save can never rotate it — rotation is
// only ever the explicit Regenerate action below.
const inviteCode   = ref<string>('')
const inviteCopied = ref<boolean>(false)
const inviteBusy   = ref<boolean>(false)

const copyInviteCode = async () => {
  if (!inviteCode.value) return
  try {
    await navigator.clipboard.writeText(inviteCode.value)
  } catch {
    // clipboard API is blocked on non-HTTPS origins — fall back to a temp input
    // so Copy still works when the panel is served over plain http.
    const el = document.createElement('textarea')
    el.value = inviteCode.value
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
  }
  inviteCopied.value = true
  setTimeout(() => { inviteCopied.value = false }, 1800)
}

const regenerateInviteCode = async () => {
  if (!props.detailId || inviteBusy.value) return

  // Destructive: the old code stops working the moment this succeeds, so make the
  // consequence explicit rather than burying it in a toast afterwards.
  const confirmed = await $confirm(
    'Generate a new invite code? The current code (' + inviteCode.value +
    ') will stop working immediately, and anyone who already has it will not be able to join.'
  )
  if (!confirmed) return

  inviteBusy.value = true
  try {
    const res: any = await $api.post('/institutions/regenerate-invite/' + props.detailId)
    if (res?.data?.status === 'success') {
      inviteCode.value = res.data.invite_code ?? ''
      $toast(res?.data?.msg || 'A new invite code has been generated.', 'success')
      // The Institutions list shows the code in its own column — keep it in sync.
      emit('saved', true)
    } else {
      $toast(res?.data?.msg || 'Could not regenerate the invite code.', 'error')
    }
  } catch (err: any) {
    $toast(err?.response?.data?.msg || 'Could not regenerate the invite code.', 'error')
  } finally {
    inviteBusy.value = false
  }
}

const confirmUserDelete=async(id:any='0')=>{
  const confirmed = await $confirm('Are you sure you want to remove this item?')
    if (confirmed) {
        deleteUser(id);
    }
}

const deleteUser= async (id="0") => {

    fullLoading.value = true

  try {
    const res:any = await $api.delete(`/institutions/users/delete/${id}`)

    if (res.data.status === 'success') {
      fullLoading.value=false;
      
      $toast('Deleted is successFully.')
    
    } else {
      fullLoading.value=false;
      $toast('Failed to delete', 'error')
    }

  } catch (err: any) {
    fullLoading.value=false;
    $toast(err?.response?.data?.msg || err?.response?.data?.message || 'Failed to delete', 'error')
  }
}


const showAddUserModal=ref<boolean>(false);
const onClickOpenUser=()=>{
    userDetail.value=null;
    showAddUserModal.value=true;
}

const showEditUserModal=ref<boolean>(false);
const userDetail=ref<any>(null);
const userEdit=(detail:any)=>{
   userDetail.value=detail;
   showEditUserModal.value=true;
}

// ── "View as" (impersonation) for institution / licence-admin dashboards ───────
// Same short-lived-token flow as the students list (users/index.vue): mint a
// ~60s handoff token for this membership's user, then hand the browser to the
// portal's cross-app enter endpoint via a hidden form-POST (token in the BODY,
// never a URL). The backend resolves the portal from the user's role, so an
// institute-role member lands on /institute. The admin's own session is untouched
// and the action is audit-logged server-side.
const viewingAsId = ref<any>(null)
const viewAsInstitution = async (vl:any) => {
  const uid = Number(vl?.user_id || 0)
  if (uid <= 0) { $toast('This member has no login account to view as.', 'error'); return }
  const confirmed = await $confirm(`Open the institution portal as ${vl?.name || vl?.email}? You'll see it exactly as they do.`)
  if (!confirmed) return
  viewingAsId.value = vl?.id ?? uid
  try {
    const res: any = await $api.post('/impersonate', { user_id: uid })
    const token    = res?.data?.token
    const enterUrl = res?.data?.enter_url
    if (res?.data?.status !== 'success' || !token || !enterUrl) {
      $toast(res?.data?.msg || 'Could not start impersonation.', 'error')
      return
    }
    const form = document.createElement('form')
    form.method = 'POST'
    form.action = enterUrl
    form.target = '_blank'
    const input = document.createElement('input')
    input.type = 'hidden'; input.name = 'token'; input.value = token
    form.appendChild(input)
    document.body.appendChild(form)
    form.submit()
    form.remove()
  } catch (err: any) {
    $toast(err?.response?.data?.msg || 'Could not start impersonation.', 'error')
  } finally {
    viewingAsId.value = null
  }
}

const selectedExam = ref<any[]>([]);
const toggleSelectExam = (id:number) => {
  if (selectedExam.value.includes(id)) {
    selectedExam.value = selectedExam.value.filter((i:any) => i !== id)
  } else {
    selectedExam.value.push(id)
  }
}


/**
 *  fetch exam data
 */ 
const examLoading = ref(false)
const getExamDataList = ref<any[]>([]);
const fetchExamData= async ()=>{
  examLoading.value = true
  try {
    const res: any = await $api.post('/exams/list')
    if (res?.data?.status === 'success') {
      getExamDataList.value = res.data.data || [];
    } else {
      getExamDataList.value = [];
    }
  } catch (error) {
    getExamDataList.value = [];
  } finally {
    examLoading.value = false
  }
}

/**
 *  fetch data by id
 */ 
const fetchData = async () => {

  if (!props.detailId){
     $toast('No data found','error');
     return
  }

  fullLoading.value = true
 
  try {
    const res:any = await $api.get("/institutions/edit/" + props.detailId)
    
    if (res?.data?.status === 'success') {
        const detail = res.data.data;
        pageDetail.value=detail;

        addFromModel.institution_name = detail.institution_name ?? ''
        addFromModel.institution_type = detail.institution_type ?? ''
        // Country / State / City restored via the cascade-aware helper (guards
        // the reset watches so the values survive).
        await prefillGeo(detail)
        addFromModel.primarycontact_name = detail.primarycontact_name ?? ''
        addFromModel.primarycontact_email = detail.primarycontact_email ?? ''
        addFromModel.institutions_notes = detail.institutions_notes ?? ''
        addFromModel.licence_start_date = formatDate(detail.licence_start_date ?? '')
        addFromModel.licence_end_date = formatDate(detail.licence_end_date ?? '')
        addFromModel.licence_seats = detail.licence_seats ?? ''
        addFromModel.licence_annual_contract_value = detail.licence_annual_contract_value ?? ''
        addFromModel.financee_name = detail.financee_name ?? ''
        addFromModel.invoice_email = detail.invoice_email ?? ''
        addFromModel.po_number = detail.po_number ?? ''
        // Read-only — the code is issued by the backend, never typed. It is NOT part
        // of addFromModel because it must never ride along on a licence update: the
        // code may only change through the explicit Regenerate action.
        inviteCode.value = detail.invite_code ?? ''

        addFromModel.licence_access_method = detail.licence_access_method ?? ''
        addFromModel.licence_email_domain = detail.licence_email_domain ?? ''
        addFromModel.licence_auto_renew = Number(detail.licence_auto_renew ?? 1)
        addFromModel.licence_status = Number(detail.licence_status ?? 1)

        addFromModel.max_admins     = Number(detail.max_admins ?? 3)
        addFromModel.max_professors = Number(detail.max_professors ?? 10)

        // `?? ''` NOT `|| ''` — both are '' here, but the intent matters: '' is the
        // stored value meaning "inherit", so it must survive the round trip.
        addFromModel.session_timeout = detail.session_timeout ?? ''
        effectiveTimeoutMinutes.value = detail.session_timeout_effective_minutes ?? null
        selectedExam.value = Array.isArray(detail.licence_exams_ids)
        ? detail.licence_exams_ids.map((v:any) => Number(v))
        : []

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

onMounted(()=> {
    selectedExam.value=[];
     pageDetail.value = null
    loadGeo();
    if (props.modelValue){
      fetchData()
      fetchExamData();
      fetchAssignUsers();
    }
});

</script>
<template>
  <Loading v-if="fullLoading"/>

  <div v-if="modelValue && pageDetail" class="overlay open"  
    @click.self="closeModal">

        <div class="drawer" style="width:700px;max-width:97vw">
            <div class="drawer-header">
            <div>
                <div style="font-size:0.65rem;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:var(--ink-dim);margin-bottom:6px">
                   Edit Licence
                </div>
                 <div  class="instEditorTitle">
                    Edit Institution
                  </div>
            </div>
            <button class="drawer-close" type="button"
            @click="closeModal"
            >
              <svg fill="none" height="13" stroke="currentColor" stroke-linecap="round" stroke-width="2.5" viewBox="0 0 24 24" width="13"><line x1="18" x2="6" y1="6" y2="18"></line><line x1="6" x2="18" y1="6" y2="18"></line></svg>
            </button>
            </div>
            <div class="drawer-body">
                  <!-- Tabs -->
                    <!-- Tabs -->
                    <div style="margin-bottom: -1px">
                        <button
                        class="tab-btn itabed-details"
                        :class="{ active: activeInstTab === 'details' }"
                        type="button"
                        @click="setInstTab('details')"
                        >
                        Details
                        </button>
                        <button class="tab-btn itabed-licence"
                        :class="{ active: activeInstTab === 'licence' }"
                        type="button"
                        @click="setInstTab('licence')">
                        Licence
                        </button>
                        <button class="tab-btn itabed-users"
                        :class="{ active: activeInstTab === 'users' }"
                        type="button"
                        @click="setInstTab('users')" >
                        Users
                        </button>
                      
                        <button class="tab-btn itabed-billing"
                        :class="{ active: activeInstTab === 'billing' }"
                        type="button"
                        @click="setInstTab('billing')">
                        Billing
                        </button>
                    </div>
                  
                    <!-- Details tab -->
                    <div v-if="activeInstTab === 'details'"
                    class="tab-content active" id="itabed-content-details">
                        <div class="form-row-2">
                            <div class="form-row" style="margin: 0 0 12px">
                                <label class="form-label">Institution Name</label>
                                <input class="form-input" name="instName"
                                    placeholder="e.g. Stanford School of Medicine"
                                    type="text"
                                    v-model="addFromModel.institution_name"
                                />
                            </div>
                            <div class="form-row" style="margin: 0 0 12px">
                                <label class="form-label">Type</label>
                                <select class="form-input form-select" id="instType"
                                v-model="addFromModel.institution_type">
                                    <option value="medical-school">Medical School</option>
                                    <option value="residency-program">Residency Program</option>
                                    <option value="health-system">Health System</option>
                                    <option value="government-va">Government / VA</option>
                                    <option value="international">International</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                        </div>

                        <!-- Country → State → City cascade (dropdowns; free-text
                             fallback for countries/states without a list). -->
                        <div class="form-row-2">
                            <div class="form-row" style="margin: 0 0 12px">
                                <label class="form-label">Country</label>
                                <select class="form-input form-select" v-model="addFromModel.institution_country">
                                    <option v-for="c in COUNTRIES" :key="c" :value="c">{{ c }}</option>
                                </select>
                            </div>
                            <div class="form-row" style="margin: 0 0 12px">
                                <label class="form-label">State / Province</label>
                                <select v-if="hasStateList" class="form-input form-select"
                                    v-model="addFromModel.institution_state">
                                    <option value="">— Select a state —</option>
                                    <option v-for="s in statesList" :key="s" :value="s">{{ s }}</option>
                                </select>
                                <input v-else class="form-input" name="instState" type="text" placeholder="State / Province"
                                    v-model="addFromModel.institution_state" />
                            </div>
                        </div>
                        <div class="form-row-2">
                            <div class="form-row" style="margin: 0 0 12px">
                                <label class="form-label">City</label>
                                <select v-if="hasCityList" class="form-input form-select"
                                    v-model="addFromModel.institution_city">
                                    <option value="">— Select a city —</option>
                                    <option v-for="c in citiesList" :key="c" :value="c">{{ c }}</option>
                                </select>
                                <input v-else class="form-input" name="instCity" type="text"
                                    :placeholder="addFromModel.institution_state ? 'City' : 'Select a state first'"
                                    v-model="addFromModel.institution_city"/>
                            </div>
                            <div class="form-row" style="margin: 0 0 12px"></div>
                        </div>
                        <div class="form-row-2">
                            <div class="form-row" style="margin: 0 0 12px">
                                <label class="form-label">Primary Contact Name</label>
                                <input class="form-input" name="instContactName" placeholder="Dr. Sarah Patel" type="text" 
                                v-model="addFromModel.primarycontact_name" />
                            </div>
                            <div class="form-row" style="margin: 0 0 12px">
                                <label class="form-label">Primary Contact Email</label>
                                <input class="form-input" name="instContactEmail"
                                    placeholder="admin@institution.edu"  type="email"
                                    v-model="addFromModel.primarycontact_email"/>
                            </div>
                        </div>
                        <div class="form-row">
                            <label class="form-label">Notes</label>
                            <textarea class="form-input"
                                name="instNotes"
                                placeholder="Internal notes about the account..."
                                rows="2"
                                style="resize: vertical"
                            v-model="addFromModel.institution_notes"></textarea>
                        </div>
                    </div>

                    <!-- Licence tab -->

                    <div v-if="activeInstTab === 'licence'"
                     class="tab-content active" id="itabed-content-licence">
                        <div class="form-row-2">
                            <div class="form-row" style="margin: 0 0 12px">
                                <label class="form-label">Licence Start</label>
                                <input class="form-input" name="instLicStart" type="date" 
                                v-model="addFromModel.licence_start_date"/>
                            </div>
                            <div class="form-row" style="margin: 0 0 12px">
                                <label class="form-label">Licence End</label>
                                <input class="form-input" name="instLicEnd" type="date"
                                 v-model="addFromModel.licence_end_date" />
                            </div>
                        </div>
                        <div class="form-row-2">
                            <div class="form-row" style="margin: 0 0 12px">
                                <label class="form-label">Seats</label>
                                <input class="form-input" id="instSeats" placeholder="100" type="number" 
                                 v-model="addFromModel.licence_seats"/>
                            </div>
                            <div class="form-row" style="margin: 0 0 12px">
                                <label class="form-label">Annual Contract Value</label>
                                <div style="display: flex; align-items: center">
                                    <span style="
                                            background: var(--surface);
                                            border: 1.5px solid var(--border);
                                            border-right: none;
                                            border-radius: var(--r-sm) 0 0 var(--r-sm);
                                            padding: 9px 10px;
                                            font-size: 0.88rem;
                                            color: var(--ink-dim);
                                        " >$</span>
                                    <input class="form-input"
                                        id="instACV"
                                        placeholder="8400"
                                        style="border-radius: 0 var(--r-sm) var(--r-sm) 0"
                                        type="number"
                                     v-model="addFromModel.licence_annual_contract_value"/>
                                </div>
                            </div>
                        </div>

                        <!-- ── Team caps ──────────────────────────────────────────────
                             The sanctioned way past the 3-admin / 10-professor limit.
                             InstitutionTeam enforces these from BOTH doorways (here and
                             the institute portal), with no bypass — so when a school
                             genuinely needs a 4th admin, support raises the NUMBER
                             rather than stepping around the rule. Until now these
                             columns existed with no UI at all, which meant hand-written
                             SQL. -->
                        <div class="form-row-2">
                            <div class="form-row" style="margin: 0 0 12px">
                                <label class="form-label">Max Admins</label>
                                <input class="form-input" type="number" min="1" placeholder="3"
                                 v-model="addFromModel.max_admins"/>
                                <div class="inst-hint">How many institution admins this school may have. Default 3.</div>
                            </div>
                            <div class="form-row" style="margin: 0 0 12px">
                                <label class="form-label">Max Professors</label>
                                <input class="form-input" type="number" min="0" placeholder="10"
                                 v-model="addFromModel.max_professors"/>
                                <div class="inst-hint">How many professors this school may have. Default 10.</div>
                            </div>
                        </div>

                        <!-- ── Session timeout ────────────────────────────────────────
                             Same stored value the institution's own Settings page reads
                             and writes, so the two screens can't disagree. -->
                        <div class="form-row" style="margin: 0 0 12px">
                            <label class="form-label">Session Timeout</label>
                            <select class="form-input form-select" v-model="addFromModel.session_timeout">
                                <!-- '' is "inherit", NOT "never". Keeping them apart is why
                                     the stored value can legitimately be an empty string. -->
                                <option value="">Use platform default</option>
                                <option value="30min">30 minutes</option>
                                <option value="1hour">1 hour</option>
                                <option value="4hour">4 hours</option>
                                <option value="24hour">24 hours</option>
                                <option value="never">Never</option>
                            </select>
                            <div class="inst-hint">
                                Sign users out after this long with no activity — clicking or typing
                                resets the clock.
                                <template v-if="addFromModel.session_timeout === ''">
                                    Currently inheriting <strong>{{ effectiveTimeoutLabel }}</strong>
                                    from Settings&nbsp;→&nbsp;Security.
                                </template>
                                <template v-else>
                                    This overrides the platform default for this institution only.
                                </template>
                            </div>
                        </div>

                        <div class="form-row">
                            <label class="form-label">Exams / Products Covered</label>
                            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-top: 4px">
                                <label style="display: flex; align-items: center; gap: 6px; font-size: 0.82rem; cursor: pointer"
                                v-for="(vl, i) in getExamDataList" :key="i">
                                <input style="accent-color: var(--teal)" type="checkbox" 
                                :checked="selectedExam.includes(vl.id)"
                                @change="toggleSelectExam(vl.id)"/>
                                {{vl?.name??""}}
                                </label>
                            </div>
                        </div>

                        <div class="form-row" style="margin-top: 12px">
                            <label class="form-label">Access Method</label>
                            <select class="form-input form-select" name="instAccess"
                            v-model="addFromModel.licence_access_method">
                                <option value="email-domain-whitelist">Email domain whitelist</option>
                                <option value="ip-range">IP range</option>
                                <option value="sso-saml">SSO / SAML</option>
                                <option value="invite-codes">Invite codes</option>
                                <option value="manual-seat-assignment">Manual seat assignment</option>
                            </select>
                        </div>

                        <!-- The code was always generated and stored, but nothing on this
                             screen ever showed it, so an admin who picked "Invite codes"
                             had nothing to share. Surface it here, next to the choice that
                             makes it relevant. -->
                        <div v-if="addFromModel.licence_access_method === 'invite-codes'"
                          class="form-row"
                          style="margin-top:12px;padding:12px 13px;border:1.5px solid var(--border);border-radius:var(--r-sm);background:var(--bg-soft, #f8fafc)">
                            <label class="form-label">Invite Code</label>

                            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                              <code style="flex:1;min-width:150px;padding:9px 11px;background:#fff;border:1.5px solid var(--border);border-radius:var(--r-sm);font-size:0.95rem;font-weight:700;letter-spacing:0.06em;color:var(--ink)">
                                {{ inviteCode || '—' }}
                              </code>

                              <button type="button" class="btn btn-secondary"
                                :disabled="!inviteCode"
                                @click="copyInviteCode"
                                style="white-space:nowrap">
                                {{ inviteCopied ? '✓ Copied' : 'Copy' }}
                              </button>

                              <button type="button" class="btn btn-secondary"
                                :disabled="!inviteCode || inviteBusy"
                                @click="regenerateInviteCode"
                                style="white-space:nowrap">
                                {{ inviteBusy ? 'Working…' : 'Regenerate' }}
                              </button>
                            </div>

                            <div style="font-size:0.72rem;color:var(--ink-dim);margin-top:8px;line-height:1.5">
                              Students enter this code at sign-up to join this institution.
                              <strong>Regenerating invalidates the current code</strong> — anyone
                              who already has it will no longer be able to join.
                            </div>
                        </div>
                        <div class="form-row">
                            <label class="form-label">Email Domain(s)
                                <span style="
                                        font-weight: 400;
                                        text-transform: none;
                                        letter-spacing: 0;
                                        font-size: 0.72rem;
                                        color: var(--ink-dim);
                                    " >(for domain whitelist)</span>
                                    </label>
                            <input class="form-input"
                                id="instDomain"
                                placeholder="med.stanford.edu, stanford.edu"
                                type="text" 
                                v-model="addFromModel.licence_email_domain"/>
                        </div>
                        <div class="form-row">
                            <label class="form-label">Auto-renew</label>
                            <select class="form-input form-select" style="max-width: 220px"
                            v-model="addFromModel.licence_auto_renew">
                                <option value="1">Yes — auto-renew annually</option>
                                <option value="0">No — manual renewal required</option>
                            </select>
                        </div>
                    </div>

                    <!-- Users tab -->
                    <div v-if="activeInstTab === 'users'"
                     class="tab-content active" id="itabed-content-users">
                      
                        <!-- ADMINS PANE -->
                        <div class="instUserPane-admins" 
                            >
                             <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px"
                            >
                            <div class="card-title">
                               Manage Institution Admins
                            </div>

                             <div class="card-title">
                                <button class="btn btn-primary btn-sm"
                                 type="button"
                                 @click="onClickOpenUser"
                                 >
                                    + Add Admin
                                </button>
                            </div>
                            </div>

                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px"
                            >
                                <div style="font-size: 0.82rem; color: var(--ink-mid)">
                                    <span style="font-weight: 700; color: var(--ink)">
                                        {{getUsersDataList.length}}
                                    </span> admin users assigned
                                </div>
                                <div style="display:flex;gap:8px;align-items:center">
                                        <input class="filter-input"
                                         placeholder="search..." 
                                        style="font-size:0.78rem;padding:5px 10px" 
                                        type="text"
                                        v-model="filterUserSearch"
                                        />
                                </div>
                            </div>

                            <!-- Admins list -->
                            <div style="background: var(--surface);border: 1.5px solid var(--border);
                                    border-radius: var(--r-sm);margin-bottom: 16px;">
                                
                                <table class="usrsInstttnstble">
                                    <thead>
                                        <tr>
                                            <th style="padding: 8px 12px; text-align: left; font-weight: 700">Name</th>
                                            <th style="padding: 8px 12px; text-align: left; font-weight: 700">Email</th>
                                            <th style="padding: 8px 12px; text-align: left; font-weight: 700">Role</th>
                                            <th style="padding: 8px 12px; text-align: left; font-weight: 700">Added</th>
                                            <th style="padding: 8px 12px">Action</th>
                                        </tr>
                                    </thead>

                                    <tbody id="instAdminsList">
                                        <tr v-if="usersLoading || getUsersDataList.length === 0">
                                        <td  v-if="!usersLoading && getUsersDataList.length === 0"
                                        class="text-center" colspan="15">
                                            <Empty/>
                                        </td>
                                        <td v-else colspan="15">
                                            <Loader_small />
                                        </td>
                                    </tr>
                                    <tr style="border-top: 1px solid var(--border)" 
                                    v-for="(vl, i) in getUsersDataList" :key="i">
                                    <td style="padding: 10px 12px;font-size: 0.85rem;font-weight: 600;color: var(--ink);">
                                           {{ vl.name??"" }}
                                    </td>
                                        <td style="padding: 10px 12px;font-size: 0.75rem;color: var(--ink-dim);">
                                            {{ vl.email??"" }}
                                        </td>
                                        <td style="padding: 10px 12px">
                                            <span class="spnarls">
                                            {{ vl.role_name??"" }}
                                            </span>
                                        </td>
                                        <td style="padding: 10px 12px; font-size: 0.75rem; color: var(--ink-dim)">
                                           {{ vl.created_at??"" }}
                                        </td>
                                        <td style="padding: 10px 12px; white-space: nowrap">
                                            <button class="btn btn-outline btn-sm"
                                                style="padding: 2px 8px; font-size: 0.68rem; margin-right: 4px"
                                                type="button"
                                                :disabled="viewingAsId === (vl.id ?? vl.user_id)"
                                                @click="viewAsInstitution(vl)">
                                                {{ viewingAsId === (vl.id ?? vl.user_id) ? 'Opening…' : 'View as' }}
                                            </button>
                                            <button class="btn btn-outline btn-sm"
                                                style="padding: 2px 8px; font-size: 0.68rem; margin-right: 4px"
                                                type="button"
                                                @click="userEdit(vl)">
                                                Edit
                                            </button>
                                            <button class="btn btn-danger btn-sm"
                                                style="padding: 2px 8px; font-size: 0.68rem"
                                                type="button"
                                                 @click="confirmUserDelete(vl.id)"
                                            >
                                                Remove
                                            </button>
                                        </td>
                                    </tr>
                                    </tbody>
                                </table>
                            </div>

                            <!-- PAGINATION -->
                            <Pagination
                            v-model:page="userCurntPage"
                            :totalData="totalUserData" 
                            :totalPages="totalUsersPages"
                            />
                            <br />
                            <div style="
                                    background: rgba(8, 145, 178, 0.05);
                                    border: 1.5px solid rgba(8, 145, 178, 0.15);
                                    border-radius: var(--r-sm);
                                    padding: 12px 14px;
                                    font-size: 0.78rem;
                                    color: var(--ink-dim);
                                ">
                                <strong style="color: var(--ink)">Institution Admin</strong>
                                 can manage users, view all
                                analytics, and update licence details.
                                 <strong style="color: var(--ink)"> Professor</strong> can
                                view student progress and assign question sets but cannot manage the licence.
                            </div>
                        </div>
                    </div>
                  
                    <!-- Billing tab -->
                    <div v-if="activeInstTab === 'billing'"
                    class="tab-content active" id="itabed-content-billing">
                        <div class="tabtitlewrapbilling">
                            <div
                                style="
                                    background: var(--surface);
                                    border: 1.5px solid var(--border);
                                    border-radius: var(--r-sm);
                                    padding: 14px;
                                "
                            >
                                <div
                                    style="
                                        font-size: 0.65rem;
                                        font-weight: 800;
                                        text-transform: uppercase;
                                        letter-spacing: 1.5px;
                                        color: var(--ink-dim);
                                        margin-bottom: 6px;
                                    "
                                >
                                    Annual Contract Value
                                </div>
                                <div style="font-size: 1.6rem; font-weight: 800; color: var(--ink)">
                                ${{addFromModel.licence_annual_contract_value??'0' }}
                                </div>
                            </div>

                            <div class="hide" style="
                                    background: var(--surface);
                                    border: 1.5px solid var(--border);
                                    border-radius: var(--r-sm);
                                    padding: 14px;
                                ">
                                <div style="
                                        font-size: 0.65rem;
                                        font-weight: 800;
                                        text-transform: uppercase;
                                        letter-spacing: 1.5px;
                                        color: var(--ink-dim);
                                        margin-bottom: 6px;
                                    "
                                >
                                    Payment Status
                                </div>
                                <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px">
                                    <span class="badge badge-green">Paid</span
                                    ><span style="font-size: 0.8rem; color: var(--ink-dim)">Invoice #2024-0041</span>
                                </div>
                            </div>

                        </div>

                        <div class="twocol" style="margin: 16px 0">
                            <div class="card" style="padding: 16px">
                                <div class="card-title" style="margin-bottom: 12px">Billing Contacts</div>
                                <div class="stack-sm">
                                    <div class="detail-item">
                                        <div class="detail-item-label">Finance Contact</div>
                                        <div class="detail-item-val">
                                           <input class="form-input" name="financee_name"
                                                placeholder="Enter finance contact name"
                                                type="text"
                                                v-model="addFromModel.financee_name"
                                            />
                                        </div>
                                    </div>
                                    <div class="detail-item">
                                        <div class="detail-item-label">Invoice Email</div>
                                        <div class="detail-item-val">
                                           <input class="form-input" name="invoice_email"
                                                placeholder="Enter invoice email"
                                                type="email"
                                                v-model="addFromModel.invoice_email"
                                            />
                                        </div>
                                    </div>
                                    <div class="detail-item">
                                        <div class="detail-item-label">PO Number</div>
                                        <div class="detail-item-val">
                                            <input class="form-input" name="ponumber"
                                                placeholder="Enter po number"
                                                type="text"
                                                v-model="addFromModel.po_number"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                <div class="form-row">
                    <label class="form-label">Status</label>
                    <select class="form-input form-select" name="instStatus" 
                    v-model="addFromModel.licence_status">
                        <option value="1">Active</option>
                        <option value="0">Draft</option>
                        <option value="2">Pending</option>
                        <option value="3">Expired</option>
                        <option value="4">Suspended</option>
                    </select>
                </div>

                  <div style="display: flex;gap: 8px;margin-top: 33px;margin-bottom:25px;" class="bottomwrapbtn">
                      <button class="btn btn-primary instSubmitBtn" 
                      style="flex:1"
                      type="button"
                       @click="submitForm" >
                        Save Changes
                      </button>

                      <button class="btn btn-outline"  
                      type="button"
                      @click="closeModal">
                      Cancel
                    </button>
                  </div>

              </div>
        </div>
    </div>

    <AssignInstitutionUser
    v-model="showAddUserModal" 
    @saved="savedCallBack"
    :detailId="detailId"
    />

    <AssignEditInstitutionUser
    v-model="showEditUserModal" 
    @saved="savedCallBack"
    :detailId="detailId"
    :detail="userDetail"
    />

</template>

<style scoped>
/* Explanatory line under a field. These settings are enforced server-side and are
   not self-evident from the label alone — "Max Admins" reads like a display cap
   rather than a hard limit somebody will hit and ring support about. */
.inst-hint {
  font-size: 0.68rem;
  color: var(--ink-dim);
  margin-top: 5px;
  line-height: 1.45;
}
</style>