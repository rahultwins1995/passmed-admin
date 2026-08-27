<script setup lang="ts">
import Multiselect from '@vueform/multiselect'
import AddQuestionModal from '@/components/questions/AddQuestionModal.vue';
import EditQuestionModal from '@/components/questions/EditQuestionModal.vue';
import Loading from '@/components/loaders/Loading.vue'
import Loader_small from '@/components/loaders/Loader_small.vue'
import Empty from '@/components/loaders/Empty.vue'
import { ref, onMounted, watch, onBeforeUnmount, computed } from 'vue'
import Pagination from '@/components/Pagination.vue'
import ApprovalQuestion from '@/components/ApprovalQuestion.vue'
import HistoryQuestionModal from '@/components/questions/HistoryQuestionModal.vue'
import ImportQuestionModal from '@/components/imports/ImportQuestionModal.vue';

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

const auth = useAuthStore();

const showModal = ref(false)
const showEditModal = ref(false)
const openAddModal = () => {
  showModal.value = true;
}

const { $toast,$api,$confirm } = useNuxtApp()

const pageCurnt = ref(1)
const totalPages = ref(1)
const data_page_current = ref(1)

const total_data = ref<string|number>(0)
const all_total = ref<string|number>("0")
const total_archive = ref<string|number>("0")
const total_draft = ref<string|number>("0")
const total_flagged = ref<string|number>("0")
const total_published = ref<string|number>("0")
const total_to_approve = ref<string|number>("0")
const total_deleted = ref<string|number>("0")

const limit_data = ref(10)
const getDataList = ref<any[]>([])

// Click-to-sort state for the question-bank table. Empty column → backend default
// (newest first). Sorting is server-side (orders the whole filtered set, not just
// the current page), so changing it re-fetches from page 1.
const sortColumn    = ref('')
const sortDirection = ref<'asc' | 'desc'>('desc')
const onClickSortBy = (col: string) => {
  if (sortColumn.value === col) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortColumn.value = col
    sortDirection.value = 'asc'
  }
  data_page_current.value = 1
  fetchData()
}
// Arrow glyph for a sortable header: ↑/↓ for the active column, ↕ otherwise.
const sortArrow = (col: string) =>
  sortColumn.value === col ? (sortDirection.value === 'asc' ? '↑' : '↓') : '↕'

// Show/hide-column panel for the question-bank table.
const colPanel = ref(false)
const toggleColPanel = () => { colPanel.value = !colPanel.value }
const showCols = ref<Record<string, boolean>>({
  last_updated:     true,
  exam:             true,
  qid:              true,
  subject:          true,
  difficulty:       true,
  learning_outcome: true,
  status:           true,
  avg_score:        true,
  attempts:         true,
})
const columnLabels: Record<string, string> = {
  last_updated:     'Last updated',
  exam:             'Exam',
  qid:              'QID',
  subject:          'Subject',
  difficulty:       'Level',
  learning_outcome: 'Learning Outcome',
  status:           'Status',
  avg_score:        'Avg score',
  attempts:         'Attempt',
}

// Which row's actions "⋯" menu is open (null = none). Closed by the backdrop click.
// The menu is teleported to <body> with a fixed position (computed from the button)
// so the table's horizontal scroll can never clip it.
const openMenuId = ref<any>(null)
const menuPos = ref<{ top: number; left: number }>({ top: 0, left: 0 })
const menuRow = computed<any>(() => getDataList.value.find((q:any) => q.id === openMenuId.value) || null)
function openRowMenu(ev: MouseEvent, id: any) {
  if (openMenuId.value === id) { openMenuId.value = null; return }
  const r = (ev.currentTarget as HTMLElement).getBoundingClientRect()
  const W = 176
  menuPos.value = { top: r.bottom + 4, left: Math.max(8, r.right - W) }
  openMenuId.value = id
}
const data_loading = ref(false)

const route = useRoute()
const fullLoading=ref<boolean>(false);
const input_search = ref<string>('')
const filterDifficulty = ref<string>('all')
const filter_status = ref<string>('all')
const questionId=ref<string|number>(0)
const activeTab = ref("all");

const qstnDetail = ref<any>(null)
const onClickQEdit=(detail=null)=>{
  if(!canEdit('question_bank')){
    $toast('Sorry you have no permission.');
    return
  }

   qstnDetail.value=detail;
   showEditModal.value=true;
}
const showHistoryModal=ref<boolean>(false);
// questionId stays the internal id — every endpoint is keyed on it. questionQid is
// carried alongside purely so the modals can SHOW the QID, which is the number the
// admin recognises and can trace back to the import sheet.
const questionQid=ref<any>('');
const onClickQHistory=(id="0", qid:any='')=>{
  questionId.value=id;
  questionQid.value=qid;
  showHistoryModal.value=true;
}

/***
 * Import show Question
*/
const showImportQuestionModal=ref<boolean>(false);
const onClickQImport=()=>{
  // Fresh "Import" click → drop any "View last import result" snapshot so the modal
  // opens on the upload FORM, not the previous summary. If an import is actually
  // running, the poller owns detailProgress — leave it so live progress still shows.
  if (!importStopProgress.value) {
    detailProgress.value = null;
  }
  showImportQuestionModal.value = true;
}

const importStopProgress=ref<boolean>(false);
const importCreatedRow = ref<number>(0)
  const detailProgress = ref<any>(null)
const progressTrigger=(start:boolean=false)=>{
    if(start){
      importStopProgress.value=true;
      startProgressPolling();
    }else{
      importStopProgressPolling();
      importStopProgress.value=false;
      detailProgress.value=null;
      importCreatedRow.value=0;
    }
    
} 
const importStopProgressPolling=()=>{
  if(progressTimer){
    clearInterval(progressTimer)
    progressTimer = null;
   }
}

