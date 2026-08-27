<script setup lang="ts">
import AddDisciplineModal from '@/components/disciplines/AddDisciplineModal.vue';
import EditDisciplineModal from '@/components/disciplines/EditDisciplineModal.vue';

import Pagination from '@/components/Pagination.vue'
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
const input_search = ref('')

// modal
const showModal = ref(false)

const fetchData = async () => {
  data_loading.value = true

  try {
    const res:any = await $api.post("/disciplines", {
      page: data_page_current.value,
      limit: limit_data.value
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
    const res:any = await $api.delete("/disciplines/delete/"+id)
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

const filteredDiscipline = computed(() => {
  return getDataList.value.filter(item => {
    return (
      (!input_search.value || String(item.name) === input_search.value)
    )
  })
});

const openAddDisciplineModal = () => {
  showModal.value = true;
}

const getDetail = ref<any>(null)
const showEditModal = ref<boolean>(false)
const onClickQEdit=(detail:any)=>{
   getDetail.value=detail;
   showEditModal.value=true;
}

onMounted(() => {
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
    </div>
     <div class="section-hdr-right">
      <button class="btn btn-primary btn-sm" @click="openAddDisciplineModal">
        Add Discipline
      </button>
    </div>

  </div>

  <!-- FILTER -->
  <div class="filter-bar">
    <input
      v-model="input_search"
      class="filter-input"
      placeholder="Search..."
    />
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

        <table class="DisciplineTable">
          <thead>
            <tr>
              <th>
               No.
              </th>
              <th>Name</th>
              <th>Status</th>
             
              <th>Action</th>
            </tr>
          </thead>
          <tbody v-if="data_loading || filteredDiscipline.length === 0">
            <tr>
              <td colspan="15">
                 <Loader_small v-if="data_loading" />
                  <Empty v-else />
              </td>
            </tr>
          </tbody>

          <tbody v-else>
            <tr v-for="(item, i) in filteredDiscipline" :key="i">
              <td>
                {{i+1}}
              </td>
              <td>{{ item.name }}</td>

              <td>
                {{ item.status == 1 ? 'Active' : 'Inactive' }}
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
<AddDisciplineModal
  v-model="showModal"
  @saved="fetchData"
/>
<!-- MODAL -->
<EditDisciplineModal
  v-model="showEditModal"
  @saved="fetchData"
  :detail="getDetail"
/>

</template>