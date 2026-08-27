<script setup lang="ts">
import AddMock from '@/components/exams/AddMock.vue'
import EditMock from '@/components/exams/EditMock.vue'
import EditQuestionModal from '@/components/questions/EditQuestionModal.vue'
import ImportQuestionModal from '@/components/imports/ImportQuestionModal.vue'
import Loader_small from '@/components/loaders/Loader_small.vue'
import Empty from '@/components/loaders/Empty.vue'
import Loading from '@/components/loaders/Loading.vue'
import { ref, computed, onMounted, onUnmounted } from 'vue'

definePageMeta({ layout: 'dashboard', middleware: 'auth' })
const { $api, $toast, $confirm } = useNuxtApp()

const data_loading = ref(true)
const fullLoading = ref(false)
const getDataList = ref<any[]>([])

const showAddModal = ref(false)

// Import-into-mock
const showImportModal = ref(false)
const importMockId = ref<number | null>(null)
const importMockExamId = ref<number | null>(null)

// Import progress. The ImportQuestionModal does NOT poll itself — it emits
// `progressTrigger` and expects the PARENT to poll /imports/progress and feed each
// snapshot back via :detail (its watch on props.detail drives the progress bar).
// On completion we refresh the mock list so the question count updates.
const importStopProgress = ref(false)
const detailProgress = ref<any>(null)
let progressTimer: ReturnType<typeof setInterval> | null = null

const stopPolling = () => { if (progressTimer) { clearInterval(progressTimer); progressTimer = null } }

const startProgressPolling = () => {
  stopPolling()
  let done = false
  const poll = async () => {
    try {
      const res: any = await $api.get('/imports/progress')
      const obj = res?.data || {}
      const pdata = obj?.data || {}
      if (!pdata || pdata.status === undefined || pdata.status === null) {
        stopPolling(); importStopProgress.value = false; detailProgress.value = null; return
      }
      const st = Number(pdata.status)   // 0=processing 1=done 2=fail 3=cancel
      detailProgress.value = pdata
      if (obj.status === 'success' || st === 1) {
        stopPolling(); importStopProgress.value = false
        if (!done) { done = true; fetchData() }   // refresh the mock's question count
        return
      }
      if (obj.status === 'error' || obj.status === 'cancelled' || st === 2 || st === 3) {
        stopPolling(); importStopProgress.value = false; detailProgress.value = null
        $toast(obj.msg || (st === 3 ? 'Import cancelled' : 'Import failed'), 'error'); return
      }
    } catch (e) {
      stopPolling(); importStopProgress.value = false; detailProgress.value = null
    }
  }
  poll()
  progressTimer = setInterval(poll, 1000)
}

const progressTrigger = (start: boolean = false) => {
  if (start) { importStopProgress.value = true; startProgressPolling() }
  else { stopPolling(); importStopProgress.value = false; detailProgress.value = null }
}

const fetchData = async () => {
  data_loading.value = true
  try {
    const res: any = await $api.get('/mocks')
    getDataList.value = res.data?.status === 'success' ? (res.data.data || []) : []
  } catch (e) {
    getDataList.value = []
  } finally {
    data_loading.value = false
  }
}

const openImport = (m: any) => {
  importMockId.value = m.id
  importMockExamId.value = m.parent_exam_id
  // Fresh Import click → drop any previous snapshot so the modal opens on the upload
  // form (unless an import is actually still running, in which case the poller owns it).
  if (!importStopProgress.value) { detailProgress.value = null }
  showImportModal.value = true
}

const togglePublish = async (m: any) => {
  const next = m.status === 'active' ? 'draft' : 'active'
  fullLoading.value = true
  try {
    const res: any = await $api.post('/mocks/publish/' + m.id, { status: next })
    if (res.data?.status === 'success') { $toast(res.data.msg || 'Updated'); fetchData() }
    else { $toast(res.data?.msg || 'Failed', 'error') }
  } catch (e: any) {
    $toast(e?.response?.data?.msg || 'Failed', 'error')
  } finally { fullLoading.value = false }
}

const confirmDelete = async (m: any) => {
  const ok = await $confirm('Delete this mock? Its questions stay in the bank (hidden from practice).')
  if (!ok) return
  fullLoading.value = true
  try {
    const res: any = await $api.delete('/mocks/delete/' + m.id)
    if (res.data?.status === 'success') { $toast(res.data.msg || 'Deleted'); fetchData() }
    else { $toast(res.data?.msg || 'Failed', 'error') }
  } catch (e: any) {
    $toast(e?.response?.data?.msg || 'Failed', 'error')
  } finally { fullLoading.value = false }
}

