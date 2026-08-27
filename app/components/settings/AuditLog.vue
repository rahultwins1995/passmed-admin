<script setup lang="ts">
/**
 * security
*
 * Admin Audit Log
*/

import Pagination from '@/components/Pagination.vue'
import Loader_small from '@/components/loaders/Loader_small.vue'
import Loading from '@/components/loaders/Loading.vue'
import Empty from '@/components/loaders/Empty.vue'
import { ref,watch,reactive } from 'vue'

const props = defineProps({
  activeTab: String
});

const { $api, $toast,$confirm } = useNuxtApp()

const fullLoading = ref<boolean>(false);

const totalAdminAuditLogPages = ref(1)
const totalAdminAuditLogdata = ref(0)
const loaderAdminAuditLog=ref<boolean>(false);

const pageAdminAuditLogCurrent = ref(1)
const data_page_current = ref(1)
const limitAdminAuditLogdata = ref(10)
const fetchAdminAuditLogData = async () => {
  loaderAdminAuditLog.value = true

  try {
    const res:any = await $api.post('/audit-logs', {
      page: data_page_current.value,
      limit: limitAdminAuditLogdata.value
    })

    const obj:any = res.data

    if (obj.status === 'success') {
      getAdminAuditLogData.value = obj.data
      totalAdminAuditLogdata.value = obj.total
      totalAdminAuditLogPages.value = Math.ceil(obj.total / obj.limit)
      pageAdminAuditLogCurrent.value = obj.current_page
    } else {
      getAdminAuditLogData.value = []
      totalAdminAuditLogdata.value = 0
      totalAdminAuditLogPages.value = 1
      data_page_current.value = 1
    }
  } catch (err) {
   
    getAdminAuditLogData.value = []
    totalAdminAuditLogdata.value = 0
    totalAdminAuditLogPages.value = 1
    data_page_current.value = 1
  } finally {
    loaderAdminAuditLog.value = false
  }
}

watch(pageAdminAuditLogCurrent, (newPage) => {
  data_page_current.value = newPage
  fetchAdminAuditLogData()
})

const getAdminAuditLogBadge = (status: string) => {
  return {
    success: 'badge-green',
    review: 'badge-amber',
    fail: 'badge-red'
  }[status] || 'badge-gray'
}

//  CSV Export
const getAdminAuditLogData = ref<any[]>([])
const adminAuditLogExportCSV = async () => {
  try {
    // FULL dataset — server-generated CSV with proper quoting/escaping AND a
    // formula-injection guard (not the current page, not a raw join(',')).
    const res: any = await $api.get('/audit-logs/export')
    const csv = typeof res?.data === 'string' ? res.data : String(res?.data ?? '')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'audit-log.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (e) {
    // best-effort export; button simply no-ops on failure
  }
}

onMounted(async() => {
    await fetchAdminAuditLogData();
});

</script>
<template>

<Loading v-if="fullLoading" />

 <div class="card" style="margin-top:16px">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
                <div style="font-size:0.78rem;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:var(--ink-dim)">
                Admin Audit Log
                </div>
                <div class="cluster-sm">
                    <span class="badge badge-gray">Last 7 days</span>
                    <button class="btn btn-outline btn-sm" 
                    @click="adminAuditLogExportCSV"
                    type="button">
                    Export CSV
                    </button>
                </div>
            </div>

            <div class="table-wrap">
                <table class="audit-table" style="width:100%">
                <thead>
                <tr>
                <th>Time</th>
                <th>Admin</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Status</th>
                </tr>
                </thead>
                <tbody v-if="loaderAdminAuditLog || getAdminAuditLogData.length === 0">
                        <tr>
                        <td  v-if="!loaderAdminAuditLog && getAdminAuditLogData.length === 0"
                        class="text-center" colspan="15">
                            <Empty/>
                        </td>
                        <td v-else colspan="15">
                            <Loader_small />
                        </td>
                        </tr>
                    </tbody>
                    <tbody v-else>
                        <tr v-if="getAdminAuditLogData.length>0"
                        v-for="(vl, i) in getAdminAuditLogData" :key="i">
                            <td class="mono">{{ vl.time }}</td>
                            <td class="td-main">{{ vl.admin }}</td>
                            <td>{{ vl.action }}</td>
                            <td>{{ vl.entity }}</td>
                            <td>
                            <span class="badge" 
                            :class="getAdminAuditLogBadge(vl.status)">
                            {{ vl.status }}
                            </span>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

    <!-- PAGINATION -->
    <Pagination
    v-model:page="pageAdminAuditLogCurrent"
    :totalData="totalAdminAuditLogdata"
    :totalPages="totalAdminAuditLogPages"
    />
  </div>
</template>