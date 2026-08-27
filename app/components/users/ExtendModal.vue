<script setup lang="ts">
import Loading from '@/components/loaders/Loading.vue'
import { ref, reactive, computed, onMounted, watch } from 'vue'

const props = defineProps<{
  modelValue: boolean
  detailId: any | null
  pageDetail: any | null
}>()
const emit = defineEmits(["update:modelValue","saved"]);

const { $api,$toast } = useNuxtApp()
const fullLoading= ref<boolean>(false);
const userDetail= ref<any>(null);

//Close modal
const closeModal = () => {
  emit("update:modelValue", false);
};

const selectedExtend = ref<string>('30 days')
const inifitForm={
  customDate: '',
  reason: '',
  note: '',
};
const addForm = reactive<any>(inifitForm)

// Reset form
const resetForm = () => {
Object.assign(addForm, inifitForm);
};

/**
 * CURRENT EXPIRY DATE
 */
const currentExpiryDate = computed(() => {
  if (!userDetail.value?.expiry_date) return '-'

  return new Date(userDetail.value.expiry_date).toLocaleDateString(
    'en-US',
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }
  )
})

/**
 * SELECT EXTEND DAYS
 */
const selectExtend = (value: string) => {

  selectedExtend.value = value

  const baseDate = userDetail.value?.expiry_date
    ? new Date(userDetail.value.expiry_date)
    : new Date()

  let days = 30

  if (value === '7 days') days = 7
  else if (value === '14 days') days = 14
  else if (value === '30 days') days = 30
  else if (value === '90 days') days = 90

  const newDate = new Date(baseDate)

  newDate.setDate(newDate.getDate() + days)

  // yyyy-mm-dd format for input[type=date]
  addForm.customDate = newDate.toISOString().split('T')[0]
}

/**
 * NEW EXPIRY DATE
 */
