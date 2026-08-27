<script setup lang="ts">  

import Multiselect from '@vueform/multiselect'
import { ref, watch, onMounted, computed } from 'vue'
import Loading from '@/components/loaders/Loading.vue'

const props = defineProps<{
  modelValue: Boolean
stopProgress:boolean
detail:any | null
mockId?: number | null      // Mocks page: import INTO this mock (import_source=1)
mockExamId?: number | null  // the mock's parent exam — preset the exam dropdown
}>();




const { $api, $toast,$confirm } = useNuxtApp()
const emit = defineEmits(['update:modelValue', 'progressTrigger','goToApproveQueue'])

// close modal
const closeModal = () => {
  emit('update:modelValue', false)
}

const lastImportSummary = ref<any>(null)
const showSummaryBox = ref<boolean>(false)

const detailProgress = ref<any>(null)
const fullLoading=ref<boolean>(false);

/***
 * tab
*/
const importTab = ref<string>('csv')

const setImportTab = (type: string) => {
  importTab.value = type;
}

/*
|--------------------------------------------------------------------------
| Progress State
|--------------------------------------------------------------------------
*/

const importProgress = ref<number>(0)
const importCreatedRow = ref<number>(0)
const importTotalRow = ref<number>(0)
const importStatus = ref<number | string>(0)
const importOtherProcess=ref<boolean>(true);
const showProgressBox = ref<boolean>(false)

const progressText = computed(() => {
  const progress=importProgress.value;
  const progresStatus=importStatus.value;

  if (progresStatus === 1 || progress >= 100) {
    return 'Import completed successfully'
  }

  if (importProgress.value > 0) {
    return "Import in progress... "+progress+"%";
  }

  return 'Preparing import...'
})

const startProgressPolling = () => {
  importOtherProcess.value=false;
  /** back trigger progress start **/
  showProgressBox.value = true
  emit('progressTrigger', true)
}

const stopImport = async () => {
  try {
    await $api.post('/imports/stop');

        // ❗ INSTANT UI STOP
    showProgressBox.value = false;
     importProgress.value = 0;
    importCreatedRow.value = 0;
    importTotalRow.value = 0;
    importStatus.value = 0;

    emit('progressTrigger', false);

    $toast('Import cancelled successfully');

  } catch (e) {
    $toast('Failed to stop import', 'error');
  }finally{
        showProgressBox.value = false;
  }
}


/*
CSV FILE
*/

const csvFile = ref<File | null>(null)

// Download the .xlsx import template. Generated SERVER-SIDE (Api_importController::
// downloadTemplate) from the live vocabulary, so it is never stale: the client's
// final 22 columns, BLOCKING dropdowns on LEARNING OUTCOME and DIFFICULTY — the only
// two controlled columns on the admin sheet — plus Valid Values and Instructions.
//
// The other taxonomy columns (SUBJECT, CATEGORIES, DOMAIN, DISCIPLINE, TAGS) carry no
// dropdown on purpose. They used to, fed from the institution's controlled lists, and
// it misled authors: ABA Basic's blueprint subject "Anatomy" is not in that list, so
// Excel flagged a perfectly valid row as wrong. Admin imports auto-create them.
const templateBusy = ref<boolean>(false)
const downloadTemplate = async () => {
  if (templateBusy.value) return
  templateBusy.value = true
  try {
    const res: any = await $api.get('/imports/template', { responseType: 'blob' })
    const blob = res.data as Blob
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'question-import-template.xlsx'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 4000)
  } catch {
    $toast('Could not download the template — please try again.', 'error')
  } finally {
    templateBusy.value = false
  }
}
const exam_id = ref<any>('0')
const status = ref<any>('0')
const rowCount = ref<number | null>(null)
const showPreview = ref<boolean>(false)
const fileName = ref<any>("questions.csv");
const fileInput = ref<HTMLInputElement | null>(null)
const allowed = ['csv','xlsx','xls'];

// Optional Excel tab name. Shown only for .xlsx/.xls uploads (CSV has no tabs).
// Blank = first/active sheet. Sent to the backend as `sheet_name`.
const fileSheetName = ref('')
const isExcelFile = computed(() => {
  const ext = (fileName.value?.split('.').pop() || '').toLowerCase()
  return ext === 'xlsx' || ext === 'xls'
})
// Tab names read from the picked Excel file (client-side, via SheetJS) so the
// user picks the tab from a dropdown instead of typing it.
const sheetNames = ref<string[]>([])
// Read only the tab names (fast — bookSheets skips cell data). Best-effort: any
// failure just hides the dropdown and falls back to the first sheet.
const loadSheetNames = async (file: File) => {
  try {
    const XLSX:any = await import('xlsx')
    const buf = await file.arrayBuffer()
    const wb = XLSX.read(buf, { type: 'array', bookSheets: true })
    sheetNames.value = Array.isArray(wb?.SheetNames) ? wb.SheetNames : []
  } catch {
    sheetNames.value = []
  }
}
// Parse tab names whenever an Excel file is chosen (CSV has none).
const maybeLoadSheetNames = (file: File) => {
  fileSheetName.value = ''
  sheetNames.value = []
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (ext === 'xlsx' || ext === 'xls') loadSheetNames(file)
}