// ── Edit mock (name / duration / pass mark) ──
const showEditMock = ref(false)
const editMockDetail = ref<any>(null)
const openEditMock = (m: any) => { editMockDetail.value = m; showEditMock.value = true }

// ── Manage the mock's questions (view / edit / delete) ──
const showQuestionsPanel = ref(false)
const currentMock = ref<any>(null)
const questionsList = ref<any[]>([])
const questionsLoading = ref(false)

// selection for bulk-publish
const selectedIds = ref<number[]>([])
const isSelected = (id: number) => selectedIds.value.includes(Number(id))
const toggleSelect = (id: number) => {
  const n = Number(id)
  selectedIds.value = isSelected(n) ? selectedIds.value.filter((x) => x !== n) : [...selectedIds.value, n]
}
const allSelected = computed(() =>
  questionsList.value.length > 0 && selectedIds.value.length === questionsList.value.length)
const toggleSelectAll = () => {
  selectedIds.value = allSelected.value ? [] : questionsList.value.map((q: any) => Number(q.id))
}

const loadQuestions = async () => {
  if (!currentMock.value) return
  questionsLoading.value = true
  try {
    const res: any = await $api.get('/mocks/questions/' + currentMock.value.id)
    questionsList.value = res.data?.status === 'success' ? (res.data.data || []) : []
  } catch (e) { questionsList.value = [] }
  finally { questionsLoading.value = false; selectedIds.value = [] }
}

// Bulk-publish: all questions, or only the checked ones.
const publishQuestions = async (mode: 'all' | 'selected') => {
  if (mode === 'selected' && selectedIds.value.length === 0) {
    return $toast('Select at least one question first', 'error')
  }
  const body = mode === 'all' ? { all: true } : { question_ids: selectedIds.value }
  fullLoading.value = true
  try {
    const res: any = await $api.post('/mocks/publish-questions/' + currentMock.value.id, body)
    if (res.data?.status === 'success') { $toast(res.data.msg || 'Published'); await loadQuestions(); fetchData() }
    else { $toast(res.data?.msg || 'Failed', 'error') }
  } catch (e: any) { $toast(e?.response?.data?.msg || 'Failed', 'error') }
  finally { fullLoading.value = false }
}
const openManage = async (m: any) => {
  currentMock.value = m
  showQuestionsPanel.value = true
  await loadQuestions()
}
const removeQuestion = async (q: any) => {
  const ok = await $confirm('Remove this question from the mock? It will be deleted.')
  if (!ok) return
  fullLoading.value = true
  try {
    const res: any = await $api.post('/mocks/remove-question/' + currentMock.value.id, { question_id: q.id })
    if (res.data?.status === 'success') { $toast('Question removed'); await loadQuestions(); fetchData() }
    else { $toast(res.data?.msg || 'Failed', 'error') }
  } catch (e: any) { $toast(e?.response?.data?.msg || 'Failed', 'error') }
  finally { fullLoading.value = false }
}

// ── Edit a single question (reuse the Question Bank's editor) ──
const showEditQuestion = ref(false)
const editQuestionId = ref<any>(null)
const openEditQuestion = (q: any) => { editQuestionId.value = q.id; showEditQuestion.value = true }
const onQuestionSaved = () => { showEditQuestion.value = false; loadQuestions() }

onMounted(() => { fetchData() })
onUnmounted(() => { stopPolling() })
</script>

