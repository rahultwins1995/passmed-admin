<script setup lang="ts">
import Pagination from '@/components/Pagination.vue'
import Loader_small from '@/components/loaders/Loader_small.vue'
import Empty from '@/components/loaders/Empty.vue'
import Loading from '@/components/loaders/Loading.vue'
import { ref, onMounted, computed } from 'vue'

import AddPromosDiscount from '@/components/promos/AddPromosDiscount.vue';
import EditPromosDiscount from '@/components/promos/EditPromosDiscount.vue';

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
});

const { $api, $toast,$confirm } = useNuxtApp();

const pageCurnt = ref(1);
const totalPages = ref(1);

const data_page_current = ref(1);
const total_data = ref(0);
const limit_data = ref(10);

const getDataList = ref<any[]>([]);
const data_loading = ref(false);
const fullLoading = ref(false);

// Human-readable targeting label for a promo card.
// Prefers the new exam_ids/plan_ids, falling back to the legacy applies_to value.
const PLAN_NAMES: Record<number, string> = { 1: '1mo', 3: '3mo', 6: '6mo', 12: '12mo' };
const LEGACY_APPLIES: Record<string, string> = {
  'all': 'All plans',
  '1mo': '1 Month only',
  '3mo': '3 Month only',
  '12mo': '12 months only',
  'annual-only': 'Annual only',
  'shelf-bundle': 'Shelf bundle',
  'board-exams': 'Board exams only',
};
const toIdArray = (value: any): number[] => {
  let arr: any[] = [];
  if (Array.isArray(value)) arr = value;
  else if (typeof value === 'string' && value.trim() !== '') {
    try { const p = JSON.parse(value); if (Array.isArray(p)) arr = p; } catch (e) { /* ignore */ }
  }
  return arr.map((v) => Number(v)).filter((v) => !isNaN(v) && v > 0);
};
const targetingLabel = (vl: any): string => {
  const exams = toIdArray(vl?.exam_ids);
  const plans = toIdArray(vl?.plan_ids);
  if (exams.length === 0 && plans.length === 0) {
    return LEGACY_APPLIES[vl?.applies_to] || 'All plans';
  }
  const examPart = exams.length === 0 ? 'All exams' : `${exams.length} exam${exams.length > 1 ? 's' : ''}`;
  const planPart = plans.length === 0 ? 'all plans' : plans.map((id) => PLAN_NAMES[id] || `${id}mo`).join(' + ');
  return `${examPart}, ${planPart}`;
};