// select file
const handleFileSelect = (e:any) => {
    const file = e.target.files[0];
    if (!file) return;
    csvFile.value = file;
    fileName.value = file.name
    showPreview.value = true
    detectRowCount(file);
    maybeLoadSheetNames(file)
}
const detectRowCount = (file: File) => {
      const ext = file.name.split('.').pop()?.toLowerCase()
      if (ext !== 'csv') {
      rowCount.value = null
      return
      }
      const reader = new FileReader()
      reader.onload = (e:any) => {
      const text = e.target.result
      const rows = text.split('\n').filter((r:string) => r.trim() !== '')
      rowCount.value = rows.length - 1 // exclude header
      }
      reader.readAsText(file)
}

// DRAG DROP
const handleDrop = (e:any) => {
  e.preventDefault()
   const el = e.currentTarget as HTMLElement;
    el.classList.remove('dragover')
     const file = e.dataTransfer?.files?.[0];
    if (!file) return;

    csvFile.value = file;
    fileName.value = file.name
    showPreview.value = true
    detectRowCount(file)
    maybeLoadSheetNames(file)
}

const onDragOver = (e: DragEvent) => {
  const el = e.currentTarget as HTMLElement
  el.classList.add('dragover')
}

const onDragLeave = (e: DragEvent) => {
  const el = e.currentTarget as HTMLElement
  el.classList.remove('dragover')
}

/*
* Csv submit
*/
const confirmCsvImport = async () => {
    
    if (!csvFile.value){
         return $toast('Please select CSV','error');
    }
  if (!exam_id.value || exam_id.value == '0') {
    return $toast('Exam is required', 'error')
  }

    const ext = csvFile.value.name.split('.').pop()?.toLowerCase() || ''
    if (!allowed.includes(ext)) {
    return $toast('Only CSV/Excel allowed','error')
    }

    // INSTANT SHOW
    showProgressBox.value = true
    importProgress.value = 0
    importCreatedRow.value = 0
    importTotalRow.value = Number(rowCount.value || 0)
    importStatus.value = 0

    fullLoading.value = true;

  try {
        const formData = new FormData()
        formData.append('file', csvFile.value)
        formData.append('exam_id', exam_id.value)
        formData.append('status', status.value)
        // Importing INTO a mock (Mocks page): questions get import_source=1 and are
        // appended to the mock's paper — they never enter the normal practice qbank.
        if (props.mockId) { formData.append('mock_id', String(props.mockId)) }
        // Excel only: which tab to import. Blank/CSV → backend uses first sheet.
        if (isExcelFile.value && fileSheetName.value.trim()) {
          formData.append('sheet_name', fileSheetName.value.trim())
        }

    // Upload straight to the backend (bypass the /api Vercel proxy) so large
    // CSV/Excel files don't hit Vercel's ~4.5MB serverless payload limit.
    const res:any = await $api.postDirect('/imports/files', formData);
      const obj = res?.data || {};

      csvFile.value=null;
      exam_id.value='0';
      status.value='0';

     if (obj.status === 'processing') {
        startProgressPolling()
         return;
    }else{
      showProgressBox.value=false;
    }
    $toast(obj?.msg || 'Import failed', 'error');

  } catch (err:any) {
     
      showProgressBox.value = false 
      const message = err?.response?.data?.msg || 'Import csv is  failed.'
      $toast(message,'error');
      closeModal()
  }finally{
    fullLoading.value=false;
  }
}

/*
* Import Sheets submit
*/

const sheetsUrl = ref('')
const sheetName = ref('')
const syncSchedule = ref('one-time')

const confirmSheetsImport = async () => {
  if (!sheetsUrl.value) {
    return $toast('Please enter Google Sheets URL', 'error')
  }

  if (!exam_id.value || exam_id.value == '0') {
    return $toast('Exam is required', 'error')
  }
  importProgress.value = 0
  importCreatedRow.value = 0
  importTotalRow.value = 0
  importStatus.value = 0
  showProgressBox.value = true
  fullLoading.value = true;

  try {

    const res:any = await $api.post('/imports/sheets',{
        url: sheetsUrl.value,
        sheet_name: sheetName.value,
        exam_id: exam_id.value,
        sync_schedule: syncSchedule.value,
        status: status.value,
        ...(props.mockId ? { mock_id: props.mockId } : {})
    });

    const obj = res?.data || {}
      sheetsUrl.value='';
      exam_id.value='';
      syncSchedule.value='';
      status.value='0';

    if (obj.status === 'processing') {
      startProgressPolling()
      return;
    }else{
      showProgressBox.value = false 
    }

  } catch (err:any) {
    showProgressBox.value = false 
    fullLoading.value = false;
    const message = err?.response?.data?.msg || 'Import sheets is failed.'
    $toast(message,'error');
 }finally{
  fullLoading.value=false;
 }
}

