<script setup lang="ts">
import Pagination from '@/components/Pagination.vue'

import AddExamCategory from '@/components/exams/AddExamCategory.vue';
import EditExamCategory from '@/components/exams/EditExamCategory.vue';

import Loader_small from '@/components/loaders/Loader_small.vue'
import Empty from '@/components/loaders/Empty.vue'
import Loading from '@/components/loaders/Loading.vue'
import { ref, onMounted, computed } from 'vue'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

const { $api, $toast,$confirm } = useNuxtApp()

const data_loading = ref(true)
const fullLoading = ref(false)

// filters
const input_search = ref('')

const seartchTriggerFetchMode=(mode:any='search')=>{

  if (mode === 'search') {
    // reset other 

  } else {
    // reset search 
    input_search.value = ""
  }
    getDataList.value=[];
    data_page_current.value = 1;
    pageCurnt.value = 1;
    fetchData();
}

// input search typing done
let timerinputsearch:any = null;
watch(input_search, (val) => {
  clearTimeout(timerinputsearch)
  timerinputsearch = setTimeout(() => {
     seartchTriggerFetchMode('search');
  }, 800)
});

// modal
const showModal = ref(false)


const pageCurnt = ref(1)
const totalPages = ref(1)

const data_page_current = ref(1)
const total_data = ref(0)
const limit_data = ref(10)

const getDataList = ref<any[]>([])
const fetchData = async () => {
  data_loading.value = true

  try {
    const res:any = await $api.post("/exams-categories", {
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
    const res:any = await $api.delete("/exams-categories/delete/"+id)
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

const openAddCategoryModal = () => {
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

</script>

<template>

  <Loading v-if="fullLoading" />
  
<div class="dashwrap">

  <!-- HEADER -->
  <div class="section-hdr">
    <div class="section-hdr-left">
    </div>
    <div class="section-hdr-right">
      <button class="btn btn-primary btn-sm" @click="openAddCategoryModal">
        Add Exam Category
      </button>
    </div>
  </div>

  <!-- EXPLAINER -->
  <div class="info-banner" role="note">
    <svg class="info-banner-icon" width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" x2="12" y1="16" y2="12"></line>
      <line x1="12" x2="12.01" y1="8" y2="8"></line>
    </svg>
    <p class="info-banner-text">
      Categories group exam subjects (e.g. &ldquo;Cardiology&rdquo; under ABIM) used when tagging
      questions for the question bank. Questions inherit their exam &rarr; category &rarr; subject
      &rarr; domain &rarr; discipline classification.
    </p>
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

        <table class="CategoryTable">
          <thead>
            <tr>
              <th>
               No.
              </th>
              <th>Name</th>
              <th>Questions</th>
              <th>Status</th>

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
              <td>
                {{i+1}}
              </td>
              <td>{{ item.name }}</td>

              <td>{{ item.questions_count ?? 0 }}</td>

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
<AddExamCategory
  v-model="showModal"
  @saved="fetchData"
/>
<!-- MODAL -->
<EditExamCategory
  v-model="showEditModal"
  @saved="fetchData"
  :detail="getDetail"
/>


</template>

<style scoped>
.info-banner {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 16px;
  padding: 12px 14px;
  border: 1px solid var(--teal-border, var(--border));
  border-radius: var(--r-sm, 8px);
  background: var(--teal-pale, var(--surface));
}
.info-banner-icon {
  flex: 0 0 auto;
  margin-top: 1px;
  color: var(--teal-dark, var(--accent));
}
.info-banner-text {
  margin: 0;
  font-size: 0.82rem;
  line-height: 1.5;
  color: var(--ink-mid, var(--ink-dim));
}
</style>