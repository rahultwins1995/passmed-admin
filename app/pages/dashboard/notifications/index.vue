<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

import { ref, onMounted } from 'vue'
import Pagination from '@/components/Pagination.vue'

import Loader_small from '@/components/loaders/Loader_small.vue'
import Empty from '@/components/loaders/Empty.vue'
import AddNotificationModal from '@/components/notifications/AddNotificationModal.vue'

const { $api, $toast,$confirm } = useNuxtApp()

const fullLoading=ref<boolean>(false);

const showAddModal = ref(false)
const onClickAddModal = () => {
    showAddModal.value = true;
}

const confirmDelete=async(id:any='0')=>{
  const confirmed = await $confirm('Are you sure you want to remove this item?')
    if(confirmed){
        deleteData(id);
    }
}

const deleteData= async (id="0") => {

    fullLoading.value = true

  try {
    const res:any = await $api.delete(`/notifications/delete/${id}`)

    if (res.data.status === 'success') {
     
      $toast('Deleted is successFully.')
      callbackSaved();
    
    } else {
      fullLoading.value=false;
      $toast('Failed to delete', 'error')
    }

  } catch (err: any) {
    $toast(err?.response?.data?.msg || err?.response?.data?.message || 'Failed to delete', 'error')
  }finally{
    fullLoading.value=false;
  }
}

const counSelected=ref<any>([]);
const selectedAll = computed(() => {
  return getDataList.value.length > 0 &&
         getDataList.value.every(u => counSelected.value.includes(u.id))
})

const onDeleteAll= async () => {

  if (counSelected.value.length === 0) {
    $toast('Please select at least one or select All items');
    return
  }

    const confirmed = await $confirm('Are you sure you want to delete selected item?')
    if(!confirmed){
      return;
    }

    fullLoading.value = true

  try {
    const res:any = await $api.delete('/notifications/delete-all',{
       body:{
       ids: selectedAll.value,
       }})

    if (res.data.status === 'success') {
      $toast('Deleted is successFully.')
      callbackSaved();
    
    } else {
      $toast('Failed to delete', 'error')
    }

  } catch (err: any) {
    $toast(err?.response?.data?.msg || err?.response?.data?.message || 'Failed to delete', 'error')
  }finally{
     fullLoading.value=false;
  }
}

const onClickSelectAll = () => {
  
  if(getDataList.value.length === 0){
    $toast('No data load.','error');
    return;
  }

  if (selectedAll.value) {
    counSelected.value = []
  } else {
    counSelected.value = getDataList.value.map(u => u.id)
  }
}

const onClickSelect = (id: number) => {

    if (counSelected.value.includes(id)) {
      counSelected.value = getDataList.value.filter(i => i !== id)
    } else {
      counSelected.value.push(id)
    }
}

// Whole-row click opens the notification (checkbox / delete / eye handle their own clicks).
const openNotification = (id: number|string) => {
  navigateTo(`/dashboard/notifications/${id}`)
}

/*
* FETCH DATA
*/

