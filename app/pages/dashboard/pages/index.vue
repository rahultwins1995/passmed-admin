<script setup lang="ts">
import Pagination from '@/components/Pagination.vue'
import AddPagesModal from '@/components/pages/AddPagesModal.vue';
import Loader_small from '@/components/loaders/Loader_small.vue'
import Empty from '@/components/loaders/Empty.vue'
import EditPageModal from '@/components/pages/EditPageModal.vue'
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
const data_loading = ref(false)
const fullLoading = ref(false)

// filters
const input_search = ref('')

const isLegacyFaqPage = (item: any) => {
  const slug = String(item?.slug || '').toLowerCase().trim()
  const title = String(item?.title || '').toLowerCase().trim()
  return ['faq', 'faqs', 'frequently-asked-questions'].includes(slug)
    || title === 'faq' || title === 'faqs'
}

// modal
const showModal = ref(false)
const showEditModal = ref(false)
const details=ref<any>(null);

const onclickEdit = async (itm:any) => {
  if (isLegacyFaqPage(itm)) {
   const go = await $confirm(
  "FAQ content is now managed under the dedicated FAQs menu. Editing this page will not update the public site. Would you like to go to the FAQs manager?"
)
    if (go) {
      navigateTo('/dashboard/faqs')
    }
    return
  }
  details.value=itm;
  showEditModal.value=true;
}

const onClickPreviewUrl = async (itm:string='') => {
    let url = baseUrl(itm);

  if (!url.startsWith('http')) {
    url = `https://${url}`;
  }

  window.open(url, '_blank', 'noopener,noreferrer');
}

// ── Batch publish ─────────────────────────────────────────────────────────────
// Pages already had a draft → live status, but only one page at a time. Editing a
// related set meant the site went live piecemeal, so visitors could catch a half
// updated set. These let an admin stage several drafts and flip them together.
const selectedPages = ref<any[]>([])
const bulkSaving    = ref(false)

const isAllPagesSelected = computed(() =>
  filteredPagess.value.length > 0 &&
  filteredPagess.value.every((p: any) => selectedPages.value.includes(p.id))
)

const onTogglePage = (id: any) => {
  const i = selectedPages.value.indexOf(id)
  if (i === -1) selectedPages.value.push(id)
  else selectedPages.value.splice(i, 1)
}

const toggleSelectAllPages = () => {
  selectedPages.value = isAllPagesSelected.value
    ? []
    : filteredPagess.value.map((p: any) => p.id)
}

const bulkSetStatus = async (status: number) => {
  if (!selectedPages.value.length) return

  const label = status === 1 ? 'publish' : 'move to draft'
  const ok = await $confirm(
    `${label === 'publish' ? 'Publish' : 'Move'} ${selectedPages.value.length} page(s) ${status === 1 ? 'to the live site' : 'to draft'}?`
  )
  if (!ok) return

  bulkSaving.value = true
  try {
    const res: any = await $api.post('/pages/bulk-status', {
      ids: selectedPages.value,
      status,
    })
    const obj: any = res?.data ?? {}
    if (obj.status === 'success') {
      $toast(obj.msg || 'Pages updated')
      selectedPages.value = []
      await fetchData()
    } else {
      $toast(obj.msg || 'Failed to update pages', 'error')
    }
  } catch (err: any) {
    $toast(err?.response?.data?.msg || 'Failed to update pages', 'error')
  } finally {
    bulkSaving.value = false
  }
}