const newExpiryDate = computed(() => {
  if (addForm.customDate) {
    return new Date(addForm.customDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }
 const baseDate = userDetail.value?.expiry_date
    ? new Date(userDetail.value.expiry_date)
    : new Date()

  let days = 30

  if (selectedExtend.value === '7 days') days = 7
  if (selectedExtend.value === '14 days') days = 14
  if (selectedExtend.value === '30 days') days = 30
  if (selectedExtend.value === '90 days') days = 90

  const newDate = new Date(baseDate)
  newDate.setDate(newDate.getDate() + days)

  addForm.customDate = newDate.toISOString().split('T')[0]

return newDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

});  

/**
 * CUSTOM DATE DIFF DAYS
 */
 watch(() => addForm.customDate ,(vl)=>{
    if (vl){
    const baseDate = userDetail.value?.expiry_date
      ? new Date(userDetail.value.expiry_date)
      : new Date()

    const customDate = new Date(vl)

    const diffTime = customDate.getTime() - baseDate.getTime()

    const totalDays = Math.ceil(
      diffTime / (1000 * 60 * 60 * 24)
    )

    if (totalDays >= 90) {
      selectedExtend.value = '90 days'
    } 
    else if (totalDays >= 30) {
      selectedExtend.value = '30 days'
    } 
    else if (totalDays >= 14) {
      selectedExtend.value = '14 days'
    } 
    else if (totalDays >= 7) {
      selectedExtend.value = '7 days'
    }
    }
})

/**
 * Submit EXTEND
 */
const onSubmitExtend = async () => {
    if(!addForm.customDate){
        $toast('Extend date is required','error')
        return;
    }
    if(!addForm.reason){
        $toast('Reason is required','error')
        return;
    }
    
  try {
    fullLoading.value = true
    
    const payload = {
      extend_type: selectedExtend.value,
      custom_date: addForm.customDate,
      reason: addForm.reason,
      note: addForm.note,
    }

    const res:any = await $api.post(
      '/users/extend-subscription/' + props.detailId,
      payload
    )

    const obj:any = res.data

    if (obj.status === 'success') {
      $toast(obj.msg || 'Subscription extended successfully','success')
      emit("saved", true);
      resetForm();
      closeModal()

    } else {
      $toast(obj.msg || 'Something went wrong','error')
    }
  } catch (err: any) {
    $toast(err?.response?.data?.msg || 'Something went wrong','error')
  } finally {
    fullLoading.value = false
  }
}

onMounted(async ()=> {
    userDetail.value=props.pageDetail
});

</script>
<template>
    <Loading v-if="fullLoading" />
    <div
    v-if="modelValue"
    class="overlay overlay-top open"  
    @click.self="closeModal">

        <div class="drawer" style="width:480px;max-width:97vw">
            <div class="drawer-header">
                <div>
                    <div style="text-transform: uppercase;font-size:0.65rem;font-weight:800;letter-spacing: 2px;color:var(--ink-dim);margin-bottom: 4px;">
                    Extend Subscription
                    </div>
                    <div style="font-size: 1rem;font-weight: 700;color: var(--ink);font-family: 'Figtree', sans-serif;">
                        {{ userDetail?.name || '---' }}
                    </div>
                    <div style="font-size: 0.78rem;color: var(--ink-dim);margin-top: 2px;">
                        Current expiry:
                        <span style="font-weight: 700; color: var(--ink)">
                        {{ currentExpiryDate||'---' }}
                        </span>
                    </div>
                </div>

                <button class="drawer-close" type="button"
                @click="closeModal">
                    <svg fill="none" height="13" stroke="currentColor" stroke-linecap="round" 
                        stroke-width="2.5" viewBox="0 0 24 24" width="13">
                        <line x1="18" x2="6" y1="6" y2="18"></line>
                        <line x1="6" x2="18" y1="6" y2="18"></line>
                    </svg>
                </button>
            </div>
            <!-- BODY -->
           <div class="drawer-body">
                <!-- EXTEND OPTIONS -->
                <div class="form-row">
                <label class="form-label">Extension Amount</label>

                <div style=" display: grid;grid-template-columns: repeat(4, 1fr);gap: 8px;margin-bottom: 4px;">
                    <button type="button" class="btn btn-outline extend-opt"
                    :style=" selectedExtend === '7 days'
                        ? 'flex-direction:column;height:52px;gap:1px;font-size:0.78rem;border-color:var(--teal);color:var(--teal)'
                        : 'flex-direction:column;height:52px;gap:1px;font-size:0.78rem'
                    "
                    @click="selectExtend('7 days')">
                        7 <span style="font-size: 0.62rem; font-weight: 500">days</span>
                    </button>

                    <button type="button" class="btn btn-outline extend-opt"
                    :style="selectedExtend === '14 days'
                        ? 'flex-direction:column;height:52px;gap:1px;font-size:0.78rem;border-color:var(--teal);color:var(--teal)'
                        : 'flex-direction:column;height:52px;gap:1px;font-size:0.78rem'
                    "
                    @click="selectExtend('14 days')" >
                        14 <span style="font-size: 0.62rem; font-weight: 500">days</span>
                    </button>

                    <button type="button" class="btn btn-outline extend-opt"
                    :style="selectedExtend === '30 days'
                        ? 'flex-direction:column;height:52px;gap:1px;font-size:0.78rem;border-color:var(--teal);color:var(--teal)'
                        : 'flex-direction:column;height:52px;gap:1px;font-size:0.78rem'
                    "
                    @click="selectExtend('30 days')">
                        30 <span style="font-size: 0.62rem; font-weight: 500">days</span>
                    </button>

                    <button type="button"
                    class="btn btn-outline extend-opt"
                    :style="selectedExtend === '90 days'
                        ? 'flex-direction:column;height:52px;gap:1px;font-size:0.78rem;border-color:var(--teal);color:var(--teal)'
                        : 'flex-direction:column;height:52px;gap:1px;font-size:0.78rem'
                    "
                    @click="selectExtend('90 days')">
                    90 <span style="font-size: 0.62rem; font-weight: 500">days</span>
                    </button>
                </div>
                </div>

                <!-- CUSTOM DATE -->
                <div class="form-row">
                    <label class="form-label">
                        Or set a specific end date
                    </label>

                    <input class="form-input"
                    v-model="addForm.customDate"
                    type="date"/>
                </div>

                <!-- REASON -->
                <div class="form-row">
                <label class="form-label">
                    Reason

                    <span style="
                        font-weight: 400;
                        text-transform: none;
                        letter-spacing: 0;
                        font-size: 0.72rem;
                        color: var(--ink-dim);
                    "
                    >
                    (optional, internal)
                    </span>
                </label>

                <select v-model="addForm.reason" class="form-input form-select">
                    <option value="">Select reason...</option>
                    <option value="Admin goodwill">
                    Admin goodwill
                    </option>
                    <option value="Technical issue compensation">
                    Technical issue compensation
                    </option>
                    <option value="Referral reward">
                    Referral reward
                    </option>
                    <option value="Exam postponed">
                    Exam postponed
                    </option>
                    <option value="Institutional agreement">
                    Institutional agreement
                    </option>
                    <option value="Other">
                    Other
                    </option>
                </select>
                </div>

                <!-- NOTE -->
                <div class="form-row">
                    <label class="form-label">
                        Notes
                        <span style="font-weight: 400;text-transform: none;
                            letter-spacing: 0;font-size: 0.72rem;color: var(--ink-dim);">
                        (optional)
                        </span>
                    </label>

                    <input class="form-input" 
                    placeholder="Internal note..."
                    v-model="addForm.note"
                    type="text"/>
                </div>

                <!-- NEW EXPIRY -->
                <div style="
                    background: var(--surface);
                    border: 1.5px solid var(--border);
                    border-radius: var(--r-sm);
                    padding: 12px 14px;
                    margin-bottom: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                ">
                <span style="font-size: 0.78rem; color: var(--ink-dim)">
                    New expiry date
                </span>

                <span style="
                    font-weight: 800;
                    font-size: 0.9rem;
                    color: var(--teal);
                    ">
                    {{ newExpiryDate }}
                </span>
                </div>

                <!-- ACTIONS -->
                <div style="display: flex; gap: 8px">
                    <button type="button" class="btn btn-primary" style="flex: 1"
                    @click="onSubmitExtend">
                        Confirm Extension
                    </button>
                    <button type="button" class="btn btn-outline"
                        @click="closeModal">
                        Cancel
                    </button>
                </div>
            </div>
            <!-- END BODY -->
        </div>
    </div>
</template>