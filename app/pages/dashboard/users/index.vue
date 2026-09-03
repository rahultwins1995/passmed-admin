<script setup lang="ts">
import Pagination from '@/components/Pagination.vue'
import AddUserModal from '@/components/users/AddUserModal.vue';
import Loader_small from '@/components/loaders/Loader_small.vue'
import Loading from '@/components/loaders/Loading.vue'
import Empty from '@/components/loaders/Empty.vue'
import { ref, onMounted, computed } from 'vue'
import Multiselect from '@vueform/multiselect'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

const { $api, $toast,$confirm } = useNuxtApp()
const selectedUsers = ref<number[]>([])

// ── "View as Student" (impersonation) ────────────────────────────────────────
// Mint a short-lived impersonation token, then hand the browser to the portal's
// cross-app enter endpoint (which sets the HttpOnly cookie for the portal domain
// and drops into /student). The admin's own admin-panel session is untouched.
// Row currently starting a view-as — drives the inline spinner (instant feedback).
const viewingAsId = ref<any>(null)
const viewAsStudent = async (u: any) => {
  const confirmed = await $confirm(`Open the student portal as ${u?.name || u?.email}? You'll see it exactly as they do.`)
  if (!confirmed) return
  viewingAsId.value = u.id
  try {
    const res: any = await $api.post('/impersonate', { user_id: u.id })
    const token    = res?.data?.token
    const enterUrl = res?.data?.enter_url   // portal-domain handoff endpoint (Primary Domain)
    if (res?.data?.status !== 'success' || !token || !enterUrl) {
      $toast(res?.data?.msg || 'Could not start impersonation.', 'error')
      return
    }
    // Hand the SHORT-LIVED token to the portal via a hidden form POST — token in the
    // BODY (never a URL), opened in a new tab. The portal exchanges it for a session.
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

// modal
const showModal = ref(false)

// column panel
const colPanel = ref(false)

const sortColumn = ref<string>('')
const sortDirection = ref<'asc' | 'desc'>('asc')

const showCols = ref({
  created_at: true,
  last_active: true,
  email: true,
  level: true,
  gradyr: true,
  medical_school: true,
  country: true,
  exam_date: true,
  inst: true,
  exam: true,
  plan: true,
  expiry: true,
  status: true,
  revenue: true
})

const columnLabels:any = {
  created_at: 'Signup Date',
  last_active: 'Last active',
  email: 'Email',
  level: 'Level',
  gradyr: 'Grad Year',
  medical_school: 'Medical School / Hospital',
  country: 'Country',
  exam_date: 'Exam Date',
  inst: 'Institution',
  exam: 'Exam',
  plan: 'Plan',
  expiry: 'Expires',
  status: 'Status',
  revenue: 'Revenue'
}

const onClickSortBy = (col: string) => {
  if (sortColumn.value === col) {
    // toggle
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortColumn.value = col
    sortDirection.value = 'asc'
  }
  // Sorting is server-side (the API orders the whole filtered set, not just the
  // rows on this page), so re-fetch from page 1 with the new sort.
  data_page_current.value = 1
  pageCurnt.value = 1
  fetchData()
}

// =========================
// seartch
// =========================

// filters
const input_search = ref('')
const filterExam = ref('all')
const plan = ref('all')
const status = ref('all')

// One label for a user's account state, used by the CSV export and the table badge.
// Login-state (2/3/0 → Pending/Blocked/Inactive) always wins first — it's the account
// gate. For an active (status 1) account the label reflects the SUBSCRIPTION, not the
// login: Free Trial (live trial) / Active (live paid) / Expired (no live subscription —
// lapsed OR never subscribed, e.g. migrated WordPress users). subscription_status comes
// from the API; is_trial is kept as a fallback so older API responses still label trials.
const statusLabel = (u:any):string => {
  switch (Number(u?.status)) {
    case 2: return 'Pending'
    case 3: return 'Blocked'
    case 0: return 'Inactive'
    default:
      if (u?.is_trial || u?.subscription_status === 'trial') return 'Free Trial'
      if (u?.subscription_status === 'institution') return 'Institution'
      if (u?.subscription_status === 'expired') return 'Expired'
      return 'Active'
  }
}

const seartchTriggerFetchMode=(mode:any='search')=>{

  if (mode === 'search') {
  plan.value = "all"
  filterExam.value = "all"
  status.value = "all"
  } else {
  input_search.value = ""
  }
  data_page_current.value = 1;
  pageCurnt.value = 1;
  fetchData();
}

let searchTimeout:any = null

watch(input_search, (val) => {
  // clear previous timeout
  if (searchTimeout) clearTimeout(searchTimeout)

  searchTimeout = setTimeout(() => {
     if(val.trim() !== ""){
       seartchTriggerFetchMode('search');
    }
  }, 800)
})

watch([filterExam, status,plan], () => {
    input_search.value = ""
    seartchTriggerFetchMode('filter');
})


// =========================
// end
// =========================

// =========================
// FETCH DATA
// =========================

const pageCurnt = ref(1)
const totalPages = ref(1)

const data_page_current = ref(1)
const total_data = ref(0)
const active_subscriptions = ref(0)
const active_users = ref(0)
const limit_data = ref(10)

const getDataList = ref<any[]>([])
const data_loading = ref(false)
const fetchData = async () => {
  data_loading.value = true

  try {
    const res:any = await $api.post("/users", {
      search: input_search.value || '',
      filter_exam: filterExam.value || '',
      filter_plan: plan.value || '',
      filter_status: status.value || '',
      sort_by: sortColumn.value || '',
      sort_dir: sortDirection.value || 'asc',
      page: data_page_current.value,
      limit: limit_data.value
    })

    const obj:any = res.data

    if (obj.status === 'success') {

      total_data.value = obj.total
      active_subscriptions.value = obj.active_subscriptions ?? 0
      active_users.value = obj.active_users ?? 0
      totalPages.value = Math.ceil(obj.total / obj.limit)
      pageCurnt.value = obj.current_page

      //  transform data
      getDataList.value = obj.data.map((u:any) => ({
        ...u,
        // Level = the onboarding audience (student / resident). role is always
        // 'student' at the auth level now, so it's no longer the display value.
        level: u.audience || u.role || '-',
        gradyr: u.grad_year || '-',
        inst: u.institution || '-',
        exam: u.exam_name || '-',
        plan: u.plan || '-',
        expiry: u.expiry_date || '-'
      }))

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

// Rows are already ordered by the API (server-side sort spans the whole filtered
// set, not just this page — a client-side sort could only reorder the visible 20).
// Kept as a pass-through so the template/selection logic below is unchanged.
const filteredUsers = computed(() => getDataList.value)
const isAllSelected = computed(() => {
  return filteredUsers.value.length > 0 &&
         filteredUsers.value.every(u => selectedUsers.value.includes(u.id))
})

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedUsers.value = []
  } else {
    selectedUsers.value = filteredUsers.value.map(u => u.id)
  }
}
const toggleUser = (id:number) => {
  if (selectedUsers.value.includes(id)) {
    selectedUsers.value = selectedUsers.value.filter(i => i !== id)
  } else {
    selectedUsers.value.push(id)
  }
}

// =========================
// UI ACTIONS
// =========================
const toggleColPanel = () => {
  colPanel.value = !colPanel.value
}

const openAddUserModal = () => {
  showModal.value = true;
}


const callbackSaved =async () => {
    await fetchData()
}

const fullLoading=ref<boolean>(false);

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

  fullLoading.value = true

  try {
    const res:any = await $api.delete("/users/delete/"+id)
    const obj:any = res.data
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
    fullLoading.value=false;
  }
}

const getExamsDataList=ref<any[]>([]);
const dataExamloading= ref<boolean>(false);
const inputSearchExam= ref<any>("");
const fetchExamsData= async ()=>{
  dataExamloading.value=true;
try{
         const res:any = await $api.post("/exams/list", {
                search: inputSearchExam.value
        });
        const obj:any = res.data||{};

        if(obj.status == 'success'){
        getExamsDataList.value=obj.data;
        }else{
        getExamsDataList.value=[];
        }
    } catch(err){
      getExamsDataList.value=[];

    }finally{
        dataExamloading.value=false;
    }
}

let searchExamsTimeout: any = null;

const onSearchExam =async (query: string) => {
    inputSearchExam.value = query;
    clearTimeout(searchExamsTimeout);
    searchExamsTimeout = setTimeout(async () => {
       await fetchExamsData();
    }, 500);
};

const examOptions = computed(() => [
    { id: "all", name: "All Exams" },
    ...getExamsDataList.value
]);

// CSV cell writer with formula-injection neutralisation. A cell whose text STARTS
// with = + - @ (or a tab / CR) is executed as a formula by Excel / Sheets, so a
// name like `=cmd|...` would run on open. Prefix a leading apostrophe to force it
// to render as literal text, THEN quote-wrap + escape embedded quotes.
const csvCell = (v:any) => {
  let s = String(v || '')
  const dangerous = /^[=+\-@\t\r]/.test(s)
  // Leave harmless scalars untouched so we don't uglify normal cells: a lone dash
  // placeholder ("-"), or a plain / negative / currency number. Prefix the leading
  // apostrophe ONLY for genuine formula-looking values (=cmd, @SUM, -cmd, +1+1…).
  const harmless = s === '-' || /^[-+]?[\d.,$£₱%\s]+$/.test(s)
  if (dangerous && !harmless) { s = "'" + s }
  return `"${s.replace(/"/g, '""')}"`
}

const onClickExportUsersCSV = () => {

  const rows = filteredUsers.value

  if (!rows.length) {
    $toast('No data to export','error')
    return
  }

  const csv = [
    'Name,Email,Role,Grad Year,Institution,Exam,Status,Revenue'
  ]

  rows.forEach((u:any) => {
    const row = [
      u.name,
      u.email,
      u.role,
      u.gradyr,
      u.inst,
      u.exam,
      statusLabel(u),
      u.revenue,
    ].map(csvCell)

    csv.push(row.join(','))
  })

  const blob = new Blob([csv.join('\n')], { type: 'text/csv' })
  const url = window.URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', 'users.csv')

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  window.URL.revokeObjectURL(url)

  $toast(`Exported ${rows.length} users`)
}
/**
 * start CSV export
 */
const exportSelectedCSV = () => {

  const rows = filteredUsers.value.filter(u =>
    selectedUsers.value.includes(u.id)
  )

  if (!rows.length) {
    $toast('No users selected')
    return
  }

  const csv = [
    'Name,Email,Role,Grad Year,Institution,Exam,Status,Revenue'
  ]

  rows.forEach((u:any) => {
    const row = [
      u.name,
      u.email,
      u.role,
      u.gradyr,
      u.inst,
      u.exam,
      statusLabel(u),
      u.revenue,
    ].map(csvCell)

    csv.push(row.join(','))
  })

  const blob = new Blob([csv.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = 'selected-users.csv'
  a.click()

  URL.revokeObjectURL(url)
}
/** end CSV export **/

/**
 * start handle Bulk action by dynamic
 */
const handleBulkAction = async (action: 'extend' | 'pause' | 'revoke') => {

  if (!selectedUsers.value.length) {
    $toast('Please select at least one user', 'error')
    return
  }

  const actionText: any = {
    extend: 'Extend Access',
    pause: 'Pause Access',
    revoke: 'Revoke Access',
    delete: 'Delete'
  }

  // Delete is destructive + irreversible, so it gets a stronger, explicit warning.
  const confirmMsg = action === 'delete'
    ? `Permanently delete ${selectedUsers.value.length} user(s) and ALL their data (sessions, subscriptions, notes)? This cannot be undone. Your own and protected admin accounts are skipped.`
    : `Are you sure you want to ${actionText[action].toLowerCase()} for ${selectedUsers.value.length} users?`
  const confirmed = await $confirm(confirmMsg)

  if (!confirmed) return

  fullLoading.value = true

  try {

    const res:any = await $api.post('/users/bulk-actions', {
      actions:action,
      user_ids: selectedUsers.value
    })

    const obj:any = res.data||{};

    if (obj.status === 'success') {
      const message =obj.msg || `${actionText[action]} successfully`;
      $toast(message,'success')
      selectedUsers.value = []
      await callbackSaved()
    } else {
      const message =obj.msg || `${actionText[action]} failed`;
      $toast(message,'error')
    }

  } catch (err: any) {
    const message = err?.response?.data?.msg || err?.response?.data?.message || `${actionText[action]} failed`;
    $toast(message, 'error')
  } finally {
    fullLoading.value = false
  }
}

const bulkExtendAccess =async () => {
  await handleBulkAction('extend')
 }

const bulkPauseAccess =async () => {
  await handleBulkAction('pause')
}

const bulkRevokeAccess =async () => {
  await handleBulkAction('revoke')
}

const bulkDeleteUsers =async () => {
  await handleBulkAction('delete')
}

/** end handle Bulk action **/

onMounted(() => {
  // Deep-link support: /dashboard/users?exam=<id> lands pre-filtered to that exam's
  // subscribers — used by the "View subscribers" drill-down on the Exams page.
  const examQ = useRoute().query.exam
  if (examQ) filterExam.value = String(examQ)
  fetchData()
  fetchExamsData();
})

watch(pageCurnt, async (newPage) => {
  data_page_current.value = newPage
 await fetchData()
})


watch(limit_data,async (val) => {

  data_page_current.value =1;
 await fetchData()
})


</script>

<template>
  <Loading v-if="fullLoading" />
<div class="dashwrap userswrap-page">

  <!-- HEADER -->
  <div class="section-hdr">
    <div class="section-hdr-left">
      <p>{{ total_data }} total users · {{ active_subscriptions }} active subscriptions</p>
    </div>

    <div class="section-hdr-right">
      <button class="btn btn-outline btn-sm" @click="onClickExportUsersCSV">
        Export CSV
      </button>

      <button v-if="canEdit('users')" class="btn btn-primary btn-sm" @click="openAddUserModal">
        Add User
      </button>
    </div>
  </div>

  <!-- FILTER -->
  <div class="filter-bar">
    <input
      v-model="input_search"
      class="filter-input"
      placeholder="Search..."
    />
    <div class="formfilterrow">
      <Multiselect
      class="multiexam-select-options"
      placeholder="Select Exam"
      v-model="filterExam"
      :options="examOptions"
      label="name"
      valueProp="id"
      :searchable="true"
      :loading="dataExamloading"
      @search-change="onSearchExam"
      />
      </div>
    <select class="filter-input filter-select form-select" id="userPlanFilter" 
    v-model="plan">
    <option value="all">All Plans</option>
    <option value="1mo">1 Month</option>
    <option value="3mo">3 Months</option>
    <option value="6mo">6 Months</option>
    <option value="12mo">Annual (12mo)</option>
    <option value="trial">Trial</option>
    </select>

    <select class="filter-input filter-select form-select" id="userStatusFilter"
    v-model="status">
    <option value="all">All Statuses</option>
    <option value="active">Active</option>
    <option value="trial">Free Trial</option>
    <option value="expired">Expired</option>
    <option value="pending">Pending</option>
    <option value="inactive">Inactive</option>
    <option value="blocked">Blocked</option>
    </select>

  </div>

  <div class="headswraplabl form-row">
    <label class="form-label">Limit</label> 
    <select class="filter-input form-select" v-model="limit_data" >
    <option :value="10">10</option>
    <option :value="20">20</option>
    <option :value="50">50</option>
    <option :value="100">100</option>
  </select>
   </div>
  <!-- PAGINATION -->

  <Pagination
    v-model:page="pageCurnt"
    :totalData="total_data"
    :totalPages="totalPages"
    :pageSize="limit_data"
    elmntName="users"
  />
  <!-- COLUMN TOGGLE -->
  <div class="wrap-columntoggle">
       <div class="wrapcolumleft">Click column headers to sort</div>

       <div class="wrapcolumnright">
          <button class="columnbtntoggle btn btn-outline btn-sm"
          @click="toggleColPanel">
              <svg fill="none" height="12" stroke="currentColor"
              stroke-linecap="round" stroke-width="2.5" viewBox="0 0 24 24"
              width="12" >
              <line x1="3" x2="21" y1="12" y2="12"></line>
              <line x1="3" x2="21" y1="6" y2="6"></line>
              <line x1="3" x2="21" y1="18" y2="18"></line>
              </svg>
            Columns
          </button>

          <div class="togglecolPanel colPanel" 
          :class="colPanel?'show':''">
          <div class="titledrop">
            Show/Hide Columns
          </div>
            <label v-for="(val, key) in showCols" :key="key" class="col-toggle-row">
              <input type="checkbox" v-model="showCols[key]" />
               {{ columnLabels[key] }}
            </label>

          </div>
      </div>
  </div>

  <!-- TABLE -->
  <div class="card">
      <div class="bulk-toolbar" id="usersBulkBar"
        v-if="selectedUsers.length > 0">

          <span id="bulkCount">{{ selectedUsers.length }} selected</span>
          <div class="bulk-actions" style="display:flex;gap:8px;flex-wrap:wrap">
            <button v-if="canEdit('users')" class="btn btn-outline btn-sm" type="button"
             @click="bulkExtendAccess">
              Extend Access
            </button>
            <button class="btn btn-outline btn-sm"  type="button"
            @click="bulkPauseAccess">
              Pause Access
            </button>
            <button class="btn btn-outline btn-sm" type="button"
             @click="exportSelectedCSV">
              Export Selected
            </button>
            <button class="btn btn-danger btn-sm" type="button"
             @click="bulkRevokeAccess">
              Revoke Access
            </button>
            <button v-if="canEdit('users')" class="btn btn-danger btn-sm" type="button"
             @click="bulkDeleteUsers">
              Delete
            </button>
          </div>
      </div>

    <div class="table-wrap">

        <table class="usersTable" id="usersTable">
          <thead>
            <tr>
              <th style="width:36px">
                <input id="selectAllUsers" type="checkbox"
                 :checked="isAllSelected"
                @change="toggleSelectAll">
              </th>
              <th class="thTitle cursor-pointer" v-if="showCols.created_at"
              @click="onClickSortBy('created_at')">
                Signup Date
                <span class="sort-arrow">
                  {{ sortColumn === 'created_at' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕' }}
                </span>
              </th>
              <th class="thTitle" v-if="showCols.last_active">Last active</th>
              <th class="thTitle cursor-pointer"
              @click="onClickSortBy('name')">
                User
                <span class="sort-arrow">
                  {{ sortColumn === 'name' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕' }}
                </span>
              </th>
              <th class="thTitle cursor-pointer"
              @click="onClickSortBy('email')"
              v-if="showCols.email">
                {{ columnLabels.email }}
                <span class="sort-arrow">
                  {{ sortColumn === 'email' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕' }}
                </span>
              </th>
              <th class="thTitle cursor-pointer"
              @click="onClickSortBy('level')"
              v-if="showCols.level">
                {{ columnLabels.level }}
                <span class="sort-arrow">
                  {{ sortColumn === 'level' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕' }}
                </span>
              </th>
              <th class="thTitle cursor-pointer"
              @click="onClickSortBy('gradyr')"
               v-if="showCols.gradyr">
                {{ columnLabels.gradyr }}
                <span class="sort-arrow">
                  {{ sortColumn === 'gradyr' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕' }}
                </span>
              </th>
              <th class="thTitle cursor-pointer"
              @click="onClickSortBy('medical_school')"
              v-if="showCols.medical_school">
                {{ columnLabels.medical_school }}
                <span class="sort-arrow">
                  {{ sortColumn === 'medical_school' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕' }}
                </span>
              </th>
              <th class="thTitle cursor-pointer"
              @click="onClickSortBy('country')"
              v-if="showCols.country">
                {{ columnLabels.country }}
                <span class="sort-arrow">
                  {{ sortColumn === 'country' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕' }}
                </span>
              </th>
              <th class="thTitle cursor-pointer"
              @click="onClickSortBy('exam_date')"
              v-if="showCols.exam_date">
                {{ columnLabels.exam_date }}
                <span class="sort-arrow">
                  {{ sortColumn === 'exam_date' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕' }}
                </span>
              </th>
              <th class="thTitle cursor-pointer"
              @click="onClickSortBy('inst')"
              v-if="showCols.inst">
                {{ columnLabels.inst }}
                <span class="sort-arrow">
                  {{ sortColumn === 'inst' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕' }}
                </span>
              </th>
              <th class="thTitle cursor-pointer" style="width:200px"
              @click="onClickSortBy('exam')"
              v-if="showCols.exam">
                {{ columnLabels.exam }}
                <span class="sort-arrow">
                   {{ sortColumn === 'exam' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕' }}
                </span>
              </th>

              <th class="thTitle cursor-pointer"
              @click="onClickSortBy('plan')"
              v-if="showCols.plan">
                {{ columnLabels.plan }}
                <span class="sort-arrow">
                   {{ sortColumn === 'plan' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕' }}
                </span>
              </th>

              <th class="thTitle cursor-pointer"
              @click="onClickSortBy('expiry')"
              v-if="showCols.expiry">
                {{ columnLabels.expiry }}
                <span class="sort-arrow">
                   {{ sortColumn === 'expiry' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕' }}
                </span>
              </th>

              <th class="thTitle cursor-pointer"
              @click="onClickSortBy('status')"
              v-if="showCols.status">
                {{ columnLabels.status }}
                <span class="sort-arrow">
                   {{ sortColumn === 'status' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕' }}
                </span>
              </th>
             
              <th class="thTitle cursor-pointer"
              @click="onClickSortBy('revenue')"
              v-if="showCols.revenue">
                {{ columnLabels.revenue }}
                <span class="sort-arrow">
                  {{ sortColumn === 'revenue' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕' }}
                </span>
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody v-if="data_loading || filteredUsers.length === 0">
            <tr>
              <td  v-if="!data_loading && filteredUsers.length === 0"
              class="text-center" colspan="19">
                <Empty/>
              </td>
              <td v-else colspan="16">
                <Loader_small />
              </td>
            </tr>
          </tbody>

          <tbody v-else>
            <tr v-for="(u, i) in filteredUsers" :key="i">
              <td>
                <input class="user-select" type="checkbox"
                 :checked="selectedUsers.includes(u.id)"
                @change="toggleUser(u.id)">
              </td>
              <td v-if="showCols.created_at">{{ u.created_at || '-' }}</td>
              <td v-if="showCols.last_active">{{ u.last_active || '-' }}</td>
              <td>{{ u.name }}</td>

              <td v-if="showCols.email">{{ u.email }}</td>

              <td v-if="showCols.level" class="capitalize-first">
                {{ u.level }}
              </td>
              <td v-if="showCols.gradyr">{{ u.gradyr }}</td>
              <td v-if="showCols.medical_school">{{ u.medical_school || '-' }}</td>
              <td v-if="showCols.country">{{ u.country || '-' }}</td>
              <td v-if="showCols.exam_date">{{ u.exam_date || '-' }}</td>
              <td v-if="showCols.inst">{{ u.inst }}</td>
              <td v-if="showCols.exam" style="width:200px;white-space:pre-line">
                {{ u.exam }}
              </td>

              <td v-if="showCols.plan" style="white-space:pre-line">
                {{ u.plan }}
              </td>

              <td v-if="showCols.expiry" style="white-space:pre-line">
                {{ u.expiry }}
              </td>

              <td v-if="showCols.status">
                <!-- Login-state wins first: an INVITED (Pending) / Blocked / Inactive
                     account shows that state even if it carries a subscription. For an
                     active account the badge reflects the SUBSCRIPTION (from the API's
                     subscription_status): Free Trial (live trial) / Active (live paid) /
                     Expired (no live subscription — lapsed OR never subscribed, e.g.
                     migrated WordPress users). is_trial kept as a fallback for old data. -->
                <span v-if="Number(u.status) === 2" class="badge badge-amber">
                Pending
                </span>
                <span v-else-if="Number(u.status) === 3" class="badge badge-danger">
                Blocked
                </span>
                <span v-else-if="Number(u.status) === 0" class="badge badge-gray">
                Inactive
                </span>
                <span v-else-if="u.is_trial || u.subscription_status === 'trial'" class="badge badge-teal">
                Free Trial
                </span>
                <span v-else-if="u.subscription_status === 'institution'" class="badge badge-green">
                Institution
                </span>
                <span v-else-if="u.subscription_status === 'expired'" class="badge badge-orange">
                Expired
                </span>
                <span v-else class="badge badge-green">
                Active
                </span>
              </td>
              <td v-if="showCols.revenue" class="col-revenue" style="font-weight:700">
              {{ u?.revenue??'-' }}
              </td>
              <td>
              <button v-if="canEdit('users')" class="actTdbtn btn btn-danger btn-sm btn-icon"
              @click="confirmDelete(u.id)"
              type="button">
              <svg fill="none" height="12" stroke="currentColor" stroke-linecap="round"
              stroke-width="2.5" viewBox="0 0 24 24" width="12">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6l-1 14H6L5 6"></path>
              </svg>
              </button>
               
              <!-- View + edit are now one page — this opens the detail page which
                   embeds the edit form inline, so a separate edit modal is gone. -->
              <NuxtLink
              :to="`/dashboard/users/${u.id}`"
              title="Edit"
              class="actTdbtn btn btn-outline btn-sm btn-icon EditAcn">
              <svg fill="none" height="12" stroke="currentColor" stroke-linecap="round"
              stroke-linejoin="round" stroke-width="2.5" viewBox="0 0 24 24" width="12">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              </NuxtLink>

              <!-- View as Student — impersonate this user in the portal (audit-logged). -->
              <button class="actTdbtn btn btn-outline btn-sm btn-icon"
              type="button"
              title="View the portal as this user"
              :disabled="viewingAsId === u.id"
              @click="viewAsStudent(u)">
              <svg v-if="viewingAsId === u.id" width="12" height="12" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="3"
              stroke-linecap="round" stroke-dasharray="42 14">
              <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12"
              dur="0.8s" repeatCount="indefinite"/>
              </circle>
              </svg>
              <svg v-else fill="none" height="12" stroke="currentColor" stroke-linecap="round"
              stroke-linejoin="round" stroke-width="2.5" viewBox="0 0 24 24" width="12">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
              </svg>
              </button>

              </td>
            </tr>      
          </tbody>
        </table>
    </div>
  </div>

</div>

<!-- MODAL -->
<AddUserModal  v-if="showModal"
  v-model="showModal"
  @saved="callbackSaved"
/>


</template>