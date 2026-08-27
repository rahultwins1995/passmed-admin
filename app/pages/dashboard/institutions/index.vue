<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

import { ref, onMounted, computed } from 'vue'
import Pagination from '@/components/Pagination.vue'
import Loader_small from '@/components/loaders/Loader_small.vue'
import Empty from '@/components/loaders/Empty.vue'
import AddInstitutionModal from '@/components/institutions/AddInstitutionModal.vue'
import EditInstitutionModal from '@/components/institutions/EditInstitutionModal.vue'


const { $api, $toast,$confirm } = useNuxtApp()
const fullNewLoading=ref<boolean>(false);


/*
* Add Model
*/
const showAddModal = ref(false)
const onClickAddModal = () => {
    showAddModal.value = true;
}
/* * Add Model END*/

/*
* Edit Model
*/
const detailsId=ref<any>('0');
const showEditModal = ref(false)
const onClickEditModal = (id:any="0") => {
    detailsId.value=id;
    showEditModal.value = true;
}
/* * Edit Model END*/

/*
* Edit Model
*/
// Same status mapping as the table badge (5-way, Number-safe).
const licenceStatusLabel = (s: any) => {
  const n = Number(s)
  return n === 1 ? 'Active'
    : n === 2 ? 'Pending'
    : n === 3 ? 'Expired'
    : n === 4 ? 'Suspended'
    : 'Draft'
}

const onClickExport = () => {

if (!getDataList.value.length) {
    $toast('No data to export', 'error');
    return;
  }

  const headers = [
    'Institution',
    'Type',
    'City',
    'State',
    'Email',
    'Seats',
    'ACV',
    'Start Date',
    'End Date',
    'Status'
  ];

  const rows = getDataList.value.map((vl: any) => [
    vl.institution_name,
    vl.institution_type,
    vl.institution_city,
    vl.institution_state,
    vl.primarycontact_email,
    vl.licence_seats,
    vl.licence_annual_contract_value,
    vl.licence_start_date,
    vl.licence_end_date,
    licenceStatusLabel(vl.licence_status),
  ]);

  // CSV cell writer: escape embedded quotes ("→"") AND neutralize formula injection.
  // A cell starting with = + - @ (or tab / CR) is executed as a formula by Excel /
  // Sheets, so a value like `=cmd|...` would run on open — prefix a leading apostrophe
  // to force literal text. Harmless scalars (a lone dash, plain / currency numbers)
  // are left untouched so normal cells don't get an ugly leading apostrophe.
  const csvCell = (v:any) => {
    let s = String(v ?? '')
    const dangerous = /^[=+\-@\t\r]/.test(s)
    const harmless  = s === '-' || /^[-+]?[\d.,$£₱%\s]+$/.test(s)
    if (dangerous && !harmless) { s = "'" + s }
    return `"${s.replace(/"/g, '""')}"`
  }

  let csvContent =
    "data:text/csv;charset=utf-8," +
    [headers, ...rows]
      .map(e => e.map(csvCell).join(","))
      .join("\n");

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "institutions.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
/* * Edit Model END*/


/*
* Delete DATA
*/
const confirmDelete= async (id="0")=>{
         const confirmed = await $confirm('Are you sure you want to remove this item?')
    if (confirmed) {
            addDelete(id)
    }
}
const addDelete = async (id="0") => {
    
    if(!id || id == '0'){
         $toast('Deletion failed','error');
        return;
    }   

  fullNewLoading.value = true

  try {
    const res:any = await $api.delete("/institutions/delete/"+id)
    const obj:any = res.data;
    if (obj.status === 'success') {
          const message = res?.data?.msg || 'Deleted successfully.';
            $toast(message);
            fetchData()
    }else{
     const message = res?.data?.msg || 'Deletion failed';
      $toast(message,'error');
    } 

  } catch (err:any) {
   
      const message = err?.response?.data?.msg || err?.response?.data?.message || 'Deletion failed.';
     $toast(message,'error');

  }finally{
    fullNewLoading.value=false;
  }
}
/* * Delete DATA */


/*
* filter 
*/

const filter_search=ref<any>('');
const filter_type=ref<any>('all');
const filter_status=ref<any>('all');
const search_mode=ref<string>('search');
    let debounceTimer: any;
watch(
  [filter_search, filter_type, filter_status],
  ([search]) => {

    if (search && search.trim() !== '') {
      search_mode.value = 'search';
      filter_type.value = 'all';
      filter_status.value = 'all';
    } else {
      search_mode.value = 'filter';
    }
    
   debounceFetch();
})

const debounceFetch = () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    pageCurnt.value = 1;
    fetchData();
  }, 400);
};

