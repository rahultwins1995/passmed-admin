<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

import { ref, onMounted, computed } from 'vue'
import Pagination from '@/components/Pagination.vue'
import Loader_small from '@/components/loaders/Loader_small.vue'
import Empty from '@/components/loaders/Empty.vue'

const { $api, $toast, $confirm } = useNuxtApp()

const fullLoading = ref<boolean>(false)

/* ---------------- delete ---------------- */
const confirmDelete = async (id: any = '0') => {
  const confirmed = await $confirm('Are you sure you want to remove this feedback?')
  if (confirmed) deleteData(id)
}

const deleteData = async (id = '0') => {
  fullLoading.value = true
  try {
    const res: any = await $api.delete(`/question-feedback/delete/${id}`)
    if (res.data.status === 'success') {
      $toast('Deleted successfully.')
      callbackSaved()
    } else {
      $toast('Failed to delete', 'error')
    }
  } catch (err: any) {
    $toast(err?.response?.data?.msg || 'Failed to delete', 'error')
  } finally {
    fullLoading.value = false
  }
}

/* ---------------- multi-select + delete all ---------------- */
const counSelected = ref<any[]>([])
const selectedAll = computed(() =>
  getDataList.value.length > 0 &&
  getDataList.value.every(u => counSelected.value.includes(u.id))
)

const onClickSelectAll = () => {
  if (getDataList.value.length === 0) { $toast('No data loaded.', 'error'); return }
  counSelected.value = selectedAll.value ? [] : getDataList.value.map(u => u.id)
}

const onClickSelect = (id: number) => {
  if (counSelected.value.includes(id)) {
    counSelected.value = counSelected.value.filter(i => i !== id)
  } else {
    counSelected.value.push(id)
  }
}

const onDeleteAll = async () => {
  if (counSelected.value.length === 0) { $toast('Please select at least one item'); return }
  const confirmed = await $confirm('Delete the selected feedback?')
  if (!confirmed) return

  fullLoading.value = true
  try {
    const res: any = await $api.delete('/question-feedback/delete-all', {
      body: { ids: counSelected.value }
    })
    if (res.data.status === 'success') {
      $toast('Deleted successfully.')
      counSelected.value = []
      callbackSaved()
    } else {
      $toast('Failed to delete', 'error')
    }
  } catch (err: any) {
    $toast(err?.response?.data?.msg || 'Failed to delete', 'error')
  } finally {
    fullLoading.value = false
  }
}

/* ---------------- address (mark handled) ---------------- */
const onAddress = async (vl: any) => {
  const next = vl.status === 'addressed' ? 'open' : 'addressed'
  fullLoading.value = true
  try {
    const res: any = await $api.post(`/question-feedback/status/${vl.id}`, { status: next })
    if (res.data.status === 'success') {
      $toast(next === 'addressed' ? 'Marked as addressed.' : 'Reopened.')
      callbackSaved()
    } else {
      $toast('Failed to update', 'error')
    }
  } catch (err: any) {
    $toast(err?.response?.data?.msg || 'Failed to update', 'error')
  } finally {
    fullLoading.value = false
  }
}

/* ---------------- fetch list ---------------- */
const filter_status = ref<string>('all')

const data_loading = ref(false)
const pageCurnt = ref(1)
const totalPages = ref(1)
const data_page_current = ref(1)
const total_data = ref(0)
const limit_data = ref(10)
const search = ref('')