let progressTimer: ReturnType<typeof setInterval> | null = null;
// Guards: `pollInFlight` stops overlapping polls from stacking (a slow fetchData
// let the 1s interval fire again → multiple reloads). `importDone` latches so the
// completion refresh (savedCallBack/fetchData) runs exactly ONCE.
let pollInFlight = false;
let importDone   = false;
// Separate throttles while an import runs.
//
// The cards were briefly driven by an estimate — a baseline snapshot taken when
// polling began, plus the per-status deltas the progress poll already carries.
// It matched the modal exactly and cost no query, but it assumed we knew the
// state BEFORE this import, and that assumption broke twice:
//
//   • with a filter applied, the baseline was filter-scoped while the deltas were
//     import-wide totals, so the cards drifted far above the filtered list;
//   • leaving the page and coming back re-ran the capture mid-import, so rows
//     already imported were counted once in the baseline and again in the delta —
//     the cards doubled.
//
// Both come from the same root: the "before" state isn't knowable on remount or
// under a filter. So the cards now always read the real aggregate. It is a light
// query (one row), polled at ~1s — a touch behind the modal, but never wrong. The
// LIST is the expensive one (4 withCount subqueries + eager loads per row) and
// stays on a slower throttle.
let lastCountRefresh = 0;
let lastListRefresh  = 0;
// First live list refresh shows the skeleton; after that the list updates silently.
let liveListRefreshedOnce = false;

 const startProgressPolling =async () => {
  if(progressTimer){
    importStopProgressPolling();
  }

  let intervalTime = 1000;

  // Returns true when polling should stop (done / failed / nothing to track).
  const pollOnce = async (): Promise<boolean> => {
    try {
      const res: any = await $api.get('/imports/progress')
      const obj = res?.data || {};
      const pdata = obj?.data || {};

      // No import row to track → stop quietly.
      if (!pdata || pdata.status === undefined || pdata.status === null) {
        importStopProgress.value = false;
        importCreatedRow.value = 0;
        detailProgress.value = null;
        return true;
      }

      const importStatus        = Number(pdata.status);          // 0=processing,1=done,2=fail,3=cancel
      const importCountProgress = Number(pdata?.progress ?? 0);

      // NOTE: the progress number and the stat cards are published TOGETHER further
      // down (see applyProgressSnapshot). They used to be written at different
      // moments — the progress figure the instant this response arrived, the cards
      // whenever their own query happened to return — so the two disagreed for a
      // beat on every tick and the header visibly jumped. Nothing is shown until
      // both are in hand.
      const applyProgressSnapshot = () => {
        importCreatedRow.value = Number(pdata?.created_row ?? 0);
        detailProgress.value   = pdata;
      };

      // ── Completed ──────────────────────────────────────────────
      // ONLY treat status=1 (backend's truly-done signal) as complete. Do NOT trigger
      // on progress >= 100: progress is round(created_row/total_row*100), so it rounds
      // up to 100 at ~99.5% — firing the completion summary a moment early, before the
      // last rows are counted (the "2198 then 2209 on reopen" glitch). Keep polling
      // until status flips to 1, by which point imported_published is final.
      if (obj.status === 'success' || importStatus === 1) {
        importStopProgress.value = false;
        applyProgressSnapshot();
        // Remember the finished snapshot so the "View last import result" button
        // can reopen this summary later (survives logout / refresh / navigation).
        if (pdata?.summary) {
          lastImportSnapshot.value = pdata;
          hasLastImportSummary.value = true;
        }
        // Keep detailProgress = pdata (with status=1 + summary) so the modal
        // can render the summary box. Refresh the list/counts — but only ONCE
        // (latched), otherwise repeated polls keep reloading the list.
        if (!importDone) {
          importDone = true;
          await savedCallBack();
        }
        return true;
      }

      // ── Failed / cancelled ─────────────────────────────────────
      if (obj.status === 'error' || obj.status === 'cancelled' || importStatus === 2 || importStatus === 3) {
        importStopProgress.value = false;
        importCreatedRow.value = 0;
        detailProgress.value = null;
        // A cancelled import still leaves behind whatever rows it committed.
        fetchAllCountData();
        $toast(obj.msg || (importStatus === 3 ? 'Import cancelled' : 'Import failed'), 'error');
        return true;
      }

      // else: still processing.
      const nowTs = Date.now();

      // Cards: the real aggregate, ~1s. AWAITED, so the progress figure below is
      // published in the same paint as the counts it belongs to — the header no
      // longer shows a new "Processing N" against the previous tick's totals.
      // Always correct too: filters applied, page revisited mid-import, whatever.
      if (nowTs - lastCountRefresh > 1000) {
        lastCountRefresh = nowTs;
        await fetchAllCountData();
      }

      // Counts are in — now show this tick's progress number alongside them.
      applyProgressSnapshot();

      // List: the expensive query, so a slower cadence. Not awaited — the rows
      // catching up a beat later doesn't create the mismatch the header did.
      if (nowTs - lastListRefresh > 4000) {
        lastListRefresh = nowTs;
        // First pass shows the skeleton; subsequent live passes update silently.
        fetchData(liveListRefreshedOnce);
        liveListRefreshedOnce = true;
      }
      return false;

    } catch (err:any) {
       importStopProgress.value = false;
       importCreatedRow.value =0;
       detailProgress.value=null;
       fetchAllCountData();
       return true;
    }
  };

  // New polling run → reset the completion latch + both refresh throttles so the
  // cards and list update on the first processing poll of this import.
  importDone = false;
  lastCountRefresh = 0;
  lastListRefresh  = 0;
  liveListRefreshedOnce = false;

  // Poll immediately (don't wait for the first interval) so the count updates ASAP.
  const done = await pollOnce();
  if (done) return;

  progressTimer = setInterval(async () => {
    if (pollInFlight) return;          // don't stack overlapping polls
    pollInFlight = true;
    try {
      const finished = await pollOnce();
      if (finished) importStopProgressPolling();
    } finally {
      pollInFlight = false;
    }
  }, intervalTime);
}

const stopProgressPolling = () => {
  
  if( fullLoading.value){
    fullLoading.value = false;
  }
 
  if (progressTimer) {
    clearInterval(progressTimer)
    progressTimer = null
    importStopProgress.value=false;
  }
}
onBeforeUnmount(() => {
  stopProgressPolling()
})

const onGoToApproveQueue=async()=>{
   showImportQuestionModal.value = false;
    setTab('4');
    fetchAllCountData();
    fetchData();
}

/*********** start **************/
const filter_exam = ref<string>('all')
const filterCategory = ref<string>('all')
const filterSubject = ref<string>('all')
const filterDomain = ref<string>('all')
const filterTag = ref<string>('all')
const filterDiscipline = ref<string>('all')
// Source filter: which pool the list/cards show. Default 'passmed' = the historical
// PassMed-only bank. 'institution'/'shared' surface institution-contributed questions.
const filterSource = ref<string>('passmed')

const { createFilterState, fetchOptions, makeOptions,attachScrollPagination} = useFilterOptions()

// state objects 
const examState       = createFilterState()
const categoryState   = createFilterState()
const subjectState    = createFilterState()
const domainState     = createFilterState()
const disciplineState = createFilterState()
const tagState        = createFilterState()

// Computed options
const examOptions       = makeOptions(examState,'All Exams','all')
const categoryOptions   = makeOptions(categoryState,'All Category','all')
const subjectOptions    = makeOptions(subjectState,'All Subject','all')
const domainOptions     = makeOptions(domainState,'All Domains','all')
const disciplineOptions = makeOptions(disciplineState,'All Discipline','all')
const tagOptions        = makeOptions(tagState,'All Tags','all')

// Parallel load
// ── Learning Outcome + Difficulty vocabularies ───────────────────────────────
// Plain refs, not filter-state objects: these are short controlled lists (7 and 3
// values), so the infinite-scroll machinery the other dropdowns use is pointless here.
const learningOutcomeList = ref<any[]>([])
const difficultyList      = ref<any[]>([])

const fetchLearningOutcomes = async () => {
  try {
    const res: any = await $api.post('/learning-outcomes/list', { limit: 500 })
    learningOutcomeList.value = res?.data?.status === 'success' ? (res.data.data || []) : []
  } catch { learningOutcomeList.value = [] }
}

