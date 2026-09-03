<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

import Pagination from '@/components/Pagination.vue'
import Loader_small from '@/components/loaders/Loader_small.vue'
import Empty from '@/components/loaders/Empty.vue'
import Loading from '@/components/loaders/Loading.vue'
import ResetPasswordModal from '@/components/users/ResetPasswordModal.vue'
import ExtendModal from '@/components/users/ExtendModal.vue'
import RefundCreditModal from '@/components/users/RefundCreditModal.vue'
import EmailTemplate from '@/components/users/EmailTemplate.vue'
// View + edit on ONE page: the same edit form the users list used, embedded here
// inline (inline prop) as a section instead of a separate modal off the list.
import EditUserModal from '@/components/users/EditUserModal.vue'

import { ref,watch, onMounted} from 'vue'
import { useRoute } from 'vue-router'

const { $toast,$api,$confirm } = useNuxtApp()
const route = useRoute()
const id = route.params.id;

const userDetail = ref<any>(null);
const fullLoading = ref(false);

// After the embedded edit form saves, refresh the view sections so the header,
// status, subscriptions etc. reflect the change without a page reload.
const onEditSaved = () => { fetchData(); };

/**
 * FETCH DATA
 */
const fetchData = async () => {
  if(!id){
    return;
  }

  fullLoading.value = true
  try {
    const res:any = await $api.post("/users/show/"+id)
    const obj:any = res.data
    if (obj.status === 'success') {
      userDetail.value = obj.data
    } else {
      userDetail.value =null
    }

  } catch (err) {
   
   userDetail.value =null
  } finally {
    fullLoading.value = false
  }
}


/** end csv **/ 

const pageLoginHistoryCurrent = ref(1)
const totalLoginHistorydata = ref(0)
const totalLoginHistoryPages = ref(0)

const data_page_current = ref(1)
const limitLoginHistorydata = ref(10)
const loaderLoginHistory = ref<boolean>(false)
const getLoginHistoryData = ref<any[]>([])


const fetchLoginHistoryData = async () => {
  loaderLoginHistory.value = true;
  if(!id) return;

  try {
    const res:any = await $api.post('/login-history/getByUid/'+id, {
      page: data_page_current.value,
      limit: limitLoginHistorydata.value
    })

    const obj:any = res.data

    if (obj.status === 'success') {
      getLoginHistoryData.value = obj.data
      totalLoginHistorydata.value = obj.total
      totalLoginHistoryPages.value = Math.ceil(obj.total / obj.limit)
      pageLoginHistoryCurrent.value = obj.current_page
    } else {
      getLoginHistoryData.value = []
      totalLoginHistorydata.value = 0
      totalLoginHistoryPages.value = 1
      data_page_current.value = 1
    }
  } catch (err) {
   
    getLoginHistoryData.value = []
    totalLoginHistorydata.value = 0
    totalLoginHistoryPages.value = 1
    data_page_current.value = 1
  } finally {
    loaderLoginHistory.value = false
  }
}

watch(pageLoginHistoryCurrent, (newPage) => {
  data_page_current.value = newPage
  fetchLoginHistoryData()
})


const pageSubscriptionCurrent = ref(1)
const totalSubscriptiondata = ref(0)
const totalSubscriptionPages = ref(0)

const dataSubscriptionPage_current = ref(1)
const limitSubscriptiondata = ref(10)
const loaderSubscription = ref<boolean>(false)
const getSubscriptionData = ref<any[]>([])


const fetchSubscriptionData = async () => {
  loaderSubscription.value = true;
  if(!id) return;

  try {
    const res:any = await $api.post('/subscriptions/getByUid/'+id, {
      page: dataSubscriptionPage_current.value,
      limit: limitSubscriptiondata.value
    })

    const obj:any = res.data

    if (obj.status === 'success') {
      getSubscriptionData.value = obj.data
      totalSubscriptiondata.value = obj.total
      totalSubscriptionPages.value = Math.ceil(obj.total / obj.limit)
      pageSubscriptionCurrent.value = obj.current_page
    } else {
      getSubscriptionData.value = []
      totalSubscriptiondata.value = 0
      totalSubscriptionPages.value = 1
      dataSubscriptionPage_current.value = 1
    }
  } catch (err) {
   
    getSubscriptionData.value = []
    totalSubscriptiondata.value = 0
    totalSubscriptionPages.value = 1
    dataSubscriptionPage_current.value = 1
  } finally {
    loaderSubscription.value = false
  }
}

watch(pageSubscriptionCurrent, (newPage) => {
  dataSubscriptionPage_current.value = newPage
  fetchSubscriptionData()
})

