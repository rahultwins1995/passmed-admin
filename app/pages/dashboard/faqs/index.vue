<script setup lang="ts">
import FaqTabs from '@/components/faqs/FaqTabs.vue';
import Pagination from '@/components/Pagination.vue'
import AddModal from '@/components/faqs/AddModal.vue';
import ImportSheetModal from '@/components/faqs/ImportSheetModal.vue';
import EditModal from '@/components/faqs/EditModal.vue';
import Loader_small from '@/components/loaders/Loader_small.vue'
import Empty from '@/components/loaders/Empty.vue'
import Loading from '@/components/loaders/Loading.vue'
import { ref, onMounted, computed } from 'vue'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

const { $api, $toast,$confirm } = useNuxtApp()

const pageCurnt = ref(1)
const totalPages = ref(1)

const data_page_current = ref(1)
const total_data = ref(0)
const limit_data = ref(10)

const getDataList = ref<any[]>([])
const data_loading = ref(true)
const fullLoading = ref(false)

// filters
const filter_status = ref<any>('all')

// Consolidated portal tab — home | student | institute. Sent as portal_type to
// the unified /faqs endpoints (Student/Institute live in help_faqs by portal_type;
// Home in faqs). Replaces the old 3 separate routes.
const portalType = ref<'home' | 'student' | 'institute'>('home')

// modal
const showModal = ref(false)

