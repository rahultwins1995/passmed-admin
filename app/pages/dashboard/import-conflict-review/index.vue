<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import Loading from '@/components/loaders/Loading.vue'
import Loader_small from '@/components/loaders/Loader_small.vue'
import Empty from '@/components/loaders/Empty.vue'
import Pagination from '@/components/Pagination.vue'
import ImportReviewModal from '@/components/imports/ImportReviewModal.vue'
import ImportReviewEditModal from '@/components/imports/ImportReviewEditModal.vue'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

const { $api, $toast, $confirm, $prompt } = useNuxtApp()

// ── Stats ────────────────────────────────────────────────────────────────────
const stats = ref({ all_count: 0,pending: 0, approved: 0, rejected: 0 })
const statsLoading = ref(false)

const fetchStats = async () => {
  statsLoading.value = true
  try {
    const res: any = await $api.get('/import-reviews/stats', { params: { search: input_search.value } })
    if (res?.data?.status === 'success') {
      stats.value = res.data.data
    }
  } catch {
    // silent
  } finally {
    statsLoading.value = false
  }
}

// ── List ─────────────────────────────────────────────────────────────────────
const getDataList   = ref<any[]>([])
const data_loading  = ref(true)
const fullLoading   = ref(false)
const pageCurnt     = ref(1)
const totalPages    = ref(1)
const total_data    = ref<number>(0)
const limit_data    = ref(10)
const filter_status = ref('all')

// Sorting is server-side: the list is paginated, so reordering only the rows
// currently on screen would look broken. Blank sortColumn = backend default
// (newest first).
const sortColumn    = ref<string>('')
const sortDirection = ref<'asc' | 'desc'>('desc')

const onClickSortBy = (col: string) => {
  if (sortColumn.value === col) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortColumn.value = col
    sortDirection.value = 'asc'
  }
  // A new ordering renumbers everything — go back to page 1.
  pageCurnt.value = 1
  fetchData()
}

// JSON string → object parse karo (backend dono taraf string bhejta hai)
const parseSnapshot = (val: any) => {
  if (!val) return {}
  if (typeof val === 'object') return val
  try { return JSON.parse(val) } catch { return {} }
}

const fetchData = async () => {
  data_loading.value = true
  try {
    const res: any = await $api.get('/import-reviews', {
      params: {
        page:     pageCurnt.value,
        limit:    limit_data.value,
        status:   filter_status.value,
        sort_by:  sortColumn.value,
        sort_dir: sortDirection.value,
        search:   input_search.value,
      }
    })
    const obj = res?.data ?? {}
    if (obj.status === 'success') {
      // existing_data + incoming_data dono parse kar lo yaheen
      getDataList.value = (obj.data ?? []).map((item: any) => ({
        ...item,
        existing_data: parseSnapshot(item.existing_data),
        incoming_data: parseSnapshot(item.incoming_data),
      }))
      total_data.value  = obj.total ?? 0
      totalPages.value  = Math.ceil(obj.total / limit_data.value)
    } else {
      getDataList.value = []
      total_data.value  = 0
    }
  } catch {
    getDataList.value = []
    total_data.value  = 0
  } finally {
    data_loading.value = false
  }
}

// ── Review Modal ──────────────────────────────────────────────────────────────
const showReviewModal   = ref(false)
const selectedReview    = ref<any>(null)

const openReview = (item: any) => {
  selectedReview.value  = item
  showReviewModal.value = true
}

const onReviewSaved = async () => {
  await fetchStats()
  await fetchData()
}

// ── Edit incoming (CSV) — operates on the review row only, not the questions table ──
const showEditModal = ref(false)
const editReview    = ref<any>(null)

const openEdit = (item: any) => {
  editReview.value    = item
  showEditModal.value = true
}

const onEditSaved = async () => {
  showEditModal.value = false
  editReview.value    = null
  await fetchTeriggerData()
}

