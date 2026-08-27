<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})


import Loader_small from '@/components/loaders/Loader_small.vue'
import Pagination from '@/components/Pagination.vue'
import Empty from '@/components/loaders/Empty.vue'

import { ref, computed, onMounted} from 'vue'
import { useRoute } from 'vue-router'

const { $toast,$api,$confirm } = useNuxtApp()
const route = useRoute()
const id = route.params.id;

const pageDetail = ref<any>(null);

const fullLoading=ref<boolean>(false);

/**
 * Sample values used to render a merged preview of the template.
 * Keys must match the variables offered in the editor:
 * {{first_name}} {{exam_name}} {{plan_name}} {{expiry_date}} {{cta_button}}
 */
const sampleData: Record<string, string> = {
  first_name: 'Alex',
  exam_name: 'USMLE Step 1',
  plan_name: 'Annual Pro',
  expiry_date: '31 Dec 2026',
  cta_button:
    '<a href="#" style="display:inline-block;padding:10px 18px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;font-weight:600">Get Started</a>',
}

/** Replace {{ variable }} tokens with their sample values. */
const mergeVariables = (text: string = ''): string =>
  text.replace(/{{\s*([\w.]+)\s*}}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(sampleData, key) ? sampleData[key] : match
  )

/** Subject line with sample values merged in. */
const previewSubject = computed<string>(() =>
  mergeVariables(pageDetail.value?.subject ?? '')
)

/** Sanitized, merged HTML body for the preview pane. */
const previewHtml = computed(() =>
  safeHtmlContent(mergeVariables(pageDetail.value?.content ?? ''))
)


/**
 *  fetch data by id
 */ 
const fetchData = async () => {

  fullLoading.value = true
 
  try {
    const res:any = await $api.get("/notification-templates/details/" +id)
    
    if (res?.data?.status === 'success') {
        const detail = res.data.data;
        pageDetail.value=detail;
    }else{
          pageDetail.value = null;
          const message = res?.data?.msg || 'No data found.'
          $toast(message,'error');
    }

  } catch (err:any) {
         pageDetail.value = null;
        const message = err?.response?.data?.message || 'No data found.'
        $toast(message,'error');
        
  } finally {
    fullLoading.value = false
  }
}

// ---- Sent Log ----
const logList = ref<any[]>([])
const logLoading = ref(false)
const logPage = ref(1)
const logTotalPages = ref(1)
const logTotal = ref(0)
const logLimit = ref(10)
const summary = ref({ total: 0, sent: 0, delivered: 0, bounced: 0, failed: 0, success_rate: 0 })

const fetchSentLog = async () => {
  logLoading.value = true
  try {
    const res: any = await $api.get('/notification-templates/sent-log/' + id, {
      query: { page: logPage.value, limit: logLimit.value }
    })
    const obj = res.data
    if (obj.status === 'success') {
      logList.value = obj?.data ?? []
      logTotal.value = obj.total
      logTotalPages.value = Math.ceil(obj.total / obj.limit)
      summary.value = obj.summary ?? summary.value
    } else {
      logList.value = []
      logTotal.value = 0
    }
  } catch {
    logList.value = []
    logTotal.value = 0
  } finally {
    logLoading.value = false
  }
}

watch(logPage, () => fetchSentLog())
// ---- Sent Log end ----

onMounted(async ()=> {
   await fetchData()
    await fetchSentLog()
});

</script>