/*
* FETCH DATA
*/
const data_loading = ref(false)
const pageCurnt = ref(1)
const totalPages = ref(1)

const data_page_current = ref(1)
const total_data = ref(0)
const limit_data = ref(10)

const getDataList = ref<any[]>([])
const fetchData = async () => {
  data_loading.value = true

  try {
    const res:any = await $api.post("/institutions", {
      search: filter_search.value,
      status: filter_status.value,
      type: filter_type.value,
      page: data_page_current.value,
      limit: limit_data.value
    })
    const obj:any = res.data;

    if (obj.status === 'success') {

      total_data.value = obj.total
      totalPages.value = Math.ceil(obj.total / obj.limit)
      pageCurnt.value = obj.current_page

      //  transform data
      const dataList= obj.data||[];
      getDataList.value = dataList;

    } else {
      getDataList.value = []
      total_data.value = 0
    }

  } catch (err) {
    
    getDataList.value = []
    total_data.value = 0
  } finally {
    data_loading.value = false
  }
}
watch(pageCurnt, (newPage) => {
  data_page_current.value = newPage
  fetchData()
})
/* * FETCH DATA END */


/**
 *  Sorting
 */
const sortKey = ref<string>('')
const sortOrder = ref<'asc' | 'desc'>('asc')

const sortBy = (key: string) => {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortOrder.value = 'asc'
  }
}

const sortedDataList = computed(() => {
  if (!sortKey.value) return getDataList.value

  return [...getDataList.value].sort((a, b) => {
    let valA = a[sortKey.value] ?? ''
    let valB = b[sortKey.value] ?? ''

    // number check
    if (!isNaN(valA) && !isNaN(valB)) {
      valA = Number(valA)
      valB = Number(valB)
    } else {
      valA = String(valA).toLowerCase()
      valB = String(valB).toLowerCase()
    }

    if (valA < valB) return sortOrder.value === 'asc' ? -1 : 1
    if (valA > valB) return sortOrder.value === 'asc' ? 1 : -1
    return 0
  })
})

/* * Sorting END */


/**
 *  FETCH count
 */
const total_active_licence=ref<any>('0');
const total_active_licence_percent=ref<any>('0');
const total_active_licence_short=ref<any>('0');

const total_annual_contract_value=ref<any>('0');
const total_annual_contract_value_short=ref<any>('0');
const total_annual_contract_value_percent=ref<any>('0');

const total_licensed_seats_short=ref<any>('0');

const total_renewing_month_short=ref<any>('0');
const total_renewing_month_soon=ref<any>('0');

const fetchAllCountData = async () => {
  try {
    const res:any = await $api.get("/institutions/counts")
    const obj:any = res.data
    if (obj.status === 'success') {

        total_active_licence.value =obj.total_active_licence
        total_active_licence_percent.value =obj.total_active_licence_percent
        total_active_licence_short.value =obj.total_active_licence_short
      
        total_renewing_month_short.value =obj.total_renewing_month_short
        total_renewing_month_soon.value =obj.total_renewing_month_soon
       
        total_annual_contract_value.value =obj.total_annual_contract_value
        total_annual_contract_value_short.value =obj.total_annual_contract_value_short
        total_annual_contract_value_percent.value =obj.total_annual_contract_value_percent

        total_licensed_seats_short.value =obj.total_licensed_seats_short

    }else{
        total_active_licence.value =0
        total_active_licence_percent.value =0
        total_active_licence_short.value =0

        total_renewing_month_short.value =0
        total_renewing_month_soon.value =0

        total_annual_contract_value.value =0
        total_annual_contract_value_short.value =0
        total_annual_contract_value_percent.value =0
        total_licensed_seats_short.value =0
    }
      
  } catch (err) {
   
        total_active_licence.value =0
        total_active_licence_percent.value =0
        total_active_licence_short.value =0

        total_renewing_month_short.value =0
        total_renewing_month_soon.value =0

        total_annual_contract_value.value =0
        total_annual_contract_value_short.value =0
        total_annual_contract_value_percent.value =0
        total_licensed_seats_short.value =0
  }
}
/* * FETCH count END */


