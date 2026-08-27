<script setup lang="ts">
import Loading from '@/components/loaders/Loading.vue'
import { ref, reactive, computed } from 'vue'

const props = defineProps<{
  modelValue: boolean
  detailId: any | null
  pageDetail: any | null
  transaction: any | null
}>()

const emit = defineEmits(['update:modelValue', 'saved'])

const { $api, $toast } = useNuxtApp()

const fullLoading = ref(false)

const refundType = ref<'refund' | 'partial' | 'credit'>('refund')

const originalAmount = computed<number>(() =>
  Number(props.transaction?.amount_value ?? 0)
)

const alreadyRefunded = computed<number>(() =>
  Number(props.transaction?.refunded_amount ?? 0)
)

const pendingRefund = computed<number>(() =>
  Number(props.transaction?.pending_amount ?? 0)
)

const remaining = computed<number>(() => {
  const r =
    props.transaction?.remaining_amount != null
      ? Number(props.transaction.remaining_amount)
      : originalAmount.value - alreadyRefunded.value
  return Math.max(0, Math.round(r * 100) / 100)
})

const transactionId = computed<any>(() =>
  props.transaction?.transaction_id ?? null
)

const refundAmount = ref<number>(remaining.value)

const initForm = { reason: '', note: '' }
const addForm = reactive({ ...initForm })
const resetForm = () => { Object.assign(addForm, initForm) }

const closeModal = () => { emit('update:modelValue', false) }

const setRefundType = (type: 'refund' | 'partial' | 'credit') => {
  refundType.value = type
  if (type === 'refund' || type === 'credit') {
    refundAmount.value = remaining.value
  }
  if (type === 'partial') {
    refundAmount.value = 0
  }
}

const showAmountField = computed(() => refundType.value === 'partial')

const onSubmitRefund = async () => {
  if (!transactionId.value) {
    $toast('No transaction selected to refund', 'error')
    return
  }
  if (remaining.value <= 0) {
    $toast('This transaction has already been fully refunded', 'error')
    return
  }
  if (refundType.value === 'partial' && Number(refundAmount.value) <= 0) {
    $toast('Refund amount is required', 'error')
    return
  }
  if (Number(refundAmount.value) > remaining.value) {
    $toast('Refund amount cannot exceed remaining balance ($' + remaining.value + ')', 'error')
    return
  }
  if (!addForm.reason) {
    $toast('Reason is required', 'error')
    return
  }

  try {
    fullLoading.value = true
    const payload = {
      type: refundType.value,
      amount: refundAmount.value,
      transaction_id: transactionId.value,
      reason: addForm.reason,
      note: addForm.note,
      stdEx_id: props.transaction?.id ?? '0'
    }
    const res: any = await $api.post('/users/refunds/' + props.detailId, payload)
    const obj: any = res.data
    if (obj.status === 'success') {
      closeModal()
      $toast(obj.msg || 'Refund request submited successfully.', 'success')
      emit('saved', true)
      resetForm()
    } else {
      $toast(obj.msg || 'Refund request failed.', 'error')
    }
  } catch (err: any) {
    $toast(err?.response?.data?.msg || 'Refund request failed.', 'error')
  } finally {
    fullLoading.value = false
  }
}
</script>