// ── Quick inline actions (approve / reject without opening modal) ─────────────
const quickAction = async (id: any, action: 'approve' | 'reject') => {
  const label = action === 'approve' ? 'approve (overwrite question)' : 'reject'
  const confirmed = await $confirm(`Are you sure you want to ${label} this change?`,{
        lable:'Reason Notes',
        input:'text',
        placeholder: 'Enter reason (optional)...',
        required: false,
  })

  // Only an actual cancel returns null; empty notes ('') should still proceed.
  if (confirmed === null) return

  fullLoading.value = true
  try {
    const res: any = await $api.post(`/import-reviews/action/${id}`, {
      // Notes optional. Backend still requires a non-empty value, so send '-' when blank.
      notes: (confirmed && String(confirmed).trim()) ? confirmed : '-',
      action:action,
     })
    const obj = res?.data ?? {}
    if (obj.status === 'success') {
        fullLoading.value = false;
        $toast(res?.data?.msg || 'Review has been approved successfully.','success')
    
      await fetchTeriggerData();

    } else {
      $toast(res?.data?.msg || 'Action failed','error')
    }

  } catch (err: any) {
    $toast(err?.response?.data?.msg || 'Action failed', 'error')
  } finally {
    fullLoading.value = false
  }
}

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
    const res:any = await $api.delete("/import-reviews/delete/"+id)
    const obj:any = res.data
    if (obj.status === 'success') {
        fullLoading.value = false
          const message = res?.data?.msg || 'Deleted successfully.';
         $toast(message);
        fetchData()
    }else{
      fullLoading.value = false
     const message = res?.data?.msg || 'Deletion failed';
      $toast(message,'error');
    } 

  } catch (err:any) {
      const message = err?.response?.data?.message || 'Deletion failed.';
      fullLoading.value = false
     $toast(message,'error');

  }
}

// ── Pagination ────────────────────────────────────────────────────────────────
const onPageChange = (page: number) => {
  pageCurnt.value = page
  fetchData()
}

// ── Filter tab ────────────────────────────────────────────────────────────────
const setTab = (tab: string) => {
  filter_status.value  = tab
}



const selectedItem=ref<any>([]);
const input_search=ref<string>('');
const isAllSelected = computed(() => {
  return getDataList.value.length > 0 &&
         getDataList.value.every(u => selectedItem.value.includes(u.id))
})

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedItem.value = []
  } else {
    selectedItem.value = getDataList.value.map(u => u.id)
  }
}
const onToggleSelect = (id:number) => {
  if (selectedItem.value.includes(id)) {
    selectedItem.value = selectedItem.value.filter((i:any) => i !== id)
  } else {
    selectedItem.value.push(id)
  }
}

/**
 * bulk approve (overwrite existing questions)
 **/
const onClickBulkApprove = async () => {

  if (getDataList.value.length === 0) {
    $toast('No data found')
    return
  }

  if (selectedItem.value.length === 0) {
    $toast('Please select at least one.')
    return
  }

  const confirmed = await $confirm(
    `Approve ${selectedItem.value.length} selected? This will overwrite the existing questions.`,
    {
      lable: 'Reason Notes',
      input: 'text',
      placeholder: 'Enter reason (optional)...',
      required: false,
    }
  )

  // Only an actual cancel returns null; empty notes ('') should still proceed.
  if (confirmed === null) return

  fullLoading.value = true
  try {
    const res: any = await $api.post('/import-reviews/bulk-approve', {
      ids: selectedItem.value,
      notes: (confirmed && String(confirmed).trim()) ? confirmed : '-',
    })

    const obj = res?.data ?? {}
    if (obj.status === 'success') {
      fullLoading.value = false
      $toast(res?.data?.msg || 'Reviews approved successfully.', 'success')
      selectedItem.value = []
      await fetchTeriggerData()
    } else {
      $toast(res?.data?.msg || 'Action failed', 'error')
    }
  } catch (err: any) {
    const message = err?.response?.data?.msg || err?.response?.data?.message || 'Action failed.'
    $toast(message, 'error')
  } finally {
    fullLoading.value = false
  }
}

/**
 * update status bulk
 **/
