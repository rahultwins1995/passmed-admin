<script setup lang="ts">
import { ref , watch, onMounted, reactive, computed } from 'vue'
import Multiselect from '@vueform/multiselect'
import Loading from '@/components/loaders/Loading.vue'

const props = defineProps<{
  modelValue: Boolean
    details: Object|null
}>();

const { $api, $toast,$confirm } = useNuxtApp()
const emit = defineEmits(['update:modelValue', 'saved'])

// "All" sentinel — selecting it clears any specific selection (and vice-versa).
const ALL_ID = 0

// Plan (duration) tiers mirror exam_pricings.price_1/3/6/12. Not a DB table.
const planOptions = [
  { id: ALL_ID, name: 'All plans' },
  { id: 1, name: '1 Month' },
  { id: 3, name: '3 Month' },
  { id: 6, name: '6 Month' },
  { id: 12, name: '12 Month' },
]

// Exams come from /exams/list.
const examLoading = ref<boolean>(false)
const examList = ref<any[]>([])
const examOptions = computed(() => [{ id: ALL_ID, name: 'All exams' }, ...examList.value])

const fetchExamList = async () => {
  examLoading.value = true
  try {
    const res:any = await $api.post('/exams/list', { search: '', page: 1, limit: 200 })
    examList.value = res?.data?.status === 'success' ? (res.data.data || []) : []
  } catch (err) {
    examList.value = []
  } finally {
    examLoading.value = false
  }
}

// Normalise a stored value (array / JSON string / null) into an id array.
const toIdArray = (value: any): number[] => {
  if (Array.isArray(value)) return value.map((v) => Number(v)).filter((v) => !isNaN(v))
  if (typeof value === 'string' && value.trim() !== '') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return parsed.map((v) => Number(v)).filter((v) => !isNaN(v))
    } catch (e) { /* ignore */ }
  }
  return []
}

// Reconcile the "All" option against specific ids. Returns a corrected array
// only when a change is actually needed, otherwise null (prevents watch loops).
const reconcileAll = (next: number[], prev: number[]): number[] | null => {
  if (!Array.isArray(next)) return null
  const added = next.filter((id) => !prev.includes(id))
  let fixed = next
  if (added.includes(ALL_ID)) {
    fixed = [ALL_ID]
  } else if (next.length > 1 && next.includes(ALL_ID)) {
    fixed = next.filter((id) => id !== ALL_ID)
  }
  const unchanged = fixed.length === next.length && fixed.every((v, i) => v === next[i])
  return unchanged ? null : fixed
}

const summarize = (ids: number[], noun: string) => {
  if (!ids || ids.length === 0 || ids.includes(ALL_ID)) return `All ${noun}`
  return `${ids.length} ${noun} selected`
}

// close modal
const closeModal = () => {
  emit('update:modelValue', false)
}
const pageDetail = ref(null);

const fullLoading=ref<boolean>(false);
const initialForm = {
  code: '',
  discount_type: 'percent', // percent | fixed | free
  discount_value: '0',
  applies_to: 'all', // legacy fallback — kept for backward compatibility
  exam_ids: [ALL_ID] as number[],
  plan_ids: [ALL_ID] as number[],
  expires_at: '',
  max_uses: '10',
  per_user_limit: '1',
  status: '1'
}

const addInputform = reactive({ ...initialForm })
const resetForm = () => {
  Object.assign(addInputform, { ...initialForm, exam_ids: [ALL_ID], plan_ids: [ALL_ID] });
}

const examSummary = computed(() => summarize(addInputform.exam_ids, 'exams'))
const planSummary = computed(() => summarize(addInputform.plan_ids, 'plans'))

watch(() => addInputform.exam_ids, (next, prev) => {
  const fixed = reconcileAll(next || [], prev || [])
  if (fixed) addInputform.exam_ids = fixed
})
watch(() => addInputform.plan_ids, (next, prev) => {
  const fixed = reconcileAll(next || [], prev || [])
  if (fixed) addInputform.plan_ids = fixed
})

const validateForm = () => {

  if (!addInputform.code) {
    $toast("Code is required", "error")
    return false
  }

  // uppercase enforce
  addInputform.code = addInputform.code.toUpperCase().trim()

  if (addInputform.max_uses && Number(addInputform.max_uses) < 0) {
    $toast("Max uses must be positive", "error")
    return false
  }

  if (addInputform.per_user_limit && Number(addInputform.per_user_limit) < 1) {
    $toast("Per user limit must be at least 1", "error")
    return false
  }

  return true
}


/*
* submit
*/
const onSaveChanges = async () => {
    if (!props.details) return
    if (!validateForm()) return

  fullLoading.value = true;

  try {
    const res:any = await $api.post('/promos/update/'+props.details, addInputform);

    if (res.data.status === 'success') {
          const message = res?.data?.msg || 'Changes saved successfully.'

        fullLoading.value = false;
        closeModal();

        resetForm();
         $toast(message);
          emit('saved', true); 

     }else{
          const message = res?.data?.msg || 'Failed to saved.'
           $toast(message);
    }

  } catch (err:any) {
   
    fullLoading.value = false;
      const message = err?.response?.data?.msg || err?.response?.data?.message || 'Failed to saved.'
     $toast(message,'error');

  }
}