<template>
  <Loading v-if="fullLoading" />

  <div class="dashwrap">
    <div class="section-hdr">
      <div class="section-hdr-left">
        <h2 class="page-title">Mock Exams</h2>
        <p class="page-sub">Global mocks shown to students who hold a live subscription to the mock's parent exam.</p>
      </div>
      <div class="section-hdr-right">
        <button class="btn btn-primary btn-sm" @click="showAddModal = true">+ Add Mock</button>
      </div>
    </div>

    <div class="info-banner" role="note">
      <p class="info-banner-text">
        A mock is a <strong>child of a parent exam</strong>. Create the mock, use <strong>Import</strong> to add its
        question paper, then <strong>Publish</strong>. Mock questions never appear in the normal practice question bank.
      </p>
    </div>

    <div class="card">
      <div class="table-wrap">
        <table class="MockTable">
          <thead>
            <tr>
              <th>No.</th>
              <th>Mock</th>
              <th>Parent exam</th>
              <th>Questions</th>
              <th>Duration</th>
              <th>Pass %</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody v-if="data_loading || getDataList.length === 0">
            <tr>
              <td colspan="8">
                <Loader_small v-if="data_loading" />
                <Empty v-else />
              </td>
            </tr>
          </tbody>
          <tbody v-else>
            <tr v-for="(m, i) in getDataList" :key="m.id">
              <td>{{ i + 1 }}</td>
              <td>{{ m.name }}</td>
              <td>{{ m.parent_exam || '—' }}</td>
              <td>
                <span class="qcount-total">{{ m.question_count ?? 0 }} total</span>
                <span class="qcount-sub">{{ m.published_count ?? 0 }} published</span>
              </td>
              <td>{{ m.duration_minutes ? m.duration_minutes + ' min' : '—' }}</td>
              <td>{{ m.pass_mark_value ?? '—' }}</td>
              <td>
                <span :class="['badge', m.status === 'active' ? 'badge-green' : 'badge-grays']">
                  {{ m.status === 'active' ? 'Published' : (m.status === 'archived' ? 'Archived' : 'Draft') }}
                </span>
              </td>
              <td>
                <div class="row-actions">
                  <button class="btn btn-outline btn-xs" @click="openManage(m)">Questions</button>
                  <button class="btn btn-outline btn-xs" @click="openImport(m)">Import</button>
                  <button class="btn btn-outline btn-xs" @click="openEditMock(m)">Edit</button>
                  <button class="btn btn-outline btn-xs" @click="togglePublish(m)">
                    {{ m.status === 'active' ? 'Unpublish' : 'Publish' }}
                  </button>
                  <button class="btn btn-danger btn-xs" @click="confirmDelete(m)">Delete</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <AddMock v-model="showAddModal" @saved="fetchData" />

  <EditMock v-model="showEditMock" :detail="editMockDetail" @saved="fetchData" />

  <!-- Manage the mock's questions (view / edit / delete) -->
  <div v-if="showQuestionsPanel" class="overlay open" @click.self="showQuestionsPanel = false">
    <div class="qpanel">
      <div class="qpanel-head">
        <div>
          <div class="qpanel-title">{{ currentMock?.name }} — Questions</div>
          <div class="qpanel-sub">{{ questionsList.length }} question(s) in this mock</div>
        </div>
        <div class="qpanel-head-actions">
          <button type="button" class="btn btn-primary btn-xs" :disabled="questionsList.length === 0"
            @click="publishQuestions('all')">Publish all</button>
          <button type="button" class="btn btn-outline btn-xs" :disabled="selectedIds.length === 0"
            @click="publishQuestions('selected')">Publish selected ({{ selectedIds.length }})</button>
          <button type="button" class="drawer-close" @click="showQuestionsPanel = false" aria-label="Close">✕</button>
        </div>
      </div>
      <div class="qpanel-body">
        <div v-if="questionsLoading" class="qpanel-empty"><Loader_small /></div>
        <div v-else-if="questionsList.length === 0" class="qpanel-empty"><Empty /></div>
        <table v-else class="QTable">
          <thead><tr>
            <th><input type="checkbox" :checked="allSelected" @change="toggleSelectAll" aria-label="Select all" /></th>
            <th>#</th><th>Question</th><th>Difficulty</th><th>Status</th><th>Action</th>
          </tr></thead>
          <tbody>
            <tr v-for="q in questionsList" :key="q.id">
              <td><input type="checkbox" :checked="isSelected(q.id)" @change="toggleSelect(q.id)" :aria-label="'Select question ' + q.no" /></td>
              <td>{{ q.no }}</td>
              <td class="q-stem">{{ q.stem }}</td>
              <td>{{ q.difficulty || '—' }}</td>
              <td>
                <span v-if="Number(q.status) === 1" class="badge badge-green">Published</span>
                <span v-else-if="Number(q.status) === 0" class="badge badge-grays">Draft</span>
                <span v-else-if="Number(q.status) === 2" class="badge badge-danger">Archived</span>
                <span v-else-if="Number(q.status) === 3" class="badge badge-amber">Flagged</span>
                <span v-else-if="Number(q.status) === 4" class="badge badge-grays">To Approve</span>
                <span v-else class="badge badge-grays">—</span>
              </td>
              <td>
                <div class="row-actions">
                  <button class="btn btn-outline btn-xs" @click="openEditQuestion(q)">Edit</button>
                  <button class="btn btn-danger btn-xs" @click="removeQuestion(q)">Delete</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <EditQuestionModal
    v-if="showEditQuestion"
    v-model="showEditQuestion"
    :id="editQuestionId"
    :activeTab="''"
    @saved="onQuestionSaved"
  />

  <ImportQuestionModal
    v-if="showImportModal"
    v-model="showImportModal"
    :stopProgress="importStopProgress"
    :detail="detailProgress"
    :mockId="importMockId"
    :mockExamId="importMockExamId"
    @progressTrigger="progressTrigger"
    @goToApproveQueue="() => {}"
  />