const userId = ref<any>(null);

const showResetPasswordModal = ref<boolean>(false)
const openResetPasswordModal=()=>{
  showResetPasswordModal.value=true
}

const showRefundCreditModal = ref<boolean>(false)
const selectedRefundTx = ref<any>(null)
const openRefundCreditModal=(row:any=null)=>{
  // Refunds are per-transaction. When opened from the header button (no row),
  // fall back to the most recent transaction that still has a refundable balance.
  let tx = row
  if (!tx) {
    tx = getSubscriptionData.value.find((r:any)=> r.refundable)
    if (!tx) {
      $toast('No refundable transaction found for this user', 'error')
      return
    }
  }
  if (!tx.transaction_id) {
    $toast('No payment transaction linked to this subscription', 'error')
    return
  }
  if (!tx.refundable) {
    $toast('This transaction has no remaining refundable balance', 'error')
    return
  }
  selectedRefundTx.value = tx
  showRefundCreditModal.value = true
}

const showExtendModal = ref<boolean>(false)
const openExtendModal=()=>{
  // The button is already :disabled in these cases, but that is only a UI
  // convenience — it can be removed from the devtools, and any future caller
  // (shortcut, another button) would bypass it entirely. There is nothing to
  // extend without a subscription, so the check belongs here too.
  if (loaderSubscription.value) return
  if (totalSubscriptiondata.value === 0) {
    $toast('This user has no subscription to extend.', 'error')
    return
  }
  showExtendModal.value=true
}

const showEmailTemplateModal = ref<boolean>(false)
const openEmailTemplateModal=()=>{
  showEmailTemplateModal.value=true
}

const callbackSaved= async (elment:any=false)=> {
  await fetchData()
  // Refresh subscription history too, so refunded/remaining amounts update
  // immediately (a just-created pending refund lowers the remaining balance).
  await fetchSubscriptionData()
};

onMounted(async ()=> {
  userId.value=id;
  userDetail.value =null;
  await fetchData()
});

onMounted(async ()=> {
   fetchLoginHistoryData()
   fetchSubscriptionData()
});
</script>

