<script setup lang="ts">
import Loading from '@/components/loaders/Loading.vue'

import { ref, onMounted,reactive, watch, computed } from 'vue'
// Country list (shared with the user onboarding modals).
import { COUNTRIES, DEFAULT_COUNTRY } from '@/data/onboarding'

const props = defineProps({
  modelValue: Boolean 
});

const emit = defineEmits(["update:modelValue", "saved"]);

const { $toast,$api,$confirm } = useNuxtApp()


//Close modal
const closeModal = () => {
  emit("update:modelValue", false);
};

const fullLoading=ref<boolean>(false);
/**
 *  set Tab
**/
const activeInstTab = ref('details');
const setInstTab =(tab:string) => {
  activeInstTab.value = tab;
}

const addFromModel = reactive<any>({
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
  licence_exams_ids:[],
  licence_access_method:'email-domain-whitelist',
  licence_email_domain:'',  // only enter email or like med.stanford.edu, stanford.edu
  licence_auto_renew:'0', 
  licence_status: "1", 
  financee_name: "", 
  invoice_email: "", 
  po_number: "PO-2026-1148",
});

// Today's date (YYYY-MM-DD) — used as the min for licence date pickers so past dates can't be picked.
const todayStr = new Date().toISOString().split('T')[0]

// Auto-fill licence end date = start date + 1 year whenever start date changes.
watch(() => addFromModel.licence_start_date, (val) => {
  if (val && !isNaN(Date.parse(val))) {
    const d = new Date(val)
    d.setFullYear(d.getFullYear() + 1)
    addFromModel.licence_end_date = d.toISOString().split('T')[0]
  }
})


// Reset form
const resetForm = () => {
  Object.assign(addFromModel, {
    institution_name: "",
    institution_type: "medical-school",
    institution_country: DEFAULT_COUNTRY,
    institution_city: "",
    institution_state: "",
    primarycontact_name: "",
    primarycontact_email: "",
    institution_notes: "",
    licence_start_date: "",
    licence_end_date: "",
    licence_seats: "0",
    licence_annual_contract_value: "0",
    licence_exams_ids: [] as number[],
    licence_access_method:'email-domain-whitelist',
    licence_email_domain:'',
    licence_auto_renew:'0',
    licence_status: "1",
    financee_name: "",
    invoice_email: "",
    po_number: "PO-2026-1148",
  });
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

// Changing country invalidates the state + city picked for the old one.
watch(() => addFromModel.institution_country, () => {
  addFromModel.institution_state = ''
  addFromModel.institution_city = ''
})
// Changing state invalidates the city picked under the old state.
watch(() => addFromModel.institution_state, () => { addFromModel.institution_city = '' })

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
  // countries without a list), so the old "no numbers" checks are dropped —
  // some valid place names legitimately contain digits.

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
  addFromModel.licence_exams_ids=selectedExam.value;

   // VALIDATION CALL
    if (!validateForm()){
        return;
    }

   fullLoading.value=true;

  try {

    const res:any =await $api.post("/institutions/add",addFromModel);

    if (res.data.status === "success") {
        $toast("Add user successfully");
        emit("saved", true);
        resetForm();
        closeModal();
    }else{
      const message = res?.data?.msg || 'Failed to saved.'
      $toast(message,'error');
    }


  } catch (err:any) {
    const message = err?.response?.data?.msg ||err?.response?.data?.message || 'Failed to saved.'
    $toast(message,'error');

  } finally {
     fullLoading.value=false;
  }
};


/**
 * fetch data exam list start 
 **/
const examLoading = ref(false)
const getExamDataList = ref<any[]>([])
const fetchExams = async () => {
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

const selectedExam = ref<number[]>([]);
const toggleSelectExam = (id:number) => {
  if (selectedExam.value.includes(id)) {
    selectedExam.value = selectedExam.value.filter((i:any) => i !== id)
  } else {
    selectedExam.value.push(id)
  }
}
/** fetch data exam list end  **/


onMounted(() => {
    selectedExam.value=[];
    loadGeo();
    if(props.modelValue){
        fetchExams();
    }
});

</script>

<template>
  <Loading v-if="fullLoading"/>

    <div v-if="modelValue"
    class="overlay open"  
    @click.self="closeModal">

        <div class="drawer" style="width:700px;max-width:97vw">
            <div class="drawer-header">
            <div>
                <div style="font-size:0.65rem;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:var(--ink-dim);margin-bottom:6px">
                   New Licence
                </div>
                 <div  class="instEditorTitle">
                    New Institution
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
                                <p class="form-hint" style="font-size:0.72rem;color:var(--ink-dim,#64748b);margin-top:5px;line-height:1.4;">
                                    Note: if a Primary Contact Email is provided, a licence-admin account is
                                    created for it by default and an invite (set-password) email is sent.
                                </p>
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
                                :min="todayStr"
                                v-model="addFromModel.licence_start_date"/>
                            </div>
                            <div class="form-row" style="margin: 0 0 12px">
                                <label class="form-label">Licence End</label>
                                <input class="form-input" name="instLicEnd" type="date"
                                 :min="addFromModel.licence_start_date || todayStr"
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

                        <!-- The code is minted by the backend on insert, so there is
                             nothing to show yet — say where it will appear instead of
                             leaving the admin hunting for it. -->
                        <div v-if="addFromModel.licence_access_method === 'invite-codes'"
                          style="margin-top:8px;padding:9px 11px;border:1.5px solid var(--border);border-radius:var(--r-sm);font-size:0.72rem;color:var(--ink-dim);line-height:1.5">
                          An invite code will be generated automatically when you save. You'll
                          find it under <strong>Edit → Licence</strong>, and in the Invite Code
                          column of the institutions list.
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


                    <!-- Billing tab -->
                    <div v-if="activeInstTab === 'billing'"
                    class="tab-content active" id="itabed-content-billing">
                        <div class="tabtitlewrapbilling">
                            <div style="
                                    background: var(--surface);
                                    border: 1.5px solid var(--border);
                                    border-radius: var(--r-sm);
                                    padding: 14px;">
                                <div
                                    style=" font-size: 0.65rem;
                                        font-weight: 800;
                                        text-transform: uppercase;
                                        letter-spacing: 1.5px;
                                        color: var(--ink-dim);
                                        margin-bottom: 6px;">
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
                                                placeholder="PO-2026-1148"
                                                type="text"
                                                v-model="addFromModel.po_number"
                                            />
                                           
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="card hide" style="padding: 16px">
                                <div class="card-title" style="margin-bottom: 12px">SSO / Roster Sync</div>
                                <div class="stack-sm">
                                    <div class="detail-item">
                                        <div class="detail-item-label">SSO</div>
                                        <div class="detail-item-val">
                                            <span class="badge badge-green">Healthy</span> SAML active
                                        </div>
                                    </div>
                                    <div class="detail-item">
                                        <div class="detail-item-label">Roster Sync</div>
                                        <div class="detail-item-val">
                                            <span class="badge badge-green">Success</span> Last sync: Mar 15
                                        </div>
                                    </div>
                                    <div class="detail-item">
                                        <div class="detail-item-label">Invite Failures</div>
                                        <div class="detail-item-val">
                                            <span class="badge badge-amber">3 pending fixes</span>
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
                        Submit
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

</template>