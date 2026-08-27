<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

import AssignUser from '@/components/institutions/students/AssignUser.vue'
import EditAssignUser from '@/components/institutions/students/EditAssignUser.vue'
import ImportUsersModal from '@/components/institutions/students/ImportUsersModal.vue';
import Pagination from '@/components/Pagination.vue'

import Loader_small from '@/components/loaders/Loader_small.vue'
import Empty from '@/components/loaders/Empty.vue'
import Loading from '@/components/loaders/Loading.vue'

import { ref, onMounted} from 'vue'
import { useRoute } from 'vue-router'

const { $toast,$api,$confirm } = useNuxtApp()
const route = useRoute()
const id = route.params.id;

const pageDetail = ref<any>(null);

// Licence seat capacity for students (0 = no limit configured)
const seatsTotal = ref<number>(0);

// Which institution is this? The page only ever had the id from the URL, so the
// header read "Institution's Student Manager" with no way to tell WHICH one — and
// no way back. The detail call below already returns the name; we just never used it.
const institutionName = ref<string>('');

const fetchInstitutionSeats = async () => {
  try {
    const res:any = await $api.get("/institutions/edit/" + id)
    if (res?.data?.status === 'success') {
      seatsTotal.value = Number(res.data.data?.licence_seats) || 0
      institutionName.value = res.data.data?.institution_name ?? ''
    }
  } catch (e) {}
}

const pageCurnt = ref(1);
const totalPages = ref(1);

const data_page_current = ref(1);
const total_data = ref(0);
const limit_data = ref(10);

const getDataList = ref<any[]>([]);
const data_loading = ref(false);
const fullLoading = ref(false);

/**
 * FETCH DATA
 */
