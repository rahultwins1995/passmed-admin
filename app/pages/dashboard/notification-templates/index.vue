<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

import { ref, onMounted } from 'vue'
import Pagination from '@/components/Pagination.vue'

import Loader_small from '@/components/loaders/Loader_small.vue'
import Empty from '@/components/loaders/Empty.vue'
import AddTemplateModal from '@/components/notification-templates/AddTemplateModal.vue'
import EditTemplateModal from '@/components/notification-templates/EditTemplateModal.vue'
import BroadcastSendModal from '@/components/notification-templates/BroadcastSendModal.vue'
import ListRuleModal from '@/components/notification-templates/rules/ListRuleModal.vue'

const { $api, $toast,$confirm } = useNuxtApp()
const detailId = ref<any>(null);
const fullLoading=ref<boolean>(false);

/*
* Add Model
*/
const showAddModal = ref(false)
const onClickAddModal = () => {
    showAddModal.value = true;
}
/* * Add Model END*/

const showEditModal = ref(false)
const openEdit=(id:any='0')=>{
    detailId.value=id;
    showEditModal.value = true;
}

const confirmDelete= async (id:any='0')=>{
  const confirmed = await $confirm('Are you sure you want to remove this item?')
    if(confirmed){
        deleteData(id);
    }
}

const deleteData= async (id="0") => {

    fullLoading.value = true

  try {
    const res:any = await $api.delete(`/notification-templates/delete/${id}`)

    if (res.data.status === 'success') {
      fullLoading.value=false;
      
      $toast('Deleted is successFully.')
      callbackSaved();
    
    } else {
      fullLoading.value=false;
      $toast('Failed to delete', 'error')
    }

  } catch (err: any) {
    fullLoading.value=false;
    $toast(err?.response?.data?.msg || err?.response?.data?.message || 'Failed to delete', 'error')
  }
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
    const res:any = await $api.post("/notification-templates", {
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

/**
 *  FETCH count
 */
const all_total=ref<any>('0');
const total_active=ref<any>('0');
const total_draft=ref<any>('0');

const fetchAllCountData = async () => {
  try {
    const res:any = await $api.get("/notification-templates/counts")
    const obj:any = res.data
    if (obj.status === 'success') {
        all_total.value =obj.all_total
        total_active.value =obj.total_active
        total_draft.value =obj.total_draft

    }else{
        all_total.value =0
        total_active.value =0
        total_draft.value =0
    }
      
  } catch (err:any) {
    
    all_total.value =0
    total_active.value =0
    total_draft.value =0
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


/**
 * onClickFetch
 */
const onClickFetch =async(status='all') => {
  filter_status.value=status;
   await fetchData();
}

onMounted(async () => {
    fetchAllCountData();
    await fetchData();
});

</script>

<template>
 <div class="dashwrap">
    <div class="section-hdr">
    <div class="section-hdr-left">
    <p>Transactional email templates and automated notification rules</p>
    </div>
      <div class="section-hdr-right">
        <button class="btn btn-primary btn-sm" 
        type="button"
        @click="onClickAddModal">
        <svg fill="none" height="13" stroke="currentColor" stroke-linecap="round" stroke-width="2.5" 
        viewBox="0 0 24 24" width="13"><line x1="12" x2="12" y1="5" y2="19"></line>
        <line x1="5" x2="19" y1="12" y2="12"></line>
        </svg>
          New Notifications Template
        </button>
      </div>
    </div>

      <!-- Stats row -->
      <div class="stats-row" style="grid-template-columns:repeat(4,1fr);margin-bottom:20px">
      
          <div class="stat-card emlTemp-stat-btn"
          :class="{active:filter_status === 'all'}"
          @click="onClickFetch('all')">
              <div class="stat-card-top">
              <div class="stat-icon teal">
                <svg fill="none" height="14" stroke="currentColor" stroke-linecap="round" stroke-width="2.5"
                viewBox="0 0 24 24" width="14">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
              </div>
              </div>
              <div class="stat-val">{{ all_total }}</div>
              <div class="stat-label">All</div>
          </div>

          <div class="stat-card emlTemp-stat-btn"
           :class="{active:filter_status === '1'}"
            @click="onClickFetch('1')">
              <div class="stat-card-top">
                <div class="stat-icon green">
                  <svg fill="none" height="14" stroke="currentColor" stroke-linecap="round" stroke-width="2.5" 
                  viewBox="0 0 24 24" width="14"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                </div>
              </div>
              <div class="stat-val">{{ total_active }}</div>
              <div class="stat-label">Active</div>
          </div>

          <div class="stat-card emlTemp-stat-btn"
           :class="{active:filter_status === '0'}"
           @click="onClickFetch('0')">
            <div class="stat-card-top">
            <div class="stat-icon amber">
              <svg fill="none" height="14" stroke="currentColor" stroke-linecap="round" stroke-width="2.5"
              viewBox="0 0 24 24" width="14">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline><line x1="10" x2="21" y1="14" y2="3"></line>
              </svg>
            </div>
            </div>
            <div class="stat-val">{{ total_draft }}</div>
            <div class="stat-label">Draft</div>
          </div>

      </div>

    <!-- notification templates -->
    <div class="card" style="margin-bottom:20px">
        
      <div style="font-size:0.78rem;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:var(--ink-dim);margin-bottom:16px">
          Transactional Templates
        </div>
        
         <div class="emailTemplateList"
         v-if="data_loading || getDataList.length === 0">

            <Empty v-if="!data_loading && getDataList.length === 0"/>
            <Loader_small v-else />
          </div>

        <div v-else class="emailTemplateList">
           
            <div class="email-template-row"  v-for="vl in getDataList" :key="vl.id">
                <div class="stat-icon teal" style="flex-shrink:0">
                    <svg fill="none" height="12" stroke="currentColor" stroke-linecap="round" stroke-width="2" 
                    viewBox="0 0 24 24" width="12">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                </div>
             
                <div style="flex:1">
                      <div style="font-size:0.85rem;font-weight:700;color:var(--ink)">
                      {{ vl.name??"" }}
                      </div>
                      <div style="font-size:0.72rem;color:var(--ink-dim)">
                        {{ vl.sub_detail??"" }}
                      </div>
                       <div style="font-size:0.72rem;color:var(--ink-dim)">
                        {{ vl.type_name??"" }}
                      </div>
                </div>

                <span v-if="Number(vl.status) === 1"
                class="badge badge-green">
                Active
                </span>
                <span v-else
                class="badge badge-amber">
                Draft
                </span>

                <div style="display:flex;gap:6px">
                  <button class="btn btn-outline btn-sm" 
                    type="button" 
                    @click="openEdit(vl.id)">
                    Edit
                  </button>
                    <NuxtLink 
                    :to="`/dashboard/notification-templates/${vl.id}`"
                    class="btn btn-outline btn-sm" >
                   Preview
                  </NuxtLink>
                  <button class="btn btn-danger btn-sm" 
                    type="button" 
                    @click="confirmDelete(vl.id)">
                    Delete
                  </button>
                </div>
            </div>
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

  <!-- Automated Rule tool -->
  <ListRuleModal/>
  <!-- Automated Rule tool end-->

  <!-- Broadcast tool -->

  <BroadcastSendModal/>
  <!-- Broadcast tool end  -->

<AddTemplateModal
 v-model="showAddModal"
@saved="callbackSaved"
/>

<EditTemplateModal v-if="showEditModal"
 v-model="showEditModal"
:detailId="detailId"
@saved="callbackSaved"
/>

</template>