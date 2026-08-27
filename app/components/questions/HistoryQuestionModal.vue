<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import Loading from '@/components/loaders/Loading.vue'
import Loader_small from '@/components/loaders/Loader_small.vue'
import Empty from '@/components/loaders/Empty.vue'
import Pagination from '@/components/Pagination.vue'

const props = defineProps({
  modelValue: Boolean,
  questionId: [String, Number],
  // Display only. History is fetched by the internal questionId; this is the
  // number the admin sees and can match against the import sheet.
  questionQid: [String, Number]
})

const emit = defineEmits(['update:modelValue', 'saved'])

const { $api, $toast,$confirm } = useNuxtApp()
const fullLoading=ref<boolean>(false);

const closeModal = () => {
  emit('update:modelValue', false)
}

const data_loading = ref(false);
const getDataList = ref<any[]>([])
const pageCurnt = ref(1)
const totalPages = ref(1)
const data_page_current = ref(1)
const limit_data = ref(10)
const total_data = ref(10)

const fetchData = async () => {
        
    if (!props.questionId) return

    data_loading.value = true
  try {
    const res:any = await $api.post("/question-history/getByqId/"+props.questionId, {
      page: data_page_current.value,
      limit: limit_data.value
    })

    const obj:any = res.data

    if (obj.status === 'success') {
      total_data.value = obj.total
      totalPages.value = Math.ceil(obj.total / obj.limit)
      pageCurnt.value = obj.current_page
      getDataList.value = obj.data;

    } else {
      getDataList.value = []
      total_data.value = 0
      data_page_current.value = 1
    }

  } catch (err) {
   
    getDataList.value = []
    total_data.value = 0
    data_page_current.value = 1
  } finally {
    data_loading.value = false
  }
}

watch(pageCurnt, (newPage) => {
  data_page_current.value = newPage
  fetchData()
})

const formatDate = (date="") => {
   // Show date + time (to the minute) so an import / edit event carries its exact
   // moment, not just the day. "2026-07-27 10:23:14" or ISO "…T10:23:14" → "2026-07-27 10:23".
   if (!date) return '';
   return String(date).replace('T', ' ').slice(0, 16);
}

const isLast = (item:any) => {
  return getDataList.value[getDataList.value.length - 1]?.id === item.id
}

const submitRestore = async (id="0") => {

   closeModal();
  fullLoading.value = true

  try {
    const res:any = await $api.get(`/question-history/restore/${id}`)

    if (res.data.status === 'success') {
      fullLoading.value=false;
       emit('saved', true)

      $toast('Restored to this version')
    
    } else {
      fullLoading.value=false;
      $toast('Failed to restore', 'error')
    }

  } catch (err: any) {
    fullLoading.value=false;
    $toast(err?.response?.data?.message || 'Failed to restore', 'error')
  }
}

const confirmDelete=async(id="0")=>{
    const confirmed = await $confirm('Are you sure you want to delete this item?')
    if (confirmed) {
            deleteRestore(id)
    }
}

const deleteRestore = async (id="0") => {

    closeModal();
  fullLoading.value = true

  try {
    const res:any = await $api.delete(`/question-history/delete/${id}`)

    if (res.data.status === 'success') {
      fullLoading.value=false;
       emit('saved', true)

      $toast('Deleted Restore is successFully.')
    
    } else {
      fullLoading.value=false;
      $toast('Failed to delete', 'error')
    }

  } catch (err: any) {
    fullLoading.value=false;
    $toast(err?.response?.data?.message || 'Failed to delete', 'error')
  }
}

onMounted(() => {
    getDataList.value = []
    total_data.value = 0
    data_page_current.value = 1
    fetchData()
})
// reset when open
watch(() => props.modelValue, (val) => {
    getDataList.value = []
    total_data.value = 0
    data_page_current.value = 1
  if (val) fetchData();
});
</script>

<template>
     <Loading v-if="fullLoading"/>

    <div v-if="modelValue" class="vistoryOverlay overlay overlay-top open" 
    @click.self="closeModal">
        <div class="drawer" style="width:560px;max-width:96vw">
            <div class="drawer-header">
                <div>
                <div style="font-size:0.65rem;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:var(--ink-dim);margin-bottom:4px">
                    Version History
                </div>
                <div id="vhQuestionTitle" style="font-size:0.95rem;font-weight:700;color:var(--ink)">
                    Q#{{ questionQid || questionId }}
                </div>
                </div>
                <button class="drawer-close" 
                type="button"
                 @click="closeModal">
                    <svg fill="none" height="13" stroke="currentColor" stroke-linecap="round" 
                    stroke-width="2.5" viewBox="0 0 24 24" width="13">
                    <line x1="18" x2="6" y1="6" y2="18"></line>
                    <line x1="6" x2="18" y1="6" y2="18"></line>
                    </svg>
                </button>
            </div>

            <div class="drawer-body">
                <div class="table-wrap">
                    <table class="tablehistory">
                    <thead>
                    <tr>
                    <th>Date</th>
                    <th>Editor</th>
                    <th>Change</th>
                    <th>Action</th>
                    </tr>
                    </thead>
                    <tbody v-if="data_loading || getDataList.length === 0">
                        <tr v-if="!data_loading && getDataList.length === 0">
                        <td colspan="9">
                            <Empty/>
                        </td>
                        </tr>

                        <tr v-else>
                        <td colspan="9">
                            <Loader_small />
                        </td>
                        </tr>
                    </tbody>

                    <tbody v-else>
                       <tr v-for="item in getDataList" :key="item.id">
                        <td class="cldate">
                           {{ formatDate(item.created_at) }}
                        </td>
                            <td class="tdname">
                             {{ item?.user?.email??'' }}
                            </td>
                            <td class="tdlog">
                            {{ item?.change_log??'' }}
                            </td>
                            <td>
                            <button
                            @click="confirmDelete(item.id)"
                            class="btn btn-danger btn-sm btn-icon"
                            type="button">
                            <svg fill="none" height="12" stroke="currentColor" stroke-linecap="round"
                            stroke-width="2.5" viewBox="0 0 24 24" width="12">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6l-1 14H6L5 6"></path>
                            </svg>
                            </button>

                            <button
                             v-if="!isLast(item)"
                             class="btn btn-outline btn-sm tdRestore" 
                            @click="submitRestore(item.id)"
                            type="button">
                            Restore
                            </button>
                            <span v-else class="original">
                                Original
                            </span>
                            </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <Pagination
                v-model:page="pageCurnt"
                :totalData="total_data" 
                :totalPages="totalPages" 
                elmntName="History"/>
            </div>
        </div>
    </div>
</template>