const fetchDifficulties = async () => {
  try {
    const res: any = await $api.post('/difficulties/list', { limit: 500 })
    difficultyList.value = res?.data?.status === 'success' ? (res.data.data || []) : []
  } catch { difficultyList.value = [] }
}

onMounted(() => {
  Promise.all([
    fetchOptions('/exams/list',       examState,       2000),
    fetchOptions('/categories/list',  categoryState,   2000),
    fetchOptions('/subjects/list',    subjectState,    2000),
    fetchOptions('/domains/list',     domainState,     500),
    fetchOptions('/disciplines/list', disciplineState, 500),
    fetchOptions('/tags/list',        tagState,        500),
    fetchLearningOutcomes(),
    fetchDifficulties(),
  ])

   // Scroll pagination
  const scrollConfigs = [
    { selector: '.multiexam-select-options',       endpoint: '/exams/list',       state: examState,       limit: 2000 },
    { selector: '.multiCategory-select-options',   endpoint: '/categories/list',  state: categoryState,   limit: 2000 },
    { selector: '.multiSubject-select-options',    endpoint: '/subjects/list',    state: subjectState,    limit: 2000 },
    { selector: '.multiDomain-select-options',     endpoint: '/domains/list',     state: domainState,     limit: 500  },
    { selector: '.multiDiscipline-select-options', endpoint: '/disciplines/list', state: disciplineState, limit: 500  },
    { selector: '.multiTag-select-options',        endpoint: '/tags/list',        state: tagState,        limit: 500  },
  ]

  scrollConfigs.forEach(({ selector, endpoint, state, limit }) => {
    attachScrollPagination(selector, endpoint, state, limit)
  })

})

/*********** end  **************/

const filterLearningOutCome = ref<string>('all');

// ── Flag-reason filter (Flagged / To Approve queues only) ─────────────────────
// Lets an admin work through ONE class of problem at a time — e.g. every
// "ANSWER does not match any option" in a single pass — instead of opening each
// question. The Review & Approve drawer then walks that filtered queue.
const filter_reason = ref<string>('all')
const flagReasonOptions = ref<{ reason: string; total: number }[]>([])
const flagReasonLoading = ref<boolean>(false)
// Only meaningful where questions actually carry import flags.
const showReasonFilter = computed(() => activeTab.value === '4' || activeTab.value === '3')

const fetchFlagReasons = async () => {
  flagReasonLoading.value = true
  try {
    const res: any = await $api.post('/questions/flag-reasons', { filter_exam: filter_exam.value })
    flagReasonOptions.value = res?.data?.data ?? []
  } catch {
    flagReasonOptions.value = []
  } finally {
    flagReasonLoading.value = false
  }
}

const fetchAllCountData = async () => {
  try {
    // Scope the stat cards to the SAME filtered set the list shows. Status/tab is
    // deliberately NOT sent — the cards are the status breakdown of this set.
    const res:any = await $api.post("/questions/counts", {
      filter_exam: filter_exam.value,
      filter_tags: filterTag.value,
      filter_category: filterCategory.value,
      filter_domain: filterDomain.value,
      filter_subject: filterSubject.value,
      filter_discipline: filterDiscipline.value,
      filter_difficulty: filterDifficulty.value,
      filter_learning: filterLearningOutCome.value,
      source: filterSource.value,
      search: input_search.value,
    })

    const obj:any = res.data

    all_total.value = obj.all_total
    total_archive.value =obj.total_archive
    total_draft.value = obj.total_draft
    total_flagged.value = obj.total_flagged
    total_published.value = obj.total_published
    total_to_approve.value= obj.total_to_approve
    total_deleted.value = obj.total_deleted ?? 0
      
  } catch (err) {
   
    all_total.value = 0
    total_archive.value =0
    total_draft.value =0
    total_flagged.value = 0
    total_published.value = 0
    total_to_approve.value=0
  }
}

/**
 * Request approval
*/
const onClickQsubmitForApproval=async(id="0")=>{
    fullLoading.value = true
    try {
    const res:any = await $api.post("/questions/update-status/"+id, {
    status:'4',
    })

    const obj:any = res.data
    if (obj.status === 'success') {
    tiggerfetchdata();
    $toast('Request approval successfully.');

    }else {
    $toast('Request approval is failed.');
    }

    } catch (err) {
   
    $toast('Request approval is failed.');
    } finally {
    fullLoading.value = false
    }
}

const showApprovalModal=ref<boolean>(false)
// Snapshot of the To-Approve rows currently in view. Handed to the Review &
// Approve drawer so Confirm can advance straight to the next flagged question
// instead of sending the reviewer back to the list every time.
const approvalQueue=ref<any[]>([])
// id → QID for the rows in that snapshot. The drawer navigates by internal id but
// has to SHOW the QID; taking it from the list we already hold avoids an extra
// request on every step through the queue.
const approvalQidMap=ref<Record<string, any>>({})
const onClickReviewApproval=(id="0")=>{
   questionId.value=id;
   const rows = (getDataList.value || []).filter((q:any) => String(q?.status) === '4')
   approvalQueue.value = rows.map((q:any) => Number(q?.id)).filter(Boolean)
   approvalQidMap.value = rows.reduce((acc:any, q:any) => {
     if (q?.id) acc[String(q.id)] = q.qid
     return acc
   }, {})
   showApprovalModal.value=true;
}

/**
 * unarchive 
*/
const unarchiveQuestion=async(id="0")=>{
    fullLoading.value = true
    try {
    const res:any = await $api.post("/questions/update-status/"+id, {
    status:'0',
    })

    const obj:any = res.data
    if (obj.status === 'success') {
    tiggerfetchdata();
    $toast('Request unarchive successfully.');

    }else {
    $toast('Request unarchive is failed.');
    }

    } catch (err) {
   
    $toast('Request unarchive is failed.');
    } finally {
    fullLoading.value = false
    }
}


const onClickPublish=async (id="0")=>{

    fullLoading.value = true

    try {
    const res:any = await $api.post("/questions/update-status/"+id, {
    status:'1',
    })

    const obj:any = res.data
    if (obj.status === 'success') {
    tiggerfetchdata();
    $toast('Request published successfully.');

    }else {
    $toast('Request published is failed.');
    }

    } catch (err) {
   
    $toast('Request published is failed.');
    } finally {
    fullLoading.value = false
    }

}

