<script setup lang="ts">
import AddLearningOutcomeModal from '@/components/learningOutcomes/AddLearningOutcomeModal.vue';
import EditLearningOutcomeModal from '@/components/learningOutcomes/EditLearningOutcomeModal.vue';

import Pagination from '@/components/Pagination.vue'
import Loader_small from '@/components/loaders/Loader_small.vue'
import Empty from '@/components/loaders/Empty.vue'
import Loading from '@/components/loaders/Loading.vue'
import { ref, onMounted, watch } from 'vue'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

const { $api, $toast, $confirm } = useNuxtApp()

const pageCurnt = ref(1)
const totalPages = ref(1)

const data_page_current = ref(1)
const total_data = ref(0)
const limit_data = ref(10)

const getDataList = ref<any[]>([])
const data_loading = ref(true)
const fullLoading = ref(false)

const input_search = ref('')
const showModal = ref(false)

const fetchData = async () => {
  data_loading.value = true

  try {
    const res: any = await $api.post("/learning-outcomes", {
      page: data_page_current.value,
      limit: limit_data.value,
      // Server-side search. The older taxonomy managers filter the CURRENT PAGE
      // client-side with an exact-string match, so typing half a name finds nothing
      // and a match on page 3 never shows up. Not repeating that here.
      search: input_search.value,
    })

    const obj: any = res.data

    if (obj.status === 'success') {
      total_data.value = obj.total
      totalPages.value = Math.ceil(obj.total / obj.limit)
      pageCurnt.value = obj.current_page
      getDataList.value = obj?.data ?? []
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

const confirmDelete = async (item: any) => {
  // The API refuses to delete a value that questions point at (it would orphan
  // them). Say so BEFORE the round-trip rather than showing a rejection.
  if (Number(item?.questions_count) > 0) {
    $toast(
      `"${item.name}" is used by ${item.questions_count} question${item.questions_count === 1 ? '' : 's'}. Set it to Draft to retire it instead.`,
      'error'
    )
    return
  }

  const confirmed = await $confirm('Are you sure you want to remove this item?')
  if (confirmed) addDelete(item.id)
}

const addDelete = async (id = "0") => {
  if (!id || id == '0') {
    $toast('Deletion failed', 'error')
    return
  }

  fullLoading.value = true

  try {
    const res: any = await $api.delete("/learning-outcomes/delete/" + id)
    const obj: any = res.data
    if (obj.status === 'success') {
      fullLoading.value = false
      $toast(res?.data?.msg || 'Deleted successfully.')
      fetchData()
    } else {
      fullLoading.value = false
      $toast(res?.data?.msg || 'Deletion failed', 'error')
    }
  } catch (err: any) {
    fullLoading.value = false
    $toast(err?.response?.data?.msg || err?.response?.data?.message || 'Deletion failed.', 'error')
  }
}

const openAddModal = () => { showModal.value = true }

const getDetail = ref<any>(null)
const showEditModal = ref<boolean>(false)
const onClickQEdit = (detail: any) => {
  getDetail.value = detail
  showEditModal.value = true
}

onMounted(() => {
  fetchData()
})

watch(pageCurnt, (newPage) => {
  data_page_current.value = newPage
  fetchData()
})

// Debounced server-side search — reset to page 1, or you search page 4 of the old
// result set and get an empty table.
let searchTimer: any = null
watch(input_search, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    data_page_current.value = 1
    pageCurnt.value = 1
    fetchData()
  }, 350)
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
      <button class="btn btn-primary btn-sm" @click="openAddModal">
        Add Learning Outcome
      </button>
    </div>
  </div>

  <div style="font-size:0.76rem;color:var(--ink-dim);margin-bottom:12px;line-height:1.55">
    The <strong>Cognitive Task</strong> a question tests — Diagnosis, Management &amp;
    Treatment, Mechanism &amp; Pathophysiology, and so on. It is the
    <code>LEARNING OUTCOME</code> column in the import sheet, and institution imports
    are validated against this list.
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

        <table class="LearningOutcomeTable">
          <thead>
            <tr>
              <th>No.</th>
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
              <td>{{ i + 1 }}</td>
              <td>{{ item.name }}</td>
              <!-- Makes "can I delete this?" answerable at a glance. -->
              <td>{{ item.questions_count ?? 0 }}</td>
              <td>{{ item.status == 1 ? 'Active' : 'Inactive' }}</td>
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
              @click="confirmDelete(item)"
              class="actTdbtn btn btn-danger btn-sm btn-icon"
              type="button"
              :disabled="Number(item.questions_count) > 0"
              :title="Number(item.questions_count) > 0 ? 'In use — set to Draft to retire it' : 'Delete'">
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

<AddLearningOutcomeModal
  v-model="showModal"
  @saved="fetchData"
/>
<EditLearningOutcomeModal
  v-model="showEditModal"
  @saved="fetchData"
  :detail="getDetail"
/>

</template>