</template>

<style scoped>
.dashwrap { padding: 0; }
.section-hdr { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 14px; gap: 16px; }
.page-title { margin: 0; font-size: 1.3rem; font-weight: 800; color: var(--ink, #111827); }
.page-sub { margin: 4px 0 0; font-size: .78rem; color: var(--ink-dim, #6b7280); }
.info-banner { padding: 12px 14px; border: 1px solid var(--border, #e5e7eb); border-radius: 8px; background: var(--surface-hi, #f8fafc); margin-bottom: 16px; }
.info-banner-text { margin: 0; font-size: .8rem; color: var(--ink-mid, #374151); line-height: 1.5; }
.card { border: 1px solid var(--border, #e5e7eb); border-radius: 10px; overflow: hidden; background: var(--surface, #fff); }
.table-wrap { overflow-x: auto; }
.MockTable { width: 100%; border-collapse: collapse; }
.MockTable th, .MockTable td { padding: 11px 14px; text-align: left; font-size: .82rem; border-bottom: 1px solid var(--border, #eef2f7); vertical-align: middle; }
.MockTable th { font-size: .68rem; text-transform: uppercase; letter-spacing: .5px; color: var(--ink-dim, #6b7280); }
.row-actions { display: flex; gap: 6px; }
.btn { border: 1px solid transparent; border-radius: 7px; cursor: pointer; font-weight: 600; }
.btn-sm { padding: .5rem .9rem; font-size: .82rem; }
.btn-xs { padding: .35rem .6rem; font-size: .72rem; }
.btn-primary { background: var(--accent, #0e7c86); color: #fff; }
.btn-outline { background: transparent; border-color: var(--border, #d1d5db); color: var(--ink, #111827); }
.btn-danger { background: var(--rose, #dc2626); color: #fff; }
.badge { display: inline-flex; align-items: center; padding: 3px 9px; border-radius: 20px; font-size: .68rem; font-weight: 700; }
.badge-green { background: var(--green-light, #dcfce7); color: var(--green, #16a34a); }
.badge-grays { background: var(--surface-hi, #f1f5f9); color: var(--ink-dim, #6b7280); }
.badge-amber { background: var(--amber-light, #fef3c7); color: var(--amber, #b45309); }
.badge-danger { background: var(--rose-light, #fee2e2); color: var(--rose, #dc2626); }
.qpanel-head-actions { display: flex; align-items: center; gap: 8px; }
.btn:disabled { opacity: .5; cursor: not-allowed; }
.qcount-link { color: var(--accent, #0e7c86); font-weight: 700; cursor: pointer; text-decoration: underline; }
.qcount-total { font-weight: 700; color: var(--ink, #111827); }
.qcount-sub { display: block; font-size: .7rem; color: var(--ink-dim, #6b7280); margin-top: 2px; }
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,.45); display: flex; justify-content: center; align-items: flex-start; z-index: 1000; padding: 40px 16px; overflow-y: auto; }
.qpanel { background: var(--surface, #fff); width: 100%; max-width: 820px; border-radius: 12px; box-shadow: 0 12px 40px rgba(0,0,0,.18); display: flex; flex-direction: column; max-height: 86vh; }
.qpanel-head { display: flex; align-items: flex-start; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--border, #e5e7eb); }
.qpanel-title { font-size: 1.05rem; font-weight: 800; color: var(--ink, #111827); }
.qpanel-sub { font-size: .74rem; color: var(--ink-dim, #6b7280); margin-top: 2px; }
.drawer-close { background: none; border: 0; font-size: 1rem; cursor: pointer; color: var(--ink-dim, #6b7280); }
.qpanel-body { padding: 14px 20px 20px; overflow-y: auto; }
.qpanel-empty { padding: 30px; text-align: center; }
.QTable { width: 100%; border-collapse: collapse; }
.QTable th, .QTable td { padding: 10px 12px; text-align: left; font-size: .8rem; border-bottom: 1px solid var(--border, #eef2f7); vertical-align: top; }
.QTable th { font-size: .66rem; text-transform: uppercase; letter-spacing: .5px; color: var(--ink-dim, #6b7280); }
.q-stem { max-width: 460px; line-height: 1.4; color: var(--ink, #111827); }
</style>
