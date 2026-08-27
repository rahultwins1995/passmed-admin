<script setup lang="ts">
import Pagination from '@/components/Pagination.vue'
import Loader_small from '@/components/loaders/Loader_small.vue'
import Empty from '@/components/loaders/Empty.vue'
import Loading from '@/components/loaders/Loading.vue'
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

const route = useRoute()
const id = route.params.id;

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

const fetchData = async () => {
  data_loading.value = true

  try {
    const res:any = await $api.post("/question-feedback/getByQid/"+id, {
      page: data_page_current.value,
      search: input_search.value,
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
    const res:any = await $api.delete("/question-feedback/delete/"+id)
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


onMounted(() => {
  fetchData()
})

watch(input_search, (val) => {
  data_page_current.value = 1;
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
      <h2>Question Feedback</h2>
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

        <table class="dataTable">
          <thead>
            <tr>
              <th>No.</th>
              <th>QID</th>
              <th>Feedback Users</th>
              <th>Feedback Text</th>
              <th>Question</th>
              <th>Feedback Date</th>
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
            <tr v-for="(item, i) in getDataList" :key="i">
              <td>{{i+1}}</td>
              <td>#{{ item.qid }}</td>
              <td>{{ item?.user?.email??'-' }}</td>
              <td>{{ item.feedback_text }}</td>
              <td>{{ item.question_stem }}</td>
              <td>{{ item.create_date }}</td>

              <td>
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

</template>