const getDataList = ref<any[]>([])
const fetchData = async () => {
  data_loading.value = true
  try {
    const res: any = await $api.post('/question-feedback', {
      status: filter_status.value,
      search: search.value,
      page: data_page_current.value,
      limit: limit_data.value
    })
    const obj: any = res.data
    if (obj.status === 'success') {
      total_data.value = obj.total
      totalPages.value = Math.ceil(obj.total / obj.limit)
      pageCurnt.value = obj.current_page
      getDataList.value = obj.data || []
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

const onClickStatus = async (element: string = 'all') => {
  filter_status.value = element
  data_page_current.value = 1
  await fetchData()
}

let searchTimeout: any = null
watch(search, () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => { data_page_current.value = 1; fetchData() }, 400)
})

/* ---------------- counts ---------------- */
const all_total = ref<any>('0')
const total_open = ref<any>('0')
const total_addressed = ref<any>('0')

const fetchAllCountData = async () => {
  try {
    const res: any = await $api.get('/question-feedback/counts')
    const obj: any = res.data
    if (obj.status === 'success') {
      all_total.value = obj.all_total
      total_open.value = obj.total_open
      total_addressed.value = obj.total_addressed
    }
  } catch (err) { /* silent */ }
}

const callbackSaved = async () => {
  fetchAllCountData()
  await fetchData()
}

onMounted(async () => {
  fetchAllCountData()
  await fetchData()
})

const truncate = (s: string, n = 90) => (s && s.length > n ? s.slice(0, n) + '…' : (s || '-'))
</script>

<template>
  <Loading v-if="fullLoading" />
  <div class="dashwrap">
    <div class="section-hdr">
      <div class="section-hdr-left">
        <p>Feedback submitted by students on questions</p>
      </div>
      <div class="section-hdr-right"></div>
    </div>

    <!-- status filter tabs -->
    <div class="tabsrow" style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">
      <button type="button" class="btn btn-sm" :class="filter_status==='all' ? 'btn-primary' : 'btn-outline'"
        @click="onClickStatus('all')">All <span class="badge">{{ all_total }}</span></button>
      <button type="button" class="btn btn-sm" :class="filter_status==='open' ? 'btn-primary' : 'btn-outline'"
        @click="onClickStatus('open')">Open <span class="badge">{{ total_open }}</span></button>
      <button type="button" class="btn btn-sm" :class="filter_status==='addressed' ? 'btn-primary' : 'btn-outline'"
        @click="onClickStatus('addressed')">Addressed <span class="badge">{{ total_addressed }}</span></button>
      <input v-model="search" type="text" class="input input-sm" placeholder="Search question / feedback / user…"
        style="margin-left:auto;min-width:260px" />
    </div>

    <div class="wrapheader" v-if="counSelected.length > 0">
      <div class="lefthead">{{ counSelected.length }} <span class="label">selected</span></div>
      <div class="righthead">
        <button class="btn btn-danger btn-sm" type="button" @click="onDeleteAll">Delete All</button>
      </div>
    </div>

    <div class="card" style="margin-bottom:20px">
      <div class="table-wrap">
        <table class="usersTable">
          <thead>
            <tr>
              <th style="width:36px">
                <input type="checkbox" :checked="selectedAll" @change="onClickSelectAll()" />
              </th>
              <th>S.No.</th>
              <th>Question ID</th>
              <th>Question</th>
              <th>Feedback</th>
              <th>Type</th>
              <th>Reported by</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody v-if="data_loading || getDataList.length === 0">
            <tr>
              <td colspan="15">
                <Empty v-if="!data_loading && getDataList.length === 0" />
                <Loader_small v-else />
              </td>
            </tr>
          </tbody>

          <tbody v-else>
            <tr v-for="(vl, i) in getDataList" :key="i">
              <td>
                <input type="checkbox" :checked="counSelected.includes(vl.id)" @change="onClickSelect(vl.id)" />
              </td>
              <td>{{ (data_page_current - 1) * limit_data + i + 1 }}</td>
              <td class="notifytdtitle">{{ vl?.qid || '-' }}</td>
              <td class="notifytdmsg">{{ truncate(vl?.question_stem, 70) }}</td>
              <td class="notifytdmsg">{{ truncate(vl?.feedback_text, 90) }}</td>
              <td>{{ vl?.flag_type || '-' }}</td>
              <td>
                <div>{{ vl?.user?.name || '-' }}</div>
                <div style="font-size:11px;color:#888">{{ vl?.user?.email || '' }}</div>
              </td>
              <td>
                <span v-if="vl.status === 'addressed'" class="badge badge-green">Addressed</span>
                <span v-else class="badge badge-danger">Open</span>
              </td>
              <td>{{ vl?.create_date || '-' }}</td>
              <td>
                <NuxtLink :to="`/dashboard/support-flags/${vl.id}`"
                  class="actTdbtn btn btn-outline btn-sm viewstd" title="View & edit question">
                  <svg fill="none" height="12" stroke="currentColor" stroke-linecap="round" stroke-width="2.5"
                    viewBox="0 0 24 24" width="12"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle></svg>
                </NuxtLink>

                <button class="actTdbtn btn btn-sm" type="button"
                  :class="vl.status === 'addressed' ? 'btn-outline' : 'btn-success'"
                  :title="vl.status === 'addressed' ? 'Reopen' : 'Mark addressed'"
                  @click="onAddress(vl)">
                  <svg fill="none" height="12" stroke="currentColor" stroke-linecap="round" stroke-width="2.5"
                    viewBox="0 0 24 24" width="12"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </button>

                <button class="actTdbtn btn btn-danger btn-sm btn-icon" type="button" @click="confirmDelete(vl.id)">
                  <svg fill="none" height="12" stroke="currentColor" stroke-linecap="round" stroke-width="2.5"
                    viewBox="0 0 24 24" width="12"><polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6l-1 14H6L5 6"></path></svg>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <br />
      <Pagination v-model:page="pageCurnt" :totalData="total_data" :totalPages="totalPages" />
    </div>
  </div>
</template>