const fetchData = async () => {
  if (!props.details) return

  fullLoading.value = true

  try {
    const res:any = await $api.get("/promos/details/" + props.details)
    
    if (res?.data?.status === 'success') {
        const obj:any = res.data.data;
        pageDetail.value=obj;

        const examIds = toIdArray(obj.exam_ids)
        const planIds = toIdArray(obj.plan_ids)

        Object.assign(addInputform, {
        code: obj.code || "",
        discount_type: obj.discount_type || "percent",
        discount_value: obj.discount_value || "0",
        applies_to: obj.applies_to || "all",
        exam_ids: examIds.length ? examIds : [ALL_ID],
        plan_ids: planIds.length ? planIds : [ALL_ID],
        expires_at: obj.expiry_date || "",
        max_uses: obj.max_uses || "10",
        per_user_limit: obj.used_count || "1",
        status: obj.status || "1",
        });
    }else{
          pageDetail.value = null;
          const message = res?.data?.msg || 'No data found.'
          $toast(message,'error');
    }

  } catch (err:any) {
         pageDetail.value = null;
        const message = err?.response?.data?.msg ||  err?.response?.data?.message || 'No data found.'
        $toast(message,'error');
        
  } finally {
    fullLoading.value = false
  }
}

onMounted(() => {
  fetchExamList();
  if (props.modelValue && props.details) {
    fetchData();
  }
});

watch(() => props.modelValue, (open) => {
  if (open && examList.value.length === 0) fetchExamList();
});


</script>

<template>
<Loading v-if="fullLoading"/>
<div v-if="modelValue" class="overlay overlay-top open" @click.self="closeModal">
    <div class="drawer" style="width:620px;max-width:96vw">
        <div class="drawer-header">
            <div>
                <div style="font-size:0.65rem;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:var(--ink-dim);margin-bottom:4px">
                Discount Codes
                </div>
                <div id="pePageHeader" style="font-size:0.95rem;font-weight:700;color:var(--ink)">
                Edit Code
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
            <div class="wrappromoForm">
                <div class="form-row">
                    <label class="form-label">Code</label>
                    <input class="form-input" 
                    placeholder="e.g. MATCH2026" 
                    style="text-transform:uppercase" 
                    type="text"
                    v-model="addInputform.code" />
                </div>
               
                <div class="form-row">
                    <label class="form-label">
                    Discount %
                    </label>
                    <input class="form-input"  type="number" placeholder="20"
                    v-model="addInputform.discount_value" 
                    />
                </div>
                    

                    <div class="form-row-2">
                        <div class="form-row">
                            <label class="form-label">Applies To — Exams</label>
                            <Multiselect
                            mode="multiple"
                            class="multiExam-select-options"
                            placeholder="Select exams"
                            v-model="addInputform.exam_ids"
                            :options="examOptions"
                            label="name"
                            valueProp="id"
                            :object="false"
                            :searchable="true"
                            :close-on-select="false"
                            :hide-selected="false"
                            :loading="examLoading"
                            :multipleLabel="(v) => examSummary" />
                        </div>
                        <div class="form-row">
                            <label class="form-label">Applies To — Plans</label>
                            <Multiselect
                            mode="multiple"
                            class="multiPlan-select-options"
                            placeholder="Select plans"
                            v-model="addInputform.plan_ids"
                            :options="planOptions"
                            label="name"
                            valueProp="id"
                            :object="false"
                            :searchable="false"
                            :close-on-select="false"
                            :hide-selected="false"
                            :multipleLabel="(v) => planSummary" />
                        </div>
                    </div>
                    <div class="form-row">
                        <label class="form-label">Expires</label>
                        <input class="form-input" type="date"
                         v-model="addInputform.expires_at" />
                    </div>
                    <div class="form-row-2">
                        <div class="form-row">
                            <label class="form-label">Max Uses</label>
                            <input class="form-input" 
                            placeholder="Unlimited" 
                            type="number"
                            v-model="addInputform.max_uses"
                            />
                        </div>
                        <div class="form-row">
                            <label class="form-label">Per User Limit</label>
                            <input class="form-input" placeholder="1"
                            type="number"
                            v-model="addInputform.per_user_limit"
                            />
                        </div>
                    </div>
                    <div class="form-row">
                        <label class="form-label">Status</label>
                        <select class="form-input form-select" id="peStatus"
                        v-model="addInputform.status">
                        <option value="1">Active</option>
                        <option value="0">Paused</option>
                        <option  value="2">Expired</option>
                        </select>
                    </div>
            </div>

             <div style="display:flex;gap:8px;padding-top:4px">
                <button class="btn btn-primary" type="button"
                 @click="onSaveChanges">
                  Update Code
                </button>
                <button class="btn btn-outline btn-sm" type="button"
                @click="closeModal()">
                Cancel
                </button>
              </div> 
        </div>
    </div>
</div>
</template>