/**
 * triger back function
 */
const callbackSaved =async() => {
    fetchAllCountData();
     await fetchData()
}

/* * FETCH DATA END */
onMounted(() => {
  fetchAllCountData()
})

onMounted(() => {
  fetchData()
})

const formatExamBundle = (exams:any = []) => {
    if(!exams || exams.length===0){
        return "";
    }

    return exams
    .map((e: string) => `<span class="tdexm">${e}</span>`)
    .join(" ");
};

</script>

<template>
<div class="dashwrap">
    <div class="section-hdr">
        <div class="section-hdr-left">
            <p>{{ total_active_licence }} active licences · ${{ total_annual_contract_value }}  total annual contract value</p>
        </div>
        <div class="section-hdr-right">
            <button class="btn btn-primary btn-sm" 
            type="button" 
            @click="onClickAddModal">
            <svg fill="none" height="13" stroke="currentColor" stroke-linecap="round"
             stroke-width="2.5" viewBox="0 0 24 24" width="13">
             <line x1="12" x2="12" y1="5" y2="19"></line>
             <line x1="5" x2="19" y1="12" y2="12"></line>
            </svg>
            New Licence
          </button>
        </div>
    </div>
    <!-- KPI row -->
    <div class="stats-row" style="grid-template-columns:repeat(4,1fr);margin-bottom:20px">
        <div class="stat-card">
            <div class="stat-card-top">
                <div class="stat-icon teal">
                    <svg fill="none" height="14" stroke="currentColor" stroke-linecap="round" 
                    stroke-width="2.5" viewBox="0 0 24 24" width="14">
                    <rect height="14" rx="2" width="20" x="2" y="7"></rect>
                    <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"></path>
                </svg>
                </div>
                <span class="stat-delta up">{{ total_active_licence_percent  }}</span>
            </div>
            <div class="stat-num">{{ total_active_licence_short }}</div>
            <div class="stat-label">Active Licences</div>
        </div>
        <div class="stat-card">
            <div class="stat-card-top">
                <div class="stat-icon amber">
                    <svg fill="none" height="14" stroke="currentColor" stroke-linecap="round" 
                    stroke-width="2.5" viewBox="0 0 24 24" width="14">
                    <line x1="12" x2="12" y1="1" y2="23"></line>
                    <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"></path>
                    </svg>
                </div>
                <span class="stat-delta up">
                    {{ total_annual_contract_value_percent }}
                </span>
            </div>
            <div class="stat-num">${{ total_annual_contract_value_short }}</div>
            <div class="stat-label">Annual Contract Value</div>
        </div>
        <div class="stat-card">
            <div class="stat-card-top">
                <div class="stat-icon green">
                    <svg fill="none" height="14" stroke="currentColor" stroke-linecap="round" 
                    stroke-width="2.5" viewBox="0 0 24 24" width="14">
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 00-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 010 7.75"></path>
                    </svg>
                </div>
            </div>
            <div class="stat-num">{{ total_licensed_seats_short }}</div>
            <div class="stat-label">Licensed Seats</div>
        </div>
        <div class="stat-card">
            <div class="stat-card-top">
                <div class="stat-icon amber">
                    <svg fill="none" height="14" stroke="currentColor" stroke-linecap="round"
                    stroke-width="2.5" viewBox="0 0 24 24" width="14">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                </div>

                <span class="stat-delta down"
                style="color:var(--red)">
                {{ total_renewing_month_soon }} soon
                </span>
            </div>

            <div class="stat-num">{{ total_renewing_month_short }}</div>
            <div class="stat-label">Renewing This Month</div>
        </div>
    </div>

    <!-- Filter bar -->
    <div class="filter-bar" style="margin-bottom:16px">

        <input class="filter-input" id="instSearch" 
        placeholder="Search institutions..." type="text"
        v-model="filter_search"
        />

        <select class="filter-input filter-select form-select" id="instTypeFilter" 
        v-model="filter_type" >
        <option value="all">All Types</option>
        <option value="medical-school">Medical School</option>
        <option value="residency-program">Residency Program</option>
        <option value="health-system">Health System</option>
        <option value="government-va">Government / VA</option>
        <option value="international">International</option>
        <option value="other">Other</option>
        </select>

        <select class="filter-input filter-select form-select" id="instStatusFilter"
        v-model="filter_status">
        <option value="all">All Statuses</option>
        <option value="1">Active</option>
        <option value="0">Draft</option>
        <option value="5">Expiring Soon</option>
        <option value="2">Pending</option>
        <option value="3">Expired</option>
        <option value="4">Suspended</option>
        </select>

        <button class="btn btn-outline btn-sm"
         type="button"
         @click="onClickExport"
         >
            <svg fill="none" height="12" stroke="currentColor" stroke-linecap="round" 
            stroke-width="2.5" viewBox="0 0 24 24" width="12">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" x2="12" y1="15" y2="3"></line>
            </svg>
            Export CSV
        </button>
    </div>
    <div id="instResultCount" style="font-size:0.78rem;color:var(--ink-dim);margin-bottom:10px">
        Showing {{ total_data }} institutions
    </div>
    <!-- Institutions table -->
    <div class="card">
        <div class="table-wrap">
            <table id="instTable">
                <thead>
                    <tr>
                        <th @click="sortBy('created_at')"
                        style="cursor:pointer;user-select:none"
                        :style="{ opacity: sortKey === 'created_at' ? 1 : 0.3 }" >
                            Created Date
                            <svg fill="none" height="10" stroke="currentColor" stroke-linecap="round"
                            stroke-width="2.5" viewBox="0 0 24 24" width="10" style="margin-left:4px;opacity:0.4">
                            <path d="M7 10l5-5 5 5M7 14l5 5 5-5"></path>
                            </svg>
                        </th>
                        <th @click="sortBy('institution_name')"
                        style="cursor:pointer;user-select:none"
                        :style="{ opacity: sortKey === 'institution_name' ? 1 : 0.3 }" >
                            Institution
                            <svg fill="none" height="10" stroke="currentColor" stroke-linecap="round" 
                            stroke-width="2.5" viewBox="0 0 24 24" width="10" style="margin-left:4px;opacity:0.4">
                            <path d="M7 10l5-5 5 5M7 14l5 5 5-5"></path>
                            </svg>
                        </th>
                        <th @click="sortBy('institution_type')" 
                         style="cursor:pointer;user-select:none"
                         :style="{ opacity: sortKey === 'institution_type' ? 1 : 0.3 }">
                            Type
                            <svg fill="none" height="10" stroke="currentColor" stroke-linecap="round" 
                            stroke-width="2.5" viewBox="0 0 24 24" width="10" style="margin-left:4px;opacity:0.4">
                            <path d="M7 10l5-5 5 5M7 14l5 5 5-5"></path>
                            </svg>
                        </th>
                        <th>Contact</th>
                        <th @click="sortBy('licence_seats')"
                         style="cursor:pointer;user-select:none"
                         :style="{ opacity: sortKey === 'licence_seats' ? 1 : 0.3 }">
                            Seats
                            <svg fill="none" height="10" stroke="currentColor" stroke-linecap="round" stroke-width="2.5" 
                            viewBox="0 0 24 24" width="10" style="margin-left:4px;opacity:0.4">
                            <path d="M7 10l5-5 5 5M7 14l5 5 5-5"></path>
                            </svg>
                        </th>
                        <th @click="sortBy('utilisation')" 
                        style="cursor:pointer;white-space:nowrap;user-select:none"
                        :style="{ opacity: sortKey === 'utilisation' ? 1 : 0.3 }">
                            Utilisation
                            <svg fill="none" height="10" stroke="currentColor"
                             stroke-linecap="round" stroke-width="2.5" viewBox="0 0 24 24" width="10" style="margin-left:4px;opacity:0.4">
                             <path d="M7 10l5-5 5 5M7 14l5 5 5-5"></path>
                            </svg>
                        </th>
                        <th>Exams Covered</th>
                        <th @click="sortBy('licence_annual_contract_value')"
                        style="cursor:pointer;user-select:none"
                        :style="{ opacity: sortKey === 'licence_annual_contract_value' ? 1 : 0.3 }">
                            ACV
                            <svg fill="none" height="10" stroke="currentColor" stroke-linecap="round" 
                            stroke-width="2.5" viewBox="0 0 24 24" width="10" style="margin-left:4px;opacity:0.4">
                            <path d="M7 10l5-5 5 5M7 14l5 5 5-5"></path>
                            </svg>
                        </th>
                        <th @click="sortBy('licence_status')" 
                         style="cursor:pointer;user-select:none"
                          :style="{ opacity: sortKey === 'licence_status' ? 1 : 0.3 }">
                            Licence <br/>Status
                            <svg fill="none" height="10" stroke="currentColor" stroke-linecap="round" 
                            stroke-width="2.5" viewBox="0 0 24 24" width="10" style="margin-left:4px;opacity:0.4">
                            <path d="M7 10l5-5 5 5M7 14l5 5 5-5"></path>
                            </svg>
                        </th>

                          <th @click="sortBy('invite_code')" 
                          style="cursor:pointer;user-select:none"
                           :style="{ opacity: sortKey === 'invite_code' ? 1 : 0.3 }">
                            Invite Code
                            <svg fill="none" height="10" stroke="currentColor" stroke-linecap="round" stroke-width="2.5" 
                            viewBox="0 0 24 24" width="10" style="margin-left:4px;opacity:0.4">
                                <path d="M7 10l5-5 5 5M7 14l5 5 5-5"></path>
                            </svg>
                        </th>
                        <th @click="sortBy('licence_start_date')"
                        style="cursor:pointer;user-select:none;white-space:nowrap"
                        :style="{ opacity: sortKey === 'licence_start_date' ? 1 : 0.3 }">
                            Start Date
                            <svg fill="none" height="10" stroke="currentColor" stroke-linecap="round" stroke-width="2.5"
                            viewBox="0 0 24 24" width="10" style="margin-left:4px;opacity:0.4">
                                <path d="M7 10l5-5 5 5M7 14l5 5 5-5"></path>
                            </svg>
                        </th>
                        <th @click="sortBy('licence_end_date')"
                        style="cursor:pointer;user-select:none;white-space:nowrap"
                        :style="{ opacity: sortKey === 'licence_end_date' ? 1 : 0.3 }">
                            Expiry Date
                            <svg fill="none" height="10" stroke="currentColor" stroke-linecap="round" stroke-width="2.5"
                            viewBox="0 0 24 24" width="10" style="margin-left:4px;opacity:0.4">
                                <path d="M7 10l5-5 5 5M7 14l5 5 5-5"></path>
                            </svg>
                        </th>
                        <th>Actions</th>
                    </tr>
                </thead>
                 <tbody v-if="data_loading || getDataList.length === 0">
                    <tr>
                        <td  v-if="!data_loading && getDataList.length === 0"
                        class="text-center" colspan="15">
                            <Empty/>
                        </td>
                        <td v-else colspan="15">
                            <Loader_small />
                        </td>
                    </tr>
                </tbody>
                <tbody v-else>
                    <tr v-for="(vl, i) in sortedDataList" :key="i">
                        <td style="white-space:nowrap">{{ vl.created_at ?? "-" }}</td>
                        <td class="td-main">
                            <div>{{ vl.institution_name??"" }}</div>
                            <div style="font-size:0.72rem;color:var(--ink-dim)">
                              {{ (vl.institution_city ? vl.institution_city + ', ' : '')}} {{ vl.institution_state ?? '' }}
                            </div>
                        </td>
                        <td>
                        <span class="badge badge-teal">
                            {{ vl.institution_type??"" }}
                        </span>
                        </td>
                        <td style="font-size:0.78rem;color:var(--ink-mid)">
                           {{ vl.primarycontact_email??"" }}
                        </td>
                        <td style="font-weight:700">
                            {{ vl.licence_seats??"0" }}
                        </td>
                       <td style="min-width:90px">
                            <div style="font-size:0.72rem;color:var(--ink-dim);margin-bottom:3px;">
                                {{ vl.utilisation ?? 0 }} / {{ vl.licence_seats ?? 0 }}
                            </div>
                            <div style="height:5px;background:var(--border);border-radius:99px;overflow:hidden;width:72px;">
                                <div :style="{
                                    height: '100%',
                                    width: (
                                        ((vl.utilisation ?? 0) / (vl.licence_seats || 1)) * 100
                                    ) + '%',
                                    background: 'var(--green)',
                                    borderRadius: '99px'}">
                                </div>
                            </div>
                        </td>
                        <td style="font-size:0.78rem">
                                {{ (vl.exams_name ?? []).join(',\n') }}                     
                        </td>
                        <td style="font-weight:700">
                            ${{ vl.licence_annual_contract_value??"0" }}
                        </td>
                        <td>
                            <span
                                :class="[
                                'badge',
                                    Number(vl.licence_status) === 1 ? 'badge-green' :
                                    Number(vl.licence_status) === 2 ? 'badge-grays' :
                                    Number(vl.licence_status) === 3 ? 'badge-amber' :
                                    Number(vl.licence_status) === 4 ? 'badge-red' :
                                    'badge-grays'
                                    ]"><span class="badge-dot"></span>
                                    {{
                                        Number(vl.licence_status) === 1 ? 'Active' :
                                        Number(vl.licence_status) === 2 ? 'Pending' :
                                        Number(vl.licence_status) === 3 ? 'Expired' :
                                        Number(vl.licence_status) === 4 ? 'Suspended' :
                                        'Draft'
                                        }}
                                    </span>
                            </td>
                        <td style="font-family:'JetBrains Mono',monospace;font-size:0.75rem;white-space:nowrap">
                            {{vl.invite_code??"-" }}
                        </td>

                        <td style="font-family:'JetBrains Mono',monospace;font-size:0.75rem;white-space:nowrap">
                            {{ vl.licence_start_date ?? "-" }}
                        </td>

                        <td style="font-family:'JetBrains Mono',monospace;font-size:0.75rem;white-space:nowrap">
                            {{ vl.licence_end_date ?? "-" }}
                        </td>

                        <td style="white-space:nowrap">
                            <button class="atTdbtn btn btn-outline btn-sm" style="margin-right:4px" 
                            type="button"
                            @click="onClickEditModal(vl.institution_id)">
                            Edit
                            </button>
                             <button class="atTdbtn btn btn-danger btn-sm"
                            @click="confirmDelete(vl.institution_id)"
                            type="button">
                                Delete
                            </button>
                            <NuxtLink 
                            :to="`/dashboard/institutions/${vl.institution_id}`"
                            class="btn btn-outline btn-sm" >
                            Students
                            </NuxtLink>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
        <br/>
          <!-- PAGINATION -->
            <Pagination
                v-model:page="pageCurnt"
                :totalData="total_data" 
                :totalPages="totalPages"
            />
    </div>
</div>

<!-- MODAL -->
<EditInstitutionModal v-if="showEditModal"
  v-model="showEditModal"
  @saved="callbackSaved"
  :detailId="detailsId"
/>

<!-- MODAL -->
<AddInstitutionModal v-if="showAddModal"
  v-model="showAddModal"
  @saved="callbackSaved"
/>
</template>