//const quickSelectAction = async () => {
const onClickBulkReject = async () => {

  if(getDataList.value.length===0){
    $toast('No data found')
    return
  }

  if (selectedItem.value.length === 0) {
    $toast('Please select at least one.');
    return
  }

  const confirmed = await $confirm(`Are you sure you want to reject?`,{
        lable:'Reason Notes',
        input:'text',
        placeholder: 'Reason for rejection (optional)',
        required: false,
  })

  // Only an actual cancel returns null; empty notes ('') should still proceed.
  if (confirmed === null){
    return
  }


  fullLoading.value = true

  try {

    const res:any=await $api.post('/import-reviews/bulk-reject',{
       ids: selectedItem.value,
        // Notes optional. Backend still requires a non-empty value, so send '-' when blank.
        notes: (confirmed && String(confirmed).trim()) ? confirmed : '-',
       });

      const obj = res?.data ?? {}
      if (obj.status === 'success') {
            fullLoading.value = false;
            $toast(res?.data?.msg || 'Review has been rejected successfully.','success')

            selectedItem.value = [];
            await fetchTeriggerData();

        } else {
          $toast(res?.data?.msg || 'Action failed','error')
        }

  } catch (err:any) {
    const message = err?.response?.data?.msg || err?.response?.data?.message || 'Action failed.'
     $toast(message,'error');
  } finally {
    fullLoading.value = false
  }
}

/**
 * delete bulk
 **/
const bulkDelete = async () => {

  if(getDataList.value.length===0){
    $toast('No data found')
    return
  }

  if (selectedItem.value.length === 0) {
    $toast('Please select at least one.');
    return
  }

   const confirmed = await $confirm('Are you sure you want to delete selected?')
  if (!confirmed) {
    return
  }

  fullLoading.value = true


  try {

    const res:any=await $api.post('/import-reviews/bulk-delete',{
       ids: selectedItem.value,
       });

      const obj:any = res.data??{};
      if (obj.status === 'success') {
            const message = obj?.msg || 'Deleted successfully'
            $toast(message,'success');
             
              selectedItem.value = [];
       
              fetchTeriggerData();
      }else{
        const message = res?.data?.msg || 'Deletion failed'
        $toast(message,'error');
      } 
  
  } catch (err:any) {
    const message = err?.response?.data?.msg || err?.response?.data?.message || 'Deletion failed.'
     $toast(message,'error');
  } finally {
    fullLoading.value = false
  }
}

/**
 * Delete ALL conflicting entries matching the current filter/search — across every
 * page, not just the selected/visible rows. Guarded (destructive + irreversible).
 */
const deleteAllConflicts = async () => {
  if (total_data.value === 0) {
    $toast('No conflicting entries to delete.')
    return
  }

  const confirmed = await $confirm(
    `Permanently delete ALL ${total_data.value} conflicting entr${total_data.value === 1 ? 'y' : 'ies'} matching the current filter? This cannot be undone.`
  )
  if (!confirmed) return

  fullLoading.value = true
  try {
    const res:any = await $api.post('/import-reviews/delete-all', {
      status: filter_status.value,
      search: input_search.value,
    })
    const obj:any = res.data ?? {}
    if (obj.status === 'success') {
      $toast(obj?.msg || 'Deleted successfully', 'success')
      selectedItem.value = []
      pageCurnt.value = 1
      fetchTeriggerData()
    } else {
      $toast(res?.data?.msg || 'Deletion failed', 'error')
    }
  } catch (err:any) {
    $toast(err?.response?.data?.msg || err?.response?.data?.message || 'Deletion failed.', 'error')
  } finally {
    fullLoading.value = false
  }
}


// ── Helpers ───────────────────────────────────────────────────────────────────
const truncate = (str: string, len = 80) =>
  str && str.length > len ? str.slice(0, len) + '…' : str

const stripTags = (html: string) =>
  html ? html.replace(/<[^>]*>/g, '') : '-'

const fetchTeriggerData=async () => {
  await fetchStats()
  await fetchData()
}

watch(filter_status,async (val) => {
    pageCurnt.value = 1;
    await fetchTeriggerData();
})