<template>
  <Loading v-if="fullLoading" />
   <div class="dashwrap">
       <div class="section-hdr">
          <div class="section-hdr-left">
            <h2>User Details</h2>
          </div>

          <div class="section-hdr-right">
             <NuxtLink 
              to="/dashboard/users"
              class="btn btn-primary btn-sm">
              Back to Users List
              </NuxtLink>
          </div>
        </div>

    <div v-if="!userDetail" class="bodycard">
        <Empty/>
     </div>

    <div v-else class="bodycard">

        <!-- USER TOP -->
        <div class="drawer-user-top">
            <div class="drawer-avatar" id="drawerInitials">
                  {{ userDetail?.name?.charAt(0)??"" }}
            </div>
            <div>
                <div class="drawer-name" id="drawerName">
                  {{ userDetail?.name??"" }}
                </div>
                <div class="drawer-email" id="drawerEmail">
                  {{ userDetail.email??"" }}
                </div>
            </div>
        </div>
      <!-- end USER TOP -->

      <!------ start  action -------->

            <div class="wrapdrwractions">
                <button v-if="canEdit('users')" class="btn btn-outline btn-sm" type="button"
                @click="openEmailTemplateModal">
                  <svg fill="none" height="12" stroke="currentColor" stroke-linecap="round" stroke-width="2.5" viewBox="0 0 24 24" width="12">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                      <polyline points="22,6 12,13 2,6"></polyline>
                  </svg>
                  Email User
                </button>
                <!-- 'Extend' moved into the Subscription History section (in context). -->

                <!-- Refund / Credit is now strictly per-transaction: use the
                     "Refund" button on each row in Subscription History below. -->

                <button v-if="canEdit('users')" class="btn btn-outline btn-sm"  type="button"
                 @click="openResetPasswordModal()">
                  Reset Password
                </button>
            </div>
      <!------ end action -------->

     

      <!---------start-------- GRID -------->
        <div class="detail-grid" style="grid-template-columns:repeat(4, 1fr)">
            <div class="detail-item">
                <div class="detail-item-label">Level</div>
                <div class="detail-item-val" id="drawerLevel">
                    {{ userDetail?.role??"" }}
                </div>
            </div>
            <div class="detail-item">
                <div class="detail-item-label">Grad Year</div>
                <div class="detail-item-val" id="drawerGradYear">
                      {{ userDetail?.grad_year || '-' }}
                </div>
            </div>
            <div class="detail-item">
                <div class="detail-item-label">Institution</div>
                <div class="detail-item-val" id="drawerInstitution">
                      {{ userDetail?.institution || '-' }}
                </div>
            </div>

            <div class="detail-item">
              <div class="detail-item-label">
              Exam
            </div>
              <div class="detail-item-val">
               {{ userDetail?.exam_name || '-' }}
              </div>
            </div>

            <div class="detail-item">
              <div class="detail-item-label">
                Plan
              </div>
                <div class="detail-item-val">
                {{ userDetail?.plan || 'Trial' }}
                </div>
            </div>

            <div class="detail-item">
              <div class="detail-item-label">
              Subscribed
              </div>
              <div class="detail-item-val">
              {{ userDetail?.expiry_date || '-' }}
              </div>
            </div>

            <div class="detail-item">
              <div class="detail-item-label">
              Revenue
              </div>
              <div class="detail-item-val">
              {{ userDetail?.total_revenue || '-' }}
              </div>
            </div>

            <div class="detail-item">
                <div class="detail-item-label">Internal Notes</div>
                <div class="detail-item-val" id="drawerInternalNote"
                     style="overflow-wrap:anywhere; white-space:pre-wrap;">
                      {{ userDetail?.internal_note || '-' }}
                </div>
            </div>

          
            <div class="detail-item">
                <div class="detail-item-label">Status</div>
                <div class="detail-item-val" id="drawerStatus">
                  <!-- Login state (2/3/0) wins first; for an active account the badge
                       reflects the subscription: Free Trial / Active / Expired. -->
                  <span v-if="Number(userDetail.status) === 2" class="badge badge-amber">Pending</span>
                  <span v-else-if="Number(userDetail.status) === 3" class="badge badge-danger">Blocked</span>
                  <span v-else-if="Number(userDetail.status) === 0" class="badge badge-gray">Inactive</span>
                  <span v-else-if="userDetail.subscription_status === 'trial'" class="badge badge-teal">Free Trial</span>
                  <span v-else-if="userDetail.subscription_status === 'expired'" class="badge badge-orange">Expired</span>
                  <span v-else class="badge badge-green">Active</span>
                </div>
            </div>
            <div class="detail-item">
                <div class="detail-item-label">User Created On</div>
                <div class="detail-item-val" id="drawerDate">
                   {{ userDetail.created_at }}
                </div>
            </div>
            <div class="detail-item">
                <div class="detail-item-label">Created By</div>
                <div class="detail-item-val" id="drawerDate">
                   {{ userDetail?.created_by ?? '-' }}
                </div>
            </div>
            <div class="detail-item">
                <div class="detail-item-label">Last Active</div>
                <div class="detail-item-val">{{ userDetail?.last_active ?? '-' }}</div>
            </div>
        </div>
      <!----------------- end GRID --------------------------->   

      <!------ start two-col-------->
        <div class="two-col" style="margin:18px 0 20px">
            <div class="card" style="padding:16px">
              <div class="card-header" style="margin-bottom:10px;display:flex;align-items:center;justify-content:space-between;gap:10px">
                <div class="card-title">Subscription History</div>
                <!-- Extend lives here (in the subscription section) so the action sits in
                     context with the subscription it applies to. Disabled when the user
                     has no subscription, or while the count is still loading. -->
                <button v-if="canEdit('users')" class="btn btn-outline btn-sm" id="drawerExtendBtn" type="button"
                  :disabled="totalSubscriptiondata === 0 || loaderSubscription"
                  :title="totalSubscriptiondata === 0 ? 'No subscription to extend' : ''"
                  :style="(totalSubscriptiondata === 0 || loaderSubscription) ? 'opacity:0.5;cursor:not-allowed;' : ''"
                  @click="openExtendModal()">
                  <svg fill="none" height="12" stroke="currentColor" stroke-linecap="round" stroke-width="2.5" viewBox="0 0 24 24" width="12">
                    <rect height="18" rx="2" width="18" x="3" y="4"></rect>
                    <line x1="16" x2="16" y1="2" y2="6"></line>
                    <line x1="8" x2="8" y1="2" y2="6"></line>
                    <line x1="3" x2="21" y1="10" y2="10"></line>
                    <line x1="12" x2="12" y1="14" y2="18"></line>
                    <line x1="10" x2="14" y1="16" y2="16"></line>
                  </svg>
                  Extend
                </button>
              </div>

                <div class="table-wrap">
                    <table>
                    <thead>
                      <tr>
                        <th>Created On</th>
                        <th>Exam</th>
                        <th>Plan</th>
                        <th>Amount</th>
                        <th>Refunded</th>
                        <th>Expire Date</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody v-if="loaderSubscription || getSubscriptionData.length === 0">
                    <tr>
                    <td  v-if="!loaderSubscription && getSubscriptionData.length === 0"
                    class="text-center" colspan="15">
                    <Empty/>
                    </td>
                    <td v-else colspan="15">
                    <Loader_small />
                    </td>
                    </tr>
                    </tbody>
                    <tbody v-else>
                   <tr v-if="getSubscriptionData.length>0"
                        v-for="(vl, i) in getSubscriptionData" :key="i">
                      <td>{{ vl.created_at??'-' }}</td>
                      <td>{{ vl.exam_name??'-' }}</td>
                      <td>{{ vl.plan??'-' }}</td>
                      <td>{{ vl.amount??'-' }}</td>
                      <td>
                        <div v-if="Number(vl.refunded_amount) > 0">
                          ${{ vl.refunded_amount }}
                        </div>
                        <div v-if="Number(vl.pending_amount) > 0"
                          style="color:#b7791f;font-size:0.78rem">
                          ${{ vl.pending_amount }} pending
                        </div>
                        <span v-if="Number(vl.refunded_amount) <= 0 && Number(vl.pending_amount) <= 0">-</span>
                      </td>
                      <td>{{ vl.expiry_date??'-' }}</td>
                      <td>
                        <button
                          v-if="vl.refundable && canEdit('users')"
                          type="button"
                          class="btn btn-outline btn-sm"
                          @click="openRefundCreditModal(vl)"
                        >
                          Refund (${{ vl.remaining_amount }})
                        </button>
                        <span v-else style="color:var(--ink-dim);font-size:0.8rem">
                          {{ vl.transaction_id ? 'Fully refunded' : 'No charge' }}
                        </span>
                      </td>
                    </tr>

                    </tbody>
                    </table>
                  </div>
                  <!-- PAGINATION -->
                  <Pagination
                  v-model:page="pageSubscriptionCurrent"
                  :totalData="totalSubscriptiondata"
                  :totalPages="totalSubscriptionPages"
                  />
              </div>

              <div class="card" style="padding:16px">
                <div class="card-header" style="margin-bottom:10px">
                    <div class="card-title">Recent Logins</div>
                </div>

                <div class="table-wrap">
                  <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Location</th>
                      <th>Device</th>
                    </tr>
                  </thead>
                    <tbody v-if="loaderLoginHistory || getLoginHistoryData.length === 0">
                        <tr>
                        <td  v-if="!loaderLoginHistory && getLoginHistoryData.length === 0"
                        class="text-center" colspan="15">
                            <Empty/>
                        </td>
                        <td v-else colspan="15">
                            <Loader_small />
                        </td>
                        </tr>
                    </tbody>
                  <tbody v-else>
                     <tr v-if="getLoginHistoryData.length>0"
                        v-for="(vl, i) in getLoginHistoryData" :key="i">
                        <td>{{vl.date }}</td>
                        <td>{{vl.location}}</td>
                        <td>{{vl.system_name}}</td>
                  </tr>
                  </tbody>
                  </table>
                </div>

                  <!-- PAGINATION -->
                  <Pagination
                  v-model:page="pageLoginHistoryCurrent"
                  :totalData="totalLoginHistorydata"
                  :totalPages="totalLoginHistoryPages"
                  />
            </div>
        </div>
      <!------ end two-col-------->

       <!------ start EDIT DETAILS (embedded — view + edit on one page) -------->
      <div class="edit-details-section" style="max-width:780px" v-if="userDetail?.id">
        <div style="font-size:0.65rem;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:var(--ink-dim);margin-bottom:10px">
          Edit Details
        </div>
        <EditUserModal :inline="true" :model-value="true" :detail="{ id: userDetail.id }" @saved="onEditSaved" />
      </div>
      <!------ end EDIT DETAILS -------->

    </div>
  </div>

<ResetPasswordModal v-if="showResetPasswordModal"
v-model="showResetPasswordModal"
:pageDetail="userDetail"
:detailId="userId"
 />

<RefundCreditModal v-if="showRefundCreditModal"
v-model="showRefundCreditModal"
@saved="callbackSaved"
:pageDetail="userDetail"
:transaction="selectedRefundTx"
:detailId="userId" />

<ExtendModal v-if="showExtendModal"
v-model="showExtendModal"
@saved="callbackSaved"
:pageDetail="userDetail"
:detailId="userId" />

<EmailTemplate v-if="showEmailTemplateModal"
v-model="showEmailTemplateModal"
:pageDetail="userDetail"
:detailId="userId" />

</template>