const getExamDataList = ref<any[]>([])
const dataExamloading= ref<boolean>(false);
const pageExam = ref(1)
const hasMoreExam = ref(true)
const limitExdata = ref(500);
const inputSearchExam = ref<any>("");
const fetchExamList= async (reset = false)=>{
  dataExamloading.value=true;
try{

    if (reset) {
      pageExam.value = 1
      getExamDataList.value = []
      hasMoreExam.value = true
    }
        const res:any = await $api.post("/exams/list",{
          search:inputSearchExam.value,
          page:pageExam.value,
          limit:limitExdata.value
        })
        const obj:any = res.data;
    
        if(obj.status == 'success'){
          const newData = res.data.data || []

          if (newData.length === 0) {
            hasMoreExam.value = false
          } else {
             const existingIds = new Set(
            getExamDataList.value.map((item:any) => item.id)
            );
            const filteredData = newData.filter((item:any) => !existingIds.has(item.id));
            getExamDataList.value.push(...filteredData)

            pageExam.value++
          }

        }else{
        getExamDataList.value=[];
        }

    } catch(err){
      getExamDataList.value=[];

    }finally{
       dataExamloading.value=false;
    }
}

const examOptions = computed(() => {
  return [
    { id: '0', name: '! -- Select -- !' },
    ...getExamDataList.value
  ]
})

