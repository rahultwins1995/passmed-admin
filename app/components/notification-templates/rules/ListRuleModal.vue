<script setup lang="ts">

import Loading from '@/components/loaders/Loading.vue';
import Loader_small from '@/components/loaders/Loader_small.vue';
import Empty from '@/components/loaders/Empty.vue'
import AddRuleModal from '@/components/notification-templates/rules/AddRuleModal.vue';
import EditRuleModal from '@/components/notification-templates/rules/EditRuleModal.vue';
import RulePreviewModal from '@/components/notification-templates/rules/RulePreviewModal.vue';

const { $api, $toast,$confirm } = useNuxtApp()


const AddshowModal = ref(false);
const openModal=()=>{
 AddshowModal.value = true;
}

// Edit
const showEditModal = ref(false);
const editId = ref<any>(null);
const openEdit = (id:any) => { editId.value = id; showEditModal.value = true; }

// Preview
const showPreviewModal = ref(false);
const previewRule = ref<any>(null);
const openPreview = (vl:any) => { previewRule.value = vl; showPreviewModal.value = true; }

// TOGGLE
const toggleRule = async (id:any) => {
    fullLoading.value = true;
   try {
    const res:any =await $api.post('/notification-rules/toggle/' + id)
      const messages= res?.data?.msg || res?.data?.message  || 'Update Filed';
      $toast(messages);
      if(res.data.status == 'success'){
          callbackSaved()
      }

    } catch (err:any) {
      const messages= err?.response?.data?.msg  || err?.response?.data?.message  || 'Update Filed';
      $toast(messages,'error');

    }finally{
        fullLoading.value = false;
    }
}

//  CHANNEL UPDATE
const updateDeliveryEmail = async (id:any=0) => {
   fullLoading.value = true;
   try {
      const res:any= await $api.get('/notification-rules/update-delivery-email/' +id)

     const messages= res?.data?.msg || res?.data?.message  || 'Update Filed';
      $toast(messages);
      if(res.data.status == 'success'){
          callbackSaved()
      }

   } catch (err:any) {
      const messages= err?.response?.data?.msg  || err?.response?.data?.message  || 'Update Filed';
      $toast(messages,'error');
    }finally{
       fullLoading.value = false
    }

}

const updateDeliveryInapp = async (id:any=0) => {
   fullLoading.value = true;
   try {
      const res:any= await $api.get('/notification-rules/update-delivery-inapp/' + id)

     const messages= res?.data?.msg || res?.data?.message  || 'Update Filed';
      $toast(messages);
      if(res.data.status == 'success'){
          callbackSaved()
      }

   } catch (err:any) {
      const messages= err?.response?.data?.msg  || err?.response?.data?.message  || 'Update Filed';
      $toast(messages,'error');
    }finally{
       fullLoading.value = false
    }

}