<template>
 <div class="dashwrap">

        <div class="section-hdr">
            <div class="section-hdr-left">
                <h2>Notifications Template View</h2>
            </div>

            <div class="section-hdr-right">
                <NuxtLink class="btn btn-primary btn-sm" 
                to="/dashboard/notification-templates/">
                    Go Back
                </NuxtLink>
            </div>
        </div>

        <div class="card" style="margin-bottom:20px"
             v-if="fullLoading ||!pageDetail">
            <Loader_small />
        </div>

         <div v-else
         style="display:flex;gap:20px;flex-wrap:wrap;align-items:flex-start;margin-bottom:20px">

         <div class="card" style="flex:1 1 360px;min-width:300px;margin:0">

                <div class="form-row" style="margin: 0 0 12px">
                    <label class="form-label">Name</label>
                    <div class="fieldinput">
                        {{  pageDetail?.name??'' }}
                    </div>
                </div>

                <div class="form-row" style="margin: 0 0 12px">
                    <label class="form-label">Subject Line</label>
                    <div class="fieldinput">
                    {{  pageDetail?.subject??'' }}
                    </div>
                </div>

                <div class="form-row">
                    <label class="form-label">
                    Content Body
                    </label>
                    <div class="fieldinput" v-html="safeHtmlContent(pageDetail?.content)"></div>
                </div>

                <div class="form-row" style="margin: 0 0 12px">
                    <label class="form-label">Type</label>
                    <div class="fieldinput">
                    {{  pageDetail?.type??"" }}
                    </div>
                </div>
                
                <div class="form-row">
                    <label class="form-label">Status</label>
                    <div class="fieldinput">
                    {{  pageDetail?.status??"" }}
                    </div>
                </div>
        </div>

        <!-- Live preview pane: template rendered with sample merge values -->
        <div class="card" style="flex:1 1 360px;min-width:300px;margin:0">
            <div class="form-row" style="margin: 0 0 12px">
                <label class="form-label">Preview (with sample data)</label>
                <div style="font-size:0.72rem;color:var(--ink-dim)">
                    Variables are replaced with example values to show how the sent email will look.
                </div>
            </div>

            <div class="email-preview" style="border:1px solid var(--line,#e5e7eb);border-radius:8px;overflow:hidden">
                <div style="padding:12px 16px;border-bottom:1px solid var(--line,#e5e7eb);background:var(--surface-2,#f9fafb)">
                    <div style="font-size:0.7rem;color:var(--ink-dim);text-transform:uppercase;letter-spacing:1px">Subject</div>
                    <div style="font-weight:600">{{ previewSubject || '(no subject)' }}</div>
                </div>
                <div class="email-preview-body" style="padding:16px;line-height:1.7" v-html="previewHtml"></div>
            </div>
        </div>

        <!-- SENT LOG -->
        <div class="card" style="margin-bottom:20px;width: 100%;">
            <div class="section-hdr" style="margin-bottom:14px">
            <div class="section-hdr-left">
                <h2 style="font-size:1rem">Sent Log</h2>
                <p style="font-size:0.78rem;color:var(--ink-dim)">
                When this template was last triggered, to whom, and delivery status.
                </p>
            </div>
            </div>

            <!-- Summary cards -->
            <div class="stats-row" style="grid-template-columns:repeat(5,1fr);margin-bottom:16px">
            <div class="stat-card">
                <div class="stat-val">{{ summary.total }}</div>
                <div class="stat-label">Total Sent</div>
            </div>
            <div class="stat-card">
                <div class="stat-val" style="color:var(--teal,#14b8a6)">{{ summary.success_rate }}%</div>
                <div class="stat-label">Success Rate</div>
            </div>
            <div class="stat-card">
                <div class="stat-val">{{ summary.delivered }}</div>
                <div class="stat-label">Delivered</div>
            </div>
            <div class="stat-card">
                <div class="stat-val">{{ summary.bounced }}</div>
                <div class="stat-label">Bounced</div>
            </div>
            <div class="stat-card">
                <div class="stat-val">{{ summary.failed }}</div>
                <div class="stat-label">Failed</div>
            </div>
            </div>

            <div class="table-wrap">
            <table class="usersTable">
                <thead>
                <tr>
                    <th>No.</th>
                    <th>Date</th>
                    <th>Recipient</th>
                    <th>Context</th>
                    <th>Status</th>
                </tr>
                </thead>
                <tbody v-if="logLoading || logList.length === 0">
                <tr>
                    <td colspan="15">
                    <Loader_small v-if="logLoading" />
                    <Empty v-else />
                    </td>
                </tr>
                </tbody>
                <tbody v-else>
                <tr v-for="(row, i) in logList" :key="row.id">
                    <td>{{ i + 1 }}</td>
                    <td>{{ row.created_at }}</td>
                    <td>{{ row.recipient_email }}</td>
                    <td style="text-transform:capitalize">{{ row.context }}</td>
                    <td>
                    <span v-if="row.status === 'delivered'" class="badge badge-green">Delivered</span>
                    <span v-else-if="row.status === 'sent'" class="badge badge-green">Sent</span>
                    <span v-else-if="row.status === 'bounced'" class="badge badge-amber">Bounced</span>
                    <span v-else class="badge badge-danger">Failed</span>
                    </td>
                </tr>
                </tbody>
            </table>
            </div>

            <br/>
            <Pagination
            v-model:page="logPage"
            :totalData="logTotal"
            :totalPages="logTotalPages"
            :elmntName="'logs'"
            />
        </div>
         <!-- SENT LOG end -->

        </div>

    </div>
</template>