const tiggerfetchdata=()=>{
      fetchAllCountData();
      fetchData();
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
    const res:any = await $api.delete("/questions/delete/"+id)
    const obj:any = res.data
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

// Restore a soft-deleted question (undo of delete). Everything was preserved on
// delete, so it just re-appears in the bank + new sessions, still attached to all
// its old student sessions/stats/flags/notes.
const restoreQuestion = async (id="0") => {
  if(!id || id == '0'){ $toast('Restore failed','error'); return; }
  const confirmed = await $confirm('Restore this question? It will re-appear in the question bank and new sessions.')
  if(!confirmed) return;
  fullLoading.value = true
  try {
    const res:any = await $api.post("/questions/restore-deleted/"+id)
    const obj:any = res.data
    if (obj.status === 'success') {
      $toast(obj?.msg || 'Question restored','success');
      tiggerfetchdata()
    } else {
      $toast(res?.data?.msg || 'Restore failed','error');
    }
  } catch (err:any) {
    $toast(err?.response?.data?.msg || 'Restore failed','error');
  } finally {
    fullLoading.value = false
  }
}

const counQSelected=ref<any[]>([]);
// Header "select all" reflects whether every question on the CURRENT page is selected.
const selectedAll=computed(()=>{
  const ids=getDataList.value.map((q:any)=>q.id);
  return ids.length>0 && ids.every((id:any)=>counQSelected.value.includes(id));
});

const onClickQSelectAll=()=>{
  if(getDataList.value.length === 0){
    $toast('No data load.','error');
    return;
  }

  const pageIds=getDataList.value.map((q:any)=>q.id);
  if(selectedAll.value){
    // All current-page rows are selected → deselect the current page.
    counQSelected.value=counQSelected.value.filter((id:any)=>!pageIds.includes(id));
  }else{
    // Select every question on the current page (merge, no duplicates).
    counQSelected.value=Array.from(new Set([...counQSelected.value,...pageIds]));
  }
}

const onClickQSelect = (id: any) => {
  const index = counQSelected.value.indexOf(id)
  if (index === -1) {
    counQSelected.value.push(id)
  } else {
    counQSelected.value.splice(index, 1)
  }
}

const bulkUpdateStatus = async (status: string) => {

  if(getDataList.value.length===0){
    $toast('No data found')
    return
  }

  if (counQSelected.value.length === 0) {
    $toast('Please select at least one question')
    return;
  }

  fullLoading.value = true

  try {
      const selctdAll='0'; // act only on the explicitly selected (current-page) questions
     const res:any= await $api.post('/questions/bulkUpdate',{
       selectedAll: selctdAll,
       status: status,
       ids: counQSelected.value,
       });

      const obj:any = res.data??{};

      if (obj.status === 'success') {
         $toast('Bulk update successful');
          counQSelected.value = [];
          tiggerfetchdata();
      }else{
         $toast('Bulk update failed', 'error')
      } 

  } catch (err) {
   
      $toast('Bulk update failed', 'error')
  } finally {
    fullLoading.value = false
  }
}

const bulkDelete = async () => {

  if(getDataList.value.length===0){
    $toast('No data found')
    return
  }

  if (counQSelected.value.length === 0) {
    $toast('Please select at least one question');
    return
  }

   const confirmed = await $confirm('Are you sure you want to delete selected questions?')
  if (!confirmed) {
    return
  }

  fullLoading.value = true


  try {
    const selctdAll='0'; // act only on the explicitly selected (current-page) questions
    const res:any=await $api.delete('/questions/bulkDelete',{
       body: {
         selectedAll: selctdAll,
         status: activeTab.value,
         ids: counQSelected.value,
       }
     });

      const obj:any = res.data??{};

      if (obj.status === 'success') {
            const message = obj?.msg || 'Deleted successfully'
            $toast(message,'success');

              counQSelected.value = [];
            tiggerfetchdata();
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


const setTab =(tab:string) => {
  // The reason sub-filter only applies to Flagged (3) / To Approve (4). Clear it
  // HERE rather than leaving it to the activeTab watcher: that watcher is
  // registered after the filter_status one, so the list would already have been
  // refetched carrying the stale reason — and since /questions applies the reason
  // but /questions/counts does not, the tab could land on an empty list while its
  // stat card still showed the full count.
  if (tab !== '3' && tab !== '4' && filter_reason.value !== 'all') {
    filter_reason.value = 'all'
  }

  activeTab.value = tab;
  filter_status.value=tab;
}

// Monotonic id for the in-flight list request. Switching tab writes both
// activeTab and filter_status, and their watchers fire in registration order —
// so two /questions calls can be in the air at once. Without this guard the
// SLOWER (older) response wins and overwrites the correct rows, which is one way
// the list showed 0 while the stat card still read the full count.
let listRequestSeq = 0

const fetchData = async (silent = false) => {
  // silent = true → refresh the rows WITHOUT flipping the skeleton loader. Used by the
  // import live-refresh after its first pass, so the list updates quietly instead of
  // flashing the skeleton every few seconds.
  if (!silent) data_loading.value = true

  const seq = ++listRequestSeq

  try {
    const res:any = await $api.post("/questions", {
      search: input_search.value,
      filter_tags: filterTag.value,
      filter_category: filterCategory.value,
      filter_domain: filterDomain.value,
      filter_subject: filterSubject.value,
      filter_discipline: filterDiscipline.value,
      filter_difficulty: filterDifficulty.value,
      filter_exam: filter_exam.value,
      filter_learning: filterLearningOutCome.value,
      filter_reason: filter_reason.value,
      source: filterSource.value,
      status: filter_status.value,
      sort_by: sortColumn.value || '',
      sort_dir: sortDirection.value || 'desc',
      page: data_page_current.value,
      limit: limit_data.value
    })

    // A newer request has already been issued — this response is stale, drop it.
    if (seq !== listRequestSeq) return

    const obj:any = res.data

    if (obj.status === 'success') {
      total_data.value = obj.total
      totalPages.value = Math.ceil(obj.total / obj.limit)
      pageCurnt.value = obj.current_page
      getDataList.value = obj.data;
    } else {
      getDataList.value = []
      total_data.value = 0
    }

  } catch (err:any) {

    if (seq !== listRequestSeq) return

    // A failed list request used to blank the table silently — no toast, no
    // console, just "0 questions" while the stat cards still showed the real
    // count. That reads exactly like a filter bug and sent us chasing the wrong
    // thing. Surface it instead, and leave the previous rows on screen so a
    // transient 500/timeout doesn't wipe the view.
    const message = err?.response?.data?.msg || 'Could not load questions. Please try again.'
    $toast(message, 'error')
    logError('[questions] list request failed', err)
  } finally {
    if (seq === listRequestSeq && !silent) data_loading.value = false
  }
}

// Refresh the LIST *and* the stat cards. This runs after an import completes
// (the progress poller latches it), and after a question save / review-approve —
// previously only fetchData() ran, so the All / Published / Draft / Flagged /
// To Approve counts stayed stale until something else happened to reload them.
const savedCallBack=async(tems:any='')=>{
    await Promise.all([ fetchData(), fetchAllCountData() ])
}

// =========================
// WATCHERS
// =========================

watch(activeTab, () => {
  counQSelected.value = [];
})

const seartchTriggerFetchMode=(mode:any='search')=>{

     if (mode === 'search') {
    //reset filters
    filterCategory.value = "all"
    filterSubject.value = "all"
    filterDomain.value = "all"
    filterDiscipline.value = "all"
    filterTag.value = "all"
    filterDifficulty.value = "all"
    filter_exam.value = "all"
    filter_status.value = "all"
    filterLearningOutCome.value = "all"
  } else {
    // reset search 
    input_search.value = ""
  }
      data_page_current.value = 1;
      pageCurnt.value = 1;
      fetchData();
      // Cards must track the same filtered set (search OR filter mode both land here).
      fetchAllCountData();
}

// input search typing done
let timerinputsearch:any = null;
watch(input_search, (val) => {
  clearTimeout(timerinputsearch)
  timerinputsearch = setTimeout(() => {
    if(val.trim() !== ""){
       seartchTriggerFetchMode('search');
    } else {
       // input cleared → reset list back to unsearched
       data_page_current.value = 1;
       pageCurnt.value = 1;
       fetchData();
       fetchAllCountData();
    }
  }, 800)
});

watch([
  filterCategory,filterLearningOutCome, filterSubject,
  filterDomain, filterDiscipline, filterTag,
  filterDifficulty, filter_exam, filter_status, filterSource
], () => {
       input_search.value = ""
     seartchTriggerFetchMode('filter');
})

watch(pageCurnt, (newPage, oldPage) => {
  if(newPage !== oldPage && oldPage !== undefined){
    data_page_current.value = newPage
    fetchData()
  }
})

// Page-size change → back to page 1 and refetch (filters/search preserved).
watch(limit_data, () => {
  data_page_current.value = 1
  pageCurnt.value = 1
  fetchData()
})

// Main Exam selector → re-scope the stat cards too (the list already refetches
// via the filter watch). Counts reflect the chosen exam (specific / all).
watch(filter_exam, () => {
  fetchAllCountData()
  // Reason list is exam-scoped; drop a now-meaningless selection.
  if (showReasonFilter.value) fetchFlagReasons()
  filter_reason.value = 'all'
})

// Entering Flagged / To Approve → load the reason list. Leaving → clear the
// selection so it never silently narrows another tab.
watch(activeTab, () => {
  if (showReasonFilter.value) {
    fetchFlagReasons()
  } else if (filter_reason.value !== 'all') {
    filter_reason.value = 'all'
  }
})

// Reason change → back to page 1 and refetch (other filters preserved).
watch(filter_reason, () => {
  data_page_current.value = 1
  pageCurnt.value = 1
  fetchData()
})
const importCheckProgress=ref<boolean>(false);

// The completion summary is persisted server-side (ImportFile.summary, returned
// by /imports/progress). We keep the last FINISHED snapshot so the user can
// REOPEN the summary after a logout / refresh / navigation — previously the box
// appeared only during a live poll run and was lost the moment the page reloaded.
const lastImportSnapshot = ref<any>(null);
const hasLastImportSummary = ref<boolean>(false);
const viewLastImportSummary = () => {
  if (!lastImportSnapshot.value) return;
  // Feed the finished snapshot into the modal's detail prop; its watcher renders
  // the summary box (status=1 + summary) exactly like a live completion.
  detailProgress.value = lastImportSnapshot.value;
  showImportQuestionModal.value = true;
};



onMounted(async () => {
   // check if import already running
     try {
      importCheckProgress.value=true;
      const res: any = await $api.get('/imports/progress')
      const obj = res?.data?.data || {};
      if(!res?.data || res.data.status == 'error'){
        return;
      }
     const importStatus=Number(obj?.status ?? 1)
      if (importStatus === 0) {
         progressTrigger(true);
      } else if (importStatus === 1 && obj?.summary) {
        // A finished import is sitting on the server. Don't pop it open
        // automatically — just remember it so the "View last import result"
        // button can reopen the completion summary on demand.
        lastImportSnapshot.value = obj;
        hasLastImportSummary.value = true;
      }
    } finally{
      importCheckProgress.value=false;
    }
});

onMounted(async () => {
  fetchAllCountData();
});

onMounted(async () => {
 // Pre-fill from the topbar global search (?search=...). Landing here from a
 // "Questions" result should show that question, not the whole unfiltered bank.
 // Seed input_search BEFORE the first fetch so the initial load is already scoped;
 // the input_search watcher would otherwise fire a second request on the next tick.
 const qs = route.query.search
 if (typeof qs === 'string' && qs.trim() !== '') {
   input_search.value = qs.trim()
 }
 fetchData();
});


</script>

<template>
   <Loading v-if="fullLoading"/>
  <div class="dashwrap">
    <div class="section-hdr">
        <div class="section-hdr-left">
            <p id="qPanelSubtitle">
              {{all_total}} questions across all exams
            </p>
        </div>
        <div class="section-hdr-right">
            <div v-if="importCheckProgress" class="importCheckProgress">
                  <span class="ChkPrstle">
                  Import Check Processing
                </span>
            </div>
            <div v-else  class="importCheckProgress">
              <button class="btn btn-outline btn-sm" 
                  @click="onClickQImport()"
                  type="button">
                  <div v-if="importStopProgress"
                  class="importBtnProgress">
                  <span class="processingLoader"></span>
                  <span class="processingTitle">
                    Import Processing {{ importCreatedRow }}
                  </span>
                  </div>
                  <div v-else class="importBtnProgress">
                      <svg fill="none" height="13" stroke="currentColor" stroke-linecap="round" 
                      stroke-width="2.5" viewBox="0 0 24 24" width="13">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"></path>
                      <polyline points="17 8 12 3 7 8"></polyline>
                      <line x1="12" x2="12" y1="3" y2="15"></line>
                      </svg>
                      Import
                  </div>
                </button>
            </div>

            <button v-if="hasLastImportSummary && !importStopProgress"
                class="btn btn-outline btn-sm"
                type="button"
                @click="viewLastImportSummary()"
                title="View the result of your last import">
                View last import result
            </button>

            <button class="btn btn-primary btn-sm"
            type="button"
            @click="openAddModal">
                <svg fill="none" height="13" stroke="currentColor" stroke-linecap="round" stroke-width="2.5" viewBox="0 0 24 24" width="13"><line x1="12" x2="12" y1="5" y2="19"></line><line x1="5" x2="19" y1="12" y2="12"></line></svg>
                New Question
            </button>
        </div>
    </div>

    <!-- Stat cards — clickable status filters -->
    <div class="stats-row" style="grid-template-columns:repeat(6,1fr);margin-bottom:4px">

        <div id="qStat-all" 
        class="stat-card q-stat-btn"
          :class="{ active: activeTab === 'all' }"
          @click="setTab('all')" 
         style="cursor:pointer;">
            <div class="stat-card-top">
                <div class="stat-icon teal"><svg fill="none" height="14" stroke="currentColor" stroke-linecap="round" stroke-width="2.5" viewBox="0 0 24 24" width="14"><rect x="3" y="3" width="18" height="18" rx="2"></rect><line x1="3" x2="21" y1="9" y2="9"></line><line x1="9" x2="9" y1="3" y2="21"></line></svg></div>
            </div>
            <div class="stat-num" style="font-size:1.4rem">
              {{all_total}}
            </div>
            <div class="stat-label">All Questions</div>
        </div>

        <div id="qStat-Published" class="stat-card q-stat-btn" 
        style="cursor:pointer"
        :class="{ active: activeTab === '1' }"
         @click="setTab('1')">
            <div class="stat-card-top">
                <div class="stat-icon green"><svg fill="none" height="14" stroke="currentColor" stroke-linecap="round" stroke-width="2.5" viewBox="0 0 24 24" width="14"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
            </div>
            <div class="stat-num" style="font-size:1.4rem">
              {{total_published}}
            </div>
            <div class="stat-label">Published</div>
        </div>

        <div class="stat-card q-stat-btn" id="qStat-Draft" style="cursor:pointer"
        :class="{ active: activeTab === '0' }"
         @click="setTab('0')" >
            <div class="stat-card-top">
                <div class="stat-icon amber">
                  <svg fill="none" height="14" stroke="currentColor" stroke-linecap="round" stroke-width="2.5" viewBox="0 0 24 24" width="14"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></div>
            </div>
            <div class="stat-num" style="font-size:1.4rem">
              {{total_draft}}
            </div>
            <div class="stat-label">Draft</div>
        </div>

        <div class="stat-card q-stat-btn" id="qStat-Flagged" 
        style="cursor:pointer"
        :class="{ active: activeTab === '3' }"
         @click="setTab('3')" >
            <div class="stat-card-top">
                <div class="stat-icon red"><svg fill="none" height="14" stroke="currentColor" stroke-linecap="round" stroke-width="2.5" viewBox="0 0 24 24" width="14"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"></path><line x1="12" x2="12" y1="9" y2="13"></line><line x1="12" x2="12.01" y1="17" y2="17"></line></svg></div>
            </div>
            <div class="stat-num" style="font-size:1.4rem;color:var(--red)">
              {{total_flagged}}
            </div>
            <div class="stat-label">Flagged</div>
        </div>

        <div class="stat-card q-stat-btn" id="qStat-To Approve" style="cursor:pointer"
        :class="{ active: activeTab === '4' }"
         @click="setTab('4')" >
            <div class="stat-card-top">
                <div class="stat-icon teal"><svg fill="none" height="14" stroke="currentColor" stroke-linecap="round" stroke-width="2.5" viewBox="0 0 24 24" width="14"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg></div>
            </div>
            <div class="stat-num" style="font-size:1.4rem;color:var(--teal)">
              {{total_to_approve}}
            </div>
            <div class="stat-label">To Approve</div>
        </div>

        <div class="stat-card q-stat-btn" id="qStat-Deleted" style="cursor:pointer"
        :class="{ active: activeTab === 'deleted' }"
         @click="setTab('deleted')" >
            <div class="stat-card-top">
                <div class="stat-icon red"><svg fill="none" height="14" stroke="currentColor" stroke-linecap="round" stroke-width="2.5" viewBox="0 0 24 24" width="14"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path></svg></div>
            </div>
            <div class="stat-num" style="font-size:1.4rem;color:var(--red)">
              {{total_deleted}}
            </div>
            <div class="stat-label">Deleted</div>
        </div>

    </div>

    <!-- Search + filters -->
    <div class="filter-bar">
        <input class="filter-input"
         placeholder="Search by Q#, or keyword..." 
          v-model="input_search"
          type="text"/>

        <div class="filterselectinput filter-select">
          <Multiselect
          class="multiexam-select-options exam-select"
          placeholder="e.g. Exam"
          v-model="filter_exam"
          :options="examOptions"
          :loading="examState.loading.value"
          label="name"
          valueProp="id"
          :searchable="true"
          />
        </div>

         <div class="filterselectinput filter-select">
          <Multiselect
          class="multiSubject-select-options subject-select"
          placeholder="e.g. name"
          v-model="filterSubject"
          :options="subjectOptions"
          label="name"
          valueProp="id"
          :searchable="true"
          :loading="subjectState.loading.value" 
          />
        </div>

        <div class="filterselectinput filter-select">
         <Multiselect
            class="multiCategory-select-options category-select"
            placeholder="e.g. name"
            v-model="filterCategory"
            :options="categoryOptions"
            label="name"
            valueProp="id"
            :searchable="true"
            :loading="categoryState.loading.value" 
            />
        </div>

        <div class="filterselectinput filter-select">
          <Multiselect
          class="multiDomain-select-options domain-select"
          placeholder="e.g. name"
          v-model="filterDomain"
          :options="domainOptions"
          label="name"
          valueProp="id"
          :searchable="true"
          :loading="domainState.loading.value" 
          />
        </div>

        <div class="filterselectinput filter-select">
          <Multiselect
          class="multiDiscipline-select-options discipline-select"
          placeholder="e.g. name"
          v-model="filterDiscipline"
          :options="disciplineOptions"
          label="name"
          valueProp="id"
          :searchable="true"
          :loading="disciplineState.loading.value"
          />
        </div>

        <!-- Was a hardcoded list of the nine rows in the unmanaged topics table — and
             it filtered on the NAME against a free-text column that is empty, so this
             dropdown could never return a single question. It carries the taxonomy id
             now and actually filters. -->
        <select class="filter-input filter-select form-select selectLearningOutCome"
        v-model="filterLearningOutCome">
          <option value="all">All Learning Outcomes</option>
          <option v-for="lo in learningOutcomeList" :key="lo.id" :value="String(lo.id)">{{ lo.name }}</option>
        </select>

         <div class="filterselectinput filter-select">
          <Multiselect
          class="multiTag-select-options tag-select"
          placeholder="e.g. name"
          v-model="filterTag"
          :options="tagOptions"
          label="name"
          valueProp="id"
          :searchable="true"
          :loading="tagState.loading.value" 
          />
        </div>

      <!-- Was a hardcoded list. Difficulty is a curatable taxonomy now, so this reads
           the live vocabulary — a level retired in the Difficulty Manager stops being
           offered here, and one added shows up without a deploy. -->
      <select class="filter-input filter-select form-select" id="qDiffFilter"
      v-model="filterDifficulty">
        <option value="all">All Difficulties</option>
        <option v-for="d in difficultyList" :key="d.id" :value="d.slug">{{ d.name }}</option>
      </select>

      <!-- Source pool — surfaces institution-contributed questions that used to be
           hidden from the admin bank. Default 'PassMed' keeps the classic view. -->
      <select class="filter-input filter-select form-select" id="qSourceFilter"
      v-model="filterSource">
        <option value="passmed">PassMed</option>
        <option value="institution">Institution pool</option>
        <option value="shared">Shared pool</option>
        <option value="all">All sources</option>
      </select>

      <!-- Flag reason — only on the Flagged / To Approve queues, where questions
           actually carry import flags. Lets an admin batch one issue at a time. -->
      <select v-if="showReasonFilter"
        class="filter-input filter-select form-select"
        id="qReasonFilter"
        style="min-width:260px"
        v-model="filter_reason">
        <option value="all">
          {{ flagReasonLoading ? 'Loading reasons…' : 'All flag reasons' }}
        </option>
        <option v-for="r in flagReasonOptions" :key="r.reason" :value="r.reason">
          {{ r.reason }} ({{ r.total }})
        </option>
      </select>

        <select class="filter-input filter-select form-select" id="qStatusFilter"
        v-model="filter_status">
        <option value="all">All Statuses</option>
        <option value="1">Published</option>
        <option value="2">Archived</option>
        <option value="0">Draft</option>
        <option value="3">Flagged</option>
        <option value="4">To Approve</option>
        <option value="deleted">Deleted</option>
        </select>
    </div>

    <!-- Result count + bulk bar -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:6px">
        <div id="qResultCount" style="font-size:0.78rem;color:var(--ink-dim)">
            Showing {{ getDataList.length }} of {{ total_data }} questions

            <span style="display:inline-flex;align-items:center;gap:6px;margin-left:10px">
              <span>Per page</span>
              <select class="form-input form-select" style="width:auto;padding:4px 8px" v-model.number="limit_data">
                <option :value="10">10</option>
                <option :value="20">20</option>
                <option :value="50">50</option>
                <option :value="100">100</option>
                <option :value="200">200</option>
                <option :value="500">500</option>
                <option :value="1000">1000</option>
              </select>
            </span>

            <div v-if="counQSelected.length" class="leftseleallwrap">
             <span id="qBulkCount">
              {{ counQSelected.length }}
               <span class="label">selected</span>
              </span>
            </div>
          </div>

        <div class="qBulkBarwrapRight">
            
            <div class="leftseleallwrap">
              <div class="seleallwrap"
              @click="onClickQSelectAll"
                >
                <input class="q-select allselect" type="checkbox" 
                style="margin-top:4px;accent-color:var(--teal)"
                :checked="selectedAll"
                />
                Click here to select all questions
              </div>
            </div>

            <button
            v-if="activeTab === '0' || activeTab === 'all'"
            class="btn btn-primary btn-sm"
             type="button"
            @click="bulkUpdateStatus('1')">
             Publish
            </button>

            <button
            class="btn btn-primary btn-sm"
            type="button"
            @click="bulkUpdateStatus('4')">
            Approve
            </button>

            <button v-if="activeTab === '1' || activeTab === 'all'"
            class="btn btn-primary btn-sm"
            type="button"
            @click="bulkUpdateStatus('0')">
            Draft
          </button>

            <button class="btn btn-danger btn-sm"
             type="button"
            @click="bulkUpdateStatus('2')"
             >
             Archive
            </button>
            <button class="btn btn-danger btn-sm"
             type="button"
              @click="bulkDelete()"
             >
             Delete
            </button>
        </div>
    </div>

    <!-- Question list -->

    <div v-if="data_loading">
      <Loader_small />
    </div>
    <div v-else-if="!data_loading && getDataList.length === 0">
      <Empty />
    </div>
    <div class="wrapqlist" v-else >

      <!-- COLUMN TOGGLE -->
      <div class="wrap-columntoggle">
        <div class="wrapcolumleft">Click column headers to sort</div>
        <div class="wrapcolumnright">
          <button class="columnbtntoggle btn btn-outline btn-sm" @click="toggleColPanel">
            <svg fill="none" height="12" stroke="currentColor" stroke-linecap="round" stroke-width="2.5" viewBox="0 0 24 24" width="12">
              <line x1="3" x2="21" y1="12" y2="12"></line>
              <line x1="3" x2="21" y1="6" y2="6"></line>
              <line x1="3" x2="21" y1="18" y2="18"></line>
            </svg>
            Columns
          </button>
          <div class="togglecolPanel colPanel" :class="colPanel?'show':''">
            <div class="titledrop">Show/Hide Columns</div>
            <label v-for="(val, key) in showCols" :key="key" class="col-toggle-row">
              <input type="checkbox" v-model="showCols[key]" />
              {{ columnLabels[key] }}
            </label>
          </div>
        </div>
      </div>

      <div class="qtable-scroll">
      <table class="qtable">
        <thead>
          <tr>
            <th class="qt-check"></th>
            <th v-if="showCols.last_updated" class="qt-updated" style="cursor:pointer;user-select:none" @click="onClickSortBy('last_updated')">Last updated <span style="opacity:.55">{{ sortArrow('last_updated') }}</span></th>
            <th v-if="showCols.exam">Exam</th>
            <th v-if="showCols.qid" class="qt-qid" style="cursor:pointer;user-select:none" @click="onClickSortBy('qid')">QID <span style="opacity:.55">{{ sortArrow('qid') }}</span></th>
            <th class="qt-question">Question</th>
            <th v-if="showCols.subject">Subject</th>
            <th v-if="showCols.difficulty" style="cursor:pointer;user-select:none" @click="onClickSortBy('difficulty')">Level <span style="opacity:.55">{{ sortArrow('difficulty') }}</span></th>
            <th v-if="showCols.learning_outcome">Learning Outcome</th>
            <th v-if="showCols.status" style="cursor:pointer;user-select:none" @click="onClickSortBy('status')">Status <span style="opacity:.55">{{ sortArrow('status') }}</span></th>
            <th v-if="showCols.avg_score" class="qt-center">Avg score</th>
            <th v-if="showCols.attempts" class="qt-center">Attempt</th>
            <th class="qt-act"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(vl, key) in getDataList" :key="key" class="qtable-row">
            <td class="qt-check" @click.stop>
              <input class="q-select" type="checkbox" style="accent-color:var(--teal)"
                :checked="counQSelected.includes(vl.id)" @change="onClickQSelect(vl.id)" />
            </td>
            <td v-if="showCols.last_updated" class="qt-updated">{{ vl.last_updated || '—' }}</td>
            <td v-if="showCols.exam">{{ vl.exams_name || '—' }}</td>
            <td v-if="showCols.qid" class="qt-qid">Q#{{ vl.qid ?? '-' }}</td>
            <td class="qt-question">
              <div class="qt-stem qbtnActn" @click="onClickQEdit(vl.id)" v-html="safeHtmlContent(vl.question_stem)"></div>
            </td>
            <td v-if="showCols.subject">{{ vl.subject_name || '—' }}</td>
            <td v-if="showCols.difficulty"><span v-if="vl.difficulty" class="badge badge-gray sec-difficulty">{{ vl.difficulty }}</span><span v-else>—</span></td>
            <td v-if="showCols.learning_outcome">{{ vl.learning_outcome_name || '—' }}</td>
            <td v-if="showCols.status">
              <span v-if="vl.status == '1'" class="badge badge-green">Published</span>
              <span v-else-if="vl.status == '2'" class="badge badge-archived">Archived</span>
              <span v-else-if="vl.status == '3'" class="badge badge-review">Flagged</span>
              <span v-else-if="vl.status == '4'" class="badge badge-teal">To Approve</span>
              <span v-else class="badge-draft">Draft</span>
            </td>
            <td v-if="showCols.avg_score" class="qt-center">{{ vl.avg_score ?? 0 }}%</td>
            <td v-if="showCols.attempts" class="qt-center">{{ vl.attempts ?? 0 }}</td>
            <td class="qt-act" @click.stop>
              <button type="button" class="qmenu-btn" @click="openRowMenu($event, vl.id)" aria-label="Actions">⋯</button>
            </td>
          </tr>
        </tbody>
      </table>
      </div>
      <!-- Actions menu — teleported to <body> so the table's horizontal scroll never
           clips it; the backdrop closes it on any outside click. -->
      <Teleport to="body">
        <div v-if="openMenuId !== null" class="qmenu-backdrop" @click="openMenuId = null"></div>
        <div v-if="openMenuId !== null && menuRow" class="qmenu"
             :style="{ top: menuPos.top + 'px', left: menuPos.left + 'px' }" @click.stop>
          <button v-if="canEdit('question_bank')" type="button" @click="onClickQEdit(menuRow.id); openMenuId=null">Edit</button>
          <button type="button" @click="onClickQHistory(menuRow.id, menuRow.qid); openMenuId=null">History</button>
          <button v-if="menuRow.status == '3'" type="button" @click="onClickQsubmitForApproval(menuRow.id); openMenuId=null">Submit for Approval</button>
          <button v-if="menuRow.status == '4'" type="button" @click="onClickReviewApproval(menuRow.id); openMenuId=null">Review &amp; Approve</button>
          <button v-if="menuRow.status == '0'" type="button" @click="onClickPublish(menuRow.id); openMenuId=null">Publish</button>
          <button v-if="menuRow.status == '2'" type="button" @click="unarchiveQuestion(menuRow.id); openMenuId=null">Unarchive</button>
          <NuxtLink :to="`/dashboard/questions/feedback/${menuRow.id}`" class="qmenu-link" @click="openMenuId=null">Feedback</NuxtLink>
          <button v-if="filter_status === 'deleted'" type="button" @click="restoreQuestion(menuRow.id); openMenuId=null">Restore</button>
          <button v-if="menuRow.status != '4' && filter_status !== 'deleted'" type="button" class="qmenu-danger" @click="confirmDelete(menuRow.id); openMenuId=null">Delete</button>
        </div>
      </Teleport>
        <div style="display:flex;align-items:center;justify-content:flex-end;gap:8px;margin:8px 0;font-size:0.78rem;color:var(--ink-dim)">
          <span>Per page</span>
          <select class="form-input form-select" style="width:auto;padding:5px 8px" v-model.number="limit_data">
            <option :value="10">10</option>
            <option :value="20">20</option>
            <option :value="50">50</option>
            <option :value="100">100</option>
            <option :value="200">200</option>
            <option :value="500">500</option>
            <option :value="1000">1000</option>
          </select>
        </div>
        <Pagination
         v-model:page="pageCurnt"
          :totalData="total_data"
          :totalPages="totalPages"
          elmntName="questions"/>
    </div>

    <!-- /qList -->
  </div>

 <AddQuestionModal
  v-if="showModal"
  v-model="showModal"
   @saved="savedCallBack"
   />


  <EditQuestionModal
   v-if="showEditModal"
  v-model="showEditModal"
   @saved="savedCallBack"
   :id="qstnDetail"
   :activeTab="activeTab"
   />  

  <ApprovalQuestion
  v-if="showApprovalModal"
   v-model="showApprovalModal"
   :questionId="questionId"
   :queue="approvalQueue"
   :qidMap="approvalQidMap"
   @saved="savedCallBack"
   />
  <HistoryQuestionModal
  v-if="showHistoryModal"
   v-model="showHistoryModal"
   :questionId="questionId"
   :questionQid="questionQid"
   @saved="savedCallBack"
   />

  <ImportQuestionModal
  v-if="showImportQuestionModal"
   v-model="showImportQuestionModal"
   @progressTrigger="progressTrigger"
  @goToApproveQueue="onGoToApproveQueue"
   :stopProgress="importStopProgress"
   :detail="detailProgress"
   />
</template>

<style scoped>
/* Question Bank — table view (replaces the old cards). */
.qtable-scroll { overflow-x: auto; border: 1px solid var(--border, #e2e8f0); border-radius: 10px; }
.qtable { width: 100%; border-collapse: collapse; font-size: 0.8rem; background: var(--white, #fff); }
.qtable thead th {
  text-align: left; padding: 10px 12px; white-space: nowrap;
  font-size: 0.66rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.6px;
  color: var(--ink-dim, #64748b); background: var(--surface, #f7fbfd);
  border-bottom: 1.5px solid var(--border, #e2e8f0); position: sticky; top: 0; z-index: 1;
}
.qtable tbody td { padding: 10px 12px; border-bottom: 1px solid var(--border, #eef2f6); vertical-align: middle; color: var(--ink, #0f1f2e); }
.qtable-row:hover { background: var(--surface, #f7fbfd); }
.qt-check { width: 34px; }
.qt-updated { white-space: nowrap; color: var(--ink-dim, #64748b); font-size: 0.72rem; }
.qt-qid { white-space: nowrap; font-family: 'JetBrains Mono', monospace; font-size: 0.72rem; color: var(--ink-dim, #64748b); }
.qt-question { min-width: 240px; max-width: 420px; }
.qt-stem { display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; cursor: pointer; line-height: 1.4; }
.qt-stem:hover { color: var(--teal, #0891b2); }
.qt-center { text-align: center; white-space: nowrap; }
.qt-act { width: 44px; text-align: right; position: relative; }

.qmenu-btn {
  width: 28px; height: 28px; border-radius: 6px; border: 1px solid var(--border, #e2e8f0);
  background: var(--white, #fff); color: var(--ink-mid, #374f65); cursor: pointer;
  font-size: 1.1rem; line-height: 1; font-weight: 800;
}
.qmenu-btn:hover { border-color: var(--teal-border, #67e8f9); color: var(--teal, #0891b2); }
.qmenu {
  position: fixed; z-index: 1200; min-width: 176px;
  background: var(--white, #fff); border: 1px solid var(--border, #e2e8f0); border-radius: 10px;
  box-shadow: 0 12px 34px rgba(15, 31, 46, 0.16); padding: 6px; display: flex; flex-direction: column;
}
.qmenu > button, .qmenu > a {
  display: block; width: 100%; text-align: left; padding: 8px 10px; border: none; background: none;
  font-size: 0.78rem; font-weight: 600; color: var(--ink, #0f1f2e); cursor: pointer; border-radius: 6px;
  text-decoration: none;
}
.qmenu > button:hover, .qmenu > a:hover { background: var(--surface-hi, #eef6fa); }
.qmenu-danger { color: var(--rose, #e11d48) !important; }
.qmenu-backdrop { position: fixed; inset: 0; z-index: 1199; background: transparent; }
</style>