/*
* FETCH DATA
*/

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
    const res:any = await $api.post("/notification-rules", {
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
      getDataList.value = dataList.map((item:any) => ({
      ...item,
      delivery_email: Number(item.delivery_email),
      delivery_in_app: Number(item.delivery_in_app),
      status: Number(item.status)
      }));

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
/* * FETCH DATA END */
const fullLoading=ref<boolean>(false)

const confirmDelete=async(id:any='0')=>{
  const confirmed = await $confirm('Are you sure you want to remove this item?')
    if (confirmed) {
        deleteData(id);
    }
}

const deleteData= async (id="0") => {

    fullLoading.value = true

  try {
    const res:any = await $api.delete(`/notification-rules/delete/${id}`)

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

const callbackSaved=()=>{
  fetchData();
}

onMounted(fetchData)

</script>
<template>
  <Loading v-if="fullLoading" />
  <div class="dashwrap">
      <div class="card" style="margin-bottom:20px">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
            <div style="font-size:0.78rem;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:var(--ink-dim)">Automated Rules</div>
            <button class="btn btn-primary btn-sm" type="button"
            @click="openModal()"
            >
              <svg fill="none" height="12" stroke="currentColor" stroke-linecap="round" 
              stroke-width="2.5" viewBox="0 0 24 24" width="12">
              <line x1="12" x2="12" y1="5" y2="19"></line>
              <line x1="5" x2="19" y1="12" y2="12"></line>
            </svg>
              New Rule
            </button>
            </div>

        <div style="display:grid;grid-template-columns:1fr 70px 60px 40px;gap:4px;font-size:0.65rem;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--ink-dim);padding:0 0 8px;border-bottom:1px solid var(--border);margin-bottom:4px">
            <span>Rule</span>
            <span style="text-align:center">
              Channels
            </span>
              <span></span>
            <span style="text-align:center">On</span>
        </div>
            <div class="notifRuleList" 
            v-if="data_loading || getDataList.length === 0">
            
              <Empty v-if="!data_loading && getDataList.length === 0"/>
              <Loader_small v-else />
            </div>

            <div v-else
            class="notifRuleList">
              <div class="notif-rule-row"  
              v-for="vl in getDataList" :key="vl.id" >
              <div class="stat-icon green" style="flex-shrink:0">
                <svg fill="none" height="12" stroke="currentColor" stroke-linecap="round" stroke-width="2" 
                viewBox="0 0 24 24" width="12"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
              </svg>
            </div>

              <div style="flex:1">
                <div style="font-size:0.82rem;font-weight:700">
                {{ vl.name }}
                </div>
                <div style="font-size:0.72rem;color:var(--ink-dim)">
                  {{ vl.description }}
                </div>
              </div>

              <div style="display:flex;align-items:center;gap:12px">
                  <label style="display:flex;align-items:center;gap:5px;cursor:pointer;font-size:0.7rem;color:var(--ink-dim)">
                        <input type="checkbox" style="accent-color:var(--teal)"
                        :checked="vl.delivery_email == 1"
                        @change="updateDeliveryEmail(vl.id)"
                        />
                        Email
                  </label>

                    <label style="display:flex;align-items:center;gap:5px;cursor:pointer;font-size:0.7rem;color:var(--ink-dim)">
                        <input type="checkbox" style="accent-color:var(--teal)" 
                       :checked="vl.delivery_in_app == 1"
                        @change="updateDeliveryInapp(vl.id)"
                        />
                        In-app
                    </label>

                      <div  v-if="Number(vl.status) === 1" 
                      class="toggletrack active" id="toggle-lowscore" 
                      style="width: 32px; height: 18px; background: var(--teal); border-radius: 99px; cursor: pointer; position: relative; transition: background 0.2s;"
                        @click="toggleRule(vl.id)" 
                        >
                        <div class="toggle-lowscore-thumb"
                        style="position: absolute; top: 2px; left: 16px; width: 14px; height: 14px; background: rgb(255, 255, 255); border-radius: 50%; transition: left 0.15s;"
                        >
                        </div>
                      </div>

                      <div v-else
                      class="toggletrack" id="toggle-lowscore"
                      style="width: 32px; height: 18px; background: var(--border); border-radius: 99px; cursor: pointer; position: relative; transition: background 0.2s;"
                      @click="toggleRule(vl.id)" >
                        <div class="toggletrack toggle-weekly-thumb"
                        style="position: absolute; top: 2px; left: 2px; width: 14px; height: 14px; background: rgb(255, 255, 255); border-radius: 50%; transition: left 0.15s;"
                        >
                      </div>
                    </div>
                      <button
                      @click="openPreview(vl)"
                      class="btn btn-outline btn-sm btn-icon"
                      type="button" title="Preview">
                      <svg fill="none" height="12" stroke="currentColor" stroke-linecap="round"
                      stroke-width="2.5" viewBox="0 0 24 24" width="12">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                      </button>

                      <button
                      @click="openEdit(vl.id)"
                      class="btn btn-outline btn-sm btn-icon"
                      type="button" title="Edit">
                      <svg fill="none" height="12" stroke="currentColor" stroke-linecap="round"
                      stroke-width="2.5" viewBox="0 0 24 24" width="12">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"></path>
                      <path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                      </button>

                      <button
                      @click="confirmDelete(vl.id)"
                      class="btn btn-danger btn-sm btn-icon"
                      type="button" title="Delete">
                      <svg fill="none" height="12" stroke="currentColor" stroke-linecap="round"
                      stroke-width="2.5" viewBox="0 0 24 24" width="12">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6l-1 14H6L5 6"></path>
                      </svg>
                      </button>
                  </div>
              </div>
          </div>
      </div>
  </div>
  
    <AddRuleModal
    v-model="AddshowModal"
    @saved="callbackSaved"
    />

    <EditRuleModal
    v-model="showEditModal"
    :detailId="editId"
    @saved="callbackSaved"
    />

    <RulePreviewModal
    v-model="showPreviewModal"
    :rule="previewRule"
    />
</template>