// Search box (QID / conflict reason) — debounced so we don't refetch on every
// keystroke. Resets to page 1 so results aren't hidden on a later page.
let _searchTimer: any = null
watch(input_search, () => {
    clearTimeout(_searchTimer)
    _searchTimer = setTimeout(async () => {
        pageCurnt.value = 1
        await Promise.all([fetchTeriggerData(), fetchStats()])
    }, 350)
})


onMounted(async () => {
  await fetchTeriggerData()
})

</script>

<template>
  <Loading v-if="fullLoading" />

  <div class="dashwrap imprtRviwWrap">

    <!-- Header -->
    <div class="section-hdr">
      <div class="section-hdr-left">
        <h2>Import Review Queue</h2>
        <p>Questions from imports that have a duplicate QID in the database — review and decide whether to overwrite or keep existing.</p>
      </div>
    </div>

    <!-- Stat cards -->
    <div class="stats-row" style="grid-template-columns:repeat(4,1fr);margin-bottom:16px">
       <div class="stat-card q-stat-btn"
           :class="{ active: filter_status === 'all' }"
           style="cursor:pointer"
           @click="setTab('all')">
        <div class="stat-card-top">
          <div class="stat-icon teal">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" 
            stroke-width="2.5" stroke-linecap="round">
              <path d="M9 11l3 3L22 4"></path>
            </svg>
          </div>
        </div>
        <div class="stat-num" style="font-size:1.4rem;color:var(--teal,#f59e0b)">
          {{ stats.all_count }}
        </div>
        <div class="stat-label">All Review</div>
      </div>

      <div class="stat-card q-stat-btn"
           :class="{ active: filter_status === 'pending' }"
           style="cursor:pointer"
           @click="setTab('pending')">
        <div class="stat-card-top">
          <div class="stat-icon amber">
            <svg fill="none" height="14" stroke="currentColor" stroke-linecap="round"
                 stroke-width="2.5" viewBox="0 0 24 24" width="14">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" x2="12" y1="8" y2="12"></line>
              <line x1="12" x2="12.01" y1="16" y2="16"></line>
            </svg>
          </div>
        </div>
        <div class="stat-num" style="font-size:1.4rem;color:var(--amber,#f59e0b)">
          {{ stats.pending }}
        </div>
        <div class="stat-label">Pending Review</div>
      </div>

      <div class="stat-card q-stat-btn"
           :class="{ active: filter_status === 'approved' }"
           style="cursor:pointer"
           @click="setTab('approved')">
        <div class="stat-card-top">
          <div class="stat-icon green">
            <svg fill="none" height="14" stroke="currentColor" stroke-linecap="round"
                 stroke-width="2.5" viewBox="0 0 24 24" width="14">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
        </div>
        <div class="stat-num" style="font-size:1.4rem">{{ stats.approved }}</div>
        <div class="stat-label">Approved (Overwritten)</div>
      </div>

      <div class="stat-card q-stat-btn"
           :class="{ active: filter_status === 'rejected' }"
           style="cursor:pointer"
           @click="setTab('rejected')">
        <div class="stat-card-top">
          <div class="stat-icon red">
            <svg fill="none" height="14" stroke="currentColor" stroke-linecap="round"
                 stroke-width="2.5" viewBox="0 0 24 24" width="14">
              <line x1="18" x2="6" y1="6" y2="18"></line>
              <line x1="6" x2="18" y1="6" y2="18"></line>
            </svg>
          </div>
        </div>
        <div class="stat-num" style="font-size:1.4rem">{{ stats.rejected }}</div>
        <div class="stat-label">Rejected (Kept Original)</div>
      </div>

    </div>

    <!-- Filter bar -->
    <div class="filter-bar" style="margin-bottom:12px">
       <input
      v-model="input_search"
      class="filter-input"
      placeholder="Search..."
      />
      <select 
      class="filter-input filter-select form-select"
      v-model="filter_status">
       <option value="all">All</option>
        <option value="pending">Pending</option>
        <option value="approved">Approved</option>
        <option value="rejected">Rejected</option>
      </select>
      <span style="font-size:0.78rem;color:var(--ink-dim);align-self:center">
        {{ total_data }} record{{ total_data !== 1 ? 's' : '' }}
      </span>
    </div>

    <!-- List -->

    <div class="listpagedata">
      <div class="card">
          <div class="bulk-toolbar">

                <span id="bulkCount">
                  {{ (selectedItem.length > 0)?selectedItem.length+' selected':'' }}
                </span>

                <div class="bulk-actions" style="display:flex;gap:8px;flex-wrap:wrap">
                  <button class="btn btn-primary btn-sm"
                  @click="onClickBulkApprove"
                  type="button">
                  Approve all
                  </button>
                  <button class="btn btn-primary btn-sm"
                  @click="onClickBulkReject"
                  type="button">
                    Reject
                  </button>

                  <button v-if="canEdit('question_bank')" class="btn btn-danger btn-sm"
                    type="button"
                      @click="bulkDelete()"
                    >
                    Delete
                    </button>
                  <button class="btn btn-danger btn-sm"
                    type="button"
                    v-if="total_data > 0 && canEdit('question_bank')"
                    @click="deleteAllConflicts()"
                    title="Delete every conflicting entry matching the current filter (all pages)"
                    >
                    Delete all ({{ total_data }})
                    </button>
                </div>
            </div>

        <div class="table-wrap">
          <table  class="tbleWraps importReviewTable">
            <thead>
              <tr>
                <th style="width:36px">
                <input id="selectAll" type="checkbox"
                 :checked="isAllSelected"
                @change="toggleSelectAll">
              </th>
                <th>No.</th>
                <th class="cursor-pointer" @click="onClickSortBy('qid')">
                  QID
                  <span class="sort-arrow">
                    {{ sortColumn === 'qid' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕' }}
                  </span>
                </th>
                <th class="cursor-pointer" @click="onClickSortBy('conflict_reason')">
                  Conflict reason
                  <span class="sort-arrow">
                    {{ sortColumn === 'conflict_reason' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕' }}
                  </span>
                </th>
                <th class="cursor-pointer" @click="onClickSortBy('exam')">
                  Exam
                  <span class="sort-arrow">
                    {{ sortColumn === 'exam' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕' }}
                  </span>
                </th>
                <th class="cursor-pointer" @click="onClickSortBy('review_status')">
                  Status
                  <span class="sort-arrow">
                    {{ sortColumn === 'review_status' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕' }}
                  </span>
                </th>
                <th>Question Existing in DB</th>
                <th>Incoming (CSV)</th>
                <th class="cursor-pointer" @click="onClickSortBy('created_at')">
                  Created
                  <span class="sort-arrow">
                    {{ sortColumn === 'created_at' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕' }}
                  </span>
                </th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody v-if="data_loading || getDataList.length === 0">
            <tr>
              <td colspan="15">
                 <Loader_small v-if="data_loading" />
                  <Empty v-else />
              </td>
            </tr>
          </tbody>

          <tbody v-else>
            <tr v-for="(item, key) in getDataList" :key="key">
              <td>
                <input class="q-select" type="checkbox" 
                  style="margin-top:4px;accent-color:var(--teal)"
                  :checked="selectedItem.includes(item.id)"
                  @change="onToggleSelect(item.id)"
                    />
              </td>
              <td>{{key+1}}</td>
              <!-- QID + import info -->
              <td :data-import-id="item.import_file_id">
                <div class="qid-badge">Q#{{ item.qid ?? '—' }}</div>
                <div class="td-sub">Import #{{ item.import_file_id }}</div>
                <div v-if="item.row_number" class="td-sub">Row {{ item.row_number }}</div>
                <div v-if="item.created_at" class="td-sub">created:{{ item.created_at?.slice(0,10) }}</div>
              </td>

              <!-- Conflict reason -->
              <td>
                <div class="conflict-reason">
                  {{ item.conflict_reason || 'Duplicate QID' }}
                </div>
                <div v-if="item.reviewed_at" class="td-sub" style="margin-top:5px">
                  Reviewed: {{ item.reviewed_at?.slice(0,10) }}
                </div>
                <div v-if="item.admin_notes" class="admin-note">
                  "{{ item.admin_notes }}"
                </div>
              </td>

              <!-- Exam (comes from the parent import file, not the review row) -->
              <td>
                {{ item.import_file?.exam?.name ?? '—' }}
              </td>

               <!-- Status -->
              <td>
                <span v-if="item.review_status === 'pending'"  class="badge badge-amber">Pending</span>
                <span v-else-if="item.review_status === 'approved'" class="badge badge-green">Approved</span>
                <span v-else-if="item.review_status === 'rejected'" class="badge badge-danger">Rejected</span>
                <span v-else class="badge badge-gray">{{ item.review_status }}</span>
              </td>
              
              <!-- Existing in DB -->
              <td>
                <template v-if="item.existing_data && Object.keys(item.existing_data).length">
                  <div class="dp-label">Question</div>
                  <div class="dp-text">
                    {{ truncate(stripTags(item.existing_data.question_stem || ''), 100) }}
                  </div>
                  <div v-if="item.existing_data.explanation" class="dp-text dp-expl">
                    <span class="dp-sublabel">Expl:</span>
                    {{ truncate(stripTags(item.existing_data.explanation), 80) }}
                  </div>
                  <div class="dp-meta">
                    <span v-if="item.existing_data.difficulty" class="badge badge-gray">
                      {{ item.existing_data.difficulty }}
                    </span>
                    <span v-if="item.existing_data.answer" class="badge badge-gray">
                      Ans: {{ item.existing_data.answer }}
                    </span>
                  </div>
                </template>
                <span v-else class="td-empty">—</span>
              </td>

              <!-- Incoming from CSV -->
              <td>
                <template v-if="item.incoming_data && Object.keys(item.incoming_data).length">
                  <div class="dp-label" style="color:var(--teal,#06b6d4)">Question</div>
                  <div class="dp-text">
                    {{ truncate(stripTags(item.incoming_data.question_stem || ''), 100) }}
                  </div>
                  <div v-if="item.incoming_data.explanation" class="dp-text dp-expl">
                    <span class="dp-sublabel">Expl:</span>
                    {{ truncate(stripTags(item.incoming_data.explanation), 80) }}
                  </div>
                  <div class="dp-meta">
                    <span v-if="item.incoming_data.difficulty"
                          class="badge badge-teal"
                          :class="{ 'diff-pill': item.incoming_data.difficulty !== item.existing_data?.difficulty }">
                      {{ item.incoming_data.difficulty }}
                    </span>
                    <span v-if="item.incoming_data.answer"
                          class="badge badge-teal"
                          :class="{ 'diff-pill': item.incoming_data.answer !== item.existing_data?.answer }">
                      Ans: {{ item.incoming_data.answer }}
                    </span>
                  </div>
                </template>
                <span v-else class="td-empty">—</span>
              </td>

              <td>
              {{ item.created_at?.slice(0,10) }}
              </td>
              <!-- Actions -->
              <td>
                <div class="td-actions">
                  <button title="Review Duplicate"
                  class="actTdbtn btn btn-outline btn-sm"
                  @click="openReview(item)" 
                  type="button">
                    Diff
                  </button>
                  <template v-if="item.review_status === 'pending' && canEdit('question_bank')">
                    <button title="Edit question before approving"
                            class="actTdbtn btn btn-outline btn-sm"
                            type="button"
                            @click="openEdit(item)">
                      Edit
                    </button>
                    <button class="actTdbtn btn btn-primary btn-sm"
                            type="button"
                            @click="quickAction(item.id, 'approve')">
                      Approve
                    </button>
                    <button class="actTdbtn btn btn-danger btn-sm"
                            type="button"
                            @click="quickAction(item.id, 'reject')">
                      Reject
                    </button>
                    <button 
                    @click="confirmDelete(item.id)"
                    class="actTdbtn btn btn-danger btn-sm"
                    type="button">
                    Delete
                    </button>
                  </template>
                </div>
              </td>
              
            </tr>
          </tbody>

          </table>
        </div>
      </div>

      <!-- Pagination -->
       <br/>
        <Pagination
        v-model:page="pageCurnt"
        :totalData="total_data"
        :totalPages="totalPages"
        elmntName="reviews"
        @update:page="onPageChange"
      />
    <!-- Pagination -->
    </div>

  </div>

  <!-- Review detail modal -->
  <ImportReviewModal
    v-if="showReviewModal"
    v-model="showReviewModal"
    :review="selectedReview"
    @saved="onReviewSaved"
  />

  <!-- Edit incoming (CSV) snapshot — review row only; questions table untouched until approve -->
  <ImportReviewEditModal
    v-if="showEditModal"
    v-model="showEditModal"
    :review="editReview"
    @saved="onEditSaved"
  />
</template>

<style scoped>

.importReviewTable {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.82rem;
}

.importReviewTable thead tr {
  background: var(--surface, #f9fafb);
}

.importReviewTable th {
  padding: 9px 12px;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--ink-dim, #6b7280);
  text-align: left;
  white-space: nowrap;
  border-bottom: 1px solid var(--border, #e5e7eb);
}

.importReviewTable td {
  padding: 11px 12px;
  vertical-align: top;
  border-bottom: 1px solid var(--border, #e5e7eb);
  color: var(--ink, #111827);
}

.importReviewTable tbody tr:last-child td {
  border-bottom: 0;
}

.importReviewTable tbody tr:hover td {
  background: var(--surface, #f9fafb);
}

/* Column widths */
.importReviewTable th:nth-child(1),
.importReviewTable td:nth-child(1) { width: 100px; }

.importReviewTable th:nth-child(5),
.importReviewTable td:nth-child(5) { width: 90px; }

.importReviewTable th:nth-child(6),
.importReviewTable td:nth-child(6) { width: 110px; }

/* ── Cell helpers ───────────────────────────────────────────────────────────── */
.td-sub {
  font-size: 0.68rem;
  color: var(--ink-dim, #9ca3af);
  margin-top: 3px;
  line-height: 1.3;
}

.td-empty {
  color: var(--ink-dim, #9ca3af);
  font-size: 0.78rem;
}

.td-actions {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

/* ── QID badge ──────────────────────────────────────────────────────────────── */
.qid-badge {
  display: inline-block;
  background: var(--surface, #f3f4f6);
  border: 1px solid var(--border, #e5e7eb);
  border-radius: 4px;
  padding: 2px 7px;
  font-size: 0.75rem;
  font-weight: 700;
  font-family: monospace;
  color: var(--ink, #111827);
}

/* ── Data preview ───────────────────────────────────────────────────────────── */
.dp-label {
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: var(--ink-dim, #9ca3af);
  margin-bottom: 3px;
}

.dp-text {
  font-size: 0.78rem;
  line-height: 1.45;
  color: var(--ink, #111827);
}

.dp-expl {
  color: var(--ink-dim, #6b7280) !important;
  font-size: 0.72rem !important;
  margin-top: 4px;
}

.dp-sublabel {
  font-weight: 700;
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  margin-right: 3px;
  color: var(--ink-dim, #9ca3af);
}

.dp-meta {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-top: 5px;
}

/* ── Conflict ───────────────────────────────────────────────────────────────── */
.conflict-reason {
  font-size: 0.78rem;
  color: var(--red, #dc2626);
  font-weight: 600;
  line-height: 1.4;
}

.admin-note {
  font-size: 0.72rem;
  color: var(--ink-mid, #4b5563);
  margin-top: 5px;
  background: var(--surface, #f3f4f6);
  padding: 4px 7px;
  border-radius: 4px;
  line-height: 1.4;
  font-style: italic;
}

/* ── Status badges ──────────────────────────────────────────────────────────── */
.badge-amber {
  background: rgba(245,158,11,0.1);
  color: #b45309;
  border: 1px solid rgba(245,158,11,0.25);
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 0.7rem;
  font-weight: 700;
}

.badge-archived {
  background: rgba(107,114,128,0.1);
  color: #374151;
  border: 1px solid rgba(107,114,128,0.2);
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 0.7rem;
  font-weight: 700;
}

/* Changed field highlight */
.diff-pill {
  background: rgba(245,158,11,0.15) !important;
  color: #92400e !important;
  border-color: rgba(245,158,11,0.4) !important;
  font-weight: 800;
}
</style>