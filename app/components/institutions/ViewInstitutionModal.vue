<script setup lang="ts">
import { ref, watch } from 'vue'
import Loading from '@/components/loaders/Loading.vue'
import Loader_small from '@/components/loaders/Loader_small.vue'
import Empty from '@/components/loaders/Empty.vue'

const props = defineProps({
  modelValue: Boolean,
  user: Object
})

const emit = defineEmits(["update:modelValue"])

const { $api } = useNuxtApp()

const userDetail = ref<any>(null)
const fullLoading = ref(false)

const closeModal = () => {
  emit("update:modelValue", false)
}

const fetchData = async () => {

  if (!props.user?.id) return

  fullLoading.value = true

  try {
    const res:any = await $api.get("/users/show/" + props.user.id)
    const obj:any = res.data

    if (obj.status === 'success') {
      userDetail.value = obj.data
    } else {
      userDetail.value = null
    }

  } catch (err) {
    userDetail.value = null
  } finally {
    fullLoading.value = false
  }
}

onMounted(()=> {
     userDetail.value = null
  if (props.user?.id){
    fetchData()
  }
});

</script>

<template>

    <Loading v-if="fullLoading" />

  <div v-if="modelValue && userDetail" class="overlay overlay-top open" @click.self="closeModal">

    <div class="drawer" style="width:580px;max-width:97vw">

      <div class="drawer-header">
        <div class="titledrop">User Detail</div>
        <button class="drawer-close" @click="closeModal">✕</button>
      </div>

      <div class="drawer-body" >
            <Empty v-if="!userDetail"/>
            <div v-else 
            class="drawerbody" >

                <!-- USER TOP -->
                <div class="drawer-user-top">
                    <div class="drawer-avatar" id="drawerInitials">
                         {{ userDetail?.name?.charAt(0)??"" }}
                    </div>
                <div>
                <div class="drawer-name" id="drawerName">{{ userDetail?.name??"" }}</div>
                <div class="drawer-email" id="drawerEmail">{{ userDetail.email??"" }}</div>
                </div>
                </div>

                <!-- GRID -->
            
                <div class="detail-grid" style="grid-template-columns:1fr 1fr 1fr">
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
                        <div class="detail-item-label">Exam</div>
                        <div class="detail-item-val" id="drawerExam">
                             {{ userDetail?.exam_name || '-' }}
                        </div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-item-label">Plan</div>
                        <div class="detail-item-val" id="drawerPlan">
                               {{ userDetail?.plan || '-' }}
                       
                        </div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-item-label">Status</div>
                        <div class="detail-item-val" id="drawerStatus">
                              {{ userDetail.status == 1 ? 'Active' : 'Inactive' }}
                        </div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-item-label">Subscribed</div>
                        <div class="detail-item-val" id="drawerDate">Mar 09, 2026</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-item-label">Revenue</div>
                        <div class="detail-item-val" id="drawerRevenue">$39</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-item-label">Questions Done</div>
                        <div class="detail-item-val" id="drawerQs">56</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-item-label">Avg Score</div>
                        <div class="detail-item-val" id="drawerScore">45%</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-item-label">Last Active</div>
                        <div class="detail-item-val">Today</div>
                    </div>
                </div>
                <div class="two-col" style="margin:18px 0 20px">
                    <div class="card" style="padding:16px">
                        <div class="card-header" style="margin-bottom:10px">
                        <div class="card-title">Subscription History</div>
                        </div>
                        <div class="table-wrap">
                        <table>
                            <thead><tr><th>Date</th><th>Action</th><th>Admin</th></tr></thead>
                            <tbody>
                            <tr><td>Mar 10, 2026</td><td>Extended 3 months</td><td>P. Spinazze</td></tr>
                            <tr><td>Jan 22, 2026</td><td>Promo applied</td><td>System</td></tr>
                            <tr><td>Nov 05, 2025</td><td>Initial subscription</td><td>Checkout</td></tr>
                            </tbody>
                        </table>
                        </div>
                    </div>
                    <div class="card" style="padding:16px">
                        <div class="card-header" style="margin-bottom:10px">
                        <div class="card-title">Recent Logins</div>
                        </div>
                        <div class="table-wrap">
                        <table>
                            <thead><tr><th>Date</th><th>Location</th><th>Device</th></tr></thead>
                            <tbody>
                            <tr><td>Today 09:21</td><td>Cape Town</td><td>Chrome / Mac</td></tr>
                            <tr><td>Yesterday</td><td>Cape Town</td><td>Safari / iPhone</td></tr>
                            <tr><td>Mar 12</td><td>Johannesburg</td><td>Chrome / Windows</td></tr>
                            </tbody>
                        </table>
                        </div>
                    </div>
                </div>

                <div class="drawer-actions">
                    <button class="btn btn-outline btn-sm"
                    type="button">
                    <svg fill="none" height="12" stroke="currentColor" stroke-linecap="round" stroke-width="2.5" viewBox="0 0 24 24" width="12">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                        <polyline points="22,6 12,13 2,6"></polyline>
                    </svg>
                    Email User
                    </button>
                    <button class="btn btn-outline btn-sm" id="drawerExtendBtn" type="button">
                    <svg fill="none" height="12" stroke="currentColor" stroke-linecap="round" stroke-width="2.5" viewBox="0 0 24 24" width="12">
                        <rect height="18" rx="2" width="18" x="3" y="4"></rect><line x1="16" x2="16" y1="2" y2="6"></line>
                        <line x1="8" x2="8" y1="2" y2="6"></line>
                        <line x1="3" x2="21" y1="10" y2="10"></line>
                        <line x1="12" x2="12" y1="14" y2="18"></line>
                        <line x1="10" x2="14" y1="16" y2="16"></line>
                    </svg>
                    Extend
                    </button>
                    <button class="btn btn-outline btn-sm"  type="button">
                        <svg fill="none" height="12" stroke="currentColor" stroke-linecap="round" stroke-width="2.5" viewBox="0 0 24 24" width="12"><line x1="12" x2="12" y1="1" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"></path></svg>
                        Refund / Credit
                    </button>
                    <button class="btn btn-outline btn-sm"  type="button">Reset Password</button>
                    <button class="btn btn-danger btn-sm" @click="closeModal">Cancel Sub</button>
                </div>
            </div>
      </div>


    </div>
  </div>
</template>