// Format the import timestamp for the "Imported on …" line in the summary.
const fmtImportDate = (iso: string) => {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleString(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const loadProgressData=()=>{

    const pdata=detailProgress.value||{};
    if (!pdata || pdata.status === undefined || pdata.status === null) return;

      showProgressBox.value = true;
      importStatus.value = pdata?.status ?? 0
      importProgress.value = Number(pdata?.progress ?? 0)
      importCreatedRow.value = Number(pdata?.created_row ?? 0)
      importTotalRow.value = Number(pdata?.total_row ?? 0)

      // Show the completion summary ONLY when the backend reports status=1 (truly done
      // + counts settled). NOT on progress >= 100 — that rounds up to 100 at ~99.5%
      // and would show the summary with a not-yet-final count (the 2198-vs-2209 glitch).
      if (Number(importStatus.value) === 1) {
        importProgress.value = 100;
        importOtherProcess.value=true;
        showProgressBox.value = false;

        // Summary check
        //&& pdata.summary.total_rows > 0
        if (pdata?.summary) {
            lastImportSummary.value = pdata.summary;
            showSummaryBox.value = true;
        } else {
            $toast('Import completed successfully');
        }
      }
}

const closeSummary =async() => {
    showSummaryBox.value = false;
    lastImportSummary.value = null;
    emit('progressTrigger', false);
    emit('update:modelValue', false);
}

// IMPORTANT: emit 'goToApproveQueue' BEFORE anything that closes the modal.
// closeSummary() emits update:modelValue=false, and the parent renders this modal
// with v-if="showImportQuestionModal" — so the component is torn down immediately
// and a 'goToApproveQueue' emitted after that never reaches the parent (the list
// then stayed unfiltered). The parent's onGoToApproveQueue already closes the
// modal, sets the To Approve tab (status 4) and refetches.
const goToApproveQueue = () => {
    showSummaryBox.value = false;
    lastImportSummary.value = null;
    emit('progressTrigger', false);
    emit('goToApproveQueue');
}

watch(() => props.detail, async (val) => {
   detailProgress.value=props?.detail||{};
    if (props.detail){
      loadProgressData();
    }else{
        showProgressBox.value = false;
        importStatus.value =0;
        importProgress.value = 0;
        importCreatedRow.value =0;
        importTotalRow.value = 0;
        importOtherProcess.value=true;
    }
  },{ immediate: true });

watch(() => props.stopProgress, async (val) => {
  if (val == false){
      showProgressBox.value = false;
      importStatus.value = 0;
      importProgress.value = 0;
      importCreatedRow.value =0;
      importTotalRow.value = 0;
      importOtherProcess.value=true;
  }
  },{ immediate: true });

  
onMounted(() => {
  const val=props.modelValue;
  if (val && props.detail) {
    loadProgressData();
  }

  if (val) {
    sheetsUrl.value = ''
    sheetName.value = ''
    exam_id.value = '0'
    // Mocks page: preset the parent exam so the import targets the mock's parent.
    // mock_id rides along on the import call (see confirmCsvImport / confirmSheetsImport).
    if (props.mockExamId) { exam_id.value = String(props.mockExamId) }
    syncSchedule.value = 'one-time'
    status.value = '0'
    csvFile.value = null
    showPreview.value = false
    rowCount.value = null
    fileName.value = 'questions.csv'
    fileSheetName.value = ''
    sheetNames.value = []
  }

});

const autoCreatedSummary = computed(() => {
  const ac = lastImportSummary.value?.auto_created
  if (!ac) return ''
  const parts = []
  if (ac.subjects?.length)    parts.push(`${ac.subjects.length} new subjects`)
  if (ac.topics?.length)      parts.push(`${ac.topics.length} new topics`)
  if (ac.tags?.length)        parts.push(`${ac.tags.length} new tags`)
  if (ac.domains?.length)     parts.push(`${ac.domains.length} new domains`)
  if (ac.disciplines?.length) parts.push(`${ac.disciplines.length} new disciplines`)
  return parts.join(', ')
})


onMounted(() => {
  // check starting progress
  if(importOtherProcess.value == false){
    return;
  }

  fetchExamList();

   setTimeout(() => {
    const el = document.querySelector('.multiexam-select-options')

    if (el) {
      el.addEventListener('scroll', async () => {
        if (
          el.scrollTop + el.clientHeight >= el.scrollHeight - 10 &&
          !dataExamloading.value &&
          hasMoreExam.value
        ) {
          await fetchExamList();
        }
      })
    }
  }, 500)
});

</script>

<template>

<Loading v-if="fullLoading"/>

<div  v-if="modelValue" class="overlay overlay-top open questionmodelwrap" @click.self="closeModal">
    <div class="drawer" style="width:620px">
        <div class="drawer-header">
            <div class="fullheadsec">
                <div class="drawer-header-title">
                    Import Questions
                </div>
                <div v-if="showProgressBox" class="drawer-header-subtitle">
                Add questions to the bank
                </div>
            </div>

            <button class="drawer-close" @click="closeModal" type="button">
                <svg fill="none" height="13" stroke="currentColor" stroke-linecap="round" 
                stroke-width="2.5" viewBox="0 0 24 24"
                 width="13"><line x1="18" x2="6" y1="6" y2="18"></line>
                 <line x1="6" x2="18" y1="6" y2="18"></line>
                </svg>
            </button>
        </div>

          <!-- Progress Box -->
          <div v-if="showProgressBox" class="drawer-body">
                  <div  class="import-progress-floating">
                      <div class="import-progress-head">
                        <div class="imftHdClm">
                          <div class="import-progress-title">
                            Import Progress
                             <span class="ip-spinner"></span>
                          </div>
                          <div class="import-progress-subtitle">{{ progressText }}</div>
                        </div>
                      </div>

                      <div class="import-progress-bar-wrap">
                        <div v-if="importProgress > 0"
                          class="import-progress-bar is-animated" :style="{ width: importProgress + '%' }"></div>
                      <div v-else  class="import-progress-indeterminate"></div>
                      </div>

                      <div class="import-progress-meta">
                        <span>{{ importProgress }}%</span>
                        <span>{{ importCreatedRow }} / {{ importTotalRow || '...' }} rows</span>
                      </div>
                  </div>
                  <div style="display:flex;gap:8px">
                      <button class="stopProcessingbtn" 
                      @click="stopImport()" 
                      style="flex:1" type="button">
                    Stop Processing
                      </button>
                  </div>
          </div>
          <!--// Progress Box // -->
            
          <!-- Summary Box -->
          <div v-if="showSummaryBox && lastImportSummary" class="drawer-body">
              <div style="padding:8px 0">
                  
                  <div style="font-size:1rem;font-weight:700;color:var(--ink);margin-bottom:4px">
                      Import Complete
                  </div>
                  <div v-if="lastImportSummary.imported_at"
                      style="font-size:0.78rem;color:var(--ink-dim);margin-bottom:16px">
                      Imported on {{ fmtImportDate(lastImportSummary.imported_at) }}
                  </div>

                  <div style="display:flex;flex-direction:column;gap:8px">
                      <div style="display:flex;justify-content:space-between;align-items:center;
                                  padding:10px 14px;border-radius:6px;
                                  background:rgba(16,185,129,0.06);
                                  border:1.5px solid rgba(16,185,129,0.2);font-size:0.85rem">
                          <span>✓ {{ lastImportSummary.imported_published }} questions imported</span>
                          <span class="badge badge-green">Published</span>
                      </div>

                      <div v-if="lastImportSummary.imported_draft > 0"
                          style="display:flex;justify-content:space-between;align-items:center;
                                  padding:10px 14px;border-radius:6px;
                                  background:var(--surface);border:1.5px solid var(--border);font-size:0.85rem">
                          <span>✓ {{ lastImportSummary.imported_draft }} questions saved</span>
                          <span class="badge badge-gray">Draft</span>
                      </div>

                      <div v-if="lastImportSummary.to_approve > 0"
                          style="display:flex;justify-content:space-between;align-items:center;
                                  padding:10px 14px;border-radius:6px;
                                  background:rgba(245,158,11,0.06);
                                  border:1.5px solid rgba(245,158,11,0.2);font-size:0.85rem">
                          <span>⚠ {{ lastImportSummary.to_approve }} questions need review</span>
                          <span class="badge badge-teal">To Approve</span>
                      </div>

                    <div v-if="lastImportSummary.in_review > 0" 
                        style="display:flex;justify-content:space-between;align-items:center;
                                  padding:10px 14px;border-radius:6px;
                                  background:rgba(245,158,11,0.06);
                                  border:1.5px solid rgba(245,158,11,0.2);font-size:0.85rem">
                        <!-- Two different outcomes, both parked in the conflict queue.
                             Calling them all "duplicates" is what made an out-of-vocab
                             taxonomy problem read as a dedup bug. -->
                        <span>
                          <template v-if="lastImportSummary.duplicate_count">
                            ⚠ {{ lastImportSummary.duplicate_count }} duplicate{{ lastImportSummary.duplicate_count === 1 ? '' : 's' }} (already exist)
                          </template>
                          <template v-if="lastImportSummary.duplicate_count && lastImportSummary.rejected_count"> · </template>
                          <template v-if="lastImportSummary.rejected_count">
                            ✕ {{ lastImportSummary.rejected_count }} rejected (taxonomy not in the controlled list)
                          </template>
                          <template v-if="!lastImportSummary.duplicate_count && !lastImportSummary.rejected_count">
                            ⚠ {{ lastImportSummary.in_review }} row{{ lastImportSummary.in_review === 1 ? '' : 's' }}
                          </template>
                          → Import Conflict Review
                        </span>
                        <span class="badge badge-amber">Import Review</span>
                    </div>

                      <div v-if="lastImportSummary.skipped > 0"
                          style="display:flex;justify-content:space-between;align-items:center;
                                  padding:10px 14px;border-radius:6px;
                                  background:rgba(220,38,38,0.05);
                                  border:1.5px solid rgba(220,38,38,0.15);font-size:0.85rem">
                          <span>⚠ {{ lastImportSummary.skipped }} rows skipped</span>
                      </div>

                      <!-- Rejected rows detail — not imported; fix the sheet & re-import -->
                      <div v-if="lastImportSummary.rejected_rows?.length > 0"
                          style="background:rgba(220,38,38,0.04);border:1.5px solid rgba(220,38,38,0.15);
                                  border-radius:6px;padding:10px 14px;font-size:0.8rem">
                          <div style="font-weight:700;margin-bottom:6px;color:var(--ink-dim)">
                              Rejected Rows (fix the sheet &amp; re-import):
                          </div>
                          <div v-for="(row, i) in lastImportSummary.rejected_rows.slice(0, 8)"
                              :key="'rej'+i"
                              style="display:flex;gap:8px;color:var(--ink-mid);margin-bottom:4px">
                              <span style="font-weight:600">Row {{ row.row_number || '—' }}:</span>
                              <span>{{ row.reason }}</span>
                          </div>
                          <div v-if="lastImportSummary.rejected_rows.length > 8"
                              style="font-size:0.75rem;color:var(--ink-dim);margin-top:4px">
                              + {{ lastImportSummary.rejected_rows.length - 8 }} more
                          </div>
                      </div>

                      <!-- Flagged rows detail -->
                      <div v-if="lastImportSummary.flagged_rows?.length > 0"
                          style="background:rgba(245,158,11,0.04);border:1.5px solid rgba(245,158,11,0.15);
                                  border-radius:6px;padding:10px 14px;font-size:0.8rem">
                          <div style="font-weight:700;margin-bottom:6px;color:var(--ink-dim)">
                              Flagged Rows:
                          </div>
                          <div v-for="(row, i) in lastImportSummary.flagged_rows.slice(0, 8)" 
                              :key="i"
                              style="display:flex;gap:8px;color:var(--ink-mid);margin-bottom:4px">
                              <span style="font-weight:600">
                                  Row {{ row.row_number || '—' }}:
                              </span>
                              <span>{{ row.reason }}</span>
                          </div>
                          <div v-if="lastImportSummary.flagged_rows.length > 8"
                              style="font-size:0.75rem;color:var(--ink-dim);margin-top:4px">
                              + {{ lastImportSummary.flagged_rows.length - 8 }} more in To Approve queue
                          </div>
                      </div>

                      <!-- Duplicate rows detail — already in this exam (skipped, no fix) -->
                      <div v-if="lastImportSummary.duplicate_rows?.length > 0"
                          style="background:var(--surface);border:1.5px solid var(--border);
                                  border-radius:6px;padding:10px 14px;font-size:0.8rem">
                          <div style="font-weight:700;margin-bottom:6px;color:var(--ink-dim)">
                              Duplicate Rows (already in this exam — skipped):
                          </div>
                          <div v-for="(row, i) in lastImportSummary.duplicate_rows.slice(0, 8)"
                              :key="'dup'+i"
                              style="display:flex;gap:8px;color:var(--ink-mid);margin-bottom:4px">
                              <span style="font-weight:600">Row {{ row.row_number || '—' }}:</span>
                              <span>{{ row.reason }}</span>
                          </div>
                          <div v-if="lastImportSummary.duplicate_rows.length > 8"
                              style="font-size:0.75rem;color:var(--ink-dim);margin-top:4px">
                              + {{ lastImportSummary.duplicate_rows.length - 8 }} more
                          </div>
                      </div>

                      <div style="font-size:0.78rem;color:var(--ink-dim);text-align:right;padding-top:4px">
                          Total rows processed: {{ lastImportSummary.total_rows }}
                      </div>
                  </div>

                  <div style="display:flex;gap:8px;margin-top:16px">
                      <button v-if="lastImportSummary.to_approve > 0"
                          class="btn btn-primary" style="flex:1"
                          @click="goToApproveQueue()" type="button">
                          Go to To Approve Queue
                      </button>
                      <button class="btn btn-outline" style="flex:1"
                          @click="closeSummary()" type="button">
                          Close
                      </button>
                  </div>
              </div>
          </div>
          <!-- // Summary Box // -->

          <!-- start importfrmWrap -->
          <div v-if="!showProgressBox && !showSummaryBox" class="importfrmWrap">
                <!-- Import tabs -->
                <div class="import-tab-wrap">
                    <button class="import-tab itab-csv" 
                    :class="{ active: importTab === 'csv' }"
                    @click="setImportTab('csv')" type="button">
                    CSV Upload
                    </button>
                    <button class="import-tab itab-sheets" 
                    :class="{ active: importTab === 'sheets' }"
                    @click="setImportTab('sheets')" type="button">
                    Google Sheets
                    </button>
                </div>

                <div class="drawer-body">
                    
                    <!-- CSV pane -->
                    <div class="import-pane-csv"
                    v-if="importTab === 'csv'">
                        <div class="drop-zone csvdropzonewrap" 
                            @click="fileInput?.click()"
                            @dragover.prevent="onDragOver"
                            @dragleave="onDragLeave"
                            @drop="handleDrop"
                            id="dropZone">

                            <div class="drop-zone-icon">
                                <svg fill="none" height="20" stroke="currentColor" stroke-linecap="round" 
                                stroke-width="2.5" viewBox="0 0 24 24" width="20">
                                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"></path>
                                <polyline points="17 8 12 3 7 8"></polyline>
                                <line x1="12" x2="12" y1="3" y2="15"></line>
                                </svg>
                            </div>

                            <div class="dropzonecnt">
                                Drop your CSV here
                            </div>

                            <div style="font-size:0.78rem;color:var(--ink-dim)">
                                or click to browse — .csv files only, max 10MB
                            </div>
                        <!--------csvFileInput hidden --------->
                            <input class="csvFileInput" 
                            ref="fileInput"
                            accept=".csv,.xlsx,.xls"
                            @change="handleFileSelect" 
                            type="file" hidden />
                        </div>

                        <div class="csvPreview" v-if="showPreview">
                            <div class="csvPreviewicns">
                                <svg fill="none" height="14" stroke="var(--green)" stroke-linecap="round" 
                                stroke-width="2.5" viewBox="0 0 24 24" width="14">
                                <path d="M9 11l3 3L22 4"></path>
                                </svg>
                                <span class="csvFileName">
                                  {{ fileName??'questions.csv' }}
                            </span>
                            </div>
                        </div>
                        <!-- Excel with >1 tab: pick which tab to import. Tab names are
                             read from the file itself. CSV / single-sheet → no selector. -->
                        <div class="form-row" style="margin-top:14px" v-if="showPreview && isExcelFile && sheetNames.length > 1">
                            <label class="form-label">
                              Sheet to import
                              <span style="color:var(--ink-dim,#94a3b8);font-weight:400;">(this file has {{ sheetNames.length }} tabs)</span>
                            </label>
                            <select class="form-input form-select" v-model="fileSheetName">
                              <option value="">First sheet ({{ sheetNames[0] }}) — default</option>
                              <option v-for="s in sheetNames" :key="s" :value="s">{{ s }}</option>
                            </select>
                        </div>

                        <div class="form-row" style="margin-top:14px">
                            <label class="form-label">Assign to Exam</label>
                            <Multiselect id="csvExamAssign"
                            class="multiexam-select-options exam-select"
                            placeholder="e.g. Exam"
                            v-model="exam_id"
                            :options="examOptions"
                            label="name"
                            valueProp="id"
                            :searchable="true"
                            :loading="dataExamloading"
                            />
                        </div>

                        <div class="form-row">
                            <label class="form-label">Import as</label>
                            <select class="form-input form-select"
                            v-model="status">
                            <option value="0">Draft (review before publishing)</option>
                            <option value="1">Published (go live immediately)</option>
                            </select>
                        </div>

                        <div class="expected-csv-column-wrap">
                            <div class="expected-csv-column-title">
                                Expected CSV Columns
                            </div>
                            <!-- The client's final 22 columns, in their order. Matched by NAME, not
                                 position, so the sheet can be reordered freely. Only LEARNING OUTCOME
                                 and DIFFICULTY are controlled; everything else is free text and is
                                 created automatically on import. -->
                            <div class="expected-csv-column-contnt">
                            EXAM, CODE, DOMAIN, DISCIPLINE,
                            <strong>LEARNING OUTCOME</strong>, <strong>DIFFICULTY</strong>,
                            SUBJECT, CATEGORIES, TAGS,
                            <br>
                            QUESTION, QUESTION_IMAGE_IDS, A, B, C, D, E, ANSWER, EXPLANATION,
                            <br>
                            ANSWER_IMAGE_IDS, REFERENCE, SOURCE
                            <br>
                            <span style="color:var(--ink-dim,#94a3b8)">optional: QID, CODE, QUESTION_IMAGE_IDS, ANSWER_IMAGE_IDS, REFERENCE, SOURCE</span>
                            <div style="margin-top:5px;color:var(--ink-dim,#94a3b8);font-size:0.72rem;">
                              The <strong>bold</strong> columns are controlled — pick from the dropdowns in the
                              template. Anything else in them is rejected. QID can be left blank: the app
                              assigns the id, and duplicates are found from the QUESTION text + ANSWER, never
                              from QID.
                            </div>
                            </div>
                            <div style="margin-top:6px;">
                                <a href="#" @click.prevent="downloadTemplate"
                                    style="color:var(--teal,#0891b2);font-weight:600;text-decoration:underline;cursor:pointer;">
                                    {{ templateBusy ? 'Preparing…' : 'Download Excel template' }}
                                </a>
                                <span style="color:#94a3b8;"> — includes blocking dropdowns on LEARNING OUTCOME and DIFFICULTY, plus Valid Values and Instructions sheets.</span>
                            </div>
                        </div>

                        <div style="display:flex;gap:8px">
                            <button class="btn btn-primary" 
                            @click="confirmCsvImport()" 
                            style="flex:1" type="button">
                            Import Questions
                            </button>
                            <button class="btn btn-outline" 
                            @click="closeModal"
                            type="button">
                            Cancel
                            </button>
                        </div>
                    </div>

                    <!-- Google Sheets pane -->
                    <div class="import-pane-sheets" 
                    v-if="importTab === 'sheets'">

                        <div style="background:rgba(6,182,212,0.06);border:1.5px solid rgba(6,182,212,0.15);border-radius:var(--r);padding:14px 16px;display:flex;gap:12px;align-items:flex-start;margin-bottom:16px">

                            <svg fill="none" height="20" stroke="var(--teal)" stroke-linecap="round" 
                            stroke-width="2" style="flex-shrink:0;margin-top:1px" viewBox="0 0 24 24" 
                            width="20">
                                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"></path>
                                <polyline points="17 8 12 3 7 8"></polyline>
                                <line x1="12" x2="12" y1="3" y2="15"></line>
                            </svg>
                            <div>
                                <div style="font-size:0.82rem;font-weight:700;color:var(--ink);margin-bottom:3px">
                                Sync from Google Sheets
                                </div>

                                <div style="font-size:0.78rem;color:var(--ink-dim);line-height:1.5">
                                    Paste a shareable Google Sheets link. The sheet must be shared with view access. Questions sync on import and can be re-synced anytime from the question bank.
                                    <br><strong>Re-uploading updates in place:</strong> rows whose QID already exists update that same question — no duplicates — and students' sessions, stats, flags and notes stay attached.
                                </div>
                            </div>
                        </div>

                        <div class="form-row">
                            <label class="form-label">Google Sheets URL</label>
                            <input class="form-input sheetsUrl"
                            placeholder="https://docs.google.com/spreadsheets/d/..." 
                            type="url"
                            v-model="sheetsUrl"
                            />
                        </div>

                        <div class="form-row">
                            <label class="form-label">
                                Sheet / Tab Name 
                                <span style="font-weight:400;text-transform:none;letter-spacing:0;font-size:0.72rem;color:var(--ink-dim)">
                                (leave blank for first sheet)
                            </span>
                            </label>
                            <input class="form-input" placeholder="e.g. IM Questions"
                            type="text" 
                              v-model="sheetName"
                              />
                        </div>

                        <div class="form-row">
                            <label class="form-label">Assign to Exam</label>
                            <Multiselect id="sheetsExamAssign"
                            class="multiexam-select-options exam-select"
                            v-model="exam_id"
                            :options="examOptions"
                            label="name"
                            valueProp="id"
                            :searchable="true"
                            :loading="dataExamloading"
                            />
                        </div>

                        <div class="form-row">
                            <label class="form-label">Sync Schedule</label>
                            <select class="form-input form-select"
                            v-model="syncSchedule">
                            <option value="one-time">One-time import</option>
                            <option value="auto-sync-daily">Auto-sync daily</option>
                            <option value="auto-sync-weekly">Auto-sync weekly</option>
                            <option value="manual">Manual re-sync only</option>
                            </select>
                        </div>

                        <div class="form-row">
                            <label class="form-label">Import as</label>
                            <select class="form-input form-select"
                            v-model="status">
                            <option value="0">Draft (review before publishing)</option>
                            <option value="1">Published (go live immediately)</option>
                            </select>
                        </div>

                        <div style="display:flex;gap:8px">

                            <button class="btn btn-primary" 
                            @click="confirmSheetsImport()" 
                            style="flex:1"
                            type="button">
                                Connect &amp; Import
                            </button>

                            <button class="btn btn-outline" 
                            @click="closeModal"
                            type="button">
                            Cancel
                            </button>
                        </div>
                        
                    </div>
                </div>
          </div>
          <!-- end importfrmWrap -->

        <div v-if="autoCreatedSummary"
        style="padding:10px 14px;border-radius:6px;
        background:rgba(6,182,212,0.06);
        border:1.5px solid rgba(6,182,212,0.2);font-size:0.85rem">
        + {{ autoCreatedSummary }}
        </div>

    </div>
</div>
</template>

<style scoped>

.import-progress-floating{
    display: block;
    width: 100%;
    padding: 0px 0 28px 0;
}
.import-progress-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.import-progress-title {
  font-size: 0.92rem;
  font-weight: 700;
  color: #111827;
}

.import-progress-subtitle {
  font-size: 0.78rem;
  color: #6b7280;
  margin-top: 4px;
}

.import-progress-close {
  background: transparent;
  border: 0;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  color: #6b7280;
}

.import-progress-bar-wrap {
  height: 10px;
  background: #e5e7eb;
  border-radius: 999px;
  overflow: hidden;
}

.import-progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #06b6d4, #10b981);
  border-radius: 999px;
  transition: width 0.4s ease;
}

.import-progress-meta {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
  font-size: 0.78rem;
  color: #4b5563;
}


.import-progress-bar-wrap {
  position: relative;          /* required for indeterminate */
  height: 10px;
  background: #e5e7eb;
  border-radius: 999px;
  overflow: hidden;
}

/* determinate bar + moving stripes */
.import-progress-bar {
  position: relative;
  height: 100%;
  background: linear-gradient(90deg, #06b6d4, #10b981);
  border-radius: 999px;
  transition: width 0.4s ease;
  overflow: hidden;
}
.import-progress-bar.is-animated::after {
  content: "";
  position: absolute;
  inset: 0;
  background-image: linear-gradient(
    45deg,
    rgba(255,255,255,0.25) 25%, transparent 25%,
    transparent 50%, rgba(255,255,255,0.25) 50%,
    rgba(255,255,255,0.25) 75%, transparent 75%, transparent
  );
  background-size: 22px 22px;
  animation: ipStripes 0.8s linear infinite;
}
@keyframes ipStripes {
  from { background-position: 0 0; }
  to   { background-position: 22px 0; }
}

/* indeterminate sliding segment (0% / Preparing) */
.import-progress-indeterminate {
  position: absolute;
  top: 0;
  height: 100%;
  width: 40%;
  background: linear-gradient(90deg, #06b6d4, #10b981);
  border-radius: 999px;
  animation: ipSlide 1.2s ease-in-out infinite;
}
@keyframes ipSlide {
  0%   { left: -40%; }
  100% { left: 100%; }
}

/* small spinner next to the title */
.ip-spinner {
  display: inline-block;
  width: 12px; height: 12px;
  margin-left: 6px;
  border: 2px solid rgba(6,182,212,0.3);
  border-top-color: #06b6d4;
  border-radius: 50%;
  vertical-align: middle;
  animation: ipSpin 0.7s linear infinite;
}
@keyframes ipSpin { to { transform: rotate(360deg); } }

</style>