<script setup lang="ts">
import Pagination from '@/components/Pagination.vue'

import Loader_small from '@/components/loaders/Loader_small.vue'
import Empty from '@/components/loaders/Empty.vue'
import Loading from '@/components/loaders/Loading.vue'
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
const data_loading = ref(true)
const fullLoading = ref(false)

// filters
const input_search = ref('')

const fetchData = async () => {
  data_loading.value = true

  try {
    const res:any = await $api.post("/refunds", {
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
    const res:any = await $api.delete("/refunds/delete/"+id)
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

// ── Approve dialog (full or partial) ─────────────────────────────────────────
// Approving used to post straight through with no amount, so the only choices
// were "refund exactly what was asked" or "reject". Admins settling for a partial
// amount had no way to record it.
const showApproveModal = ref(false)
const approveItem      = ref<any>(null)
const approveAmount    = ref<any>('')

// ── Subscription action on a FULL refund ─────────────────────────────────────
// When this approval refunds the whole remaining charge (a full refund, or a
// partial that leaves nothing refundable), the admin must decide what happens to
// the customer's subscription. Backend applies the choice AFTER the Stripe refund
// succeeds; it is best-effort so it can never undo the refund.
const subAction      = ref<'cancel' | 'downgrade' | 'keep' | 'custom'>('cancel')
const customExpiry   = ref('')     // yyyy-mm-dd when subAction === 'custom'
const todayStr       = new Date().toISOString().slice(0, 10)  // min for custom expiry
const notifyCustomer = ref(false)  // email the customer about the change
const showSubModal   = ref(false)  // the subscription-action step (full refunds only)

// This approval empties the remaining refundable charge → the subscription is
// fully refunded, so show the subscription-action picker.
const isFullRefund = computed(() => {
  const amt  = Number(approveAmount.value)
  const left = approveItem.value?.refundable_max
  const ceil = left === null || left === undefined
    ? Number(approveItem.value?.original_amount ?? approveItem.value?.refund_amount ?? 0)
    : Number(left)
  return amt > 0 && ceil > 0 && amt >= ceil
})

// Ceiling: the request itself, and (when the row is tied to a transaction) what
// is left of the original charge after earlier refunds. approve() re-checks both.
const approveMax = computed(() => {
  const req = Number(approveItem.value?.refund_amount ?? 0)
  const left = approveItem.value?.refundable_max
  return left === null || left === undefined ? req : Math.min(req, Number(left))
})

const isPartialApprove = computed(() =>
  Number(approveAmount.value) > 0 &&
  Number(approveAmount.value) < Number(approveItem.value?.refund_amount ?? 0)
)

const openApproveModal = (item:any) => {
  approveItem.value   = item
  approveAmount.value = Number(item?.refund_amount ?? 0)
  // Reset the subscription-action picker each time the modal opens.
  subAction.value      = 'cancel'
  customExpiry.value   = ''
  notifyCustomer.value = false
  showApproveModal.value = true
}

// Process (approve) a refund — eligibility is advisory; ineligible needs an extra confirm.
// `sub` (optional) carries the subscription action for a full refund. `skipConfirm`
// is set when the caller (the subscription popup) is itself the confirmation step,
// so we don't stack a second native confirm on top of it.
const processRefund = async (item:any, amount:any = null, sub:any = null, skipConfirm = false) => {
  if (!skipConfirm) {
    const msg = item?.is_eligible
      ? 'Process this refund?'
      : `This request is NOT eligible by policy (${item?.eligibility_reason || 'ineligible'}). Process the refund anyway?`
    const confirmed = await $confirm(msg)
    if (!confirmed) return
  }

  fullLoading.value = true
  try {
    const payload:any = amount === null ? {} : { amount }
    if (sub) Object.assign(payload, sub)
    const res:any = await $api.post('/refunds/approve/' + item.id, payload)
    const obj:any = res.data
    if (obj.status === 'success') {
      $toast(obj.msg || 'Refund processed')
      showSubModal.value = false
      showApproveModal.value = false
      approveItem.value = null
      fetchData()
    } else {
      $toast(obj.msg || 'Failed to process', 'error')
    }
  } catch (err:any) {
    $toast(err?.response?.data?.msg || 'Failed to process', 'error')
  } finally {
    fullLoading.value = false
  }
}

const confirmApprove = async () => {
  const amt = Number(approveAmount.value)
  if (!(amt > 0)) { $toast('Enter a refund amount', 'error'); return }
  if (amt > approveMax.value) {
    $toast(`Amount cannot exceed $${approveMax.value.toFixed(2)}`, 'error'); return
  }

  // Full refund (or a partial that zeroes the remaining charge) → the admin must
  // first choose what happens to the subscription. Open that step; it confirms and
  // processes. Otherwise (a partial that leaves money on the charge) → process now.
  if (isFullRefund.value) {
    subAction.value      = 'cancel'
    customExpiry.value   = ''
    notifyCustomer.value = false
    showSubModal.value   = true
    return
  }

  await processRefund(approveItem.value, amt)
}

// The subscription step's confirm button — apply the chosen action + process refund.
const confirmSubAndRefund = async () => {
  const amt = Number(approveAmount.value)
  if (subAction.value === 'custom' && !customExpiry.value) {
    $toast('Pick a custom expiry date', 'error'); return
  }
  const sub:any = {
    subscription_action: subAction.value,
    notify: notifyCustomer.value,
  }
  if (subAction.value === 'custom') sub.custom_expiry = customExpiry.value

  // This popup IS the confirmation, so skip the native "Process this refund?" prompt.
  await processRefund(approveItem.value, amt, sub, true)
}

// Reject a refund request (sends the eligibility reason as the note for now).
const rejectRefund = async (item:any) => {
  const confirmed = await $confirm('Reject this refund request?')
  if (!confirmed) return

  fullLoading.value = true
  try {
    const res:any = await $api.post('/refunds/reject/' + item.id, { reason: item?.eligibility_reason || '' })
    const obj:any = res.data
    if (obj.status === 'success') {
      $toast(obj.msg || 'Refund rejected')
      fetchData()
    } else {
      $toast(obj.msg || 'Failed to reject', 'error')
    }
  } catch (err:any) {
    $toast(err?.response?.data?.msg || 'Failed to reject', 'error')
  } finally {
    fullLoading.value = false
  }
}

const filteredRefund = computed(() => {
  return getDataList.value.filter(item => {
    return (
      (!input_search.value || String(item.name) === input_search.value)
    )
  })
});

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
 
  </div>

  <!-- FILTER -->
  <div class="filter-bar">
    <input
      v-model="input_search"
      class="filter-input"
      placeholder="Search..."
    />
  </div>

  <!-- TABLE -->
  <div class="card">
     
    <div class="table-wrap">

        <table class="RefundTable">
          <thead>
            <tr>
              <th>
               No.
              </th>
              <th>User</th>
              <th>Create By</th>
              <th>Type</th>
              <th>Original Amount</th>
              <th>Refund Amount</th>
              <th>Eligibility</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody v-if="data_loading || filteredRefund.length === 0">
            <tr>
              <td colspan="15">
                 <Loader_small v-if="data_loading" />
                  <Empty v-else />
              </td>
            </tr>
          </tbody>

          <tbody v-else>
            <tr v-for="(item, i) in filteredRefund" :key="i">
              <td>
                {{i+1}}
              </td>
              <td>{{ item?.user?.email||'' }}</td>
              <td>{{ item?.create_by?.email||'' }}</td>
              <td>{{ item?.type||'' }}</td>
              <td>{{ item?.original_amount||'' }}</td>
              <td>{{ item?.refund_amount||'' }}</td>

              <td>
                <span v-if="item.is_eligible" class="badge badge-green" :title="item.eligibility_reason">Eligible</span>
                <span v-else class="badge badge-danger" :title="item.eligibility_reason">Not eligible</span>
                <div style="font-size:.7rem;color:var(--ink-dim);margin-top:3px">{{ item.eligibility_reason }}</div>
              </td>

              <td>
                 <span v-if="item.status == '1'" class="badge badge-green">
                Done
                </span>
                <span v-else-if="Number(item.status) === 2" class="badge badge-amber">
                Failed
                </span>
                <span v-else-if="Number(item) === 3" class="badge badge-danger">
                Cancel
                </span>
                <span v-else class="badge badge-danger">
                Pending
                </span>
             
              </td>
              <td>
              <template v-if="Number(item.status) === 0">
                <button
                @click="openApproveModal(item)"
                class="actTdbtn btn btn-primary btn-sm"
                type="button">
                Process Refund
                </button>

                <button
                @click="rejectRefund(item)"
                class="actTdbtn btn btn-outline btn-sm"
                type="button">
                {{ item.is_eligible ? 'Reject' : 'Send Rejection' }}
                </button>
              </template>

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
    <br />
  <!-- PAGINATION -->
  <Pagination
    v-model:page="pageCurnt"
    :totalData="total_data"
    :totalPages="totalPages"
  />
  </div>

</div>

<!-- Approve refund: full by default, editable down to a partial amount. -->
<div v-if="showApproveModal" class="overlay overlay-top open"
  @click.self="showApproveModal = false">
  <div class="drawer" style="max-width:420px">
    <div class="drawer-header">
      <div>
        <div class="drawer-eyebrow">PROCESS REFUND</div>
        <div class="drawer-title">{{ approveItem?.user?.name || approveItem?.user?.email || 'Refund request' }}</div>
      </div>
      <button class="drawer-close" type="button" @click="showApproveModal = false">×</button>
    </div>

    <div class="drawer-body">
      <div v-if="!approveItem?.is_eligible"
        style="background:var(--bg-warning,#fef3c7);border-radius:var(--r-sm);padding:10px 12px;font-size:0.78rem;margin-bottom:14px">
        ⚠ Not eligible by policy — {{ approveItem?.eligibility_reason || 'ineligible' }}
      </div>

      <div class="form-row" style="margin:0 0 10px">
        <label class="form-label">Requested</label>
        <div style="font-size:1.1rem;font-weight:600">
          ${{ Number(approveItem?.refund_amount ?? 0).toFixed(2) }}
        </div>
      </div>

      <div class="form-row" style="margin:0 0 6px">
        <label class="form-label">Refund amount</label>
        <input class="form-input" type="number" step="0.01" min="0.01"
          :max="approveMax"
          v-model="approveAmount" />
      </div>

      <div style="font-size:0.74rem;color:var(--ink-dim);margin-bottom:14px">
        Maximum ${{ approveMax.toFixed(2) }}.
        <template v-if="isPartialApprove">
          <strong>Partial refund</strong> — the rest is not returned.
        </template>
        <template v-else>Full refund of the requested amount.</template>
      </div>

      <!-- On a full refund the button opens the subscription step; otherwise it
           processes straight away. -->
      <div v-if="isFullRefund"
        style="background:var(--bg-info,#eff6ff);border-radius:var(--r-sm);padding:9px 12px;font-size:0.74rem;margin-bottom:12px;color:var(--ink-dim)">
        This is a <strong>full refund</strong> — next you'll choose what happens to the
        customer's subscription.
      </div>

      <div style="display:flex;gap:8px">
        <button class="btn btn-primary btn-sm" type="button"
          :disabled="fullLoading" @click="confirmApprove">
          {{ isFullRefund ? 'Continue' : 'Process refund' }}
        </button>
        <button class="btn btn-outline btn-sm" type="button"
          @click="showApproveModal = false">Cancel</button>
      </div>
    </div>
  </div>
</div>

<!-- Subscription step — shown ONLY for a full refund (or a partial that zeroes the
     remaining charge). The admin's choice is applied after the Stripe refund. This
     popup is the confirmation, so there is no separate "Process this refund?" prompt. -->
<div v-if="showSubModal" class="overlay overlay-top open"
  @click.self="showSubModal = false">
  <div class="drawer" style="max-width:440px">
    <div class="drawer-header">
      <div>
        <div class="drawer-eyebrow">SUBSCRIPTION AFTER FULL REFUND</div>
        <div class="drawer-title">{{ approveItem?.user?.name || approveItem?.user?.email || 'Refund request' }}</div>
      </div>
      <button class="drawer-close" type="button" @click="showSubModal = false">×</button>
    </div>

    <div class="drawer-body">
      <div v-if="!approveItem?.is_eligible"
        style="background:var(--bg-warning,#fef3c7);border-radius:var(--r-sm);padding:10px 12px;font-size:0.78rem;margin-bottom:14px">
        ⚠ Not eligible by policy — {{ approveItem?.eligibility_reason || 'ineligible' }}
      </div>

      <div style="font-size:0.78rem;color:var(--ink-dim);margin-bottom:12px">
        Refunding <strong>${{ Number(approveAmount).toFixed(2) }}</strong> in full.
        What should happen to the subscription?
      </div>

      <label class="sub-opt">
        <input type="radio" value="cancel" v-model="subAction" />
        <span><strong>Revoke access now</strong> — end the subscription immediately.</span>
      </label>
      <label class="sub-opt">
        <input type="radio" value="downgrade" v-model="subAction" />
        <span><strong>Downgrade to Free Trial</strong> — keep the account, drop to trial.</span>
      </label>
      <label class="sub-opt">
        <input type="radio" value="keep" v-model="subAction" />
        <span><strong>Keep access</strong> (goodwill) — refund only, no change.</span>
      </label>
      <label class="sub-opt">
        <input type="radio" value="custom" v-model="subAction" />
        <span><strong>Custom expiry date</strong> — access ends on a chosen date.</span>
      </label>

      <input v-if="subAction === 'custom'" class="form-input" type="date"
        :min="todayStr"
        v-model="customExpiry" style="margin:6px 0 4px 24px;max-width:200px" />

      <label class="sub-opt" style="margin-top:10px;margin-bottom:16px">
        <input type="checkbox" v-model="notifyCustomer" />
        <span>Notify customer by email</span>
      </label>

      <div style="display:flex;gap:8px">
        <button class="btn btn-primary btn-sm" type="button"
          :disabled="fullLoading" @click="confirmSubAndRefund">
          Confirm &amp; Refund
        </button>
        <button class="btn btn-outline btn-sm" type="button"
          @click="showSubModal = false">Back</button>
      </div>
    </div>
  </div>
</div>

</template>

<style scoped>
.sub-opt {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 0.8rem;
  line-height: 1.35;
  margin-bottom: 8px;
  cursor: pointer;
}
.sub-opt input {
  margin-top: 2px;
  flex-shrink: 0;
}
</style>