const fetchData = async () => {
  data_loading.value = true

  try {
    const res:any = await $api.post("/institution-students/assign/"+id, {
      page: data_page_current.value,
      limit: limit_data.value
    })

    const obj:any = res.data

    if (obj.status === 'success') {

      total_data.value = obj.total
      totalPages.value = Math.ceil(obj.total / obj.limit)
      pageCurnt.value = obj.current_page
      getDataList.value = obj.data || [];

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
    const res:any = await $api.delete("/institution-students/delete/"+id)
    const obj:any = res.data
    if (obj.status === 'success') {
          const message = res?.data?.msg || 'Deleted successfully.';
         $toast(message);
        savedCallBack()
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

const showModal = ref(false)
const openAddUserModal = () => {
  showModal.value = true;
}

const showEditModal = ref(false)
const detailId = ref<any>(null)
const onClickEditModal = (id:any) => {
    detailId.value=id;
    showEditModal.value = true
}

const savedCallBack=async(tems:any='')=>{
    selectedUsers.value=[];
    await fetchData();
}

const selectedUsers = ref<number[]>([])

const onClickDeleteSelected=async()=>{

    if(selectedUsers.value.length === 0){
         $toast('Please select any one or more...','error');
        return;
    } 

    const confirmed = await $confirm('Are you sure you want to delete this selected item?')
    if(confirmed){
        apiDeleteSelected()
    }
}

const apiDeleteSelected = async () => {

    if(selectedUsers.value.length === 0){
         $toast('Please select any one or more...','error');
        return;
    }   

  fullLoading.value = true

  try {
    const res:any = await $api.delete("/institution-students/delete-all/"+id,{
        body:{
        ids:selectedUsers.value
        }
    })
    const obj:any = res.data
    if (obj.status === 'success') {
          const message = res?.data?.msg || 'Deleted successfully.';
         $toast(message);
        savedCallBack()
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

const isAllSelected = computed(() => {
  return getDataList.value.length > 0 &&
         getDataList.value.every(u => selectedUsers.value.includes(u.id))
})

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedUsers.value = []
  } else {
    selectedUsers.value = getDataList.value.map(u => u.id)
  }
}

const toggleUser = (id:number) => {
  if (selectedUsers.value.includes(id)) {
    selectedUsers.value = selectedUsers.value.filter(i => i !== id)
  } else {
    selectedUsers.value.push(id)
  }
}

/**
 * import csv 
 **/
const showImportModal = ref(false)
const openImportModal = () => {
  showImportModal.value = true;
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

 const startProgressPolling =async () => {
  if(progressTimer){
    importStopProgressPolling();
  }


  let intervalTime = 2000;

  progressTimer = setInterval(async () => {

    try {
      const res: any = await $api.get('/institution-student-import/progress')
      const obj = res?.data || {};

      const progress = res?.data?.data?.progress || 0;
      // dynamic slow down
      if (progress > 50) {
      intervalTime = 4000;
      }

      if(obj.status != 'processing'){
         importStopProgressPolling();
          importStopProgress.value = false;
          importCreatedRow.value =0;
          detailProgress.value=null;
          // Completion feedback + close the modal. The backend flips top-level status
          // to 'success' (or 'error') when the job finishes, so this branch — not the
          // one below — is what fires on completion. Previously it just reset silently,
          // so no toast showed and the modal fell back to the import form (looked like
          // the popup reopened).
          if (obj.status === 'success') {
            $toast(obj.msg || 'Student import completed successfully');
            showImportModal.value = false;
            await savedCallBack();
          } else if (obj.status === 'error') {
            $toast(obj.msg || 'Student import failed. Please try again.', 'error');
          }
        return;
      }

      const pdata = obj?.data || {};
      
      if (!pdata || pdata.status === undefined || pdata.status === null) {
        importStopProgressPolling();
         importStopProgress.value = false;
         importCreatedRow.value =0;
         detailProgress.value=null;
        return;
      }
      
      detailProgress.value=pdata;
      const importStatus =Number(pdata.status);
      const importCountProgress = Number(pdata?.progress ?? 0)
      importCreatedRow.value = Number(pdata?.created_row ?? 0)

      if (Number(importStatus) === 1 || importCountProgress >= 100) {
          importStopProgressPolling();
          importStopProgress.value = false;
          importCreatedRow.value =0;
          detailProgress.value=null;
           // ADD THIS
          await savedCallBack();
      }

    } catch (err:any) {
       importStopProgressPolling();
       importStopProgress.value = false;
       importCreatedRow.value =0;
       detailProgress.value=null;
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

const importCheckProgress=ref<boolean>(false);

onMounted(async () => {
   // check if import already running
     try {
      importCheckProgress.value=true;
      const res: any = await $api.get('/institution-student-import/progress')
      const obj = res?.data?.data || {};
      if(!res?.data || res.data.status == 'error'){
        return;
      }
     const importStatus=obj?.status ?? 1
      if (importStatus === 0) {
         progressTrigger(true);
      }
    }finally{
      importCheckProgress.value=false;
    }
});

/** end csv **/ 

onMounted(async ()=> {
   fetchInstitutionSeats()
   await savedCallBack()
});

</script>

<template>
    <Loading v-if="fullLoading" />

    <div class="dashwrap">

            <div class="section-hdr">
                <div class="section-hdr-left">
                    <!-- Back to the institutions list, plus WHICH institution this is.
                         The page previously showed neither, so an admin who landed here
                         from a row could only tell them apart by the id in the URL.
                         Links to the list rather than auto-opening the Edit modal —
                         "back" shouldn't hand you a dialog you then have to close. -->
                    <NuxtLink to="/dashboard/institutions" class="back-to-institutions">
                        <svg fill="none" height="12" stroke="currentColor" stroke-linecap="round"
                          stroke-linejoin="round" stroke-width="2.5" viewBox="0 0 24 24" width="12">
                            <line x1="19" x2="5" y1="12" y2="12"></line>
                            <polyline points="12 19 5 12 12 5"></polyline>
                        </svg>
                        Back to Institutions
                    </NuxtLink>
                    <h2>
                        <template v-if="institutionName">{{ institutionName }} — Student Manager</template>
                        <template v-else>Institution's Student Manager</template>
                    </h2>
                </div>
                <div class="section-hdr-right">

                    <div v-if="importCheckProgress" class="importCheckProgress">
                    <span class="ChkPrstle">
                    Import Check Processing
                    </span>
                    </div>
                    <div v-else  class="importCheckProgress">
                        <button class="btn btn-outline btn-sm" 
                        @click="openImportModal()"
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
                        Import csv
                        </div>
                        </button>
                    </div>

                    <button class="btn btn-primary btn-sm" type="button"
                    @click="openAddUserModal">
                        <svg fill="none" height="13" stroke="currentColor"
                            stroke-linecap="round" stroke-width="2.5"
                            viewBox="0 0 24 24" width="13" >
                            <line x1="12" x2="12" y1="5" y2="19"></line>
                            <line x1="5" x2="19" y1="12" y2="12"></line>
                        </svg>
                        Add New
                    </button>
                </div>

            </div>

        <div class="card">
             <div class="bulk-toolbar" id="usersBulkBar"
                v-if="selectedUsers.length > 0">

            <span id="bulkCount">{{ selectedUsers.length }} selected</span>
            <div class="bulk-actions" style="display:flex;gap:8px;flex-wrap:wrap">
                <button class="btn btn-outline btn-sm" type="button"
                @click="onClickDeleteSelected">
                Click Delete
                </button>
            </div>
        </div>
      
        <div class="table-wrap">
            <table class="usersTable" id="usersTable">
                <thead>
                    <tr>
                    <th style="width: 36px">
                    <input id="selectAllUsers" type="checkbox"
                    :checked="isAllSelected"
                    @change="toggleSelectAll" />
                    </th>
                    <th class="thTitle cursor-pointer">Name</th>
                    <th class="thTitle cursor-pointer">Email</th>
                    <th class="thTitle cursor-pointer">Grad <br>Year</th>
                    <th class="thTitle cursor-pointer">Invited <br>Date</th>
                    <th class="thTitle cursor-pointer">Last reminder<br> sent</th>
                    <th class="thTitle cursor-pointer">Activated <br>Date</th>
                    <th class="thTitle cursor-pointer">Last <br>Login</th>
                    <th class="thTitle cursor-pointer">Created</th>
                    <th class="thTitle cursor-pointer">Account<br>Status</th>
                    <th class="thTitle cursor-pointer">Seat<br>Status</th>
                    <th>Actions</th>
                    </tr>
                </thead>
                <!--v-if-->
                <tbody v-if="data_loading || getDataList.length === 0">
                    <tr>
                    <td class="text-center" colspan="15">
                    <Empty v-if="!data_loading && getDataList.length === 0"/>
                    <Loader_small v-else  />
                    </td>
                    </tr>
                </tbody>
                <tbody v-else >
                    <tr  v-for="(vl, i) in getDataList" :key="i">
                        <td>
                        <input class="user-select" type="checkbox" 
                        :checked="selectedUsers.includes(vl.id)"
                        @change="toggleUser(vl.id)" />
                        </td>
                        <td>{{ vl.name??"-" }}</td>
                        <td>{{ vl.email??"-" }}</td>
                        <td>{{ vl.grad_year??"-" }}</td>
                        
                        <td>{{ vl.seat_status != 3 ? (vl.created_at ?? "-") : "-" }}</td>
                        <td>{{ vl.last_reminder_sent??"-" }}</td>
                        <td>{{ vl.activated_date??"-" }}</td>
                        <td>{{ vl.last_login??"-" }}</td>


                        <td>{{ vl.created_at??"-" }}</td>
                        <td>
                          <span v-if="Number(vl.status) === 1" class="badge badge-green">
                          Active
                          </span>
                            <span v-else-if="Number(vl.status) === 2" class="badge badge-amber">
                            Pending
                            </span>
                            <span v-else class="badge badge-danger">
                            Inactive
                            </span>
                         </td>
                         <td>
                          <span v-if="Number(vl.seat_status) === 1" class="badge badge-green" >Active</span>
                          <span v-else-if="Number(vl.seat_status) === 2" class="badge badge-amber" >Pending</span>
                          <span v-else-if="Number(vl.seat_status) === 3" class="badge badge-blue">Invite Code</span>
                          <span v-else class="badge badge-danger" >Expired</span>
                        </td>
                        <td>
                            <button class="actTdbtn btn btn-danger btn-sm btn-icon" type="button"
                            @click="confirmDelete(vl.id)">
                                <svg fill="none"
                                    height="12"
                                    stroke="currentColor"
                                    stroke-linecap="round"
                                    stroke-width="2.5"
                                    viewBox="0 0 24 24"
                                    width="12">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6l-1 14H6L5 6"></path>
                                </svg>
                            </button>
                            <button class="actTdbtn btn btn-outline btn-sm btn-icon EditAcn" type="button"
                            @click="onClickEditModal(vl.id)">
                                Edit
                            </button>
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

    <AssignUser
    v-model="showModal"
    @saved="savedCallBack"
    :institution_id="id"
    :seatsTotal="seatsTotal"
    :seatsUsed="total_data" />

    <EditAssignUser 
    v-model="showEditModal" 
    @saved="savedCallBack"
    :detailId="detailId"/>

 <ImportUsersModal
  v-if="showImportModal"
   v-model="showImportModal"
   @progressTrigger="progressTrigger"
   :stopProgress="importStopProgress"
   :detail="detailProgress"
    :institution_id="id"
   />

</template>

<style scoped>
/* Back link sits above the title, not beside it — a breadcrumb, not an action. */
.back-to-institutions {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 4px;
  font-size: 0.74rem;
  font-weight: 600;
  color: var(--ink-dim, #64748b);
  text-decoration: none;
  transition: color 0.15s ease;
}
.back-to-institutions:hover {
  color: var(--teal, #0d9488);
}
.back-to-institutions svg {
  flex: none;
}
</style>