const fetchData = async () => {
  data_loading.value = true

  try {
    const res:any = await $api.post("/faqs", {
      page: data_page_current.value,
      limit: limit_data.value,
      portal_type: portalType.value
    })

    const obj:any = res.data

    if (obj.status === 'success') {

      total_data.value = obj.total
      totalPages.value = Math.ceil(obj.total / obj.limit)
      pageCurnt.value = obj.current_page

      //transform data
      getDataList.value = obj?.data??[];

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

// ── Drag-and-drop reorder ────────────────────────────────────────────────────
// Native HTML5 DnD (no library). Dropping a row moves it in getDataList and
// persists the new order for the current portal via POST /faqs/reorder. `start`
// keeps sort_order globally consistent when the list is paginated.
const dragIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)
const savingOrder = ref(false)       // true while a reorder request is in flight
const savingId = ref<number | null>(null)  // the moved row currently being persisted

function onDragStart(i: number, e: DragEvent) {
  // Block starting a new drag until the previous reorder has finished saving.
  if (savingOrder.value) { e.preventDefault(); return }
  dragIndex.value = i
  if (e.dataTransfer) { e.dataTransfer.effectAllowed = 'move' }
}
function onDragOver(i: number) { if (!savingOrder.value) dragOverIndex.value = i }
function onDragEnd() { dragIndex.value = null; dragOverIndex.value = null }

// GLOBAL reposition — used by BOTH drag-drop and the manual Order input. `position`
// is the 0-based target across the WHOLE portal (all pages). The backend re-sequences
// every FAQ's sort_order 0..n-1, then we refetch so all order numbers refresh.
async function moveToPosition(item: any, position: number) {
  if (savingOrder.value || !item?.id) return
  savingOrder.value = true
  savingId.value = item.id
  try {
    await $api.post('/faqs/reorder', {
      portal_type: portalType.value,
      id: item.id,
      position: Math.max(0, Math.floor(position) || 0),
    })
    await fetchData()          // reload so every global order number updates
    $toast('Order updated')
  } catch (e) {
    $toast('Could not save order. Please try again.', 'error')
    await fetchData()          // revert to the server's order on failure
  } finally {
    savingOrder.value = false
    savingId.value = null
  }
}

async function onDrop(i: number) {
  const from = dragIndex.value
  dragIndex.value = null
  dragOverIndex.value = null
  if (savingOrder.value || from === null || from === i) return
  const moved = getDataList.value[from]
  if (!moved) return
  // Global target = page offset + drop position within this page.
  const targetPos = (data_page_current.value - 1) * limit_data.value + i
  await moveToPosition(moved, targetPos)
}

// Manual "Order" number input — shown 1-based (first = 1). Convert to the 0-based
// global position the backend uses. Commit on blur/enter.
async function onManualOrder(item: any, e: Event) {
  const val = parseInt((e.target as HTMLInputElement).value, 10)
  if (Number.isNaN(val)) return
  const pos = Math.max(0, val - 1)          // 1-based input → 0-based position
  const current = Number(item.sort_order ?? -1)
  if (pos === current) return               // no change
  await moveToPosition(item, pos)
}

const setTab = async (tab: string) => {
  filter_status.value  = tab
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
    const res:any = await $api.delete("/faqs/delete/"+id, { query: { portal_type: portalType.value } })
    const obj:any = res.data
    if (obj.status === 'success') {
        fullLoading.value = false
          const message = res?.data?.msg || 'Deleted successfully.';
         $toast(message);
        onSaved()
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

const openAddModal = () => {
  showModal.value = true;
}

// After any add / edit / import — refresh BOTH the list and the stat counts
// (counts previously only updated on mount/import, so the cards went stale).
const onSaved = async () => {
  await fetchAllCountData()
  await fetchData()
}

// Import FAQs from Google Sheet
const showImportSheet = ref<boolean>(false)
const openImportSheet = () => { showImportSheet.value = true }
const onImportSheetSaved = onSaved

const getDetail = ref<any>(null)
const showEditModal = ref<boolean>(false)
const onClickQEdit=(detail:any)=>{
   getDetail.value=detail;
   showEditModal.value=true;
}

const stats = ref({ all_total: 0,total_active: 0, total_draft: 0, total_archive: 0 })
const fetchAllCountData = async () => {
  try {
    const res:any = await $api.get("/faqs/counts", { query: { portal_type: portalType.value } })

      if (res?.data?.status === 'success') {
        const obj:any = res.data;
        stats.value = obj
    }else{
    stats.value.all_total=0;
    stats.value.total_active=0;
    stats.value.total_draft=0;
    stats.value.total_archive=0;
    }
  } catch (err:any) {
    stats.value.all_total=0;
    stats.value.total_active=0;
    stats.value.total_draft=0;
    stats.value.total_archive=0;
  }
}

watch(filter_status,async (val) => {
    data_page_current.value = 1;
    await fetchData();
})

// Switch portal tab → reset paging and reload that portal's list + counts.
watch(portalType, async () => {
    data_page_current.value = 1;
    pageCurnt.value = 1;
    await fetchAllCountData();
    await fetchData();
})

onMounted(() => {
  fetchAllCountData()
  fetchData()
})

watch(pageCurnt, (newPage) => {
  data_page_current.value = newPage
  fetchData()
})

</script>

<template>

  <Loading v-if="fullLoading" />
  
<div class="dashwrap">

  <!-- HEADER -->
  <div class="section-hdr">
    <div class="section-hdr-left">
      <div class="page-sub">
        {{ portalType === 'student' ? 'Student Portal FAQs' : portalType === 'institute' ? 'Institute Portal FAQs' : 'Public Site FAQs (home page + /faqs)' }} Manage
      </div>
    </div>

     <div class="section-hdr-right" style="display:flex;gap:8px">
      <button class="btn btn-outline btn-sm" @click="openImportSheet">
        Import from Sheet
      </button>
      <button class="btn btn-primary btn-sm" @click="openAddModal">
        Add FAQs
      </button>
    </div>
  </div>

  <!-- PORTAL TABS (Home / Student / Institute) -->
  <FaqTabs v-model="portalType" />

  <!-- Source clarity: each tab feeds a DIFFERENT surface. The two public FAQ blocks
       (home-page teaser + /faqs page) are BOTH powered by the Home tab; Student /
       Institute go to their portal help centers, never the public marketing site. -->
  <div class="faq-source-hint"
    style="display:flex;gap:8px;align-items:flex-start;margin:0 0 16px;padding:10px 14px;border:1px solid var(--border,#e2edf4);border-left:3px solid var(--teal,#06b6d4);border-radius:8px;background:var(--white,#fff);font-size:0.8rem;line-height:1.5;color:var(--ink-mid,#475569)">
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex:none;margin-top:2px;color:var(--teal,#06b6d4)"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
    <span v-if="portalType === 'home'">
      <strong>Public site FAQs.</strong> These power the marketing website — the <strong>home page</strong> shows the top 10 (by sort order) and the <strong>/faqs page</strong> shows all of them, grouped by category. Both public FAQ blocks read from this one tab.
    </span>
    <span v-else-if="portalType === 'student'">
      <strong>Student portal help center.</strong> Shown inside the <strong>student portal</strong> only — these do <strong>not</strong> appear on the public marketing site.
    </span>
    <span v-else>
      <strong>Institute portal help center.</strong> Shown inside the <strong>institute portal</strong> only — these do <strong>not</strong> appear on the public marketing site.
    </span>
  </div>

   <!-- cards -->
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
          {{ stats.all_total }}
        </div>
        <div class="stat-label">All</div>
      </div>

      <div class="stat-card q-stat-btn"
           :class="{ active: filter_status === 'approved' }"
           style="cursor:pointer"
           @click="setTab('1')">
        <div class="stat-card-top">
          <div class="stat-icon green">
            <svg fill="none" height="14" stroke="currentColor" stroke-linecap="round"
                 stroke-width="2.5" viewBox="0 0 24 24" width="14">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
        </div>
        <div class="stat-num" style="font-size:1.4rem">{{ stats.total_active }}</div>
        <div class="stat-label">Approved (Overwritten)</div>
      </div>

       <div class="stat-card q-stat-btn"
           :class="{ active: filter_status === 'pending' }"
           style="cursor:pointer"
           @click="setTab('0')">
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
          {{ stats.total_draft }}
        </div>
        <div class="stat-label">Draft</div>
      </div>

      <div class="stat-card q-stat-btn"
           :class="{ active: filter_status === 'rejected' }"
           style="cursor:pointer"
           @click="setTab('2')">
        <div class="stat-card-top">
          <div class="stat-icon red">
            <svg fill="none" height="14" stroke="currentColor" stroke-linecap="round"
                 stroke-width="2.5" viewBox="0 0 24 24" width="14">
              <line x1="18" x2="6" y1="6" y2="18"></line>
              <line x1="6" x2="18" y1="6" y2="18"></line>
            </svg>
          </div>
        </div>
        <div class="stat-num" style="font-size:1.4rem">{{ stats.total_archive }}</div>
        <div class="stat-label">Archive</div>
      </div>

    </div>

  <!-- FILTER -->
  <div class="filter-bar">
    <select  class="filter-input filter-select form-select"
      v-model="filter_status">
       <option value="all">All</option>
        <option value="0">Draft</option>
        <option value="1">Published</option>
        <option value="2">Archive</option>
      </select>
  </div>

  <!-- PAGINATION -->
  <Pagination
    v-model:page="pageCurnt"
    :totalData="total_data" 
    :totalPages="totalPages"
  />

  <!-- TABLE -->
  <div class="card">
    <div class="table-wrap">

        <table class="CategoryTable">
          <thead>
            <tr>
              <th>No.</th>
              <th>Order</th>
              <th>FAQs ID</th>
              <th>Question</th>
              <th>Answer</th>
              <th>Status</th>
             
              <th>Action</th>
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
            <tr v-for="(item, i) in getDataList" :key="item.id"
              :draggable="!savingOrder"
              @dragstart="onDragStart(i, $event)"
              @dragover.prevent="onDragOver(i)"
              @drop="onDrop(i)"
              @dragend="onDragEnd"
              :style="{ borderTop: dragOverIndex === i && dragIndex !== i ? '2px solid #06b6d4' : '', opacity: dragIndex === i ? '0.5' : '1', cursor: savingOrder ? 'progress' : 'move' }">
              <td>
                <!-- Reorder in flight for THIS row → small spinner; otherwise a drag handle. -->
                <svg v-if="savingId === item.id" width="14" height="14" viewBox="0 0 24 24" style="vertical-align:middle;margin-right:6px" title="Saving order…">
                  <circle cx="12" cy="12" r="9" fill="none" stroke="#e2e8f0" stroke-width="3"/>
                  <path d="M12 3 a9 9 0 0 1 9 9" fill="none" stroke="#06b6d4" stroke-width="3" stroke-linecap="round">
                    <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.7s" repeatCount="indefinite"/>
                  </path>
                </svg>
                <span v-else title="Drag to reorder" :style="{ cursor: savingOrder ? 'progress' : 'grab', userSelect: 'none', color: '#94a3b8', marginRight: '6px' }">⠿</span>
                {{i+1}}
              </td>
             <td>
               <!-- Manual global order (1-based; first = 1). Type a number → item jumps
                    to that position across ALL pages and everything re-sequences. -->
               <input type="number" min="1" draggable="false"
                 :value="Number(item.sort_order ?? 0) + 1"
                 :disabled="savingOrder"
                 @change="onManualOrder(item, $event)"
                 @keyup.enter="onManualOrder(item, $event)"
                 @mousedown.stop
                 style="width:60px;padding:4px 6px;border:1px solid #e2e8f0;border-radius:6px;font-size:13px"
                 title="Global order (1 = first). Type a number and press Enter to move." />
             </td>
             <td>#{{ item.id }}</td>
             <td>{{ item.question??'-' }}</td>
              <td>{{ item.answer??'-' }}</td>
               <td>
                  <span v-if="Number(item.status) === 1" class="badge badge-green">Published</span>
                  <span v-else-if="Number(item.status) === 2" class="badge badge-archived">Archive</span>
                  <span v-else class="badge badge-gray">Draft</span>
                </td>

              <td>
              <button 
              class="actTdbtn btn btn-outline btn-sm btn-icon btnQEdit"
              type="button"
              @click="onClickQEdit(item)">
              <svg fill="none" height="12" stroke="currentColor" stroke-linecap="round" 
              stroke-width="2.5" viewBox="0 0 24 24" width="12">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              </button>
              <button 
              @click="confirmDelete(item.id)"
              class="actTdbtn btn btn-danger btn-sm btn-icon"
              type="button">
              <svg fill="none" height="12" stroke="currentColor" stroke-linecap="round"
              stroke-width="2.5" viewBox="0 0 24 24" width="12">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6l-1 14H6L5 6"></path>
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
<AddModal
  v-model="showModal"
  :portal-type="portalType"
  @saved="onSaved"
/>
<!-- MODAL -->
<EditModal
  v-model="showEditModal"
  :portal-type="portalType"
  @saved="onSaved"
  :detail="getDetail"
/>

<!-- Import from Google Sheet -->
<ImportSheetModal
  v-if="showImportSheet"
  v-model="showImportSheet"
  @saved="onImportSheetSaved"
/>

</template>