const filter_status = ref<string|number>("all")

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
    const res:any = await $api.post("/notifications", {
      status: filter_status.value,
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


const onClickStatus=async(element:any='all')=>{
    filter_status.value=element;
    await fetchData();
}

/**
 *  FETCH count
 */
const all_total=ref<any>('0');
const total_active=ref<any>('0');
const total_draft=ref<any>('0');
const total_archive=ref<any>('0');

const fetchAllCountData = async () => {
  try {
    const res:any = await $api.get("/notifications/counts")
    const obj:any = res.data
    if (obj.status === 'success') {
        all_total.value =obj.all_total
        total_active.value =obj.total_active
        total_draft.value =obj.total_draft
        total_archive.value =obj.total_archive

    }else{
        all_total.value =0
        total_active.value =0
        total_draft.value =0
        total_archive.value =0
    }
      
  } catch (err:any) {
    
    all_total.value =0
    total_active.value =0
    total_draft.value =0
    total_archive.value =0
  }
}
/* * FETCH count END */


/**
 * triger back function
 */
const callbackSaved =async() => {
    fetchAllCountData();
     await fetchData();
}

onMounted(async() => {
    fetchAllCountData();
     await fetchData();
});

</script>

<template>
  <Loading v-if="fullLoading" />
 <div class="dashwrap">
    <div class="section-hdr">
      <div class="section-hdr-left">
      </div>
        <div class="section-hdr-right">
          <button class="btn btn-primary btn-sm" 
          type="button" 
          @click="onClickAddModal">
              <svg fill="none" height="13" stroke="currentColor" stroke-linecap="round" stroke-width="2.5" 
              viewBox="0 0 24 24" width="13">
              <line x1="12" x2="12" y1="5" y2="19"></line>
              <line x1="5" x2="19" y1="12" y2="12"></line>
              </svg>
              New sent
          </button>
        </div>
    </div>

  <!-- Stats row -->
    <div class="stats-row" style="grid-template-columns:repeat(4,1fr);margin-bottom:20px">
      <div class="stat-card"
      @click="onClickStatus('all')">
          <div class="stat-card-top">
            <div class="stat-icon green">
              <svg fill="none" height="14" stroke="currentColor" stroke-linecap="round" stroke-width="2.5" 
              viewBox="0 0 24 24" width="14">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
          </div>
          <div class="stat-val">{{all_total}}</div>
          <div class="stat-label">
            All notification
          </div>
      </div>

      <div class="stat-card"
      @click="onClickStatus('1')">
        <div class="stat-card-top">
          <div class="stat-icon green">
            <svg fill="none" height="14" stroke="currentColor" stroke-linecap="round" stroke-width="2.5" 
            viewBox="0 0 24 24" width="14">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
        </div>
        <div class="stat-val">{{total_active}}</div>
        <div class="stat-label">Active</div>
      </div>

      <div class="stat-card"
      @click="onClickStatus('0')">
        <div class="stat-card-top">
          <div class="stat-icon amber">
            <svg fill="none" height="14" stroke="currentColor" stroke-linecap="round" stroke-width="2.5" 
            viewBox="0 0 24 24" width="14">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"></path>
            <polyline points="15 3 21 3 21 9"></polyline>
            <line x1="10" x2="21" y1="14" y2="3"></line></svg>
          </div>
        </div>
        <div class="stat-val">{{total_draft}}</div>
        <div class="stat-label">Draft</div>
      </div>

      <div class="stat-card"
      @click="onClickStatus('2')">
        <div class="stat-card-top">
          <div class="stat-icon amber">
            <svg fill="none" height="14" stroke="currentColor" stroke-linecap="round" stroke-width="2.5" 
            viewBox="0 0 24 24" width="14">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"></path>
            <polyline points="15 3 21 3 21 9"></polyline>
            <line x1="10" x2="21" y1="14" y2="3"></line></svg>
          </div>
        </div>
        <div class="stat-val">{{total_archive}}</div>
        <div class="stat-label">Archive</div>
      </div>

    </div>

  <div class="wrapheader"  v-if="counSelected.length > 0">
    <div class="lefthead">
        {{counSelected.length }}
       <span class="label">selected</span>
    </div>
     <div class="righthead">
      <button class="btn btn-danger btn-sm" type="button"
      @click="onDeleteAll">Delete All
      </button>
    </div>
      
  </div>

  <div class="card" style="margin-bottom:20px">
      <div class="table-wrap">
        <table class="usersTable">
            <thead>
                <tr>
                <th style="width: 36px">
                <input id="notifyAllselect" type="checkbox" 
                  :checked="selectedAll"
                  @change="onClickSelectAll()" 
                  />
                </th>
                <th>S.No.</th>
                <th>Type</th>
                <th>Title</th>
                <th>To User</th>
                <th>Sender User</th>
                <th>Message</th>
                
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
                </tr>
            </thead>
            <!--v-if-->

            <tbody v-if="data_loading || getDataList.length === 0">
               <tr>
                <td colspan="15">
                <Empty v-if="!data_loading && getDataList.length === 0"/>
                <Loader_small v-else />
                </td>
              </tr>
            </tbody>
            <tbody v-else>
                <tr v-for="(vl, i) in getDataList" :key="i"
                 :class="(Number(vl.is_read) === 1)?'tdisread':'tdUnRead'"
                 style="cursor:pointer"
                 @click="openNotification(vl.id)">
                    <td @click.stop>
                      <input class="notifyselect" type="checkbox"
                      :checked="counSelected.includes(vl.id)"
                      @change="onClickSelect(vl.id)" />
                    </td>
                    <td>{{ i+1 }}</td>
                       <td>
                      <span v-if="vl.type === 'milestone'" class="ntitle">
                        <div class="n-icon icon-milestone">
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                         stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                        </svg>
                        </div>
                        Milestone
                      </span>
                       <span v-else-if="vl.type === 'new_content'" class="ntitle">
                        <div class="n-icon icon-content">
                          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                        </svg>
                        </div>
                        New content
                      </span>
                      <span v-else-if="vl.type === 'account'" class="ntitle">
                        <div class="n-icon icon-account">
                          <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
                           stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                           <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                          <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                        </div>
                        Account
                      </span> 
                      <span v-else-if="vl.type === 'reminder'" class="ntitle">
                        <div class="n-icon icon-reminder">
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" 
                        stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                          <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        </div>
                        Reminders
                      </span>
                      <span v-else class="ntitle">
                        <div class="n-icon icon-content">
                          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                          </svg>
                        </div>
                         Message
                      </span>
                    </td>
                    <td class="notifytdtitle">{{ vl?.title??"-" }}</td>
                    <td class="notifytdusrTo">{{ vl?.to_user??"-" }}</td>
                    <td class="notifytdusrFrm">{{ vl?.from_user??"-" }}</td>
                    <td class="notifytdmsg">{{ vl?.message??"-" }}</td>
                  
                    <td>
                      <span v-if="Number(vl.status) === 1" class="badge badge-green">
                         Active
                      </span> 
                      <span v-else-if="Number(vl.status) === 2" class="badge badge-danger">
                         Archive
                      </span>
                      <span v-else class="badge badge-danger">
                         Draft
                      </span>
                    </td>

                    <td>{{ vl?.created_at??"-" }}</td>
                    <td @click.stop>
                        <NuxtLink
                        :to="`/dashboard/notifications/${vl.id}`"
                        class="actTdbtn btn btn-outline btn-sm viewstd" >
                        <svg fill="none" height="12" stroke="currentColor" stroke-linecap="round" stroke-width="2.5" 
                        viewBox="0 0 24 24" width="12"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                        </NuxtLink>

                        <button class="actTdbtn btn btn-danger btn-sm btn-icon" type="button"
                         @click="confirmDelete(vl.id)"
                        >
                            <svg fill="none" height="12" stroke="currentColor" stroke-linecap="round" stroke-width="2.5"
                                viewBox="0 0 24 24" width="12">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6l-1 14H6L5 6"></path>
                            </svg>
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

<AddNotificationModal
 v-model="showAddModal"
@saved="callbackSaved"
/>

</template>