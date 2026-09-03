<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import Multiselect from '@vueform/multiselect'
import Loader_small from '@/components/loaders/Loader_small.vue'
import Empty from '@/components/loaders/Empty.vue'
import Pagination from '@/components/Pagination.vue'

import EditExamModal from '@/components/exams/EditExamModal.vue'
import AddExam from '@/components/exams/AddExam.vue'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
});

const { $api,$toast,$confirm } = useNuxtApp()
const detailsExam = ref<any>(null);

const page = ref(1)
const totalPages = ref(1)
const total_draft = ref(0)
const total_live = ref(0)
const all_count = ref(0)
const total_service_training= ref(0)
const total_board = ref(0)
const total_shelf  = ref(0)

const total_archive = ref(0)
const total_institution = ref(0)

const getDataList = ref<any[]>([])
const data_loading = ref(false)

// modal
const showModal = ref(false)
const showDetailModal = ref(false)

const openAddExamModal = () => {
  showModal.value = true;
}

const onClickDetailModal = (dlts:any) => {
    detailsExam.value=dlts;
  showDetailModal.value = true
}

// Drill-down: open the Users list pre-filtered to THIS exam's subscribers. The users
// page reads ?exam=<id> on mount and applies it to its exam filter (valueProp="id").
const viewSubscribers = (examId:any) => {
  navigateTo({ path: '/dashboard/users', query: { exam: String(examId) } })
}
const tiggerfetchdata=()=>{
 fetchData();
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
    const res:any = await $api.delete("/exams/delete/"+id)
    const obj:any = res.data||{};
    if (obj.status === 'success') {
        const message = obj?.msg || 'delete is success'
        $toast(message,'success');
        tiggerfetchdata()
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

const callbackSaved = (elemen:any) => {
  fetchData()
}


// =========================
// FETCH DATA
// =========================
const data_page_current = ref(1)
const total_data = ref(0)
const limit_data = ref(500)
const fetchData = async () => {
  data_loading.value = true

  try {
    const res:any = await $api.post("/exams", {
      page: data_page_current.value,
      type: activeTab.value,
      category_id: filterCategory.value,
      limit: limit_data.value
    })

    const obj:any = res.data

    if (obj.status === 'success') {

      total_data.value = obj.total
      totalPages.value = Math.ceil(obj.total / obj.limit)
      page.value = obj.current_page

      //  transform data
      getDataList.value = obj.data.map((u:any) => ({
        ...u,
        gradyr: u.student_detail?.grad_year || '-',
        inst: u.student_detail?.institution || '-',
        exam: u.student_detail?.exam_id || '-',
        expires: u.student_detail?.expiry_date || '-',
        plan: u.student_detail?.plan || '-'
      }))

    } else {
        getDataList.value = []
        total_archive.value = 0
        all_count.value = 0
        total_data.value = 0
        total_draft.value = 0;
        total_live.value =0;
        total_service_training.value =0;
        total_board.value =0;
        total_shelf.value = 0;
    }

  } catch (err) {
   
    getDataList.value = []
    all_count.value =0
    total_archive.value = 0
    total_data.value = 0
    total_draft.value = 0;
    total_live.value =0;

    total_service_training.value =0;
    total_board.value =0;
    total_shelf.value = 0;

  } finally {
    data_loading.value = false
  }
}

const fetchAllCountData = async () => {
  try {
    // Global per-type totals (never category-filtered). The active tab's category-aware
    // count is shown from total_data instead, so only the active tab reflects the category.
    const res:any = await $api.get("/exams/counts")

    const obj:any = res.data||{}
    if(obj.status === 'success'){
            all_count.value = obj.all_total
            total_draft.value = obj.total_draft;
            total_live.value = obj.total_published;
            total_service_training.value = obj.total_service_training;
            total_board.value = obj.total_board;
            total_shelf.value = obj.total_shelf;
            total_archive.value = obj.total_archive ?? 0;
            total_institution.value = obj.total_institution ?? 0;
    }else{
        all_count.value =0;
        total_draft.value =0;
        total_live.value =0;
        total_service_training.value = 0;

        total_board.value =0;
        total_shelf.value = 0;
        total_institution.value = 0;
    }
  } catch (err:any) {
    all_count.value =0;
    total_draft.value =0;
    total_live.value =0;
    total_service_training.value = 0;

    total_board.value =0;
    total_shelf.value = 0;
    total_institution.value = 0;
  }
}

const activeTab = ref('all');
const onClickTabs=(eltab:string="all")=>{
    activeTab.value=eltab;
     fetchData();
}

// Tab count display:
//  • non-active tab            → its global total (never category-filtered)
//  • active tab, no category   → its global total (category='all' means no filter anyway)
//  • active tab, while loading → global total (placeholder — avoids a stale/0 flash from
//                                the async list total)
//  • active tab, category set  → total_data (the list total = active type + category)
const tabCount = (tabKey:string, globalVal:any) => {
  if (activeTab.value !== tabKey) return globalVal ?? 0
  if (filterCategory.value === 'all' || data_loading.value) return globalVal ?? 0
  return total_data.value
}

// ── Category filter ──────────────────────────────────────────────────────────
const filterCategory = ref<any>('all')
const categoryOptions = ref<any[]>([{ id: 'all', name: 'All Categories' }])

const fetchCategoryOptions = async () => {
  try {
    const res:any = await $api.get('/exams-categories/list')
    const list = res?.data?.data ?? []
    categoryOptions.value = [
      { id: 'all', name: 'All Categories' },
      ...list.map((c:any) => ({ id: c.id, name: c.name })),
    ]
  } catch {
    categoryOptions.value = [{ id: 'all', name: 'All Categories' }]
  }
}

watch(filterCategory, (val) => {
  // Selecting "All Categories" returns to the All tab (it shows every exam).
  if (val === 'all') activeTab.value = 'all'
  data_page_current.value = 1
  fetchData()
})

// Conversion = all-time subscribers / views, capped at 100% (can't exceed 100%;
// test data often has more subs than tracked views, which would overshoot).
const conversionPct = (vl:any) => {
  const views = Number(vl?.views || 0)
  const subs  = Number(vl?.all_time_subs || 0)
  if (!views) return '0'
  const pct = Math.min(100, (subs / views) * 100)
  return pct.toFixed(1)
}

const onClickPreviewUrl=async(itm:string='')=>{
    let url =  baseUrl(`/exam/${itm}`);
    if (!url.startsWith('http')) {
      url = `https://${url}`;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
}

watch(page, (newPage) => {
  data_page_current.value = newPage
  fetchData()
});


const previewUrl=(slug:any='',type:any='custom')=>{
    return baseUrl()+'/exam/'+slug;
}

onMounted(() => {
    fetchAllCountData();
});
onMounted(() => {
    fetchData();
});
onMounted(() => {
    fetchCategoryOptions();
});

</script>

<template>

<div class="dashwrap">
    <div class="section-hdr">

        <div class="section-hdr-left">
            <p>{{ total_live }} live exam pages · {{ total_draft }} draft</p>
        </div>

        <div class="section-hdr-right">
            <button v-if="canEdit('exams')" class="btn btn-primary btn-sm"
             type="button"  @click="openAddExamModal">
            <svg fill="none" height="13" stroke="currentColor" stroke-linecap="round" stroke-width="2.5" viewBox="0 0 24 24" width="13"><line x1="12" x2="12" y1="5" y2="19"></line><line x1="5" x2="19" y1="12" y2="12"></line></svg>
            New Exam
          </button>
        </div>
    </div>
   
    <!-- Exam type tabs -->
    <div style="display:flex;gap:6px;margin-bottom:16px">
            <button class="exam-tab" type="button"
            :class="{ 'active-tab': activeTab === 'all' }"
            @click="onClickTabs('all')">
            All ({{ tabCount('all', all_count) }})
        </button>
        <button class="exam-tab" type="button"
         :class="{ 'active-tab': activeTab === 'shelf' }"
        @click="onClickTabs('shelf')"
        >
         Shelf Exams ({{ tabCount('shelf', total_shelf) }})
        </button>
        <button class="exam-tab" type="button"
        :class="{ 'active-tab': activeTab === 'board' }"
        @click="onClickTabs('board')"
        >
         Board Exams ({{ tabCount('board', total_board) }})
        </button>
        <button class="exam-tab" type="button"
        :class="{ 'active-tab': activeTab === 'in-service-and-training' }"
        @click="onClickTabs('in-service-and-training')"
        >
        In-Service / Training ({{ tabCount('in-service-and-training', total_service_training) }})
        </button>

        <button class="exam-tab" type="button"
        :class="{ 'active-tab': activeTab === 'archive' }"
        @click="onClickTabs('archive')"
        >
          Archive ({{ tabCount('archive', total_archive) }})
        </button>

        <button class="exam-tab" type="button"
        :class="{ 'active-tab': activeTab === 'draft' }"
        @click="onClickTabs('draft')"
        >
            Draft ({{ tabCount('draft', total_draft) }})
        </button>

        <!-- Institution-created exams, kept out of the PassMed tabs above. -->
        <button class="exam-tab" type="button"
        :class="{ 'active-tab': activeTab === 'institution' }"
        @click="onClickTabs('institution')"
        >
            Institutional Pool ({{ tabCount('institution', total_institution) }})
        </button>

        <!-- Category filter (inline, after Draft tab) -->
        <div style="min-width:220px;margin-left:auto">
          <Multiselect
            v-model="filterCategory"
            :options="categoryOptions"
            label="name"
            valueProp="id"
            :can-clear="false"
            :searchable="true"
            placeholder="Filter by category"
          />
        </div>
    </div>

    <div id="examList">
        <div v-if="data_loading || getDataList.length === 0">
           <Empty v-if="!data_loading && getDataList.length === 0"/>
           <Loader_small v-else />
        </div>
        
        <div v-else>

        <div 
         v-for="(vl, ky) in getDataList"
          :key="vl.id"
           
            class="page-row examrow" :data-type="vl.type??'shelf'">

            <div v-if="vl.type == 'shelf'" class="page-row-icon" style="color:var(--amber)">
                <svg fill="none" height="14" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" width="14">
                    <path d="M4 19.5A2.5 2.5 0 016.5 17H20"></path>
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"></path>
                </svg>
            </div>

            <div v-else-if="vl.type == 'in-service-and-training'" class="page-row-icon" style="color:var(--amber)">
               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" 
               stroke-width="2" stroke-linecap="round">
               <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"></path>
              </svg>
            </div>

            <div v-else-if="vl.type == 'board'" class="page-row-icon" style="color:var(--teal)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 6v6l4 2"></path>
              </svg>
            </div>

            <div v-else class="page-row-icon" style="color:var(--teal)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" 
              stroke-width="2" stroke-linecap="round">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"></path>
              </svg>
            </div>

            <div class="page-row-info">
                <div class="page-row-title">
                  {{ vl.name }}
                  <!-- Institutional Pool: show which institution owns this exam. -->
                  <span v-if="vl.institution && vl.institution.length" class="badge badge-teal"
                    style="margin-left:8px;font-size:0.66rem;vertical-align:middle;">
                    {{ vl.institution[0].institution_name }}
                  </span>
                </div>
                <div class="page-row-url">
                 {{ previewUrl(vl.slug,vl.type)}}
                </div>
            </div>

            <span class="badge"
              :class="vl.status == 1 ? 'badge-green' : vl.status == 2 ? 'badge-gray' : 'badge-amber'"
            >
             {{ vl.status == 1 ? 'Live' : vl.status == 2 ? 'Archived' : 'Draft' }}
            </span>

            <div class="page-row-stats">
                <button
                @click="onClickPreviewUrl(vl.slug)"
                class="btn btn-outline btn-sm btn-icon btnQview"
                type="button">
                <svg fill="none" height="12" stroke="currentColor" stroke-linecap="round"
                stroke-width="2.5" viewBox="0 0 24 24" width="12">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
                </svg>
                </button>

                <button
                @click="viewSubscribers(vl.id)"
                class="btn btn-outline btn-sm btn-icon"
                type="button"
                title="View subscribers">
                <svg fill="none" height="12" stroke="currentColor" stroke-linecap="round"
                stroke-linejoin="round" stroke-width="2.5" viewBox="0 0 24 24" width="12">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
                </button>

                   <button v-if="vl.status != '4'"
                @click="onClickDetailModal(vl)"
                class="btn btn-green btn-sm btn-icon"
                type="button">
                    <svg fill="none" height="12" stroke="currentColor" stroke-linecap="round" 
                    stroke-width="2.5" viewBox="0 0 24 24" width="12">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                </button>
                <button v-if="vl.status != '4' && canEdit('exams')"
                @click="confirmDelete(vl.id)"
                class="btn btn-danger btn-sm btn-icon"
                type="button">
                <svg fill="none" height="12" stroke="currentColor" stroke-linecap="round"
                stroke-width="2.5" viewBox="0 0 24 24" width="12">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6l-1 14H6L5 6"></path>
                </svg>
                </button>

                <div class="page-stat">
                    <div class="page-stat-num">
                         {{ vl.views || '—' }}
                        </div>
                    <div class="page-stat-label">Views</div>
                </div>
                <div class="page-stat">
                    <div class="page-stat-num">{{ conversionPct(vl) }}%</div>
                    <div class="page-stat-label">Conversion</div>
                </div>
                <div class="page-stat">
                    <div class="page-stat-num">
                       {{ vl.total_question??"0" }}
                    </div>
                    <div class="page-stat-label">Questions</div>
                </div>
                <div class="page-stat">
                    <div class="page-stat-num" style="color:var(--green)">
                     {{ vl.active_subs || 0 }}
                    </div>
                    <div class="page-stat-label">Active Subs</div>
                </div>
                <div class="page-stat">
                    <div class="page-stat-num">{{ vl.all_time_subs ?? 0 }}</div>
                    <div class="page-stat-label">All-Time</div>
                </div>

                <div class="page-stat">
                    <div class="page-stat-num" style="color:var(--ink-dim)">0</div>
                    <div class="page-stat-label">Flagged</div>
                </div>
            </div>
        </div>

        <Pagination v-if="totalPages > 1"
        v-model:page="page"
        :totalPages="totalPages"
        :totalData="total_data" 
        elmntName="Exams"
        />
        </div>
    </div>
</div>
<!-- MODAL -->
<AddExam 
 v-if="showModal"
  v-model="showModal"
  @examSaved="callbackSaved"
/>
<EditExamModal 
    v-if="showDetailModal"
  v-model="showDetailModal"
    :details="detailsExam"
    @saved="callbackSaved"
  />

</template>