<template>
  <Loading v-if="fullLoading" />

  <div v-if="modelValue" class="overlay overlay-top open" @click.self="closeModal">
    <div class="drawer" style="width:480px;max-width:97vw">
      <!-- HEADER -->
      <div class="drawer-header">
        <div style="font-family:'Figtree',sans-serif;font-size:1rem;font-weight:700;color:var(--ink);">
          Refund / Credit
        </div>
        <button class="drawer-close" type="button" @click="closeModal">
          <svg fill="none" height="13" stroke="currentColor" stroke-linecap="round" stroke-width="2.5" viewBox="0 0 24 24" width="13">
            <line x1="18" x2="6" y1="6" y2="18" />
            <line x1="6" x2="18" y1="6" y2="18" />
          </svg>
        </button>
      </div>

      <!-- BODY -->
      <div class="drawer-body">
        <!-- TRANSACTION SUMMARY -->
        <div v-if="transaction" style="font-size:0.8rem;color:var(--ink-dim);margin-bottom:12px;">
          Refunding transaction #{{ transactionId }}
          <template v-if="transaction.exam_name"> — {{ transaction.exam_name }}</template>
          <template v-if="transaction.plan"> ({{ transaction.plan }})</template>
        </div>

        <!-- ACTION TYPE -->
        <div class="form-row" style="margin-bottom:14px">
          <label class="form-label">Action Type</label>
          <div style="display:flex;gap:8px;margin-top:4px;">
            <button type="button" class="btn btn-outline extend-opt"
              :class="{ 'active-extend': refundType === 'refund' }"
              @click="setRefundType('refund')" style="flex:1 1 0%;font-size:0.82rem;">
              Full Refund
            </button>
            <button type="button" class="btn btn-outline extend-opt"
              :class="{ 'active-extend': refundType === 'partial' }"
              @click="setRefundType('partial')" style="flex:1 1 0%;font-size:0.82rem;">
              Partial Refund
            </button>
            <button type="button" class="btn btn-outline extend-opt"
              :class="{ 'active-extend': refundType === 'credit' }"
              @click="setRefundType('credit')" style="flex:1 1 0%;font-size:0.82rem;">
              Account Credit
            </button>
          </div>
        </div>

        <!-- AMOUNT (partial only) -->
        <div v-if="showAmountField" class="form-row" style="margin-bottom:14px">
          <label class="form-label">Amount (USD)</label>
          <div style="display:flex;align-items:center;gap:0;">
            <span style="background:var(--surface);border:1.5px solid var(--border);border-right:none;border-radius:var(--r-sm) 0 0 var(--r-sm);padding:9px 10px;font-size:0.88rem;color:var(--ink-dim);">$</span>
            <input v-model="refundAmount" type="number" min="0" :max="remaining" step="0.01"
              class="form-input" placeholder="0.00" style="border-radius:0 var(--r-sm) var(--r-sm) 0;" />
          </div>
          <div style="font-size:0.75rem;color:var(--ink-dim);margin-top:4px;">
            Max refundable: ${{ remaining }}
          </div>
        </div>

        <!-- INFO BOX -->
        <div style="background:var(--surface);border:1.5px solid var(--border);border-radius:var(--r-sm);padding:12px 14px;margin-bottom:14px;font-size:0.82rem;">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
            <span style="color:var(--ink-dim)">Original charge</span>
            <span style="font-weight:700">${{ originalAmount }}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
            <span style="color:var(--ink-dim)">Already refunded (approved)</span>
            <span>${{ alreadyRefunded }}</span>
          </div>
          <div v-if="pendingRefund > 0" style="display:flex;justify-content:space-between;margin-bottom:4px;">
            <span style="color:#b7791f">Pending approval</span>
            <span style="color:#b7791f">${{ pendingRefund }}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
            <span style="color:var(--ink-dim)">Remaining refundable</span>
            <span style="font-weight:700">${{ remaining }}</span>
          </div>
          <div style="display:flex;justify-content:space-between;">
            <span style="color:var(--ink-dim)">Payment processor</span>
            <span>Stripe</span>
          </div>
        </div>

        <!-- REASON -->
        <div class="form-row" style="margin-bottom:14px">
          <label class="form-label">Reason</label>
          <select v-model="addForm.reason" class="form-input form-select">
            <option value="">Select Reason</option>
            <option>User requested cancellation</option>
            <option>Duplicate charge</option>
            <option>Technical issue / access problem</option>
            <option>Goodwill gesture</option>
            <option>Charged after cancellation</option>
            <option>Other</option>
          </select>
        </div>

        <!-- NOTE -->
        <div class="form-row" style="margin-bottom:20px">
          <label class="form-label">Internal Note</label>
          <input v-model="addForm.note" type="text" class="form-input" placeholder="e.g. Stripe ref #ch_xxx" />
        </div>

        <!-- BUTTONS -->
        <div style="display:flex;gap:8px">
          <button type="button" class="btn btn-primary" style="flex:1" :disabled="remaining <= 0" @click="onSubmitRefund">
            Process Refund
          </button>
          <button type="button" class="btn btn-outline" @click="closeModal">Cancel</button>
        </div>
      </div>
    </div>
  </div>
</template>
