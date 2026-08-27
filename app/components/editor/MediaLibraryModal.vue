<script setup lang="ts">
import { ref, watch } from 'vue'
import Loader_small from '@/components/loaders/Loader_small.vue'
import Empty from '@/components/loaders/Empty.vue'
import Pagination from '@/components/Pagination.vue'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits(['update:modelValue', 'select'])

const { $api, $toast, $confirm } = useNuxtApp()

const list = ref<any[]>([])
const loading = ref(false)

const pageCurnt = ref(1)
const totalPages = ref(1)
const total_data = ref(0)
const limit_data = ref(12)

const search = ref('')

const closeModal = () => emit('update:modelValue', false)

const fetchData = async () => {
  loading.value = true
  try {
    const res: any = await $api.get('/uploads', {
      query: { page: pageCurnt.value, limit: limit_data.value, search: search.value }
    })
    const obj:any = res.data
    if (obj.status === 'success') {
      list.value = obj?.data ?? []
      total_data.value = obj.total
      totalPages.value = Math.ceil(obj.total / obj.limit)
    } else {
      list.value = []
      total_data.value = 0
    }
  } catch (err) {
    list.value = []
    total_data.value = 0
  } finally {
    loading.value = false
  }
}

// debounce search
let t: any = null
watch(search, () => {
  clearTimeout(t)
  t = setTimeout(() => { pageCurnt.value = 1; fetchData() }, 350)
})

watch(pageCurnt, () => fetchData())

watch(() => props.modelValue, (val) => {
  if (val) {
    pageCurnt.value = 1
    search.value = ''
    fetchData()
  }
})

const onSelect = (item: any) => {
  if (!item?.url) return
  emit('select', item.url)
  closeModal()
}

const confirmDelete = async (item: any) => {
  const ok = await $confirm('Delete this image permanently?')
  if (!ok) return
  try {
    const res: any = await $api.delete('/uploads/delete/' + item.id)
    if (res.data.status === 'success') {
      $toast(res.data.msg || 'Deleted successfully.')
      // current page reload — agar page khaali ho jaye to pichle page pe jao
      if (list.value.length === 1 && pageCurnt.value > 1) {
        pageCurnt.value = pageCurnt.value - 1
      } else {
        fetchData()
      }
    } else {
      $toast(res.data.msg || 'Delete failed', 'error')
    }
  } catch (err: any) {
    $toast(err?.response?.data?.msg || 'Delete failed', 'error')
  }
}
</script>

<template>
  <div v-if="modelValue" class="overlay open" @click.self="closeModal">
    <div class="drawer" style="width:820px;max-width:96vw">

      <div class="drawer-header">
        <div>
          <div style="font-size:0.65rem;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:var(--ink-dim);margin-bottom:4px">
            Media
          </div>
          <div class="instEditorTitle">Image Library</div>
        </div>
        <button class="drawer-close" type="button" @click="closeModal">
          <svg fill="none" height="13" stroke="currentColor" stroke-linecap="round" stroke-width="2.5"
               viewBox="0 0 24 24" width="13">
            <line x1="18" x2="6" y1="6" y2="18"></line>
            <line x1="6" x2="18" y1="6" y2="18"></line>
          </svg>
        </button>
      </div>

      <div class="drawer-body">

        <!-- SEARCH -->
        <div class="filter-bar" style="margin-bottom:14px">
          <input class="filter-input form-input" type="text"
                 placeholder="Search by file name..."
                 v-model="search" />
        </div>

        <!-- LIST -->
        <div v-if="loading || list.length === 0" style="padding:20px 0">
          <Loader_small v-if="loading" />
          <Empty v-else />
        </div>

        <div v-else class="mediaGrid">
          <div v-for="item in list" :key="item.id" class="mediaItem">
            <div class="mediaThumb" @click="onSelect(item)" title="Click to insert">
              <img :src="item.url" :alt="item.file_name" />
            </div>
            <div class="mediaMeta">
              <div class="mediaName" :title="item.file_name">{{ item.file_name }}</div>
              <button class="btn btn-danger btn-sm btn-icon" type="button"
                      @click="confirmDelete(item)" title="Delete">
                <svg fill="none" height="12" stroke="currentColor" stroke-linecap="round"
                     stroke-width="2.5" viewBox="0 0 24 24" width="12">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6l-1 14H6L5 6"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- PAGINATION -->
        <Pagination
          v-model:page="pageCurnt"
          :totalData="total_data"
          :totalPages="totalPages"
          :elmntName="'Images'"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.mediaGrid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.mediaItem {
  border: 1.5px solid var(--border);
  border-radius: var(--r-sm, 8px);
  overflow: hidden;
  background: var(--surface);
}
.mediaThumb {
  height: 110px;
  cursor: pointer;
  background: #0000000a;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.mediaThumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform .15s ease;
}
.mediaThumb:hover img { transform: scale(1.05); }
.mediaMeta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 6px 8px;
}
.mediaName {
  font-size: 0.68rem;
  color: var(--ink-dim);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
@media (max-width: 640px) {
  .mediaGrid { grid-template-columns: repeat(2, 1fr); }
}
</style>