const fetchData = async () => {
  data_loading.value = true

  try {
    const res:any = await $api.post("/promos", {
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
const all_total=ref<any>(0);
const total_active=ref<any>(0);
const fetchAllCountData = async () => {
  try {
    const res:any = await $api.get("/promos/counts")

    const obj:any = res.data

    all_total.value = obj.all_total
    total_active.value =obj.total_active
      
  } catch (err) {
    
    all_total.value = 0
    total_active.value =0
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
    const res:any = await $api.delete("/promos/delete/"+id)
    const obj:any = res.data
    if (obj.status === 'success') {
        fullLoading.value = false
          const message = res?.data?.msg || 'Deleted successfully.';
         $toast(message);
        callbackSaved(true);
    }else{
      fullLoading.value = false
     const message = res?.data?.msg || 'Deletion failed';
      $toast(message,'error');
    } 

  } catch (err:any) {
   
      const message = err?.response?.data?.msg || err?.response?.data?.message || 'Deletion failed.';
      fullLoading.value = false
     $toast(message,'error');

  }finally{
    fullLoading.value = false
  }
}

const onClickPause = async (id="0") => {
    if(!id || id == '0'){
         $toast('Code deactivated failed','error');
        return;
    }   

  fullLoading.value = true

  try {
    const res:any = await $api.post("/promos/pause/"+id)
    const obj:any = res.data
    if (obj.status === 'success') {
        fullLoading.value = false
          const message = res?.data?.msg || 'Code deactivated successfully.';
         $toast(message);
       callbackSaved(true);
    }else{
      fullLoading.value = false
     const message = res?.data?.msg || 'Code deactivated failed';
      $toast(message,'error');
    } 

  } catch (err:any) {
   
      const message = err?.response?.data?.msg || err?.response?.data?.message || 'Code deactivated failed.';
      fullLoading.value = false
     $toast(message,'error');

  }finally{
    fullLoading.value = false
  }
}

const detailsData = ref<any>(null)
// modal
const showAddModal = ref<boolean>(false)
const openAddModal = () => {
  showAddModal.value = true;
}

const showEditModal = ref<boolean>(false)
  const openEditModal = (dlts:any) => {
    detailsData.value=dlts;
    showEditModal.value = true;
}

const callbackSaved=async (data:any=true)=>{
  fetchAllCountData();
  await fetchData();
}


const copyToClipboard = async (text: string="") => {
  $toast('Copy to failed', 'error')
  if (!import.meta.client) return
   if (!text) {
    $toast('Nothing to copy', 'error')
    return
  }
  try {
    await navigator.clipboard.writeText(text)
    $toast('Code copied!')
  } catch (err) {
   
    $toast('Copy to failed', 'error')
  }
}

onMounted(() => {
  callbackSaved()
})

watch(pageCurnt, (newPage) => {
  data_page_current.value = newPage
  fetchData()
})

</script>

<template>
  <Loading v-if="fullLoading" />

<div class="dashwrap">
    <div class="section-hdr">
        <div class="section-hdr-left">
            <p>{{total_active}} active codes ·</p>
        </div>
        <div class="section-hdr-right">
            <button class="btn btn-primary btn-sm"
            id="newPromoBtn" 
            type="button"
            @click="openAddModal">
            <svg fill="none" height="13" stroke="currentColor" stroke-linecap="round" 
            stroke-width="2.5" viewBox="0 0 24 24" width="13">
            <line x1="12" x2="12" y1="5" y2="19"></line>
            <line x1="5" x2="19" y1="12" y2="12"></line>
            </svg>
            New Code
          </button>
        </div>
    </div>

    <!-- New code form -->
    <div class="card collapsible" id="newPromoForm" style="margin-bottom:20px">
        <div class="card-header" style="margin-bottom:16px">
            <div class="card-title">Create Discount Code</div>
            <button class="card-action" 
               type="button">Cancel</button>
        </div>
        <div class="form-row-2">
            <div class="form-row"><label class="form-label">Code</label><input class="form-input" placeholder="e.g. MATCH2026" style="text-transform:uppercase" type="text"></div>
            <div class="form-row"><label class="form-label">Discount Type</label>
                <div style="display:flex;gap:6px;margin-bottom:8px" id="discountTypeToggle">
                    <button class="btn btn-primary btn-sm" id="dtPercent" 
                    type="button">% Off</button>
                    <button class="btn btn-outline btn-sm" id="dtFixed"
                     type="button">$ Off</button>
                    <button class="btn btn-outline btn-sm" id="dtFree" 
                    type="button">Free Access</button>
                </div>
                <div id="dtPercentField"><select class="form-input form-select" id="newPromoPercent"><option>10% off</option><option>15% off</option><option>20% off</option><option>25% off</option><option>30% off</option><option>50% off</option></select></div>
                <div id="dtFixedField" style="display:none">
                    <div style="display:flex"><span style="background:var(--surface);border:1.5px solid var(--border);border-right:none;border-radius:var(--r-sm) 0 0 var(--r-sm);padding:9px 10px;font-size:0.88rem;color:var(--ink-dim)">$</span><input class="form-input" placeholder="20"
                            style="border-radius:0 var(--r-sm) var(--r-sm) 0" type="number" min="1"></div>
                </div>
                <div id="dtFreeField" style="display:none">
                    <div style="background:var(--teal-pale);border:1.5px solid var(--teal-border);border-radius:var(--r-sm);padding:8px 12px;font-size:0.78rem;color:var(--teal-mid)">100% off — full free access for the selected plan duration</div>
                </div>
            </div>
        </div>
        <div class="form-row-2">
            <div class="form-row"><label class="form-label">Applies To</label>
                <select class="form-input form-select">
                <option>All plans</option><option>12 months only</option>
                <option>Shelf bundle</option>
                <option>Board exams only</option>
                </select>
            </div>
            <div class="form-row">
              <label class="form-label">Expires</label>
              <input class="form-input" type="date">
            </div>
        </div>
        <div class="form-row-2">
            <div class="form-row">
              <label class="form-label">Max Uses</label>
              <input class="form-input" placeholder="Unlimited" type="number">
            </div>
            <div class="form-row">
              <label class="form-label">Per User Limit</label>
              <input class="form-input" placeholder="1" type="number">
            </div>
        </div>
        <button class="btn btn-primary" 
        type="button">Create Code
      </button>
    </div>

    <div class="promo-wraptbl" >

         <div v-if="data_loading || getDataList.length === 0">
            <Empty v-if="!data_loading && getDataList.length === 0"/>
            <Loader_small v-else />
          </div>

          <div v-else>
                <div v-for="(vl, key) in getDataList" :key="key" :value="vl.id"
                class="promo-card" 
                style="cursor:pointer" >
                <div class="promo-code">{{vl?.code??"" }}</div>
                <div class="promo-info">
                
                <div class="promo-title">
                  {{ vl?.discount_value ?? "" }}% off — {{ targetingLabel(vl) }}
                </div>
                <div class="promo-meta">{{
                  new Date(vl?.expiry_date) < new Date()
                    ? `Expired on ${vl?.expiry_date ?? ""}`
                    : `Expiring on ${vl?.expiry_date ?? ""}`
              }}· Created by Admin</div>
                </div>
                <span v-if="vl.status == '1'"
                class="badge badge-green">
                  Active
                </span>
                <span v-else-if="vl.status == '2'"
                class="badge badge badge-amber">
                  Expired
                </span>
                 <span v-else
                class="badge badge badge-amber">
                  Paused
                </span>

                  <!--div class="promo-stats">
                    <div class="promo-uses">
                      {{ vl.used_count ?? 0 }} / {{ vl.max_uses ?? 'Unlimited' }}
                    </div>
                    <div class="promo-uses-label">
                      {{ (vl.used_count ?? 0) === 1 ? 'Use' : 'Uses' }}
                    </div>
                  </div-->

                  <div style="display:flex;gap:6px">
                <button class="btn btn-outline btn-sm"
                 type="button"
                 @click="copyToClipboard(vl.code??'')">
                 Copy
                </button>
                <button class="btn btn-outline btn-sm" 
                type="button"
                @click="openEditModal(vl.id)"
                >
                 Edit
                </button>
                <button @click="onClickPause(vl.id)"
                class="btn btn-danger btn-sm" 
                type="button">
                Pause
                </button>
                </div>
                <button  @click="confirmDelete(vl.id)"
                class="btn btn-danger btn-sm btn-icon"
                type="button">
                <svg fill="none" height="12" stroke="currentColor" stroke-linecap="round"
                stroke-width="2.5" viewBox="0 0 24 24" width="12">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6l-1 14H6L5 6"></path>
                </svg>
                </button>
                
              </div>

            </div>
        <!-- PAGINATION -->
        <Pagination
            v-model:page="pageCurnt"
            :totalData="total_data" 
            :totalPages="totalPages"
        />
    </div>
</div>

<!-- MODAL -->
<AddPromosDiscount 
 v-if="showAddModal"
  v-model="showAddModal"
  @saved="callbackSaved"
/>
<EditPromosDiscount 
    v-if="showEditModal"
    v-model="showEditModal"
    :details="detailsData"
    @saved="callbackSaved"
  />

</template>