const fetchData = async () => {
  data_loading.value = true
  // Ids from the previous page of results are no longer on screen.
  selectedPages.value = []

  try {
    const res:any = await $api.post("/pages", {
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
    const res:any = await $api.delete("/pages/delete/"+id)
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

const filteredPagess = computed(() => {
  return getDataList.value.filter(item => {
    return (
      (!input_search.value || String(item.name) === input_search.value)
    )
  })
});

const openAddPagesModal = () => {
  showModal.value = true;
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
<div class="dashwrap">
    <div class="section-hdr">
        <div class="section-hdr-left">
            <p>Frontend pages — edit content, SEO, and publish status</p>
        </div>
        <div class="section-hdr-right">
            <button class="btn btn-primary btn-sm"
                 @click="openAddPagesModal"
              type="button"
              >
                <svg fill="none" height="13" stroke="currentColor" stroke-linecap="round" 
                stroke-width="2.5" viewBox="0 0 24 24" width="13"><line x1="12" x2="12" y1="5" y2="19"></line><line x1="5" x2="19" y1="12" y2="12"></line></svg>
                New Page
            </button>
        </div>
    </div>

    <!-- Page groups -->
  
    <div class="wrapPage" style="margin-bottom:20px">
        
        <div class="pagetilecontent">
            Core Pages
        </div>

        <!-- Batch publish: edit several drafts, then take them live together
             instead of publishing them one at a time. -->
        <div v-if="!data_loading && filteredPagess.length"
          style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px">
          <label style="display:flex;align-items:center;gap:6px;font-size:0.78rem;cursor:pointer">
            <input type="checkbox" :checked="isAllPagesSelected" @change="toggleSelectAllPages" />
            Select all
          </label>

          <template v-if="selectedPages.length">
            <span style="font-size:0.78rem;color:var(--ink-dim)">
              {{ selectedPages.length }} selected
            </span>
            <button class="btn btn-primary btn-sm" type="button"
              :disabled="bulkSaving" @click="bulkSetStatus(1)">
              Push live
            </button>
            <button class="btn btn-outline btn-sm" type="button"
              :disabled="bulkSaving" @click="bulkSetStatus(0)">
              Move to draft
            </button>
            <button class="btn btn-outline btn-sm" type="button"
              :disabled="bulkSaving" @click="selectedPages = []">
              Clear
            </button>
          </template>
        </div>

        <div  class="pagecontent" v-if="data_loading || filteredPagess.length === 0"
        >
          <Empty v-if="!data_loading && filteredPagess.length === 0" />
          <Loader_small v-else />
        </div>

        <div class="pagecontent"  v-else>
          <div class="page-row" 
          style="cursor:pointer"
              v-for="(vl, key) in filteredPagess" :key="key"
               :value="vl.id">
              <input type="checkbox" style="margin-right:10px;flex-shrink:0"
                :checked="selectedPages.includes(vl.id)"
                @click.stop
                @change="onTogglePage(vl.id)" />
              <div class="page-row-icon" style="color:var(--teal)">
                  <svg fill="none" height="14" stroke="currentColor" 
                  stroke-linecap="round" stroke-width="2" viewBox="0 0 24 24" width="14">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
              </div>
              <div class="page-row-info">
                  <div class="page-row-title">{{ vl.title }}</div>
                  <div class="page-row-url">{{ baseUrl(vl.slug) }}</div>
              </div>
                <div class="q-actions">
                    <button
                      @click="onClickPreviewUrl(vl.slug)"
                      class="btn btn-outline btn-sm btn-icon btnQview"
                      type="button">
                      <svg fill="none" height="12" stroke="currentColor" stroke-linecap="round" 
                      stroke-width="2.5" viewBox="0 0 24 24" width="12">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    </button>
                    <button
                      @click="onclickEdit(vl)"
                      class="btn btn-outline btn-sm btn-icon btnQEdit"
                      type="button">
                      <svg fill="none" height="12" stroke="currentColor" stroke-linecap="round" 
                      stroke-width="2.5" viewBox="0 0 24 24" width="12">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                    </button>

                    <button
                      @click="confirmDelete(vl.id)"
                      class="btn btn-danger btn-sm btn-icon"
                      type="button">
                      <svg fill="none" height="12" stroke="currentColor" stroke-linecap="round"
                      stroke-width="2.5" viewBox="0 0 24 24" width="12">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6l-1 14H6L5 6"></path>
                      </svg>
                      </button>
                    </div>


                    <span :class="['badge',
                    vl.status === 1? 'badge-green'
                    : vl.status === 2? 'badge-red'
                    : vl.status === 0? 'badge-gray': '']">
                      {{ vl.status === 1 ? 'Live' : vl.status === 2 ? 'Archived' : vl.status === 0 ? 'Draft' : '' }}
                    </span>

              <div class="page-row-stats">
                  <div class="page-stat">
                      <div class="page-stat-num">{{ vl?.views??0 }}</div>
                      <div class="page-stat-label">Views/mo</div>
                  </div>
                  <!--div class="page-stat">
                      <div class="page-stat-num">4.2%</div>
                      <div class="page-stat-label">Conv.</div>
                  </div>
                  <div class="page-stat">
                      <div class="page-stat-num">Mar 10</div>
                      <div class="page-stat-label">Last edit</div>
                  </div-->
                </div>
          </div>
        </div>
       <!-- PAGINATION -->
        <Pagination
          v-model:page="pageCurnt"
          :totalData="total_data" 
          :totalPages="totalPages"
          :elmntName="'Pages'"
        />
    </div>
    <!-- end Page groups -->   
     


</div>
<!-- MODAL -->
<AddPagesModal
  v-model="showModal"
  @saved="fetchData"
/>

<!-- MODAL -->
<EditPageModal
  v-model="showEditModal"
  @saved="fetchData"
  :detail="details"
/>

</template>