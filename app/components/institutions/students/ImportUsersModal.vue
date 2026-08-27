<script setup lang="ts">
import Multiselect from '@vueform/multiselect'
import { ref, watch, onMounted, computed } from 'vue'
import Loading from '@/components/loaders/Loading.vue'

const props = defineProps<{
  modelValue: Boolean
stopProgress:boolean
detail:any | null
institution_id: any|null 
}>();

const { $api, $toast,$confirm } = useNuxtApp()
const emit = defineEmits(['update:modelValue', 'progressTrigger'])

// close modal
const closeModal = () => {
  emit('update:modelValue', false)
}

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
    await $api.post('/institution-student-import/stop');

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
const status = ref<any>('2')
const rowCount = ref<number | null>(null)
const showPreview = ref<boolean>(false)
const fileName = ref<any>("users.csv");
const fileInput = ref<HTMLInputElement | null>(null)
const allowed = ['csv','xlsx','xls'];

// select file
const handleFileSelect = (e:any) => {
    const file = e.target.files[0];
    if (!file) return;
    csvFile.value = file;
    fileName.value = file.name
    showPreview.value = true
    detectRowCount(file);
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
    
    if (!props.institution_id){
       $toast('Please select institution','error');
         return;
    }
  
    if (!csvFile.value){
         return $toast('Please select CSV','error');
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
        formData.append('status', status.value)

    // postDirect (not post): upload straight to the backend, bypassing the /api
    // Vercel proxy whose ~4.5MB serverless body cap 413'd larger student CSVs.
    // Auth still rides on the Bearer header, so no cookie/cross-origin issue.
    const res:any = await $api.postDirect('/institution-student-import/files/'+props.institution_id, formData);
      const obj = res?.data || {};

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


const confirmSheetsImport = async () => {
    
    if (!props.institution_id){
       $toast('Please select institution','error');
         return;
    }
  
  if (!sheetsUrl.value) {
    return $toast('Please enter Google Sheets URL', 'error')
  }

  importProgress.value = 0
  importCreatedRow.value = 0
  importTotalRow.value = 0
  importStatus.value = 0
  showProgressBox.value = true

  fullLoading.value = true;

  try {

    const res:any = await $api.post('/institution-student-import/sheets/'+props.institution_id,{
        url: sheetsUrl.value,
        status: status.value
    });

    const obj = res?.data || {}

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

const loadProgressData=()=>{

    const pdata=detailProgress.value||{};
    if (!pdata || pdata.status === undefined || pdata.status === null) return;

      showProgressBox.value = true;
      importStatus.value = pdata?.status ?? 0
      importProgress.value = Number(pdata?.progress ?? 0)
      importCreatedRow.value = Number(pdata?.created_row ?? 0)
      importTotalRow.value = Number(pdata?.total_row ?? 0)
      if (Number(importStatus.value) === 1 || importProgress.value >= 100) {
        importProgress.value = 100;
        $toast('Import completed successfully');
        importOtherProcess.value=true;

        setTimeout(() => {
          showProgressBox.value = false
        }, 1500)
      }
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
    status.value = '0'
    csvFile.value = null
    showPreview.value = false
    rowCount.value = null
    fileName.value = 'users.csv'
  }

});


onMounted(() => {
  // check starting progress
  if(importOtherProcess.value == false){
    return;
  }
});

</script>

<template>

<Loading v-if="fullLoading"/>

<div  v-if="props.institution_id && modelValue" class="overlay overlay-top open questionmodelwrap" @click.self="closeModal">
    <div class="drawer" style="width:620px">
        <div class="drawer-header">
            <div class="fullheadsec">
                <div class="drawer-header-title">
                    Import Users
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

         <div v-if="showProgressBox" class="drawer-body">
          <!-- Progress Box -->
            <div  class="import-progress-floating">
              <div class="import-progress-head">
                <div>
                <div class="import-progress-title">Import Progress</div>
                <div class="import-progress-subtitle">{{ progressText }}</div>
                </div>
              </div>

              <div class="import-progress-bar-wrap">
                <div class="import-progress-bar" :style="{ width: importProgress + '%' }"></div>
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

          <div v-else class="importfrmWrap">
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
                                  {{ fileName??'userimportfile.csv' }}
                            </span>
                                <span class="csvRowCount">
                                    — 142 rows detected
                                </span>
                            </div>
                        </div>
                       
                        <div class="expected-csv-column-wrap">
                            <div class="expected-csv-column-title">
                                Expected CSV Columns
                            </div>
                            <div class="expected-csv-column-contnt">
                            email, first_name, last_name, and optional fields grad_year
                            </div>
                        </div>

                        <div style="display:flex;gap:8px">
                            <button class="btn btn-primary" 
                            @click="confirmCsvImport()" 
                            style="flex:1" type="button">
                           Connect &amp; Import 
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

                        <div class="form-row">
                            <label class="form-label">Google Sheets URL</label>
                            <input class="form-input sheetsUrl"
                            placeholder="https://docs.google.com/spreadsheets/d/..." 
                            type="url"
                            v-model="sheetsUrl"
                            />
                        </div>

                    

                        <div class="expected-csv-column-wrap">
                            <div class="expected-csv-column-title">
                                Expected CSV Columns
                            </div>
                            <div class="expected-csv-column-contnt">
                            email, first_name, last_name, and optional fields grad_year
                            </div>
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
</style>